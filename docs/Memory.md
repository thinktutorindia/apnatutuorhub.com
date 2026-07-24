# ThinkTutor — AI Memory & Active State Log

**Last Updated:** 2026-07-24 (Cost-Optimized Scope: Email Auth + Web/Email Notifications)  
**Current Phase:** Phase 1 — Foundation & Auth (Ready for execution)  
**Active Stack:** Next.js 16, React 19, Auth.js v5, Prisma 6/7, Tailwind CSS v4  

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
| Notifications | **Web (In-App / Pusher / Web Push)** + **Email (Resend)** *(SMS disabled)* |
| Database & ORM | **PostgreSQL** via **Prisma 6/7** (`@prisma/adapter-pg` driver adapter) |
| Styling System | **Tailwind CSS v4** (`@import "tailwindcss";`) + **shadcn/ui** |
| Task Queue & Cache | **BullMQ + Upstash Redis** |
| Payments | **Razorpay Checkout & Webhooks** |
| File Storage | **AWS S3 / Cloudflare R2** (Pre-signed URLs) |
| Hosting Plan | Vercel (Next.js app) + Supabase (Postgres DB) + Upstash (Redis) |

---

## 2. Documentation Audit Status

| Document | File Path | Version / Scope | Status |
|----------|-----------|-----------------|--------|
| **PRD** | [PRD.md](file:///c:/Users/coder/Desktop/Thinktutor/docs/PRD.md) | PRD v2.1 (Email Auth & Web/Email Notifications) | ✅ Updated |
| **Architecture** | [Architecture.md](file:///c:/Users/coder/Desktop/Thinktutor/docs/Architecture.md) | Architecture v3.1 (Email + Google Auth, Resend) | ✅ Updated |
| **Rules** | [Rules.md](file:///c:/Users/coder/Desktop/Thinktutor/docs/Rules.md) | Rules v3.1 (No Phone OTP / SMS rules) | ✅ Updated |
| **Phases** | [Phases.md](file:///c:/Users/coder/Desktop/Thinktutor/docs/Phases.md) | 14 Build Phases Plan v3.1 | ✅ Updated |
| **Design** | [Design.md](file:///c:/Users/coder/Desktop/Thinktutor/docs/Design.md) | Tailwind v4 Design System v3.0 | ✅ Updated |
| **Memory** | [Memory.md](file:///c:/Users/coder/Desktop/Thinktutor/docs/Memory.md) | Active Memory & Session Log | ✅ Updated |

---

## 3. Session Log & Next Steps

### Session 3 (2026-07-24)
- Updated documentation scope based on user directive:
  1. Disabled Phone SMS OTP to avoid infrastructure costs; set **Email + Password** and **Google OAuth** as primary auth.
  2. Configured notification channels to **Web (In-App Bell / Web Push)** and **Email (Resend)**. SMS and WhatsApp channels removed from current scope.
- Updated `PRD.md`, `Architecture.md`, `Rules.md`, `Phases.md`, and `Memory.md`.
- Ready to proceed with Phase 1 execution.
