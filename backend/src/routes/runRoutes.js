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

const runRouter = Router();

runRouter.post("/", asyncHandler(startNewRun));
runRouter.get("/", asyncHandler(listRunHistory));
runRouter.get("/:id", asyncHandler(showRun));
runRouter.get("/:id/repairs", asyncHandler(listRunRepairs));
runRouter.get("/:id/screenshots/:testId", asyncHandler(sendScreenshot));
runRouter.get("/:id/events", asyncHandler(streamRunEvents));

export { runRouter };
