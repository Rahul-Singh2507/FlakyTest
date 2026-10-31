import mongoose from "mongoose";

const testSuiteSchema = new mongoose.Schema(
  {
    _id: String,
    tests: { type: mongoose.Schema.Types.Mixed, required: true },
    updatedAt: { type: Date, required: true },
  },
  { collection: "test_suites" }
);

const TestSuite = mongoose.model("TestSuite", testSuiteSchema);

async function findSuite(ticketId) {
  const suite = await TestSuite.findById(ticketId).lean();
  return suite?.tests;
}

async function saveSuite(ticketId, tests) {
  await TestSuite.updateOne({ _id: ticketId }, { tests, updatedAt: new Date() }, { upsert: true });
}

export { findSuite, saveSuite };
