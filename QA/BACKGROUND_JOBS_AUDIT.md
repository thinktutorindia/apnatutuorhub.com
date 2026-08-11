# ApnaTutorHub / ThinkTutor — Background Jobs & Worker Audit

## Overview
This document audits background matching workers, lead radius expansion jobs, and cron tasks.

---

## 1. Lead Matching & Radius Expansion Worker (`jobs/lead-expansion.worker.ts`)
- **Queue System**: BullMQ over Upstash Redis.
- **Worker Logic**:
  - Fetches requirement lead details and active radius (`5km` -> `10km` -> `20km`).
  - Queries verified tutors within expanded radius using haversine formula distance query.
  - Inserts `LeadMatch` records using `upsert` to enforce idempotency on `@@unique([leadId, tutorProfileId])`.
  - Dispatches Web Push & Email notifications to newly matched tutors.

---

## 2. 48-Hour Lead Expiry Cron (`app/api/cron/lead-expiry/route.ts`)
- **Authentication Guard**: Verifies `Bearer ${process.env.CRON_SECRET}` in the Authorization header.
- **Expiry Logic**:
  - Queries `RequirementLead` records where `status: "ACTIVE"` and `createdAt <= now - 48 hours`.
  - Executes atomic update to `status: "EXPIRED"`.
  - Idempotent and safe to execute repeatedly.
