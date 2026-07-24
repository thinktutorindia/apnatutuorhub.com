# ThinkTutor — AI Memory & Active Session Handshake

**Last Updated:** 2026-07-24  
**Current Phase:** **PHASE 1 — Foundation, App Router & Auth System**  
**Active Branch:** `dev`  
**Target Stack:** Next.js 16 (App Router, RSC, Server Actions, `'use cache'`), React 19, Auth.js v5, Prisma 6/7, Tailwind CSS v4, AWS Suite (SES, SNS, S3), BullMQ + Upstash Redis  

---

## 🤖 MANDATORY HANDSHAKE PROTOCOL FOR NEW CHAT SESSIONS

If you are an AI assistant starting a new chat session on this project:

1. **DO NOT ASK THE USER WHAT TO DO FIRST.**
2. Read the following documentation files in `docs/`:
   - [PRD.md](file:///c:/Users/coder/Desktop/Thinktutor/docs/PRD.md) — Product requirements & business rules
   - [Architecture.md](file:///c:/Users/coder/Desktop/Thinktutor/docs/Architecture.md) — Tech stack, DB schema & code patterns
   - [Rules.md](file:///c:/Users/coder/Desktop/Thinktutor/docs/Rules.md) — Technical constraints & coding boundaries
   - [Phases.md](file:///c:/Users/coder/Desktop/Thinktutor/docs/Phases.md) — Granular 14-phase implementation task lists
   - [Design.md](file:///c:/Users/coder/Desktop/Thinktutor/docs/Design.md) — Design system & CSS tokens
   - [Memory.md](file:///c:/Users/coder/Desktop/Thinktutor/docs/Memory.md) — **THIS FILE** (Current progress tracker)
3. Look at **Section 3 (Current Phase Status)** below to see what tasks are completed vs pending.
4. Continue building the pending tasks in the active phase step-by-step.
5. After completing tasks, update the checkboxes `[x]` in `docs/Phases.md` and log progress in `docs/Memory.md`.

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
| Database & ORM | **PostgreSQL** via **Prisma 6/7** (`@prisma/adapter-pg` driver adapter) |
| Styling System | **Tailwind CSS v4** (`@import "tailwindcss";`) + **shadcn/ui** |
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
| **Phases** | [Phases.md](file:///c:/Users/coder/Desktop/Thinktutor/docs/Phases.md) | ✅ Complete (All 14 Phases Detailed) |
| **Design** | [Design.md](file:///c:/Users/coder/Desktop/Thinktutor/docs/Design.md) | ✅ Complete |
| **Memory** | [Memory.md](file:///c:/Users/coder/Desktop/Thinktutor/docs/Memory.md) | ✅ Active Tracker |

---

## 3. Current Phase Status: PHASE 1 — Foundation & Auth

**Goal:** Establish Next.js 16 project shell, React 19 UI system, Prisma 6/7 database client, and Auth.js v5 (Email + Google OAuth).

### Task Checklist for Phase 1
- [ ] **Task 1.1**: Initialize Next.js 16 app structure (`app/`, `components/`, `lib/`, `types/`)
- [ ] **Task 1.2**: Configure Tailwind CSS v4 in `app/globals.css` with `@import "tailwindcss";` and `@theme` tokens
- [ ] **Task 1.3**: Install shadcn/ui primitives (`button`, `input`, `card`, `dialog`, `badge`, `avatar`, `dropdown-menu`, `toast`)
- [ ] **Task 1.4**: Create Prisma 6/7 schema (`prisma/schema.prisma`) with `User`, `StudentProfile`, `TutorProfile`, `Wallet` models
- [ ] **Task 1.5**: Implement Prisma Singleton Client in `lib/prisma.ts` using `@prisma/adapter-pg`
- [ ] **Task 1.6**: Configure Auth.js v5 in `auth.ts` with Email + Password credentials and Google OAuth
- [ ] **Task 1.7**: Create route handler at `app/api/auth/[...nextauth]/route.ts`
- [ ] **Task 1.8**: Implement route protection guard in `proxy.ts` / middleware restricting role routes (`/parent/*`, `/tutor/*`, `/admin/*`)
- [ ] **Task 1.9**: Build Auth UI Pages (`login/page.tsx`, `register/page.tsx`, `forgot-password/page.tsx`)
- [ ] **Task 1.10**: Create environment template `.env.example`

---

## 4. Session Change Log

### Session 5 (2026-07-24)
- Fully expanded all 14 phases in `docs/Phases.md` with granular checklists, file paths, and database schemas.
- Configured mandatory AI Handshake Protocol in `docs/Memory.md` to ensure seamless context continuation across any new chat session.
- Ready to execute Phase 1 (Foundation & Auth).
