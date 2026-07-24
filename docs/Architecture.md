# ThinkTutor — Architecture Document

**Version:** 3.2 (AWS Ecosystem: AWS SES Email + AWS SNS Web Push + AWS S3 Storage)  
**App Framework:** Next.js 16 (App Router + RSC + Server Actions + Cache Directives)  
**React Version:** React 19  
**Database ORM:** Prisma 6/7 with `@prisma/adapter-pg`  
**Authentication:** Auth.js (NextAuth v5) — Email + Password & Google OAuth  
**Notification Suite:** AWS SES (Transactional Email) + AWS SNS (Web Push Alerts) + In-App Bell  
**Styling System:** Tailwind CSS v4  

---

## 1. High-Level System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      CLIENT & VIEW LAYER                         │
│   Parent Portal      │     Tutor Portal      │    Admin Panel    │
│  (Next.js 16 RSC +   │  (Next.js 16 RSC +    │ (Next.js 16 RSC + │
│   React 19 Hooks)    │   React 19 Hooks)     │  React 19 Hooks)  │
└──────────────────────────────┬───────────────────────────────────┘
                               │ React 19 Server Actions / Route Handlers
┌──────────────────────────────▼───────────────────────────────────┐
│               SERVER LAYER (Next.js 16 App Router)               │
│  auth.ts / Proxy Guard  │  'use cache' & cacheLife │  Actions    │
└──────────────────────────────┬───────────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────────┐
│                 SERVICE & BUSINESS LOGIC LAYER                   │
│   MatchingEngine   │   CoinEngine   │   AWS Notification Service │
│   RefundService    │   RatingService   │   (AWS SES + AWS SNS)   │
└──────┬───────────────────────┬──────────────────────┬────────────┘
       │                       │                      │
  ┌────▼────────┐        ┌─────▼──────┐        ┌──────▼──────┐
  │ PostgreSQL  │        │   Redis    │        │  AWS S3     │
  │ (Prisma 6/7 │        │  (Upstash/ │        │  (KYC Docs, │
  │ Pg Adapter) │        │   BullMQ)  │        │  Videos)    │
  └─────────────┘        └────────────┘        └─────────────┘
```

---

## 2. Technical Stack Specifications

### 2.1 Core Framework & Frontend
| Component | Technology | Version | Key Architecture Features |
|-----------|-----------|---------|---------------------------|
| Framework | **Next.js** | **16.x** | App Router, `'use cache'`, `cacheLife()`, `cacheTag()`, Server Actions |
| UI Library | **React** | **19.x** | `useActionState`, `useOptimistic`, `useFormStatus`, `use()` |
| Styling | **Tailwind CSS** | **v4** | `@import "tailwindcss"`, CSS-first configuration, native CSS variables |
| UI Components | **shadcn/ui** | Latest | Radix UI primitives, Tailwind v4 utility tokens |
| State Management | **Zustand** | Latest | Atomic client-side state for UI toggles & filters |
| Data Fetching | **TanStack Query** | **v5** | Object options format for client refetching & infinite scroll |
| Form Validation | **React Hook Form + Zod** | Latest | Type-safe form controls with Zod 3.x/4.x schemas |
| Real-Time Notifications | **AWS SNS + In-App Bell** | Latest | Browser push notifications & DB-backed notification badge |

### 2.2 Backend & Infrastructure
| Component | Technology | Version | Configuration / Usage |
|-----------|-----------|---------|-----------------------|
| Auth | **Auth.js (NextAuth)** | **v5** | Central `auth.ts`, Email + Password & Google OAuth (No Phone OTP) |
| Database ORM | **Prisma** | **6/7** | `provider = "prisma-client"`, `@prisma/adapter-pg` pool connection |
| Database Engine | **PostgreSQL** | Supabase | Managed Postgres with transactional isolation for wallet coins |
| Task Queue / Cache | **Upstash Redis + BullMQ** | Serverless | Background workers for Lead Matching, Radius Expansion, & Notification jobs |
| File Storage | **AWS S3** | Private | Pre-signed URL generation for KYC docs & intro videos |

### 2.3 AWS Notification & Payment Services
| Service | Provider | Usage |
|---------|---------|-------|
| Transactional Email | **AWS SES (Simple Email Service)** | High-speed, low-cost email alerts (62k free emails/mo) |
| Web Push Notifications | **AWS SNS (Simple Notification Service)** | Browser push alerts for new matched leads & hiring updates |
| In-App Notification Bell | **Prisma DB + Server Actions** | Persistent notification inbox with unread badges |
| Payment Gateway | **Razorpay** | Coin package checkout (UPI, Cards, Net Banking) & Webhook verification |

---

## 3. AWS Notification Service (`lib/aws-notification.ts`)

```typescript
// lib/aws-notification.ts
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses"
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns"
import { prisma } from "@/lib/prisma"

const ses = new SESClient({ region: process.env.AWS_REGION })
const sns = new SNSClient({ region: process.env.AWS_REGION })

export async function sendNotification({
  userId,
  email,
  title,
  message,
}: {
  userId: string
  email: string
  title: string
  message: string
}) {
  // 1. Save In-App Notification to Database
  await prisma.notification.create({
    data: {
      userId,
      title,
      message,
      read: false,
    },
  })

  // 2. Send Transactional Email via AWS SES
  const sesCommand = new SendEmailCommand({
    Source: process.env.AWS_SES_SENDER_EMAIL,
    Destination: { ToAddresses: [email] },
    Message: {
      Subject: { Data: title },
      Body: { Html: { Data: `<div style="font-family: sans-serif;"><h2>${title}</h2><p>${message}</p></div>` } },
    },
  })
  await ses.send(sesCommand)

  // 3. Send Web Push Alert via AWS SNS (if user endpoint subscribed)
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { snsEndpointArn: true } })
  if (user?.snsEndpointArn) {
    const snsCommand = new PublishCommand({
      TargetArn: user.snsEndpointArn,
      Message: JSON.stringify({ default: message, GCM: JSON.stringify({ notification: { title, body: message } }) }),
      MessageStructure: "json",
    })
    await sns.send(snsCommand)
  }
}
```
