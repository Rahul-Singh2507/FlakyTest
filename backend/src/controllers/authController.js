import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { z } from "zod";
import { Session } from "../models/sessionModel.js";
import { User } from "../models/userModel.js";
import { loginSchema, registerSchema } from "../validators/authSchemas.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { hashSessionToken, readSessionToken } from "../utils/sessionToken.js";

const scrypt = promisify(scryptCallback);
const SESSION_COOKIE = "flakytest_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const HASH_BYTES = 64;
const DUMMY_PASSWORD_HASH = `${"0".repeat(32)}:${"0".repeat(HASH_BYTES * 2)}`;

const parseAuthInput = (schema, input) => {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw ApiError.badRequest(z.prettifyError(parsed.error));
  }
  return parsed.data;
};

const hashPassword = async (password) => {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, HASH_BYTES);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
};

const verifyPassword = async (password, storedHash) => {
  const [saltHex, hashHex] = storedHash.split(":");
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scrypt(password, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(expected, actual);
};

const setSessionCookie = (res, token) => {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=${SESSION_DURATION_MS / 1000}${secure}`
  );
};

const clearSessionCookie = (res) => {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=; HttpOnly; SameSite=Strict; Path=/api; Max-Age=0${secure}`);
};

async function createSession(user, res) {
  const token = randomBytes(32).toString("hex");
  await Session.create({
    userId: user._id,
    tokenHash: hashSessionToken(token),
    expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
  });
  setSessionCookie(res, token);
}

export async function register(req, res) {
  const input = parseAuthInput(registerSchema, req.body);
  const user = new User({
    name: input.name,
    email: input.email,
    passwordHash: await hashPassword(input.password),
  });

  try {
    await user.save();
  } catch (error) {
    if (error?.code === 11000) {
      throw ApiError.conflict("An account with this email already exists");
    }
    throw error;
  }

  await createSession(user, res);
  return ApiResponse.created(res, { user: user.toJSON() });
}

export async function login(req, res) {
  const input = parseAuthInput(loginSchema, req.body);
  const user = await User.findOne({ email: input.email }).select("+passwordHash");
  const isValid = await verifyPassword(
    input.password,
    user?.passwordHash ?? DUMMY_PASSWORD_HASH
  );

  if (!isValid) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  await createSession(user, res);
  return ApiResponse.success(res, { user: user.toJSON() });
}

export async function currentUser(req, res) {
  return ApiResponse.success(res, { user: req.user.toJSON() });
}

export async function logout(req, res) {
  const token = readSessionToken(req);
  if (token) {
    await Session.deleteOne({ tokenHash: hashSessionToken(token) });
  }
  clearSessionCookie(res);
  return ApiResponse.success(res, { message: "Logged out" });
}
