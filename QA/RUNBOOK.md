# ApnaTutorHub / ThinkTutor — Staging QA & Runtime Verification Runbook

## Overview
This runbook provides step-by-step instructions for executing the complete runtime QA test suite against a disposable staging PostgreSQL database once a staging environment is attached.

---

## 1. Safety Gate Requirement
Before running any runtime mutation test:
1. Verify that `DATABASE_URL` and `DIRECT_URL` in `.env.test` or local environment do NOT point to `awfgtylndntipblgmmll.supabase.co` or `apnatutorhub.com`.
2. The master runner `npx tsx QA/scripts/run-all-staging-tests.ts` automatically enforces this safety check and will abort if a production connection string is detected.

---

## 2. Staging Database Setup

### Step A: Configure Staging Environment File (`.env.test`)
Create `.env.test` with your disposable database credentials:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/apnatutorhub_staging"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/apnatutorhub_staging"
AUTH_SECRET="test_auth_secret_32_bytes_long_string_here"
RAZORPAY_KEY_ID="rzp_test_THoNmYsXfg7Xtn"
RAZORPAY_KEY_SECRET="ppo7k7P8W4bUlLfWhdQ6lb5L"
```

### Step B: Apply Prisma Schema & Seed Synthetic QA Data
```bash
# Push schema to staging database
npx prisma db push --config=.env.test

# Seed synthetic QA test data & roles
npx tsx prisma/seed.ts
```

---

## 3. Executing Automated Staging Test Suite

Run the master test runner:
```bash
npx tsx QA/scripts/run-all-staging-tests.ts
```

### Test Suite Modules Executed:
1. `test-subscription-b1.ts`: Validates subscription payment verification, HMAC signature matching, order amount binding, and idempotency.
2. `test-refund-b2.ts`: Validates refund approval/rejection User ID resolution and notification foreign key integrity.
3. `test-coupon-b3.ts`: Validates coupon usage limits, webhook idempotency, and unique constraint enforcement (`@@unique([couponId, userId])`).
4. `test-privilege-b5.ts`: Validates RBAC protection against sub-admin privilege escalation (`users:manage` cannot grant `SUPER_ADMIN` or reset admin passwords).
5. `test-password-reset-b6.ts`: Validates CSPRNG password reset token entropy (256-bit / 64 hex characters) and token invalidation.

---

## 4. Manual / Webhook / Concurrency Execution Protocols

### Razorpay Webhook Simulation
Simulate `payment.captured` event to verify webhook idempotency:
```bash
curl -X POST http://localhost:3000/api/webhooks/razorpay \
  -H "Content-Type: application/json" \
  -H "X-Razorpay-Signature: <hmac_signature>" \
  -d '{"event":"payment.captured","payload":{...}}'
```

### Concurrency Stress Test
Run concurrent lead purchase requests against staging DB:
```bash
npx tsx scratch/test-concurrency.ts
```

---

## 5. Verification Checklist & Sign-off

- [ ] All 5 QA test modules in `QA/scripts/` pass on staging.
- [ ] Concurrency runner confirms 0 double purchases or negative balances.
- [ ] Webhook retry test confirms idempotent database handling.
- [ ] Update `QA/FINAL_REPORT.md` status to **PRODUCTION READY** after runtime sign-off.
