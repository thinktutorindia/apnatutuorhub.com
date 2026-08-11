# ApnaTutorHub / ThinkTutor — Concurrency & Race Condition Audit Report

## Overview
This document analyzes operations vulnerable to race conditions and concurrent requests across lead purchases, wallet deductions, coupon redemptions, and payment webhooks.

---

## 1. Lead Unlock Concurrency (`purchaseLeadAction`)
- **Vulnerability**: Two tutors clicking "Unlock Contact" simultaneously on a lead with 1 spot remaining or low wallet balance.
- **Protection**:
  - **Wallet Balance Guard**: Uses atomic `tx.wallet.updateMany({ where: { tutorProfileId, balance: { gte: lead.coinCost } }, data: { balance: { decrement: lead.coinCost } } })`. If 0 rows are updated, transaction rolls back immediately.
  - **Lead Capacity Guard**: Uses atomic `tx.lead.updateMany({ where: { id: leadId, purchaseCount: { lt: lead.maxTutors } }, data: { purchaseCount: { increment: 1 } } })`.
  - **Duplicate Purchase Guard**: `LeadPurchase` table has `@@unique([leadId, tutorProfileId])`, throwing P2002 on duplicate unlock attempts.

---

## 2. Coupon Redemption Concurrency (`consumeCouponInTx`)
- **Vulnerability**: Simultaneous redemption of a coupon with 1 remaining global usage.
- **Protection**: Uses atomic `tx.coupon.updateMany({ where: { id: couponId, isActive: true, usedCount: { lt: usageLimit } }, data: { usedCount: { increment: 1 } } })`. Also protected by `@@unique([couponId, userId])` unique constraint on `CouponUsage`. (Fix B3 verified!).

---

## 3. Webhook Replay & Duplicate Payment Concurrency (`POST /api/webhooks/razorpay`)
- **Vulnerability**: Duplicate Razorpay webhook payloads delivered in parallel.
- **Protection**: `WalletTransaction` has `@@unique([walletId, referenceId, type])`. Reference ID lookup in `creditCoinsToWallet` filters by `type: "PURCHASE"`. Duplicate attempts throw P2002 or return existing wallet balance safely without double crediting.

---

## 4. Refund Processing Concurrency (`approveRefundAction`)
- **Vulnerability**: Two admins clicking "Approve Refund" simultaneously.
- **Protection**: Status check `where: { id: txId, description: "REFUND_REQUEST_PENDING" }` inside `$transaction`. Second attempt finds updated description `REFUND_APPROVED` and aborts safely.
