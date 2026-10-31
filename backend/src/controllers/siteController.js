import { z } from "zod";
import { sitePreviewSchema } from "../validators/siteSchemas.js";
import { previewSite } from "../services/sites/siteExplorer.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";

export async function previewSiteHandler(req, res) {
  const parsed = sitePreviewSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest(z.prettifyError(parsed.error));
  }
  ApiResponse.success(res, await previewSite(parsed.data.url));
}
