import { settings } from "../../config/env.js";
import { ApiError } from "../../utils/apiError.js";

const { jira } = settings;

const resolveJiraCredentials = (credentials) => credentials ?? {
  baseUrl: jira.baseUrl,
  email: jira.email,
  apiToken: jira.apiToken,
};

const isJiraConfigured = (credentials) => {
  const resolved = resolveJiraCredentials(credentials);
  return Boolean(resolved.baseUrl && resolved.email && resolved.apiToken);
};

async function jiraRequest(pathname, credentials, init = {}) {
  const resolved = resolveJiraCredentials(credentials);
  if (!isJiraConfigured(resolved)) {
    throw ApiError.badRequest("Configure Jira credentials before using Jira integration");
  }
  const response = await fetch(new URL(pathname, resolved.baseUrl), {
    ...init,
    redirect: "error",
    headers: {
      Authorization: `Basic ${Buffer.from(`${resolved.email}:${resolved.apiToken}`).toString("base64")}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    const status = response.status === 404 ? 404 : [401, 403].includes(response.status) ? 401 : 502;
    const responseText = await response.text();
    let jiraMessage = "";
    if (responseText) {
      try {
        const body = JSON.parse(responseText);
        const messages = [
          ...(Array.isArray(body.errorMessages) ? body.errorMessages : []),
          ...Object.values(body.errors ?? {}),
        ].filter((message) => typeof message === "string" && message.trim());
        jiraMessage = messages.join(" ");
      } catch {
        jiraMessage = "";
      }
    }
    const message = jiraMessage
      ? `Jira request failed (${response.status}): ${jiraMessage}`
      : `Jira request failed with HTTP ${response.status}`;
    throw new ApiError(status, message);
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

async function testJiraCredentials(credentials) {
  const account = await jiraRequest("/rest/api/3/myself", credentials);
  return { displayName: account.displayName, emailAddress: account.emailAddress };
}

async function fetchJiraTicket(issueKey, credentials) {
  const issue = await jiraRequest(
    `/rest/api/3/issue/${encodeURIComponent(issueKey)}?fields=summary,description`,
    credentials
  );
  return {
    id: issue.key,
    title: issue.fields.summary,
    acceptanceCriteria: extractAcceptanceCriteria(issue.fields.description),
    target: targetFromDescription(issue.fields.description),
  };
}

async function searchJiraTickets(credentials, nextPageToken) {
  const result = await jiraRequest(
    "/rest/api/3/search/jql",
    credentials,
    {
      method: "POST",
      body: JSON.stringify({
        jql: 'created >= "1970-01-01" ORDER BY updated DESC',
        maxResults: 50,
        fields: ["summary", "description", "status", "issuetype"],
        ...(nextPageToken && { nextPageToken }),
      }),
    }
  );
  return {
    tickets: result.issues.map((issue) => ({
      id: issue.key,
      title: issue.fields.summary,
      acceptanceCriteria: extractAcceptanceCriteria(issue.fields.description),
      target: targetFromDescription(issue.fields.description),
      status: issue.fields.status?.name ?? "",
      issueType: issue.fields.issuetype?.name ?? "",
      source: "jira",
    })),
    nextPageToken: result.nextPageToken ?? null,
  };
}

const adfParagraph = (text, marks = []) => ({ type: "paragraph", content: [{ type: "text", text, marks }] });

async function postJiraComment(issueKey, summaryLine, resultLines, credentials) {
  await jiraRequest(`/rest/api/3/issue/${encodeURIComponent(issueKey)}/comment`, credentials, {
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

export {
  isJiraConfigured,
  extractAcceptanceCriteria,
  fetchJiraTicket,
  searchJiraTickets,
  postJiraComment,
  testJiraCredentials,
};
