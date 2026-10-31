import { db } from "../config/database.js";

export function findSuite(ticketId) {
  const row = db.prepare("SELECT tests FROM test_suites WHERE ticketId = ?").get(ticketId);
  return row && JSON.parse(row.tests);
}

export function saveSuite(ticketId, tests) {
  db.prepare(
    `INSERT INTO test_suites (ticketId, tests, updatedAt) VALUES (?, ?, ?)
     ON CONFLICT(ticketId) DO UPDATE SET tests = excluded.tests, updatedAt = excluded.updatedAt`
  ).run(ticketId, JSON.stringify(tests), new Date().toISOString());
}
