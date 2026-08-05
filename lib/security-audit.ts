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
 * Falls back to `allowed: true` if Redis is not configured.
 */
export async function checkRateLimit(
  key: string,
  limitPerMinute = 10
): Promise<{ allowed: boolean; remaining: number }> {
  const restUrl = process.env.UPSTASH_REDIS_REST_URL;
  const restToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!restUrl || !restToken) {
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
  } catch {
    return { allowed: true, remaining: limitPerMinute };
  }
}
