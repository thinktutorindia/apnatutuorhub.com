# ApnaTutorHub / ThinkTutor — Financial & Money Flow Audit

## Overview
This document details the end-to-end static audit of all 5 financial workflows: Coin Purchase, Coupon Purchase, Lead Purchase, Lead Refund, and Subscription Verification.

---

## 1. Coin Purchase Flow

```text
Tutor UI -> createCoinOrderAction -> Razorpay Order API -> Payment Execution -> Razorpay Webhook (payment.captured) -> creditCoinsToWallet -> Wallet Transaction -> Notification
```

- **Order Creation (`createCoinOrderAction`)**:
  - Validates `CoinPackage.id`. If a coupon code is supplied, calls `validateCouponAction`.
  - Calculates net price in paise (`finalAmountInr * 100`).
  - Creates Razorpay order passing `couponId` and `discountPaise` in order notes.
- **Payment Success Webhook (`POST /api/webhooks/razorpay`)**:
  - Verifies timing-safe HMAC SHA-256 signature using `RAZORPAY_WEBHOOK_SECRET`.
  - Extracts `payment.captured` payload and order notes (`tutorProfileId`, `coins`, `packageId`, `couponId`).
  - Invokes `creditCoinsToWallet` inside a Prisma `$transaction`.
- **Atomicity & Idempotency Audit**:
  - `WalletTransaction` has `@@unique([walletId, referenceId, type])`.
  - If a duplicate webhook payload arrives with the same `paymentId`, `WalletTransaction.create` throws a unique constraint error `P2002` or checks existing records, preventing duplicate coin credits.

---

## 2. Coupon Purchase & Consumption Flow

```text
Coupon Validation -> Discount Calculation -> Order Notes Persistence -> Payment Webhook -> consumeCouponInTx -> CouponUsage Insert
```

- **Validation (`validateCouponAction`)**:
  - Validates `Coupon.isActive === true`, `expiresAt >= now`, `usedCount < usageLimit`, `minOrderInr` threshold.
  - Checks `CouponUsage.findFirst({ where: { couponId, userId } })` to enforce 1 coupon per user.
- **Consumption (`consumeCouponInTx`)**:
  - Executed inside the payment success transaction.
  - Performs atomic capacity check: `tx.coupon.updateMany({ where: { id: couponId, isActive: true, usedCount: { lt: usageLimit } }, data: { usedCount: { increment: 1 } } })`.
  - Creates `CouponUsage` record protected by `@@unique([couponId, userId])`.
  - Catches `P2002` unique constraint failure to handle race conditions safely without double redemptions. (Fix B3 verified!).

---

## 3. Lead Purchase Flow (Coin Deduction)

```text
Tutor Feed -> purchaseLeadAction -> Balance & Capacity Check -> Atomic updateMany Balance Deduction -> LeadPurchase Insert -> Parent Notification
```

- **Lead Purchase (`purchaseLeadAction`)**:
  - Checks lead status (`LeadStatus.ACTIVE`), capacity (`purchaseCount < maxTutors`), and prior purchase (`@@unique([leadId, tutorProfileId])`).
  - **Atomic Balance Deduction**:
    ```ts
    const updated = await tx.wallet.updateMany({
      where: { id: wallet.id, balance: { gte: lead.coinCost } },
      data: {
        balance: { decrement: lead.coinCost },
        totalSpent: { increment: lead.coinCost },
      },
    });
    if (updated.count === 0) return actionError("Insufficient coin balance.");
    ```
- **Atomicity & Concurrency Audit**:
  - Conditional `updateMany` with `balance: { gte: lead.coinCost }` ensures that two concurrent lead unlock requests cannot drive the wallet balance negative.
  - `LeadPurchase` model has `@@unique([leadId, tutorProfileId])`, preventing double purchases of the same lead by the same tutor.

---

## 4. Lead Refund Flow

```text
Tutor Wallet -> requestLeadRefundAction (PENDING) -> Admin Panel -> approveRefundAction / rejectRefundAction -> Wallet Credit -> User Notification -> Audit Log
```

- **Refund Request (`requestLeadRefundAction`)**:
  - Verifies lead purchase ownership and 24-hour refund window.
  - Logs `WalletTransaction` with `type: "REFUND"`, `description: "REFUND_REQUEST_PENDING"`, and `amount: 0`.
- **Refund Approval (`approveRefundAction`)**:
  - Verifies permission `wallets:manage`.
  - Checks transaction state (`description === "REFUND_REQUEST_PENDING"`).
  - Resolves `tutorUserId = txRecord.wallet.tutorProfile?.userId` (Fix B2 verified!).
  - Executes inside `$transaction`:
    1. `tx.wallet.update` -> Credits coins (`balance + txRecord.amount`).
    2. `tx.walletTransaction.update` -> Updates description to `REFUND_APPROVED`.
    3. `tx.notification.create` -> Inserts notification for `tutorUserId`.
    4. `tx.auditLog.create` -> Logs admin audit record.

---

## 5. Subscription Verification & Activation Flow

```text
Tutor Plans -> Checkout Order -> Payment Verification (POST /api/tutor/subscribe/verify) -> HMAC Timing-Safe Verification -> Razorpay Order Fetch -> Amount & Tutor Match -> Subscription Activation
```

- **Verification Handler (`app/api/tutor/subscribe/verify/route.ts`)**:
  - Evaluates HMAC signature: `verifyPaymentSignature(orderId, paymentId, signature)` (Fix B1 verified!).
  - Fetches Razorpay order details and asserts:
    - `order.amount === plan.priceInr * 100` (prevents paying for BRONZE to unlock PLATINUM).
    - `order.notes.tutorProfileId === tutorProfile.id` (prevents cross-account order replay).
    - `order.notes.planId === plan.id` (prevents plan ID mismatch).
  - Enforces `razorpayPaymentId` uniqueness in DB `TutorSubscription` to ensure duplicate payments return `{ duplicate: true }` without altering expiration dates or resetting monthly counters.
