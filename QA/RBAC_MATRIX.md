# ApnaTutorHub / ThinkTutor — RBAC & Permission Matrix

## Overview
This matrix documents the complete Role-Based Access Control (RBAC) permission structure across all 8 platform roles (PARENT, TUTOR, SUPER_ADMIN, and 5 SUB_ADMIN department roles).

---

## 1. Role Permission Definition (`lib/rbac.ts`)

| Role Name | Scope & Purpose | Assigned Permissions in `PERMISSION_MATRIX` | Accessible Admin Sidebar Routes (`SUB_ADMIN_MODULE_MAP`) |
|-----------|-----------------|---------------------------------------------|----------------------------------------------------------|
| **PARENT** | Student Parents / Guardians | `requirement:write` | None (Redirected to `/parent/dashboard`) |
| **TUTOR** | Verified Home Tutors | `lead:purchase`, `kyc:upload`, `wallet:topup` | None (Redirected to `/tutor/dashboard`) |
| **SUPPORT** | Customer Support Sub-Admins | `users:read`, `users:suspend`, `users:manage`, `leads:read`, `audit:read` | `/admin/dashboard`, `/admin/users`, `/admin/bookings`, `/admin/reviews`, `/admin/audit-logs` |
| **VERIFICATION** | KYC & Document Reviewers | `kyc:review`, `users:read`, `audit:read` | `/admin/dashboard`, `/admin/kyc`, `/admin/users`, `/admin/audit-logs` |
| **FINANCE** | Wallet & Refund Sub-Admins | `wallet:refund`, `wallets:manage`, `wallets:read`, `audit:read` | `/admin/dashboard`, `/admin/wallets`, `/admin/audit-logs` |
| **OPERATIONS** | Marketplace & Lead Ops | `leads:manage`, `leads:read`, `users:read`, `audit:read` | `/admin/dashboard`, `/admin/leads`, `/admin/bookings`, `/admin/users`, `/admin/audit-logs` |
| **MARKETING** | Campaign & Coupon Managers | `settings:manage`, `leads:read`, `audit:read` | `/admin/dashboard`, `/admin/settings`, `/admin/coupons`, `/admin/notifications/broadcast`, `/admin/audit-logs` |
| **SUPER_ADMIN** | Platform Super Administrators | **ALL PERMISSIONS** (`PERMISSIONS` array) | **ALL ADMIN ROUTES** (`/admin/*`) |

---

## 2. Protected Action Authorization Matrix

| Sensitive Action / Endpoint | PARENT | TUTOR | SUPPORT | VERIFICATION | FINANCE | OPERATIONS | MARKETING | SUPER_ADMIN | Enforcement Mechanism |
|-----------------------------|:------:|:-----:|:-------:|:------------:|:-------:|:----------:|:---------:|:-----------:|-----------------------|
| `createRequirementAction` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | `requirePermission("requirement:write")` |
| `purchaseLeadAction` | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | `requirePermission("lead:purchase")` |
| `submitKYCAction` | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | `requirePermission("kyc:upload")` |
| `createCoinOrderAction` | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | `requirePermission("wallet:topup")` |
| `approveKycAction` | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | `requirePermission("kyc:review")` |
| `approveRefundAction` | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | `requirePermission("wallets:manage")` |
| `suspendUserAction` | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | `requirePermission("users:suspend")` |
| `adminCreateUserAction` (PARENT/TUTOR) | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | `requirePermission("users:manage")` |
| `adminCreateUserAction` (SUB/SUPER_ADMIN) | ❌ | ❌ | ❌ (B5 Fix) | ❌ | ❌ | ❌ | ❌ | ✅ | `PRIVILEGED_ROLES` + `isSuperAdmin(session)` |
| `createCouponAction` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | `requirePermission("settings:manage")` |
| `createSubAdminAction` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | `requireSuperAdmin()` (`settings:manage`) |

---

## 3. Middleware & Direct API Enforcement Audit

1. **Middleware Route Gate (`proxy.ts`)**:
   - `/parent/*` -> Enforces `role === "PARENT"`
   - `/tutor/*` -> Enforces `role === "TUTOR"` (except `/tutor/[id]` public profile)
   - `/admin/*` -> Enforces `role === "SUPER_ADMIN" || role === "SUB_ADMIN"`
   - Sub-Admin Module Gate: Restricts `SUB_ADMIN` paths to `SUB_ADMIN_MODULE_MAP[subRole]`.
2. **Server Action Enforcement**:
   - Every server action independently invokes `requirePermission(perm)` or `auth()`, ensuring direct RPC calls without UI cannot bypass role restrictions.
