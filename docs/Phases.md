# ThinkTutor — Build Phases

**Version:** 3.1 (Email Auth, Web & Email Notifications Plan)  
**Strategy:** Build incrementally. Each phase is independently testable and deployable.

---

## Phase Overview

| Phase | Name | Duration (Est.) | Tech Specs | Status |
|-------|------|----------------|------------|--------|
| 1 | Foundation & Auth | 1 week | Next.js 16, React 19, Auth.js v5 (Email & Google), Tailwind v4 | TODO |
| 2 | Parent Module | 1 week | Next.js 16 RSC, Zod, Google Maps API | TODO |
| 3 | Tutor Profile & KYC | 1 week | AWS S3 Signed URLs, Prisma 6/7, React 19 Forms | TODO |
| 4 | Wallet & Coin System | 1 week | Razorpay Webhooks, Atomic Prisma Transactions | TODO |
| 5 | Lead Matching Engine | 2 weeks | BullMQ Workers, Upstash Redis, Matching Algorithm | TODO |
| 6 | Lead Purchase & Applications | 1 week | Next.js 16 Server Actions, React 19 `useActionState` | TODO |
| 7 | Booking Workflow | 1 week | Next.js 16 App Router, Trial & Regular Classes | TODO |
| 8 | Feedback & Ratings | 3-4 days | Bayesian Average Rating, Review Locks | TODO |
| 9 | Admin Panel (Super Admin) | 2 weeks | Next.js 16 `'use cache'`, Admin Dashboard UI | TODO |
| 10 | Sub Admin & RBAC | 1 week | Role-Based Guard (`proxy.ts`), Audit Logs | TODO |
| 11 | Notifications (Web & Email) | 1 week | Resend Email, Pusher In-App Notifications, Web Push | TODO |
| 12 | Rewards & Loyalty | 1 week | Coupon Engine, Milestone Bonuses, Referrals | TODO |
| 13 | Analytics & Reports | 1 week | TanStack Query v5, CSV Exporters | TODO |
| 14 | QA, Polish & Launch | 2 weeks | Vercel Deployment, Sentry, Performance Audit | TODO |

---

## Phase 1 — Foundation & Auth

**Goal:** Initialize Next.js 16 workspace with React 19, Tailwind CSS v4, Prisma 6/7, and Auth.js v5 (Email + Google OAuth).

### Tasks
- [ ] Initialize Next.js 16 project with React 19 & TypeScript
- [ ] Set up Tailwind CSS v4 with `@import "tailwindcss";` and shadcn/ui primitives
- [ ] Set up Prisma 6/7 schema + `@prisma/adapter-pg` driver adapter singleton (`lib/prisma.ts`)
- [ ] Configure Auth.js v5 (`auth.ts`) with:
  - Email + Password registration & login
  - Google OAuth single-click login
  - *(Note: Phone OTP disabled to avoid SMS costs)*
- [ ] Implement `proxy.ts` / route middleware for role-based redirects (`PARENT`, `TUTOR`, `SUPER_ADMIN`, `SUB_ADMIN`)
- [ ] Build UI pages: Login, Register, Password Reset
- [ ] Deploy initial foundation to Vercel + Supabase Postgres + Upstash Redis

---

## Phase 11 — Notifications System (Web & Email Only)

**Goal:** Real-time in-app notifications and transactional emails (Resend).

### Tasks
- [ ] Set up Resend API client for email dispatching
- [ ] Design HTML email templates (New Lead Alert, Application Status, Booking Confirmation)
- [ ] Set up Pusher / Web Push for real-time browser notifications
- [ ] In-app Notification Bell dropdown component with unread badges
- [ ] Notification history list page
- [ ] Admin broadcast email tool
