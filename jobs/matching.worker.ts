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
import { createNotification } from "@/lib/notification-engine";
import { isTill8thClass } from "@/lib/lead-utils";
import { buildAquaTuitionEnquiryPlaceholders } from "@/lib/lead-notify-template";
import { normalizeIndiaWhatsApp, sendAquaWhatsAppMessage } from "@/lib/aqua-whatsapp";
import { upsertWhatsAppChatMessage } from "@/lib/whatsapp-chat-log";
import type { MatchableLead } from "@/lib/matching-engine";
import type { LeadMatchingJob, LeadNotifyChannel } from "@/lib/queue";

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
      inquiryNumber: true,
      board: true,
      pincode: true,
      tutorGenderPref: true,
      notes: true,
      timingPreference: true,
      parentProfile: { select: { user: { select: { name: true } } } },
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

  // Online classes are strictly disabled for classes up to 5th grade (children cannot attend online classes).
  if (lead.mode === "ONLINE" && isTill8thClass(lead.classLevel)) {
    console.info(
      `[matching] Lead ${lead.id} (${lead.classLevel}): Online classes are not supported for classes up to 5th grade — skipping notifications & matching.`
    );
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

  const isOnline = lead.mode === "ONLINE";
  const locationLabel = [lead.area, lead.city].filter(Boolean).join(", ") || "your area";

  const channels = job.channels;
  const title = isOnline ? "🌐 New Online Tuition Lead Matched!" : "🎯 New Tuition Lead Matched!";
  const message = isOnline
    ? `A parent is looking for an online ${lead.classLevel} (${subjectLabel}) tutor (Pan-India). Unlock now to start classes.`
    : `A parent is looking for a ${lead.classLevel} ${subjectLabel} tutor in ${locationLabel}. Unlock now to claim contact details.`;

  const wantsWhatsApp = channels?.includes("WHATSAPP") ?? false;
  const phoneByUserId = new Map<string, string | null>();
  if (wantsWhatsApp) {
    const phones = await prisma.user.findMany({
      where: { id: { in: rankedTutors.map((row) => row.tutor.userId) } },
      select: { id: true, phone: true },
    });
    for (const row of phones) phoneByUserId.set(row.id, row.phone);
  }

  const waPlaceholders = wantsWhatsApp
    ? buildAquaTuitionEnquiryPlaceholders({
        id: lead.id,
        inquiryNumber: lead.inquiryNumber,
        clientName: lead.parentProfile?.user?.name,
        subjects: lead.subjects,
        classLevel: lead.classLevel,
        board: lead.board,
        mode: lead.mode,
        city: lead.city,
        area: lead.area,
        pincode: lead.pincode,
        budgetMin: lead.budgetMin,
        budgetMax: lead.budgetMax,
        genderPreference: lead.tutorGenderPref,
        notes: lead.notes,
        timingPreference: lead.timingPreference,
      })
    : null;

  // Notify matched tutors. No channel list keeps the original in-app + high-priority email.
  for (const { tutor } of rankedTutors) {
    await notifyMatchedTutor({
      userId: tutor.userId,
      phone: phoneByUserId.get(tutor.userId) ?? null,
      leadId: lead.id,
      title,
      message,
      channels,
      waPlaceholders,
    });
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

async function notifyMatchedTutor(opts: {
  userId: string;
  phone: string | null;
  leadId: string;
  title: string;
  message: string;
  channels?: LeadNotifyChannel[];
  waPlaceholders: string[] | null;
}) {
  const { userId, phone, leadId, title, message, channels, waPlaceholders } = opts;
  const selected = channels?.length ? channels : null;

  if (!selected) {
    await createNotification({
      userId,
      type: "LEAD_MATCHED",
      priority: "HIGH",
      title,
      message,
      actionUrl: "/tutor/leads",
      referenceId: leadId,
    });
    return;
  }

  const wantsInApp = selected.includes("IN_APP");
  const wantsPush = selected.includes("PUSH");
  const wantsEmail = selected.includes("EMAIL");

  if (wantsInApp) {
    await createNotification({
      userId,
      type: "LEAD_MATCHED",
      priority: "HIGH",
      channel: "WEB",
      title,
      message,
      actionUrl: "/tutor/leads",
      referenceId: leadId,
      sendEmail: wantsEmail,
      sendPush: wantsPush,
      skipAutoEmail: !wantsEmail,
    });
  } else {
    if (wantsPush) {
      await createNotification({
        userId,
        type: "LEAD_MATCHED",
        priority: "HIGH",
        channel: "PUSH",
        title,
        message,
        actionUrl: "/tutor/leads",
        referenceId: leadId,
        skipAutoEmail: true,
      });
    }
    if (wantsEmail) {
      await createNotification({
        userId,
        type: "LEAD_MATCHED",
        priority: "HIGH",
        channel: "EMAIL",
        title,
        message,
        actionUrl: "/tutor/leads",
        referenceId: leadId,
        sendEmail: true,
        skipAutoEmail: true,
        forceSend: wantsPush,
      });
    }
  }

  if (!selected.includes("WHATSAPP") || !waPlaceholders) return;

  const normalizedPhone = phone ? normalizeIndiaWhatsApp(phone) : null;
  if (!normalizedPhone) return;

  const wa = await sendAquaWhatsAppMessage({
    to: normalizedPhone,
    mode: "template",
    templateId: "tuition_enquiry_direct",
    placeholders: waPlaceholders.slice(0, 7),
    text: `${title}\n\n${message}\nhttps://apnatutorhub.com/tutor/leads`,
    bypassDailyCap: true,
  });

  if (wa.ok) {
    await upsertWhatsAppChatMessage({
      phone: normalizedPhone,
      direction: "OUTBOUND",
      senderName: "Lead Enquiry",
      body: `[Tuition Enquiry]\n${message}`,
      step: "LEAD_MATCHED",
      messageId: wa.providerMessageId ?? null,
      messageType: "template",
      status: wa.rawStatus ?? "accepted",
      isRead: true,
    }).catch(() => {});
  } else {
    console.warn(`[matching] WhatsApp failed for ${normalizedPhone}: ${wa.error}`);
  }
}
