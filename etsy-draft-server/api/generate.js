// The brain: builds the expert prompt server-side (protects your prompt IP),
// checks the customer's license, calls the Anthropic API on YOUR key,
// and returns the parsed bundle system.
// Env needed: ANTHROPIC_API_KEY. Optional: ANTHROPIC_MODEL, SKIP_LICENSE=true (testing).
const { cors } = require("./_etsy");

const STYLE_SEEDS = {
  watercolor: ["Watercolor Whimsy", "soft watercolor illustration with delicate paint washes, gentle color bleeds and hand-painted texture"],
  retro: ["Retro Groovy", "retro groovy 1970s illustration style with wavy shapes, warm vintage palette and funky rounded forms"],
  kawaii: ["Kawaii Cute", "kawaii chibi illustration with oversized sparkly eyes, soft pastel colors, rosy cheeks and rounded proportions"],
  bold: ["Bold Cartoon", "bold cartoon illustration with thick black outlines, flat vibrant colors and confident simple shapes"],
  glam: ["Glam Fashion", "glamorous fashion illustration style with elegant linework, luxe details, glossy highlights and chic attitude"],
  boho: ["Boho Line Art", "minimalist boho line art with clean flowing single-weight lines and subtle earthy accent tones"],
  storybook: ["Vintage Storybook", "vintage storybook illustration with soft textured shading, muted nostalgic palette and classic picture-book charm"],
  clay: ["Cute 3D Clay", "cute 3D clay render style with soft matte surfaces, rounded toy-like forms and gentle studio lighting"],
};

async function checkLicense(key) {
  if (process.env.SKIP_LICENSE === "true") return true;
  if (!key) return false;
  const res = await fetch("https://api.lemonsqueezy.com/v1/licenses/validate", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({ license_key: key }).toString(),
  });
  const data = await res.json();
  return !!data.valid;
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") { res.statusCode = 204; return res.end(); }
  if (req.method !== "POST") { res.statusCode = 405; return res.end(JSON.stringify({ error: "POST only" })); }
  res.setHeader("Content-Type", "application/json");
  try {
    const { licenseKey, brief, character, styleId, count, clipTypeLabel, paletteDesc, occasion } = req.body || {};
    if (!brief || !styleId) throw new Error("Missing bundle idea or style");
    if (!(await checkLicense(licenseKey))) {
      res.statusCode = 402;
      return res.end(JSON.stringify({ error: "License key missing or invalid. Paste the key from your purchase email." }));
    }
    const [styleName, styleSeed] = STYLE_SEEDS[styleId] || STYLE_SEEDS.watercolor;
    const n = Math.min(Math.max(parseInt(count) || 12, 4), 20);

    const prompt = `You are an expert clipart bundle designer and Etsy SEO specialist. A seller is creating a cohesive clipart PNG bundle.

Clipart type: ${clipTypeLabel || "Clipart"}
Bundle theme: ${brief}
${character ? `Recurring character/details to keep consistent: ${character}` : ""}
Art style: ${styleName} — ${styleSeed}
${paletteDesc ? `Colour palette (must be used as the palette in the DNA): ${paletteDesc}` : ""}
${occasion && occasion !== "Everyday" ? `Occasion: ${occasion} — elements should suit this occasion (relevant props, motifs and mood).` : ""}
Number of elements: ${n}

Respond with ONLY a valid JSON object, no markdown fences, no commentary:
{
  "dna": [6 short descriptor phrases that together lock this product's visual identity: 1) the characters/subjects, 2) the art style, 3) a specific named color palette of 4-5 colors (use the seller's chosen palette exactly if one was given), 4) the rendering texture, 5) the linework/edges, 6) the overall aesthetic mood],
  "negative": "one comma-separated negative prompt string of things to avoid for clean clipart",
  "elements": [${n} short element subjects, each 4-10 words, no style words],
  "title": "Etsy listing title under 140 characters, keyword-rich, front-loaded",
  "description": "3 sentence Etsy listing description mentioning PNG format, transparent background, commercial use",
  "tags": [13 Etsy tags, each under 20 characters, lowercase]
}`;

    const ai = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await ai.json();
    if (!ai.ok) throw new Error(data.error && data.error.message ? data.error.message : "AI request failed");
    const text = (data.content || []).map((b) => (b.type === "text" ? b.text : "")).join("\n");
    let clean = text.replace(/```json|```/g, "").trim();
    const first = clean.indexOf("{");
    const last = clean.lastIndexOf("}");
    if (first !== -1 && last > first) clean = clean.slice(first, last + 1);
    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch (err) {
      throw new Error("The AI response came back incomplete — please tap Generate again.");
    }
    if (!Array.isArray(parsed.dna) || !Array.isArray(parsed.elements) || !parsed.negative) throw new Error("Bad AI response shape — try again");
    res.end(JSON.stringify(parsed));
  } catch (e) {
    res.statusCode = res.statusCode === 402 ? 402 : 500;
    res.end(JSON.stringify({ error: e.message }));
  }
};
