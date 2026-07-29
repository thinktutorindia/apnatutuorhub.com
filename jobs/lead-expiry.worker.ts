// Lead Expiry Worker — Phase 5
//
// Archives leads that have exceeded their 48-hour lifespan window.
//
// Business rule (docs/Phases.md §6.2):
//   - Leads auto-expire after `LEAD_EXPIRY_HOURS` (default 48h) if unfilled.
//   - Status transitions to `EXPIRED`.
//   - Already closed/completed/expired leads are left untouched.

import { prisma } from "@/lib/prisma";

/**
 * Batch-expires all leads past their `expiresAt` timestamp.
 * Called by the scheduled cron or BullMQ repeatable job (every hour).
 */
export async function processLeadExpiry(): Promise<{ expiredCount: number }> {
  const now = new Date();

  // Find leads that have passed their expiry time and are still in an
  // active lifecycle state.
  const result = await prisma.lead.updateMany({
    where: {
      expiresAt: { lte: now },
      status: {
        in: ["ACTIVE", "MATCHING", "APPLICATIONS_RECEIVED"],
      },
    },
    data: { status: "EXPIRED" },
  });

  if (result.count > 0) {
    console.info(
      `[lead-expiry] Expired ${result.count} lead(s) past their ${now.toISOString()} deadline`
    );
  } else {
    console.info("[lead-expiry] No leads to expire");
  }

  return { expiredCount: result.count };
}
