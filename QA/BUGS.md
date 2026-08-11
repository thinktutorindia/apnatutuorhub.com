# ApnaTutorHub / ThinkTutor — QA Bug Log & Retest Audit

Method note: Bugs below were discovered by **reverse-engineering the application codebase** and inspecting security/money/data boundaries.
Live database mutations and payment executions against production were **STRICTLY BLOCKED** in compliance with Production Database Safety Rules.

Severity: P0 = Critical (money/security/data loss), P1 = High, P2 = Medium, P3 = Low.

---

## B1 — [P0] Subscription Payment Bypass & Verification Defect
- **Feature:** Tutor subscription purchase (`FEATURE: tutor-subscription`)
- **Location:** `app/api/tutor/subscribe/verify/route.ts`
- **Reproduction (static):** Authenticated tutor sends `POST /api/tutor/subscribe/verify` with body `{ "planId": "PLATINUM" }` and **no signature**. Verification was skipped when signature was missing, enabling free activation of ₹24,000/yr PLATINUM subscriptions.
- **Root cause:** Verification guard was optional and did not bind order amount, plan ID, or tutor profile ID.
- **Fix:** Require `orderId`, `paymentId`, `signature`; verify HMAC SHA-256 signature timing-safely when Razorpay is configured; fetch order from Razorpay and assert `order.amount === plan.priceInr * 100`, `order.notes.planId === planId`, and `order.notes.tutorProfileId === tutorProfile.id`; enforce idempotency on `razorpayPaymentId`.
- **Status:** FIXED (code-level). Retest: STATICALLY VERIFIED (typecheck PASS, build PASS, 0 React hook errors; live payment mutation test BLOCKED by production database safety gate).

---

## B2 — [P1] Refund Approval/Rejection Foreign Key Violation (P2003)
- **Feature:** Wallet lead-refund workflow (`FEATURE: wallet-refund`)
- **Location:** `app/actions/admin.actions.ts` → `approveRefundAction`, `rejectRefundAction`
- **Reproduction (static):** Both actions created a `Notification` with `userId: wallet.tutorProfileId`. `tutorProfileId` is a `TutorProfile.id`, **not** a `User.id`. `Notification.userId` has a foreign key to `users`, throwing P2003 and rolling back the transaction.
- **Root cause:** Misuse of `TutorProfile.id` instead of `User.id` for notification recipient.
- **Fix:** Resolved tutor's `User.id` via `tutorProfile.user.id` and used it as `userId`.
- **Status:** FIXED (code-level). Retest: STATICALLY VERIFIED (typecheck PASS, build PASS; notification FK mapping audited; live mutation test BLOCKED by production database safety gate).

---

## B3 — [P1] Coupon Dead Code Causing Unlimited Coupon Reuse
- **Feature:** Coupons on coin top-up (`FEATURE: coupons`)
- **Location:** `app/actions/coupon.actions.ts`, `app/actions/wallet.actions.ts`, `app/api/webhooks/razorpay/route.ts`
- **Reproduction (static):** `createCoinOrderAction` validated a coupon and applied discount, but `consumeCouponInTx` was never called on payment completion. `Coupon.usedCount` was never incremented and no `CouponUsage` row was created, allowing unlimited reuse.
- **Root cause:** Coupon consumption was never wired into the payment webhook success path.
- **Fix:** Persisted `couponId` and `discountPaise` in Razorpay order notes at creation; on `payment.captured` in webhook, after crediting coins, invoked `consumeCouponInTx` guarded by `@@unique([couponId, userId])` unique index.
- **Status:** FIXED (code-level). Retest: STATICALLY VERIFIED (typecheck PASS, build PASS; `consumeCouponInTx` atomic `updateMany` audited; live webhook test BLOCKED by production database safety gate).

---

## B4 — [P2] Public Tutor Profile `/tutor/[id]` Unreachable (Middleware Gate)
- **Feature:** Public tutor profile (`FEATURE: public-tutor-profile`)
- **Location:** `proxy.ts`, `app/tutor/[id]/page.tsx`
- **Reproduction (static):** `proxy.ts` restricted every `/tutor/*` path to `TUTOR` role, redirecting unauthenticated visitors to `/login` and parents/admins to dashboard.
- **Root cause:** Public profile route lived under the role-gated `/tutor` path prefix.
- **Fix:** In `proxy.ts`, added `isPublicTutorProfile(pathname)` to treat single non-reserved `/tutor/{id}` segments as public, keeping reserved app subpaths (`dashboard`, `profile`, `leads`, `bookings`, `wallet`, `plans`) gated to `TUTOR`.
- **Status:** FIXED (code-level). Retest: STATICALLY VERIFIED (typecheck PASS, build PASS; middleware route matching audited).

---

## B5 — [P1] Sub-Admin Privilege Escalation via User Management
- **Feature:** Admin user management / RBAC (`FEATURE: admin-users`)
- **Location:** `app/actions/admin.actions.ts` (`adminCreateUserAction`, `adminEditUserAction`, `adminResetUserPasswordAction`)
- **Reproduction (static):** `SUPPORT` sub-admins holding `users:manage` could create or promote users to `SUPER_ADMIN` / `SUB_ADMIN`, and reset passwords of existing `SUPER_ADMIN` accounts.
- **Root cause:** Assigning/altering privileged roles was not restricted to `SUPER_ADMIN`.
- **Fix:** Enforced `PRIVILEGED_ROLES = new Set(["SUPER_ADMIN", "SUB_ADMIN"])` and required `session.user.role === "SUPER_ADMIN"` to create/assign privileged roles or reset passwords of privileged users.
- **Status:** FIXED (code-level). Retest: STATICALLY VERIFIED (typecheck PASS, build PASS; `PRIVILEGED_ROLES` guard audited; live RBAC mutation test BLOCKED by production database safety gate).

---

## B6 — [P2] Non-CSPRNG Password Reset Token Generation
- **Feature:** Password reset (`FEATURE: password-reset`)
- **Location:** `app/actions/auth.actions.ts` (`requestPasswordResetAction`, `resetPasswordWithTokenAction`)
- **Reproduction (static):** Reset tokens used `Math.random()`, which is not cryptographically secure and predictable.
- **Root cause:** Non-CSPRNG token generation.
- **Fix:** Generated 256-bit secure token via `crypto.randomBytes(32).toString("hex")` (64 hex characters) and invalidated token on use via `verificationToken.deleteMany`.
- **Status:** FIXED (code-level). Retest: STATICALLY VERIFIED (typecheck PASS, build PASS; CSPRNG token & invalidation audited).

---

## Risk Register Audit (R1–R5)

- **R1 [P2] Rate Limiter Fail-Open**: In `lib/security-audit.ts`, `checkRateLimit` returns `allowed: true` when Upstash env vars are unconfigured. Acceptable for local dev, but production requires monitoring.
- **R2 [P3] Cron Endpoint Authentication**: In `app/api/cron/lead-expiry/route.ts`, `CRON_SECRET` authorization header is checked.
- **R3 [P3] Admin Coin Credit Analytics**: Admin coin credits increment `totalPurchased` on `Wallet`. Analytics-only impact.
- **R4 [P3] Subscription `monthlyLeads` Quota vs. Coins**: **`PRODUCT DECISION REQUIRED`**. Schema tracks `leadsUsedThisMonth` and plans specify `monthlyLeads`, but `purchaseLeadAction` currently deducts wallet coins for all unlocks. Product decision required to establish whether monthly subscription quotas grant free unlocks prior to coin usage.
- **R5 [P2] Server-Side Presigned Upload Size Guard (FIXED)**: Hardened `app/api/upload/presigned-url/route.ts` by adding server-side `fileSize` validation against `MAX_UPLOAD_BYTES` (5MB limit).
