/**
 * scripts/broadcast_geo_leads.ts
 *
 * Dispatches personalized lead notifications to all real tutors:
 * - Strict 10 km radius filter for real leads.
 * - Realistic fallback dummy lead if > 10 km or no real lead nearby.
 * - Rules:
 *   1. Class 1 to 8: Strictly Home Tuition (Offline) & "All Subjects".
 *   2. Class 9 to 10: Specific core subjects (Maths, Science, etc.).
 *   3. Class 11 to 12 / Competitive: Stream subjects (PCM, PCB, Accounts, Coding, etc.).
 *   4. Proper evening/afternoon timings.
 *   5. Healthy, attractive market pricing ("little high not extreme").
 *   6. Multi-channel: Email (Resend), WhatsApp (Aqua SMS `tuition_enquiry_direct`), In-App Notification.
 *
 * Usage:
 *   npx tsx scripts/broadcast_geo_leads.ts --dry-run
 *   npx tsx scripts/broadcast_geo_leads.ts --live
 */

import * as fs from "fs";
import { prisma } from "../lib/prisma";
import { isGenuineEmail } from "../lib/lead-utils";
import { haversineDistanceKm } from "../lib/haversine";
import { renderNewMatchedLeadEmail } from "../emails/NewMatchedLeadEmail";
import { sendAquaWhatsAppMessage, normalizeIndiaWhatsApp } from "../lib/aqua-whatsapp";
import { sendBatchEmails, type BatchEmailItem } from "../lib/resend-service";
import { generateDummyLead } from "../lib/dummy-lead-engine";

// Ensure AQUA_ environment variables from .env.local are loaded into process.env
try {
  const localEnv = fs.readFileSync(".env.local", "utf8");
  for (const line of localEnv.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("AQUA_") && trimmed.includes("=")) {
      const [k, ...rest] = trimmed.split("=");
      const v = rest.join("=").replace(/^["']|["']$/g, "");
      process.env[k.trim()] = v.trim();
    }
  }
} catch (e) {}

const isDryRun = process.argv.includes("--dry-run");
const isLive = process.argv.includes("--live");

if (!isDryRun && !isLive) {
  console.log("Please specify either --dry-run or --live.");
  console.log("Example: npx tsx scripts/broadcast_geo_leads.ts --dry-run");
  process.exit(1);
}

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

async function main() {
  console.log(`\n======================================================`);
  console.log(`  APNATUTORHUB: 10KM GEO-LEAD BROADCAST ENGINE`);
  console.log(`  MODE: ${isDryRun ? "🔍 DRY RUN (Simulation Only)" : "🚀 LIVE DISPATCH"}`);
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

  // Filter real tutors (genuine personal emails, marketing enabled)
  const realTutors = allTutors.filter((t) => {
    if (!isGenuineEmail(t.email)) return false;
    if (t.tutorProfile && t.tutorProfile.marketingNotifsEnabled === false) return false;
    return true;
  });

  console.log(`Total Active Tutors in Database: ${allTutors.length}`);
  console.log(`Target Genuine Tutors (Emails):  ${realTutors.length}`);

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

    // A. Check for real leads within 10 km
    if (tLat != null && tLng != null) {
      const candidates: Array<{ lead: (typeof activeLeads)[0]; dist: number }> = [];

      for (const lead of activeLeads) {
        if (lead.latitude != null && lead.longitude != null) {
          const dist = haversineDistanceKm(tLat, tLng, lead.latitude, lead.longitude);
          if (dist <= 10.0) {
            candidates.push({ lead, dist });
          }
        }
      }

      if (candidates.length > 0) {
        // Sort by distance
        candidates.sort((a, b) => a.dist - b.dist);

        // Check if any candidate overlaps with tutor's subjects
        const tutorSubjects = (tutor.tutorProfile?.subjects || []).map((s) => s.toLowerCase());
        const subjectMatch = candidates.find((c) =>
          c.lead.subjects.some((ls) =>
            tutorSubjects.some((ts) => ts.includes(ls.toLowerCase()) || ls.toLowerCase().includes(ts))
          )
        );

        const chosen = subjectMatch || candidates[0];
        matchedRealLead = chosen.lead;
        closestDistanceKm = Math.round(chosen.dist * 10) / 10;
      }
    }

    // B. Build Payload
    if (matchedRealLead) {
      realLeadMatches++;

      const inqCode = String(matchedRealLead.inquiryNumber || matchedRealLead.id.slice(-6)).padStart(6, "0");
      const clientName = matchedRealLead.parentProfile?.user?.name?.trim() || "Parent";
      const rawClass = matchedRealLead.classLevel || "Class 8";
      const numMatch = rawClass.match(/\b(\d{1,2})\b/);
      const grade = numMatch ? parseInt(numMatch[1], 10) : 8;

      // Rule: Class 1 to 8: strictly OFFLINE mode and "All Subjects"
      const mode: "ONLINE" | "OFFLINE" = grade <= 8 ? "OFFLINE" : (matchedRealLead.mode === "ONLINE" ? "ONLINE" : "OFFLINE");
      let subjects = matchedRealLead.subjects && matchedRealLead.subjects.length > 0 ? matchedRealLead.subjects : ["All Subjects"];
      if (grade <= 8) {
        subjects = ["All Subjects (Maths, Science, English, Hindi, SST)"];
      }

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
        tutorSubjects: tutor.tutorProfile?.subjects,
        tutorClassLevels: tutor.tutorProfile?.classLevels,
        userSeed: idx,
        stable: true,
      });

      const inqCode = String(31600 + idx);
      const rawClass = dummy.classLevel || "Class 7";
      const numMatch = rawClass.match(/\b(\d{1,2})\b/);
      const grade = numMatch ? parseInt(numMatch[1], 10) : 7;

      // Rule: Class 1 to 8: strictly OFFLINE mode and "All Subjects"
      const mode: "ONLINE" | "OFFLINE" = grade <= 8 ? "OFFLINE" : (dummy.mode === "ONLINE" ? "ONLINE" : "OFFLINE");
      let subjects = dummy.subjects && dummy.subjects.length > 0 ? dummy.subjects : ["All Subjects"];
      if (grade <= 8) {
        subjects = ["All Subjects (Maths, Science, English, Hindi, SST)"];
      } else if (grade >= 11) {
        subjects = ["Physics, Chemistry, Mathematics (PCM)"];
      }

      const budget = getHealthyBudget(rawClass, mode === "OFFLINE");
      const timing = pickTiming(idx);
      const location = `${dummy.locality}, ${dummy.city}`;

      preparedLeads.push({
        tutorUserId: tutor.id,
        tutorName,
        tutorEmail: tutor.email,
        tutorPhone: tutor.phone,
        normalizedPhone,
        isRealLead: false,
        distanceKm: dummy.distanceKm || 3.5,
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
  console.log(`🎯 Tutors Matched with REAL Leads (<= 10km): ${realLeadMatches}`);
  console.log(`📍 Tutors Matched with DUMMY Leads (> 10km): ${dummyLeadMatches}`);
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

  // ════════════════════════════════════════════════════════════════════════════════
  // LIVE DISPATCH SEQUENCE
  // ════════════════════════════════════════════════════════════════════════════════
  console.log(`\n🚀 INITIATING LIVE BROADCAST TO ${preparedLeads.length} TUTORS...\n`);

  // ── Step 1: Batch Emails (Resend) ─────────────────────────────────────────────
  console.log(`[1/3] Preparing ${preparedLeads.length} batch emails...`);
  const emailBatchItems: BatchEmailItem[] = preparedLeads.map((p) => {
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
  let inAppCount = 0;
  for (const p of preparedLeads) {
    try {
      await prisma.notification.create({
        data: {
          userId: p.tutorUserId,
          type: "LEAD_MATCHED",
          priority: "HIGH",
          channel: "WEB",
          title: `🎯 New Tuition Requirement in ${p.location}`,
          message: `${p.classLevel} · ${p.subjects.join(", ")} needed. Budget: ${p.budgetFormatted}. Schedule: ${p.timing}.`,
          actionUrl: "/tutor/leads",
          isRead: false,
        },
      });
      inAppCount++;
    } catch {}
  }
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
  console.log(`  - Emails Sent:     ${emailResult.sentCount} / ${preparedLeads.length}`);
  console.log(`  - WhatsApp Sent:   ${waSentCount} / ${tutorsWithValidPhone.length} (Failed: ${waFailedCount})`);
  console.log(`  - In-App Created:  ${inAppCount} / ${preparedLeads.length}`);
  console.log(`======================================================\n`);
}

main()
  .catch((e) => {
    console.error("Fatal error during broadcast:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
