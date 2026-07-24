# ThinkTutor — Comprehensive Granular Implementation Plan

**Version:** 4.0 (Complete 14-Phase Production Plan)  
**Target Stack:** Next.js 16 (App Router, RSC, Server Actions, `'use cache'`), React 19, Auth.js v5, Prisma 6/7, Tailwind CSS v4, AWS Suite (SES, SNS, S3), BullMQ + Upstash Redis  

> 🤖 **INSTRUCTION FOR AI AGENTS (ANY CHAT SESSION):**
> 1. Read this file along with `Memory.md` to instantly identify which phase is current.
> 2. Mark checkboxes `[x]` as you complete tasks. Never guess code paths — follow the specified filenames below.
> 3. Verify each completed phase with build/type checks before updating `Memory.md` and proceeding to the next.

---

## 📊 Master Build Phase Matrix

| Phase | Phase Name | Status | Key Deliverable Files |
|-------|------------|--------|-----------------------|
| **1** | Foundation, App Router & Auth | ⏳ NEXT UP | `auth.ts`, `proxy.ts`, `lib/prisma.ts`, `app/(auth)/*` |
| **2** | Parent Module & Requirement Posting | ⏹️ TODO | `app/(parent)/*`, `app/actions/leads.actions.ts` |
| **3** | Tutor Profile & AWS S3 KYC | ⏹️ TODO | `app/(tutor)/profile/*`, `lib/s3.ts`, `app/actions/kyc.actions.ts` |
| **4** | Dynamic Wallet & Coin System | ⏹️ TODO | `app/(tutor)/wallet/*`, `lib/razorpay.ts`, `app/actions/wallet.actions.ts` |
| **5** | Automated Lead Matching Engine | ⏹️ TODO | `lib/matching-engine.ts`, `jobs/matching.worker.ts`, `jobs/radius-expand.worker.ts` |
| **6** | Lead Purchase & Applicant Review | ⏹️ TODO | `app/(tutor)/leads/*`, `app/(parent)/dashboard/applicants/*` |
| **7** | Class Booking & Scheduling Workflow | ⏹️ TODO | `app/actions/booking.actions.ts`, `components/booking/*` |
| **8** | Feedback Loop & Verified Ratings | ⏹️ TODO | `app/actions/review.actions.ts`, `components/reviews/*` |
| **9** | Super Admin Dashboard & Governance | ⏹️ TODO | `app/(admin)/*`, `app/actions/admin.actions.ts` |
| **10** | Sub Admin Roles & RBAC Protection | ⏹️ TODO | `lib/rbac.ts`, `proxy.ts`, `app/(admin)/sub-admins/*` |
| **11** | AWS Notification Suite | ⏹️ TODO | `lib/aws-notification.ts`, `components/NotificationBell.tsx` |
| **12** | Rewards, Coupons & Loyalty Engine | ⏹️ TODO | `lib/rewards-engine.ts`, `app/actions/coupon.actions.ts` |
| **13** | Analytics, Reporting & Exporters | ⏹️ TODO | `app/(admin)/analytics/*`, `lib/csv-exporter.ts` |
| **14** | Hardening, QA & Production Launch | ⏹️ TODO | `.env.production`, Sentry Config, Vercel Setup |

---

## 🛠️ Phase 1 — Foundation, App Router & Auth System

**Goal:** Establish Next.js 16 project shell, React 19 UI system, Prisma 6/7 database client, and Auth.js v5 (Email + Google OAuth).

### Detailed Tasks
- [ ] Initialize Next.js 16 app structure (`app/`, `components/`, `lib/`, `types/`)
- [ ] Configure Tailwind CSS v4 in `app/globals.css` with `@import "tailwindcss";` and `@theme` brand colors
- [ ] Install shadcn/ui primitives (`button`, `input`, `card`, `dialog`, `badge`, `avatar`, `dropdown-menu`, `toast`)
- [ ] Create Prisma 6/7 schema (`prisma/schema.prisma`) with `User`, `StudentProfile`, `TutorProfile`, `Wallet` models
- [ ] Implement Prisma Singleton Client in `lib/prisma.ts` using `@prisma/adapter-pg`
- [ ] Configure Auth.js v5 in `auth.ts` with:
  - Email + Password credentials provider (with `bcryptjs` password hashing)
  - Google OAuth provider
  - JWT session callback attaching `id` and `role` (`PARENT | TUTOR | SUPER_ADMIN | SUB_ADMIN`)
- [ ] Create route handler at `app/api/auth/[...nextauth]/route.ts`
- [ ] Implement route protection guard in `proxy.ts` / middleware restricting role routes (`/parent/*`, `/tutor/*`, `/admin/*`)
- [ ] Build UI Pages:
  - `app/(auth)/login/page.tsx`
  - `app/(auth)/register/page.tsx`
  - `app/(auth)/forgot-password/page.tsx`
- [ ] Create environment configuration template `.env.example`

---

## 🛠️ Phase 2 — Parent Module & Requirement Posting

**Goal:** Parents manage student profiles and post tuition requirements with interactive forms and location tagging.

### Detailed Tasks
- [ ] Build Parent Layout Shell (`app/(parent)/layout.tsx`) with sidebar navigation and profile summary
- [ ] Create Parent Profile Page (`app/(parent)/profile/page.tsx`) to manage name, email, phone, city
- [ ] Create Student Profile Component (`components/parent/StudentProfileModal.tsx`) to manage multiple children profiles
- [ ] Build Requirement Posting Form (`app/(parent)/post-requirement/page.tsx`) using React 19 `useActionState`:
  - Subject taxonomy selector (Multi-select dropdown)
  - Class/Grade tier picker (Class 1-5, 6-8, 9-10, 11-12, JEE/NEET, CA, Coding, Arts)
  - Mode selector (Online, Offline, Either)
  - Budget range inputs (Min & Max fee validation)
  - Google Maps Places API Autocomplete for offline address coordinates (Lat/Lng)
  - Optional fields: Board, Timings, Tutor Gender Preference, Language Preference, Free-text Notes
- [ ] Implement Server Action `createRequirementAction` in `app/actions/leads.actions.ts`:
  - Validate parameters with Zod schema `createLeadSchema`
  - Store lead record in Prisma with status `ACTIVE`
  - Trigger BullMQ background matching job
- [ ] Build Parent Requirements List (`app/(parent)/my-leads/page.tsx`) with status badge indicators (`ACTIVE`, `MATCHING`, `APPLICATIONS_RECEIVED`, `BOOKED`, `COMPLETED`, `EXPIRED`)
- [ ] Implement lead editing rules: Lock core fields (Subject, Class, Mode, Budget, Location) if lead has tutor purchases

---

## 🛠️ Phase 3 — Tutor Profile & AWS S3 KYC Verification

**Goal:** Tutors build rich teaching profiles and upload mandatory KYC documents for Admin verification.

### Detailed Tasks
- [ ] Build Tutor Layout Shell (`app/(tutor)/layout.tsx`)
- [ ] Implement AWS S3 helper in `lib/s3.ts` using `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`
- [ ] Create Pre-signed URL API route (`app/api/upload/presigned-url/route.ts`) for secure file uploads (max 5MB, PDF/JPG/PNG)
- [ ] Build Tutor Profile Form (`app/(tutor)/profile/page.tsx`):
  - Qualification & Degree certificates upload
  - Teaching experience (Years) & bio text
  - Subjects handled & class levels covered checkboxes
  - Teaching radius slider (1 km to 25 km for offline tuition)
  - Interactive Availability Weekly Calendar Grid
  - Introduction Video upload / YouTube embed link
- [ ] Build Tutor KYC Verification Form (`components/tutor/KYCUploadModal.tsx`):
  - Government ID Proof upload (Aadhaar / PAN / Passport)
  - Address Proof upload
  - Live Selfie capture / upload
- [ ] Create Server Action `submitKYCAction` in `app/actions/kyc.actions.ts` setting `kycStatus = PENDING`
- [ ] Build Tutor Profile Completion Score Calculator (`lib/profile-score.ts`)
- [ ] Build Tutor Public Profile View (`app/tutor/[id]/page.tsx`) for parent review

---

## 🛠️ Phase 4 — Dynamic Wallet & Coin System

**Goal:** Tutors purchase coin packages via Razorpay and manage coin wallet transactions.

### Detailed Tasks
- [ ] Add `Wallet`, `WalletTransaction`, and `CoinPackage` Prisma models
- [ ] Create Razorpay server wrapper in `lib/razorpay.ts`
- [ ] Build Coin Package Cards Component (`components/wallet/CoinPackageGrid.tsx`) with dynamic bonus badges
- [ ] Build Razorpay Order Creation Server Action `createCoinOrderAction` in `app/actions/wallet.actions.ts`
- [ ] Implement Razorpay Webhook Handler (`app/api/webhooks/razorpay/route.ts`):
  - Verify Razorpay HMAC-SHA256 signature
  - Credit coins to tutor wallet upon payment success inside atomic `prisma.$transaction`
  - Record transaction log (`type: PURCHASE`, `amount: coins`)
- [ ] Build Tutor Wallet Page (`app/(tutor)/wallet/page.tsx`):
  - Current coin balance card
  - Transaction history data table with filters (Purchases, Deductions, Refunds, Bonuses)
  - Quick Top-Up button
- [ ] Implement Coin Refund Request Server Action `requestLeadRefundAction`:
  - Validate 24-hour purchase window
  - Submit request for Admin review (Status: `PENDING_REVIEW`)

---

## 🛠️ Phase 5 — Automated Lead Matching Engine

**Goal:** Automated background engine matches posted requirements with eligible tutors, calculates ranking scores, and handles auto-radius expansion.

### Detailed Tasks
- [ ] Configure BullMQ worker queues in `lib/queue.ts` backed by Upstash Redis
- [ ] Build Core Matching Algorithm in `lib/matching-engine.ts`:
  - **Filter 1**: Subject match (`tutor.subjects INTERSECT lead.subjects`)
  - **Filter 2**: Class match (`tutor.classes CONTAINS lead.class`)
  - **Filter 3**: Mode match (`Online | Offline | Either`)
  - **Filter 4**: Budget compatibility (`tutor.feeMin <= lead.budgetMax`)
  - **Filter 5**: Distance filter (Haversine formula distance <= `tutor.teachingRadius`)
  - **Filter 6**: Wallet balance check (`tutor.wallet.balance >= lead.coinCost`)
- [ ] Implement Ranking Score Formula (`lib/ranking-score.ts`):
  - `Verified Badge (+500 pts)`
  - `Distance Rank (Inverse km, up to +300 pts)`
  - `Average Rating & Review Count (Bayesian weighted, up to +200 pts)`
  - `Profile Completion & Intro Video (+100 pts)`
- [ ] Create Background Workers:
  - `jobs/matching.worker.ts`: Process new leads & alert eligible tutors
  - `jobs/radius-expand.worker.ts`: Check 25% expiry checkpoint; expand radius (+5 km step) if purchases < 5
  - `jobs/lead-expiry.worker.ts`: Archive leads reaching 48h lifespan window
- [ ] Build Admin Matching Configuration Reader (`lib/matching-config.ts`) to pull weights dynamically from DB settings

---

## 🛠️ Phase 6 — Lead Purchase & Applicant Review

**Goal:** Tutors view matched leads, unlock parent contact details using coins, and apply. Parents compare applicants side-by-side.

### Detailed Tasks
- [ ] Build Matched Lead Feed (`app/(tutor)/leads/page.tsx`):
  - Display only eligible leads matching tutor profile
  - Filter bar: Subject, Mode, Distance, Coin Cost
  - Lead Card showing class, subject, city area, budget, distance, coin cost
- [ ] Implement Lead Purchase Server Action `purchaseLeadAction` in `app/actions/leads.actions.ts`:
  - Execute atomic `prisma.$transaction`:
    1. Verify lead status != `CLOSED` and purchases count < `maxTutorsPerLead` (5)
    2. Verify tutor has not already purchased
    3. Check wallet balance >= lead coin cost
    4. Deduct coins from wallet
    5. Log `WalletTransaction` (`type: DEDUCTION`)
    6. Record `LeadPurchase`
    7. Unlock parent contact details for tutor
- [ ] Build Tutor Application Modal (`components/tutor/ApplyLeadModal.tsx`) to submit proposal notes & fee quote
- [ ] Build Parent Applicant Dashboard (`app/(parent)/my-leads/[id]/applicants/page.tsx`):
  - Display unlocked tutor applications in ranked order
  - Tutor card comparison metrics: Rating, Reviews, Experience, Distance, Qualification, Verification Badge, Intro Video
  - Parent action buttons: Shortlist, Reject, Hire, Schedule Trial, Chat
- [ ] Implement Real-time Lead Status Transitions (`ACTIVE → PARTIALLY_PURCHASED → FULLY_PURCHASED → CLOSED`)

---

## 🛠️ Phase 7 — Class Booking & Scheduling Workflow

**Goal:** Handle trial class booking, regular hiring, Google Meet/Zoom link sharing, and schedule management.

### Detailed Tasks
- [ ] Create `Booking` Prisma model with statuses (`REQUESTED`, `CONFIRMED`, `RESCHEDULED`, `COMPLETED`, `CANCELLED`)
- [ ] Build Hire & Schedule Action `createBookingAction` in `app/actions/booking.actions.ts`:
  - Select Trial vs. Regular Booking
  - Set start date, time slots, and class frequency
- [ ] Build Online Class Link Sharing Modal (`components/booking/ClassLinkModal.tsx`) for tutors to input Google Meet/Zoom links
- [ ] Build Offline Venue Confirmation Card (`components/booking/VenueConfirmationCard.tsx`) showing verified address details
- [ ] Implement Reschedule Request Flow (`app/actions/booking.actions.ts`):
  - Propose new date/time → Counterparty accepts/declines
- [ ] Implement Cancellation Cutoff Enforcement (2-hour limit before start time)
- [ ] Build Parent & Tutor Bookings Schedule Dashboard (`app/bookings/page.tsx`)

---

## 🛠️ Phase 8 — Feedback Loop & Verified Ratings

**Goal:** Verified completed bookings trigger mutual rating requests. Ratings directly update tutor ranking scores.

### Detailed Tasks
- [ ] Create `Review` Prisma model linked to `Booking` ID
- [ ] Build Rating Trigger Guard: Unlock review prompt ONLY when `booking.status == COMPLETED`
- [ ] Build Parent Review Modal (`components/reviews/ParentReviewModal.tsx`):
  - Star ratings for: Teaching Quality, Communication, Punctuality, Overall Experience
  - Written review text area
- [ ] Build Tutor Review Modal (`components/reviews/TutorReviewModal.tsx`):
  - Star ratings for: Communication, Student Behaviour, Overall Experience
- [ ] Create Submit Review Server Action `submitReviewAction` in `app/actions/review.actions.ts`:
  - Store review record
  - Enforce 48-hour lock on review editing
  - Recalculate tutor's aggregate rating & review count inside Prisma
  - Update tutor's matching engine ranking score
- [ ] Display verified reviews on Tutor Public Profile (`app/tutor/[id]/page.tsx`) with "Verified Student Booking" badge

---

## 9 — Super Admin Dashboard & Governance

**Goal:** Super Admin manages all users, approves KYC, configures dynamic pricing, and monitors GMV.

### Detailed Tasks
- [ ] Build Admin Layout Shell (`app/(admin)/layout.tsx`) with dark sidebar theme
- [ ] Build Admin KPI Overview Dashboard (`app/(admin)/dashboard/page.tsx`) using Next.js 16 `'use cache'` and `cacheLife('minutes')`:
  - Active Leads count, Total GMV, Total Tutors, Total Parents, Wallet Balances total
  - Revenue & Lead conversion graphs
- [ ] Build User Management Page (`app/(admin)/users/page.tsx`):
  - List, search, filter, view, suspend, or reactivate Parent & Tutor accounts
- [ ] Build KYC Verification Approval Queue (`app/(admin)/kyc/page.tsx`):
  - Review uploaded ID proof, Address proof, and Selfie via private S3 signed URLs
  - Action: Approve (grant Verification Badge) or Reject (with feedback reason)
- [ ] Build Lead Management Page (`app/(admin)/leads/page.tsx`):
  - View all platform leads, manually close, expire, reassign, or force radius expansion
- [ ] Build Wallet & Refund Oversight Page (`app/(admin)/wallets/page.tsx`):
  - View tutor wallet balances, manually credit/debit bonus coins, approve/reject coin refund requests
- [ ] Build Dynamic Platform Settings Page (`app/(admin)/settings/page.tsx`):
  - Configure lead pricing coins per tier (Class 1-5, 6-8, 9-10, 11-12, JEE/NEET, CA, Coding)
  - Configure max tutors per lead (default 5), radius increment step (default 5 km), lead expiry hours (default 48h)
- [ ] Build Audit Log Viewer (`app/(admin)/audit-logs/page.tsx`) tracking all admin actions

---

## 🛠️ Phase 10 — Sub Admin Roles & RBAC Protection

**Goal:** Implement granular role-based access for Support, Verification, Finance, Operations, Marketing staff.

### Detailed Tasks
- [ ] Define RBAC permission matrix in `lib/rbac.ts` for roles (`SUPPORT`, `VERIFICATION`, `FINANCE`, `OPERATIONS`, `MARKETING`)
- [ ] Build Sub Admin Management UI (`app/(admin)/sub-admins/page.tsx`) for Super Admin to create sub-admin accounts & assign module permissions
- [ ] Enforce route protection in `proxy.ts` middleware checking sub-admin module permissions
- [ ] Restrict UI navigation links based on sub-admin active role
- [ ] Ensure all sub-admin actions automatically append entries to `AuditLog` table

---

## 🛠️ Phase 11 — AWS Notification Suite (SES & SNS)

**Goal:** Unified AWS notifications: AWS SES for email alerts, AWS SNS for web browser push, and database-backed in-app notification bell.

### Detailed Tasks
- [ ] Create AWS Notification Helper in `lib/aws-notification.ts` using `@aws-sdk/client-ses` and `@aws-sdk/client-sns`
- [ ] Configure AWS SES verified domain / sender identity (`process.env.AWS_SES_SENDER_EMAIL`)
- [ ] Build HTML Email Templates using React Email:
  - `NewMatchedLeadEmail.tsx` (sent to tutors when a new matching lead is posted)
  - `ApplicationStatusEmail.tsx` (sent to tutors when shortlisted/hired)
  - `NewApplicantEmail.tsx` (sent to parents when a tutor applies)
  - `BookingConfirmationEmail.tsx` (sent to both parties)
- [ ] Configure AWS SNS Web Push subscription handler (`app/api/notifications/subscribe/route.ts`) to store browser endpoint ARNs
- [ ] Build In-App Notification Bell Component (`components/NotificationBell.tsx`):
  - Unread badge counter
  - Dropdown listing recent notifications
  - Mark as read Server Action
- [ ] Build User Notification History Page (`app/notifications/page.tsx`)
- [ ] Build Admin Broadcast Notification Tool (`app/(admin)/notifications/broadcast/page.tsx`)

---

## 🛠️ Phase 12 — Rewards, Coupons & Loyalty Engine

**Goal:** Parent discount coupons, tutor milestone coin bonuses, and referral rewards.

### Detailed Tasks
- [ ] Create `Coupon` and `Referral` Prisma models
- [ ] Build Coupon Management UI (`app/(admin)/coupons/page.tsx`) for Admin to create percentage/flat discount codes
- [ ] Build Parent Checkout Coupon Applicator (`components/parent/CouponInput.tsx`)
- [ ] Build Tutor Milestone Reward Worker (`lib/milestone-tracker.ts`):
  - Auto-credit bonus coins to tutor wallet upon reaching booking milestones (e.g. 10 completed bookings)
- [ ] Build Referral Program System (`app/referrals/page.tsx`):
  - Unique referral link generator for tutors
  - Credit referral bonus coins to both referrer & referee once referee completes KYC verification
- [ ] Build Featured Tutor Badge System (auto-assigned to top 5% highest-rated tutors)

---

## 🛠️ Phase 13 — Analytics, Reporting & Data Exporters

**Goal:** Business intelligence dashboards and CSV exporters for operational analysis.

### Detailed Tasks
- [ ] Build Admin Analytics Charts (`app/(admin)/analytics/page.tsx`) using Recharts:
  - Monthly GMV & Coin Sales revenue line chart
  - Matching Engine Fill Rate bar chart (Leads filled vs. Expired)
  - Category-wise Lead Demand pie chart
- [ ] Build Tutor Analytics Widget (`app/(tutor)/dashboard/analytics.tsx`):
  - Lead purchase conversion rate, profile views, rating progression
- [ ] Build CSV Exporter Utility in `lib/csv-exporter.ts`
- [ ] Add Export CSV buttons to Admin tables (Users, Payments, Leads, Tutor Ratings)

---

## 🛠️ Phase 14 — Hardening, QA & Production Launch

**Goal:** Security auditing, performance tuning, error monitoring, and production deployment.

### Detailed Tasks
- [ ] Conduct security audit: RBAC enforcement, atomic transaction checks, input sanitization
- [ ] Perform performance audit: Next.js 16 bundle analyzer, Lighthouse score optimization (target > 90)
- [ ] Configure Sentry error monitoring (`sentry.server.config.ts`, `sentry.client.config.ts`)
- [ ] Configure PostHog product analytics integration
- [ ] Run load test on lead purchase endpoint to ensure no race conditions under high concurrency
- [ ] Set up production environment on Vercel + Supabase Postgres + Upstash Redis
- [ ] Create backup & disaster recovery runbook (`docs/Runbook.md`)
