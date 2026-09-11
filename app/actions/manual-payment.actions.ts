"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { actionError, actionSuccess, type ActionResult } from "@/lib/action-result";
import { revalidatePath } from "next/cache";
import { can } from "@/lib/rbac";
import type { PaymentRequestType, SubscriptionPlan, PaymentRequestStatus } from "@prisma/client";

export interface SubmitPaymentInput {
  type: PaymentRequestType;
  plan?: SubscriptionPlan;
  coinsAmount?: number;
  amountInr: number;
  utrNumber: string;
  screenshotUrl: string;
  couponCode?: string;
  discountInr?: number;
}

/**
 * Tutor submits an offline payment proof (UTR + Screenshot) for manual admin approval.
 */
export async function submitManualPaymentAction(
  input: SubmitPaymentInput
): Promise<ActionResult<{ requestId: string }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return actionError("Your session has expired. Please log in again.");
  }

  const tutorProfile = await prisma.tutorProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, userId: true },
  });

  if (!tutorProfile) {
    return actionError("Tutor profile not found. Please complete your registration.");
  }

  const cleanUtr = input.utrNumber?.trim();
  if (!cleanUtr || cleanUtr.length < 4) {
    return actionError("Please provide a valid UPI Transaction ID / UTR number (at least 6 digits/characters).");
  }

  if (!input.screenshotUrl || !input.screenshotUrl.trim()) {
    return actionError("Please upload a payment screenshot as proof of transfer.");
  }

  if (input.amountInr <= 0) {
    return actionError("Invalid payment amount.");
  }

  // Prevent duplicate submissions of the same UTR unless previously rejected
  const existingWithUtr = await prisma.manualPaymentRequest.findFirst({
    where: {
      utrNumber: cleanUtr,
      status: { not: "REJECTED" },
    },
    select: { id: true, status: true },
  });

  if (existingWithUtr) {
    return actionError(
      existingWithUtr.status === "PENDING"
        ? "This UTR / Transaction number is already submitted and awaiting verification."
        : "This UTR / Transaction number has already been processed and approved."
    );
  }

  const paymentReq = await prisma.manualPaymentRequest.create({
    data: {
      tutorProfileId: tutorProfile.id,
      type: input.type,
      plan: input.plan ?? null,
      coinsAmount: input.coinsAmount ?? null,
      amountInr: Math.round(input.amountInr),
      utrNumber: cleanUtr,
      screenshotUrl: input.screenshotUrl.trim(),
      couponCode: input.couponCode?.trim() || null,
      discountInr: input.discountInr ? Math.round(input.discountInr) : 0,
      status: "PENDING",
    },
  });

  // Revalidate relevant pages
  revalidatePath("/tutor/wallet");
  revalidatePath("/tutor/plans");
  revalidatePath("/admin/wallets");

  return actionSuccess({ requestId: paymentReq.id });
}

/**
 * Fetch all manual payment requests (for Admin Review Panel).
 */
export async function getManualPaymentRequestsAction(
  statusFilter?: PaymentRequestStatus | "ALL"
): Promise<ActionResult<any[]>> {
  const session = await auth();
  if (!session?.user) return actionError("Unauthorized");

  const canRead = can(session.user, "wallets:read") || can(session.user, "wallets:manage");
  if (!canRead) {
    return actionError("Permission denied: insufficient privileges.");
  }

  const whereClause: any = {};
  if (statusFilter && statusFilter !== "ALL") {
    whereClause.status = statusFilter;
  }

  const requests = await prisma.manualPaymentRequest.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      tutorProfile: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
              phone: true,
              image: true,
            },
          },
          wallet: {
            select: {
              balance: true,
            },
          },
        },
      },
    },
  });

  return actionSuccess(requests);
}

/**
 * Admin approves a manual payment request:
 * - If COIN_TOPUP: atomically credits coins to the tutor's wallet and logs WalletTransaction.
 * - If PLAN_SUBSCRIPTION: activates membership plan with duration & unlocks top-up.
 */
export async function adminApprovePaymentAction(
  requestId: string
): Promise<ActionResult<{ approved: true }>> {
  const session = await auth();
  if (!session?.user) return actionError("Unauthorized");

  const canManage = can(session.user, "wallets:manage");
  if (!canManage) {
    return actionError("Permission denied: Requires 'wallets:manage' permission.");
  }

  const request = await prisma.manualPaymentRequest.findUnique({
    where: { id: requestId },
    include: {
      tutorProfile: {
        include: {
          wallet: true,
          user: true,
        },
      },
    },
  });

  if (!request) {
    return actionError("Payment request not found.");
  }

  if (request.status === "APPROVED") {
    return actionError("This payment request has already been approved.");
  }
  if (request.status === "REJECTED") {
    return actionError("This payment request was previously rejected.");
  }

  const tutorProfile = request.tutorProfile;
  if (!tutorProfile) {
    return actionError("Associated tutor profile not found.");
  }

  await prisma.$transaction(async (tx) => {
    // 1. Handle Coin Top-up
    if (request.type === "COIN_TOPUP") {
      const coinsToAdd = request.coinsAmount ?? 0;
      if (coinsToAdd <= 0) {
        throw new Error("Invalid coin amount on request.");
      }

      // Upsert wallet if not exists
      const wallet = await tx.wallet.upsert({
        where: { tutorProfileId: tutorProfile.id },
        update: {
          balance: { increment: coinsToAdd },
          totalPurchased: { increment: coinsToAdd },
        },
        create: {
          tutorProfileId: tutorProfile.id,
          balance: coinsToAdd,
          totalPurchased: coinsToAdd,
          totalSpent: 0,
        },
      });

      // Record transaction
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: "PURCHASE",
          amount: coinsToAdd,
          balanceAfter: wallet.balance,
          description: `BharatPe UPI Top-Up (₹${request.amountInr}) • UTR: ${request.utrNumber}`,
          referenceId: `UPI-${request.utrNumber}`,
        },
      });
    }

    // 2. Handle Plan Subscription
    if (request.type === "PLAN_SUBSCRIPTION") {
      const plan = request.plan;
      if (!plan || plan === "NONE") {
        throw new Error("Invalid subscription plan on request.");
      }

      // Plan validity days
      const planDaysMap: Record<string, number> = {
        BRONZE: 30,
        SILVER: 60,
        GOLD: 60,
        PLATINUM: 90,
      };
      const daysValid = planDaysMap[plan] || 30;

      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + daysValid * 24 * 60 * 60 * 1000);

      // Deactivate any previous active subscription
      await tx.tutorSubscription.updateMany({
        where: { tutorProfileId: tutorProfile.id, isActive: true },
        data: { isActive: false },
      });

      // Create new subscription record
      await tx.tutorSubscription.create({
        data: {
          tutorProfileId: tutorProfile.id,
          plan,
          priceInr: request.amountInr,
          razorpayOrderId: "OFFLINE-UPI",
          razorpayPaymentId: request.utrNumber,
          startDate,
          endDate,
          isActive: true,
        },
      });

      // Update tutor profile
      await tx.tutorProfile.update({
        where: { id: tutorProfile.id },
        data: {
          subscriptionPlan: plan,
          subscriptionExpiresAt: endDate,
          canTopup: true, // Subscribed tutors get coin top-up unlocked
          leadsUsedThisMonth: 0,
          leadsResetAt: new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    }

    // 3. Mark request as APPROVED
    await tx.manualPaymentRequest.update({
      where: { id: requestId },
      data: {
        status: "APPROVED",
        reviewedByUserId: session.user.id,
        reviewedAt: new Date(),
      },
    });

    // 4. Send in-app notification to tutor
    const notifTitle = request.type === "COIN_TOPUP" ? "Coin Top-Up Approved! 🪙" : `${request.plan} Membership Activated! 👑`;
    const notifMsg = request.type === "COIN_TOPUP"
      ? `Your payment of ₹${request.amountInr} (UTR: ${request.utrNumber}) has been approved! ${request.coinsAmount} coins have been added to your wallet.`
      : `Your payment of ₹${request.amountInr} (UTR: ${request.utrNumber}) has been verified! Your ${request.plan} Membership is now active.`;

    await tx.notification.create({
      data: {
        userId: tutorProfile.userId,
        title: notifTitle,
        message: notifMsg,
        type: "ADMIN_ALERT",
        channel: "WEB",
        status: "SENT",
      },
    });
  });

  revalidatePath("/admin/wallets");
  revalidatePath("/tutor/wallet");
  revalidatePath("/tutor/plans");
  revalidatePath("/tutor/dashboard");

  return actionSuccess({ approved: true });
}

/**
 * Admin rejects a manual payment request with a reason.
 */
export async function adminRejectPaymentAction(
  requestId: string,
  rejectionReason: string
): Promise<ActionResult<{ rejected: true }>> {
  const session = await auth();
  if (!session?.user) return actionError("Unauthorized");

  const canManage = can(session.user, "wallets:manage");
  if (!canManage) {
    return actionError("Permission denied: Requires 'wallets:manage' permission.");
  }

  const reason = rejectionReason?.trim() || "Payment verification could not be confirmed with bank/UPI records.";

  const request = await prisma.manualPaymentRequest.findUnique({
    where: { id: requestId },
    include: { tutorProfile: true },
  });

  if (!request) return actionError("Payment request not found.");
  if (request.status !== "PENDING") {
    return actionError(`Request is already ${request.status}.`);
  }

  await prisma.manualPaymentRequest.update({
    where: { id: requestId },
    data: {
      status: "REJECTED",
      rejectionReason: reason,
      reviewedByUserId: session.user.id,
      reviewedAt: new Date(),
    },
  });

  // Notify tutor
  if (request.tutorProfile?.userId) {
    await prisma.notification.create({
      data: {
        userId: request.tutorProfile.userId,
        title: "Payment Verification Notice ⚠️",
        message: `Your payment request of ₹${request.amountInr} (UTR: ${request.utrNumber}) was not approved. Reason: ${reason}. If this is an error, please contact support with your bank statement.`,
        type: "ADMIN_ALERT",
        channel: "WEB",
        status: "SENT",
      },
    });
  }

  revalidatePath("/admin/wallets");
  revalidatePath("/tutor/wallet");
  revalidatePath("/tutor/plans");

  return actionSuccess({ rejected: true });
}
