/**
 * lib/plan-credit.ts
 *
 * SINGLE idempotent wallet-credit path for paid subscription plans.
 * A payment id can never create more than one credit transaction, no matter
 * whether the verify route, the Razorpay webhook, or a retry calls it.
 */
import type { Prisma } from "@prisma/client";
import { COMMISSION_PLAN, planCoinCredit } from "./subscription-plans";

export type PlanCreditArgs = {
  tutorProfileId: string;
  planId: string;
  /** Canonical idempotency key — Razorpay payment id, or UTR for offline UPI. */
  paymentId: string;
  planName?: string;
  /** e.g. "verify route" | "razorpay webhook" | "offline UPI approval" — logs only. */
  source?: string;
};

export type PlanCreditResult = {
  coins: number;
  credited: number;
  alreadyCredited: boolean;
};

export async function creditPlanCoinsIfAbsent(
  tx: Prisma.TransactionClient,
  args: PlanCreditArgs
): Promise<PlanCreditResult> {
  const coins = planCoinCredit(args.planId);
  if (coins <= 0) return { coins: 0, credited: 0, alreadyCredited: false };

  // Idempotency check lives INSIDE the caller's transaction so two concurrent
  // requests cannot both pass it (the account row is already locked by then).
  const existing = await tx.walletTransaction.findFirst({
    where: { referenceId: args.paymentId },
    select: { id: true, amount: true },
  });
  if (existing) {
    return { coins, credited: 0, alreadyCredited: true };
  }

  const isCommissionPlan = args.planId.toUpperCase() === COMMISSION_PLAN.id;
  const wallet = await tx.wallet.upsert({
    where: { tutorProfileId: args.tutorProfileId },
    create: { tutorProfileId: args.tutorProfileId, balance: coins },
    update: { balance: { increment: coins } },
  });

  await tx.walletTransaction.create({
    data: {
      walletId: wallet.id,
      amount: coins,
      balanceAfter: wallet.balance,
      type: isCommissionPlan ? "PURCHASE" : "BONUS",
      description: isCommissionPlan
        ? `₹${COMMISSION_PLAN.priceInr} Commission Based Plan — ${COMMISSION_PLAN.coinSummary}`
        : `🎁 Bonus ${coins} coins included with ${args.planName ?? args.planId}`,
      referenceId: args.paymentId,
    },
  });

  return { coins, credited: coins, alreadyCredited: false };
}
