# Changelog

All notable changes to ArticlePilot AI are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/), and the project aims to follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

- Nothing yet.

## [0.1.0] — Initial MVP build

The first end-to-end build: sign up, connect a WordPress site, generate a Turkish SEO article with AI, and publish it.

### Added

- **Foundation**
  - Single Next.js 15 app (App Router, React 19, server actions) with a separate BullMQ worker process.
  - PostgreSQL + Prisma multi-tenant data model (Workspace boundary, `workspaceId` scoping).
  - Boot-time environment validation (fail-fast) via Zod.
  - Custom authentication: Argon2id password hashing, opaque session tokens stored as SHA-256 hashes, httpOnly secure cookies.
  - Tenant authorization via `requireWorkspace` with role ranking `OWNER > ADMIN > EDITOR > VIEWER`.
  - AES-256-GCM encryption for credentials at rest; standardized user-safe error taxonomy.

- **AI layer**
  - Vendor-neutral `AIProvider` abstraction with Mock, OpenAI, Anthropic, and Gemini adapters.
  - Provider registry factory with BYOK → platform-managed key precedence.
  - `AIModel` / `AIProviderConfig` registry (capabilities, pricing in USD micro-units, quality/speed tiers).
  - Structured-output extraction with Zod validation and retryable repair.

- **Article generation**
  - Controlled pipeline: normalize → brief → outline → draft → meta, with a fast path.
  - Prompt assembly with a strict trust hierarchy and prompt-injection boundaries.
  - `GenerationService` orchestration: idempotent credit charge, per-step usage recording, article + version persistence, refund on failure.
  - Allowlist HTML sanitization; SEO analysis and scoring; article editor and SEO panel.

- **WordPress connector**
  - PHP connector plugin with one-time-code pairing and per-connection HMAC-SHA256 request signing (replay protection via timestamp skew + single-use nonce).
  - SSRF-guarded WordPress client (private/metadata IP blocking, DNS-rebind defense, redirect blocking).
  - Taxonomy/author/post-index sync; draft/publish/schedule/update; media upload.
  - SEO-plugin adapters for Rank Math, Yoast, All in One SEO, and native post meta.
  - Application-password REST fallback mode.

- **Bulk**
  - Bulk job model with per-item topics, queued generation, and idempotent per-item processing.

- **Credits**
  - Append-only credit ledger (`CreditAccount` + signed `CreditTransaction`) with idempotency keys and transactional balance updates.
  - Plans, plan features/entitlements, and subscription scaffolding.

- **Admin & ops**
  - Super-admin bootstrap via `INITIAL_ADMIN_EMAIL`; provider/model/plan/feature-flag administration.
  - Audit log, notifications, and webhook-event idempotency scaffolding.
  - Development seed with a dev admin account (`admin1234`, dev only).

### Notes

- Legal pages are placeholders and require real legal review before launch.
