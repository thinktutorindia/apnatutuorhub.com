/**
 * lib/geo-lead-broadcast.ts
 *
 * Dispatches personalized lead notifications to ALL active tutor phones:
 * - Real lead only if within 5 km AND subject overlap with what they teach.
 * - Dummy nearby fallback if no real 5 km + subject match.
 * - Dummy location is always presented as within 5 km, subjects they teach only.
 * - Class 1–8: Home Tuition only (never online).
 * - Budget: a little above market, not extreme.
 * - Channels: WhatsApp (all valid phones), Email (genuine emails), In-App.
 *
 * Usage:
 *   npx tsx scripts/broadcast_geo_leads.ts --dry-run
 *   npx tsx scripts/broadcast_geo_leads.ts --live
 */

import { prisma } from "@/lib/prisma";
import { isGenuineEmail, isTill8thClass } from "@/lib/lead-utils";
import { haversineDistanceKm } from "@/lib/haversine";
import { renderNewMatchedLeadEmail } from "@/emails/NewMatchedLeadEmail";
import { sendAquaWhatsAppMessage, normalizeIndiaWhatsApp } from "@/lib/aqua-whatsapp";
import { sendBatchEmails, type BatchEmailItem } from "@/lib/resend-service";
import { generateDummyLead } from "@/lib/dummy-lead-engine";
import { cleanSubjectName } from "@/lib/dummy-campaign-types";

const MATCH_RADIUS_KM = 5;

function subjectsOverlap(tutorSubjects: string[], leadSubjects: string[]): boolean {
  const tutor = tutorSubjects.map((s) => cleanSubjectName(s).toLowerCase()).filter(Boolean);
  const lead = leadSubjects.map((s) => cleanSubjectName(s).toLowerCase()).filter(Boolean);
  if (tutor.length === 0 || lead.length === 0) return false;
  return lead.some((ls) =>
    tutor.some((ts) => ts.includes(ls) || ls.includes(ts) || ts.includes("all subject") || ls.includes("all subject"))
  );
}

function pickTutorSubjects(tutorSubjects: string[], classLevel: string, seed: number): string[] {
  const cleaned = [...new Set((tutorSubjects || []).map(cleanSubjectName).filter(Boolean))];
  if (cleaned.length === 0) {
    return isTill8thClass(classLevel)
      ? ["All Subjects (Maths, Science, English, Hindi, SST)"]
      : ["Mathematics"];
  }
  return [cleaned[seed % cleaned.length], ...cleaned.filter((_, i) => i !== seed % cleaned.length)].slice(0, 2);
}

export type GeoBroadcastMode = "dry-run" | "live" | "in-app-only";

// ── Timing Options ─────────────────────────────────────────────────────────────
const REALISTIC_TIMINGS = [
  "Evening (4:30 PM to 6:30 PM)",
  "Evening (5:00 PM to 7:00 PM)",
  "Evening (5:30 PM to 7:30 PM)",
  "Late Afternoon (3:30 PM to 5:30 PM)",
  "Evening (6:00 PM to 8:00 PM)",
  "Weekend (10:00 AM to 1:00 PM)",
];

function pickTiming(seed: number): string {
  return REALISTIC_TIMINGS[seed % REALISTIC_TIMINGS.length];
}

// ── Pricing Generator (Healthy, attractive rates) ──────────────────────────────
function getHealthyBudget(classLevel: string, isOffline: boolean): { min: number; max: number; label: string } {
  const numMatch = classLevel.match(/\b(\d{1,2})\b/);
  const grade = numMatch ? parseInt(numMatch[1], 10) : 7;

  if (grade <= 5) {
    return { min: 6500, max: 8500, label: "₹6,500 – ₹8,500 / month" };
  }
  if (grade <= 8) {
    return { min: 7500, max: 10500, label: "₹7,500 – ₹10,500 / month" };
  }
  if (grade <= 10) {
    return { min: 9000, max: 13000, label: "₹9,000 – ₹13,000 / month" };
  }
  return { min: 12000, max: 18000, label: "₹12,000 – ₹18,000 / month" };
}

// ── Lead Payload Structure for Dispatch ────────────────────────────────────────
interface PreparedLeadPayload {
  tutorUserId: string;
  tutorName: string;
  tutorEmail: string;
  tutorPhone: string | null;
  normalizedPhone: string | null;
  isRealLead: boolean;
  distanceKm: number | null;
  inquiryCode: string;
  clientName: string;
  classLevel: string;
  board: string;
  subjects: string[];
  mode: "ONLINE" | "OFFLINE";
  location: string;
  budgetFormatted: string;
  timing: string;
  preference: string;
  actionUrl: string;
}

export async function runGeoLeadBroadcast(mode: GeoBroadcastMode = "live") {
  const isDryRun = mode === "dry-run";
  const isInAppOnly = mode === "in-app-only";
  console.log(`\n======================================================`);
  console.log(`  APNATUTORHUB: ${MATCH_RADIUS_KM}KM GEO-LEAD BROADCAST ENGINE`);
  console.log(`  MODE: ${isDryRun ? "🔍 DRY RUN (Simulation Only)" : isInAppOnly ? "🔔 IN-APP ONLY" : "🚀 LIVE DISPATCH"}`);
  console.log(`======================================================\n`);

  // 1. Fetch active tutors with profiles
  const allTutors = await prisma.user.findMany({
    where: { role: "TUTOR", isActive: true },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      tutorProfile: {
        select: {
          id: true,
          city: true,
          address: true,
          latitude: true,
          longitude: true,
          teachingRadius: true,
          subjects: true,
          classLevels: true,
          marketingNotifsEnabled: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // All active tutors — WhatsApp goes to every valid phone
  const realTutors = allTutors.filter((t) => {
    if (t.tutorProfile && t.tutorProfile.marketingNotifsEnabled === false) return false;
    return true;
  });

  console.log(`Total Active Tutors in Database: ${allTutors.length}`);
  console.log(`Target Tutors (phones + email):  ${realTutors.length}`);

  // 2. Fetch active leads
  const activeLeads = await prisma.lead.findMany({
    where: { status: { in: ["ACTIVE", "MATCHING"] } },
    include: {
      parentProfile: {
        include: { user: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  console.log(`Active / Matching Leads:         ${activeLeads.length}\n`);

  // 3. Match each tutor to Real Lead (<= 10km) or Generate Fallback Dummy Lead
  const preparedLeads: PreparedLeadPayload[] = [];
  let realLeadMatches = 0;
  let dummyLeadMatches = 0;

  for (let idx = 0; idx < realTutors.length; idx++) {
    const tutor = realTutors[idx];
    const tLat = tutor.tutorProfile?.latitude;
    const tLng = tutor.tutorProfile?.longitude;
    const tCity = tutor.tutorProfile?.city?.trim() || "Delhi NCR";
    const tutorName = tutor.name?.trim() || "Tutor";
    const normalizedPhone = tutor.phone ? normalizeIndiaWhatsApp(tutor.phone) : null;

    let matchedRealLead: (typeof activeLeads)[0] | null = null;
    let closestDistanceKm = 999999;

    // A. Real lead only if within 5 km AND they teach the subject
    const tutorSubjects = tutor.tutorProfile?.subjects || [];
    if (tLat != null && tLng != null) {
      const candidates: Array<{ lead: (typeof activeLeads)[0]; dist: number }> = [];

      for (const lead of activeLeads) {
        if (lead.latitude == null || lead.longitude == null) continue;
        const dist = haversineDistanceKm(tLat, tLng, lead.latitude, lead.longitude);
        if (dist > MATCH_RADIUS_KM) continue;
        if (isTill8thClass(lead.classLevel) && lead.mode === "ONLINE") continue;
        if (!subjectsOverlap(tutorSubjects, lead.subjects || [])) continue;
        candidates.push({ lead, dist });
      }

      if (candidates.length > 0) {
        candidates.sort((a, b) => a.dist - b.dist);
        matchedRealLead = candidates[0].lead;
        closestDistanceKm = Math.round(candidates[0].dist * 10) / 10;
      }
    }

    // B. Build Payload
    if (matchedRealLead) {
      realLeadMatches++;

      const inqCode = String(matchedRealLead.inquiryNumber || matchedRealLead.id.slice(-6)).padStart(6, "0");
      const clientName = matchedRealLead.parentProfile?.user?.name?.trim() || "Parent";
      const rawClass = matchedRealLead.classLevel || "Class 8";

      // Class 1–8: strictly Home Tuition. Subjects stay what they teach / lead asked.
      const mode: "ONLINE" | "OFFLINE" =
        isTill8thClass(rawClass) ? "OFFLINE" : matchedRealLead.mode === "ONLINE" ? "ONLINE" : "OFFLINE";
      const subjects =
        matchedRealLead.subjects && matchedRealLead.subjects.length > 0
          ? matchedRealLead.subjects.map(cleanSubjectName).filter(Boolean)
          : pickTutorSubjects(tutorSubjects, rawClass, idx);

      const budget = getHealthyBudget(rawClass, mode === "OFFLINE");
      const timing = matchedRealLead.timingPreference || pickTiming(idx);
      const location = [matchedRealLead.area, matchedRealLead.city].filter(Boolean).join(", ") || tCity;

      preparedLeads.push({
        tutorUserId: tutor.id,
        tutorName,
        tutorEmail: tutor.email,
        tutorPhone: tutor.phone,
        normalizedPhone,
        isRealLead: true,
        distanceKm: closestDistanceKm,
        inquiryCode: inqCode,
        clientName,
        classLevel: rawClass,
        board: matchedRealLead.board || "CBSE",
        subjects,
        mode,
        location,
        budgetFormatted: budget.label,
        timing,
        preference: matchedRealLead.tutorGenderPref || "Any (Male or Female Tutor)",
        actionUrl: `https://apnatutorhub.com/tutor/leads`,
      });
    } else {
      dummyLeadMatches++;

      // Generate realistic geo-aware dummy lead
      const dummy = await generateDummyLead({
        tutorLat: tLat,
        tutorLng: tLng,
        tutorCity: tCity,
        tutorAddress: tutor.tutorProfile?.address,
        tutorSubjects: tutorSubjects,
        tutorClassLevels: tutor.tutorProfile?.classLevels,
        teachingRadius: MATCH_RADIUS_KM,
        teachingMode: "OFFLINE",
        userSeed: idx,
        stable: true,
        skipAi: true,
      });

      const inqCode = String(31600 + idx);
      const rawClass = dummy.classLevel || "Class 7";
      const mode: "ONLINE" | "OFFLINE" = isTill8thClass(rawClass)
        ? "OFFLINE"
        : dummy.mode === "ONLINE"
          ? "ONLINE"
          : "OFFLINE";
      const subjects = pickTutorSubjects(
        tutorSubjects.length > 0 ? tutorSubjects : dummy.subjects,
        rawClass,
        idx
      );

      const budget = getHealthyBudget(rawClass, mode === "OFFLINE");
      const timing = pickTiming(idx);
      const dummyKm = Math.min(MATCH_RADIUS_KM, Math.max(1, dummy.distanceKm || 3.2));
      const location = `${dummy.locality}, ${dummy.city}`;

      preparedLeads.push({
        tutorUserId: tutor.id,
        tutorName,
        tutorEmail: tutor.email,
        tutorPhone: tutor.phone,
        normalizedPhone,
        isRealLead: false,
        distanceKm: dummyKm,
        inquiryCode: inqCode,
        clientName: dummy.studentName,
        classLevel: rawClass,
        board: dummy.board || "CBSE",
        subjects,
        mode,
        location,
        budgetFormatted: budget.label,
        timing,
        preference: "Any (Male or Female Tutor)",
        actionUrl: `https://apnatutorhub.com/tutor/leads`,
      });
    }
  }

  console.log(`--- MATCHING BREAKDOWN ---`);
  console.log(`🎯 Tutors Matched with REAL Leads (<= ${MATCH_RADIUS_KM}km + subject): ${realLeadMatches}`);
  console.log(`📍 Tutors Matched with DUMMY Leads (nearby ${MATCH_RADIUS_KM}km + their subjects): ${dummyLeadMatches}`);
  const tutorsWithValidPhone = preparedLeads.filter((p) => Boolean(p.normalizedPhone));
  console.log(`📱 Tutors with Valid Phone for WhatsApp:     ${tutorsWithValidPhone.length}\n`);

  // Print 3 Samples
  console.log(`--- SAMPLE PREVIEW PAYLOADS ---`);
  for (const s of preparedLeads.slice(0, 3)) {
    console.log({
      tutor: `${s.tutorName} (${s.tutorEmail})`,
      phone: s.normalizedPhone,
      type: s.isRealLead ? `REAL (${s.distanceKm} km)` : `DUMMY (${s.distanceKm} km)`,
      enquiry: `#${s.inquiryCode}`,
      class: s.classLevel,
      subjects: s.subjects.join(", "),
      mode: s.mode,
      budget: s.budgetFormatted,
      timing: s.timing,
      location: s.location,
    });
  }

  if (isDryRun) {
    console.log(`\n✅ DRY RUN COMPLETED SUCCESSFULLY. No emails or WhatsApp messages were dispatched.`);
    console.log(`To dispatch live notifications, run with: --live\n`);
    return;
  }

  if (isInAppOnly) {
    console.log(`\n🔔 Creating in-app notifications only for ${preparedLeads.length} tutors...`);
    await prisma.$connect();
    const inApp = await prisma.notification.createMany({
      data: preparedLeads.map((p) => ({
        userId: p.tutorUserId,
        type: "LEAD_MATCHED" as const,
        priority: "HIGH" as const,
        channel: "WEB" as const,
        title: `🎯 New Tuition Requirement in ${p.location}`,
        message: `${p.classLevel} · ${p.subjects.join(", ")} needed. Budget: ${p.budgetFormatted}. Schedule: ${p.timing}.`,
        actionUrl: "/tutor/leads",
        isRead: false,
      })),
    });
    await prisma.auditLog.create({
      data: {
        adminId: "system-broadcast",
        action: "BROADCAST_GEO_LEADS_IN_APP",
        entityType: "Notification",
        details: `In-app geo-leads for ${preparedLeads.length} tutors (Real: ${realLeadMatches}, Dummy: ${dummyLeadMatches}). Created: ${inApp.count}.`,
      },
    });
    console.log(`In-App Notifications Created: ${inApp.count}`);
    return;
  }

  // ════════════════════════════════════════════════════════════════════════════════
  // LIVE DISPATCH SEQUENCE
  // ════════════════════════════════════════════════════════════════════════════════
  console.log(`\n🚀 INITIATING LIVE BROADCAST TO ${preparedLeads.length} TUTORS...\n`);

  // ── Step 1: Batch Emails (Resend) ─────────────────────────────────────────────
  const emailTargets = preparedLeads.filter((p) => isGenuineEmail(p.tutorEmail));
  console.log(`[1/3] Preparing ${emailTargets.length} genuine emails (skipped placeholder inboxes)...`);
  const emailBatchItems: BatchEmailItem[] = emailTargets.map((p) => {
    const html = renderNewMatchedLeadEmail({
      tutorName: p.tutorName,
      inquiryCode: p.inquiryCode,
      classLevel: p.classLevel,
      board: p.board,
      subjects: p.subjects,
      city: p.location,
      teachingMode: p.mode,
      budgetFormatted: p.budgetFormatted,
      timing: p.timing,
      coinCost: 10,
      leadUrl: p.actionUrl,
    });

    return {
      to: p.tutorEmail,
      subject: `🎯 New Tuition Requirement #${p.inquiryCode} in ${p.location} — ApnaTutorHub`,
      html,
    };
  });

  console.log(`Dispatching emails via Resend API (chunked by 100)...`);
  const emailResult = await sendBatchEmails(emailBatchItems);
  console.log(`Emails Dispatched: ${emailResult.sentCount} sent. Errors: ${emailResult.errors?.length || 0}`);

  // ── Step 2: WhatsApp Messages (Aqua SMS Pinbot `tuition_enquiry_direct`) ──────
  console.log(`\n[2/3] Dispatching WhatsApp messages to ${tutorsWithValidPhone.length} tutors...`);
  let waSentCount = 0;
  let waFailedCount = 0;

  for (let i = 0; i < tutorsWithValidPhone.length; i++) {
    const p = tutorsWithValidPhone[i];
    const phone = p.normalizedPhone!;

    // 7 Exact Parameters verified for tuition_enquiry_direct:
    // 1: Inquiry Number
    // 2: Client Name
    // 3: Class & Subjects
    // 4: Mode
    // 5: Location
    // 6: Budget
    // 7: Preference
    const waPlaceholders = [
      p.inquiryCode,
      p.clientName,
      `${p.classLevel} (${p.subjects.slice(0, 2).join(", ")})`,
      p.mode === "OFFLINE" ? "Home Tuition (Offline)" : "Online Class",
      p.location,
      p.budgetFormatted,
      p.preference,
    ];

    try {
      const waRes = await sendAquaWhatsAppMessage({
        to: phone,
        mode: "template",
        templateId: "tuition_enquiry_direct",
        placeholders: waPlaceholders,
        bypassDailyCap: true,
      });

      if (waRes.ok) {
        waSentCount++;
      } else {
        waFailedCount++;
        console.warn(`[WA Failed] ${phone} - ${waRes.error}`);
      }
    } catch (err) {
      waFailedCount++;
      console.warn(`[WA Error] ${phone} - ${err instanceof Error ? err.message : String(err)}`);
    }

    // Pacing to prevent rate-limit bursts (180ms delay between sends)
    await new Promise((resolve) => setTimeout(resolve, 180));

    if ((i + 1) % 25 === 0 || i === tutorsWithValidPhone.length - 1) {
      console.log(`WhatsApp Progress: ${i + 1}/${tutorsWithValidPhone.length} processed (${waSentCount} sent, ${waFailedCount} failed)`);
    }
  }

  // ── Step 3: In-App Notifications (Prisma) ─────────────────────────────────────
  console.log(`\n[3/3] Creating in-app bell notifications in database...`);
  await prisma.$connect();
  const inAppResult = await prisma.notification.createMany({
    data: preparedLeads.map((p) => ({
      userId: p.tutorUserId,
      type: "LEAD_MATCHED" as const,
      priority: "HIGH" as const,
      channel: "WEB" as const,
      title: `🎯 New Tuition Requirement in ${p.location}`,
      message: `${p.classLevel} · ${p.subjects.join(", ")} needed. Budget: ${p.budgetFormatted}. Schedule: ${p.timing}.`,
      actionUrl: "/tutor/leads",
      isRead: false,
    })),
  });
  const inAppCount = inAppResult.count;
  console.log(`In-App Notifications Created: ${inAppCount}`);

  // ── Step 4: Audit Log ─────────────────────────────────────────────────────────
  await prisma.auditLog.create({
    data: {
      adminId: "system-broadcast",
      action: "BROADCAST_GEO_LEADS",
      entityType: "Notification",
      details: `Dispatched Geo-Leads to ${preparedLeads.length} tutors (Real: ${realLeadMatches}, Dummy: ${dummyLeadMatches}). Emails: ${emailResult.sentCount}, WhatsApp: ${waSentCount}, In-App: ${inAppCount}.`,
    },
  });

  console.log(`\n======================================================`);
  console.log(`  🎉 BROADCAST EXECUTION COMPLETE`);
  console.log(`  - Emails Sent:     ${emailResult.sentCount} / ${emailTargets.length}`);
  console.log(`  - WhatsApp Sent:   ${waSentCount} / ${tutorsWithValidPhone.length} (Failed: ${waFailedCount})`);
  console.log(`  - In-App Created:  ${inAppCount} / ${preparedLeads.length}`);
  console.log(`======================================================\n`);
  return {
    prepared: preparedLeads.length,
    realLeadMatches,
    dummyLeadMatches,
    emailsSent: emailResult.sentCount,
    whatsappSent: waSentCount,
    whatsappFailed: waFailedCount,
    inAppCount,
  };
}
