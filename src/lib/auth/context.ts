import "server-only";
import { redirect } from "next/navigation";
import type { WorkspaceRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { AppError } from "@/lib/ai/errors";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  isSuperAdmin: boolean;
}

export interface WorkspaceContext {
  user: AuthUser;
  workspaceId: string;
  role: WorkspaceRole;
}

/** Redirect to login if unauthenticated. Use in server components/pages. */
export async function requireUser(): Promise<AuthUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

// Role ranking for permission checks (§5).
const RANK: Record<WorkspaceRole, number> = { VIEWER: 0, EDITOR: 1, ADMIN: 2, OWNER: 3 };

/**
 * Backend-enforced tenant authorization (§5). Resolves the caller's membership in a
 * workspace and asserts a minimum role. NEVER trust the frontend for this.
 * Throws FORBIDDEN if the user is not a member or lacks the role.
 */
export async function requireWorkspace(
  workspaceId: string,
  minRole: WorkspaceRole = "VIEWER",
): Promise<WorkspaceContext> {
  const user = await getSessionUser();
  if (!user) throw new AppError("FORBIDDEN", { message: "Not authenticated" });

  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: user.id } },
  });
  if (!membership) {
    // Super admins may still access via the admin surface, not here (§66).
    throw new AppError("FORBIDDEN", { message: "Not a member of this workspace" });
  }
  if (RANK[membership.role] < RANK[minRole]) {
    throw new AppError("FORBIDDEN", { message: `Requires role ${minRole}` });
  }
  return { user, workspaceId, role: membership.role };
}

/** The caller's default (first) workspace, or null for onboarding. */
export async function getDefaultWorkspaceId(userId: string): Promise<string | null> {
  const m = await prisma.workspaceMember.findFirst({
    where: { userId, workspace: { deletedAt: null } },
    orderBy: { createdAt: "asc" },
    select: { workspaceId: true },
  });
  return m?.workspaceId ?? null;
}

export async function requireSuperAdmin(): Promise<AuthUser> {
  const user = await requireUser();
  if (!user.isSuperAdmin) redirect("/dashboard");
  return user;
}
