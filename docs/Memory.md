# ThinkTutor — AI Memory & Active State Log

**Last Updated:** 2026-07-24 (AWS Ecosystem: AWS SES Email + AWS SNS Web Push + S3 Storage)  
**Current Phase:** Phase 1 — Foundation & Auth (Ready for execution)  
**Active Stack:** Next.js 16, React 19, Auth.js v5, Prisma 6/7, Tailwind CSS v4, AWS Suite  

> INSTRUCTIONS FOR AI: Read this file at the start of every session before touching any code.
> Update this file at the END of every session with what was done, what is in progress, and what is next.

---

## 1. Project Snapshot

| Parameter | Specification |
|-----------|---------------|
| App Name | ThinkTutor |
| Target Market | India (Primary) |
| Framework | **Next.js 16.x** (App Router, RSC, Server Actions, `'use cache'`) |
| UI Library | **React 19.x** (`useActionState`, `useOptimistic`) |
| Authentication | **Auth.js (NextAuth v5)** — **Email + Password & Google OAuth** *(Phone OTP disabled to save SMS costs)* |
| Notifications | **AWS SES (Transactional Email)** + **AWS SNS (Web Push)** + **In-App Bell** |
| Database & ORM | **PostgreSQL** via **Prisma 6/7** (`@prisma/adapter-pg` driver adapter) |
| Styling System | **Tailwind CSS v4** (`@import "tailwindcss";`) + **shadcn/ui** |
| Task Queue & Cache | **BullMQ + Upstash Redis** |
| Payments | **Razorpay Checkout & Webhooks** |
| File Storage | **AWS S3** (Private Buckets & Pre-signed URLs for KYC/Docs) |
| Hosting Plan | Vercel (Next.js app) + Supabase (Postgres DB) + Upstash (Redis) |

---

## 2. Documentation Audit Status

| Document | File Path | Version / Scope | Status |
|----------|-----------|-----------------|--------|
| **PRD** | [PRD.md](file:///c:/Users/coder/Desktop/Thinktutor/docs/PRD.md) | PRD v2.2 (AWS Ecosystem: SES, SNS, S3) | ✅ Updated |
| **Architecture** | [Architecture.md](file:///c:/Users/coder/Desktop/Thinktutor/docs/Architecture.md) | Architecture v3.2 (AWS Notification Suite) | ✅ Updated |
| **Rules** | [Rules.md](file:///c:/Users/coder/Desktop/Thinktutor/docs/Rules.md) | Rules v3.2 (AWS SES & SNS Constraints) | ✅ Updated |
| **Phases** | [Phases.md](file:///c:/Users/coder/Desktop/Thinktutor/docs/Phases.md) | 14 Build Phases Plan v3.2 | ✅ Updated |
| **Design** | [Design.md](file:///c:/Users/coder/Desktop/Thinktutor/docs/Design.md) | Tailwind v4 Design System v3.0 | ✅ Updated |
| **Memory** | [Memory.md](file:///c:/Users/coder/Desktop/Thinktutor/docs/Memory.md) | Active Memory & Session Log | ✅ Updated |

---

## 3. Session Log & Next Steps

### Session 4 (2026-07-24)
- Standardized notification system on **AWS SES** (Email notifications) and **AWS SNS** (Browser Web Push), combined with database-backed In-App Notification Bell.
- Updated `PRD.md`, `Architecture.md`, `Rules.md`, `Phases.md`, and `Memory.md`.
- All updated documentation committed and pushed to `dev` branch on GitHub (`https://github.com/thinktutorindia/thinktutor.git`).
- Ready to proceed with Phase 1 execution.
