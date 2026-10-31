import { settings } from "../../config/env.js";
import { ApiError } from "../../utils/apiError.js";

const { jira } = settings;

const isJiraConfigured = () => Boolean(jira.baseUrl && jira.email && jira.apiToken);

async function jiraRequest(pathname, init = {}) {
  const response = await fetch(new URL(pathname, jira.baseUrl), {
    ...init,
    headers: {
      Authorization: `Basic ${Buffer.from(`${jira.email}:${jira.apiToken}`).toString("base64")}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    throw new ApiError(response.status === 404 ? 404 : 502, `Jira responded ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

const nodeText = (node) =>
  node.type === "text" ? node.text : (node.content ?? []).map(nodeText).join(node.type === "paragraph" ? "" : " ");

const collectListItems = (node) =>
  node.type === "listItem" ? [nodeText(node)] : (node.content ?? []).flatMap(collectListItems);

const isAcceptanceHeading = (node) =>
  ["heading", "paragraph"].includes(node.type) && /^\s*acceptance criteria:?\s*$/i.test(nodeText(node));

function extractAcceptanceCriteria(document) {
  const blocks = document?.content ?? [];
  const headingIndex = blocks.findIndex(isAcceptanceHeading);
  const nextHeadingOffset = blocks.slice(headingIndex + 1).findIndex((block) => block.type === "heading");
  const section =
    headingIndex === -1
      ? blocks
      : blocks.slice(headingIndex + 1, nextHeadingOffset === -1 ? undefined : headingIndex + 1 + nextHeadingOffset);
  return section
    .flatMap(collectListItems)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

const targetFromDescription = (document) => nodeText(document ?? { type: "doc" }).match(/\b(?:target|url):\s*(https?:\/\/[^\s<>"]+)/i)?.[1];

async function fetchJiraTicket(issueKey) {
  const issue = await jiraRequest(`/rest/api/3/issue/${encodeURIComponent(issueKey)}?fields=summary,description`);
  return {
    id: issue.key,
    title: issue.fields.summary,
    acceptanceCriteria: extractAcceptanceCriteria(issue.fields.description),
    target: targetFromDescription(issue.fields.description),
  };
}

const adfParagraph = (text, marks = []) => ({ type: "paragraph", content: [{ type: "text", text, marks }] });

async function postJiraComment(issueKey, summaryLine, resultLines) {
  await jiraRequest(`/rest/api/3/issue/${encodeURIComponent(issueKey)}/comment`, {
    method: "POST",
    body: JSON.stringify({
      body: {
        type: "doc",
        version: 1,
        content: [
          adfParagraph(summaryLine, [{ type: "strong" }]),
          {
            type: "bulletList",
            content: resultLines.map((line) => ({ type: "listItem", content: [adfParagraph(line)] })),
          },
        ],
      },
    }),
  });
}

export { isJiraConfigured, extractAcceptanceCriteria, fetchJiraTicket, postJiraComment };
