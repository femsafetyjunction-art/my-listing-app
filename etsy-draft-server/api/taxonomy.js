// Helper: find the taxonomy id for clipart.
// Visit /api/taxonomy?q=clip once, pick the best match, set ETSY_TAXONOMY_ID env var.
const { refreshAccessToken, cors } = require("./_etsy");

module.exports = async (req, res) => {
  cors(res);
  try {
    const q = (req.query.q || "clip").toLowerCase();
    const token = await refreshAccessToken();
    const r = await fetch("https://api.etsy.com/v3/application/seller-taxonomy/nodes", {
      headers: { "x-api-key": process.env.ETSY_API_KEY, Authorization: `Bearer ${token}` },
    });
    const data = await r.json();
    const hits = [];
    const walk = (nodes, path) => {
      for (const n of nodes || []) {
        const full = path ? path + " > " + n.name : n.name;
        if (n.name.toLowerCase().includes(q)) hits.push({ id: n.id, path: full });
        walk(n.children, full);
      }
    };
    walk(data.results, "");
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ matches: hits }, null, 2));
  } catch (e) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: e.message }));
  }
};
