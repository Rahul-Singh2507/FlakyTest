import mongoose from "mongoose";
import { withId } from "../config/database.js";

const testResultSchema = new mongoose.Schema(
  {
    runId: { type: String, required: true, index: true },
    testIndex: { type: Number, required: true },
    testName: { type: String, required: true },
    criterion: { type: String, required: true },
    generatedBy: { type: String, required: true },
    generationNote: { type: String, default: null },
    status: { type: String, required: true },
    flaky: { type: Boolean, required: true, default: false },
    attempts: { type: [String], required: true },
    duration: { type: Number, required: true },
    errorMessage: { type: String, default: null },
    failureKind: { type: String, default: null },
    screenshotPath: { type: String, default: null },
    afterScreenshotPath: { type: String, default: null },
    steps: { type: mongoose.Schema.Types.Mixed, required: true },
    specCode: { type: String, required: true },
  },
  { collection: "test_results" }
);

const TestResult = mongoose.model("TestResult", testResultSchema);

async function insertTestResult(result) {
  const { _id } = await TestResult.create(result);
  return String(_id);
}

async function listResults(runId) {
  const results = await TestResult.find({ runId }).sort({ testIndex: 1 }).lean();
  return results.map(withId);
}

async function findResult(runId, resultId) {
  if (!mongoose.isValidObjectId(resultId)) {
    return null;
  }
  const result = await TestResult.findOne({ _id: resultId, runId }).lean();
  return result && withId(result);
}

export { insertTestResult, listResults, findResult };
