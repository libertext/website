# Roadmap

Phased plan for ArticlePilot AI. The **MVP** is the current build; later phases are directional and may be resequenced. The data model already anticipates much of V1–V2 (topic clusters, internal links, media, feature flags, plans/entitlements), so many later features are additive rather than structural.

---

## MVP — foundation and single-article publishing

The end-to-end loop: sign up, connect a site, generate an article, publish it.

- **Auth & workspace** — registration/login (Argon2id + opaque sessions), workspace creation, onboarding.
- **Projects** — per-project language, target country, niche, writing profile / brand voice, custom instructions.
- **Single-article generation** — the controlled pipeline (normalize → brief → outline → draft → meta) against the **Mock** provider and **real** providers (OpenAI / Anthropic / Gemini) behind the `AIProvider` abstraction.
- **Editor** — HTML article editing with sanitization and version snapshots.
- **SEO panel** — meta title/description, slug, focus keyword, search intent, FAQ, SEO score.
- **WordPress connect + publish + schedule** — connector plugin (HMAC) with pairing, taxonomy/author sync, draft/publish/schedule/update, SEO-plugin adapters.
- **Bulk queue** — bulk job with per-item topics, queued generation, idempotent processing.
- **Credits** — credit ledger with idempotent charge/refund and per-generation metering.
- **Admin** — provider/model registry, plans, feature flags, super-admin surface.

---

## V1 — content operations and teams

Move from "one article at a time" to managing a content program.

- **Internal link engine** — suggest and insert internal links using the WordPress post index and article fingerprints.
- **Topic clusters** — pillar/cluster topic maps to plan coverage and interlinking.
- **WordPress existing-article sync + AI refresh** — import live posts and regenerate/refresh decaying content.
- **Quality review** — structured SEO + fact-review workflow (`FactReviewStatus`, quality warnings) with YMYL gating.
- **Content calendar** — schedule and visualize upcoming and published content.
- **Team roles** — invites and the full `OWNER > ADMIN > EDITOR > VIEWER` permission model in the UI.
- **Usage dashboard** — per-workspace AI usage, cost, and credit consumption reporting.

---

## V1.5 — measurement and search integration

Close the loop with real search performance data.

- **Google Search Console** — connect GSC for impressions/clicks/position per URL.
- **Analytics** — traffic and engagement signals tied to published articles.
- **Content decay detection** — flag articles losing rankings/traffic for refresh.
- **SERP tracking** — track target-keyword positions over time.

---

## V2 — media, platform, and scale

Broaden beyond text and beyond WordPress.

- **AI image generation** — generate featured/inline images from prompts.
- **Media library** — managed asset storage and reuse across articles.
- **Reversed internal linking** — update older posts to link to new content.
- **Public API + webhooks** — programmatic generation/publishing and event notifications.
- **Agency / white-label** — multi-client management and branding, BYOK billing.
- **Additional CMS integrations** — generalize publishing behind a `PublishingProvider` abstraction (mirroring the `AIProvider` seam) to support CMSes beyond WordPress.
