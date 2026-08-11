import assert from "node:assert";
import crypto from "node:crypto";

/**
 * Isolated test of Subscription Payment Verification logic (B1 Fix).
 */
function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string
): boolean {
  if (!orderId || !paymentId || !signature || !secret) return false;
  const body = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSignature, "hex")
    );
  } catch {
    return false;
  }
}

type MockRazorpayOrder = {
  id: string;
  amount: number; // in paise
  notes: {
    tutorProfileId?: string;
    planId?: string;
  };
};

function validateSubscriptionOrder(
  order: MockRazorpayOrder,
  expectedPlanPriceInr: number,
  expectedPlanId: string,
  expectedTutorProfileId: string
): { ok: boolean; reason?: string } {
  const expectedAmountPaise = expectedPlanPriceInr * 100;
  if (order.amount !== expectedAmountPaise) {
    return { ok: false, reason: `Amount mismatch: expected ${expectedAmountPaise}, got ${order.amount}` };
  }
  if (order.notes.planId !== expectedPlanId) {
    return { ok: false, reason: `Plan ID mismatch: expected ${expectedPlanId}, got ${order.notes.planId}` };
  }
  if (order.notes.tutorProfileId !== expectedTutorProfileId) {
    return { ok: false, reason: `Tutor ID mismatch: expected ${expectedTutorProfileId}, got ${order.notes.tutorProfileId}` };
  }
  return { ok: true };
}

console.log("🧪 Running Razorpay Subscription Verification (B1) Mock Tests...");

const secret = "razorpay_secret_key_999";
const orderId = "order_SUBS123456";
const paymentId = "pay_SUBS987654";
const tutorProfileId = "cm001tutorprofileid";
const planId = "PLATINUM";
const planPriceInr = 24000;

// Valid signature
const validSignature = crypto
  .createHmac("sha256", secret)
  .update(`${orderId}|${paymentId}`)
  .digest("hex");

// Test 1: Valid subscription payment passes HMAC & Order validation
const validOrder: MockRazorpayOrder = {
  id: orderId,
  amount: 2400000, // ₹24,000 in paise
  notes: { tutorProfileId, planId },
};

assert.strictEqual(
  verifyPaymentSignature(orderId, paymentId, validSignature, secret),
  true,
  "HMAC verification must succeed for valid signature"
);

const validRes = validateSubscriptionOrder(validOrder, planPriceInr, planId, tutorProfileId);
assert.strictEqual(validRes.ok, true, "Valid order must pass subscription validation");

// Test 2: Amount Mismatch Attack (Paying ₹999 BRONZE price to unlock ₹24,000 PLATINUM plan)
const tamperedOrderBronze: MockRazorpayOrder = {
  id: orderId,
  amount: 99900, // Only ₹999 paid!
  notes: { tutorProfileId, planId },
};

const bronzeRes = validateSubscriptionOrder(tamperedOrderBronze, planPriceInr, planId, tutorProfileId);
assert.strictEqual(bronzeRes.ok, false, "BRONZE amount must fail PLATINUM verification");
assert.strictEqual(bronzeRes.reason?.includes("Amount mismatch"), true, "Reason must indicate amount mismatch");

// Test 3: Plan ID Mismatch Attack
const tamperedOrderPlan: MockRazorpayOrder = {
  id: orderId,
  amount: 2400000,
  notes: { tutorProfileId, planId: "SILVER" },
};
const planRes = validateSubscriptionOrder(tamperedOrderPlan, planPriceInr, planId, tutorProfileId);
assert.strictEqual(planRes.ok, false, "Plan ID mismatch must fail verification");

// Test 4: Cross-Account Replay Attack (Tutor B replaying Tutor A's order)
const tamperedOrderTutor: MockRazorpayOrder = {
  id: orderId,
  amount: 2400000,
  notes: { tutorProfileId: "cm002tutorB", planId },
};
const tutorRes = validateSubscriptionOrder(tamperedOrderTutor, planPriceInr, planId, tutorProfileId);
assert.strictEqual(tutorRes.ok, false, "Cross-account tutor ID mismatch must fail verification");

console.log("✅ Razorpay Subscription Verification (B1) Mock Tests PASSED (4/4)\n");
