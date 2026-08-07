import { describe, it, expect } from "vitest";
import { createHmac, createHash } from "node:crypto";
import { buildSignature } from "@/lib/wordpress/client";

/**
 * Locks the HMAC canonical string to the exact scheme the plugin verifies:
 *   METHOD\nROUTE\nTIMESTAMP\nNONCE\nSHA256_HEX(body)
 * A drift here breaks every authenticated call to the connector.
 */
describe("WordPress HMAC signature", () => {
  it("matches the agreed canonical format", () => {
    const secret = "s3cr3t";
    const method = "POST";
    const route = "/articlepilot/v1/posts";
    const ts = "1700000000";
    const nonce = "abc123";
    const body = JSON.stringify({ title: "Merhaba" });

    const bodyHash = createHash("sha256").update(body).digest("hex");
    const canonical = [method, route, ts, nonce, bodyHash].join("\n");
    const expected = createHmac("sha256", secret).update(canonical).digest("hex");

    expect(buildSignature(secret, method, route, ts, nonce, body)).toBe(expected);
  });

  it("hashes an empty body deterministically for GET", () => {
    const sig = buildSignature("k", "GET", "/articlepilot/v1/site-info", "1", "n", "");
    expect(sig).toHaveLength(64);
  });
});
