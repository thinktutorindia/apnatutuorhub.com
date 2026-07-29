// Radius Expansion Worker — Phase 5
//
// Expands the search radius for leads that haven't reached their maximum
// tutor purchases within the first portion of their lifespan.
//
// Business rule (docs/Phases.md §10):
//   - Every `RADIUS_EXPANSION_INTERVAL_HOURS` (default 6h), check leads
//     with `status IN (ACTIVE, MATCHING)` and `purchaseCount < maxTutors`.
//   - Increment `lead.radiusKm` by `RADIUS_EXPANSION_STEP_KM` (default 5 km).
//   - Re-run the matching engine for the expanded radius to find new tutors.

import { prisma } from "@/lib/prisma";
import { loadMatchingConfig } from "@/lib/matching-config";
import { processLeadMatching } from "@/jobs/matching.worker";

/**
 * Processes a single lead for radius expansion.
 */
export async function processRadiusExpansion(leadId: string): Promise<void> {
  const config = await loadMatchingConfig();

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: {
      id: true,
      status: true,
      purchaseCount: true,
      maxTutors: true,
      radiusKm: true,
      createdAt: true,
    },
  });

  if (!lead) {
    console.warn(`[radius-expand] Lead ${leadId} not found — skipping`);
    return;
  }

  // Only expand active/matching leads that haven't reached their cap.
  if (!["ACTIVE", "MATCHING"].includes(lead.status)) {
    return;
  }

  if (lead.purchaseCount >= lead.maxTutors) {
    return;
  }

  // Check if enough time has passed since creation for an expansion.
  const ageHours =
    (Date.now() - lead.createdAt.getTime()) / (60 * 60 * 1000);

  if (ageHours < config.radiusExpansionIntervalHours) {
    return;
  }

  // Expand the search radius.
  const newRadius = lead.radiusKm + config.radiusExpansionStepKm;

  await prisma.lead.update({
    where: { id: lead.id },
    data: { radiusKm: newRadius },
  });

  console.info(
    `[radius-expand] Lead ${lead.id}: radius expanded ${lead.radiusKm} km → ${newRadius} km`
  );

  // Re-run matching with the expanded radius.
  await processLeadMatching({ leadId: lead.id });
}

/**
 * Batch processor: finds all eligible leads and expands their radius.
 * Called by the scheduled cron or BullMQ repeatable job.
 */
export async function processRadiusExpansionBatch(): Promise<void> {
  const config = await loadMatchingConfig();

  // Find leads old enough for expansion that haven't filled up yet.
  const cutoff = new Date(
    Date.now() - config.radiusExpansionIntervalHours * 60 * 60 * 1000
  );

  const eligibleLeads = await prisma.lead.findMany({
    where: {
      status: { in: ["ACTIVE", "MATCHING"] },
      createdAt: { lte: cutoff },
      // Only leads that still need more tutors.
      purchaseCount: { lt: config.maxTutorsPerLead },
    },
    select: { id: true },
  });

  console.info(
    `[radius-expand] Found ${eligibleLeads.length} leads eligible for radius expansion`
  );

  for (const lead of eligibleLeads) {
    await processRadiusExpansion(lead.id);
  }
}
