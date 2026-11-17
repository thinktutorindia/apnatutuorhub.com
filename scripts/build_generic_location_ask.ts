/**
 * Generic-location ask list (step 2 of location fix).
 *
 * Targets active tutors whose location is GENERIC — city present
 * ("Delhi", "Noida", "Gurugram"…) but NO proper sublocality
 * (address missing / junk / equal to the bare city name).
 *
 * Excludes everyone already sent/attempted in the earlier location-ask
 * blast (need_location_from_tutors.csv + location_ask_blast_results.csv
 * + test results) and the 100%-correct location plan.
 *
 * Run: npx tsx --env-file=.env scripts/build_generic_location_ask.ts
 */
import * as fs from "fs";
import { PrismaClient } from "@prisma/client";
import { isJunkLocality } from "../lib/whatsapp-bot/leads-helper";
import { stripAddressJunk } from "../lib/format-rich-nearby-location";
import { INDIAN_CITY_COORDINATES, resolveLocationCoordinates } from "../lib/geocoding";

const prisma = new PrismaClient();
const DRY = process.argv.includes("--dry");

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
  if (/\b(delhi|loni road)\b/.test(l)) return "Delhi";
  return titleCase(l);
}

// ── City resolution for the CITY field (may hold a locality / state / junk) ──
const CITY_KEYS = Object.keys(INDIAN_CITY_COORDINATES).sort((a, b) => b.length - a.length);
const NON_DELHI_NCR_LOCALITIES: Record<string, string> = {
  vaishali: "Ghaziabad", vasundhara: "Ghaziabad", indirapuram: "Ghaziabad",
  kaushambi: "Ghaziabad", ballabhgarh: "Faridabad",
};
const STATE_JUNK_RE =
  /\b(assam|haryana|punjab|bihar|jharkhand|west\s+bengal|odisha|gujarat|maharashtra|goa|karnataka|tamil\s+nadu|telangana|andhra\s+pradesh|kerala|madhya\s+pradesh|chhattisgarh|uttar\s+pradesh|uttarakhand|himachal|rajasthan|jammu\s+and\s+kashmir|india)\b|\bdr\.?\s|\bmr\.?\s|\bmd\.?\s|@/i;

/** Resolve whatever is in the city field to a real CITY (or null). */
const NCR_CITY_NAME_FIRST: [RegExp, string][] = [
  [/greater\s+noida/, "Greater Noida"],
  [/\bnoida\b/, "Noida"],
  [/gurgaon|gurugram/, "Gurugram"],
  [/ghaziabad/, "Ghaziabad"],
  [/faridabad/, "Faridabad"],
];

function resolveCityField(raw: string): string | null {
  const l = (raw || "").toLowerCase().trim();
  if (!l || STATE_JUNK_RE.test(l)) return null;
  if (/shahdara|loni road/.test(l)) return "Delhi";
  const clean = l.replace(/[,–/\-.]/g, " ");
  // 1. unambiguous NCR localities that belong to another city (Vasundhara → Ghaziabad)
  for (const [k, city] of Object.entries(NON_DELHI_NCR_LOCALITIES)) {
    if (clean.includes(k)) return city;
  }
  // 2. explicit NCR city name in the text wins ("Sector 126 Noida" → Noida)
  for (const [re, city] of NCR_CITY_NAME_FIRST) {
    if (re.test(clean)) return city;
  }
  // 3. longest known locality key
  for (const key of CITY_KEYS) {
    if (clean.includes(key)) {
      if (NON_DELHI_NCR_LOCALITIES[key]) return NON_DELHI_NCR_LOCALITIES[key];
      const c = INDIAN_CITY_COORDINATES[key];
      // NCR bounding box → any table key inside it is a Delhi locality
      if (c.lat > 28.35 && c.lat < 28.92 && c.lng > 76.9 && c.lng < 77.6) return "Delhi";
      return titleCase(key);
    }
  }
  // bare city words not covered by the table
  const m = l.match(/\b(new delhi|delhi|noida|greater noida|gurgaon|ghaziabad|faridabad|loni|lucknow|kolkata|patna|mumbai|thane|hyderabad|madurai|bhopal|gorakhpur|kanpur|jaipur|meerut|indore)\b/);
  if (m) {
    const w = m[1].toLowerCase();
    if (w === "new delhi" || w === "delhi") return "Delhi";
    if (w === "gurgaon") return "Gurugram";
    if (w === "loni") return "Ghaziabad";
    return titleCase(w);
  }
  return null;
}

/** Bare city = the city field IS just the city name (no locality mixed in). */
const BARE_CITY_RE =
  /^(new\s+delhi|delhi|delhi\s*ncr|noida|greater\s+noida|gurgaon|gurugram|ghaziabad|faridabad|loni|lucknow|kolkata|patna|mumbai|thane|hyderabad|madurai|bhopal|gorakhpur|kanpur|jaipur|meerut|indore|nangloi)$/i;

/** Robust-ish CSV splitter for reading the already-sent phone lists. */
function parseCsv(path: string): string[][] {
  const text = fs.readFileSync(path, "utf8").replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let cur = "", row: string[] = [], inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQ = false;
      else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ",") { row.push(cur); cur = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cur); cur = "";
      if (row.some((c) => c !== "")) rows.push(row);
      row = [];
    } else cur += ch;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

function collectPhonesFrom(path: string, phoneCol?: string): Set<string> {
  if (!fs.existsSync(path)) return new Set();
  const rows = parseCsv(path);
  const header = rows[0];
  const idx = phoneCol ? header.indexOf(phoneCol) : header.findIndex((h) => /phone/i.test(h));
  const out = new Set<string>();
  for (const r of rows.slice(1)) {
    const digits = cleanDisplayPhone(r[idx] || "");
    if (digits.length === 10) out.add(digits);
  }
  return out;
}

async function main() {
  // 1. Exclusion set: everyone already contacted for location (or with proper location)
  const excluded = new Set<string>();
  for (const p of ["exports/need_location_from_tutors.csv", "exports/location_ask_blast_results.csv", "exports/location_ask_blast_test_results.csv", "exports/location_correct_blast_plan.csv", "exports/generic_location_ask_list.csv", "exports/generic_location_ask_results.csv", "exports/generic_location_ask_results_test.csv"]) {
    const set = collectPhonesFrom(p);
    set.forEach((d) => excluded.add(d));
  }
  console.log(`Exclusion phones (already sent/attempted/location-correct): ${excluded.size}`);

  // 2. Scan directory for generic-city tutors
  const tutors = await prisma.user.findMany({
    where: { role: "TUTOR", isActive: true },
    select: { id: true, name: true, email: true, phone: true, tutorProfile: { select: { id: true, address: true, city: true } } },
  });

  const seenPhones = new Set<string>();
  const askRows: { id: string; name: string; phone: string; city: string; cityRaw: string; ncr: boolean }[] = [];
  const dbFixes: string[][] = [];
  let droppedName = 0, droppedPhone = 0, alreadySent = 0, notGeneric = 0, unresolvableCity = 0, dbFixed = 0;

  for (const t of tutors) {
    const prof = t.tutorProfile;
    if (!prof) continue;
    if (isTestOrDemoTutor(t.name || "", t.email || "")) continue;

    const name = (t.name || "").trim();
    if (isJunkTutorName(name)) { droppedName++; continue; }

    const digits = cleanDisplayPhone(t.phone);
    if (digits.length !== 10 || seenPhones.has(digits)) { droppedPhone++; continue; }
    seenPhones.add(digits);

    if (excluded.has(digits)) { alreadySent++; continue; }

    const cityRaw = (prof.city || "").trim();
    const addrRaw = (prof.address || "").trim();
    const addr = stripAddressJunk(addrRaw) || "";
    const addrOk = addr && !isJunkLocality(addr) && !isJunkLocalityText(addr, name) && addr.toLowerCase() !== cityRaw.toLowerCase();

    // A) Proper sublocality in address → location fine, skip
    //    ("West Delhi" / "New Delhi" are generic, NOT sublocality → fall through)
    if (addrOk && !isGenericLocationText(addr) && cityRaw && !isJunkLocality(cityRaw) && !isJunkLocalityText(cityRaw)) { notGeneric++; continue; }

    const resolved = resolveCityField(cityRaw);
    // directional-only city ("West Delhi", "North Delhi"…) = still generic → ASK, don't patch
    const directionalOnly =
      /delhi|ncr/i.test(cityRaw) &&
      cityRaw.toLowerCase().replace(/\b(north|south|east|west|delhi|new|ncr)\b/g, "").replace(/[\s,]/g, "") === "";
    const isBareCity = resolved !== null && (BARE_CITY_RE.test(cityRaw) || directionalOnly);

    // B) City field holds a LOCALITY (Dwarka, Patel Nagar, Vasundhara…) that we
    //    can resolve → fix the DB directly: locality → address, resolved city → city.
    if (resolved && !isBareCity) {
      const newAddress = addrOk ? addr : titleCase(stripAddressJunk(cityRaw) || "");
      const newCity = resolved;
      if (newCity.toLowerCase() !== cityRaw.toLowerCase() || (!addrOk && newAddress && newAddress.toLowerCase() !== addrRaw.toLowerCase())) {
        dbFixes.push([t.id, name, digits, cityRaw, newCity, addrRaw, newAddress]);
        dbFixed++;
        if (!DRY) {
          await prisma.tutorProfile.update({
            where: { id: prof.id },
            data: { city: newCity, ...(addrOk ? {} : { address: newAddress }) },
          });
        }
      }
      continue;
    }

    // C) Bare city only (Delhi / Noida / Gurugram…) → ask via WhatsApp (NCR) / file-only (Non-NCR)
    if (resolved && isBareCity) {
      askRows.push({ id: t.id, name, phone: digits, city: resolved, cityRaw, ncr: NCR_CITY_RE.test(cityRaw) });
      continue;
    }

    // D) Unresolvable city (state / name / junk) → file only, no send
    unresolvableCity++;
    askRows.push({ id: t.id, name, phone: digits, city: "Unknown", cityRaw, ncr: false });
  }

  // NCR first
  askRows.sort((a, b) => Number(b.ncr) - Number(a.ncr) || a.city.localeCompare(b.city));

  const esc = (v: string) => `"${String(v || "").replace(/"/g, '""')}"`;
  const csv = [
    "userId,name,phone,cityGroup,ncrFlag,locationStatus,suggestedMessage",
    ...askRows.map((r) => [
      r.id, r.name, r.phone, r.city, r.ncr ? "NCR" : "Non-NCR", "generic-city-only",
      `Hi ${r.name}, ApnaTutorHub here. Please share your exact area/locality (e.g. Sector 50, Noida / Vikaspuri, Delhi) so we can send you nearby tuition enquiries.`,
    ].map(esc).join(",")),
  ].join("\n");
  fs.writeFileSync("exports/generic_location_ask_list.csv", "\uFEFF" + csv, "utf8");

  const fixCsv = [
    "userId,name,phone,oldCity,newCity,oldAddress,newAddress",
    ...dbFixes.map((r) => r.map(esc).join(",")),
  ].join("\n");
  fs.writeFileSync("exports/generic_city_locality_fixes.csv", "\uFEFF" + fixCsv, "utf8");

  console.log(`Active tutors scanned:                ${tutors.length}`);
  console.log(`Dropped: junk name=${droppedName} · phone=${droppedPhone} · already sent/attempted=${alreadySent}`);
  console.log(`DB fixes (locality-in-city → address+city) ${DRY ? "would apply" : "applied"}: ${dbFixed}`);
  console.log(`Skipped: proper location=${notGeneric}`);
  const ncr = askRows.filter((r) => r.ncr).length;
  const sendable = askRows.filter((r) => r.ncr && r.city !== "Unknown").length;
  console.log(`\nGENERIC-LOCATION ask list:            ${askRows.length} rows (NCR sendable=${sendable}, Non-NCR/Unknown file-only=${askRows.length - sendable})`);
  console.log(`CSV -> exports/generic_location_ask_list.csv`);

  const byCity = new Map<string, number>();
  for (const r of askRows) byCity.set(r.city, (byCity.get(r.city) || 0) + 1);
  console.log("\n--- Ask list by city ---");
  [...byCity.entries()].sort((a, b) => b[1] - a[1]).forEach(([c, n]) => console.log(`${String(n).padStart(5)}  ${c}`));

  if (dbFixes.length) {
    console.log(`\n--- DB fix sample (first 15) ---`);
    dbFixes.slice(0, 15).forEach((r) => console.log(`${r[1]} (${r[2]}): city "${r[3]}" → "${r[4]}" · addr "${r[5]}" → "${r[6]}"`));
  }

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
