class ApiResponse {
  static success(res, data, status = 200) {
    return res.status(status).json({ success: true, data });
  }

  static created(res, data) {
    return ApiResponse.success(res, data, 201);
  }

  static error(res, status, message, details) {
    return res.status(status).json({ success: false, error: { message, details } });
  }
}

export { ApiResponse };
