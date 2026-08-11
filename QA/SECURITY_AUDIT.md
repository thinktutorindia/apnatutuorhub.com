# ApnaTutorHub / ThinkTutor — Security & Vulnerability Audit Report

## Overview
This document details the security review conducted across Authentication, Authorization, IDOR, Cryptography, HTTP Security Headers, and Upload Guards.

---

## 1. Authentication & Session Security
- **Auth Provider**: Auth.js v5 (`auth.ts`) with JWT strategy (7-day session max age).
- **Credentials Security**: Passwords hashed using bcryptjs (12 rounds). Password reset uses 256-bit CSPRNG tokens (`crypto.randomBytes(32).toString("hex")`, 64 hex characters) and invalidates tokens upon use via `verificationToken.deleteMany`. (Fix B6 verified!).
- **OAuth Onboarding**: Google OAuth role selection enforces valid `UserRole` enum mapping (`PARENT` or `TUTOR`).

---

## 2. Authorization & Privilege Escalation Protection
- **Middleware Guard (`proxy.ts`)**: Enforces path gating (`/parent/*` -> `PARENT`, `/tutor/*` -> `TUTOR`, `/admin/*` -> `SUPER_ADMIN` / `SUB_ADMIN`).
- **Sub-Admin Module Gate**: `SUB_ADMIN` routes are strictly checked against `SUB_ADMIN_MODULE_MAP[subAdminRole]`.
- **Privilege Escalation Guard (Fix B5)**: `adminCreateUserAction`, `adminEditUserAction`, and `adminResetUserPasswordAction` enforce `PRIVILEGED_ROLES = new Set(["SUPER_ADMIN", "SUB_ADMIN"])` and require `session.user.role === "SUPER_ADMIN"` to assign privileged roles or reset admin passwords.

---

## 3. IDOR & Ownership Protections
- **Parent Actions**: `updateRequirementAction`, `shortlistApplicantAction`, `rejectApplicantAction` verify `parentProfileId` ownership.
- **Tutor Actions**: `purchaseLeadAction`, `requestLeadRefundAction`, `submitKYCAction` resolve `tutorProfileId` directly from the authenticated session context (`resolveTutorContext`).

---

## 4. HTTP Security Headers & Infrastructure
- **Security Headers (`proxy.ts`)**:
  - `Content-Security-Policy`: Restricts scripts, styles, images, frames, and connect endpoints.
  - `X-Frame-Options`: `DENY`
  - `X-Content-Type-Options`: `nosniff`
  - `Strict-Transport-Security`: `max-age=63072000; includeSubDomains; preload`
  - `Referrer-Policy`: `strict-origin-when-cross-origin`
  - `Permissions-Policy`: Camera, microphone, and interest-cohort disabled.
- **CSRF Protection**: Origin header matching on mutating `/api/*` endpoints.
- **Upload File Size Guard (Fix R5)**: `app/api/upload/presigned-url/route.ts` validates `fileSize <= MAX_UPLOAD_BYTES` (5MB limit) on the server side.
