# ApnaTutorHub / ThinkTutor — Notification & Messaging Audit

## Overview
This document audits notification creation, recipient routing, push notification subscriptions, and email templates across all user events.

---

## 1. Notification Channels & Architecture
- **Channels Supported**: In-App Web (`WEB`), Email (`EMAIL` via Resend), Web Push (`PUSH` via VAPID).
- **Notification Engine**: `lib/notification-engine.ts` creates `Notification` and `NotificationDelivery` records.

---

## 2. Recipient User ID Auditing (Fix B2 Verified)
- **Database Foreign Key**: `Notification.userId` has a foreign key to `users.id`.
- **FK Mismatch Audit**:
  - `createLeadAction`: Matched tutors resolved via `tutorProfile.userId`.
  - `approveRefundAction` & `rejectRefundAction`: Refund recipient resolved via `txRecord.wallet.tutorProfile?.userId` (Fix B2 verified!).
  - `approveKycAction` & `rejectKycAction`: Tutor user ID resolved via `tutorProfile.userId`.
  - `createBookingAction`: Both parent and tutor resolved via their respective `user.id`.

---

## 3. Web Push & Email Delivery Security
- **Web Push Endpoints**: `app/api/notifications/subscribe/route.ts` and `app/api/push/subscribe/route.ts` validate authenticated `session.user.id` and save `pushSubscription` JSON safely.
- **Email Delivery**: `sendEmail` uses Resend SDK (`RESEND_API_KEY`). Fails silently without breaking core database transactions.
