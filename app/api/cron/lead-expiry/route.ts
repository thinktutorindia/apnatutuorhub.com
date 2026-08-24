/**
 * GET /api/cron/lead-expiry
 *
 * Automated cron endpoint to process 48-hour lead expiry.
 * Securely authenticated via authorization header token or CRON_SECRET.
 *
 * Example Vercel cron configuration (vercel.json):
 * {
 *   "crons": [{ "path": "/api/cron/lead-expiry", "schedule": "0 * * * *" }]
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { processLeadExpiry } from "@/jobs/lead-expiry.worker";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET ?? "";
  const isProd = process.env.NODE_ENV === "production";

  // Verify cron authorization
  if (isProd && (!cronSecret || authHeader !== `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processLeadExpiry();
    return NextResponse.json({
      success: true,
      expiredCount: result.expiredCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/lead-expiry] Execution failed:", message);
    return NextResponse.json(
      { error: "Internal server error", message },
      { status: 500 }
    );
  }
}
