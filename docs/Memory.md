# ThinkTutor — AI Memory & Active Session Handshake

**Last Updated:** 2026-07-24  
**Current Phase:** **PHASE 2 — Parent Module & Requirement Posting**  
**Active Branch:** `main`  
**Target Stack:** Next.js 16 (App Router, RSC, Server Actions, `'use cache'`), React 19, Auth.js v5, Prisma 6/7, Tailwind CSS v4, AWS Suite (SES, SNS, S3), BullMQ + Upstash Redis  

---

## 🤖 MANDATORY HANDSHAKE PROTOCOL FOR NEW CHAT SESSIONS

If you are an AI assistant starting a new chat session on this project:

1. **DO NOT ASK THE USER WHAT TO DO FIRST.**
2. Read the following documentation files in `docs/`:
   - [PRD.md](file:///c:/Users/coder/Desktop/Thinktutor/docs/PRD.md) — Product requirements & business rules
   - [Architecture.md](file:///c:/Users/coder/Desktop/Thinktutor/docs/Architecture.md) — Tech stack, DB schema & code patterns
   - [Rules.md](file:///c:/Users/coder/Desktop/Thinktutor/docs/Rules.md) — Technical constraints & coding boundaries
   - [Phases.md](file:///c:/Users/coder/Desktop/Thinktutor/docs/Phases.md) — Enterprise Engineering Handbook & SSOT (v10.0)
   - [Design.md](file:///c:/Users/coder/Desktop/Thinktutor/docs/Design.md) — Design system & CSS tokens
   - [Memory.md](file:///c:/Users/coder/Desktop/Thinktutor/docs/Memory.md) — **THIS FILE** (Current progress tracker)
3. Look at **Active Session State** below to see what tasks are completed vs pending.
4. Continue building the pending tasks in the active phase step-by-step.
5. After completing tasks, update the checkboxes `[x]` in `docs/Phases.md` and log progress in `docs/Memory.md`.

---

## 📍 Active Session State

- **Completed Phase 1**: Foundation, Next.js 16 App Router, Playful Neubrutalism & Claymorphism Design System (inspired by UU-PM Educational Platform: warm cream background `#FAF8F5`, 2.5px slate borders `#0F172A`, 3D offset drop shadows `shadow-[5px_5px_0px_0px_rgba(15,23,42,1)]`, pastel card backgrounds, extra-bold Poppins typography), Prisma Client 6, Auth.js v5, Supabase Integration (`@supabase/supabase-js`, `@supabase/ssr`, browser & server client helpers), Supabase MCP Server (`mcp.supabase.com/mcp?project_ref=awfgtylndntipblgmmll`), Supabase PostgreSQL Database (synced via `npx prisma db push` to Tokyo `aws-0-ap-northeast-1.pooler.supabase.com`), SVG Brand Icons & Illustrations, Auth Pages (Login, Register with Parent/Tutor selector, Forgot Password), landing page with session auth header, parent/tutor dashboard shells (`app/parent/dashboard/page.tsx`, `app/tutor/dashboard/page.tsx`), and verified TypeScript compilation (`npx tsc --noEmit` passed with 0 errors).
- **Next Up**: Phase 2 — Parent Module & Requirement Posting (`app/parent/*`, `createRequirementAction`).

---

## 1. Project Snapshot

| Parameter | Specification |
|-----------|---------------|
| App Name | ThinkTutor |
| Target Market | India (Primary) |
| Framework | **Next.js 16.x** (App Router, RSC, Server Actions, `'use cache'`) |
| UI Library | **React 19.x** (`useActionState`, `useOptimistic`) |
| Authentication | **Auth.js (NextAuth v5)** — **Email + Password & Google OAuth** *(Phone OTP disabled to save costs)* |
| Notifications | **AWS SES (Email)** + **AWS SNS (Web Push)** + **In-App Bell** |
| Database & ORM | **PostgreSQL** via **Prisma 6/7** |
| Styling System | **Tailwind CSS v4** + **Playful Neubrutalism & Claymorphism** |
| Task Queue & Cache | **BullMQ + Upstash Redis** |
| Payments | **Razorpay Checkout & Webhooks** |
| File Storage | **AWS S3** (Private Buckets & Pre-signed URLs for KYC/Docs) |
| Hosting Plan | Vercel (Next.js app) + Supabase (Postgres DB) + Upstash (Redis) |

---

## 2. Documentation Suite Status

| Document | File Path | Status |
|----------|-----------|--------|
| **PRD** | [PRD.md](file:///c:/Users/coder/Desktop/Thinktutor/docs/PRD.md) | ✅ Complete |
| **Architecture** | [Architecture.md](file:///c:/Users/coder/Desktop/Thinktutor/docs/Architecture.md) | ✅ Complete |
| **Rules** | [Rules.md](file:///c:/Users/coder/Desktop/Thinktutor/docs/Rules.md) | ✅ Complete |
| **Phases** | [Phases.md](file:///c:/Users/coder/Desktop/Thinktutor/docs/Phases.md) | ✅ Complete (Enterprise Engineering Handbook v10.0) |
| **Design** | [Design.md](file:///c:/Users/coder/Desktop/Thinktutor/docs/Design.md) | ✅ Complete |
| **Memory** | [Memory.md](file:///c:/Users/coder/Desktop/Thinktutor/docs/Memory.md) | ✅ Active Tracker |

---

## 3. Session Change Log

### Session 12 (2026-07-24)
- Verified Phase 1 as 100% complete (`npx tsc --noEmit` passed with 0 errors).
- Confirmed database migration, auth flows, landing page, session navbar, parent dashboard, and tutor dashboard.
- Ready to build Phase 2 (Parent Requirement Posting & Management).
