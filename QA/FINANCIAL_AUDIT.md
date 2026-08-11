# ApnaTutorHub / ThinkTutor — Financial & Money Flow Audit Report

## Overview
This document provides a comprehensive audit of all 5 financial modules: Coin Purchases, Coupons, Lead Unlocks, Refunds, and Subscriptions.

---

## 1. Coin Purchase Flow
- **Order Creation**: `createCoinOrderAction` in `app/actions/wallet.actions.ts`. Validates coin package, applies valid coupon discount, creates Razorpay order passing `couponId` and `discountPaise` in order notes.
- **Payment Verification**: `POST /api/webhooks/razorpay` verifies HMAC SHA-256 signature timing-safely. Credits coins inside `$transaction`.
- **Idempotency**: `WalletTransaction` has `@@unique([walletId, referenceId, type])`. Reference ID queries in `creditCoinsToWallet` use `where: { referenceId, type: "PURCHASE" }` to prevent double crediting.

---

## 2. Coupon Consumption & Discount Flow
- **Validation**: `validateCouponAction` in `app/actions/coupon.actions.ts`. Checks active status, expiration date, global usage limits, minimum order value, and user redemption status (`CouponUsage.findFirst({ where: { couponId, userId } })`).
- **Consumption**: `consumeCouponInTx` uses atomic `updateMany` (`where: { id: couponId, isActive: true, usedCount: { lt: usageLimit } }`) and creates `CouponUsage` protected by `@@unique([couponId, userId])` unique constraint. (Fix B3 verified!).

---

## 3. Lead Unlock & Coin Deduction Flow
- **Purchase Action**: `purchaseLeadAction` in `app/actions/leads.actions.ts`.
- **Atomic Balance Guard**:
  ```ts
  const walletUpdate = await tx.wallet.updateMany({
    where: { tutorProfileId, balance: { gte: lead.coinCost } },
    data: { balance: { decrement: lead.coinCost }, totalSpent: { increment: lead.coinCost } },
  });
  if (walletUpdate.count === 0) throw new Error("INSUFFICIENT_COINS");
  ```
- **Capacity Protection**: Atomic `updateMany` on `Lead` ensuring `purchaseCount < maxTutors`. Rejects duplicate tutor purchases via `@@unique([leadId, tutorProfileId])`.

---

## 4. Lead Refund Workflow
- **Request**: `requestLeadRefundAction` in `app/actions/wallet.actions.ts`. Verifies 24-hour refund window and buyer ownership. Creates `REFUND_REQUEST_PENDING` record.
- **Approval**: `approveRefundAction` in `app/actions/admin.actions.ts`. Verified by `wallets:manage` permission. Resolves tutor's `User.id` via `tutorProfile.user.id` to send approval notification safely without FK violation `P2003`. (Fix B2 verified!).

---

## 5. Subscription Activation Workflow
- **Verification Endpoint**: `POST /api/tutor/subscribe/verify`.
- **Security Guards**: Evaluates HMAC signature timing-safely, fetches order from Razorpay, asserts `order.amount === plan.priceInr * 100`, `order.notes.planId === planId`, and `order.notes.tutorProfileId === tutorProfile.id`. Enforces `razorpayPaymentId` DB uniqueness. (Fix B1 verified!).
