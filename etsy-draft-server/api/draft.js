// The endpoint your generator's "Send to Etsy drafts" button calls.
// POST { title, description, tags: [...], price } → creates a DRAFT listing.
const { refreshAccessToken, cors } = require("./_etsy");

module.exports = async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") { res.statusCode = 204; return res.end(); }
  if (req.method !== "POST") { res.statusCode = 405; return res.end(JSON.stringify({ error: "POST only" })); }

  try {
    const { title, description, tags, price } = req.body || {};
    if (!title || !description) throw new Error("title and description are required");

    const token = await refreshAccessToken();
    const shopId = process.env.ETSY_SHOP_ID;

    const form = new URLSearchParams();
    form.set("quantity", "999");
    form.set("title", String(title).slice(0, 140));
    form.set("description", String(description));
    form.set("price", String(price || 4.99));
    form.set("who_made", "i_did");
    form.set("when_made", "made_to_order");
    form.set("taxonomy_id", process.env.ETSY_TAXONOMY_ID || "1");
    form.set("type", "download");
    form.set("state", "draft");
    if (Array.isArray(tags) && tags.length) form.set("tags", tags.slice(0, 13).join(","));

    const r = await fetch(`https://openapi.etsy.com/v3/application/shops/${shopId}/listings`, {
      method: "POST",
      headers: {
        "x-api-key": process.env.ETSY_API_KEY,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || JSON.stringify(data));

    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({
      ok: true,
      listingId: data.listing_id,
      editUrl: `https://www.etsy.com/your/shops/me/listing-editor/edit/${data.listing_id}`,
    }));
  } catch (e) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: e.message }));
  }
};
