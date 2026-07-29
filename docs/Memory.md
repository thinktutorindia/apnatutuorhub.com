# ThinkTutor — AI Memory & Active Session Handshake

**Last Updated:** 2026-07-26  
**Current Phase:** **PHASE 9 — Super Admin Dashboard & Governance**  
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
- **Completed Phase 2**: Parent Module & Requirement Posting — Parent layout with `ParentNav` (active-route indicators), dashboard (welcome banner, stats grid, recent requirements with status badges), profile page (`ParentProfileForm` + `StudentProfilesSection` with CRUD modal), requirement posting form (`RequirementForm` with `SubjectPicker` taxonomy, `OptionPills` class/mode/gender selectors, budget range, geolocation pin, board/timing/language preferences), `createRequirementAction` & `updateRequirementAction` & `closeRequirementAction` in `app/actions/leads.actions.ts` (8-step lifecycle: Zod validation → auth → RBAC via `lib/rbac.ts` → business rules → atomic Prisma tx → `after()` queue dispatch → cache revalidation → `ActionResult<T>`), dynamic coin pricing via `lib/lead-pricing.ts` + `lib/platform-settings.ts` (Class 1-8: 20, 9-12: 30, JEE/NEET/Coding: 50), `my-leads` list with 7 status filters & per-card edit/close/applicant actions, edit page with core-field lock rule (`purchaseCount > 0`), stub pages for bookings & applicants (Phase 6/7), `Lead.pincode` column added via `prisma db push`, and verified TypeScript compilation (`npx tsc --noEmit` passed with 0 errors, 0 lint errors).
- **Completed Phase 6**: Lead Purchase & Applicant Review — added to `app/actions/leads.actions.ts`: `purchaseLeadAction` (7-step atomic tx: status guard + KYC check + wallet balance check + deduct coins + log DEDUCTION tx + create LeadPurchase + increment purchaseCount + status transitions ACTIVE→MATCHING→APPLICATIONS_RECEIVED), `submitApplicationAction` (proposal note + fee quote on LeadPurchase), `shortlistApplicantAction` + `rejectApplicantAction` (parent toggle actions); `app/tutor/leads/page.tsx` (RSC — KYC gate, fetches tutor profile + eligible leads via Prisma pre-filter + Haversine in-memory distance filter); `components/tutor/LeadFeedClient.tsx` (client — subject/mode filter pills, sort by recent/distance/cost, lead cards with "Unlock Lead" button); `components/tutor/LeadPurchaseModal.tsx` (3-stage modal: Confirm coin cost → Purchasing spinner → Success with parent contact details copy buttons + proposal form); `app/parent/my-leads/[id]/applicants/page.tsx` (full replacement — fetches all purchases + tutor profiles, computes `calculateRankingScore` per tutor, sorts shortlisted-first/rejected-last/score-desc, shows tutor cards with rating/distance/fee/intro-video, Shortlist+Reject server action forms). `npx tsc --noEmit` 0 errors, `npm run lint` 0 errors.
- **Completed Phase 8**: Feedback Loop & Verified Ratings — `app/actions/review.actions.ts` (`submitReviewAction` with COMPLETED booking guard, participant auth check, 48-hour edit window lock, `Review` record upsert, automatic `TutorProfile.averageRating` & `totalReviews` aggregate recalculation, and path revalidation; `getMyReviewForBooking` helper); `components/reviews/StarRating.tsx` (interactive 1–5 star picker with hover states, hidden input integration); `components/reviews/ParentReviewModal.tsx` (4-category rating modal: Teaching Quality, Communication, Punctuality, Overall + written review text area); `components/reviews/TutorReviewModal.tsx` (3-category rating modal: Student Behavior, Punctuality, Overall + notes); `components/booking/BookingCard.tsx` (added "Leave a Review" / "View / Edit Review" button for COMPLETED bookings + role-specific review modal triggering); `app/parent/bookings/page.tsx` & `app/tutor/bookings/page.tsx` (batch fetching of user's existing reviews passed to `BookingCard`); `app/tutor/[id]/page.tsx` (upgraded public profile review section with rating breakdown badges, average rating summary, and "Verified Student Booking" badge). `npx tsc --noEmit` 0 errors, `npm run lint` 0 errors.
- **Next Up**: Phase 9 — Super Admin Dashboard & Governance.

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

### Session 16 (2026-07-25)
- Built entire Phase 5 — Automated Lead Matching Engine:
  - **`lib/matching-config.ts`**: Dynamic weight reader — loads `WEIGHT_KYC_VERIFIED` (500), `WEIGHT_MAX_DISTANCE` (300), `WEIGHT_BAYESIAN_RATING` (200), `WEIGHT_PROFILE_COMPLETION` (100), `RADIUS_EXPANSION_STEP_KM` (5), `RADIUS_EXPANSION_INTERVAL_HOURS` (6), `LEAD_EXPIRY_HOURS` (48), `MAX_TUTORS_PER_LEAD` (5) from `PlatformSetting` table via `getNumericSettings()`.
  - **`lib/haversine.ts`**: Haversine great-circle distance formula utility.
  - **`lib/matching-engine.ts`**: 6-filter pipeline — subject intersect, class level, mode, budget, Haversine distance ≤ teaching radius, KYC approved. Prisma `hasSome` coarse pre-filter, excludes already-purchased tutors.
  - **`lib/ranking-score.ts`**: 4-component ranking (0–1100 pts) — Verified Badge (+500), Distance Rank (+300, linear decay), Bayesian Rating (+200, C=5/m=3.0), Profile Completion (+100).
  - **`lib/queue.ts`**: Upgraded — 3 BullMQ queues (`lead-matching`, `radius-expansion`, `lead-expiry`) with dynamic `import()` for clean startup without Redis, lazy singletons, 3-retry exponential backoff.
  - **`lib/matching-dispatcher.ts`**: Dispatch glue — routes to BullMQ when Redis is available, falls back to inline `processLeadMatching()` when not.
  - **`jobs/matching.worker.ts`**: Fetches lead, runs 6-filter matching, calculates ranking scores, sorts by total descending, creates in-app `Notification` per matched tutor, transitions lead status `ACTIVE → MATCHING`.
  - **`jobs/radius-expand.worker.ts`**: Batch + single-lead expansion — finds leads past `RADIUS_EXPANSION_INTERVAL_HOURS` with `purchaseCount < maxTutors`, increments `radiusKm`, re-runs matching.
  - **`jobs/lead-expiry.worker.ts`**: Batch `updateMany` — expires leads past `expiresAt` in ACTIVE/MATCHING/APPLICATIONS_RECEIVED states.
  - **`app/actions/leads.actions.ts`**: Wired `dispatchLeadMatching()` from `lib/matching-dispatcher.ts`, replacing old Phase 2 `enqueueLeadMatching` stub.
  - **Dependencies**: Installed `bullmq` + `ioredis`.
  - **QA**: `npx tsc --noEmit` 0 errors. `npm run lint` 0 errors (pre-existing warnings only).
- Marked Phase 5 checkboxes `[x]` in `docs/Phases.md`.
- Ready to build Phase 6 (Lead Purchase & Applicant Review).

### Session 16 (2026-07-25)
- Built entire Phase 6 — Lead Purchase & Applicant Review:
  - **Actions added to `app/actions/leads.actions.ts`**: `purchaseLeadAction` (7-step atomic tx — status+KYC+balance guard, deduct coins, log DEDUCTION WalletTransaction, create LeadPurchase, increment purchaseCount, status transition ACTIVE→MATCHING→APPLICATIONS_RECEIVED), `submitApplicationAction` (proposal note + fee quote), `shortlistApplicantAction` + `rejectApplicantAction` (parent toggles).
  - **`app/tutor/leads/page.tsx`**: Full RSC — KYC gate, fetches eligible leads via Prisma `hasSome` pre-filter + Haversine in-memory distance culling (using tutor's `teachingRadius`), serialises to `FeedLead[]`.
  - **`components/tutor/LeadFeedClient.tsx`**: Client — subject dropdown + mode pill filters + sort (recent/distance/cost) + show-unlocked toggle; grid of `LeadCard` components.
  - **`components/tutor/LeadPurchaseModal.tsx`**: 3-stage modal (confirm → purchasing spinner → success+apply). Success stage shows parent name/phone/email/address with copy buttons + inline proposal form (note + fee quote) via `submitApplicationAction`.
  - **`app/parent/my-leads/[id]/applicants/page.tsx`**: Full replacement — fetches purchases + tutor profiles, computes `calculateRankingScore` using live `loadMatchingWeights`, sorts (shortlisted first, rejected last, score desc), tutor cards with KYC badge/rating/distance/fee/intro-video link, shortlist/reject inline server action forms.
  - **QA**: `npx tsc --noEmit` 0 errors. `npm run lint` 0 errors.
- Marked Phase 6 checkboxes `[x]` in `docs/Phases.md`.
- Ready to build Phase 7 (Class Booking & Scheduling).

### Session 15 (2026-07-25)
- Built entire Phase 4 — Dynamic Wallet & Coin System:
  - **`lib/razorpay.ts`**: Razorpay client singleton, `COIN_PACKAGES` (Starter 50🪙/₹500, Pro 140🪙/₹1,000 +20 bonus, Elite 380🪙/₹2,200 +80 bonus), `createRazorpayOrder`, `verifyWebhookSignature` (HMAC-SHA256 with `crypto.timingSafeEqual`), `verifyPaymentSignature`.
  - **`app/actions/wallet.actions.ts`**: `createCoinOrderAction` (session guard + Razorpay order), `creditCoinsToWallet` (atomic `prisma.$transaction` upsert wallet + `WalletTransaction`), `requestLeadRefundAction` (24h window + idempotency + REFUND_REQUEST_PENDING tx).
  - **`app/api/webhooks/razorpay/route.ts`**: POST handler — HMAC verify, idempotency check, `payment.captured` event, resolves tutor via `referenceId`, calls `creditCoinsToWallet`.
  - **`components/wallet/CoinPackageGrid.tsx`**: 3 package cards with popular badge, price-per-coin, accentBg, buy button with loading state.
  - **`components/wallet/TopUpModal.tsx`**: Loads checkout.js via `<script>` tag, `createCoinOrderAction` → `new window.Razorpay({...}).open()`, handles paying/success/error states, Escape/backdrop dismiss.
  - **`components/wallet/WalletPageClient.tsx`**: Full client component — live balance, stats (total purchased / spent), transaction history with 6-type filter pills + client-side pagination, pending-refund indicator, coin cost guide table.
  - **`app/tutor/wallet/page.tsx`**: Full RSC replacement — fetches wallet + transactions, serialises dates, renders `WalletPageClient`.
  - **QA**: `npx tsc --noEmit` 0 errors. `npm run lint` 0 errors.
- Marked Phase 4 checkboxes `[x]` in `docs/Phases.md`.
- Ready to build Phase 5 (Automated Lead Matching Engine).

### Session 14 (2026-07-25)
- Built entire Phase 3 — Tutor Profile & AWS S3 KYC Verification:
  - **AWS S3**: `lib/s3.ts` (presigned PUT/GET/DELETE, `kycObjectKey`, `certObjectKey`, `ALLOWED_MIME_TYPES`, `MAX_UPLOAD_BYTES`, `isS3Configured`). Installed `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`.
  - **API Route**: `app/api/upload/presigned-url/route.ts` — POST, session guard, tutor-profile guard, MIME whitelist (jpg/png/pdf), docType router (`id-proof`, `address-proof`, `selfie`, `cert`).
  - **Scoring**: `lib/profile-score.ts` — `calcProfileScore` / `getProfileScore` (0-100%) with point breakdown: KYC approved (+40), subjects (+3 each, max 15), classLevels (+2 each, max 10), bio ≥80 chars (+10), availability ≥3 days (+10), fees set (+5), city+lat (+5), introVideo (+5).
  - **Context/Actions**: `lib/tutor-context.ts` (auth+RBAC `kyc:upload`), `app/actions/kyc.actions.ts` (`submitKYCAction` — Zod, APPROVED guard, set PENDING), `app/actions/tutor.actions.ts` (`saveTutorProfileAction` + `saveAvailabilityAction` — both recalculate `profileScore`).
  - **Components**: `TutorNav.tsx` (active-route Link navbar), `AvailabilityGrid.tsx` (7-day toggle + time selectors, hidden inputs), `TutorProfileForm.tsx` (subjects/classLevels multi-select, qualification/exp/bio, mode+radius slider, location, fees, intro video + availability), `KYCUploadModal.tsx` (3-slot direct-to-S3 upload: presigned URL → PUT → objectKey → submit, Escape/backdrop close, 5 MB guard), `TutorProfilePage.tsx` (client shell — KYC card, form, modal).
  - **Pages**: `app/tutor/layout.tsx` (upgraded — TutorNav + 4-state KYC banner using `<Link>`), `app/tutor/dashboard/page.tsx` (profile completion ring SVG + score hints + stat cards), `app/tutor/profile/page.tsx` (RSC, passes serialised props to `TutorProfilePage`), `app/tutor/[id]/page.tsx` (public — hero, bio, YouTube embed, subjects, availability, reviews, CTA), `app/tutor/leads/page.tsx`, `app/tutor/wallet/page.tsx`, `app/tutor/bookings/page.tsx` (stub pages).
  - **QA**: `npx tsc --noEmit` 0 errors. `npm run lint` 0 errors (pre-existing auth-page warnings only).
- Marked Phase 3 checkboxes `[x]` in `docs/Phases.md`.
- Ready to build Phase 4 (Razorpay Wallet & Coin System).

### Session 13 (2026-07-25)
- Built entire Phase 2 — Parent Module & Requirement Posting:
  - **Shared plumbing**: `lib/action-result.ts` (standardised `ActionResult<T>`), `lib/form-data.ts` (FormData helpers), `lib/rbac.ts` (RBAC permission matrix), `lib/parent-context.ts` (auth+RBAC+profile resolver), `lib/platform-settings.ts` (dynamic PlatformSetting reader), `lib/lead-pricing.ts` (coin cost resolver by class tier), `lib/queue.ts` (BullMQ dispatch boundary, Phase 5 placeholder).
  - **Validations**: Rewrote `lib/validations.ts` with `SUBJECT_TAXONOMY` (grouped picker data), `INDIAN_STATES`, `LEAD_STATUS_META`, `TIMING_PREFERENCES`, `LANGUAGE_PREFERENCES`, `TUTOR_GENDER_PREFS`, refined `createLeadSchema`/`updateLockedLeadSchema`, `parentProfileSchema` (with phone), `studentProfileSchema`.
  - **Server Actions**: `app/actions/parent.actions.ts` (profile upsert, student CRUD), `app/actions/leads.actions.ts` (`createRequirementAction`, `updateRequirementAction`, `closeRequirementAction` — 8-step lifecycle, core-field lock rule, coin pricing, after() queue dispatch).
  - **UI Components**: `components/ui/SubjectPicker.tsx`, `components/ui/OptionPills.tsx`, `components/ui/FieldError.tsx`, `components/parent/ParentProfileForm.tsx`, `components/parent/StudentProfileModal.tsx`, `components/parent/StudentProfilesSection.tsx`, `components/parent/RequirementForm.tsx`, `components/parent/CloseLeadButton.tsx`, `components/parent/ParentNav.tsx`.
  - **Pages**: `app/parent/layout.tsx` (upgraded with `ParentNav`), `app/parent/dashboard/page.tsx` (stats, recent leads), `app/parent/profile/page.tsx`, `app/parent/post-requirement/page.tsx`, `app/parent/my-leads/page.tsx` (status filters), `app/parent/my-leads/[id]/edit/page.tsx` (lock-aware), `app/parent/my-leads/[id]/applicants/page.tsx` (stub), `app/parent/bookings/page.tsx` (stub).
  - **Schema**: Added `Lead.pincode` column, `@@index([parentProfileId, createdAt])`, `@@index([parentProfileId])` on `student_profiles`. Pushed to Supabase via `prisma db push`.
  - **QA**: Fixed `LogoBrand` to use `next/link`, auth layout `<a>` → `<Link>`. `npx tsc --noEmit` 0 errors, `npm run lint` 0 errors (only pre-existing warnings from Phase 1 files).
- Marked Phase 2 checkboxes `[x]` in `docs/Phases.md`.
- Ready to build Phase 3 (Tutor Profile & AWS S3 KYC Verification).

### Session 12 (2026-07-24)
- Verified Phase 1 as 100% complete (`npx tsc --noEmit` passed with 0 errors).
- Confirmed database migration, auth flows, landing page, session navbar, parent dashboard, and tutor dashboard.
- Ready to build Phase 2 (Parent Requirement Posting & Management).
