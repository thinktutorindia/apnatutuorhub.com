# Razorpay Compliance & Activation Guide — ApnaTutorHub

## Overview
This document provides exact, step-by-step instructions to clear the Razorpay merchant activation hold and submit required business verification documents.

---

## 1. Required Document Details
- **File Name**: `Adobe Scan 21 Sept 2026.pdf` (Located in the `whattodo/` directory of your project).
- **Document Type**: Business Operating Address Proof / Rent Agreement / Utility Bill.
- **Registered Merchant Contact**:
  - Primary Contact Phone: `+91 87001 40432`
  - WhatsApp / Admin Phone: `+91 75595 63565`
  - Registered Business Name: **ApnaTutorHub** (ThinkTutor India)
  - Merchant Website URL: `https://apnatutorhub.com`

---

## 2. Step-by-Step Submission on Razorpay Dashboard

1. **Log in to Razorpay Dashboard**:
   - Visit: [https://dashboard.razorpay.com](https://dashboard.razorpay.com)
   - Login using your registered admin email & password.

2. **Navigate to the Pending Ticket / KYC Section**:
   - Go to **Support Tickets** (or check the top banner stating *"Account Activation / Documents Required"*).
   - Click on the active verification ticket regarding **Address Proof / Business Verification**.

3. **Upload the Document**:
   - Click **Upload Document / Attachment**.
   - Select the file: `whattodo/Adobe Scan 21 Sept 2026.pdf`.
   - Ensure the document preview is clearly legible.

4. **Copy & Paste the Exact Resolution Response**:
   Use the following message in the ticket reply box:

   ```text
   Dear Razorpay Compliance Team,

   Greetings from ApnaTutorHub (https://apnatutorhub.com).

   In response to your query regarding our business address verification and compliance documents, we have attached the official verification document:
   - Attached: Adobe Scan 21 Sept 2026.pdf (Business Operating Address Proof)

   Business Details:
   - Trade Name: ApnaTutorHub
   - Website URL: https://apnatutorhub.com
   - Contact Person Phone: +91 87001 40432 / +91 75595 63565
   - Contact Email: support@apnatutorhub.com / admin@apnatutorhub.com

   Please review the attached document and reactivate our payment gateway services at the earliest.

   Thank you,
   ApnaTutorHub Operations Team
   ```

5. **Follow-Up via Priority Support**:
   - If response is delayed beyond 24 hours, request callback on `+91 87001 40432` via Razorpay Merchant App or WhatsApp Support.

---

## 3. Webhook & API Verification Check
Once the ticket is approved, verify your live keys in `.env`:
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`

Webhook URL to configure in Razorpay Dashboard:
- `https://apnatutorhub.com/api/webhooks/razorpay`
- Active events: `payment.captured`, `order.paid`.
