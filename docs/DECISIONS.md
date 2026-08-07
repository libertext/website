# Architecture Decision Records

A log of significant, hard-to-reverse decisions. Each entry records the context, the decision, and its consequences. Newer decisions may supersede older ones; superseded records are kept for history.

---

## ADR-001 — PostgreSQL + Prisma

**Context.** The domain is relational and multi-tenant: workspaces, members, projects, articles, credits, and WordPress metadata with strict foreign-key relationships and transactional invariants (notably the credit ledger).

**Decision.** Use PostgreSQL as the system of record and Prisma as the type-safe ORM and migration tool.

**Consequences.** Strong relational integrity, transactions for ledger correctness, and a single generated client shared by the web app and worker. Prisma's schema is the source of truth (`prisma/schema.prisma`). Some advanced Postgres features are used through raw queries when Prisma's API is insufficient.

---

## ADR-002 — Queue-based generation (BullMQ + Redis + worker)

**Context.** Article generation is slow (multiple sequential LLM calls) and must not block HTTP requests or risk timeouts, and it must survive restarts and retry on transient failures.

**Decision.** Run generation asynchronously on BullMQ queues backed by Redis, consumed by a **separate worker process** (`worker/`).

**Consequences.** Requests return immediately; jobs persist and retry with exponential backoff; the worker scales independently of the web tier. It adds Redis as a required dependency and a second process to deploy and monitor. Idempotency keys (ADR-007) make retries safe.

---

## ADR-003 — `AIProvider` adapter abstraction

**Context.** The platform must support several LLM vendors and swap or add them without rewriting business logic, while keeping cost accounting and structured-output handling uniform.

**Decision.** Define a single `AIProvider` interface (`src/lib/ai/types.ts`) with Mock/OpenAI/Anthropic/Gemini adapters, resolved by a registry factory; model metadata and pricing live in the `AIModel` table.

**Consequences.** New vendors are self-contained additions; the pipeline is vendor-agnostic and unit-testable via the mock. Providers must be mapped carefully to the shared error taxonomy and token-usage shape. Model changes are data edits, not deploys.

---

## ADR-004 — WordPress Connector plugin with HMAC

**Context.** Publishing to customer WordPress sites needs authentication that is more scoped than a full login, resistant to replay, and able to expose taxonomy/author/SEO operations the core REST API handles awkwardly.

**Decision.** Ship a first-party PHP plugin that authenticates every request with per-connection HMAC-SHA256 (canonical `METHOD\nROUTE\nTIMESTAMP\nNONCE\nSHA256_HEX(body)`), paired via a one-time code. Keep application-password REST as a fallback.

**Consequences.** Strong request integrity, replay protection (timestamp skew + nonce), rotatable per-site secrets, and rich publishing/SEO features. It requires the site owner to install a plugin and requires the platform and plugin to keep the signing scheme byte-for-byte in sync.

---

## ADR-005 — Single Next.js app over a monorepo

**Context.** The product is one web app plus a background worker that shares the same domain code, and a separate PHP plugin.

**Decision.** Keep a single Next.js application with a co-located worker (`worker/`) importing the same `src/lib`, rather than splitting into a multi-package monorepo. The plugin lives beside it as a standalone PHP artifact.

**Consequences.** One dependency graph, one build, shared types and Prisma client with zero cross-package plumbing. If the surface grows substantially (e.g. a public API service), extraction into packages can be revisited then; premature modularization is avoided now.

---

## ADR-006 — Custom session auth (Argon2id + hashed opaque tokens)

**Context.** Authentication needs to be simple, self-hosted, and leak-resistant, without depending on an external identity provider.

**Decision.** Hash passwords with Argon2id and issue opaque random session tokens whose SHA-256 hash is stored server-side; the raw token lives only in an httpOnly, secure cookie.

**Consequences.** A database leak cannot be replayed as a session; logout and logout-everywhere are simple server-side deletes. The team owns the auth surface (rate limiting, verification, resets) rather than delegating it, which is more code to maintain but fully under control.

---

## ADR-007 — Credit ledger with idempotency keys

**Context.** Usage-based credits must stay correct under retries, concurrent operations, and partial failures — no double-charging, no lost refunds.

**Decision.** Model billing as an append-only `CreditTransaction` ledger kept in lock-step with `CreditAccount.balance` inside one DB transaction, with a unique `idempotencyKey` on every mutation. Charge before generation, refund on failure, using stable keys.

**Consequences.** Retried queue jobs are safe by construction; every balance change is auditable. Callers must supply well-formed, stable idempotency keys, and all balance changes must go through `CreditService` rather than mutating the account directly.

---

## ADR-008 — AES-256-GCM for credentials at rest

**Context.** The platform stores third-party secrets (WordPress connection secrets, BYOK API keys) that must be confidential and tamper-evident at rest.

**Decision.** Encrypt secrets with AES-256-GCM using a single master key from `APP_ENCRYPTION_KEY`, storing a versioned `v1:iv:tag:ciphertext` blob with a fresh IV per encryption (`src/lib/crypto/encryption.ts`).

**Consequences.** Authenticated encryption gives confidentiality and integrity; encrypted blobs never reach the browser (only a masked last-4). The master key becomes critical infrastructure — it must be backed up and rotated deliberately, and losing it renders stored credentials unrecoverable.
