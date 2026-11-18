/**
 * 5km-radius readiness: WHO needs a location-update ask?
 *
 * Matching needs: real sublocality + resolvable coords (locality or city level).
 * Buckets (any city, not just NCR):
 *   OK        — sublocality + coords resolvable  → no ask needed
 *   ASK-B     — sublocality present but coords missing/unresolvable → ask landmark/street
 *   ASK-C     — generic city only → ask exact area
 *   ASK-D     — no city at all → ask area+city
 * Excludes: test/demo, junk names, bad/dupe phones, unsubscribed (unsendable).
 * Run: npx tsx --env-file=.env scripts/need_location_update_list.ts
 */
import * as fs from "fs";
import { PrismaClient } from "@prisma/client";
import { isJunkLocality } from "../lib/whatsapp-bot/leads-helper";
import { stripAddressJunk } from "../lib/format-rich-nearby-location";
import { resolveLocationCoordinates } from "../lib/geocoding";

const prisma = new PrismaClient();

const NCR_CITY_RE = /\b(new delhi|delhi|noida|greater noida|gurgaon|gurugram|ghaziabad|faridabad|loni)\b/i;

function cleanDisplayPhone(phone: string | null | undefined): string {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

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
  if (/^(noted|sorry|nhi|nahi|nothing|none|pending|mention it|not mentioned|na|no|yes|ok|okay|hk|thik|theek|wait|later|soon|skip)\b/.test(l)) return true;
  if (/location at|current location|my location|coordinates/.test(l)) return true;
  if (/\d{1,3}\.\d{3,}.*\d{1,3}\.\d{3,}/.test(l)) return true;
  if (/^(north|south|east|west)\s*(,|\band\b|\.)?\s*(and)?\s*,?\s*\.?$/.test(l)) return true;
  if (/\b(mathematics|maths|physics|chemistry|science|biology|iit|jee|neet|online)\b/.test(l)) return true;
  if (/\b\d+\s*km\b|from\s+border|anything\s+else|^outside$/.test(l)) return true;
  if (/\balpha\b|\bbeta\b/.test(l)) return true;
  if (tutorName && l === tutorName.toLowerCase().trim()) return true;
  return false;
}

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

function titleCase(s: string): string {
  return String(s || "").trim().split(/\s+/).filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

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

function blastPhones(): { sent: Set<string>; unsub: Set<string> } {
  const sent = new Set<string>(), unsub = new Set<string>();
  for (const p of ["exports/location_ask_blast_results.csv", "exports/generic_location_ask_results.csv", "exports/generic_location_ask2_results.csv"]) {
    if (!fs.existsSync(p)) continue;
    const rows = parseCsv(p);
    const header = rows[0];
    const iPhone = header.findIndex((h) => /phone/i.test(h));
    const iStatus = header.findIndex((h) => /^status$/i.test(h));
    for (const r of rows.slice(1)) {
      const d = cleanDisplayPhone(r[iPhone] || "");
      if (d.length !== 10) continue;
      const st = (r[iStatus] || "").toLowerCase();
      if (st === "sent") sent.add(d);
      else if ((r.slice(4).join(" ") || "").toLowerCase().includes("unsub")) unsub.add(d);
    }
  }
  return { sent, unsub };
}

function isDefaultDelhiCoords(lat?: number | null, lng?: number | null): boolean {
  return lat != null && lng != null &&
    Math.abs(lat - 28.5355) < 0.02 && Math.abs(lng - 77.2410) < 0.02;
}

async function main() {
  const { sent, unsub } = blastPhones();

  const tutors = await prisma.user.findMany({
    where: { role: "TUTOR", isActive: true },
    select: {
      id: true, name: true, email: true, phone: true,
      tutorProfile: { select: { address: true, city: true, latitude: true, longitude: true } },
    },
  });

  const seen = new Set<string>();
  const ok: { who: string; city: string; area: string; coordLevel: string }[] = [];
  const askB: { id: string; name: string; phone: string; city: string; area: string; alreadyAsked: boolean }[] = [];
  const askC: { id: string; name: string; phone: string; city: string; alreadyAsked: boolean }[] = [];
  const askD: { id: string; name: string; phone: string; alreadyAsked: boolean }[] = [];
  const unsendable: Record<string, string[]> = { "junk name": [], "phone missing/dupe": [], unsubscribed: [], "test/demo": [] };

  for (const t of tutors) {
    const prof = t.tutorProfile;
    if (!prof) continue;
    const name = (t.name || "").trim();
    const digits = cleanDisplayPhone(t.phone);
    const who = `${name} (${digits || "no-phone"})`;

    if (isTestOrDemoTutor(t.name || "", t.email || "")) { unsendable["test/demo"].push(who); continue; }
    if (digits.length !== 10 || seen.has(digits)) { unsendable["phone missing/dupe"].push(who); continue; }
    seen.add(digits);
    if (isJunkTutorName(name)) { unsendable["junk name"].push(who); continue; }
    if (unsub.has(digits)) { unsendable.unsubscribed.push(who); continue; }

    const cityRaw = (prof.city || "").trim();
    const addr = stripAddressJunk(prof.address || "") || "";
    const addrOk = addr && addr.toLowerCase() !== cityRaw.toLowerCase() &&
      !isJunkLocality(addr) && !isJunkLocalityText(addr, name) && !isGenericLocationText(addr) &&
      !/\b(class|subject|accountancy|maths|science|english|hindi)\b/i.test(addr) && !/^\s*pincode\b/i.test(addr);

    if (addrOk) {
      // coords ready?
      const locCoord = resolveLocationCoordinates(addr);
      const cityCoord = resolveLocationCoordinates(cityRaw);
      const profCoord = prof.latitude && prof.longitude && !isDefaultDelhiCoords(prof.latitude, prof.longitude)
        ? { lat: prof.latitude, lng: prof.longitude } : null;
      const coordLevel =
        locCoord ? "locality" : (profCoord ? "profile" : cityCoord ? "city-approx" : "MISSING");
      if (coordLevel === "MISSING") {
        askB.push({ id: t.id, name, phone: digits, city: titleCase(cityRaw || "Unknown"), area: addr, alreadyAsked: sent.has(digits) });
      } else {
        ok.push({ who, city: titleCase(cityRaw || "Unknown"), area: addr, coordLevel });
      }
      continue;
    }

    if (cityRaw && !isJunkLocality(cityRaw) && !isJunkLocalityText(cityRaw)) {
      askC.push({ id: t.id, name, phone: digits, city: titleCase(cityRaw), alreadyAsked: sent.has(digits) });
    } else {
      askD.push({ id: t.id, name, phone: digits, alreadyAsked: sent.has(digits) });
    }
  }

  console.log(`=== 5KM-RADIUS READINESS (all cities) ===\n`);
  console.log(`✓ OK (sublocality + coords, 5km matching works): ${ok.length}`);
  const byCoord = new Map<string, number>();
  for (const r of ok) byCoord.set(r.coordLevel, (byCoord.get(r.coordLevel) || 0) + 1);
  [...byCoord.entries()].forEach(([k, n]) => console.log(`    · coords ${k}: ${n}`));

  console.log(`\n--- NEEDS ASK (sendable) ---`);
  const askBnew = askB.filter((r) => !r.alreadyAsked);
  const askCnew = askC.filter((r) => !r.alreadyAsked);
  const askDnew = askD.filter((r) => !r.alreadyAsked);
  console.log(`ASK-B sublocality hai but coords MISSING:  ${askB.length} (${askBnew.length} not asked yet)`);
  askB.slice(0, 10).forEach((r) => console.log(`    ${r.name} (${r.phone}) [${r.city}] "${r.area}"${r.alreadyAsked ? " · already asked" : ""}`));
  if (askB.length > 10) console.log(`    … +${askB.length - 10} more`);
  console.log(`ASK-C generic city only:                  ${askC.length} (${askCnew.length} not asked yet)`);
  console.log(`ASK-D no city at all:                     ${askD.length} (${askDnew.length} not asked yet)`);

  console.log(`\n--- UNSENDABLE (no point asking via WhatsApp) ---`);
  for (const [k, v] of Object.entries(unsendable)) console.log(`${String(v.length).padStart(5)}  ${k}`);

  console.log(`\n=== TOTAL TO ASK (new, not yet asked): ${askBnew.length + askCnew.length + askDnew.length} ===`);

  // export the NEW ask list
  const esc = (v: string) => `"${String(v || "").replace(/"/g, '""')}"`;
  const rows: string[] = ["askType,userId,name,phone,cityGroup,locationStatus,suggestedMessage"];
  const msg = (extra: string) =>
    `Hi #NAME, ApnaTutorHub here. Aapko 5km radius ke tuition alerts bhejne ke liye humein aapki exact location chahiye. Reply karein: apna area + nearest landmark (e.g. "Uttam Nagar, Near Nawada Metro, Delhi"). ${extra}`;
  for (const r of [...askBnew, ...askB.filter((r) => r.alreadyAsked)]) {
    rows.push(["B-coords-missing", r.id, r.name, r.phone, r.city, "sublocality-no-coords",
      msg("Aapke profile mein area to hai lekin exact location missing hai — landmark ke saath confirm karein.")].map(esc).join(","));
  }
  for (const r of askCnew) {
    rows.push(["C-generic-city", r.id, r.name, r.phone, r.city, "generic-city-only", msg("")].map(esc).join(","));
  }
  for (const r of askDnew) {
    rows.push(["D-no-city", r.id, r.name, r.phone, "Unknown", "missing", msg("Apna city bhi batayein.")].map(esc).join(","));
  }
  fs.writeFileSync("exports/need_location_update_list.csv", "\uFEFF" + rows.join("\n"), "utf8");
  console.log(`CSV -> exports/need_location_update_list.csv (${rows.length - 1} rows)`);

  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
