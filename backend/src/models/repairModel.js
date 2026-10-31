import mongoose from "mongoose";
import { withId } from "../config/database.js";

const repairSchema = new mongoose.Schema(
  {
    runId: { type: String, required: true, index: true },
    testName: { type: String, required: true },
    stepIndex: { type: Number, required: true },
    oldLocator: { type: String, required: true },
    newLocator: { type: String, required: true },
    reason: { type: String, required: true },
    method: { type: String, required: true },
    confidence: { type: Number, required: true },
    outcome: { type: String, required: true },
    timestamp: { type: String, required: true },
  },
  { collection: "repairs" }
);

const Repair = mongoose.model("Repair", repairSchema);

async function insertRepairs(repairs) {
  await Repair.insertMany(repairs);
}

async function listRepairs(runId) {
  const repairs = await Repair.find({ runId }).sort({ _id: 1 }).lean();
  return repairs.map(withId);
}

export { insertRepairs, listRepairs };
