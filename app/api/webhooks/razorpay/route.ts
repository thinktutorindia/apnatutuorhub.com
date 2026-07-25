import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifyWebhookSignature,
  COIN_PACKAGES,
} from "@/lib/razorpay";
import { creditCoinsToWallet } from "@/app/actions/wallet.actions";

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

  // ── 4. Match package by amount ─────────────────────────────────────────────
  const pkg = COIN_PACKAGES.find((p) => p.priceInPaise === amountPaise);

  if (!pkg) {
    console.error("[razorpay-webhook] Unknown amount", { amountPaise, orderId });
    return NextResponse.json({ error: "Unknown package amount" }, { status: 400 });
  }

  // ── 5. Find the tutor via order receipt prefix ─────────────────────────────
  // Receipt format: coins_{tutorProfileId}_{timestamp}
  // We look up the latest pending order with matching orderId — or fall back to
  // receipt parsing once Razorpay returns the receipt on the payment entity.

  const notes = paymentEntity.notes as Record<string, string> | undefined;
  const tutorProfileIdFromNotes = notes?.tutorProfileId;

  // Fallback: scan recent wallet transactions for the order (Phase 9 adds notes)
  let tutorProfileId = tutorProfileIdFromNotes;

  if (!tutorProfileId) {
    // Parse from description if we stored orderId in a temp lookup.
    // For now, check all wallet objects where we stored the orderId in referenceId.
    const tempTx = await prisma.walletTransaction.findFirst({
      where: { referenceId: orderId, amount: 0 },
      select: { wallet: { select: { tutorProfileId: true } } },
    });
    tutorProfileId = tempTx?.wallet?.tutorProfileId;
  }

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

  console.info("[razorpay-webhook] Credited coins", {
    tutorProfileId,
    coins: pkg.totalCoins,
    paymentId,
  });

  return NextResponse.json({ received: true, credited: pkg.totalCoins });
}
