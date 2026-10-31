import Database from "better-sqlite3";
import { paths } from "./env.js";

const db = new Database(paths.database);
db.pragma("journal_mode = WAL");

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY,
      ticketId TEXT NOT NULL,
      ticket TEXT,
      status TEXT NOT NULL DEFAULT 'running',
      suiteSource TEXT,
      repeatCount INTEGER NOT NULL DEFAULT 1,
      errorMessage TEXT,
      createdAt TEXT NOT NULL,
      completedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS test_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      runId TEXT NOT NULL REFERENCES runs(id),
      testIndex INTEGER NOT NULL,
      testName TEXT NOT NULL,
      criterion TEXT NOT NULL,
      generatedBy TEXT NOT NULL,
      status TEXT NOT NULL,
      flaky INTEGER NOT NULL DEFAULT 0,
      attempts TEXT NOT NULL,
      duration INTEGER NOT NULL,
      errorMessage TEXT,
      failureKind TEXT,
      screenshotPath TEXT,
      afterScreenshotPath TEXT,
      steps TEXT NOT NULL,
      specCode TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS repairs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      runId TEXT NOT NULL REFERENCES runs(id),
      testName TEXT NOT NULL,
      stepIndex INTEGER NOT NULL,
      oldLocator TEXT NOT NULL,
      newLocator TEXT NOT NULL,
      reason TEXT NOT NULL,
      method TEXT NOT NULL,
      confidence REAL NOT NULL,
      outcome TEXT NOT NULL,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS test_suites (
      ticketId TEXT PRIMARY KEY,
      tests TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);
  addColumnIfMissing("test_results", "generationNote", "TEXT");
  addColumnIfMissing("runs", "siteName", "TEXT");
  addColumnIfMissing("runs", "siteUrl", "TEXT");
}

function addColumnIfMissing(table, column, definition) {
  const columnExists = db.prepare(`PRAGMA table_info(${table})`).all().some((existing) => existing.name === column);
  if (!columnExists) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

export { db, initDb };
