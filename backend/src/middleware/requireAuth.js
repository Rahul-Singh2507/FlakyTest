import { Session } from "../models/sessionModel.js";
import { ApiError } from "../utils/apiError.js";
import { hashSessionToken, readSessionToken } from "../utils/sessionToken.js";

async function requireAuth(req, _res, next) {
  const token = readSessionToken(req);
  if (!token) {
    return next(ApiError.unauthorized());
  }

  try {
    const session = await Session.findOne({
      tokenHash: hashSessionToken(token),
      expiresAt: { $gt: new Date() },
    }).populate("userId");

    if (!session?.userId) {
      return next(ApiError.unauthorized("Session expired or invalid"));
    }

    req.user = session.userId;
    return next();
  } catch (error) {
    return next(error);
  }
}

export { requireAuth };
