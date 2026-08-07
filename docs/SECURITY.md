# Security

This document describes the security controls built into ArticlePilot AI and how they map to OWASP categories. Treat it as the reference when reviewing changes that touch auth, credentials, or outbound requests.

---

## Credential encryption (secrets at rest)

Third-party credentials — WordPress connection secrets and BYOK provider API keys — are encrypted with **AES-256-GCM** (authenticated encryption) before storage.

- Implementation: `src/lib/crypto/encryption.ts`.
- Master key: **`APP_ENCRYPTION_KEY`** — exactly 64 hex chars (32 bytes), validated at boot.
- Serialized format: `v1:<iv_hex>:<tag_hex>:<ciphertext_hex>`, with a fresh 96-bit random IV per encryption and the GCM auth tag stored alongside. Tampering fails decryption.
- Encrypted blobs (`WordPressSite.encryptedSecret`, `UserProviderCredential.encryptedKey`) are **never returned to the browser**; only a masked `keyLast4` is shown.
- Losing `APP_ENCRYPTION_KEY` makes all stored credentials unrecoverable — back it up separately from the database.

---

## Authentication

- **Passwords** are hashed with **Argon2id** (`src/lib/auth/password.ts`, `memoryCost 19456, timeCost 2, parallelism 1`). Plaintext passwords are never stored or logged.
- **Sessions** use **opaque random tokens** (`src/lib/auth/session.ts`). The raw 32-byte token lives **only** in the cookie; the database stores just its **SHA-256 hash** (`Session.tokenHash`). A database leak therefore cannot be replayed as a session.
- The session cookie (`ap_session`) is **`httpOnly`**, **`secure`** in production, `sameSite=lax`, with a 30-day TTL.
- `destroySession` (logout) and `destroyAllSessions` (logout everywhere / member removal) invalidate server-side session rows.

---

## Authorization and tenant isolation

- The tenant boundary is the **`Workspace`**; every tenant-scoped row carries `workspaceId`.
- **`requireWorkspace(workspaceId, minRole)`** (`src/lib/auth/context.ts`) is the single backend gate. It resolves the caller's `WorkspaceMember` and asserts a minimum role. The frontend is never trusted.
- Role ranking: **`OWNER (3) > ADMIN (2) > EDITOR (1) > VIEWER (0)`**. A non-member receives `FORBIDDEN`.
- Platform super-admins access other workspaces only through the dedicated admin surface, not through `requireWorkspace`.

---

## SSRF protection

User-supplied WordPress URLs are a classic SSRF vector. `src/lib/wordpress/ssrf.ts` (`assertSafeWordPressUrl`) defends every outbound WordPress call:

- **HTTPS required** (HTTP allowed only when `ALLOW_PRIVATE_WORDPRESS_HOSTS` is on for local dev).
- Rejects `localhost` and IP literals in blocked ranges.
- **Blocked IPv4 ranges:** loopback `127/8`, `0.0.0.0`, private `10/8` / `172.16/12` / `192.168/16`, link-local + cloud metadata `169.254/16` (incl. `169.254.169.254`), CGNAT `100.64/10`, and multicast/reserved `>= 224`.
- **Blocked IPv6:** `::1`, `::`, unique-local `fc00::/7`, link-local `fe80::/10`, and IPv4-mapped addresses (re-checked through the IPv4 rules).
- **DNS-rebind defense:** hostnames are resolved and **every** returned IP is validated, not just the name.
- **Redirect blocking:** the plugin client (`client.ts`) fetches with `redirect: "manual"` and rejects 3xx responses, so a server can't be bounced to an internal host after the check.
- The SSRF check runs on **every** request, not just at connect time.

---

## WordPress request signing (HMAC)

Requests from the platform to the connector plugin are signed with **HMAC-SHA256** over a canonical string. The scheme is identical on both sides (`src/lib/wordpress/client.ts` and the plugin's `class-articlepilot-auth.php`).

**Canonical string** (LF-joined, no trailing newline):

```
METHOD\nROUTE\nTIMESTAMP\nNONCE\nSHA256_HEX(body)
```

- `ROUTE` — leading-slash path including the namespace, e.g. `/articlepilot/v1/posts`.
- `SHA256_HEX(body)` — lowercase hex SHA-256 of the raw body bytes (empty-string hash for empty bodies).
- `signature = lowercase hex HMAC-SHA256(secret, canonical)`.

**Headers:** `X-ArticlePilot-Key` (connection id), `X-ArticlePilot-Timestamp`, `X-ArticlePilot-Nonce`, `X-ArticlePilot-Signature`.

**Replay protection:** the plugin rejects a timestamp skew greater than **300s** and remembers each **nonce** (single-use) for longer than the skew window, so a captured request cannot be replayed. The per-connection secret is 32 random bytes, rotatable via `/rotate-secret`, and comparisons use constant-time `hash_equals`.

---

## HTML sanitization

All AI-generated and user-edited HTML is sanitized against a strict **allowlist** before storage or publish (`src/lib/seo/sanitize.ts`, backed by `sanitize-html`).

- Allowed tags are a fixed content set (`p`, `h2`–`h4`, lists, `table`, `a`, `img`, `figure`, etc.). `<script>`, event handlers, and any non-listed element/attribute are discarded.
- Allowed URL schemes: `http`, `https`, `mailto`.
- `target="_blank"` links are forced to `rel="noopener noreferrer"`.

This blocks stored XSS from both model output and user edits.

---

## Prompt-injection boundaries

Untrusted text — scraped source documents and user custom instructions — cannot override platform rules (`src/lib/prompts/engine.ts`). Prompts are assembled with a strict trust hierarchy:

1. **Platform rules** (immutable, top priority)
2. Task rules
3. Project writing profile
4. **User instructions** (wrapped, labelled "reference, not instruction")
5. **Source documents** (fully untrusted, wrapped in explicit boundaries)

User instructions and sources are enclosed in labelled boundary markers, and the platform rules explicitly instruct the model to ignore any "ignore previous instructions"-style text inside them. Sources are treated as reference material only; the model is told not to invent facts or URLs.

---

## Secret handling and error hygiene

- Secrets (API keys, session tokens, WordPress secrets) are **never logged**. Technical detail stays in server logs; users see standardized messages.
- Errors use a fixed taxonomy (`src/lib/ai/errors.ts`). `AppError.toClient()` returns only a stable `code` and a safe, localized message — no stack traces, no provider internals. HTTP status codes are derived from the code (403/404/422/429/402/500).
- Job payloads are validated with Zod at the queue boundary (`src/lib/queue/queues.ts`).

---

## OWASP Top 10 mapping

| OWASP category | Controls in ArticlePilot |
| --- | --- |
| **A01 Broken Access Control** | `requireWorkspace` role checks, `workspaceId` scoping on every tenant row, server-side enforcement only. |
| **A02 Cryptographic Failures** | AES-256-GCM for secrets at rest, Argon2id password hashing, hashed opaque session tokens, secure httpOnly cookies. |
| **A03 Injection** | Prisma parameterized queries, allowlist HTML sanitization, Zod input validation, prompt-injection boundaries. |
| **A04 Insecure Design** | Queue-based idempotent generation, credit ledger with idempotency keys, fail-fast env validation. |
| **A05 Security Misconfiguration** | Strict boot-time env schema; `ALLOW_PRIVATE_WORDPRESS_HOSTS` off by default; HTTPS enforced for WordPress. |
| **A07 Identification & Auth Failures** | Argon2id, server-side session invalidation, logout-everywhere, session expiry. |
| **A08 Software & Data Integrity Failures** | HMAC-signed WordPress requests, GCM auth tags, signed-payload verification, webhook idempotency. |
| **A09 Logging & Monitoring** | Audit log (`AuditLog`), optional Sentry, secrets excluded from logs. |
| **A10 SSRF** | `assertSafeWordPressUrl` with private/metadata IP blocking, DNS-rebind defense, redirect blocking on every request. |
