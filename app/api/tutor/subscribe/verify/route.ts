import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { getSubscriptionPlan } from "@/lib/subscription-plans";
import { verifyPaymentSignature } from "@/lib/razorpay";
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

  const { orderId, paymentId, signature, planId } = body;
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

  // Verify signature if Razorpay is configured
  if (process.env.RAZORPAY_KEY_SECRET && signature) {
    const isValid = verifyPaymentSignature(orderId, paymentId, signature);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }
  }

  // Calculate 1 year expiration date
  const now = new Date();
  const expiresAt = new Date();
  expiresAt.setFullYear(now.getFullYear() + 1);

  // Activate Subscription in DB
  await prisma.$transaction([
    prisma.tutorProfile.update({
      where: { id: tutorProfile.id },
      data: {
        subscriptionPlan: plan.id as any,
        subscriptionExpiresAt: expiresAt,
        leadsUsedThisMonth: 0,
        leadsResetAt: now,
      },
    }),
    prisma.tutorSubscription.create({
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
    }),
  ]);

  return NextResponse.json({
    success: true,
    plan: plan.id,
    expiresAt: expiresAt.toISOString(),
  });
}
