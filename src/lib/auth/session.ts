import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { randomToken, sha256Hex } from "@/lib/crypto/encryption";

const COOKIE = "ap_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

/**
 * Opaque session tokens. The raw token lives only in the httpOnly cookie; the DB
 * stores only its SHA-256 hash, so a DB leak can't be replayed as a session (§5, §72).
 */
export async function createSession(
  userId: string,
  meta: { ip?: string; userAgent?: string } = {},
): Promise<void> {
  const token = randomToken(32);
  const tokenHash = sha256Hex(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.session.create({
    data: { userId, tokenHash, expiresAt, ipAddress: meta.ip, userAgent: meta.userAgent },
  });
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function getSessionUser(): Promise<{
  id: string;
  email: string;
  name: string | null;
  isSuperAdmin: boolean;
} | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: sha256Hex(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) return null;
  // Best-effort activity touch (throttled by not awaiting failure).
  void prisma.session
    .update({ where: { id: session.id }, data: { lastActiveAt: new Date() } })
    .catch(() => {});
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    isSuperAdmin: session.user.isSuperAdmin,
  };
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: sha256Hex(token) } });
    store.delete(COOKIE);
  }
}

/** Invalidate every session for a user (logout everywhere, §166; member removal §168). */
export async function destroyAllSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}
