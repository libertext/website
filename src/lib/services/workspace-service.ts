import { prisma } from "@/lib/db/prisma";
import { slugify, uniqueSlug } from "@/lib/utils/slug";
import { CreditService } from "@/lib/services/credit-service";

/** Create a workspace, make the creator OWNER, and provision a credit account (§5). */
export async function createWorkspace(params: {
  userId: string;
  name: string;
  primaryUse?: string;
  contentLang?: string;
  targetCountry?: string;
}): Promise<{ id: string; slug: string }> {
  const existing = await prisma.workspace.findMany({ select: { slug: true } });
  const slug = uniqueSlug(slugify(params.name) || "workspace", new Set(existing.map((w) => w.slug)));

  // Default plan grant, if a FREE plan is seeded.
  const freePlan = await prisma.plan.findUnique({ where: { key: "FREE" } });

  const workspace = await prisma.workspace.create({
    data: {
      name: params.name,
      slug,
      primaryUse: params.primaryUse,
      contentLang: params.contentLang ?? "tr",
      targetCountry: params.targetCountry ?? "TR",
      planId: freePlan?.id,
      members: { create: { userId: params.userId, role: "OWNER" } },
      creditAccount: { create: { balance: 0 } },
    },
  });

  if (freePlan?.monthlyCredits) {
    await CreditService.grant(workspace.id, freePlan.monthlyCredits, {
      type: "MONTHLY_GRANT",
      description: "Karşılama kredisi",
      idempotencyKey: `welcome:${workspace.id}`,
    });
  }

  return { id: workspace.id, slug: workspace.slug };
}
