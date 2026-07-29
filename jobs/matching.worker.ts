// Lead Matching Worker — Phase 5
//
// Processes new leads: runs the 6-filter matching engine, calculates ranking
// scores, creates in-app notifications for matched tutors, and updates the
// lead status.
//
// This module is called:
//   • By BullMQ when Redis is configured (via the Worker class).
//   • Inline via `processLeadMatching()` from `matching-dispatcher.ts`
//     when Redis is not available (development fallback).

import { prisma } from "@/lib/prisma";
import { findMatchingTutors } from "@/lib/matching-engine";
import { calculateRankingScore } from "@/lib/ranking-score";
import { loadMatchingWeights } from "@/lib/matching-config";
import type { MatchableLead } from "@/lib/matching-engine";
import type { LeadMatchingJob } from "@/lib/queue";

/**
 * Core processing logic for a lead-matching job.
 * Pure business logic — no BullMQ dependency.
 */
export async function processLeadMatching(
  job: LeadMatchingJob
): Promise<{ matchedCount: number }> {
  const lead = await prisma.lead.findUnique({
    where: { id: job.leadId },
    select: {
      id: true,
      subjects: true,
      classLevel: true,
      mode: true,
      budgetMin: true,
      budgetMax: true,
      latitude: true,
      longitude: true,
      radiusKm: true,
      city: true,
      area: true,
      status: true,
      maxTutors: true,
      purchaseCount: true,
    },
  });

  if (!lead) {
    console.warn(`[matching] Lead ${job.leadId} not found — skipping`);
    return { matchedCount: 0 };
  }

  // Don't match closed / expired / completed leads.
  if (["CLOSED", "EXPIRED", "COMPLETED"].includes(lead.status)) {
    console.info(`[matching] Lead ${lead.id} is ${lead.status} — skipping`);
    return { matchedCount: 0 };
  }

  const matchableLead: MatchableLead = lead;

  // Run the 6-filter matching pipeline.
  const matchedTutors = await findMatchingTutors(matchableLead);

  if (matchedTutors.length === 0) {
    console.info(`[matching] Lead ${lead.id}: 0 tutors matched`);
    return { matchedCount: 0 };
  }

  // Calculate ranking scores.
  const weights = await loadMatchingWeights();
  const rankedTutors = matchedTutors
    .map((tutor) => ({
      tutor,
      score: calculateRankingScore(tutor, weights),
    }))
    .sort((a, b) => b.score.total - a.score.total);

  console.info(
    `[matching] Lead ${lead.id}: ${rankedTutors.length} tutors matched. ` +
      `Top score: ${rankedTutors[0]?.score.total ?? 0}`
  );

  // Build the subject summary for notification text.
  const subjectLabel =
    lead.subjects.length <= 2
      ? lead.subjects.join(" & ")
      : `${lead.subjects[0]} +${lead.subjects.length - 1} more`;

  const locationLabel = [lead.area, lead.city].filter(Boolean).join(", ") || "your area";

  // Create in-app bell notifications for all matched tutors.
  const notificationData = rankedTutors.map(({ tutor }) => ({
    userId: tutor.userId,
    title: "🎯 New Lead Matched!",
    message: `A parent is looking for a ${lead.classLevel} ${subjectLabel} tutor in ${locationLabel}. Unlock to view contact details.`,
    channel: "WEB" as const,
    isRead: false,
    actionUrl: "/tutor/leads",
  }));

  if (notificationData.length > 0) {
    await prisma.notification.createMany({ data: notificationData });
    console.info(
      `[matching] Created ${notificationData.length} notifications for lead ${lead.id}`
    );
  }

  // Transition lead status: ACTIVE → MATCHING (tutors have been notified).
  if (lead.status === "ACTIVE") {
    await prisma.lead.update({
      where: { id: lead.id },
      data: { status: "MATCHING" },
    });
  }

  return { matchedCount: rankedTutors.length };
}
