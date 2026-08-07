# ArticlePilot AI — Görev Takibi

Durum: `[x]` tamam · `[~]` kısmen · `[ ]` planlandı (roadmap)

## PHASE 1 — Foundation
- [x] Next.js 15 + TypeScript (strict) + App Router
- [x] Tailwind + tasarım token'ları (light/dark) + UI primitifleri
- [x] Merkezi config (`NEXT_PUBLIC_APP_NAME`) + env doğrulama (Zod)
- [x] PostgreSQL + Prisma kapsamlı şema (40+ model)
- [x] Redis + BullMQ + ayrı worker process
- [x] Auth (argon2, hash'li opaque session token, güvenli cookie)
- [x] Workspace / multi-tenant izolasyon (`requireWorkspace`, rol hiyerarşisi)
- [x] AES-256-GCM kimlik bilgisi şifreleme
- [x] Docker Compose (postgres + redis, opsiyonel WordPress profili)
- [x] Seed (planlar, model registry, admin, örnek workspace)

## PHASE 2 — AI Layer
- [x] `AIProvider` abstraction (generate/structured/stream/cost/health/capabilities)
- [x] MockAIProvider (anahtarsız, deterministik)
- [x] OpenAI / Anthropic / Gemini adapter'ları
- [x] Model Registry (DB tabanlı, fiyat/capability/tier)
- [x] Structured output + Zod doğrulama/onarım
- [x] AI usage ledger + kredi sistemi (idempotent, refund)
- [x] Generation queue (BullMQ) + worker processor
- [x] Prompt engine (hiyerarşi + injection koruması)

## PHASE 3 — Article System
- [x] Proje + Writing Profile (marka sesi)
- [~] İçerik şablonları (model + liste; editör V1)
- [x] Makale wizard (konu → model → üret)
- [x] Pipeline: brief → outline → draft → meta
- [x] Editör + otomatik kaydetme + versiyon geçmişi
- [x] Deterministik SEO paneli (şeffaf skor)
- [~] AI inline düzenleme / section regenerate (V1)

## PHASE 4 — WordPress
- [x] Connector eklentisi (PHP, HMAC, SEO adapter'ları) — `wordpress-plugin/`
- [x] HMAC imzalı client (eklenti şemasıyla birebir) + SSRF koruması
- [x] Application Password fallback bağlantısı
- [~] Taxonomy/author senkronizasyonu (şema hazır; sync job V1)
- [~] Publish / schedule / update (client hazır; UI akışı V1)

## PHASE 5 — Bulk
- [x] Konu listesinden toplu iş oluşturma + kuyruk
- [x] İş/öğe durumları + ilerleme + idempotent retry
- [~] CSV import, pause/resume UI, otomatik zamanlama (V1)

## PHASE 6 — SEO Intelligence
- [~] Duplicate/cannibalization (şema + fingerprint alanı hazır)
- [ ] Internal linking engine (V1)
- [ ] Topic clusters / content gap (V1)
- [x] Quality review şeması + YMYL bayrağı

## PHASE 7 — SaaS
- [x] Planlar + özellik entitlement modeli
- [x] Admin panel (SUPER_ADMIN)
- [~] Subscription / billing (Mock provider mimarisi; canlı sağlayıcı V1)
- [x] Audit log, feature flags, notification şeması

## PHASE 8 — Hardening
- [x] Unit testler (slug, SEO, sanitize, pipeline, HMAC, SSRF)
- [x] E2E happy-path (Playwright, mock provider)
- [x] typecheck + lint + build yeşil
- [x] CI workflow (GitHub Actions)
- [x] Dokümantasyon (README, ARCHITECTURE, SECURITY, AI_PROVIDERS, WORDPRESS, ROADMAP, DECISIONS)

## Roadmap (V1+) — `docs/ROADMAP.md`
- [ ] GSC entegrasyonu, analytics, content decay, SERP tracking
- [ ] AI görsel üretimi, media library
- [ ] Public API + webhooks, agency/white-label, ek CMS'ler (PublishingProvider)
