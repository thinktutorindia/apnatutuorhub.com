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

/**
 * Dispatches a lead-matching job. Call this inside `after()` or Server Actions.
 * It returns void and never throws.
 * `channels` limits how matched tutors are notified. Omit it to keep the default
 * in-app alert (high priority also emails).
 */
export async function dispatchLeadMatching(
  leadId: string,
  options?: { channels?: import("@/lib/queue").LeadNotifyChannel[] }
): Promise<void> {
  const job = { leadId, channels: options?.channels };
  try {
    if (process.env.REDIS_URL) {
      try {
        const { enqueueLeadMatching, isRedisConfigured } = await import("@/lib/queue");
        if (isRedisConfigured()) {
          await enqueueLeadMatching(job);
          return;
        }
      } catch (err) {
        console.warn("[matching-dispatcher] Redis queue unavailable, running inline matching:", err);
      }
    }

    // Run matching inline (development / direct execution)
    const { processLeadMatching } = await import("@/jobs/matching.worker");
    const result = await processLeadMatching(job);
    console.info(
      `[matching-dispatcher] Inline matching complete: ${result.matchedCount} tutors matched`
    );
  } catch (error) {
    // Fire-and-forget: log but never propagate.
    console.error("[matching-dispatcher] Dispatch failed", { leadId, error });
  }
}
