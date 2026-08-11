import assert from "node:assert";
import crypto from "node:crypto";

/**
 * Isolated unit test for Razorpay HMAC SHA-256 payment signature verification.
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

console.log("🧪 Running HMAC Signature Verification Unit Tests...");

const secret = "test_razorpay_secret_key_123";
const orderId = "order_N123456789";
const paymentId = "pay_P987654321";

// Generate valid signature
const validBody = `${orderId}|${paymentId}`;
const validSignature = crypto
  .createHmac("sha256", secret)
  .update(validBody)
  .digest("hex");

// Test 1: Valid signature passes
assert.strictEqual(
  verifyPaymentSignature(orderId, paymentId, validSignature, secret),
  true,
  "Valid signature must return true"
);

// Test 2: Tampered payment ID fails
const tamperedPaymentId = "pay_P987654322";
assert.strictEqual(
  verifyPaymentSignature(orderId, tamperedPaymentId, validSignature, secret),
  false,
  "Tampered payment ID must return false"
);

// Test 3: Tampered signature fails
const tamperedSignature =
  validSignature.slice(0, -1) + (validSignature.endsWith("0") ? "1" : "0");
assert.strictEqual(
  verifyPaymentSignature(orderId, paymentId, tamperedSignature, secret),
  false,
  "Tampered signature must return false"
);

// Test 4: Missing parameters fail
assert.strictEqual(
  verifyPaymentSignature("", paymentId, validSignature, secret),
  false,
  "Empty orderId must return false"
);

console.log("✅ HMAC Signature Verification Unit Tests PASSED (4/4)\n");
