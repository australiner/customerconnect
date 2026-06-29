const jwt = require("jsonwebtoken");
const cookie = require("cookie");

const COOKIE_NAME = "session";
const SECRET = process.env.JWT_SECRET;
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days
// Set COOKIE_SECURE=false only for local http development.
const SECURE_COOKIE = process.env.COOKIE_SECURE !== "false";

function signSession(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: MAX_AGE_SECONDS });
}

function verifySession(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

function getSessionFromRequest(req) {
  const cookies = cookie.parse(req.headers.cookie || "");
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  return verifySession(token);
}

function buildSessionCookie(token) {
  return cookie.serialize(COOKIE_NAME, token, {
    httpOnly: true,
    secure: SECURE_COOKIE,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

function buildClearCookie() {
  return cookie.serialize(COOKIE_NAME, "", {
    httpOnly: true,
    secure: SECURE_COOKIE,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

module.exports = {
  COOKIE_NAME,
  SECURE_COOKIE,
  signSession,
  verifySession,
  getSessionFromRequest,
  buildSessionCookie,
  buildClearCookie,
};
