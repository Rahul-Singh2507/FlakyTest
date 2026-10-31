import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";

const errorHandler = (error, req, res, next) => {
  if (error instanceof ApiError) {
    return ApiResponse.error(res, error.status, error.message, error.details);
  }
  console.error(error);
  return ApiResponse.error(res, 500, "Internal server error");
};
export default errorHandler;
