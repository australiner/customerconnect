const { buildClearCookie } = require("../shared/jwt");

module.exports = async function (context, req) {
  context.res = {
    status: 200,
    headers: { "Set-Cookie": buildClearCookie(), "Content-Type": "application/json" },
    body: { ok: true },
  };
};
