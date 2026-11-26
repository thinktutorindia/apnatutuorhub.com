import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import {
  COMMISSION_PLAN,
  getSubscriptionPlan,
  getPriceWithGst,
  getGstAmount,
} from "@/lib/subscription-plans";
import { creditPlanCoinsIfAbsent } from "@/lib/plan-credit";
import {
  fetchRazorpayOrder,
  isRazorpayConfigured,
  verifyPaymentSignature,
} from "@/lib/razorpay";
import { prisma } from "@/lib/prisma";
import { consumeCouponInTx } from "@/app/actions/coupon.actions";

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

  let verifiedOrder: Awaited<ReturnType<typeof fetchRazorpayOrder>> | null = null;

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
    try {
      verifiedOrder = await fetchRazorpayOrder(orderId);
    } catch (err) {
      console.error("[subscribe/verify] Could not fetch order", err);
      return NextResponse.json(
        { error: "Could not verify payment order. Please contact support." },
        { status: 502 }
      );
    }

    if (!verifiedOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 400 });
    }

    const discountPaise = Number(verifiedOrder.notes?.discountPaise ?? "0") || 0;
    const discountInr = Math.min(plan.priceInr, Math.round(discountPaise / 100));
    const finalBasePrice = Math.max(1, plan.priceInr - discountInr);
    const gstAmountInr = plan.noGst ? 0 : getGstAmount(finalBasePrice);
    const totalPriceInr = finalBasePrice + gstAmountInr;
    const expectedPaise = Math.max(100, Math.round(totalPriceInr * 100));

    if (verifiedOrder.amount !== expectedPaise) {
      return NextResponse.json(
        { error: "Payment amount does not match the selected plan." },
        { status: 400 }
      );
    }
    if (verifiedOrder.notes?.tutorProfileId && verifiedOrder.notes.tutorProfileId !== tutorProfile.id) {
      return NextResponse.json(
        { error: "This payment does not belong to your account." },
        { status: 403 }
      );
    }
    if (verifiedOrder.notes?.planId && verifiedOrder.notes.planId.toUpperCase() !== plan.id) {
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

  // Activate subscription. Coin credit is delegated to the idempotent helper.
  // ₹1,257 Commission plan always credits exactly 60 coins (single source of truth).
  const isStarterPass = plan.id === COMMISSION_PLAN.id;

  await prisma.$transaction(async (tx) => {
    // If order has a coupon attached, consume it atomically
    const couponId = verifiedOrder?.notes?.couponId;
    const discountPaise = Number(verifiedOrder?.notes?.discountPaise ?? "0") || 0;
    if (couponId) {
      try {
        await consumeCouponInTx(tx, {
          couponId: String(couponId),
          userId: session.user.id,
          orderId: paymentId || orderId,
          discountPaise,
        });
      } catch (err) {
        console.warn("[subscribe/verify] Coupon consumption skipped or already used:", err);
      }
    }

    await tx.tutorProfile.update({
      where: { id: tutorProfile.id },
      data: {
        subscriptionPlan: plan.id as any,
        subscriptionExpiresAt: expiresAt,
        leadsUsedThisMonth: 0,
        leadsResetAt: now,
        // For starter pass, mark canTopup=false (no top-up allowed on festival starter)
        ...(isStarterPass && { canTopup: false }),
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

    await creditPlanCoinsIfAbsent(tx, {
      tutorProfileId: tutorProfile.id,
      planId: plan.id,
      paymentId: paymentId || orderId || `plan_credit_${tutorProfile.id}_${now.getTime()}`,
      planName: plan.name,
      source: "subscribe/verify",
    });
  });

  revalidatePath("/tutor/leads");
  revalidatePath("/tutor/plans");
  revalidatePath("/tutor/wallet");
  revalidatePath("/tutor/dashboard");

  return NextResponse.json({
    success: true,
    plan: plan.id,
    expiresAt: expiresAt.toISOString(),
  });
}
