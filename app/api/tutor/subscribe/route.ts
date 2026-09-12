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

  const { planId } = body;
  const plan = getSubscriptionPlan(planId);

  if (!plan) {
    return NextResponse.json({ error: "Invalid subscription plan ID" }, { status: 400 });
  }

  const tutorProfile = await prisma.tutorProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!tutorProfile) {
    return NextResponse.json({ error: "Tutor profile not found" }, { status: 404 });
  }

  // STARTER (₹99 festival pass) is GST-exempt; all other plans attract 18% GST
  const basePrice = plan.priceInr;
  const gstAmount = plan.noGst ? 0 : getGstAmount(basePrice);
  const totalPrice = basePrice + gstAmount;
  const priceInPaise = totalPrice * 100;

  if (isRazorpayConfigured()) {
    try {
      const order = await createRazorpayOrder(priceInPaise, `sub_${tutorProfile.id}_${plan.id}`, {
        tutorProfileId: tutorProfile.id,
        planId: plan.id,
      });

      return NextResponse.json({
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
        keyId: order.keyId,
        baseAmount: basePrice,
        gstAmount,
        totalAmount: totalPrice,
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
    baseAmount: basePrice,
    gstAmount,
    totalAmount: totalPrice,
  });
}
