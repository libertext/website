import type { Prisma, PrismaClient, CreditTxnType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/ai/errors";

type Tx = Prisma.TransactionClient | PrismaClient;

/**
 * Credits ledger (§19). Every balance change is a signed CreditTransaction row;
 * the account balance is derived and kept in lock-step inside one DB transaction (§82).
 * All mutations accept an idempotencyKey so a retried queue job never double-charges (§81).
 */
export const CreditService = {
  async getBalance(workspaceId: string): Promise<number> {
    const acct = await prisma.creditAccount.findUnique({ where: { workspaceId } });
    return acct?.balance ?? 0;
  },

  /** Throws INSUFFICIENT_CREDITS if the workspace can't cover `credits` (§19). */
  async ensureQuota(workspaceId: string, credits: number): Promise<void> {
    if (credits <= 0) return;
    const balance = await this.getBalance(workspaceId);
    if (balance < credits) {
      throw new AppError("INSUFFICIENT_CREDITS", {
        message: `Need ${credits}, have ${balance}`,
      });
    }
  },

  /**
   * Apply a signed delta atomically. Positive = grant/refund, negative = charge.
   * Idempotent on idempotencyKey: a duplicate key returns the existing balance
   * without applying the delta again.
   */
  async apply(
    workspaceId: string,
    delta: number,
    opts: {
      type: CreditTxnType;
      description?: string;
      generationJobId?: string;
      idempotencyKey?: string;
      allowNegative?: boolean;
    },
  ): Promise<number> {
    return prisma.$transaction(async (tx) => {
      if (opts.idempotencyKey) {
        const existing = await tx.creditTransaction.findUnique({
          where: { idempotencyKey: opts.idempotencyKey },
        });
        if (existing) return existing.balanceAfter; // already applied (§81)
      }

      const acct =
        (await tx.creditAccount.findUnique({ where: { workspaceId } })) ??
        (await tx.creditAccount.create({ data: { workspaceId, balance: 0 } }));

      const balanceAfter = acct.balance + delta;
      if (balanceAfter < 0 && !opts.allowNegative) {
        throw new AppError("INSUFFICIENT_CREDITS", {
          message: `Balance would go negative: ${acct.balance} + ${delta}`,
        });
      }

      await tx.creditAccount.update({
        where: { workspaceId },
        data: { balance: balanceAfter },
      });
      await tx.creditTransaction.create({
        data: {
          workspaceId,
          type: opts.type,
          amount: delta,
          balanceAfter,
          description: opts.description,
          generationJobId: opts.generationJobId,
          idempotencyKey: opts.idempotencyKey,
        },
      });
      return balanceAfter;
    });
  },

  charge(
    workspaceId: string,
    credits: number,
    opts: { description?: string; generationJobId?: string; idempotencyKey?: string },
  ) {
    return this.apply(workspaceId, -Math.abs(credits), { ...opts, type: "GENERATION" });
  },

  refund(
    workspaceId: string,
    credits: number,
    opts: { description?: string; generationJobId?: string; idempotencyKey?: string },
  ) {
    return this.apply(workspaceId, Math.abs(credits), { ...opts, type: "REFUND" });
  },

  grant(
    workspaceId: string,
    credits: number,
    opts: { type?: CreditTxnType; description?: string; idempotencyKey?: string } = {},
  ) {
    return this.apply(workspaceId, Math.abs(credits), {
      type: opts.type ?? "MONTHLY_GRANT",
      description: opts.description,
      idempotencyKey: opts.idempotencyKey,
    });
  },
};

/** Estimate credits for a generation before it runs (§112). Coarse, not billed. */
export function estimateGenerationCredits(lengthPreference: string): number {
  switch (lengthPreference) {
    case "SHORT":
      return 2;
    case "LONG":
      return 5;
    case "COMPREHENSIVE":
      return 8;
    default:
      return 3;
  }
}
