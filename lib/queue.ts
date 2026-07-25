// Background job boundary. Phase 5 replaces these dispatchers with BullMQ
// queues backed by Upstash Redis (`REDIS_URL`) and the workers in `jobs/`.
// Callers must treat dispatch as fire-and-forget: a queue outage can never fail
// the user-facing mutation that triggered it.

export type LeadMatchingJob = { leadId: string };

const isQueueConfigured = () => Boolean(process.env.REDIS_URL);

export async function enqueueLeadMatching(job: LeadMatchingJob): Promise<void> {
  try {
    if (!isQueueConfigured()) {
      console.info(
        "[queue] lead-matching not dispatched — REDIS_URL is not configured",
        job
      );
      return;
    }

    // Phase 5: add(`lead-matching`, job) on the BullMQ queue.
    console.info("[queue] lead-matching dispatched", job);
  } catch (error) {
    console.error("[queue] lead-matching dispatch failed", { job, error });
  }
}
