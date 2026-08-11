# ApnaTutorHub / ThinkTutor — QA Test Plan & Suite Strategy

## Overview
This document outlines the testing strategy, unit test coverage, static analysis checks, and staging test plan for ApnaTutorHub.

---

## 1. Automated Unit & Mock Test Suite (`QA/tests/`)
1. **`QA/tests/hmac-verification.test.ts`**: Tests Razorpay HMAC SHA-256 signature verification, timing safety, and signature tampering rejection.
2. **`QA/tests/password-reset-token.test.ts`**: Tests CSPRNG password reset token length (64 hex chars), entropy, and uniqueness across 1,000 generated tokens.
3. **`QA/tests/rbac-permissions.test.ts`**: Tests role permissions (`can()`, `resolveRbacRole()`) and sub-admin sidebar module mappings across all 8 roles.

---

## 2. Static Code Quality Suite
- **TypeScript Typecheck (`npx tsc --noEmit`)**: Verifies strict typing across all 57 pages and API routes.
- **ESLint Quality Gate (`npm run lint`)**: Enforces React Hooks rules and code formatting.
- **Next.js Production Build (`npx next build`)**: Compiles production bundles and static pages.

---

## 3. Staging Runtime Execution Suite (`QA/scripts/`)
- `test-subscription-b1.ts`: Tests tutor subscription purchase, HMAC signature, and plan amount matching against staging DB.
- `test-refund-b2.ts`: Tests refund approval/rejection notification recipient FK mapping against staging DB.
- `test-coupon-b3.ts`: Tests coupon validation, atomic `consumeCouponInTx`, and `@@unique([couponId, userId])` constraint against staging DB.
- `test-privilege-b5.ts`: Tests admin user management privilege escalation guards against staging DB.
- `test-password-reset-b6.ts`: Tests password reset request and token deletion against staging DB.
- `run-all-staging-tests.ts`: Master test suite runner with production database safety gate.
