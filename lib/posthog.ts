// lib/posthog.ts
// Phase 14 — PostHog product analytics client (server-side)

import { PostHog } from "posthog-node";

let _client: PostHog | null = null;

export function getPostHogClient(): PostHog | null {
  if (!process.env.POSTHOG_API_KEY) return null;

  if (!_client) {
    _client = new PostHog(process.env.POSTHOG_API_KEY, {
      host: process.env.POSTHOG_HOST ?? "https://app.posthog.com",
      flushAt: 10,
      flushInterval: 5000,
    });
  }

  return _client;
}

/**
 * Capture a server-side analytics event.
 * All calls are fire-and-forget; errors are silently swallowed.
 */
export function captureEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>
) {
  try {
    const client = getPostHogClient();
    client?.capture({ distinctId, event, properties });
  } catch {
    // Never block core operations due to analytics failures
  }
}

// ── Named Events ──────────────────────────────────────────────────────────────

export const Events = {
  // Auth
  USER_SIGNED_UP: "user_signed_up",
  USER_LOGGED_IN: "user_logged_in",

  // Leads
  LEAD_POSTED: "lead_posted",
  LEAD_CLOSED: "lead_closed",
  LEAD_UNLOCKED: "lead_unlocked",

  // Applications & Bookings
  APPLICATION_SUBMITTED: "application_submitted",
  TUTOR_SHORTLISTED: "tutor_shortlisted",
  BOOKING_CREATED: "booking_created",
  BOOKING_COMPLETED: "booking_completed",

  // Wallet & Payments
  COIN_PACKAGE_PURCHASED: "coin_package_purchased",
  COUPON_APPLIED: "coupon_applied",

  // KYC
  KYC_SUBMITTED: "kyc_submitted",
  KYC_APPROVED: "kyc_approved",
  KYC_REJECTED: "kyc_rejected",

  // Referral
  REFERRAL_LINK_COPIED: "referral_link_copied",
  REFERRAL_REWARDED: "referral_rewarded",
} as const;
