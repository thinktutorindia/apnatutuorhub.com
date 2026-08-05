/**
 * lib/activity-logger.ts
 * Enterprise Upgrade — Phase 13: User Activity & Audit Logging
 *
 * Logs structured user activity events to the `user_activity` table.
 * Records all meaningful user actions: logins, purchases, lead actions,
 * bookings, reviews, and wallet operations.
 *
 * This is separate from the admin `AuditLog` model (which tracks admin-only
 * mutations). Activity logs capture all user-facing actions platform-wide.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// ── Activity Event Types ──────────────────────────────────────────────────────

export const ActivityEvent = {
  // Auth
  USER_LOGIN: "USER_LOGIN",
  USER_LOGOUT: "USER_LOGOUT",
  PASSWORD_RESET_REQUESTED: "PASSWORD_RESET_REQUESTED",

  // Leads (Parent)
  LEAD_CREATED: "LEAD_CREATED",
  LEAD_UPDATED: "LEAD_UPDATED",
  LEAD_CLOSED: "LEAD_CLOSED",
  APPLICANT_SHORTLISTED: "APPLICANT_SHORTLISTED",
  APPLICANT_REJECTED: "APPLICANT_REJECTED",

  // Leads (Tutor)
  LEAD_PURCHASED: "LEAD_PURCHASED",
  APPLICATION_SUBMITTED: "APPLICATION_SUBMITTED",

  // Bookings
  BOOKING_CREATED: "BOOKING_CREATED",
  BOOKING_CONFIRMED: "BOOKING_CONFIRMED",
  BOOKING_RESCHEDULED: "BOOKING_RESCHEDULED",
  BOOKING_CANCELLED: "BOOKING_CANCELLED",
  BOOKING_COMPLETED: "BOOKING_COMPLETED",

  // Reviews
  REVIEW_SUBMITTED: "REVIEW_SUBMITTED",

  // Wallet
  COIN_PURCHASE_INITIATED: "COIN_PURCHASE_INITIATED",
  COIN_PURCHASE_COMPLETED: "COIN_PURCHASE_COMPLETED",
  REFUND_REQUESTED: "REFUND_REQUESTED",

  // KYC
  KYC_SUBMITTED: "KYC_SUBMITTED",

  // Profile
  PROFILE_UPDATED: "PROFILE_UPDATED",
} as const;

export type ActivityEventType = (typeof ActivityEvent)[keyof typeof ActivityEvent];

// ── Logger Function ───────────────────────────────────────────────────────────

export type LogActivityOptions = {
  userId: string;
  event: ActivityEventType;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
};

/**
 * Logs a structured activity event for a user.
 * Non-blocking — failures are swallowed to never disrupt the main action.
 */
export async function logActivity(opts: LogActivityOptions): Promise<void> {
  try {
    await prisma.userActivity.create({
      data: {
        userId: opts.userId,
        event: opts.event,
        ipAddress: opts.ipAddress ?? null,
        userAgent: opts.userAgent ?? null,
        metadata: (opts.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    // Non-blocking: activity log failures must never crash the calling action
    console.error("[activity-logger] Failed to log activity:", err);
  }
}

/**
 * Gets recent activity for a user (for user profile history page).
 */
export async function getUserActivity(
  userId: string,
  limit = 50
) {
  return prisma.userActivity.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      event: true,
      ipAddress: true,
      metadata: true,
      createdAt: true,
    },
  });
}

/**
 * Gets platform-wide activity stats for admin analytics.
 * Returns event counts grouped by type for the last 30 days.
 */
export async function getActivityStats(days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  return prisma.userActivity.groupBy({
    by: ["event"],
    where: { createdAt: { gte: since } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  });
}
