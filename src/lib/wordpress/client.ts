import { createHmac, createHash, randomBytes } from "node:crypto";
import { assertSafeWordPressUrl } from "@/lib/wordpress/ssrf";
import { AppError } from "@/lib/ai/errors";

const NAMESPACE = "/articlepilot/v1";
const TIMEOUT_MS = 30_000; // WP sites can be slow (§151)

/**
 * HMAC-signed client for the ArticlePilot Connector plugin.
 * MUST match the plugin's canonical string exactly (agreed scheme):
 *   canonical = METHOD\nROUTE\nTIMESTAMP\nNONCE\nSHA256_HEX(body)
 *   ROUTE     = leading-slash path incl. namespace (e.g. /articlepilot/v1/posts)
 *   signature = lowercase hex HMAC-SHA256(secret, canonical)
 * Headers: X-ArticlePilot-Key / -Timestamp / -Nonce / -Signature.
 */
export class WordPressPluginClient {
  constructor(
    private readonly baseUrl: string,
    private readonly connectionId: string,
    private readonly secret: string,
  ) {}

  async request<T>(
    method: "GET" | "POST" | "PUT" | "PATCH",
    path: string, // e.g. "/posts" or "/posts/12"
    body?: unknown,
    signal?: AbortSignal,
  ): Promise<T> {
    const route = `${NAMESPACE}${path}`;
    const bodyStr = body === undefined ? "" : JSON.stringify(body);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = randomBytes(16).toString("hex");
    const bodyHash = createHash("sha256").update(bodyStr).digest("hex");
    const canonical = [method, route, timestamp, nonce, bodyHash].join("\n");
    const signature = createHmac("sha256", this.secret).update(canonical).digest("hex");

    const base = await assertSafeWordPressUrl(this.baseUrl); // SSRF check every call (§9)
    const target = new URL(`/wp-json${route}`, base);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    if (signal) signal.addEventListener("abort", () => controller.abort(), { once: true });
    try {
      const res = await fetch(target, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-ArticlePilot-Key": this.connectionId,
          "X-ArticlePilot-Timestamp": timestamp,
          "X-ArticlePilot-Nonce": nonce,
          "X-ArticlePilot-Signature": signature,
        },
        body: method === "GET" ? undefined : bodyStr,
        signal: controller.signal,
        redirect: "manual", // block redirects to unvalidated hosts (§9)
      });
      if (res.status === 401 || res.status === 403) {
        const text = await res.text().catch(() => "");
        if (/capab|permission|yetki/i.test(text))
          throw new AppError("WORDPRESS_PERMISSION_DENIED");
        throw new AppError("WORDPRESS_AUTH_FAILED");
      }
      if (res.status >= 300 && res.status < 400) {
        throw new AppError("WORDPRESS_CONNECTION_FAILED", { message: "Unexpected redirect" });
      }
      if (!res.ok) {
        throw new AppError("WORDPRESS_CONNECTION_FAILED", {
          message: `WP responded ${res.status}`,
        });
      }
      return (await res.json()) as T;
    } catch (err) {
      if (err instanceof AppError) throw err;
      if (err instanceof Error && err.name === "AbortError")
        throw new AppError("WORDPRESS_CONNECTION_FAILED", { message: "Timeout" });
      throw new AppError("WORDPRESS_CONNECTION_FAILED", { cause: err });
    } finally {
      clearTimeout(timer);
    }
  }
}

/** Signature builder exposed for unit testing against the plugin's known vectors. */
export function buildSignature(
  secret: string,
  method: string,
  route: string,
  timestamp: string,
  nonce: string,
  body: string,
): string {
  const bodyHash = createHash("sha256").update(body).digest("hex");
  const canonical = [method, route, timestamp, nonce, bodyHash].join("\n");
  return createHmac("sha256", secret).update(canonical).digest("hex");
}
