# ArticlePilot AI

AI-powered SEO content operating system that generates Turkish SEO articles with multiple AI providers and publishes them to WordPress.

ArticlePilot AI lets teams research, generate, edit, review, and publish long-form Turkish SEO content at scale. It orchestrates several AI providers behind a single abstraction, runs generation asynchronously on a worker, meters usage through a credit ledger, and pushes finished articles to WordPress through a signed connector plugin.

---

## Table of contents

- [Architecture summary](#architecture-summary)
- [Prerequisites](#prerequisites)
- [Install](#install)
- [Environment variables](#environment-variables)
- [Database](#database)
- [Redis](#redis)
- [Running the app](#running-the-app-web--worker)
- [Dev login](#dev-login)
- [Testing](#testing)
- [WordPress plugin](#wordpress-plugin)
- [Adding an AI provider](#adding-an-ai-provider)
- [Adding a model](#adding-a-model)
- [Deployment](#deployment)
- [Security notes](#security-notes)
- [Backup and disaster recovery](#backup-and-disaster-recovery)
- [Troubleshooting](#troubleshooting)
- [Legal pages](#legal-pages)
- [Further documentation](#further-documentation)

---

## Architecture summary

ArticlePilot is a **single Next.js 15 application** (App Router, React 19, server actions) plus **two out-of-process companions**:

1. A **standalone worker** (`worker/index.ts`) that consumes BullMQ queues and runs AI generation off the HTTP request path.
2. A **PHP WordPress plugin** (`wordpress-plugin/articlepilot-connector/`) that receives HMAC-signed publish requests.

```
Browser ──▶ Next.js (server actions) ──▶ PostgreSQL (Prisma)
                     │
                     └─▶ Redis (BullMQ) ──▶ Worker ──▶ AI Provider (OpenAI / Anthropic / Gemini / Mock)
                                              │
                                              └─▶ WordPress (HMAC connector plugin)
```

The tenant boundary is the **Workspace**; every tenant-scoped table carries `workspaceId` and is filtered in the service layer through `requireWorkspace`. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full picture.

---

## Prerequisites

- **Node.js 20+** (`engines.node` is `>=20`)
- **pnpm** (package manager)
- **PostgreSQL** (application database, via Prisma)
- **Redis** (BullMQ queues)
- **Docker** (optional but recommended for running PostgreSQL and Redis locally)

A quick way to bring up the datastores locally:

```bash
docker run -d --name articlepilot-pg \
  -e POSTGRES_USER=articlepilot -e POSTGRES_PASSWORD=articlepilot -e POSTGRES_DB=articlepilot \
  -p 5432:5432 postgres:16

docker run -d --name articlepilot-redis -p 6379:6379 redis:7
```

---

## Install

```bash
pnpm install
cp .env.example .env        # then edit .env — see below
pnpm db:generate            # generate the Prisma client
pnpm db:migrate             # create the schema
pnpm db:seed                # seed reference data + a dev admin
```

---

## Environment variables

Copy `.env.example` to `.env` and fill in the values. The server validates the environment at boot (`src/lib/config/env.ts`) and **fails fast** if a required secret is missing or malformed.

### Core

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string used by Prisma. |
| `REDIS_URL` | Yes (defaults to `redis://localhost:6379`) | Redis connection for BullMQ queues. |
| `AUTH_SECRET` | Yes | Session signing secret, min 16 chars. Generate: `openssl rand -base64 48`. |
| `APP_ENCRYPTION_KEY` | Yes | AES-256-GCM master key for credential encryption. **Exactly 64 hex chars (32 bytes).** Generate: `openssl rand -hex 32`. Never commit the real value; back it up — losing it makes every stored credential unrecoverable. |
| `NODE_ENV` | Yes | `development` \| `test` \| `production`. |

### App branding

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_APP_NAME` | Full product name shown in the UI (`ArticlePilot AI`). |
| `NEXT_PUBLIC_APP_SHORT_NAME` | Short label (`ArticlePilot`). |
| `NEXT_PUBLIC_APP_URL` | Public base URL of the app. |
| `SUPPORT_EMAIL` | Support address surfaced to users. |

### AI providers (all optional)

| Variable | Description |
| --- | --- |
| `OPENAI_API_KEY` | Platform-managed OpenAI key. Absent = provider disabled unless a workspace supplies BYOK. |
| `ANTHROPIC_API_KEY` | Platform-managed Anthropic key. |
| `GEMINI_API_KEY` | Platform-managed Google Gemini key. |

If **none** are set, the `MockAIProvider` still works, so the full pipeline is runnable and testable without any real key.

### Research providers (optional)

| Variable | Description |
| --- | --- |
| `TAVILY_API_KEY` | Web research provider. |
| `SERPER_API_KEY` | SERP data provider. |

### Storage (optional; falls back to local `./storage`)

| Variable | Description |
| --- | --- |
| `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` | S3-compatible object storage for media. When unset, media is stored on local disk. |

### Email

| Variable | Description |
| --- | --- |
| `EMAIL_PROVIDER` | `console` (logs to stdout in dev), `resend`, `ses`, or `postmark`. |
| `EMAIL_FROM` | From address for transactional email. |
| `RESEND_API_KEY` | API key when `EMAIL_PROVIDER=resend`. |

### Admin bootstrap

| Variable | Description |
| --- | --- |
| `INITIAL_ADMIN_EMAIL` | The user who registers with this email is granted platform `SUPER_ADMIN` on first login. Also used by the seed to create the dev admin. |

### Observability (optional)

| Variable | Description |
| --- | --- |
| `SENTRY_DSN` | Error reporting DSN. |

### Security

| Variable | Description |
| --- | --- |
| `ALLOW_PRIVATE_WORDPRESS_HOSTS` | Set to `true` **only in local dev** to allow connecting to private/localhost WordPress. In production this must stay `false` so the SSRF guard blocks private, loopback, link-local, and metadata addresses. |

---

## Database

Prisma is the ORM; the schema lives in `prisma/schema.prisma`.

```bash
pnpm db:generate     # prisma generate — regenerate the client after schema edits
pnpm db:migrate      # prisma migrate dev — create/apply a dev migration
pnpm db:deploy       # prisma migrate deploy — apply migrations in prod/CI
pnpm db:seed         # tsx prisma/seed.ts — seed reference data + dev admin
pnpm db:studio       # prisma studio — browse data
pnpm db:push         # prisma db push — push schema without a migration (prototyping only)
```

Run `pnpm db:migrate` then `pnpm db:seed` after a fresh checkout.

---

## Redis

Redis backs the BullMQ queues (`generation`, `bulk`, `publish`, `sync`). Point `REDIS_URL` at your instance. The web app enqueues jobs; the worker consumes them. Both must reach the **same** Redis. For production, enable persistence (AOF or RDB) so queued jobs survive a restart.

---

## Running the app (web + worker)

The web server and the worker are **separate processes** and must both run.

```bash
# Terminal 1 — Next.js web app (http://localhost:3000)
pnpm dev

# Terminal 2 — background worker (AI generation + bulk)
pnpm dev:worker
```

`pnpm dev:worker` runs `tsx watch worker/index.ts`. Without it, articles will stay in `GENERATING` forever because nothing consumes the queue.

Production equivalents:

```bash
pnpm build          # prisma generate && next build
pnpm start          # next start (web)
pnpm start:worker   # tsx worker/index.ts (worker)
```

---

## Dev login

`pnpm db:seed` creates a development admin account:

- **Email:** the value of `INITIAL_ADMIN_EMAIL` in your `.env`
- **Password:** `admin1234`

This password is for **local development only**. Never seed it in a shared or production environment. Change or disable it before exposing the app to anyone.

---

## Testing

```bash
pnpm test         # vitest run — unit/integration tests
pnpm test:watch   # vitest in watch mode
pnpm test:e2e     # playwright end-to-end tests
pnpm typecheck    # tsc --noEmit
pnpm lint         # next lint
```

Because the `MockAIProvider` implements the full `AIProvider` interface, the generation pipeline and services are unit-testable with **no API key and no network**.

---

## WordPress plugin

The connector plugin lives at `wordpress-plugin/articlepilot-connector/`. To install it on a site and complete pairing, follow [`wordpress-plugin/articlepilot-connector/INSTALL.md`](wordpress-plugin/articlepilot-connector/INSTALL.md). For the connection modes, pairing flow, and HMAC scheme from the platform side, see [`docs/WORDPRESS.md`](docs/WORDPRESS.md).

---

## Adding an AI provider

Providers implement the `AIProvider` interface in `src/lib/ai/types.ts` and are wired into the factory in `src/lib/ai/registry.ts`. The full, step-by-step guide is in [`docs/AI_PROVIDERS.md`](docs/AI_PROVIDERS.md).

---

## Adding a model

Models are data, not code. Each usable model is a row in the **`AIModel`** table (managed through the admin surface or a migration/seed), keyed by `(provider, externalModelId)`. Key fields:

- `externalModelId` — the id passed to the provider API
- `displayName`, `description`
- capability flags: `supportsStreaming`, `supportsStructured`, `supportsVision`, `supportsWebSearch`
- `contextWindow`, `maxOutputTokens`
- pricing: `inputPricePerMTok`, `outputPricePerMTok` (integer USD micro-units per 1M tokens)
- `qualityTier` (`ECONOMY`/`BALANCED`/`PREMIUM`), `speedTier` (`SLOW`/`MEDIUM`/`FAST`)
- `defaultForArticle`, `defaultForResearch`, `active`, `deprecated`, `sortOrder`

The registry reads pricing from this table for cost accounting, so adding a model there makes it selectable and billable without a code change.

---

## Deployment

The app is container-friendly. Deploy **two long-running processes** from the same image:

1. **Web:** `pnpm start` (after `pnpm build`)
2. **Worker:** `pnpm start:worker`

Both need `DATABASE_URL`, `REDIS_URL`, `AUTH_SECRET`, and `APP_ENCRYPTION_KEY`. Run `pnpm db:deploy` as a release/migration step before starting the web process. Scale the worker independently of the web tier; BullMQ concurrency is bounded (currently 4 per queue) and jobs persist in Redis, so a worker restart does not lose work. The worker handles `SIGTERM`/`SIGINT` for graceful shutdown of in-flight jobs.

---

## Security notes

- **Credentials at rest** (WordPress secrets, BYOK API keys) are encrypted with AES-256-GCM using `APP_ENCRYPTION_KEY` and never returned to the browser.
- **Passwords** are hashed with Argon2id; **sessions** are opaque tokens whose SHA-256 hash is stored (raw token only in an httpOnly, secure cookie).
- **Tenant isolation** is enforced server-side via `requireWorkspace` with role ranking `OWNER > ADMIN > EDITOR > VIEWER`.
- **SSRF protection** guards every outbound WordPress request (`src/lib/wordpress/ssrf.ts`).
- **WordPress requests** are HMAC-SHA256 signed with replay protection (timestamp skew + single-use nonce).
- **AI/user HTML** is sanitized against an allowlist before storage or publish.
- **Prompt-injection** boundaries wrap untrusted source and user content so it cannot override platform rules.
- Secrets are never logged; users see standardized, safe error messages.

Full detail: [`docs/SECURITY.md`](docs/SECURITY.md).

---

## Backup and disaster recovery

- **PostgreSQL:** take regular `pg_dump` (or managed snapshot) backups. This is the source of truth for all content and account data.
- **Redis:** enable persistence (AOF/RDB) so in-flight and scheduled jobs survive restarts. Redis holds transient queue state, not durable data.
- **`APP_ENCRYPTION_KEY`:** back it up securely and separately. Restoring a database **without** the matching key leaves every encrypted credential unrecoverable.
- **Secret rotation:** rotate `AUTH_SECRET` (invalidates sessions), provider keys, and per-site WordPress secrets (`/rotate-secret`) on a schedule or after any suspected exposure. Rotating `APP_ENCRYPTION_KEY` requires re-encrypting stored secrets.

---

## Troubleshooting

| Symptom | Likely cause / fix |
| --- | --- |
| App won't boot, "Invalid environment configuration" | A required env var is missing/malformed. `APP_ENCRYPTION_KEY` must be exactly 64 hex chars; `AUTH_SECRET` ≥ 16 chars. |
| Articles stuck in `GENERATING` | The worker isn't running. Start `pnpm dev:worker` (or `pnpm start:worker`) and confirm it reaches the same `REDIS_URL`. |
| "No API key configured for provider …" | No platform key in `.env` and no workspace BYOK for that provider. Set the env key or add a BYOK credential, or use the `mock` provider. |
| WordPress connect fails with an SSRF/connection error | Host resolves to a private/localhost/metadata IP. In local dev only, set `ALLOW_PRIVATE_WORDPRESS_HOSTS=true`. In prod, use a real public HTTPS host. |
| WordPress requests return 401 `articlepilot_bad_signature` | Clock skew > 300s, a reused nonce, or a body that was re-serialized after signing. Sign the exact bytes sent. |
| Queue jobs never run / `QUEUE_FAILED` | Redis unreachable. Check `REDIS_URL` and that Redis is up. |
| Insufficient credits | Workspace credit balance can't cover the generation. Grant credits via admin or upgrade the plan. |

---

## Legal pages

The legal pages shipped in the app are **placeholders**. They must be replaced with real, lawyer-reviewed Terms of Service, Privacy Policy, and related documents **before any public launch**. Do not treat the current text as legally binding.

---

## Further documentation

| Doc | Contents |
| --- | --- |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Data flow, layers, multi-tenancy, credit ledger. |
| [`docs/SECURITY.md`](docs/SECURITY.md) | Encryption, auth, SSRF, HMAC, sanitization, OWASP mapping. |
| [`docs/AI_PROVIDERS.md`](docs/AI_PROVIDERS.md) | Adding a provider, structured output, mock provider. |
| [`docs/WORDPRESS.md`](docs/WORDPRESS.md) | Connection modes, pairing, HMAC, publishing, SEO adapters. |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | MVP → V2 phases. |
| [`docs/DECISIONS.md`](docs/DECISIONS.md) | Architecture Decision Records. |
| [`CHANGELOG.md`](CHANGELOG.md) | Release notes. |
