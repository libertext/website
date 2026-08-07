import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getRedis } from "@/lib/queue/connection";

/** Liveness + dependency health (§109). AI provider health does not fail this check. */
export async function GET() {
  const checks: Record<string, boolean> = { web: true, database: false, redis: false };
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch {
    /* reported below */
  }
  try {
    await getRedis().ping();
    checks.redis = true;
  } catch {
    /* reported below */
  }
  const ok = checks.web && checks.database;
  return NextResponse.json({ ok, checks }, { status: ok ? 200 : 503 });
}
