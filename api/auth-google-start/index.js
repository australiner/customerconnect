const crypto = require("crypto");
const cookie = require("cookie");
const { SECURE_COOKIE } = require("../shared/jwt");

module.exports = async function (context, req) {
  const state = crypto.randomBytes(16).toString("hex");

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });

  context.res = {
    status: 302,
    headers: {
      Location: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
      "Set-Cookie": cookie.serialize("oauth_state", state, {
        httpOnly: true,
        secure: SECURE_COOKIE,
        sameSite: "lax",
        path: "/",
        maxAge: 600,
      }),
    },
  };
};
