// Listens for Lemon Squeezy subscription events so each customer's
// generation count resets on THEIR actual renewal date, not a shared
// calendar month.
//
// SETUP:
// 1. In Lemon Squeezy: Settings -> Webhooks -> Add endpoint
//    URL: https://YOUR-APP.vercel.app/api/webhook/lemonsqueezy
//    Events to send: subscription_payment_success (required),
//      subscription_cancelled and subscription_expired (recommended,
//      used only to clear the stored status — access itself is still
//      gated by the live license check in generate.js).
// 2. Copy the "Signing secret" Lemon Squeezy shows you and set it as
//    the LEMONSQUEEZY_WEBHOOK_SECRET env var in Vercel.
// 3. Redeploy.
//
// Env needed: LEMONSQUEEZY_WEBHOOK_SECRET, KV_REST_API_URL, KV_REST_API_TOKEN

const crypto = require("crypto");
const { kv } = require("@vercel/kv");

// Vercel honors this config export to skip automatic JSON body parsing,
// which we need so we can verify the signature against the exact raw bytes.
module.exports.config = { api: { bodyParser: false } };

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function isValidSignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader || !secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signatureHeader, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.statusCode = 405;
    return res.end("POST only");
  }

  let rawBody;
  try {
    rawBody = await readRawBody(req);
  } catch (e) {
    res.statusCode = 400;
    return res.end("Could not read body");
  }

  const signature = req.headers["x-signature"];
  if (!isValidSignature(rawBody, signature, process.env.LEMONSQUEEZY_WEBHOOK_SECRET)) {
    res.statusCode = 401;
    return res.end("Invalid signature");
  }

  let body;
  try {
    body = JSON.parse(rawBody);
  } catch (e) {
    res.statusCode = 400;
    return res.end("Bad JSON");
  }

  const eventName = body.meta && body.meta.event_name;
  const attrs = (body.data && body.data.attributes) || {};
  const customerId = attrs.customer_id != null ? String(attrs.customer_id) : null;

  try {
    if (eventName === "subscription_payment_success" && customerId) {
      // A renewal (or the first) payment just succeeded — start this
      // customer's usage count fresh for their new billing period.
      await kv.set(`usage:${customerId}`, 0);
      await kv.set(`status:${customerId}`, "active");
    } else if ((eventName === "subscription_cancelled" || eventName === "subscription_expired") && customerId) {
      await kv.set(`status:${customerId}`, "inactive");
    }
    // Any other event: acknowledge and ignore — we only act on the ones above.
    res.statusCode = 200;
    res.end("ok");
  } catch (e) {
    res.statusCode = 500;
    res.end("Webhook handler error: " + e.message);
  }
};
