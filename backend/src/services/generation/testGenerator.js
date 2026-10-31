import { z } from "zod";
import { generatedSuiteSchema } from "../../validators/testSchemas.js";
import { generateDeterministicTest } from "./deterministicGenerator.js";
import { generateJson, isLlmConfigured, summarizeLlmError } from "../integrations/llmClient.js";
import { describeTarget } from "../execution/locators.js";
import { exploreSite } from "../sites/siteExplorer.js";
import { renderSpec } from "./specRenderer.js";
import { TEST_DATA_PLACEHOLDERS } from "./testData.js";

const MAX_GENERATION_ATTEMPTS = 3;
export const SUITE_FORMAT_VERSION = 3;

const targetJsonSchema = {
  type: "object",
  properties: {
    strategy: { type: "string", enum: ["role", "label", "text"] },
    role: { type: "string", description: "ARIA role, only when strategy is role" },
    name: { type: "string", description: "accessible name for role, label text for label, visible text for text" },
    idHint: { type: "string", description: "element id from the snapshot, when it has one" },
    withinText: {
      type: "string",
      description: "visible text of the enclosing item, such as a product name, when several elements share the same name",
    },
  },
  required: ["strategy", "name"],
};

const suiteJsonSchema = (pagePaths) => ({
  type: "object",
  properties: {
    tests: {
      type: "array",
      items: {
        type: "object",
        properties: {
          criterionIndex: { type: "integer" },
          name: { type: "string" },
          steps: {
            type: "array",
            items: {
              type: "object",
              properties: {
                action: { type: "string", enum: ["goto", "fill", "click", "expectVisible", "expectText"] },
                path: { type: "string", enum: pagePaths, description: "page path for goto" },
                target: targetJsonSchema,
                value: { type: "string", description: "text to type for fill, expected text for expectText" },
              },
              required: ["action"],
            },
          },
        },
        required: ["criterionIndex", "name", "steps"],
      },
    },
  },
  required: ["tests"],
});

const formatSnapshots = (snapshots) =>
  Object.entries(snapshots)
    .map(
      ([pagePath, elements]) =>
        `${pagePath}\n${elements.map((element) => `  ${element.role} "${element.name}"${element.id ? ` id=${element.id}` : ""}`).join("\n")}`
    )
    .join("\n\n");

const formatLoginSteps = (site) =>
  site.login.length > 0
    ? `Pages after login are only reachable when logged in. A test that needs a logged-in user must start with exactly these steps:\n${site.login.map((step) => `  ${JSON.stringify(step)}`).join("\n")}`
    : "This site has no login.";

const buildGenerationPrompt = (ticket, site, snapshots) => `You are a senior QA engineer. Write one UI test per acceptance criterion for the web site below. Respond with JSON only, never code.

Site: ${site.description} (${site.baseUrl})

Ticket ${ticket.id}: ${ticket.title}
Acceptance criteria:
${ticket.acceptanceCriteria.map((criterion, index) => `${index}. ${criterion}`).join("\n")}

Simplified accessibility snapshot of each page on load (role "accessible name" id). Rows with role text are plain text, target them with strategy text.
Public pages:
${formatSnapshots(snapshots.publicPages)}

Pages after login:
${Object.keys(snapshots.authenticatedPages).length > 0 ? formatSnapshots(snapshots.authenticatedPages) : "  none"}

${formatLoginSteps(site)}

goto may only use these paths: ${[...knownPagePaths(site)].join(", ")}

Test data placeholders, substituted at run time. Never invent real credentials:
${Object.entries(TEST_DATA_PLACEHOLDERS)
  .map(([key, description]) => `  $${key}: ${description}`)
  .join("\n")}
  For wrong or invalid input, type any made-up value instead of a placeholder.

Step actions:
  goto { path }                 open a page, path starts with "/"
  fill { target, value }        type value into a field; value is required, e.g. "$TEST_USERNAME"
  click { target }              click an element
  expectVisible { target }      an element with exactly this role and accessible name is visible
  expectText { value }          some visible element contains this text (case-insensitive substring)

Targets are { strategy, role, name, idHint }. Strategies, in order of preference:
  role   role = ARIA role, name = exact accessible name, e.g. { "strategy": "role", "role": "button", "name": "Submit" }
  label  name = exact text of the form field's label, e.g. { "strategy": "label", "name": "Username" }. Only for fill; click buttons and links by role, because a label can also name a whole form
  text   name = exact visible text
  Never use CSS selectors or ids as the strategy. Put the element id from the snapshot in idHint when one exists, copied exactly; clicks and fills also require that id, so never invent one.
  When several elements share the same role and name (for example one "Add to cart" button per product), add withinText with the visible text that identifies the item, e.g. the product name.

Rules:
  - Exactly one test per criterion, with criterionIndex set to the criterion's number.
  - Each test starts with goto and runs in a fresh browser, independent of other tests.
  - Only reference elements that appear in the snapshot for the page you are on.
  - expectVisible may only target elements listed in a snapshot above.
  - Content that appears only after an action (messages, new headings, updated counts) is not in the snapshot: assert it with expectText using one or two words copied verbatim from the criterion (no added punctuation), a phrase quoted in the criterion, or snapshot text with its expected new value. Never assume texts from other sites.
  - To reach a listed page, use goto with its path instead of clicking icons or links to it.
  - End each test with assertions that prove the criterion is met. expectText must be specific to the outcome (for example a product name or a full message), never a lone number or a single short word.`;

const toInternalTarget = ({ strategy, role, name, idHint, withinText }) => {
  const hints = { idHint: idHint || undefined, withinText: withinText || undefined };
  return strategy === "role" ? { strategy, role, name, ...hints } : { strategy, value: name, ...hints };
};

const toInternalSuite = (suite) => ({
  tests: suite.tests.map((test) => ({
    ...test,
    steps: test.steps.map((step) => (step.target ? { ...step, target: toInternalTarget(step.target) } : step)),
  })),
});

const knownPagePaths = (site) =>
  new Set([...site.pages, ...site.authenticatedPages, ...site.login.filter((step) => step.action === "goto").map((step) => step.path)]);

const indexedSteps = (test) => test.steps.map((step, stepIndex) => ({ step, stepIndex }));

const findUnknownPages = (tests, site) => {
  const allowedPaths = knownPagePaths(site);
  return tests.flatMap((test, testIndex) =>
    indexedSteps(test)
      .filter(({ step }) => step.action === "goto" && !allowedPaths.has(step.path))
      .map(
        ({ step, stepIndex }) =>
          `tests[${testIndex}].steps[${stepIndex}]: goto "${step.path}" is not a page of this site, use one of ${[...allowedPaths].join(", ")}`
      )
  );
};

const findMissingLogins = (tests, site) => {
  const authenticatedPaths = new Set(site.authenticatedPages);
  const isLoginSubmit = (step) =>
    step.action === site.login.at(-1)?.action && step.target && describeTarget(step.target) === describeTarget(site.login.at(-1).target);
  return tests.flatMap((test, testIndex) =>
    indexedSteps(test)
      .filter(
        ({ step, stepIndex }) =>
          step.action === "goto" && authenticatedPaths.has(step.path) && !test.steps.slice(0, stepIndex).some(isLoginSubmit)
      )
      .map(
        ({ step, stepIndex }) =>
          `tests[${testIndex}].steps[${stepIndex}]: "${step.path}" needs a logged-in user, perform the login steps before opening it`
      )
  );
};

const MIN_EXPECTED_TEXT_LENGTH = 3;

const findGenericAssertions = (tests) =>
  tests.flatMap((test, testIndex) =>
    indexedSteps(test)
      .filter(({ step }) => step.action === "expectText" && step.value.trim().length < MIN_EXPECTED_TEXT_LENGTH)
      .map(
        ({ step, stepIndex }) =>
          `tests[${testIndex}].steps[${stepIndex}]: expectText "${step.value}" is too generic and could match unrelated text, assert something specific to the outcome`
      )
  );

export const findLabelClicks = (tests) =>
  tests.flatMap((test, testIndex) =>
    indexedSteps(test)
      .filter(({ step }) => step.action === "click" && step.target.strategy === "label")
      .map(
        ({ step, stepIndex }) =>
          `tests[${testIndex}].steps[${stepIndex}]: click ${describeTarget(step.target)} uses a label, which can match a whole form, click it by role such as button or link`
      )
  );

const findUnknownIds = (tests, snapshots) => {
  const knownIds = new Set(
    Object.values({ ...snapshots.publicPages, ...snapshots.authenticatedPages }).flatMap((elements) =>
      elements.map((element) => element.id).filter(Boolean)
    )
  );
  return tests.flatMap((test, testIndex) =>
    indexedSteps(test)
      .filter(({ step }) => step.target?.idHint && !knownIds.has(step.target.idHint))
      .map(
        ({ step, stepIndex }) =>
          `tests[${testIndex}].steps[${stepIndex}]: idHint "${step.target.idHint}" is not an id in any snapshot, copy the id exactly or leave idHint out`
      )
  );
};

export const findSuiteProblems = (tests, site, snapshots) => [
  ...findUnknownPages(tests, site),
  ...findLabelClicks(tests),
  ...findUnknownIds(tests, snapshots),
  ...findGenericAssertions(tests),
  ...findMissingLogins(tests, site),
  ...findUnknownAssertionTargets(tests, snapshots),
];

const findUnknownAssertionTargets = (tests, snapshots) => {
  const knownNames = new Set(
    Object.values({ ...snapshots.publicPages, ...snapshots.authenticatedPages }).flatMap((elements) =>
      elements.map((element) => element.name)
    )
  );
  return tests.flatMap((test, testIndex) =>
    test.steps
      .map((step, stepIndex) => ({ step, stepIndex }))
      .filter(({ step }) => step.action === "expectVisible" && !knownNames.has(step.target.name ?? step.target.value))
      .map(
        ({ step, stepIndex }) =>
          `tests[${testIndex}].steps[${stepIndex}]: "${step.target.name ?? step.target.value}" is not in any snapshot, use expectText for content that appears after an action`
      )
  );
};

async function generateSuiteWithGroq(ticket, requestedSite) {
  const { site, snapshots } = await exploreSite(requestedSite);
  const suiteSchema = generatedSuiteSchema(ticket.acceptanceCriteria.length);
  const basePrompt = buildGenerationPrompt(ticket, site, snapshots);
  let feedback = "";
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const response = await generateJson(`${basePrompt}${feedback}`, suiteJsonSchema([...knownPagePaths(site)]));
    const parsed = suiteSchema.safeParse(toInternalSuite(response.data));
    const suiteProblems = parsed.success ? findSuiteProblems(parsed.data.tests, site, snapshots) : [];
    if (parsed.success && suiteProblems.length === 0) {
      return parsed.data.tests.map((test) => ({
        ...test,
        generatedBy: "groq",
        generationNote: `Written by ${response.model} on attempt ${attempt} of ${MAX_GENERATION_ATTEMPTS}`,
      }));
    }
    lastError = parsed.success ? suiteProblems.join("\n") : z.prettifyError(parsed.error);
    feedback = `\n\nYour previous response was rejected by the validator:\n${lastError}\nReturn the full corrected JSON.`;
  }
  throw new Error(`Groq output failed validation ${MAX_GENERATION_ATTEMPTS} times. Last errors: ${lastError}`);
}

const failedGroqSuite = (ticket, error) =>
  ticket.acceptanceCriteria.map((criterion, criterionIndex) => ({
    criterionIndex,
    name: criterion,
    steps: [],
    generatedBy: "groq",
    generationNote: `Groq could not write this test: ${summarizeLlmError(error)}`,
  }));

const deterministicSuite = (ticket) =>
  ticket.acceptanceCriteria.map((criterion, criterionIndex) => {
    const test = generateDeterministicTest(criterion);
    return {
      criterionIndex,
      ...test,
      generatedBy: "deterministic",
      generationNote:
        test.steps.length > 0
          ? "GROQ_API_KEY is not set, so a built-in template was used"
          : "GROQ_API_KEY is not set and no built-in template matches this criterion",
    };
  });

export async function generateTests(ticket, site) {
  const tests = isLlmConfigured()
    ? await generateSuiteWithGroq(ticket, site).catch((error) => failedGroqSuite(ticket, error))
    : deterministicSuite(ticket);
  return tests
    .toSorted((left, right) => left.criterionIndex - right.criterionIndex)
    .map((test) => ({
      ...test,
      criterion: ticket.acceptanceCriteria[test.criterionIndex],
      siteName: site.name,
      formatVersion: SUITE_FORMAT_VERSION,
      specCode: renderSpec(test, site),
    }));
}
