# ThinkTutor — Architecture Document

**Version:** 3.1 (Web & Email Notification Scope, Email + Google Auth)  
**App Framework:** Next.js 16 (App Router + RSC + Server Actions + Cache Directives)  
**React Version:** React 19  
**Database ORM:** Prisma 6/7 with `@prisma/adapter-pg`  
**Authentication:** Auth.js (NextAuth v5) — Email + Password & Google OAuth  
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
│   MatchingEngine   │   CoinEngine   │   NotificationService      │
│   RefundService    │   RatingService   │   (Web Push & Resend Email)│
└──────┬───────────────────────┬──────────────────────┬────────────┘
       │                       │                      │
  ┌────▼────────┐        ┌─────▼──────┐        ┌──────▼──────┐
  │ PostgreSQL  │        │   Redis    │        │  File Store │
  │ (Prisma 6/7 │        │  (Upstash/ │        │  (AWS S3 /  │
  │ Pg Adapter) │        │   BullMQ)  │        │ Cloudflare) │
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
| Real-time Web Notifications | **Pusher / Web Push API** | Latest | In-app real-time lead alerts & applicant updates |

### 2.2 Backend & Infrastructure
| Component | Technology | Version | Configuration / Usage |
|-----------|-----------|---------|-----------------------|
| Auth | **Auth.js (NextAuth)** | **v5** | Central `auth.ts`, Email + Password & Google OAuth (No Phone OTP) |
| Database ORM | **Prisma** | **6/7** | `provider = "prisma-client"`, `@prisma/adapter-pg` pool connection |
| Database Engine | **PostgreSQL** | Supabase | Managed Postgres with transactional isolation for wallet coins |
| Task Queue / Cache | **Upstash Redis + BullMQ** | Serverless | Background workers for Lead Matching, Radius Expansion, and Email/Web jobs |
| File Storage | **AWS S3 / Cloudflare R2** | Private | Pre-signed URL generation for KYC docs & intro videos |

### 2.3 Messaging & Payments Services
| Service | Provider | Usage |
|---------|---------|-------|
| Payment Gateway | **Razorpay** | Coin package checkout (UPI, Cards, Net Banking) & Webhook verification |
| Email Notifications | **Resend** | Transactional emails for lead alerts, booking confirmations, and receipts |
| Web Notifications | **Pusher / Web Push** | Real-time in-app notification bell & browser push notifications |

---

## 3. Auth.js v5 Setup (`auth.ts`) — Email & Google Only

```typescript
// auth.ts
import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })

        if (!user || !user.passwordHash) return null

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        )

        if (!isValid) return null

        return { id: user.id, email: user.email, name: user.name, role: user.role }
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub
        session.user.role = token.role as string
      }
      return session
    },
  },
})
```

---

## 4. Notification Service (`lib/notification-service.ts`)

```typescript
// lib/notification-service.ts
import { Resend } from "resend"
import { PusherServer } from "pusher"

const resend = new Resend(process.env.RESEND_API_KEY)

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
  // 1. Web / In-App Notification via Pusher
  await pusher.trigger(`user-${userId}`, "notification", {
    title,
    message,
    timestamp: new Date().toISOString(),
  })

  // 2. Email Notification via Resend
  await resend.emails.send({
    from: "ThinkTutor Alerts <alerts@thinktutor.com>",
    to: email,
    subject: title,
    html: `<div style="font-family: sans-serif;"><h2>${title}</h2><p>${message}</p></div>`,
  })
}
```
