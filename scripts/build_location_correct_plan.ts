/**
 * Location-correct blast PLAN (no sending).
 *
 * Picks tutors whose location is 100% correct with sublocality:
 *   · clean real name + clean unique 10-digit phone + not test/demo
 *   · NCR city present
 *   · SPECIFIC locality (address filled, not junk, not just the city name)
 *   · exact coordinates (not default-Delhi approx)
 * and exports them WITH their directory subjects & classes for a
 * notification blast plan grouped by city + subject.
 *
 * Run: npx tsx --env-file=.env scripts/build_location_correct_plan.ts
 */
import { PrismaClient } from "@prisma/client";
import { extractAllGrades, isJunkLocality } from "../lib/whatsapp-bot/leads-helper";
import { resolveLocationCoordinates } from "../lib/geocoding";
import { stripAddressJunk } from "../lib/format-rich-nearby-location";

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

/**
 * TRUE sublocality check: "West Delhi", "New Delhi", "Delhi NCR", "Noida",
 * "East Delhi" etc. are NOT sublocality — after stripping city names,
 * directional words and states nothing meaningful must remain.
 */
function isGenericLocationText(text: string): boolean {
  const t = (text || "").toLowerCase();
  if (!t.trim()) return true;
  const stripped = t
    .replace(/\b(north|south|east|west|new|old|upper|lower)\b/g, "")
    .replace(/\b(delhi|delhi\s*ncr|ncr|noida|greater\s+noida|gurgaon|gurugram|ghaziabad|faridabad|loni)\b/g, "")
    .replace(/\b(haryana|uttar\s+pradesh|india|up)\b/g, "")
    .replace(/[\s,.\-–/]/g, "");
  return stripped.length === 0;
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

function titleCase(s: string): string {
  return String(s || "").trim().split(/\s+/).filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

function canonicalCity(city: string): string {
  const l = (city || "").toLowerCase().trim();
  if (l === "new delhi" || l === "delhi ncr") return "Delhi";
  if (l === "gurgaon") return "Gurugram";
  if (l === "loni") return "Ghaziabad";
  // city fields holding localities / informal Delhi names → Delhi
  if (/\b(delhi|loni road)\b/.test(l)) return "Delhi";
  return titleCase(l);
}

function isDefaultDelhiCoords(lat?: number | null, lng?: number | null): boolean {
  return lat != null && lng != null &&
    Math.abs(lat - 28.5355) < 0.02 && Math.abs(lng - 77.2410) < 0.02;
}

/** Normalised subject tag for grouping (raw string kept in CSV). */
const SUBJECT_TAG_PATTERNS: [RegExp, string][] = [
  [/\bmaths?\b|mathematics/, "Maths"],
  [/\bscience\b|physic|chemistr|\bbio/, "Science"],
  [/\benglish\b/, "English"],
  [/\bhindi\b/, "Hindi"],
  [/\bsanskrit\b/, "Sanskrit"],
  [/\burdu\b/, "Urdu"],
  [/\becon/, "Economics"],
  [/account|costing/, "Accountancy"],
  [/business\s*stud/, "Business Studies"],
  [/\bcommerce\b/, "Commerce"],
  [/computer|python|java|coding/, "Computer Science"],
  [/social\s*st|\bsst\b|histor|geograph|politic|civics/, "Social Studies"],
  [/psycholog/, "Psychology"],
  [/sociolog/, "Sociology"],
  [/\bfrench\b/, "French"],
  [/\bgk\b|general\s*knowledge/, "GK"],
  [/\bevs\b|environmental/, "EVS"],
];

function subjectTags(subjects: string[]): string[] {
  const tags = new Set<string>();
  for (const s of subjects) {
    const l = s.toLowerCase();
    for (const [re, tag] of SUBJECT_TAG_PATTERNS) {
      if (re.test(l)) tags.add(tag);
    }
  }
  return [...tags];
}

async function main() {
  const tutors = await prisma.user.findMany({
    where: { role: "TUTOR", isActive: true },
    select: {
      id: true, name: true, email: true, phone: true,
      tutorProfile: { select: { address: true, city: true, latitude: true, longitude: true, subjects: true, classLevels: true } },
    },
  });

  // unique-phone ownership (first tutor keeps the number)
  const seenPhones = new Set<string>();

  const rows: {
    id: string; name: string; phone: string; city: string; locality: string;
    lat: number; lng: number; coordLevel: string; subjects: string[]; subjectTags: string[]; classes: string; email: string;
  }[] = [];

  let droppedName = 0, droppedPhone = 0, droppedLoc = 0, droppedCity = 0, droppedCoords = 0, droppedSubj = 0;

  for (const t of tutors) {
    const prof = t.tutorProfile;
    if (!prof) continue;
    if (isTestOrDemoTutor(t.name || "", t.email || "")) continue;

    const name = (t.name || "").trim();
    if (isJunkTutorName(name)) { droppedName++; continue; }

    const digits = cleanDisplayPhone(t.phone);
    if (digits.length !== 10 || seenPhones.has(digits)) { droppedPhone++; continue; }
    seenPhones.add(digits);

    const rawAddr = (prof.address || "").trim();
    const city = canonicalCity(prof.city || "");
    const cityClean = (prof.city || "").trim();
    if (!cityClean || !NCR_CITY_RE.test(cityClean)) { droppedCity++; continue; }

    // SPECIFIC sublocality: address must exist, not be junk/generic ("West Delhi",
    // "New Delhi" are NOT sublocality), and differ from the bare city
    const cleanedAddr = stripAddressJunk(rawAddr) || "";
    const locality = cleanedAddr && !isJunkLocality(cleanedAddr) && !isJunkLocalityText(cleanedAddr, name) && !isGenericLocationText(cleanedAddr)
      ? cleanedAddr : "";
    if (!locality || locality.toLowerCase() === cityClean.toLowerCase()) { droppedLoc++; continue; }

    const lat = prof.latitude, lng = prof.longitude;
    if (!lat || !lng || Math.abs(lat) < 0.1 || isDefaultDelhiCoords(lat, lng)) { droppedCoords++; continue; }

    // coordLevel: does the SUBLOCALITY itself resolve to its own coords,
    // or did we only get the city-level fallback (approx)?
    const cityCoord = resolveLocationCoordinates(prof.city);
    const localityOnly = locality.replace(new RegExp(cityClean.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), "").replace(/[,–-]/g, " ").trim();
    const locCoord = resolveLocationCoordinates(localityOnly) || resolveLocationCoordinates(locality);
    const coordLevel =
      locCoord && (!cityCoord || locCoord.lat !== cityCoord.lat || locCoord.lng !== cityCoord.lng)
        ? "locality-exact"
        : "city-approx";
    if (coordLevel === "city-approx") { droppedCoords++; }

    // subjects: real ones only
    const subjects = (Array.isArray(prof.subjects) ? prof.subjects : [])
      .map((s) => String(s || "").trim()).filter((s) => s && !/all\s+(subjects|primary)/i.test(s));
    if (subjects.length === 0) { droppedSubj++; continue; }

    const classes = (Array.isArray(prof.classLevels) ? prof.classLevels : []).join(", ");
    if (extractAllGrades(classes).size === 0) { droppedSubj++; continue; }

    rows.push({
      id: t.id, name, phone: digits, city, locality, lat, lng, coordLevel,
      subjects, subjectTags: subjectTags(subjects), classes, email: (t.email || "").trim(),
    });
  }

  // strict rows (locality-exact coords) first, then city-approx
  rows.sort((a, b) => (a.coordLevel === b.coordLevel ? 0 : a.coordLevel === "locality-exact" ? -1 : 1));

  // ── Export CSV (plan file — NOT sent) ────────────────────────────────────
  const esc = (v: string) => `"${String(v || "").replace(/"/g, '""')}"`;
  const { writeFileSync } = await import("fs");
  const csv = [
    "userId,name,phone,email,city,locality,coordLevel,subjects,subjectTags,classes,latitude,longitude",
    ...rows.map((r) =>
      [r.id, r.name, r.phone, r.email, r.city, r.locality, r.coordLevel, r.subjects.join("; "), r.subjectTags.join("; "), r.classes, r.lat, r.lng].map(esc).join(",")
    ),
  ].join("\n");
  writeFileSync("exports/location_correct_blast_plan.csv", "\uFEFF" + csv, "utf8");

  // ── Planning summaries ──────────────────────────────────────────────────
  const byCity = new Map<string, number>();
  for (const r of rows) byCity.set(r.city, (byCity.get(r.city) || 0) + 1);

  const bySubject = new Map<string, number>();
  for (const r of rows) for (const s of r.subjectTags) bySubject.set(s, (bySubject.get(s) || 0) + 1);

  const byCitySubject = new Map<string, number>();
  for (const r of rows) for (const s of r.subjectTags) {
    const k = `${r.city} · ${s}`;
    byCitySubject.set(k, (byCitySubject.get(k) || 0) + 1);
  }

  console.log("=== LOCATION-CORRECT (sublocality) BLAST PLAN — no messages sent ===");
  console.log(`Active tutors scanned:                ${tutors.length}`);
  console.log(`Dropped: junk name=${droppedName} · phone=${droppedPhone} · non-NCR/blank city=${droppedCity} · no sublocality=${droppedLoc} · subjects/classes=${droppedSubj}`);
  const exact = rows.filter((r) => r.coordLevel === "locality-exact").length;
  const approx = rows.length - exact;
  console.log(`\nLOCATION-100%-CORRECT with subjects:  ${rows.length} tutors`);
  console.log(`  · locality-exact coords:            ${exact}`);
  console.log(`  · city-approx coords (sublocality text OK): ${approx}`);
  console.log(`CSV -> exports/location_correct_blast_plan.csv`);
  console.log("\n--- By city ---");
  [...byCity.entries()].sort((a, b) => b[1] - a[1]).forEach(([c, n]) => console.log(`${String(n).padStart(5)}  ${c}`));
  console.log("\n--- By subject (top 15) ---");
  [...bySubject.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).forEach(([s, n]) => console.log(`${String(n).padStart(5)}  ${s}`));
  console.log("\n--- City × Subject segments (top 25) ---");
  [...byCitySubject.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).forEach(([k, n]) => console.log(`${String(n).padStart(5)}  ${k}`));

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
