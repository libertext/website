# ArticlePilot Connector — Installation & Integration Guide

## 1. Install the plugin (site owner)

1. **Zip the folder.** Compress the `articlepilot-connector/` directory so the ZIP contains `articlepilot-connector/articlepilot-connector.php` at its top level.
2. In WordPress admin go to **Plugins → Add New → Upload Plugin**, choose the ZIP, and click **Install Now**.
3. Click **Activate**.
4. Go to **Settings → ArticlePilot**.
5. Click **"ArticlePilot'a Bağlan"** to generate a one-time pairing code.
6. Copy the code (shown once) and paste it into the **ArticlePilot dashboard** connection screen.
7. Once ArticlePilot calls back and completes pairing, the status flips to **Bağlı (Connected)**.

To disconnect at any time, use **"Bağlantıyı Kes"**. To rotate a lost/compromised code, use **"Yeni Bağlantı Kodu Oluştur"**.

---

## 2. REST API — for the ArticlePilot backend implementer

### Base

```
Namespace:  articlepilot/v1
Base URL:   https://SITE/wp-json/articlepilot/v1
```

### Pairing (one-time, unauthenticated by HMAC)

`POST /wp-json/articlepilot/v1/pair`

Request body (JSON):

```json
{
  "code": "ABCD-EFGH-IJKL",
  "callback_url": "https://app.articlepilot.ai/wp/callback",
  "platform_site_id": "your-internal-site-id"
}
```

Response (200) — **the secret is returned only once, here**:

```json
{
  "connection_id": "ap_site_xxxxxxxx",
  "secret": "<64 hex chars = 32 random bytes>",
  "site": { "...": "site info" },
  "paired_at": "2026-08-07T12:00:00+00:00"
}
```

Store `connection_id` and `secret`. Sign every subsequent request with them.

### Authenticated requests — HMAC scheme

Send these headers on **every** endpoint except `/pair`:

| Header | Value |
| --- | --- |
| `X-ArticlePilot-Key` | the `connection_id` returned by `/pair` |
| `X-ArticlePilot-Timestamp` | current unix time in **seconds** (integer). Rejected if more than **300s** from server time. |
| `X-ArticlePilot-Nonce` | a fresh random string per request (single-use; reuse is rejected) |
| `X-ArticlePilot-Signature` | lowercase hex HMAC-SHA256 of the canonical string (below), keyed with `secret` |

#### Canonical string

Join these five fields with a single `\n` (LF, `0x0A`). **No trailing newline.**

```
METHOD\nROUTE\nTIMESTAMP\nNONCE\nSHA256_HEX(body)
```

- `METHOD` — upper-case HTTP verb, e.g. `GET`, `POST`, `PUT`, `PATCH`.
- `ROUTE` — REST route **path including the namespace and a leading slash**, no host, no query string. Example: `/articlepilot/v1/posts`. For `/posts/123` it is `/articlepilot/v1/posts/123`.
- `TIMESTAMP` — exactly the value sent in `X-ArticlePilot-Timestamp`.
- `NONCE` — exactly the value sent in `X-ArticlePilot-Nonce`.
- `SHA256_HEX(body)` — lowercase hex SHA-256 of the **raw request body bytes**. For an empty body, use SHA-256 of the empty string (`e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`).

Signature:

```
signature = hex( HMAC_SHA256( key = secret, message = canonical_string ) )
```

#### Reference (Node.js)

```js
const crypto = require('crypto');

function sign({ method, route, body, secret }) {
  const ts = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(16).toString('hex');
  const bodyHash = crypto.createHash('sha256').update(body || '').digest('hex');
  const canonical = [method.toUpperCase(), route, ts, nonce, bodyHash].join('\n');
  const signature = crypto.createHmac('sha256', secret).update(canonical).digest('hex');
  return {
    'X-ArticlePilot-Key': connectionId,
    'X-ArticlePilot-Timestamp': ts,
    'X-ArticlePilot-Nonce': nonce,
    'X-ArticlePilot-Signature': signature,
  };
}
```

> Sign the **exact bytes** you send. If you `JSON.stringify` the body, hash and send that identical string — do not re-serialize.

### Endpoints

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/pair` | Finalize pairing (returns secret). |
| `GET` | `/health` | Plugin version + connection status. |
| `GET` | `/site-info` | WP version, timezone, language, name, URL. |
| `GET` | `/seo-plugin` | Detected SEO plugin slug + name. |
| `POST` | `/rotate-secret` | Issue a new shared secret. |
| `GET` | `/authors` | List authors who can write. |
| `GET` | `/categories` | List categories. |
| `POST` | `/categories` | Create a category (`name`, optional `slug`, `parent`, `description`). |
| `GET` | `/tags` | List tags. |
| `POST` | `/tags` | Create a tag. |
| `GET` | `/posts?page=&per_page=` | Paginated post list (`X-WP-Total`, `X-WP-TotalPages` headers). |
| `GET` | `/posts/{id}` | Fetch one post. |
| `POST` | `/posts` | Create a post. |
| `PUT`/`PATCH` | `/posts/{id}` | Update a post. |
| `POST` | `/media` | Upload media from `url` or base64 `data`. |

#### Create post body

```json
{
  "title": "My AI Article",
  "content": "<h2>Intro</h2><p>HTML body…</p>",
  "excerpt": "Short summary",
  "status": "draft",
  "date": "2026-09-01T09:00:00Z",
  "author": 1,
  "slug": "my-ai-article",
  "category_ids": [3, 7],
  "tag_ids": [12],
  "featured_media": 45,
  "seo": {
    "seo_title": "My AI Article | Site",
    "meta_description": "…",
    "focus_keyword": "ai article",
    "canonical": "https://site/my-ai-article",
    "robots": ["index", "follow"],
    "og_title": "My AI Article",
    "og_description": "…"
  }
}
```

- `status`: `draft` | `pending` | `publish` | `future`. Using `future` with a future `date` schedules the post.
- `author` must have `edit_posts`; `publish`/`future` additionally require `publish_posts`. Missing capability returns HTTP 403 with a clear error code.

#### Media body

```json
{ "url": "https://cdn/image.jpg", "filename": "image.jpg", "alt": "Alt text", "caption": "Caption" }
```

or

```json
{ "data": "data:image/png;base64,iVBOR…", "filename": "image.png", "alt": "Alt text" }
```

Returns `{ "id": 45, "url": "https://site/wp-content/uploads/…" }`.

### Errors

Standard WordPress REST error shape:

```json
{ "code": "articlepilot_bad_signature", "message": "Request signature verification failed.", "data": { "status": 401 } }
```

### Notes

- **HTTPS** is required in production. HTTP is allowed only when `WP_DEBUG` is true or the `articlepilot_allow_insecure` filter returns true.
- The **nonce** must be unique per request; the plugin remembers recent nonces for ~10 minutes.
- Keep the **secret** server-side only. Rotate it via `/rotate-secret` if exposed.
