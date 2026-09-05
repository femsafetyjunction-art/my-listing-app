# Etsy Draft Server — deploy guide (no Lovable, ~30 minutes, free)

This tiny server is what makes the "Send to Etsy drafts 🚀" button in your
generator work. It holds your secret Etsy keys safely and creates draft
listings in your shop. Hosted free on Vercel.

## Step 1 — Create your Etsy developer app (10 min)
1. Go to **etsy.com/developers** → sign in with your Etsy account → *Create a New App*.
2. Name it (e.g. "Listing Visual System"). Note the **Keystring** — that's your ETSY_API_KEY.
3. You'll add the Callback URL in Step 3 (you need your Vercel URL first).

## Step 2 — Deploy this folder to Vercel (10 min)
1. Create a free account at **vercel.com**.
2. Easiest path: put this folder in a GitHub repository (github.com → New repository → upload files), then in Vercel: *Add New Project* → import that repo → Deploy.
3. Your server is now live at **https://YOUR-PROJECT.vercel.app**

## Step 3 — Connect the two
1. In your Etsy app settings, set the Callback URL to:
   `https://YOUR-PROJECT.vercel.app/api/callback`
2. In Vercel → your project → *Settings → Environment Variables*, add:
   - `ETSY_API_KEY` = your Keystring
   - `ETSY_REDIRECT_URI` = `https://YOUR-PROJECT.vercel.app/api/callback`
3. Redeploy (Vercel → Deployments → ⋯ → Redeploy).

## Step 4 — Authorize your shop (one time, 5 min)
1. Visit `https://YOUR-PROJECT.vercel.app/api/auth` in your browser.
2. Approve access on Etsy. The success page shows your **ETSY_REFRESH_TOKEN**
   and **ETSY_SHOP_ID** — add both as environment variables in Vercel. Redeploy.
3. Visit `https://YOUR-PROJECT.vercel.app/api/taxonomy?q=clip` — pick the id of
   the best clipart category and add it as `ETSY_TAXONOMY_ID`. Redeploy.

## Step 5 — Test 🚀
In the generator's Etsy tab, paste `https://YOUR-PROJECT.vercel.app/api` as the
server URL, set a price, tap **Send to Etsy drafts**. A draft appears in your
Etsy shop with title, description and tags filled in — add images and files,
review, publish.

## Important notes
- **Never share your refresh token or keystring.** Anyone with them can write to your shop.
- Drafts only: this server always creates `state: draft` — nothing goes live without you.
- This v1 serves YOUR shop (personal API access). To let paying customers connect
  their own shops you must request commercial access for your app in the Etsy
  developer portal, and the server then needs a database for per-customer tokens.
- CORS is open (`*`) for testing; before selling, restrict it to your site's domain in `api/_etsy.js`.
- If Etsy rejects a field (their rules occasionally change), the error message
  comes back verbatim in the generator — send it to Claude and we fix it in minutes.

---

# PART 2 — The full public product (website + AI on your own key)

This repo is now the WHOLE product: the generator website (index.html) plus the
server (api/). One Vercel deploy serves both at the same URL.

## Extra environment variables
- `ANTHROPIC_API_KEY` — from console.anthropic.com (Settings → API keys). This is
  what powers generation; you pay cents per generation, customers pay you.
- `ANTHROPIC_MODEL` — optional, defaults to claude-sonnet-5.
- `SKIP_LICENSE` — set to `true` while testing so you can generate without a key.
  REMOVE it before selling.

## License gating (Lemon Squeezy)
1. In Lemon Squeezy create your product and enable **License Keys** on it.
2. When a customer buys, they get a license key by email automatically.
3. They paste it into the 🔑 field on your site; every generation validates the
   key against Lemon Squeezy. No key, no generation.

## Go-live checklist
1. Deploy → site is at https://YOUR-PROJECT.vercel.app (index.html loads automatically)
2. Add ANTHROPIC_API_KEY + SKIP_LICENSE=true → test a full generation
3. Do the Etsy connection (Part 1 above) → test the 🚀 button
4. Create the Lemon Squeezy product with license keys → buy it yourself once → test your own key
5. Remove SKIP_LICENSE → redeploy
6. Point your own domain at the Vercel project (Vercel → Settings → Domains)
7. Sell.
