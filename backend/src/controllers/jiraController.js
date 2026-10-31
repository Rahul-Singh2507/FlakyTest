import { z } from "zod";
import { testJiraCredentials } from "../services/integrations/jiraClient.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { jiraCredentialsSchema } from "../validators/authSchemas.js";

async function testJiraConnection(req, res) {
  const parsed = jiraCredentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest(z.prettifyError(parsed.error));
  }

  ApiResponse.success(res, await testJiraCredentials(parsed.data));
}

export { testJiraConnection };
