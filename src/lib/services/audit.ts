import { prisma } from "@/lib/db/prisma";

/** Record a security-relevant action (§71). Never pass secrets in metadata. */
export async function audit(entry: {
  workspaceId?: string;
  actorUserId?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}): Promise<void> {
  await prisma.auditLog
    .create({
      data: {
        workspaceId: entry.workspaceId,
        actorUserId: entry.actorUserId,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
        metadata: entry.metadata as object | undefined,
        ip: entry.ip,
        userAgent: entry.userAgent,
      },
    })
    .catch((e) => console.error("[audit] failed", e));
}
