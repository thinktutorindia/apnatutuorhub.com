import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { getSubscriptionPlan } from "@/lib/subscription-plans";
import {
  fetchRazorpayOrder,
  isRazorpayConfigured,
  verifyPaymentSignature,
} from "@/lib/razorpay";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { orderId, paymentId, signature, planId } = body ?? {};
  const plan = getSubscriptionPlan(planId);

  if (!plan) {
    return NextResponse.json({ error: "Invalid plan ID" }, { status: 400 });
  }

  const tutorProfile = await prisma.tutorProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!tutorProfile) {
    return NextResponse.json({ error: "Tutor profile not found" }, { status: 404 });
  }

  if (process.env.NODE_ENV === "production" && String(orderId ?? "").startsWith("order_mock_")) {
    return NextResponse.json({ error: "Invalid payment order" }, { status: 400 });
  }

  if (process.env.NODE_ENV === "production" && !isRazorpayConfigured()) {
    return NextResponse.json({ error: "Payment gateway is not configured" }, { status: 503 });
  }

  // ── Payment authenticity (mandatory whenever Razorpay is configured) ──────────
  // Security: never activate a paid plan without cryptographic proof of a captured
  // payment whose ORDER matches this exact plan, amount and tutor. This closes the
  // "POST { planId } with no signature => free plan" bypass.
  if (isRazorpayConfigured() && !orderId?.startsWith("order_mock_")) {
    if (
      typeof orderId !== "string" ||
      typeof paymentId !== "string" ||
      typeof signature !== "string"
    ) {
      return NextResponse.json(
        { error: "Missing payment verification fields" },
        { status: 400 }
      );
    }

    if (!verifyPaymentSignature(orderId, paymentId, signature)) {
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }

    // Bind the order to this plan/amount/tutor so a cheap order can't unlock an
    // expensive plan, and another tutor's order can't be replayed.
    let order: Awaited<ReturnType<typeof fetchRazorpayOrder>>;
    try {
      order = await fetchRazorpayOrder(orderId);
    } catch (err) {
      console.error("[subscribe/verify] Could not fetch order", err);
      return NextResponse.json(
        { error: "Could not verify payment order. Please contact support." },
        { status: 502 }
      );
    }

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 400 });
    }

    const expectedPaise = plan.priceInr * 100;
    if (order.amount !== expectedPaise) {
      return NextResponse.json(
        { error: "Payment amount does not match the selected plan." },
        { status: 400 }
      );
    }
    if (order.notes?.tutorProfileId && order.notes.tutorProfileId !== tutorProfile.id) {
      return NextResponse.json(
        { error: "This payment does not belong to your account." },
        { status: 403 }
      );
    }
    if (order.notes?.planId && order.notes.planId.toUpperCase() !== plan.id) {
      return NextResponse.json(
        { error: "Payment plan mismatch." },
        { status: 400 }
      );
    }
  }

  // ── Idempotency — a captured payment can only ever activate one subscription ───
  if (paymentId) {
    const existing = await prisma.tutorSubscription.findFirst({
      where: { razorpayPaymentId: paymentId },
      select: { id: true, plan: true, endDate: true },
    });
    if (existing) {
      return NextResponse.json({
        success: true,
        plan: existing.plan,
        expiresAt: existing.endDate.toISOString(),
        duplicate: true,
      });
    }
  }

  // Calculate validity from plan config (Bronze: 30d, Silver: 60d, Gold: 60d, Platinum: 90d)
  const now = new Date();
  const validityDays = plan.validityDays || 30;
  const expiresAt = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000);

  // Activate Subscription in DB with Bonus Coins (Gold: +50 coins, Platinum: +100 coins)
  const bonusCoins = plan.id === "PLATINUM" ? 100 : plan.id === "GOLD" ? 50 : 0;

  await prisma.$transaction(async (tx) => {
    await tx.tutorProfile.update({
      where: { id: tutorProfile.id },
      data: {
        subscriptionPlan: plan.id as any,
        subscriptionExpiresAt: expiresAt,
        leadsUsedThisMonth: 0,
        leadsResetAt: now,
      },
    });

    await tx.tutorSubscription.create({
      data: {
        tutorProfileId: tutorProfile.id,
        plan: plan.id as any,
        priceInr: plan.priceInr,
        razorpayOrderId: orderId ?? null,
        razorpayPaymentId: paymentId ?? null,
        startDate: now,
        endDate: expiresAt,
        isActive: true,
      },
    });

    if (bonusCoins > 0) {
      const wallet = await tx.wallet.upsert({
        where: { tutorProfileId: tutorProfile.id },
        create: { tutorProfileId: tutorProfile.id, balance: bonusCoins },
        update: { balance: { increment: bonusCoins } },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          amount: bonusCoins,
          balanceAfter: wallet.balance,
          type: "BONUS",
          description: `🎁 Bonus ${bonusCoins} coins included with ${plan.name}`,
          referenceId: paymentId || orderId || `bonus_sub_${Date.now()}`,
        },
      });
    }
  });

  return NextResponse.json({
    success: true,
    plan: plan.id,
    expiresAt: expiresAt.toISOString(),
  });
}
