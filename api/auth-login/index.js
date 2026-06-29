const bcrypt = require("bcryptjs");
const { getPool, sql } = require("../shared/db");
const { signSession, buildSessionCookie } = require("../shared/jwt");

// A dummy hash so a bcrypt.compare always runs, whether or not the account
// exists - this keeps response timing from revealing valid emails.
const DUMMY_HASH = "$2a$12$CwTycUXWue0Thq9StjUM0u";

module.exports = async function (context, req) {
  const { email, password } = req.body || {};
  const genericError = { error: "Incorrect email or password." };

  if (!email || !password) {
    context.res = { status: 400, body: genericError };
    return;
  }

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("email", sql.NVarChar, email)
      .query("SELECT PasswordHash FROM CustomerUsers WHERE Email = @email AND Provider = 'local'");

    const user = result.recordset[0];
    const valid = await bcrypt.compare(password, user ? user.PasswordHash : DUMMY_HASH);

    if (!user || !valid) {
      context.res = { status: 401, body: genericError };
      return;
    }

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
