import { db } from "../config/database.js";

function insertRepair(repair) {
  db.prepare(
    `INSERT INTO repairs
      (runId, testName, stepIndex, oldLocator, newLocator, reason, method, confidence, outcome, timestamp)
     VALUES
      (@runId, @testName, @stepIndex, @oldLocator, @newLocator, @reason, @method, @confidence, @outcome, @timestamp)`
  ).run(repair);
}

function listRepairs(runId) {
  return db.prepare("SELECT * FROM repairs WHERE runId = ? ORDER BY id").all(runId);
}

export { insertRepair, listRepairs };
