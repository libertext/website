import "server-only";
import { redirect } from "next/navigation";
import type { WorkspaceRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireUser, type AuthUser } from "@/lib/auth/context";

export interface ActiveWorkspace {
  user: AuthUser;
  workspace: { id: string; name: string; slug: string };
  role: WorkspaceRole;
}

/**
 * Resolve the caller's active workspace for app pages. Redirects to onboarding if
 * the user has no workspace yet (§6). This is the tenant scope for all app queries.
 */
export async function getActiveWorkspace(): Promise<ActiveWorkspace> {
  const user = await requireUser();
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id, workspace: { deletedAt: null } },
    orderBy: { createdAt: "asc" },
    include: { workspace: true },
  });
  if (!membership) redirect("/onboarding");
  return {
    user,
    workspace: {
      id: membership.workspace.id,
      name: membership.workspace.name,
      slug: membership.workspace.slug,
    },
    role: membership.role,
  };
}
