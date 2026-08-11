import assert from "node:assert";

type Coupon = {
  id: string;
  code: string;
  discountType: "PERCENTAGE" | "FLAT";
  discountAmount: number; // percentage (e.g. 20 for 20%) or flat in paise (e.g. 10000 = ₹100)
  maxDiscountInr?: number | null; // max discount cap in paise
  minOrderInr?: number | null; // min order in paise
  usageLimit?: number | null;
  usedCount: number;
  expiresAt?: Date | null;
  isActive: boolean;
};

function calculateCouponDiscount(
  coupon: Coupon,
  orderAmountPaise: number,
  userUsageCount: number
): { valid: boolean; discountPaise: number; reason?: string } {
  if (!coupon.isActive) return { valid: false, discountPaise: 0, reason: "Coupon is inactive" };
  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    return { valid: false, discountPaise: 0, reason: "Coupon has expired" };
  }
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    return { valid: false, discountPaise: 0, reason: "Coupon global usage limit reached" };
  }
  if (userUsageCount >= 1) {
    return { valid: false, discountPaise: 0, reason: "Coupon already used by user" };
  }
  if (coupon.minOrderInr != null && orderAmountPaise < coupon.minOrderInr) {
    return { valid: false, discountPaise: 0, reason: "Minimum order value not met" };
  }

  let discountPaise = 0;
  if (coupon.discountType === "FLAT") {
    discountPaise = Math.min(coupon.discountAmount, orderAmountPaise);
  } else {
    // PERCENTAGE
    discountPaise = Math.round((orderAmountPaise * coupon.discountAmount) / 100);
    if (coupon.maxDiscountInr != null) {
      discountPaise = Math.min(discountPaise, coupon.maxDiscountInr);
    }
  }

  return { valid: true, discountPaise };
}

console.log("🧪 Running Coupon Discount & Validation (B3) Unit Tests...");

// Test 1: Flat discount calculation
const flatCoupon: Coupon = {
  id: "c1",
  code: "FLAT100",
  discountType: "FLAT",
  discountAmount: 10000, // ₹100 in paise
  usedCount: 0,
  isActive: true,
};
const res1 = calculateCouponDiscount(flatCoupon, 50000, 0); // ₹500 order
assert.strictEqual(res1.valid, true);
assert.strictEqual(res1.discountPaise, 10000, "Flat ₹100 discount applied");

// Test 2: Percentage discount with max cap
const percCoupon: Coupon = {
  id: "c2",
  code: "FIFTYOFF",
  discountType: "PERCENTAGE",
  discountAmount: 50, // 50%
  maxDiscountInr: 20000, // Max ₹200 cap in paise
  usedCount: 0,
  isActive: true,
};
const res2 = calculateCouponDiscount(percCoupon, 100000, 0); // ₹1000 order (50% = ₹500, capped at ₹200)
assert.strictEqual(res2.valid, true);
assert.strictEqual(res2.discountPaise, 20000, "Percentage discount capped at max ₹200");

// Test 3: Expiry validation
const expiredCoupon: Coupon = {
  ...flatCoupon,
  expiresAt: new Date(Date.now() - 10000), // expired 10s ago
};
const res3 = calculateCouponDiscount(expiredCoupon, 50000, 0);
assert.strictEqual(res3.valid, false);
assert.strictEqual(res3.reason, "Coupon has expired");

// Test 4: One-per-user restriction
const res4 = calculateCouponDiscount(flatCoupon, 50000, 1); // User already used once
assert.strictEqual(res4.valid, false);
assert.strictEqual(res4.reason, "Coupon already used by user");

// Test 5: Global usage limit restriction
const exhaustedCoupon: Coupon = {
  ...flatCoupon,
  usageLimit: 10,
  usedCount: 10,
};
const res5 = calculateCouponDiscount(exhaustedCoupon, 50000, 0);
assert.strictEqual(res5.valid, false);
assert.strictEqual(res5.reason, "Coupon global usage limit reached");

console.log("✅ Coupon Discount & Validation (B3) Unit Tests PASSED (5/5)\n");
