import { parseOrThrow } from "../validators/parseOrThrow.js";
import { sitePreviewSchema } from "../validators/siteSchemas.js";
import { previewSite } from "../services/sites/siteExplorer.js";
import { ApiResponse } from "../utils/apiResponse.js";

export async function previewSiteHandler(req, res) {
  const { url } = parseOrThrow(sitePreviewSchema, req.body);
  ApiResponse.success(res, await previewSite(url));
}
