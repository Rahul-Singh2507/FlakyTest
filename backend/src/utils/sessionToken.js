import { createHash } from "crypto";

const SESSION_COOKIE = "flakytest_session";

const hashSessionToken = (token) => createHash("sha256").update(token).digest("hex");

const readSessionToken = (req) => {
  const cookie = req.headers.cookie
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  return cookie?.slice(SESSION_COOKIE.length + 1);
};

export { hashSessionToken, readSessionToken };
