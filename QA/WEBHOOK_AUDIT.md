# ApnaTutorHub / ThinkTutor — Webhook Security & Verification Audit

## Overview
This document details the audit of the Razorpay payment success webhook handler located at `app/api/webhooks/razorpay/route.ts`.

---

## 1. Webhook Authentication & Signature Verification
- **Signature Header**: `x-razorpay-signature`
- **Verification Method**: Timing-safe HMAC SHA-256 computation:
  ```ts
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature, "hex"),
    Buffer.from(expectedSignature, "hex")
  );
  ```
- **Security Check**: Missing signature or secret returns HTTP 400 Bad Request immediately.

---

## 2. Event Payload Processing & Idempotency
- **Handled Event**: `payment.captured`
- **Metadata Extraction**: Reads `tutorProfileId`, `coins`, `packageId`, `couponId`, `discountPaise` from order notes.
- **Transaction Scope**: Executes inside a Prisma `$transaction`:
  1. `creditCoinsToWallet`: Upserts wallet balance and inserts `WalletTransaction`. Idempotent via `@@unique([walletId, referenceId, type])`.
  2. `consumeCouponInTx`: Increments coupon usage count atomically and inserts `CouponUsage`. Protected by `@@unique([couponId, userId])`.
  3. `createNotification`: Sends payment receipt notification to tutor using `User.id`.
