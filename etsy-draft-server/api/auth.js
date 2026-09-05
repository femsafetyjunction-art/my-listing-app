// STEP 1 of setup: visit https://YOUR-APP.vercel.app/api/auth once.
// Starts Etsy OAuth (PKCE). Requires env: ETSY_API_KEY, ETSY_REDIRECT_URI.
const crypto = require("crypto");

module.exports = (req, res) => {
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  const state = crypto.randomBytes(12).toString("hex");

  // keep the PKCE verifier in a short-lived cookie for the callback
  res.setHeader("Set-Cookie", [
    `etsy_verifier=${verifier}; HttpOnly; Path=/; Max-Age=600; SameSite=Lax; Secure`,
    `etsy_state=${state}; HttpOnly; Path=/; Max-Age=600; SameSite=Lax; Secure`,
  ]);

  const url =
    "https://www.etsy.com/oauth/connect" +
    "?response_type=code" +
    "&client_id=" + encodeURIComponent(process.env.ETSY_API_KEY) +
    "&redirect_uri=" + encodeURIComponent(process.env.ETSY_REDIRECT_URI) +
    "&scope=" + encodeURIComponent("listings_w listings_r shops_r") +
    "&state=" + state +
    "&code_challenge=" + challenge +
    "&code_challenge_method=S256";

  res.writeHead(302, { Location: url });
  res.end();
};
