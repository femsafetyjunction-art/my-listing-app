// Shared helpers for the Etsy API
const TOKEN_URL = "https://api.etsy.com/v3/public/oauth/token";

async function refreshAccessToken() {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: process.env.ETSY_API_KEY,
      refresh_token: process.env.ETSY_REFRESH_TOKEN,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error("Token refresh failed: " + JSON.stringify(data));
  return data.access_token;
}

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*"); // v1: open. Later: restrict to your site's domain.
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

module.exports = { refreshAccessToken, cors };
