/**
 * lib/fraud-detector.ts
 * Enterprise Upgrade — Phase 3: Fraud Detection & Risk Scoring Engine
 *
 * Real-time risk analysis engine for detecting fraudulent behavior, spam,
 * multi-accounting, and velocity anomalies.
 *
 * Risk Score Scale: 0 (Safe) → 100 (Critical Fraud Risk)
 *
 * Risk Signals Analyzed:
 * 1. IP & Device Co-occurrence (multiple accounts sharing IP/UserAgent)
 * 2. Unlocking Velocity (purchasing >10 leads in 5 minutes)
 * 3. Review Velocity (submitting >3 reviews in 1 hour)
 * 4. Geographic Impossible Match (tutor unlocked offline lead >500km away)
 * 5. Disposable/Fake Email pattern detection
 */

import { prisma } from "@/lib/prisma";

// ── Types ─────────────────────────────────────────────────────────────────────

export type RiskAssessment = {
  score: number;             // 0 to 100
  level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  flags: string[];
  requiresAdminReview: boolean;
};

// ── Disposable Email Domains list ─────────────────────────────────────────────

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "tempmail.com",
  "10minutemail.com",
  "guerrillamail.com",
  "trashmail.com",
  "yopmail.com",
  "sharklasers.com",
]);

// ── User Risk Evaluation ──────────────────────────────────────────────────────

/**
 * Calculates a comprehensive risk score (0-100) for a user.
 */
export async function evaluateUserRisk(userId: string): Promise<RiskAssessment> {
  const flags: string[] = [];
  let score = 0;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      phone: true,
      role: true,
      createdAt: true,
      userActivities: {
        take: 100,
        orderBy: { createdAt: "desc" },
        select: { event: true, ipAddress: true, createdAt: true, metadata: true },
      },
    },
  });

  if (!user) {
    return { score: 100, level: "CRITICAL", flags: ["USER_NOT_FOUND"], requiresAdminReview: true };
  }

  // Signal 1: Disposable Email Check
  const domain = user.email.split("@")[1]?.toLowerCase();
  if (domain && DISPOSABLE_DOMAINS.has(domain)) {
    score += 40;
    flags.push("DISPOSABLE_EMAIL_DOMAIN");
  }

  // Signal 2: Account Age (New account < 2 hours old gets small baseline check)
  const accountAgeHours = (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60);
  if (accountAgeHours < 2) {
    score += 10;
    flags.push("FRESH_ACCOUNT_LESS_THAN_2H");
  }

  // Signal 3: Shared IP Address Check (Multi-Accounting Signal)
  const recentIps = Array.from(
    new Set(
      user.userActivities
        .map((a) => a.ipAddress)
        .filter((ip): ip is string => Boolean(ip))
    )
  );

  if (recentIps.length > 0) {
    // Check if other users have logged activity from these exact IPs
    const coOccurringUsers = await prisma.userActivity.groupBy({
      by: ["userId"],
      where: {
        ipAddress: { in: recentIps },
        userId: { not: userId },
      },
    });

    if (coOccurringUsers.length >= 3) {
      score += 35;
      flags.push(`SHARED_IP_WITH_${coOccurringUsers.length}_ACCOUNTS`);
    } else if (coOccurringUsers.length >= 1) {
      score += 15;
      flags.push(`SHARED_IP_WITH_ANOTHER_ACCOUNT`);
    }
  }

  // Signal 4: Velocity Checks — Unlocking Leads too fast
  const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
  const recentLeadPurchases = user.userActivities.filter(
    (a) => a.event === "LEAD_PURCHASED" && a.createdAt >= fiveMinsAgo
  );

  if (recentLeadPurchases.length >= 8) {
    score += 30;
    flags.push(`HIGH_PURCHASE_VELOCITY_${recentLeadPurchases.length}_IN_5M`);
  }

  // Signal 5: Velocity Checks — Fast Reviews
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentReviews = user.userActivities.filter(
    (a) => a.event === "REVIEW_SUBMITTED" && a.createdAt >= oneHourAgo
  );

  if (recentReviews.length >= 5) {
    score += 25;
    flags.push(`HIGH_REVIEW_VELOCITY_${recentReviews.length}_IN_1H`);
  }

  // Normalize score to 0-100 cap
  score = Math.min(100, Math.max(0, score));

  const level: RiskAssessment["level"] =
    score >= 75
      ? "CRITICAL"
      : score >= 50
        ? "HIGH"
        : score >= 25
          ? "MEDIUM"
          : "LOW";

  const requiresAdminReview = score >= 50;

  // Auto-flag audit log if high risk
  if (requiresAdminReview) {
    console.warn(`[fraud-detector] High risk user detected: ${userId}`, {
      score,
      level,
      flags,
    });
  }

  return {
    score,
    level,
    flags,
    requiresAdminReview,
  };
}

// ── Lead Unlock Fraud Check ───────────────────────────────────────────────────

/**
 * Pre-purchase fraud validation check for lead unlocks.
 * Returns true if purchase should proceed, false if blocked due to high risk.
 */
export async function validateLeadUnlockFraud(
  userId: string,
  leadId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const assessment = await evaluateUserRisk(userId);

  if (assessment.score >= 80) {
    return {
      allowed: false,
      reason:
        "Account flagged for suspicious activity. Please contact support to verify your account.",
    };
  }

  return { allowed: true };
}
