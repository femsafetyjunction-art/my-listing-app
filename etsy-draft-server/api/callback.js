// STEP 2 of setup: Etsy redirects here after you approve access.
// Shows your REFRESH TOKEN and SHOP ID — copy both into Vercel env vars.
module.exports = async (req, res) => {
  try {
    const { code, state } = req.query;
    const cookies = Object.fromEntries(
      (req.headers.cookie || "").split(";").map((c) => c.trim().split("=").map(decodeURIComponent)).filter((p) => p[0])
    );
    if (!code) throw new Error("No code returned from Etsy");
    if (!cookies.etsy_verifier) throw new Error("PKCE cookie missing — start again at /api/auth");
    if (state !== cookies.etsy_state) throw new Error("State mismatch — start again at /api/auth");

    const tokenRes = await fetch("https://api.etsy.com/v3/public/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: process.env.ETSY_API_KEY,
        redirect_uri: process.env.ETSY_REDIRECT_URI,
        code,
        code_verifier: cookies.etsy_verifier,
      }),
    });
    const tok = await tokenRes.json();
    if (!tokenRes.ok) throw new Error(JSON.stringify(tok));

    // find the shop id
    const userId = tok.access_token.split(".")[0];
    const shopRes = await fetch(`https://api.etsy.com/v3/application/users/${userId}/shops`, {
      headers: { "x-api-key": process.env.ETSY_API_KEY, Authorization: `Bearer ${tok.access_token}` },
    });
    const shop = await shopRes.json();
    const shopId = shop.shop_id || (shop.results && shop.results[0] && shop.results[0].shop_id) || "NOT FOUND";

    res.setHeader("Content-Type", "text/html");
    res.end(`<html><body style="font-family:sans-serif;max-width:640px;margin:40px auto;line-height:1.6">
      <h2>✅ Etsy connected</h2>
      <p>Copy these two values into your Vercel project → Settings → Environment Variables, then <b>redeploy</b>:</p>
      <p><b>ETSY_REFRESH_TOKEN</b></p>
      <textarea style="width:100%;height:90px">${tok.refresh_token}</textarea>
      <p><b>ETSY_SHOP_ID</b></p>
      <input style="width:100%" value="${shopId}" />
      <p style="color:#a00"><b>Keep these secret.</b> Anyone with the refresh token can write to your shop.</p>
      <p>Then find your clipart taxonomy id at <code>/api/taxonomy?q=clip</code> and set <b>ETSY_TAXONOMY_ID</b>.</p>
    </body></html>`);
  } catch (e) {
    res.statusCode = 500;
    res.end("Callback error: " + e.message);
  }
};
