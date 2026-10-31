import { healSuggestionSchema } from "../../validators/testSchemas.js";
import { generateJson, isLlmConfigured } from "../integrations/llmClient.js";
import { describeTarget, targetFromElement } from "../execution/locators.js";

const INTERACTIVE_ROLES = new Set(["button", "link", "textbox", "checkbox", "radio", "combobox", "slider", "tab", "menuitem"]);
const SOLE_ROLE_CONFIDENCE = 0.85;
const CONTAINMENT_CONFIDENCE = 0.9;
const NORMALIZED_MATCH_CONFIDENCE = 0.97;

const healSuggestionJsonSchema = {
  type: "object",
  properties: {
    candidateIndex: { type: "integer" },
    confidence: { type: "number" },
    reason: { type: "string" },
  },
  required: ["candidateIndex", "confidence", "reason"],
};

const normalize = (value) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

function levenshteinDistance(left, right) {
  const previousRow = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (const [leftIndex, leftChar] of [...left].entries()) {
    let diagonal = previousRow[0];
    previousRow[0] = leftIndex + 1;
    for (const [rightIndex, rightChar] of [...right].entries()) {
      const above = previousRow[rightIndex + 1];
      previousRow[rightIndex + 1] = Math.min(above + 1, previousRow[rightIndex] + 1, diagonal + (leftChar === rightChar ? 0 : 1));
      diagonal = above;
    }
  }
  return previousRow[right.length];
}

export function stringSimilarity(left, right) {
  const longestLength = Math.max(left.length, right.length, 1);
  return 1 - levenshteinDistance(left, right) / longestLength;
}

const targetName = (target) => (target.strategy === "role" ? target.name : target.value.replace(/^#/, ""));

const targetIdHint = (target) => (target.strategy === "css" ? target.value.replace(/^#/, "") : target.idHint ?? "");

function scoreCandidate(element, oldName, oldId, roleCandidateCount) {
  const name = normalize(element.name);
  const isSameName = name === oldName;
  const isSameId = Boolean(oldId) && element.id === oldId;
  const isContainment = Math.min(name.length, oldName.length) >= 3 && (name.includes(oldName) || oldName.includes(name));
  const signals = [
    {
      confidence: isSameName ? NORMALIZED_MATCH_CONFIDENCE : 0,
      reason: isSameName && oldId && element.id !== oldId ? `same name, id changed from "${oldId}" to "${element.id}"` : "same name ignoring case and punctuation",
    },
    { confidence: isSameId ? NORMALIZED_MATCH_CONFIDENCE : 0, reason: `same id "${oldId}", name changed to "${element.name}"` },
    { confidence: isContainment ? CONTAINMENT_CONFIDENCE : 0, reason: `name "${element.name}" contains the old name` },
    { confidence: isSameName ? 0 : stringSimilarity(oldName, name), reason: `name "${element.name}" is similar to the old name` },
    {
      confidence: oldId && element.id && !isSameId ? stringSimilarity(normalize(oldId), normalize(element.id)) : 0,
      reason: `id "${element.id}" is similar to the old id "${oldId}"`,
    },
    {
      confidence: roleCandidateCount === 1 ? SOLE_ROLE_CONFIDENCE : 0,
      reason: `only ${element.role} on the page`,
    },
  ];
  return signals.reduce((best, signal) => (signal.confidence > best.confidence ? signal : best));
}

export function findHeuristicMatch(target, snapshot) {
  const candidates = snapshot.filter((element) =>
    target.strategy === "role" ? element.role === target.role : INTERACTIVE_ROLES.has(element.role)
  );
  const oldName = normalize(targetName(target));
  const oldId = targetIdHint(target);
  const scored = candidates.map((element) => ({ element, ...scoreCandidate(element, oldName, oldId, candidates.length) }));
  const best = scored.reduce((top, entry) => (entry.confidence > top.confidence ? entry : top), { confidence: 0 });
  return best.element
    ? {
        target: targetFromElement(best.element, target.withinText),
        method: "heuristic",
        confidence: Number(best.confidence.toFixed(2)),
        reason: `Heuristic: ${best.reason}`,
      }
    : null;
}

const buildHealPrompt = (step, candidates) => `A UI test step failed because its element no longer exists. Pick the element on the current page that is the same control, renamed or re-identified.

Failed step action: ${step.action}
Old locator: ${describeTarget(step.target)}
Old element id: ${targetIdHint(step.target) || "unknown"}

Current page elements (index: role "name" id):
${candidates.map((element, index) => `${index}: ${element.role} "${element.name}" id=${element.id}`).join("\n")}

Respond with JSON only: { "candidateIndex": <index or -1 if none match>, "confidence": <0..1>, "reason": "<short reason>" }`;

async function findLlmMatch(step, snapshot) {
  const candidates = snapshot.filter((element) => INTERACTIVE_ROLES.has(element.role));
  const response = await generateJson(buildHealPrompt(step, candidates), healSuggestionJsonSchema);
  const suggestion = healSuggestionSchema.parse(response.data);
  const element = candidates[suggestion.candidateIndex];
  return element
    ? {
        target: targetFromElement(element, step.target.withinText),
        method: "llm",
        confidence: suggestion.confidence,
        reason: `LLM (${response.model}): ${suggestion.reason}`,
      }
    : null;
}

export async function findReplacement(step, snapshot, threshold) {
  const heuristicMatch = findHeuristicMatch(step.target, snapshot);
  const needsLlm = isLlmConfigured() && (heuristicMatch?.confidence ?? 0) < threshold;
  const llmMatch = needsLlm ? await findLlmMatch(step, snapshot).catch(() => null) : null;
  return [heuristicMatch, llmMatch]
    .filter(Boolean)
    .reduce((best, match) => (match.confidence > (best?.confidence ?? -1) ? match : best), null);
}
