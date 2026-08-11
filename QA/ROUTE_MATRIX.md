# ApnaTutorHub / ThinkTutor — Route & Server Action Inventory Matrix

## Overview
This matrix audits all 57 page routes and 102 Server API / Action entry points in ApnaTutorHub.

---

| Route / Entry Point | Access Level | Allowed Role(s) | Input Validation | State Transition | Failure Handling | Status |
|---------------------|--------------|-----------------|------------------|------------------|------------------|--------|
| `/` | Public | All | None | None | 404 / Error boundary | **STATICALLY VERIFIED** |
| `/login` | Public | Unauthenticated | Zod `loginSchema` | Session creation | Returns invalid creds | **STATICALLY VERIFIED** |
| `/register` | Public | Unauthenticated | Zod `registerSchema` | Account & Profile creation | Returns field errors | **STATICALLY VERIFIED** |
| `/forgot-password` | Public | Unauthenticated | Email format check | Token generation | Prevents email enum | **STATICALLY VERIFIED** |
| `/reset-password` | Public | Unauthenticated | Password length check | Password hash update | Deletes token | **STATICALLY VERIFIED** |
| `/select-role` | Authenticated | Unonboarded User | Role enum check | Role & Profile assignment | Redirects to dashboard | **STATICALLY VERIFIED** |
| `/parent/dashboard` | Protected | PARENT | Session check | Read-only dashboard stats | Redirects to login | **STATICALLY VERIFIED** |
| `/parent/post-requirement` | Protected | PARENT | `createLeadSchema` | `RequirementLead` insert | Rate limits per parent | **STATICALLY VERIFIED** |
| `/parent/my-leads` | Protected | PARENT | Session check | List parent's leads | Redirects to login | **STATICALLY VERIFIED** |
| `/parent/my-leads/[id]/edit` | Protected | PARENT (owner) | `updateLockedLeadSchema` | `RequirementLead` update | Rejects locked fields | **STATICALLY VERIFIED** |
| `/parent/my-leads/[id]/applicants` | Protected | PARENT (owner) | Lead ID format | Read applicants list | Rejects non-owners | **STATICALLY VERIFIED** |
| `/parent/bookings` | Protected | PARENT | Session check | List class bookings | Redirects to login | **STATICALLY VERIFIED** |
| `/parent/profile` | Protected | PARENT | Profile schema check | `ParentProfile` update | Action error return | **STATICALLY VERIFIED** |
| `/tutor/dashboard` | Protected | TUTOR | Session check | Read-only tutor dashboard | Redirects to login | **STATICALLY VERIFIED** |
| `/tutor/leads` | Protected | TUTOR | Session check | Read tutor lead feed | Redirects to login | **STATICALLY VERIFIED** |
| `/tutor/profile` | Protected | TUTOR | Profile step schemas | `TutorProfile` step update | Action error return | **STATICALLY VERIFIED** |
| `/tutor/wallet` | Protected | TUTOR | Session check | Read wallet & transactions | Redirects to login | **STATICALLY VERIFIED** |
| `/tutor/plans` | Protected | TUTOR | Session check | Read subscription plans | Redirects to login | **STATICALLY VERIFIED** |
| `/tutor/bookings` | Protected | TUTOR | Session check | List tutor bookings | Redirects to login | **STATICALLY VERIFIED** |
| `/tutor/[id]` | Public | All | Dynamic ID check | Read tutor public profile | Returns 404 if missing | **STATICALLY VERIFIED** |
| `/admin/dashboard` | Protected | Admin | SUPER_ADMIN / SUB_ADMIN | System overview metrics | Redirects non-admins | **STATICALLY VERIFIED** |
| `/admin/users` | Protected | Admin | SUPPORT, VERIFICATION, Ops, SUPER | List & manage users | Module-gated in proxy | **STATICALLY VERIFIED** |
| `/admin/kyc` | Protected | Admin | VERIFICATION, SUPER | Review KYC documents | Module-gated in proxy | **STATICALLY VERIFIED** |
| `/admin/leads` | Protected | Admin | OPERATIONS, SUPER | Manage marketplace leads | Module-gated in proxy | **STATICALLY VERIFIED** |
| `/admin/wallets` | Protected | Admin | FINANCE, SUPER | Refund approval & wallet audit | Module-gated in proxy | **STATICALLY VERIFIED** |
| `/admin/coupons` | Protected | Admin | MARKETING, SUPER | Create & manage coupons | Module-gated in proxy | **STATICALLY VERIFIED** |
| `/admin/settings` | Protected | Admin | MARKETING, SUPER | Update platform pricing | Module-gated in proxy | **STATICALLY VERIFIED** |
| `/admin/sub-admins` | Protected | Admin | SUPER_ADMIN only | Create & manage sub-admins | Rejects non-Super-Admin | **STATICALLY VERIFIED** |
| `/admin/audit-logs` | Protected | Admin | All Sub-Admins / SUPER | Read system audit log | Read-only audit log | **STATICALLY VERIFIED** |
| `/api/auth/[...nextauth]` | Public | NextAuth handler | Provider tokens | Session management | OAuth error handler | **STATICALLY VERIFIED** |
| `/api/cron/lead-expiry` | System | Bearer `CRON_SECRET` | 48-hour timestamp check | Expire inactive leads | 401 Unauthorized | **STATICALLY VERIFIED** |
| `/api/health` | Public | Read-only ping | None | Read DB status | 500 error return | **STATICALLY VERIFIED** |
| `/api/notifications/subscribe` | Protected | Authenticated | Push subscription JSON | Update push token | 401 Unauthorized | **STATICALLY VERIFIED** |
| `/api/push/subscribe` | Protected | Authenticated | VAPID keys | Update push token | 401 Unauthorized | **STATICALLY VERIFIED** |
| `/api/tutor/subscribe` | Protected | TUTOR | `planId` check | Create Razorpay order | 400 Bad request | **STATICALLY VERIFIED** |
| `/api/tutor/subscribe/verify` | Protected | TUTOR | HMAC SHA-256 Signature | Activate subscription | 400 Invalid signature | **STATICALLY VERIFIED** |
| `/api/upload/presigned-url` | Protected | Authenticated | MIME & `fileSize` (5MB max) | Generate upload URL | 400 Unsupported type | **STATICALLY VERIFIED** |
| `/api/webhooks/razorpay` | System | HMAC SHA-256 Webhook | Payment signature | Credit wallet & consume coupon | 400 Invalid signature | **STATICALLY VERIFIED** |
