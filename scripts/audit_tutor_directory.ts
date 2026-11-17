/**
 * Full data-quality audit of every tutor in the User directory.
 * Shows how many tutors are 100% send-ready (name + phone + email +
 * NCR city + clean locality + real coords + classes/subjects) and
 * exactly which checks fail for the rest.
 *
 * Run: npx tsx --env-file=.env scripts/audit_tutor_directory.ts
 */
import { PrismaClient } from "@prisma/client";
import { extractAllGrades, isJunkLocality } from "../lib/whatsapp-bot/leads-helper";
import { resolveLocationCoordinates } from "../lib/geocoding";

const prisma = new PrismaClient();

const NCR_CITY_RE =
  /\b(new delhi|delhi|noida|greater noida|gurgaon|gurugram|ghaziabad|faridabad|loni)\b/i;

function isJunkTutorName(name: string): boolean {
  const n = (name || "").trim();
  if (!n) return true;
  const l = n.toLowerCase();
  if (/^tutor(\s|$|\d)/.test(l)) return true;
  if (/\d/.test(n)) return true;
  if (/[\u{1F000}-\u{1FAFF}\u{2190}-\u{27BF}\u{FE0F}]/u.test(n)) return true;
  if (n.replace(/[^a-zA-Z]/g, "").length < 3) return true;
  if (/^(unknown|user|whatsapp user|parent|student|sir|madam|na|nhi)$/.test(l)) return true;
  if (/\b(school|academy|institute|coaching|tutorial|classes|centre|center|home tuition|tuition)\b/.test(l)) return true;
  if (/helpline|corporation|building\s+material|\bpvt\b|\bltd\b|\bllp\b|\benterprises\b|\btraders\b|\bcompany\b/.test(l)) return true;
  if (/\bco\s*\.?\s*in\b/.test(l)) return true;
  if (/\b(delhi|noida|gurgaon|gurugram|rohini|dwarka|faridabad|ghaziabad)\b$/.test(l)) return true;
  if (/^(psychology|mathematics|maths|math or science|science|english|hindi|all subjects|chemistry|biology|physics|accountancy|economics)\b/.test(l)) return true;
  if (n.split(/\s+/).length >= 6) return true;
  return false;
}

function isJunkLocalityText(loc: string, tutorName?: string): boolean {
  const l = (loc || "").toLowerCase().trim();
  if (!l || l.length < 3) return true;
  if (/^(noted|sorry|nhi|nahi|nothing|none|pending|mention it|not mentioned|na|no|yes|ok|okay|hk|thik|theek)\b/.test(l)) return true;
  if (/location at|current location|my location|coordinates/.test(l)) return true;
  if (/\d{1,3}\.\d{3,}.*\d{1,3}\.\d{3,}/.test(l)) return true;
  if (/^(north|south|east|west)\s*(,|\band\b|\.)?\s*(and)?\s*,?\s*\.?$/.test(l)) return true;
  if (/\b(mathematics|maths|physics|chemistry|science|biology|iit|jee|neet|online)\b/.test(l)) return true;
  if (/\b\d+\s*km\b|from\s+border|anything\s+else|^outside$/.test(l)) return true;
  if (/\balpha\b|\bbeta\b/.test(l)) return true;
  if (tutorName && l === tutorName.toLowerCase().trim()) return true;
  return false;
}

function isTestOrDemoTutor(name: string, email: string): boolean {
  const n = (name || "").toLowerCase();
  const e = (email || "").toLowerCase();
  if (/demo|dummy|pending kyc|sample/.test(n)) return true;
  if (/^test|\.test@|@test\.|test@apnatutorhub/.test(e)) return true;
  if (/\b(test|demo|dummy)\b/.test(e.split("@")[0] || "")) return true;
  return false;
}

function cleanDisplayPhone(phone: string | null | undefined): string {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

function isRealEmail(email: string | null | undefined): boolean {
  const e = (email || "").trim();
  if (!e.includes("@")) return false;
  if (/apnatutorhub\.com$/i.test(e)) return false; // system placeholder
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
}

function isDefaultDelhiCoords(lat?: number | null, lng?: number | null): boolean {
  return (
    lat != null && lng != null &&
    Math.abs(lat - 28.5355) < 0.02 && Math.abs(lng - 77.2410) < 0.02
  );
}

async function main() {
  const tutors = await prisma.user.findMany({
    where: { role: "TUTOR" },
    select: {
      id: true, name: true, email: true, phone: true, isActive: true, createdAt: true,
      tutorProfile: { select: { address: true, city: true, latitude: true, longitude: true, subjects: true, classLevels: true } },
    },
  });

  const active = tutors.filter((t) => t.isActive);
  const inactive = tutors.length - active.length;

  let testDemo = 0, junkName = 0, noPhone = 0, badPhone = 0, dupPhone = 0;
  let noEmailReal = 0, noProfile = 0, junkLocality = 0, blankCity = 0, nonNcr = 0;
  let noClassOrSubj = 0, noCoords = 0, defaultCoords = 0, unresolvableLoc = 0;
  let nameNotTitleCase = 0;
  let perfect = 0;

  const seenPhones = new Map<string, number>();
  for (const t of active) {
    const p = String(t.phone || "");
    const digits = cleanDisplayPhone(p);
    if (digits.length === 10) seenPhones.set(digits, (seenPhones.get(digits) || 0) + 1);
  }
  const dupPhoneDigits = new Set([...seenPhones.entries()].filter(([, c]) => c > 1).map(([k]) => k));

  const cityCounter = new Map<string, number>();
  const perfectRows: { id: string; name: string; phone: string; email: string; city: string; locality: string; classes: string; subjects: string }[] = [];
  const failing: Record<string, number> = {};

  // Tier definitions (each tier adds one allowed weakness):
  // A = 100% perfect · B = + blank/placeholder email · C = + approx coords
  // D = sheet-eligible (junk locality w/ valid city fallback allowed)
  let tierB = 0, tierC = 0, tierD = 0;
  const tierBCauses = new Map<string, number>();

  function bump(reason: string) {
    failing[reason] = (failing[reason] || 0) + 1;
  }

  for (const t of active) {
    const prof = t.tutorProfile;
    const fails = new Set<string>();
    const name = (t.name || "").trim();

    if (isTestOrDemoTutor(t.name || "", t.email || "")) { testDemo++; fails.add("test/demo account"); }
    if (isJunkTutorName(name)) { junkName++; fails.add("junk tutor name"); }
    else if (/\b[A-Z]{2,}\b/.test(name) || /[.,]$/.test(name)) { nameNotTitleCase++; fails.add("name not title-cased"); }

    const digits = cleanDisplayPhone(t.phone);
    if (!t.phone || !digits) { noPhone++; fails.add("no phone"); }
    else if (digits.length !== 10) { badPhone++; fails.add("phone not clean 10-digit"); }
    else if (dupPhoneDigits.has(digits)) { dupPhone++; fails.add("duplicate phone"); }

    if (!isRealEmail(t.email)) { noEmailReal++; fails.add("no real email"); }

    if (!prof) { noProfile++; fails.add("no tutor profile"); continue; }

    const rawAddr = (prof.address || "").trim();
    let loc = rawAddr && !/^\s*pincode\b/i.test(rawAddr) && !isJunkLocality(rawAddr) ? rawAddr : (prof.city || "").trim();
    if (!loc || isJunkLocality(loc) || isJunkLocalityText(loc, name)) { junkLocality++; fails.add("junk/blank locality"); }
    if (!(prof.city || "").trim()) { blankCity++; fails.add("blank city"); }

    const hay = `${prof.city || ""} ${loc}`;
    if (!NCR_CITY_RE.test(hay) || /\b(uttarakhand|himachal|punjab|bihar|jharkhand|west\s+bengal|odisha|assam|gujarat|maharashtra|goa|karnataka|tamil\s+nadu|telangana|andhra\s+pradesh|kerala|madhya\s+pradesh|chhattisgarh)\b/i.test(loc)) {
      nonNcr++; fails.add("non-NCR / wrong state");
    }

    const classStr = Array.isArray(prof.classLevels) ? prof.classLevels.join(", ") : String(prof.classLevels || "");
    const gradeSet = extractAllGrades(classStr);
    const subjects = Array.isArray(prof.subjects) ? prof.subjects.filter((s) => s && String(s).trim()) : [];
    const hasReal = subjects.some((s) => !/all\s+(subjects|primary)/i.test(s));
    if (gradeSet.size === 0 || !hasReal) { noClassOrSubj++; fails.add("blank classes or subjects"); }

    const lat = prof.latitude, lng = prof.longitude;
    if (!lat || !lng || Math.abs(lat) < 0.1) { noCoords++; fails.add("no coords"); }
    else if (isDefaultDelhiCoords(lat, lng)) { defaultCoords++; fails.add("default Delhi coords (approx location)"); }
    else if (!resolveLocationCoordinates(loc) && !resolveLocationCoordinates(prof.city)) { unresolvableLoc++; }

    if (prof.city) {
      const key = (prof.city || "").trim().replace(/\b\w/g, (c) => c.toUpperCase());
      cityCounter.set(key, (cityCounter.get(key) || 0) + 1);
    }

    if (fails.size === 0) {
      perfect++;
      perfectRows.push({
        id: t.id, name, phone: digits, email: (t.email || "").trim(),
        city: (prof.city || "").trim(), locality: loc,
        classes: classStr, subjects: subjects.join(", "),
      });
    } else {
      for (const f of fails) bump(f);
    }

    // Tier B: everything OK except the real-email check
    const withoutEmail = new Set(fails);
    withoutEmail.delete("no real email");
    if (withoutEmail.size === 0) {
      tierB++;
      tierBCauses.set("only email missing", (tierBCauses.get("only email missing") || 0) + 1);
    }
    // Tier C: also allow approximate coords (default Delhi / unresolvable locality)
    const withoutCoords = new Set(withoutEmail);
    withoutCoords.delete("default Delhi coords (approx location)");
    withoutCoords.delete("junk/blank locality");
    if (withoutCoords.size === 0) tierC++;
    // Tier D: sheet-eligible — junk locality is fine when the city itself is valid
    const withoutLocality = new Set(withoutCoords);
    withoutLocality.delete("junk/blank locality");
    if (
      withoutLocality.size === 0 &&
      !fails.has("non-NCR / wrong-state location") &&
      !fails.has("blank city")
    ) {
      tierD++;
    }
  }

  console.log("=== TUTOR DIRECTORY DATA-QUALITY AUDIT ===");
  console.log(`Total tutors (User role=TUTOR):        ${tutors.length}`);
  console.log(`  isActive=true:                       ${active.length}`);
  console.log(`  isActive=false:                      ${inactive}`);
  console.log("");
  console.log("--- Individual check failures (active tutors, non-exclusive) ---");
  console.log(`Test/demo accounts:                    ${testDemo}`);
  console.log(`Junk tutor names:                      ${junkName}`);
  console.log(`Names not title-cased (ALL CAPS etc.): ${nameNotTitleCase}`);
  console.log(`No phone:                              ${noPhone}`);
  console.log(`Phone not clean 10-digit:              ${badPhone}`);
  console.log(`Duplicate phone numbers:               ${dupPhone}`);
  console.log(`No real email (blank/placeholder):     ${noEmailReal}`);
  console.log(`No tutor profile:                      ${noProfile}`);
  console.log(`Junk/blank locality text:              ${junkLocality}`);
  console.log(`Blank city:                            ${blankCity}`);
  console.log(`Non-NCR / wrong-state location:        ${nonNcr}`);
  console.log(`Blank classes or subjects:             ${noClassOrSubj}`);
  console.log(`No coordinates at all:                 ${noCoords}`);
  console.log(`Default Delhi coords (approx loc):     ${defaultCoords}`);
  console.log(`Locality not in geocode table:         ${unresolvableLoc}`);
  console.log("");
  console.log("=== QUALITY TIERS ===");
  console.log(`A · 100% perfect (email + exact coords + clean locality): ${perfect}`);
  console.log(`B · A + blank/placeholder email allowed:                 ${tierB}`);
  console.log(`C · B + approximate coords allowed:                      ${tierC}`);
  console.log(`D · C + junk locality (city fallback) — presend pool:    ${tierD}`);
  console.log("");
  console.log("=== 100% CORRECT (all checks pass) ===");
  console.log(`Fully correct tutors:                  ${perfect} of ${active.length} active (${((perfect / Math.max(1, active.length)) * 100).toFixed(1)}%)`);
  console.log("");
  console.log("--- Tutors by profile city (top 15) ---");
  [...cityCounter.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)
    .forEach(([c, n]) => console.log(`${String(n).padStart(5)}  ${c}`));

  // Export the 100%-correct tutors as CSV
  const esc = (v: string) => `"${String(v || "").replace(/"/g, '""')}"`;
  const header = "userId,name,phone,email,city,locality,classes,subjects";
  const csv = [
    header,
    ...perfectRows.map((r) =>
      [r.id, r.name, r.phone, r.email, r.city, r.locality, r.classes, r.subjects].map(esc).join(",")
    ),
  ].join("\n");
  const { writeFileSync } = await import("fs");
  writeFileSync("exports/portal_tutors_100pc.csv", "\uFEFF" + csv, "utf8");
  console.log(`\nExported 100%-correct tutors -> exports/portal_tutors_100pc.csv (${perfectRows.length} rows)`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
