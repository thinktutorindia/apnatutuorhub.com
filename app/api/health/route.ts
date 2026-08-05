import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ServiceStatus = "ok" | "degraded" | "error";

interface HealthCheck {
  status: ServiceStatus;
  latencyMs: number;
  error?: string;
}

import { getSettingsCacheStatus } from "@/lib/settings-cache";

interface HealthCheck {
  status: ServiceStatus;
  latencyMs: number;
  error?: string;
  cached?: boolean;
}

interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  services: {
    database: HealthCheck;
    redis: HealthCheck;
    settingsCache: HealthCheck;
  };
  uptime: number;
}

async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "ok", latencyMs: Date.now() - start };
  } catch (err) {
    return {
      status: "error",
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : "Unknown DB error",
    };
  }
}

async function checkRedis(): Promise<HealthCheck> {
  const start = Date.now();

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    return {
      status: "degraded",
      latencyMs: 0,
      error: "UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not configured",
    };
  }

  try {
    const res = await fetch(`${redisUrl}/ping`, {
      method: "GET",
      headers: { Authorization: `Bearer ${redisToken}` },
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    return { status: "ok", latencyMs: Date.now() - start };
  } catch (err) {
    return {
      status: "error",
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : "Unknown Redis error",
    };
  }
}

export async function GET() {
  const [db, redis] = await Promise.all([checkDatabase(), checkRedis()]);
  const cacheStatus = getSettingsCacheStatus();

  const settingsCacheCheck: HealthCheck = {
    status: "ok",
    latencyMs: 0,
    cached: cacheStatus.cached,
  };

  const allOk = db.status === "ok" && redis.status === "ok";
  const anyError = db.status === "error" || redis.status === "error";

  const overallStatus: HealthResponse["status"] = allOk
    ? "healthy"
    : anyError
      ? "unhealthy"
      : "degraded";

  const body: HealthResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.NEXT_PUBLIC_APP_VERSION ?? "dev",
    services: { database: db, redis, settingsCache: settingsCacheCheck },
    uptime: process.uptime(),
  };

  const httpStatus = overallStatus === "healthy" ? 200 : overallStatus === "degraded" ? 200 : 503;

  return NextResponse.json(body, { status: httpStatus });
}
