const cookie = require("cookie");
const { getPool, sql } = require("../shared/db");
const { signSession, buildSessionCookie } = require("../shared/jwt");

module.exports = async function (context, req) {
  const { code, state } = req.query;
  const cookies = cookie.parse(req.headers.cookie || "");

  if (!code || !state || state !== cookies.oauth_state) {
    context.res = {
      status: 400,
      body: "Invalid or expired sign-in attempt. Please try again.",
    };
    return;
  }

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error("Google token exchange failed");
    }
    const tokens = await tokenResponse.json();

    const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = await profileResponse.json();

    const pool = await getPool();
    const existing = await pool
      .request()
      .input("email", sql.NVarChar, profile.email)
      .query("SELECT Id FROM CustomerUsers WHERE Email = @email");

    if (existing.recordset.length === 0) {
      await pool
        .request()
        .input("email", sql.NVarChar, profile.email)
        .input("providerId", sql.NVarChar, profile.sub)
        .query(
          "INSERT INTO CustomerUsers (Email, Provider, ProviderId) VALUES (@email, 'google', @providerId)"
        );
    }

    const token = signSession({ email: profile.email });

    context.res = {
      status: 302,
      headers: {
        Location: "/dashboard.html",
        "Set-Cookie": buildSessionCookie(token),
      },
    };
  } catch (err) {
    context.log.error(err);
    context.res = { status: 500, body: "Sign-in failed. Please try again." };
  }
};
