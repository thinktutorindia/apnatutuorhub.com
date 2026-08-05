/**
 * jobs/worker.ts — BullMQ Worker Process
 *
 * Run with:  npm run worker
 *
 * This is the long-running process that consumes BullMQ jobs from Redis.
 * It must be started separately from the Next.js app server.
 *
 * Queues handled:
 *   - lead-matching     → runs the 6-filter matching engine + notifications
 *   - radius-expansion  → expands search radius for unmatched leads
 *   - lead-expiry       → marks expired leads (cron-like, every hour)
 */

import { Worker } from "bullmq";
import { QUEUE_NAMES } from "@/lib/queue";
import { processLeadMatching } from "@/jobs/matching.worker";
import { processRadiusExpansion } from "@/jobs/radius-expand.worker";
import { processLeadExpiry } from "@/jobs/lead-expiry.worker";
import type { LeadMatchingJob, RadiusExpansionJob } from "@/lib/queue";

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  console.error(
    "[worker] REDIS_URL is not configured. Set it in .env to run the worker process."
  );
  process.exit(1);
}

const connection = { url: redisUrl };

// ── Lead Matching Worker ─────────────────────────────────────────────────────

const matchingWorker = new Worker<LeadMatchingJob>(
  QUEUE_NAMES.LEAD_MATCHING,
  async (job) => {
    console.info(`[worker] Processing lead-matching job ${job.id}`, job.data);
    const result = await processLeadMatching(job.data);
    console.info(
      `[worker] lead-matching complete: ${result.matchedCount} tutors matched`
    );
    return result;
  },
  {
    connection,
    concurrency: 5, // process up to 5 matching jobs in parallel
  }
);

// ── Radius Expansion Worker ───────────────────────────────────────────────────

const radiusWorker = new Worker<RadiusExpansionJob>(
  QUEUE_NAMES.RADIUS_EXPANSION,
  async (job) => {
    console.info(
      `[worker] Processing radius-expansion job ${job.id}`,
      job.data
    );
    await processRadiusExpansion(job.data.leadId);
    console.info(`[worker] radius-expansion complete for lead ${job.data.leadId}`);
  },
  { connection, concurrency: 3 }
);

// ── Lead Expiry Worker ────────────────────────────────────────────────────────

const expiryWorker = new Worker(
  QUEUE_NAMES.LEAD_EXPIRY,
  async (job) => {
    console.info(`[worker] Processing lead-expiry job ${job.id}`);
    const result = await processLeadExpiry();
    console.info(`[worker] lead-expiry complete: ${result.expiredCount} leads expired`);
    return result;
  },
  { connection, concurrency: 1 }
);

// ── Event Logging ─────────────────────────────────────────────────────────────

for (const [name, worker] of [
  [QUEUE_NAMES.LEAD_MATCHING, matchingWorker],
  [QUEUE_NAMES.RADIUS_EXPANSION, radiusWorker],
  [QUEUE_NAMES.LEAD_EXPIRY, expiryWorker],
] as const) {
  worker.on("completed", (job) => {
    console.info(`[${name}] Job ${job.id} completed`);
  });
  worker.on("failed", (job, err) => {
    console.error(`[${name}] Job ${job?.id} failed:`, err.message);
  });
}

// ── Graceful Shutdown ─────────────────────────────────────────────────────────

async function shutdown() {
  console.info("[worker] Graceful shutdown initiated...");
  await Promise.allSettled([
    matchingWorker.close(),
    radiusWorker.close(),
    expiryWorker.close(),
  ]);
  console.info("[worker] All workers stopped.");
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

console.info(
  "[worker] ApnaTutorHub BullMQ Worker started. Listening on queues:",
  Object.values(QUEUE_NAMES).join(", ")
);
