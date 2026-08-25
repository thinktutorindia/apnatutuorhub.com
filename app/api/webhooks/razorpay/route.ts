import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifyWebhookSignature,
  COIN_PACKAGES,
} from "@/lib/razorpay";
import { creditCoinsToWallet } from "@/app/actions/wallet.actions";
import { consumeCouponInTx } from "@/app/actions/coupon.actions";
import { getSubscriptionPlan } from "@/lib/subscription-plans";

// POST /api/webhooks/razorpay
// Called by Razorpay after a successful payment (payment.captured event).
// IMPORTANT: bodyParser must be disabled — we need raw bytes for HMAC validation.
export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("x-razorpay-signature") ?? "";

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ error: "Failed to read body" }, { status: 400 });
  }

  // ── 1. Verify signature ────────────────────────────────────────────────────
  if (!verifyWebhookSignature(rawBody, signature)) {
    console.warn("[razorpay-webhook] Invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Only handle captured payments
  const event = payload.event;
  if (event !== "payment.captured") {
    // Acknowledge other events (e.g. payment.failed, order.paid) without action
    return NextResponse.json({ received: true });
  }

  const paymentEntity = payload?.payload?.payment?.entity;
  if (!paymentEntity) {
    return NextResponse.json({ error: "Missing payment entity" }, { status: 400 });
  }

  const paymentId = paymentEntity.id as string;
  const amountPaise = paymentEntity.amount as number;
  const orderId = paymentEntity.order_id as string;

  // ── 2. Guard against test/mock payments on production ───────────────────────
  if (!paymentId || paymentId.startsWith("pay_mock_")) {
    return NextResponse.json({ error: "Mock payment not allowed" }, { status: 400 });
  }

  const notes = paymentEntity.notes as Record<string, string> | undefined;

  // ── 3. Check for Subscription Plan Purchase ─────────────────────────────────
  const planIdFromNotes = notes?.planId;
  if (planIdFromNotes) {
    const plan = getSubscriptionPlan(planIdFromNotes);
    if (!plan) {
      console.error("[razorpay-webhook] Unknown subscription plan", { planIdFromNotes, orderId });
      return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
    }

    const tutorProfileId = notes?.tutorProfileId;
    if (!tutorProfileId) {
      console.error("[razorpay-webhook] Cannot resolve tutor for subscription order", { orderId });
      return NextResponse.json({ error: "Cannot resolve tutor profile" }, { status: 400 });
    }

    // Idempotency: check if subscription was already activated
    const existingSub = await prisma.tutorSubscription.findFirst({
      where: { razorpayPaymentId: paymentId },
    });

    if (existingSub) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    const now = new Date();
    const validityDays = plan.validityDays || 30;
    const expiresAt = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000);

    const bonusCoins = plan.id === "PLATINUM" ? 100 : plan.id === "GOLD" ? 50 : 0;

    await prisma.$transaction(async (tx) => {
      await tx.tutorProfile.update({
        where: { id: tutorProfileId },
        data: {
          subscriptionPlan: plan.id as any,
          subscriptionExpiresAt: expiresAt,
          leadsUsedThisMonth: 0,
          leadsResetAt: now,
        },
      });

      await tx.tutorSubscription.create({
        data: {
          tutorProfileId,
          plan: plan.id as any,
          priceInr: plan.priceInr,
          razorpayOrderId: orderId ?? null,
          razorpayPaymentId: paymentId,
          startDate: now,
          endDate: expiresAt,
          isActive: true,
        },
      });

      if (bonusCoins > 0) {
        const wallet = await tx.wallet.upsert({
          where: { tutorProfileId },
          create: { tutorProfileId, balance: bonusCoins },
          update: { balance: { increment: bonusCoins } },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            amount: bonusCoins,
            type: "CREDIT",
            description: `🎁 Bonus ${bonusCoins} coins included with ${plan.name}`,
            referenceId: paymentId || orderId || `bonus_sub_${Date.now()}`,
          },
        });
      }
    });

    console.info("[razorpay-webhook] Activated tutor subscription via webhook", {
      tutorProfileId,
      plan: plan.id,
      paymentId,
    });

    return NextResponse.json({ received: true, subscription: plan.id });
  }

  // ── 4. Idempotency for Coin Package — skip if already processed ────────────
  const alreadyProcessed = await prisma.walletTransaction.findFirst({
    where: { referenceId: paymentId },
  });

  if (alreadyProcessed) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  // ── 5. Match coin package by notes or amount ───────────────────────────────
  const packageIdFromNotes = notes?.packageId;
  const pkg =
    (packageIdFromNotes ? COIN_PACKAGES.find((p) => p.id === packageIdFromNotes) : null) ??
    COIN_PACKAGES.find((p) => p.priceInPaise === amountPaise);

  if (!pkg) {
    console.error("[razorpay-webhook] Unknown package", { packageIdFromNotes, amountPaise, orderId });
    return NextResponse.json({ error: "Unknown package amount" }, { status: 400 });
  }

  // ── 5. Resolve tutor profile ──────────────────────────────────────────────
  const tutorProfileId = notes?.tutorProfileId;

  if (!tutorProfileId) {
    console.error("[razorpay-webhook] Cannot resolve tutor for order", { orderId });
    return NextResponse.json(
      { error: "Cannot resolve tutor profile" },
      { status: 400 }
    );
  }

  // ── 6. Credit coins atomically ────────────────────────────────────────────
  const result = await creditCoinsToWallet(
    tutorProfileId,
    pkg.totalCoins,
    `${pkg.name} top-up (+${pkg.bonusCoins > 0 ? pkg.bonusCoins + " bonus" : ""} coins)`,
    paymentId
  );

  if (!result.success) {
    console.error("[razorpay-webhook] creditCoinsToWallet failed", result);
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  // ── 7. Consume the coupon (if any) exactly once ────────────────────────────
  // Enforces per-user (@@unique([couponId, userId])) and global usage limits.
  // Failure here must NOT fail the webhook — coins are already credited.
  const couponId = notes?.couponId;
  if (couponId) {
    try {
      const tutor = await prisma.tutorProfile.findUnique({
        where: { id: tutorProfileId },
        select: { userId: true },
      });
      if (tutor?.userId) {
        const discountPaise = Number(notes?.discountPaise ?? "0") || 0;
        await prisma.$transaction((tx) =>
          consumeCouponInTx(tx, {
            couponId,
            userId: tutor.userId,
            orderId: paymentId,
            discountPaise,
          })
        );
      }
    } catch (err) {
      console.error("[razorpay-webhook] coupon consumption failed", { couponId, paymentId, err });
    }
  }

  console.info("[razorpay-webhook] Credited coins", {
    tutorProfileId,
    coins: pkg.totalCoins,
    paymentId,
  });

  return NextResponse.json({ received: true, credited: pkg.totalCoins });
}
