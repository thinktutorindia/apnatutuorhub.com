/**
 * scripts/broadcast_4k_geo_leads.ts
 *
 * Dedicated Geo-Lead Broadcast Engine for 4,000 Tutors:
 * - Class 1 to 8: Strictly OFFLINE (Home Tuition) & Strictly MONTHLY based.
 * - Class 9+: Online or Offline (per tutor preference) & Strictly HOURLY based.
 * - Exact realistic pricing: small tight spreads, slightly above market (e.g. ₹5,220 – ₹5,700 / month, ₹580 – ₹660 / hr).
 * - Location: Strictly within 5 km radius, enriched with realistic sub-landmarks (e.g. "Sangam Vihar, 16 No. Road, Near Kumar Sweets").
 * - Target Pool: Exactly 4,000 tutors with valid location AND subjects (includes Abdullah Sheikh at #1).
 * - Multi-Channel: WhatsApp (Aqua SMS Pinbot), Email (Resend Batch API), Web Push & In-App Notification.
 *
 * Usage:
 *   npx tsx scripts/broadcast_4k_geo_leads.ts --dry-run
 *   npx tsx scripts/broadcast_4k_geo_leads.ts --in-app-only
 *   npx tsx scripts/broadcast_4k_geo_leads.ts --live
 */

import * as fs from "fs";
import * as readline from "readline";
import { prisma } from "../lib/prisma";
import { normalizeIndiaWhatsApp, sendAquaWhatsAppMessage } from "../lib/aqua-whatsapp";
import { sendBatchEmails, type BatchEmailItem } from "../lib/resend-service";
import { renderNewMatchedLeadEmail } from "../emails/NewMatchedLeadEmail";
import { sendWebPush } from "../lib/web-push";
import { isGenuineEmail } from "../lib/lead-utils";
import { getLeadPointCost } from "../lib/subscription-plans";

// Load environment variables from .env.local if present
try {
  const localEnv = fs.readFileSync(".env.local", "utf8");
  for (const line of localEnv.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [k, ...rest] = trimmed.split("=");
    const key = k.trim();
    if (!key || process.env[key]) continue;
    process.env[key] = rest.join("=").replace(/^["']|["']$/g, "").trim();
  }
} catch {}

const TARGET_COUNT = 4000;

// ── Landmark Generators ────────────────────────────────────────────────────────
const SANGAM_VIHAR_LANDMARKS = [
  "16 No. Road, Near Kumar Sweets",
  "Peepal Chowk, Near Sharma Medicos",
  "Block L-1st, Near Devli Mor",
  "Gali No. 4, Near Hamdard Nagar",
  "Bandh Road, Near Shiv Mandir",
  "Block C, Near DDA Park",
  "Peepli Chowk, Near Mother Dairy",
];

const GENERIC_LANDMARKS = [
  "Block B, Near Mother Dairy",
  "Sector Main Market, Near SBI Branch",
  "Pocket 3, Near Community Centre",
  "Main Road, Near Apollo Pharmacy",
  "Block C, Near Ram Mandir",
  "Gali No. 6, Near Central Park",
  "Near Metro Station Gate No. 2",
  "Avenue Road, Near Aggarwal Sweets",
  "Block D, Near Govt Primary School",
  "Phase 1, Near Shopping Complex",
];

export function enhanceLocalityWithLandmark(rawLocation: string, seed: number): { location: string; distanceKm: number } {
  const loc = rawLocation.trim();
  const isSangamVihar = /sangam\s*vihar/i.test(loc);
  const distances = [1.4, 1.8, 2.2, 2.7, 3.1, 3.6, 4.1, 4.4];
  const distanceKm = distances[seed % distances.length];

  if (isSangamVihar) {
    const landmark = SANGAM_VIHAR_LANDMARKS[seed % SANGAM_VIHAR_LANDMARKS.length];
    return {
      location: `Sangam Vihar, ${landmark}, New Delhi`,
      distanceKm,
    };
  }

  if (/near|gali|road|block|sector|pocket/i.test(loc)) {
    return {
      location: loc,
      distanceKm,
    };
  }

  const landmark = GENERIC_LANDMARKS[seed % GENERIC_LANDMARKS.length];
  return {
    location: `${loc}, ${landmark}`,
    distanceKm,
  };
}

// ── Realistic Exact Pricing Generator ──────────────────────────────────────────
export function getHealthyBudget(classLevel: string, isOffline: boolean, seed: number): { min: number; max: number; label: string } {
  const numMatch = classLevel.match(/\b(\d{1,2})\b/);
  const grade = numMatch ? parseInt(numMatch[1], 10) : 7;

  // Class 1 to 8: STRICTLY MONTHLY, exact pricing, no high difference (e.g. 5220 - 5700)
  if (grade <= 5) {
    const bases = [4850, 4920, 5100, 5150, 5220, 5250, 5300];
    const spreads = [450, 480, 500, 520, 550];
    const min = bases[seed % bases.length];
    const max = min + spreads[(seed + 1) % spreads.length];
    return {
      min,
      max,
      label: `₹${min.toLocaleString("en-IN")} – ₹${max.toLocaleString("en-IN")} / month`,
    };
  }

  if (grade <= 8) {
    const bases = [5450, 5580, 5650, 5720, 5850, 5920];
    const spreads = [480, 520, 550, 580, 600];
    const min = bases[seed % bases.length];
    const max = min + spreads[(seed + 2) % spreads.length];
    return {
      min,
      max,
      label: `₹${min.toLocaleString("en-IN")} – ₹${max.toLocaleString("en-IN")} / month`,
    };
  }

  // Class 9 and above: STRICTLY HOURLY, exact pricing, small spread
  if (grade <= 10) {
    const bases = [580, 600, 620, 650, 680];
    const spreads = [70, 80, 90, 100];
    const min = bases[seed % bases.length];
    const max = min + spreads[(seed + 1) % spreads.length];
    return {
      min,
      max,
      label: `₹${min} – ₹${max} / hr`,
    };
  }

  if (grade <= 12) {
    const bases = [850, 880, 920, 950, 980];
    const spreads = [90, 100, 110, 120];
    const min = bases[seed % bases.length];
    const max = min + spreads[(seed + 2) % spreads.length];
    return {
      min,
      max,
      label: `₹${min} – ₹${max} / hr`,
    };
  }

  const bases = [1150, 1220, 1280, 1350];
  const spreads = [130, 150, 170];
  const min = bases[seed % bases.length];
  const max = min + spreads[seed % spreads.length];
  return {
    min,
    max,
    label: `₹${min} – ₹${max} / hr`,
  };
}

// ── Realistic Timings ─────────────────────────────────────────────────────────
const REALISTIC_TIMINGS = [
  "Evening (4:30 PM to 6:30 PM)",
  "Evening (5:00 PM to 7:00 PM)",
  "Evening (5:30 PM to 7:30 PM)",
  "Late Afternoon (3:30 PM to 5:30 PM)",
  "Evening (6:00 PM to 8:00 PM)",
  "Weekend (10:00 AM to 1:00 PM)",
];

const CLIENT_NAMES = [
  "Mrs. Sharma",
  "Mr. Rajesh Verma",
  "Pooja Gupta",
  "Dr. Anita Sen",
  "Vikram Malhotra",
  "Suresh Mehra",
  "Sunita Rawat",
  "Ashok Singhal",
  "Ritu Batra",
  "Kavita Chauhan",
];

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

export interface PreparedLeadTarget {
  tutorUserId?: string;
  name: string;
  phone: string;
  normalizedPhone: string | null;
  email: string;
  inquiryCode: string;
  clientName: string;
  classLevel: string;
  board: string;
  subjects: string[];
  mode: "Home Tuition (Offline)" | "Online Class";
  location: string;
  distanceKm: number;
  budgetFormatted: string;
  timing: string;
  preference: string;
  actionUrl: string;
}

export async function assemble4kTargetPool(): Promise<PreparedLeadTarget[]> {
  console.log("Assembling qualified pool of 4,000 tutors with location & subjects...\n");

  const pool: PreparedLeadTarget[] = [];
  const seenPhones = new Set<string>();
  const seenEmails = new Set<string>();

  // 1. Fetch DB Tutors
  const dbUsers = await prisma.user.findMany({
    where: {
      role: "TUTOR",
      isActive: true,
      tutorProfile: { isNot: null },
    },
    include: { tutorProfile: true },
    orderBy: { createdAt: "desc" },
  });

  // Explicitly ensure Abdullah Sheikh is index 0
  const abdullah = dbUsers.find(
    (u) =>
      u.email === "itsabdullahsheikh760@gmail.com" ||
      u.phone === "9870302711" ||
      u.name.toLowerCase().includes("abdullah")
  );

  const availableDbTutors = [
    ...(abdullah ? [abdullah] : []),
    ...dbUsers.filter((u) => u.id !== abdullah?.id),
  ];

  for (const u of availableDbTutors) {
    const prof = u.tutorProfile;
    if (!prof) continue;
    const rawLoc = (prof.address || prof.city || "").trim();
    const subs = prof.subjects || [];
    if (!rawLoc || subs.length === 0) continue;

    const normPhone = u.phone ? normalizeIndiaWhatsApp(u.phone) : null;
    if (normPhone) {
      if (seenPhones.has(normPhone)) continue;
      seenPhones.add(normPhone);
    }
    if (u.email && isGenuineEmail(u.email)) {
      if (seenEmails.has(u.email.toLowerCase())) continue;
      seenEmails.add(u.email.toLowerCase());
    }

    const seed = pool.length;
    const locInfo = enhanceLocalityWithLandmark(rawLoc, seed);

    // Pick class based on tutor classes or rotation
    const classCandidates = ["Class 8", "Class 7", "Class 4", "Class 9", "Class 10", "Class 12"];
    const classLevel = (prof.classLevels && prof.classLevels.length > 0)
      ? prof.classLevels[seed % prof.classLevels.length]
      : classCandidates[seed % classCandidates.length];

    const numMatch = classLevel.match(/\b(\d{1,2})\b/);
    const grade = numMatch ? parseInt(numMatch[1], 10) : 8;
    const isTill8 = grade <= 8;

    // Class 1 to 8: Strictly OFFLINE
    const mode = isTill8
      ? "Home Tuition (Offline)"
      : prof.teachingMode === "ONLINE"
        ? "Online Class"
        : prof.teachingMode === "OFFLINE"
          ? "Home Tuition (Offline)"
          : seed % 2 === 0
            ? "Home Tuition (Offline)"
            : "Online Class";

    const budget = getHealthyBudget(classLevel, mode.includes("Offline"), seed);
    const leadSubjects = subs.slice(0, 2);

    pool.push({
      tutorUserId: u.id,
      name: u.name || "Tutor",
      phone: u.phone || "",
      normalizedPhone: normPhone,
      email: u.email,
      inquiryCode: String(31840 + seed),
      clientName: CLIENT_NAMES[seed % CLIENT_NAMES.length],
      classLevel,
      board: "CBSE",
      subjects: leadSubjects.length > 0 ? leadSubjects : ["Mathematics", "Science"],
      mode,
      location: locInfo.location,
      distanceKm: locInfo.distanceKm,
      budgetFormatted: budget.label,
      timing: REALISTIC_TIMINGS[seed % REALISTIC_TIMINGS.length],
      preference: "Any (Male or Female Tutor)",
      actionUrl: "https://apnatutorhub.com/tutor/leads",
    });
  }

  console.log(`Qualified Tutors from Database: ${pool.length}`);

  // 2. Load from MASTER_TUTORS_ONLY.csv to reach exact TARGET_COUNT
  const fileStream = fs.createReadStream("datauploadrawdata/MASTER_TUTORS_ONLY.csv");
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let lineIdx = 0;
  for await (const line of rl) {
    if (pool.length >= TARGET_COUNT) break;
    if (!line.trim()) continue;
    lineIdx++;
    if (lineIdx === 1) continue; // header

    const cols = parseCSVLine(line);
    const name = cols[1]?.trim() || "Tutor";
    const rawPhone = cols[2]?.trim() || "";
    const email = cols[4]?.trim() || "";
    const rawLoc = (cols[5]?.trim() || cols[7]?.trim() || "").replace(/^"+|"+$/g, "").trim();
    const rawSubjects = cols[8]?.trim() || "";
    const rawClasses = cols[9]?.trim() || "";

    if (!rawLoc || rawLoc.length < 3) continue;
    if (!rawSubjects || rawSubjects.length < 2) continue;

    const normPhone = normalizeIndiaWhatsApp(rawPhone);
    if (!normPhone || normPhone.length !== 12) continue;
    if (seenPhones.has(normPhone)) continue;

    const cleanEmail = email && isGenuineEmail(email) ? email.toLowerCase() : "";
    if (cleanEmail && seenEmails.has(cleanEmail)) continue;

    seenPhones.add(normPhone);
    if (cleanEmail) seenEmails.add(cleanEmail);

    const subjects = rawSubjects
      .split(/[,;&/]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 1 && !/^(and|all|class|upto)$/i.test(s));

    const classes = rawClasses
      .split(/[,;&/]+/)
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    const seed = pool.length;
    const locInfo = enhanceLocalityWithLandmark(rawLoc, seed);

    const classCandidates = ["Class 7", "Class 8", "Class 4", "Class 10", "Class 9", "Class 12"];
    const classLevel = classes.length > 0 ? classes[seed % classes.length] : classCandidates[seed % classCandidates.length];

    const numMatch = classLevel.match(/\b(\d{1,2})\b/);
    const grade = numMatch ? parseInt(numMatch[1], 10) : 8;
    const isTill8 = grade <= 8;

    const mode = isTill8
      ? "Home Tuition (Offline)"
      : seed % 2 === 0
        ? "Home Tuition (Offline)"
        : "Online Class";

    const budget = getHealthyBudget(classLevel, mode.includes("Offline"), seed);
    const leadSubjects = subjects.slice(0, 2);

    pool.push({
      name,
      phone: normPhone.replace(/^91/, ""),
      normalizedPhone: normPhone,
      email: cleanEmail,
      inquiryCode: String(31840 + seed),
      clientName: CLIENT_NAMES[seed % CLIENT_NAMES.length],
      classLevel,
      board: "CBSE",
      subjects: leadSubjects.length > 0 ? leadSubjects : ["Mathematics", "Science"],
      mode,
      location: locInfo.location,
      distanceKm: locInfo.distanceKm,
      budgetFormatted: budget.label,
      timing: REALISTIC_TIMINGS[seed % REALISTIC_TIMINGS.length],
      preference: "Any (Male or Female Tutor)",
      actionUrl: "https://apnatutorhub.com/tutor/leads",
    });
  }

  console.log(`Target Pool Successfully Assembled: ${pool.length} Tutors!`);
  return pool;
}

export type BroadcastRunMode = "dry-run" | "in-app-only" | "live";

export async function run4kBroadcast(mode: BroadcastRunMode = "dry-run") {
  console.log(`======================================================`);
  console.log(`  APNATUTORHUB: 4,000 TUTOR GEO-LEAD BROADCAST ENGINE`);
  console.log(`  MODE: ${mode === "dry-run" ? "🔍 DRY RUN (Simulation Only)" : mode === "in-app-only" ? "🔔 IN-APP NOTIFICATIONS ONLY" : "🚀 LIVE DISPATCH (WhatsApp + Email + Push)"}`);
  console.log(`======================================================\n`);

  const pool = await assemble4kTargetPool();

  console.log(`\n--- FIRST 3 SAMPLE PREVIEWS ---`);
  for (const s of pool.slice(0, 3)) {
    console.log({
      tutor: `${s.name} (${s.normalizedPhone || "No Phone"}, ${s.email || "No Email"})`,
      inquiry: `#${s.inquiryCode}`,
      client: s.clientName,
      class: s.classLevel,
      subjects: s.subjects.join(", "),
      mode: s.mode,
      budget: s.budgetFormatted,
      location: s.location,
      distance: `${s.distanceKm} km`,
      timing: s.timing,
    });
  }

  const validPhones = pool.filter((p) => Boolean(p.normalizedPhone));
  const validEmails = pool.filter((p) => isGenuineEmail(p.email));
  const dbUsers = pool.filter((p) => Boolean(p.tutorUserId));

  console.log(`\n--- RECIPIENT REACH SUMMARY ---`);
  console.log(`📱 WhatsApp Targets (Valid Indian Phones): ${validPhones.length}`);
  console.log(`✉️  Email Targets (Genuine Inboxes):       ${validEmails.length}`);
  console.log(`🔔 In-App / Web Push Targets:              ${dbUsers.length}`);

  if (mode === "dry-run") {
    console.log(`\n✅ DRY RUN COMPLETE. No live WhatsApp or Emails were sent.`);
    console.log(`Ready for live dispatch with: --live\n`);
    return;
  }

  // 1. In-App Notifications
  console.log(`\n[1/3] Creating in-app notifications for ${dbUsers.length} registered accounts...`);
  if (dbUsers.length > 0) {
    const inApp = await prisma.notification.createMany({
      data: dbUsers.map((p) => ({
        userId: p.tutorUserId!,
        type: "LEAD_MATCHED" as const,
        priority: "HIGH" as const,
        channel: "WEB" as const,
        title: `🎯 New Tuition Requirement in ${p.location}`,
        message: `${p.classLevel} · ${p.subjects.join(", ")} needed. Budget: ${p.budgetFormatted}. Schedule: ${p.timing}.`,
        actionUrl: "/tutor/leads",
        isRead: false,
      })),
    });
    console.log(`✅ In-App Notifications Created: ${inApp.count}`);

    // Trigger Web Push for users with active push subscriptions
    for (const u of dbUsers) {
      sendWebPush(u.tutorUserId!, {
        title: `🎯 New Tuition Requirement in ${u.location}`,
        body: `${u.classLevel} (${u.subjects.join(", ")}) · ${u.budgetFormatted}`,
        url: "/tutor/leads",
        tag: `geo-lead-${u.inquiryCode}`,
      }).catch(() => {});
    }
  }

  if (mode === "in-app-only") {
    console.log(`✅ In-App dispatch completed.`);
    return;
  }

  // 2. Batch Emails via Resend
  console.log(`\n[2/3] Dispatching Batch Emails to ${validEmails.length} tutors via Resend...`);
  const emailBatch: BatchEmailItem[] = validEmails.map((p) => {
    const html = renderNewMatchedLeadEmail({
      tutorName: p.name,
      inquiryCode: p.inquiryCode,
      classLevel: p.classLevel,
      board: p.board,
      subjects: p.subjects,
      city: p.location,
      teachingMode: p.mode.includes("Offline") ? "OFFLINE" : "ONLINE",
      budgetFormatted: p.budgetFormatted,
      timing: p.timing,
      coinCost: getLeadPointCost(p.classLevel),
      leadUrl: p.actionUrl,
    });

    const cleanLocation = p.location.replace(/[\r\n]+/g, " ").trim();
    return {
      to: p.email,
      subject: `🎯 New Tuition Requirement #${p.inquiryCode} in ${cleanLocation} — ApnaTutorHub`,
      html,
    };
  });

  const emailRes = await sendBatchEmails(emailBatch);
  console.log(`✅ Emails Dispatched: ${emailRes.sentCount} sent. Errors: ${emailRes.errors?.length || 0}`);

  // 3. WhatsApp Messages via Aqua SMS Pinbot
  console.log(`\n[3/3] Dispatching WhatsApp messages to ${validPhones.length} tutors...`);
  let waSent = 0;
  let waFailed = 0;

  for (let i = 0; i < validPhones.length; i++) {
    const p = validPhones[i];
    const phone = p.normalizedPhone!;

    const placeholders = [
      p.inquiryCode,
      p.clientName,
      `${p.classLevel} (${p.subjects.slice(0, 2).join(", ")})`,
      p.mode,
      p.location,
      p.budgetFormatted,
      p.preference,
    ];

    try {
      const res = await sendAquaWhatsAppMessage({
        to: phone,
        mode: "template",
        templateId: "tuition_enquiry_direct",
        placeholders,
        bypassDailyCap: true,
      });

      if (res.ok) {
        waSent++;
        // Log to chat messages table
        prisma.whatsappChatMessage
          .create({
            data: {
              phone,
              direction: "OUTBOUND",
              senderName: "System Broadcast",
              body: `[Tuition Enquiry #${p.inquiryCode}]\nClient: ${p.clientName}\nClass: ${p.classLevel} (${p.subjects.slice(0, 2).join(", ")})\nMode: ${p.mode}\nLocation: ${p.location}\nBudget: ${p.budgetFormatted}\nPreference: ${p.preference}`,
              step: "BROADCAST_LEAD",
              messageId: res.providerMessageId || null,
              isRead: true,
            },
          })
          .catch(() => {});
      } else {
        waFailed++;
      }
    } catch {
      waFailed++;
    }

    // Pacing delay (180ms)
    await new Promise((r) => setTimeout(r, 180));

    if ((i + 1) % 50 === 0 || i === validPhones.length - 1) {
      console.log(`WhatsApp Progress: ${i + 1}/${validPhones.length} processed (${waSent} sent, ${waFailed} failed)`);
    }
  }

  // Audit Log
  await prisma.auditLog.create({
    data: {
      adminId: "system-broadcast",
      action: "BROADCAST_4K_GEO_LEADS",
      entityType: "Notification",
      details: `4k Geo-Leads Broadcast: ${pool.length} tutors. Emails: ${emailRes.sentCount}, WhatsApp: ${waSent} (Failed: ${waFailed}), In-App: ${dbUsers.length}.`,
    },
  });

  console.log(`\n======================================================`);
  console.log(`  🎉 4,000 GEO-LEAD BROADCAST COMPLETE`);
  console.log(`  - Emails Sent:     ${emailRes.sentCount} / ${validEmails.length}`);
  console.log(`  - WhatsApp Sent:   ${waSent} / ${validPhones.length}`);
  console.log(`  - In-App Created:  ${dbUsers.length}`);
  console.log(`======================================================\n`);
}

// Direct CLI invocation
if (process.argv[1]?.includes("broadcast_4k_geo_leads")) {
  const modeArg: BroadcastRunMode = process.argv.includes("--live")
    ? "live"
    : process.argv.includes("--in-app-only")
      ? "in-app-only"
      : "dry-run";

  run4kBroadcast(modeArg)
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}
