# WordPress Integration

ArticlePilot publishes finished articles to WordPress. The preferred path is the **ArticlePilot Connector plugin** with HMAC-signed requests; an **application-password** REST fallback exists for sites that can't install the plugin. The plugin source and its integration guide live in `wordpress-plugin/articlepilot-connector/` (see [`INSTALL.md`](../wordpress-plugin/articlepilot-connector/INSTALL.md)).

---

## Connection modes

`WordPressSite.mode` (`WordPressConnectionMode`) records which mode a site uses:

| Mode | When to use | Auth |
| --- | --- | --- |
| **`PLUGIN`** (preferred) | Site owner can install the connector plugin. | Per-connection HMAC-SHA256 secret. |
| **`APP_PASSWORD`** (fallback) | Plugin can't be installed. | WordPress core REST API + an application password. |

Plugin mode is preferred because it gives first-class taxonomy/author sync, SEO-plugin awareness, scheduling, and a rotatable per-site secret that is not a full WordPress login credential. In both modes the site's credentials are stored **AES-256-GCM encrypted** (`WordPressSite.encryptedSecret`) and never returned to the browser.

Connection health is tracked in `WordPressSite.health` (`CONNECTED` / `DEGRADED` / `ERROR` / `DISCONNECTED`) along with `lastHealthyAt` and `lastSyncAt`.

---

## Pairing flow (plugin mode)

Pairing uses a **one-time code** so no long-lived credential is ever pasted into the platform.

1. The site owner installs and activates the plugin, opens **Settings → ArticlePilot**, and clicks **connect** to generate a **one-time pairing code** (shown once).
2. They paste the code into the ArticlePilot dashboard connection screen. The platform stores a hash of the code (`WordPressPairing.codeHash`, short-lived, single-use — mirrors how session tokens are stored).
3. The platform calls `POST /wp-json/articlepilot/v1/pair` with the code, a callback URL, and its internal site id.
4. The plugin verifies the code and returns a **`connection_id` + `secret` exactly once**. The platform encrypts and stores them (`connectionId`, `encryptedSecret`) and marks the site connected.
5. Every subsequent request is HMAC-signed with that secret.

The secret can be rotated at any time via `POST /rotate-secret`, and the connection can be revoked from either side (`/disconnect` on the plugin, disconnect in the dashboard).

---

## HMAC authentication scheme

Identical on both sides (`src/lib/wordpress/client.ts` ↔ `class-articlepilot-auth.php`). Every endpoint except `/pair` requires it.

**Canonical string** (LF-joined, no trailing newline):

```
METHOD\nROUTE\nTIMESTAMP\nNONCE\nSHA256_HEX(body)
```

- `METHOD` — upper-case verb.
- `ROUTE` — REST path including the namespace and a leading slash, e.g. `/articlepilot/v1/posts`. No host, no query string.
- `TIMESTAMP` — unix seconds; the exact header value.
- `NONCE` — a fresh random string; the exact header value.
- `SHA256_HEX(body)` — lowercase hex SHA-256 of the raw body bytes (empty-string hash for empty bodies).

**Signature:** `lowercase hex HMAC-SHA256(secret, canonical)`.

**Headers:** `X-ArticlePilot-Key` (the `connection_id`), `X-ArticlePilot-Timestamp`, `X-ArticlePilot-Nonce`, `X-ArticlePilot-Signature`.

**Replay protection:** the plugin rejects a timestamp skew > **300s** and remembers each nonce (single-use) for roughly twice the skew window. Signature comparison is constant-time. **Sign the exact bytes you send** — if you `JSON.stringify` the body, hash and send that identical string.

---

## Taxonomy and author sync

The plugin exposes read/write taxonomy and author endpoints; the platform mirrors them into local tables so the editor can offer pickers without hitting WordPress each time:

- `GET /authors` → `WordPressAuthor` (external WP user id, display name).
- `GET/POST /categories` → `WordPressCategory` (with `parentId` for hierarchy).
- `GET/POST /tags` → `WordPressTag`.
- `GET /posts` → `WordPressPostIndex`, a lightweight index of existing posts used for internal linking and cannibalization detection.

Local rows are keyed by `(siteId, externalId)` and refreshed on sync (`lastSyncAt`). A project can pin a `defaultAuthorId` / `defaultCategoryId`.

---

## Publish, schedule, and update

Publishing maps to `POST /posts` (create) and `PUT`/`PATCH /posts/{id}` (update). The `status` field drives behavior:

- `draft` / `pending` — create as an unpublished draft.
- `publish` — publish immediately.
- `future` with a future `date` — **schedule** the post.

The platform stores `scheduledAt` in **UTC** and tracks WordPress linkage on the `Article` (`wpPostId`, `wpPermalink`, `wpStatus`, `wpModifiedAt`). `wpModifiedAt` enables conflict detection so a post edited in WordPress isn't silently overwritten. Publishing capability is enforced by WordPress: the target author needs `edit_posts`, and `publish`/`future` additionally require `publish_posts` — a missing capability returns HTTP 403 with a clear error code, surfaced as `WORDPRESS_PERMISSION_DENIED`.

Featured images and inline media are uploaded via `POST /media` (from a URL or base64), returning a `wpMediaId`.

---

## SEO plugin adapters

The connector detects the site's active SEO plugin and writes SEO fields through the matching adapter, falling back to native post meta when none is installed (`class-articlepilot-seo-manager.php`). Supported slugs:

| Slug | Plugin |
| --- | --- |
| `rank-math` | Rank Math |
| `yoast` | Yoast SEO |
| `aioseo` | All in One SEO |
| `native` | WordPress post meta (fallback, always available) |

The detected slug is stored on `WordPressSite.detectedSeoPlugin`. The publish payload's `seo` object (`seo_title`, `meta_description`, `focus_keyword`, `canonical`, `robots`, `og_*`) is translated to whichever plugin is active, so the platform doesn't need to know which SEO plugin the site runs.

---

## SSRF and transport safety

Every request to a WordPress site — including each publish — passes through `assertSafeWordPressUrl` (`src/lib/wordpress/ssrf.ts`):

- HTTPS required in production; private/loopback/link-local/metadata IPs blocked; DNS-rebind defense re-validates resolved IPs.
- The client fetches with `redirect: "manual"` and rejects 3xx responses so a site can't bounce the request to an internal host.
- Requests time out at 30s.

The plugin side likewise enforces HTTPS (HTTP only when `WP_DEBUG` or the `articlepilot_allow_insecure` filter permits). See [`docs/SECURITY.md`](SECURITY.md) for the full SSRF and HMAC detail.
