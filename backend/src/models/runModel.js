import { db } from "../config/database.js";

const parseRun = (row) => ({ ...row, ticket: JSON.parse(row.ticket ?? "null") });

function createRun({ id, ticketId, repeatCount, siteName, siteUrl }) {
  db.prepare(
    "INSERT INTO runs (id, ticketId, repeatCount, siteName, siteUrl, createdAt) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, ticketId, repeatCount, siteName, siteUrl, new Date().toISOString());
}

function attachTicketToRun(runId, ticket, suiteSource) {
  db.prepare("UPDATE runs SET ticket = ?, suiteSource = ? WHERE id = ?").run(
    JSON.stringify(ticket),
    suiteSource,
    runId
  );
}

function finishRun(runId, status, errorMessage = null) {
  db.prepare("UPDATE runs SET status = ?, errorMessage = ?, completedAt = ? WHERE id = ?").run(
    status,
    errorMessage,
    new Date().toISOString(),
    runId
  );
}

function listRuns() {
  return db
    .prepare(
      `SELECT runs.*,
        COUNT(test_results.id) AS total,
        SUM(test_results.status = 'passed') AS passed,
        SUM(test_results.status = 'failed') AS failed,
        SUM(test_results.status = 'healed') AS healed,
        SUM(test_results.flaky) AS flaky
       FROM runs LEFT JOIN test_results ON test_results.runId = runs.id
       GROUP BY runs.id
       ORDER BY runs.createdAt DESC
       LIMIT 100`
    )
    .all()
    .map(parseRun);
}

function findRun(runId) {
  const row = db.prepare("SELECT * FROM runs WHERE id = ?").get(runId);
  return row && parseRun(row);
}

export { createRun, attachTicketToRun, finishRun, listRuns, findRun };
