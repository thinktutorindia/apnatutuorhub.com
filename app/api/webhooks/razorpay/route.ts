import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifyWebhookSignature,
  COIN_PACKAGES,
} from "@/lib/razorpay";
import { creditCoinsToWallet } from "@/app/actions/wallet.actions";
import { consumeCouponInTx } from "@/app/actions/coupon.actions";

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

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const event = payload.event as string | undefined;

  // ── 2. Handle payment.captured ────────────────────────────────────────────
  if (event !== "payment.captured") {
    // Other events (e.g. refund, dispute) handled in Phase 9 Admin
    return NextResponse.json({ received: true });
  }

  const paymentEntity = (
    (payload.payload as Record<string, unknown>)?.payment as Record<string, unknown>
  )?.entity as Record<string, unknown> | undefined;

  if (!paymentEntity) {
    return NextResponse.json({ error: "Missing payment entity" }, { status: 400 });
  }

  const orderId = paymentEntity.order_id as string | undefined;
  const paymentId = paymentEntity.id as string | undefined;
  const amountPaise = paymentEntity.amount as number | undefined;

  if (!orderId || !paymentId || !amountPaise) {
    return NextResponse.json({ error: "Incomplete payment data" }, { status: 400 });
  }

  // ── 3. Idempotency — skip if already processed ─────────────────────────────
  const alreadyProcessed = await prisma.walletTransaction.findFirst({
    where: { referenceId: paymentId },
  });

  if (alreadyProcessed) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  // ── 4. Match package by notes or amount ───────────────────────────────────
  const notes = paymentEntity.notes as Record<string, string> | undefined;
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
