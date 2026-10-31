import { db } from "../config/database.js";

const parseResult = (row) => ({
  ...row,
  flaky: row.flaky === 1,
  attempts: JSON.parse(row.attempts),
  steps: JSON.parse(row.steps),
});

function insertTestResult(result) {
  const info = db
    .prepare(
      `INSERT INTO test_results
        (runId, testIndex, testName, criterion, generatedBy, generationNote, status, flaky, attempts, duration,
         errorMessage, failureKind, screenshotPath, afterScreenshotPath, steps, specCode)
       VALUES
        (@runId, @testIndex, @testName, @criterion, @generatedBy, @generationNote, @status, @flaky, @attempts, @duration,
         @errorMessage, @failureKind, @screenshotPath, @afterScreenshotPath, @steps, @specCode)`
    )
    .run({
      ...result,
      flaky: result.flaky ? 1 : 0,
      attempts: JSON.stringify(result.attempts),
      steps: JSON.stringify(result.steps),
    });
  return Number(info.lastInsertRowid);
}

function listResults(runId) {
  return db
    .prepare("SELECT * FROM test_results WHERE runId = ? ORDER BY testIndex")
    .all(runId)
    .map(parseResult);
}

function findResult(runId, resultId) {
  return db.prepare("SELECT * FROM test_results WHERE runId = ? AND id = ?").get(runId, resultId);
}

export { insertTestResult, listResults, findResult };
