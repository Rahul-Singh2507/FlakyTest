import { z } from "zod";
import { ApiError } from "../utils/apiError.js";

export function parseOrThrow(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw ApiError.badRequest(z.prettifyError(result.error));
  }
  return result.data;
}
