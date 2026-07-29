// Background job dispatch boundary — Phase 5.
//
// BullMQ queues backed by Upstash Redis (`REDIS_URL`).  When Redis is not
// configured the dispatcher falls back to inline execution via `after()`.
//
// Callers MUST treat dispatch as fire-and-forget: a queue outage can never
// fail the user-facing mutation that triggered it.

import type { Queue as BullQueue } from "bullmq";

// ── Job payload types ────────────────────────────────────────────────────────

export type LeadMatchingJob = { leadId: string };
export type RadiusExpansionJob = { leadId: string };
export type LeadExpiryJob = Record<string, never>; // no payload needed

// ── Queue names ──────────────────────────────────────────────────────────────

export const QUEUE_NAMES = {
  LEAD_MATCHING: "lead-matching",
  RADIUS_EXPANSION: "radius-expansion",
  LEAD_EXPIRY: "lead-expiry",
} as const;

// ── Redis check ──────────────────────────────────────────────────────────────

export function isRedisConfigured(): boolean {
  return Boolean(process.env.REDIS_URL);
}

// ── Lazy queue singletons ────────────────────────────────────────────────────
// BullMQ is imported dynamically so the app starts cleanly without Redis.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _queues: Map<string, BullQueue<any>> | null = null;

async function getQueue<T>(name: string): Promise<BullQueue<T> | null> {
  if (!isRedisConfigured()) return null;

  if (!_queues) {
    _queues = new Map();
  }

  if (!_queues.has(name)) {
    try {
      const { Queue } = await import("bullmq");
      const queue = new Queue<T>(name, {
        connection: { url: process.env.REDIS_URL },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: "exponential", delay: 2000 },
          removeOnComplete: { count: 500 },
          removeOnFail: { count: 200 },
        },
      });
      _queues.set(name, queue);
    } catch (error) {
      console.error(`[queue] Failed to create BullMQ queue "${name}"`, error);
      return null;
    }
  }

  return _queues.get(name) as BullQueue<T> | null;
}

// ── Dispatch helpers ─────────────────────────────────────────────────────────

export async function enqueueLeadMatching(job: LeadMatchingJob): Promise<void> {
  try {
    const queue = await getQueue<LeadMatchingJob>(QUEUE_NAMES.LEAD_MATCHING);
    if (queue) {
      await queue.add("match", job, { jobId: `match-${job.leadId}` });
      console.info("[queue] lead-matching dispatched to BullMQ", job);
      return;
    }

    // Fallback: inline execution (handled by matching-dispatcher.ts).
    console.info(
      "[queue] lead-matching not dispatched — REDIS_URL is not configured",
      job
    );
  } catch (error) {
    console.error("[queue] lead-matching dispatch failed", { job, error });
  }
}

export async function enqueueRadiusExpansion(
  job: RadiusExpansionJob
): Promise<void> {
  try {
    const queue = await getQueue<RadiusExpansionJob>(
      QUEUE_NAMES.RADIUS_EXPANSION
    );
    if (queue) {
      await queue.add("expand", job, {
        jobId: `expand-${job.leadId}-${Date.now()}`,
      });
      console.info("[queue] radius-expansion dispatched to BullMQ", job);
      return;
    }

    console.info(
      "[queue] radius-expansion not dispatched — REDIS_URL is not configured",
      job
    );
  } catch (error) {
    console.error("[queue] radius-expansion dispatch failed", { job, error });
  }
}

export async function enqueueLeadExpiry(): Promise<void> {
  try {
    const queue = await getQueue<LeadExpiryJob>(QUEUE_NAMES.LEAD_EXPIRY);
    if (queue) {
      await queue.add("expire", {}, { jobId: `expire-${Date.now()}` });
      console.info("[queue] lead-expiry dispatched to BullMQ");
      return;
    }

    console.info(
      "[queue] lead-expiry not dispatched — REDIS_URL is not configured"
    );
  } catch (error) {
    console.error("[queue] lead-expiry dispatch failed", error);
  }
}
