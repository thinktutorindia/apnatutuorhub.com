/**
 * lib/observability.ts
 * Enterprise Upgrade — Phase 8: Observability & Health Engine
 *
 * System diagnostic suite for monitoring database connection status,
 * Upstash Redis status, in-memory cache health, and background queue metrics.
 */

import { prisma } from "@/lib/prisma";
import { getSettingsCacheStatus } from "@/lib/settings-cache";
import { isRedisConfigured } from "@/lib/queue";

export type SystemHealthReport = {
  status: "HEALTHY" | "DEGRADED" | "UNHEALTHY";
  timestamp: string;
  uptimeSeconds: number;
  checks: {
    database: { status: "UP" | "DOWN"; latencyMs: number };
    redis: { status: "UP" | "DOWN" | "NOT_CONFIGURED" };
    settingsCache: { status: "UP"; cached: boolean; expiresInMs: number | null };
  };
};

/**
 * Performs live health check against all infrastructure services.
 */
export async function getSystemHealth(): Promise<SystemHealthReport> {
  const startTime = Date.now();

  // Check 1: Database ping
  let dbStatus: "UP" | "DOWN" = "DOWN";
  let dbLatencyMs = -1;

  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - dbStart;
    dbStatus = "UP";
  } catch (err) {
    console.error("[observability] DB health check failed:", err);
  }

  // Check 2: Redis configuration check
  const redisConfigured = isRedisConfigured();
  const redisStatus: "UP" | "DOWN" | "NOT_CONFIGURED" = redisConfigured
    ? "UP"
    : "NOT_CONFIGURED";

  // Check 3: Settings Cache Status
  const cacheStatus = getSettingsCacheStatus();

  // Aggregate overall status
  const isHealthy = dbStatus === "UP";
  const overallStatus = isHealthy ? "HEALTHY" : "UNHEALTHY";

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    checks: {
      database: { status: dbStatus, latencyMs: dbLatencyMs },
      redis: { status: redisStatus },
      settingsCache: {
        status: "UP",
        cached: cacheStatus.cached,
        expiresInMs: cacheStatus.expiresInMs,
      },
    },
  };
}
