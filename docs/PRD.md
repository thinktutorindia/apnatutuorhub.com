# 📋 ThinkTutor — Product Requirements Document (PRD)

**Version:** 2.2 (AWS Ecosystem: AWS SES Email + AWS SNS Web Push + S3 Storage)  
**Platform:** Smart Tutor Matching Marketplace  
**Target Market:** India (Primary), English & Regional medium education  
**Core Tech Benchmark:** Next.js 16, React 19, Auth.js v5, Prisma 6/7, Tailwind CSS v4, AWS Ecosystem  

---

## 1. Project Overview

**ThinkTutor** is a two-sided tutoring marketplace connecting **parents seeking tuition** with **qualified tutors** via an automated, lead-based matching engine. Instead of manually browsing listings, parents post one requirement and the system surfaces it to the most relevant tutors automatically.

### Business Model
- **Coin-based lead purchase**: Tutors buy coin packages and spend coins to unlock parent contact details.
- **Parents use the platform free of charge.**
- **Revenue streams**: Coin package sales, featured tutor placements, verification badges.

---

## 2. Target Users

| Role | Who They Are | Core Need |
|------|-------------|-----------|
| **Parent** | Guardian of student (Class 1–12, JEE/NEET, Skill/Coding) | Find a verified, trusted tutor quickly without manual filtering |
| **Tutor** | Freelance or professional educator | Access relevant, high-intent leads matching subject/location |
| **Super Admin** | Platform owner/operator | Complete platform control, dynamic pricing, analytics, audit logs |
| **Sub Admin** | Support, Verification, Finance, Operations, Marketing staff | Granular role-restricted operational capabilities |

---

## 3. Platform Goals

1. **Automated Pre-Filtering**: Zero manual browsing required for parents.
2. **Precision Matching**: Tutors see ONLY leads matching their exact subject, mode, budget, and radius.
3. **Capped Competition**: Max **5 tutors** per lead to preserve lead quality and conversion.
4. **Trust & Security**: Mandatory KYC, verified badges, rating loops, and atomic coin transactions.
5. **Cost Efficiency**: Primary Auth via **Email & Google OAuth** (Phone OTP disabled to eliminate SMS costs).
6. **AWS Infrastructure**: Unified AWS suite — **AWS SES** (Email), **AWS SNS** (Web Push), **AWS S3** (KYC/Files).

---

## 4. Parent Module

### 4.1 Registration & Authentication (No Phone OTP)
- **Primary**: Email + Password & Magic Email Verification Link
- **Single-Click**: Google OAuth (Google Sign-In)
- *(Note: Mobile SMS OTP disabled to save infrastructure costs)*

### 4.2 Parent & Student Profiles
- Single Parent account manages **multiple student profiles** (for multiple children).
- Student profile data: Name, Class, Board, Subjects, Contact Email, Location Coordinates.

### 4.3 Requirement Posting Workflow
- **Mandatory Fields**: Subject(s), Class/Grade, Mode (Online/Offline/Either), Budget.
- **Optional Fields**: Board (CBSE/ICSE/State/IB), Location (mandatory for Offline), Preferred Timings, Tutor Gender Preference, Language Preference, Additional Notes.
- **Requirement Status Flow**:
  `Draft → Active → Matching → Applications Received → Booked → Completed → Closed/Expired`
- **Field Locking Rule**: Once any tutor purchases the lead, core fields (Subject, Class, Mode, Budget, Location) are **locked**. Only minor fields (Timings, Notes) can be updated.

### 4.4 Tutor Comparison & Hiring
- Applicants presented in **ranked order** based on matching engine score.
- Comparison metrics: Rating, Review Count, Experience (Years), Distance, Qualification, Verification Status, Intro Video.
- **Parent Actions**: Shortlist | Reject | Hire | Schedule Trial | Chat.

---

## 5. Tutor Module

### 5.1 Registration & KYC Verification
- Registration via Email + Password or Google OAuth.
- **Mandatory KYC before purchasing leads**: Government ID upload, Address Proof, Live Selfie to **AWS S3** private bucket.
- Admin reviews KYC → Grants **Verification Badge**.

### 5.2 Tutor Profile & Availability
- Qualifications & Degree Certificates
- Teaching Experience & Bio
- Subjects & Class Levels handled
- Teaching Radius (in km) for offline classes
- Availability Calendar & Languages Spoken
- Introduction Video (optional — grants ranking boost)

### 5.3 Tutor Dashboard & Wallet
- Live Coin Balance & Quick Top-Up
- Purchased Leads & Unlocked Parent Contact Details
- Submitted Application Tracker (Pending / Shortlisted / Rejected / Hired)
- Tutor Analytics (Leads purchased, conversion rate, average rating)

---

## 6. Wallet & Dynamic Coin Economy

### 6.1 Wallet Transaction Rules
- Wallet holds coin balance and transaction log (Purchases, Deductions, Refunds, Bonuses).
- Coin purchases via **Razorpay** (UPI, Cards, Net Banking).
- **Atomic Deductions**: Coins deducted immediately and atomically upon lead purchase.

### 6.2 Dynamic Lead Pricing Categories

| Category | Coin Cost Tier | Rationale |
|----------|---------------|-----------|
| Class 1–5 | Low | High supply, lower budget |
| Class 6–8 | Low–Medium | Moderate subject specialization |
| Class 9–10 | Medium | Board exam preparation |
| Class 11–12 | Medium–High | Higher academic stakes |
| JEE / NEET | Premium | Highly specialized competitive exam |
| CA / Professional | Premium | Niche expertise, high budget |
| Coding / Tech | Medium–High | Practical skill-based |
| Music / Arts | Medium | Creative skill-based |

> ⚠️ All coin values per tier are dynamic and controlled via Admin Settings.

### 6.3 Refund Policy
- Refunds issued **as coins only** (no cash refunds).
- Trigger: Invalid contact/email, duplicate lead, or confirmed spam.
- Request window: Must be raised within **24 hours** of purchase.

---

## 7. Notifications Matrix (AWS SES & AWS SNS)

| Trigger Event | Recipient | Channels | Service Used |
|---------------|-----------|----------|--------------|
| New Matched Lead Available | Tutor | Web Push, Email | AWS SNS + AWS SES |
| Application Status Update (Shortlisted/Hired) | Tutor | Web Push, Email | AWS SNS + AWS SES |
| New Application Received | Parent | Web Push, Email | AWS SNS + AWS SES |
| Booking Confirmed / Reminders | Parent & Tutor | Web Push, Email | AWS SNS + AWS SES |
| Low Wallet Coin Balance | Tutor | Web Push, Email | AWS SNS + AWS SES |
| KYC Review Approved/Rejected | Tutor | Email | AWS SES |
| Refund Request Status | Tutor | Email | AWS SES |

---

## 8. Automated Lead Matching Engine

### 8.1 Hard Eligibility Filters
1. Subject & Class match
2. Mode match (Online/Offline/Either)
3. Budget compatibility
4. Distance within tutor's declared radius
5. Sufficient tutor wallet balance

### 8.2 Ranking Algorithm Weights
1. **Verification Status** (Verified tutors rank highest)
2. **Proximity** (Closer tutors rank above expanded radius tutors)
3. **Rating & Reviews** (Weighted score with Bayesian average)
4. **Profile Completion & Intro Video** (Tie-breaker)

---

## 9. Admin & Role-Based Access (RBAC)

### 9.1 Super Admin Capabilities
- Full platform control: User management, Wallet overrides, KYC approvals, Pricing settings, Radius configuration, System logs, Analytics.

### 9.2 Sub Admin Operational Roles
- **Support**: Ticket resolution & read-only user profiles.
- **Verification**: Review & approve/reject KYC submissions.
- **Finance**: Wallet monitoring, payment logs, refund approvals.
- **Operations**: Lead overrides, dispute resolution.
- **Marketing**: Coupons, notifications, promotional banners.

---

## 10. Open Configuration Items

| Item | Default Value | Configurable via Admin? |
|------|---------------|------------------------|
| Max Tutors per Lead | 5 | Yes |
| Lead Lifespan | 48 Hours | Yes |
| Refund Window | 24 Hours | Yes |
| Cancellation Cutoff | 2 Hours | Yes |
| Radius Increments | 5 km steps | Yes |
