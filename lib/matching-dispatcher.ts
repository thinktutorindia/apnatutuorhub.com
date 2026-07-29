// Matching Dispatcher — Phase 5
//
// This is the single entry point that `leads.actions.ts` calls (via `after()`)
// when a new lead is created or updated.
//
// Execution strategy:
//   1. If Redis is configured → dispatch to BullMQ queue (async worker).
//   2. If Redis is NOT configured → execute matching inline (development fallback).
//
// Either path is fire-and-forget.  A failure here never blocks the user.

import { enqueueLeadMatching, isRedisConfigured } from "@/lib/queue";
import { processLeadMatching } from "@/jobs/matching.worker";

/**
 * Dispatches a lead-matching job.  Call this inside `after()` from a Server
 * Action — it returns void and never throws.
 */
export async function dispatchLeadMatching(leadId: string): Promise<void> {
  try {
    if (isRedisConfigured()) {
      // Redis available → dispatch to BullMQ for async worker processing.
      await enqueueLeadMatching({ leadId });
    } else {
      // No Redis → run matching inline (development / early deployment).
      console.info(
        `[matching-dispatcher] Inline matching for lead ${leadId} (no Redis)`
      );
      const result = await processLeadMatching({ leadId });
      console.info(
        `[matching-dispatcher] Inline matching complete: ${result.matchedCount} tutors matched`
      );
    }
  } catch (error) {
    // Fire-and-forget: log but never propagate.
    console.error("[matching-dispatcher] Dispatch failed", { leadId, error });
  }
}
