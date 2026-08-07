import { hash, verify } from "@node-rs/argon2";

// Argon2id parameters — sensible defaults balancing cost and latency.
const OPTS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, OPTS);
}

export async function verifyPassword(digest: string, plain: string): Promise<boolean> {
  try {
    return await verify(digest, plain, OPTS);
  } catch {
    return false;
  }
}
