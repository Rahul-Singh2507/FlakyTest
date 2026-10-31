import { db } from "../config/database.js";

export function insertRepair(repair) {
  db.prepare(
    `INSERT INTO repairs
      (runId, testName, stepIndex, oldLocator, newLocator, reason, method, confidence, outcome, timestamp)
     VALUES
      (@runId, @testName, @stepIndex, @oldLocator, @newLocator, @reason, @method, @confidence, @outcome, @timestamp)`
  ).run(repair);
}

export function listRepairs(runId) {
  return db.prepare("SELECT * FROM repairs WHERE runId = ? ORDER BY id").all(runId);
}
