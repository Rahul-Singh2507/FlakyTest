import { Router } from "express";
import { testJiraConnection } from "../controllers/jiraController.js";
import asyncHandler from "../middleware/asyncHandler.js";

const integrationRouter = Router();

integrationRouter.post("/jira/test", asyncHandler(testJiraConnection));

export { integrationRouter };
