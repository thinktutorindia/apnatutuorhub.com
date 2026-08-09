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
  verifyPaymentSignature,
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

import { validateCouponAction } from "@/app/actions/coupon.actions";

export async function createCoinOrderAction(
  packageId: CoinPackageId,
  couponCode?: string
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

  let finalPricePaise = pkg.priceInPaise;
  let appliedCouponId: string | undefined;

  if (couponCode?.trim()) {
    const valRes = await validateCouponAction(couponCode.trim(), pkg.priceInr);
    if (valRes.success && valRes.data) {
      finalPricePaise = Math.round(valRes.data.finalAmountInr * 100);
      appliedCouponId = valRes.data.couponId;
    }
  }

  try {
    // Razorpay receipt length MUST be <= 40 characters
    const receipt = `rcpt_${Date.now()}_${tutorProfile.id.slice(-8)}`;
    const orderResult = await createRazorpayOrder(finalPricePaise, receipt, {
      tutorProfileId: tutorProfile.id,
      packageId,
      couponId: appliedCouponId ?? "",
    });

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

// ── Confirm Razorpay Payment (Client Callback Verification) ─────────────────

export type ConfirmPaymentInput = {
  orderId: string;
  paymentId: string;
  signature: string;
  packageId: CoinPackageId;
};

export async function confirmCoinPaymentAction(
  input: ConfirmPaymentInput
): Promise<ActionResult<{ newBalance: number }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return actionError("Your session has expired. Please log in again.");
  }

  const pkg = getCoinPackage(input.packageId);
  if (!pkg) {
    return actionError("Invalid coin package selected.");
  }

  const isValid = verifyPaymentSignature(
    input.orderId,
    input.paymentId,
    input.signature
  );

  if (!isValid) {
    return actionError("Payment verification failed. Invalid signature.");
  }

  const tutorProfile = await prisma.tutorProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!tutorProfile) {
    return actionError("Tutor profile not found.");
  }

  const description = `Purchased ${pkg.name} (${pkg.totalCoins} Coins)`;
  const result = await creditCoinsToWallet(
    tutorProfile.id,
    pkg.totalCoins,
    description,
    input.paymentId
  );

  if (result.success) {
    revalidatePath("/tutor/wallet");
    revalidatePath("/tutor/dashboard");
  }

  return result;
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
      // Idempotency guard: avoid double-crediting if webhook + client callback both run
      if (referenceId) {
        const existingTx = await tx.walletTransaction.findFirst({
          where: { referenceId },
        });
        if (existingTx) {
          const wallet = await tx.wallet.findUnique({
            where: { tutorProfileId },
          });
          return wallet ?? { balance: 0 };
        }
      }

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
    }, { timeout: 15000, maxWait: 10000 });

    return actionSuccess({ newBalance: result.balance });
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err?.code === "P2002" || err?.message?.includes("Unique constraint")) {
      const wallet = await prisma.wallet.findUnique({
        where: { tutorProfileId },
        select: { balance: true },
      });
      return actionSuccess({ newBalance: wallet?.balance ?? 0 });
    }
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
