import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { getSubscriptionPlan, getPriceWithGst, getGstAmount } from "@/lib/subscription-plans";
import { createRazorpayOrder, isRazorpayConfigured } from "@/lib/razorpay";
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

  const { planId, couponCode } = body;
  const plan = getSubscriptionPlan(planId);

  if (!plan) {
    return NextResponse.json({ error: "This plan is not available." }, { status: 400 });
  }

  const tutorProfile = await prisma.tutorProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!tutorProfile) {
    return NextResponse.json({ error: "Tutor profile not found" }, { status: 404 });
  }

  let finalBasePrice = plan.priceInr;
  let appliedCouponId: string | undefined;
  let discountInr = 0;

  if (couponCode && typeof couponCode === "string" && couponCode.trim()) {
    const cleanCode = couponCode.trim().toUpperCase();
    const coupon = await prisma.coupon.findUnique({
      where: { code: cleanCode },
    });
    if (coupon && coupon.isActive && (!coupon.expiresAt || new Date() <= coupon.expiresAt)) {
      if (coupon.usageLimit === null || coupon.usedCount < coupon.usageLimit) {
        if (coupon.discountType === "FLAT") {
          discountInr = Math.round(coupon.discountAmount / 100);
        } else {
          discountInr = Math.round((plan.priceInr * coupon.discountAmount) / 100);
          if (coupon.maxDiscountInr && discountInr * 100 > coupon.maxDiscountInr) {
            discountInr = Math.round(coupon.maxDiscountInr / 100);
          }
        }
        discountInr = Math.min(discountInr, plan.priceInr);
        finalBasePrice = Math.max(1, plan.priceInr - discountInr);
        appliedCouponId = coupon.id;
      }
    }
  }

  const gstAmount = plan.noGst ? 0 : getGstAmount(finalBasePrice);
  const totalPrice = finalBasePrice + gstAmount;
  // Razorpay requires at least 100 paise (₹1)
  const priceInPaise = Math.max(100, Math.round(totalPrice * 100));

  if (isRazorpayConfigured()) {
    try {
      const order = await createRazorpayOrder(priceInPaise, `sub_${tutorProfile.id}_${plan.id}`, {
        tutorProfileId: tutorProfile.id,
        planId: plan.id,
        couponId: appliedCouponId ?? "",
        discountPaise: String(discountInr * 100),
      });

      return NextResponse.json({
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
        keyId: order.keyId,
        baseAmount: finalBasePrice,
        gstAmount,
        totalAmount: totalPrice,
        discountAmount: discountInr,
      });
    } catch (err: any) {
      console.error("[subscribe] Razorpay order creation failed", err);
      return NextResponse.json({ error: "Could not create Razorpay order" }, { status: 500 });
    }
  }

  // Fallback for local/dev only — never emit mock Razorpay keys in production
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Payment gateway is not configured" },
      { status: 503 }
    );
  }

  const mockOrderId = `order_mock_${Date.now()}`;
  return NextResponse.json({
    orderId: mockOrderId,
    amount: priceInPaise,
    currency: "INR",
    keyId: process.env.RAZORPAY_KEY_ID || "rzp_test_mock",
    baseAmount: finalBasePrice,
    gstAmount,
    totalAmount: totalPrice,
    discountAmount: discountInr,
  });
}
