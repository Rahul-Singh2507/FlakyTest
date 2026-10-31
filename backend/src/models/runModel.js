import mongoose from "mongoose";
import { withId } from "../config/database.js";

const runSchema = new mongoose.Schema(
  {
    _id: String,
    ticketId: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    ticket: { type: mongoose.Schema.Types.Mixed, default: null },
    status: { type: String, required: true, default: "running" },
    suiteSource: { type: String, default: null },
    repeatCount: { type: Number, required: true, default: 1 },
    errorMessage: { type: String, default: null },
    siteName: String,
    siteUrl: String,
    createdAt: { type: Date, required: true, index: true },
    completedAt: { type: Date, default: null },
  },
  { collection: "runs" }
);

const Run = mongoose.model("Run", runSchema);

const countWhen = (condition) => ({ $sum: { $cond: [condition, 1, 0] } });

async function createRun({ id, userId, ticketId, repeatCount, siteName, siteUrl }) {
  await Run.create({ _id: id, userId, ticketId, repeatCount, siteName, siteUrl, createdAt: new Date() });
}

async function attachTicketToRun(runId, ticket, suiteSource) {
  await Run.updateOne({ _id: runId }, { ticket, suiteSource });
}

async function finishRun(runId, status, errorMessage = null) {
  await Run.updateOne({ _id: runId }, { status, errorMessage, completedAt: new Date() });
}

async function listRuns(userId) {
  const runs = await Run.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    { $sort: { createdAt: -1 } },
    { $limit: 100 },
    {
      $lookup: {
        from: "test_results",
        localField: "_id",
        foreignField: "runId",
        as: "counts",
        pipeline: [
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              passed: countWhen({ $eq: ["$status", "passed"] }),
              failed: countWhen({ $eq: ["$status", "failed"] }),
              healed: countWhen({ $eq: ["$status", "healed"] }),
              flaky: countWhen("$flaky"),
            },
          },
          { $unset: "_id" },
        ],
      },
    },
    { $replaceWith: { $mergeObjects: ["$$ROOT", { total: 0 }, { $first: "$counts" }] } },
    { $unset: "counts" },
  ]);
  return runs.map(withId);
}

async function findRun(runId, userId) {
  const run = await Run.findOne({ _id: runId, userId }).lean();
  return run && withId(run);
}

export { createRun, attachTicketToRun, finishRun, listRuns, findRun };
