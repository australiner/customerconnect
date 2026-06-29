const bcrypt = require("bcryptjs");
const { getPool, sql } = require("../shared/db");
const { signSession, buildSessionCookie } = require("../shared/jwt");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

module.exports = async function (context, req) {
  const { email, password } = req.body || {};

  if (!email || !EMAIL_RE.test(email) || !password || password.length < 8) {
    context.res = {
      status: 400,
      body: { error: "Enter a valid email and a password of at least 8 characters." },
    };
    return;
  }

  try {
    const pool = await getPool();
    const existing = await pool
      .request()
      .input("email", sql.NVarChar, email)
      .query("SELECT Id FROM CustomerUsers WHERE Email = @email");

    if (existing.recordset.length > 0) {
      context.res = {
        status: 409,
        body: { error: "An account with this email already exists." },
      };
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await pool
      .request()
      .input("email", sql.NVarChar, email)
      .input("passwordHash", sql.NVarChar, passwordHash)
      .query(
        "INSERT INTO CustomerUsers (Email, PasswordHash, Provider) VALUES (@email, @passwordHash, 'local')"
      );

    const token = signSession({ email });

    context.res = {
      status: 200,
      headers: { "Set-Cookie": buildSessionCookie(token), "Content-Type": "application/json" },
      body: { email },
    };
  } catch (err) {
    context.log.error(err);
    context.res = { status: 500, body: { error: "Something went wrong. Please try again." } };
  }
};
