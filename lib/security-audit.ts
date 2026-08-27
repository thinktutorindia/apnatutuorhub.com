/**
 * lib/security-audit.ts
 * Phase 14 — Security audit helpers for admin verification
 */

import { createHmac, timingSafeEqual } from "crypto";

/**
 * Verifies a Razorpay webhook payload signature (timing-safe).
 * Returns true if the signature is valid.
 */
export function verifyRazorpaySignature(
  payload: string,
  signature: string
): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;

  const expectedSig = createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  return timingSafeEqual(
    Buffer.from(signature, "hex"),
    Buffer.from(expectedSig, "hex")
  );
}

/**
 * Sanitizes string input to prevent XSS and SQL injection risks.
 * Note: Prisma parameterized queries already prevent SQL injection;
 * this is for additional defense-in-depth on user-visible content.
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .trim();
}

/**
 * Rate limiter check using Upstash Redis (simple sliding window).
 * Returns `{ allowed: boolean; remaining: number }`.
 * Local/dev: fail-open if Redis is missing so login still works.
 * Production: fail-closed if Redis is missing or errors (do not silently allow).
 */
export async function checkRateLimit(
  key: string,
  limitPerMinute = 10
): Promise<{ allowed: boolean; remaining: number }> {
  const restUrl = process.env.UPSTASH_REDIS_REST_URL;
  const restToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const failClosed = process.env.NODE_ENV === "production";

  if (!restUrl || !restToken) {
    if (failClosed) {
      console.error("[rate-limit] UPSTASH Redis is not configured; denying request");
      return { allowed: false, remaining: 0 };
    }
    return { allowed: true, remaining: limitPerMinute };
  }

  try {
    const windowKey = `rl:${key}:${Math.floor(Date.now() / 60000)}`;

    // Increment counter
    const incrRes = await fetch(`${restUrl}/incr/${windowKey}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${restToken}` },
    });
    const { result: count } = await incrRes.json() as { result: number };

    // Set 60s expiry if this is the first request in window
    if (count === 1) {
      await fetch(`${restUrl}/expire/${windowKey}/60`, {
        method: "POST",
        headers: { Authorization: `Bearer ${restToken}` },
      });
    }

    const remaining = Math.max(0, limitPerMinute - count);
    return { allowed: count <= limitPerMinute, remaining };
  } catch (err) {
    if (failClosed) {
      console.error("[rate-limit] Redis error; denying request", err);
      return { allowed: false, remaining: 0 };
    }
    return { allowed: true, remaining: limitPerMinute };
  }
}
