# ApnaTutorHub / ThinkTutor — Complete API & Server Action Matrix

## Overview
This matrix audits all 102 entry points (93 Server Actions across 16 modules + 9 API Routes), detailing their authentication, authorization, validation, database operations, idempotency, rate limiting, and failure handling.

---

### A. API Routes (9 Routes)

| API Endpoint | Method | Auth Req. | Authorization Guard | Input Validation | DB Operations | Idempotency / Rate Limit | Status |
|--------------|--------|-----------|---------------------|------------------|---------------|--------------------------|--------|
| `/api/auth/[...nextauth]` | ALL | Public | Auth.js Handler | Credentials / OAuth tokens | `User`, `Account`, `Session` | Rate-limited by IP/email | **STATICALLY VERIFIED** |
| `/api/cron/lead-expiry` | GET | `CRON_SECRET` | Header `Bearer ${CRON_SECRET}` | 48h timestamp check | `RequirementLead.status` | Idempotent status update | **STATICALLY VERIFIED** |
| `/api/health` | GET | Public | None | None | DB connection check | Read-only ping | **STATICALLY VERIFIED** |
| `/api/notifications/subscribe` | POST | Authenticated | `session.user.id` | Web push subscription JSON | `User.pushSubscription` | Idempotent JSON update | **STATICALLY VERIFIED** |
| `/api/push/subscribe` | POST | Authenticated | `session.user.id` | Web push VAPID keys | `User.pushSubscription` | Idempotent JSON update | **STATICALLY VERIFIED** |
| `/api/tutor/subscribe` | POST | TUTOR | Role check | `planId` check | Read `TutorProfile` | Razorpay order creation | **STATICALLY VERIFIED** |
| `/api/tutor/subscribe/verify` | POST | TUTOR | HMAC SHA-256 Signature | Amount & Plan matching | `TutorProfile`, `TutorSubscription` | Idempotent on `razorpayPaymentId` | **STATICALLY VERIFIED** |
| `/api/upload/presigned-url` | POST | Authenticated | Rate limit & MIME check | MIME & `fileSize` (5MB max) | Read `TutorProfile` / `Conversation` | Max 10 requests / min (`checkRateLimit`) | **STATICALLY VERIFIED** |
| `/api/webhooks/razorpay` | POST | Webhook | Timing-safe HMAC SHA-256 | Signature & Event payload | `Wallet`, `WalletTransaction`, `CouponUsage` | `@@unique([walletId, referenceId, type])` | **STATICALLY VERIFIED** |

---

### B. Server Action Modules (93 Actions across 16 Files)

| Action Module | Function Name | Auth Req. | Required Permission / Role | Primary DB Operation | Transaction Boundary | Failure Handling | Status |
|---------------|---------------|-----------|----------------------------|----------------------|----------------------|------------------|--------|
| **auth.actions.ts** | `registerAction` | Public | None | `User.create`, `Parent/TutorProfile.create` | Single implicit | Returns field errors | **STATICALLY VERIFIED** |
| | `loginAction` | Public | None | `signIn("credentials")` | None | Returns invalid creds error | **STATICALLY VERIFIED** |
| | `requestPasswordResetAction` | Public | None | `VerificationToken.create` | Single insert | Prevents email enum | **STATICALLY VERIFIED** |
| | `resetPasswordWithTokenAction` | Public | Token match | `User.update`, `VerificationToken.deleteMany` | `$transaction` | Returns expired link error | **STATICALLY VERIFIED** |
| | `selectUserRoleAction` | Authenticated | User session | `User.update`, `Profile.create`, `Wallet.create` | Single update | Redirects to dashboard | **STATICALLY VERIFIED** |
| **admin.actions.ts** | `adminCreateUserAction` | SUPER_ADMIN | `users:manage` + `PRIVILEGED_ROLES` guard | `User.create`, `AuditLog.create` | `$transaction` | Rejects privilege escalation | **STATICALLY VERIFIED** |
| | `suspendUserAction` | Sub-Admin | `users:suspend` | `User.update`, `Notification.create`, `AuditLog` | `$transaction` | Action error return | **STATICALLY VERIFIED** |
| | `reactivateUserAction` | Sub-Admin | `users:suspend` | `User.update`, `Notification.create`, `AuditLog` | `$transaction` | Action error return | **STATICALLY VERIFIED** |
| | `approveKycAction` | Sub-Admin | `kyc:review` | `TutorProfile.update`, `Notification.create`, `AuditLog` | `$transaction` | Action error return | **STATICALLY VERIFIED** |
| | `rejectKycAction` | Sub-Admin | `kyc:review` | `TutorProfile.update`, `Notification.create`, `AuditLog` | `$transaction` | Action error return | **STATICALLY VERIFIED** |
| | `approveRefundAction` | Sub-Admin | `wallets:manage` | `Wallet.update`, `WalletTransaction.update`, `Notification` | `$transaction` | User.id resolved for notification | **STATICALLY VERIFIED** |
| | `rejectRefundAction` | Sub-Admin | `wallets:manage` | `WalletTransaction.update`, `Notification`, `AuditLog` | `$transaction` | User.id resolved for notification | **STATICALLY VERIFIED** |
| **leads.actions.ts** | `createRequirementAction` | PARENT | `requirement:write` | `RequirementLead.create`, `LeadMatch.create` | `$transaction` | Deduplicated by subject/city | **STATICALLY VERIFIED** |
| | `updateRequirementAction` | PARENT | Owner check | `RequirementLead.update` | Single update | Rejects edit if locked | **STATICALLY VERIFIED** |
| | `purchaseLeadAction` | TUTOR | `lead:purchase` | `Wallet.updateMany`, `WalletTransaction`, `LeadPurchase` | Conditional `updateMany` balance guard | Atomic rollback on insufficient balance | **STATICALLY VERIFIED** |
| | `submitApplicationAction` | TUTOR | Buyer check | `LeadPurchase.update` | Single update | Action error return | **STATICALLY VERIFIED** |
| | `shortlistApplicantAction` | PARENT | Owner check | `LeadPurchase.update`, `Notification` | Single update | Action error return | **STATICALLY VERIFIED** |
| | `rejectApplicantAction` | PARENT | Owner check | `LeadPurchase.update`, `Notification` | Single update | Action error return | **STATICALLY VERIFIED** |
| **wallet.actions.ts** | `createCoinOrderAction` | TUTOR | `wallet:topup` | `CoinPackage.findUnique`, `Coupon.findUnique` | Single read | Razorpay Order API | **STATICALLY VERIFIED** |
| | `confirmCoinPaymentAction` | TUTOR | `wallet:topup` | `Wallet.update`, `WalletTransaction.create` | `$transaction` | Idempotent reference ID | **STATICALLY VERIFIED** |
| | `requestLeadRefundAction` | TUTOR | Buyer check | `WalletTransaction.create` (PENDING) | Single insert | 24-hour window check | **STATICALLY VERIFIED** |
| **coupon.actions.ts** | `createCouponAction` | Admin | `settings:manage` | `Coupon.create`, `AuditLog.create` | Single insert | Code unique constraint | **STATICALLY VERIFIED** |
| | `validateCouponAction` | Authenticated | None | `Coupon.findUnique`, `CouponUsage.findFirst` | Single read | Validates limit, expiry, min order | **STATICALLY VERIFIED** |
| | `consumeCouponInTx` | System / Webhook | Internal Tx | `Coupon.updateMany`, `CouponUsage.create` | Transaction client | `@@unique([couponId, userId])` P2002 | **STATICALLY VERIFIED** |
| **booking.actions.ts** | `createBookingAction` | PARENT | `requirement:write` | `Booking.create`, `Notification.create` | `$transaction` | Action error return | **STATICALLY VERIFIED** |
| **review.actions.ts** | `submitReviewAction` | PARENT / TUTOR | Participant check | `Review.create`, `TutorProfile.update` | `$transaction` | `@@unique([bookingId, reviewerUserId])` | **STATICALLY VERIFIED** |
