import { Router } from "express";
import { previewSiteHandler } from "../controllers/siteController.js";
import asyncHandler from "../middleware/asyncHandler.js";

const siteRouter = Router();

siteRouter.post("/preview", asyncHandler(previewSiteHandler));

export { siteRouter };
