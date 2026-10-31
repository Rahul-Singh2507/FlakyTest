import { Router } from "express";
import {
  listRunHistory,
  listRunRepairs,
  sendScreenshot,
  showRun,
  startNewRun,
  streamRunEvents,
} from "../controllers/runController.js";
import asyncHandler from "../middleware/asyncHandler.js";

export const runRouter = Router();

runRouter.post("/", asyncHandler(startNewRun));
runRouter.get("/", listRunHistory);
runRouter.get("/:id", showRun);
runRouter.get("/:id/repairs", listRunRepairs);
runRouter.get("/:id/screenshots/:testId", sendScreenshot);
runRouter.get("/:id/events", streamRunEvents);
