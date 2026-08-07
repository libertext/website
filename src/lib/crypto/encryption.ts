import { createCipheriv, createDecipheriv, randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { getEnv } from "@/lib/config/env";

/**
 * Authenticated encryption for secrets at rest — AES-256-GCM (§7).
 * Master key from APP_ENCRYPTION_KEY (32 bytes hex). Losing it makes stored
 * credentials unrecoverable — back it up (§108).
 *
 * Serialized format: v1:<iv_hex>:<tag_hex>:<ciphertext_hex>
 */
const VERSION = "v1";

function masterKey(): Buffer {
  return Buffer.from(getEnv().APP_ENCRYPTION_KEY, "hex");
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12); // 96-bit nonce recommended for GCM
  const cipher = createCipheriv("aes-256-gcm", masterKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${VERSION}:${iv.toString("hex")}:${tag.toString("hex")}:${ciphertext.toString("hex")}`;
}

export function decryptSecret(serialized: string): string {
  const parts = serialized.split(":");
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error("Malformed encrypted payload");
  }
  const [, ivHex, tagHex, dataHex] = parts;
  const decipher = createDecipheriv("aes-256-gcm", masterKey(), Buffer.from(ivHex!, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex!, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(dataHex!, "hex")), decipher.final()]).toString(
    "utf8",
  );
}

/** SHA-256 hex — for hashing session tokens, pairing codes, etc. (never store raw). */
export function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/** Constant-time string compare to avoid timing leaks on secrets. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** Cryptographically-random opaque token (URL-safe). */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** Last 4 visible chars for masked display of an API key (§17). */
export function maskKey(key: string): string {
  const last4 = key.slice(-4);
  return `${last4}`;
}
