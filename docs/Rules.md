# ThinkTutor — AI Development Rules & Tech Constraints

**Version:** 3.2 (AWS Ecosystem: AWS SES Email + AWS SNS Web Push + S3 Storage)  
**Purpose:** Sets hard engineering boundaries for the AI assistant and developer team.

---

## 1. Tech Stack Rules — Mandatory Baseline

| Layer | Allowed Technology | Strict Exclusions (DO NOT USE) |
|-------|----------------───|----------------────────────────|
| Framework | **Next.js 16 (App Router)** | Next.js Pages Router, Create React App, Vite |
| UI Library | **React 19** | Legacy React 18 APIs |
| Auth | **Auth.js (NextAuth v5)** via `auth.ts` (Email + Password & Google OAuth) | Phone SMS OTP (disabled for cost reduction), Custom JWT |
| ORM | **Prisma 6/7** (`@prisma/adapter-pg`) | TypeORM, Sequelize, raw SQL strings |
| Database | **PostgreSQL** (Supabase / Managed) | MongoDB, MySQL, SQLite |
| Styling | **Tailwind CSS v4** + **shadcn/ui** | Bootstrap, Material UI, Tailwind v3 config files |
| State | **Zustand** (client UI state) | Redux, global React Context for heavy state |
| Data Fetching | **TanStack Query v5** / RSC `async` | SWR, legacy `useEffect` data fetching |
| Forms | **React Hook Form + Zod** | Formik, Yup |
| Payments | **Razorpay** | Stripe, PayPal |
| Email Alerts | **AWS SES (Simple Email Service)** | SendGrid, Nodemailer (AWS SES preferred for low cost) |
| Web Push Alerts | **AWS SNS (Simple Notification Service)** + In-App Bell | SMS Gateway (Twilio / MSG91), WhatsApp BSP |
| Background Jobs | **BullMQ + Upstash Redis** | `node-cron`, `setInterval` for critical background jobs |
| File Storage | **AWS S3** | Local disk storage for uploads |

---

## 2. Authentication & Security Rules

- Primary login MUST use **Email + Password** or **Google OAuth**.
- Phone SMS OTP is explicitly disabled to avoid SMS costs. Do NOT add SMS OTP dependencies.
- Store KYC docs in private AWS S3 buckets — generate short-lived signed URLs for Admin verification.
- Retrieve active session inside actions/pages using `await auth()` from `@/auth`.
- Enforce permissions with `forbidden()` or `redirect()` from `next/navigation`.

---

## 3. Notification Rules (AWS SES + AWS SNS)

- Notifications MUST be delivered via:
  1. **AWS SES**: Transactional emails for lead alerts, booking status, receipts.
  2. **AWS SNS**: Web browser push alerts for active users.
  3. **In-App Notification Bell**: Persistent notifications stored in DB (`notifications` table).
- Do NOT invoke SMS APIs or WhatsApp APIs in notification dispatchers.

---

## 4. Wallet & Security Rules (CRITICAL)

- Coin deductions MUST be atomic (`prisma.$transaction`).
- Balance check MUST happen server-side BEFORE lead purchase proceeds.
- Refunds are issued **AS COINS ONLY**. Cash/card refund flows are strictly prohibited.
- Unpurchased leads MUST NOT expose parent contact details to tutors.
- Maximum competing tutors per lead (default 5) MUST be read from Admin Settings table.
