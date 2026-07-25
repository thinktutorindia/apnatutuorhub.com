"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { resolveTutorContext } from "@/lib/tutor-context";
import {
  actionError,
  actionSuccess,
  type ActionResult,
} from "@/lib/action-result";
import {
  createRazorpayOrder,
  getCoinPackage,
  isRazorpayConfigured,
  type CoinPackageId,
} from "@/lib/razorpay";

// ── Create Razorpay Order ─────────────────────────────────────────────────────

export type CoinOrderResult = ActionResult<{
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  packageName: string;
  totalCoins: number;
}>;

export async function createCoinOrderAction(
  packageId: CoinPackageId
): Promise<CoinOrderResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return actionError("Your session has expired. Please log in again.");
  }

  if (!isRazorpayConfigured()) {
    return actionError(
      "Payment gateway is not configured yet. Please contact support."
    );
  }

  const pkg = getCoinPackage(packageId);
  if (!pkg) {
    return actionError("Invalid coin package selected.");
  }

  const tutorProfile = await prisma.tutorProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!tutorProfile) {
    return actionError("Tutor profile not found.");
  }

  try {
    const receipt = `coins_${tutorProfile.id}_${Date.now()}`;
    const orderResult = await createRazorpayOrder(pkg.priceInPaise, receipt);

    return actionSuccess({
      ...orderResult,
      packageName: pkg.name,
      totalCoins: pkg.totalCoins,
    });
  } catch (error) {
    console.error("[wallet] createCoinOrderAction error", error);
    return actionError(
      "Failed to create payment order. Please try again in a moment."
    );
  }
}

// ── Credit coins after payment (also called from webhook) ────────────────────

export type CreditCoinsResult = ActionResult<{
  newBalance: number;
}>;

export async function creditCoinsToWallet(
  tutorProfileId: string,
  coins: number,
  description: string,
  referenceId?: string
): Promise<CreditCoinsResult> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Upsert wallet (creates if this tutor's first top-up ever)
      const wallet = await tx.wallet.upsert({
        where: { tutorProfileId },
        update: {
          balance: { increment: coins },
          totalPurchased: { increment: coins },
        },
        create: {
          tutorProfileId,
          balance: coins,
          totalPurchased: coins,
          totalSpent: 0,
        },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: "PURCHASE",
          amount: coins,
          balanceAfter: wallet.balance,
          description,
          referenceId,
        },
      });

      return wallet;
    });

    return actionSuccess({ newBalance: result.balance });
  } catch (error) {
    console.error("[wallet] creditCoinsToWallet error", { tutorProfileId, error });
    return actionError("Failed to credit coins. Please contact support.");
  }
}

// ── Request Lead Refund ───────────────────────────────────────────────────────

export type RefundRequestResult = ActionResult<{ submitted: true }>;

export async function requestLeadRefundAction(
  leadPurchaseId: string
): Promise<RefundRequestResult> {
  const authCtx = await resolveTutorContext();
  if (!authCtx.ok) return authCtx.result;

  const purchase = await prisma.leadPurchase.findUnique({
    where: { id: leadPurchaseId },
    select: {
      id: true,
      coinsSpent: true,
      tutorProfileId: true,
      createdAt: true,
      lead: { select: { status: true } },
    },
  });

  if (!purchase) {
    return actionError("Lead purchase not found.");
  }

  if (purchase.tutorProfileId !== authCtx.context.tutorProfileId) {
    return actionError("You are not authorised to refund this purchase.");
  }

  // 24-hour refund window
  const REFUND_WINDOW_MS = 24 * 60 * 60 * 1000;
  if (Date.now() - purchase.createdAt.getTime() > REFUND_WINDOW_MS) {
    return actionError(
      "The 24-hour refund window for this lead has expired. Refunds are not available after 24 hours."
    );
  }

  // Check if a refund request already exists
  const existing = await prisma.walletTransaction.findFirst({
    where: {
      referenceId: leadPurchaseId,
      type: "REFUND",
    },
  });

  if (existing) {
    return actionError("A refund request for this lead has already been submitted.");
  }

  const wallet = await prisma.wallet.findUnique({
    where: { tutorProfileId: authCtx.context.tutorProfileId },
    select: { id: true, balance: true },
  });

  if (!wallet) {
    return actionError("Wallet not found.");
  }

  // Log a REFUND transaction with amount=0 (pending admin processing).
  // Admin will credit the actual coins in Phase 9 admin panel.
  await prisma.walletTransaction.create({
    data: {
      walletId: wallet.id,
      type: "REFUND",
      amount: purchase.coinsSpent,
      balanceAfter: wallet.balance,                  // unchanged until admin approves
      description: "REFUND_REQUEST_PENDING",
      referenceId: leadPurchaseId,
    },
  });

  revalidatePath("/tutor/wallet");

  return actionSuccess({ submitted: true as const });
}
