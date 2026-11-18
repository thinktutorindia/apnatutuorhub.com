/**
 * READ-ONLY: Location-ask STATUS for every tutor.
 * askedStatus: replied (location-updated | no-usable-location) | sent-no-reply | not-asked | unsendable
 * Run: npx tsx --env-file=.env scripts/location_ask_status.ts
 * Out: exports/location_ask_status.csv
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

function isJunkTutorName(name: string): boolean {
  const n = (name || "").trim();
  if (!n) return true;
  const l = n.toLowerCase();
  if (/^tutor(\s|$|\d)/.test(l)) return true;
  if (/\d/.test(n)) return true;
  if (/[\u{1F000}-\u{1FAFF}\u{2190}-\u{27BF}]/u.test(n)) return true;
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

function isTestOrDemoTutor(name: string, email: string): boolean {
  const n = (name || "").toLowerCase();
  const e = (email || "").toLowerCase();
  if (/demo|dummy|pending kyc|sample/.test(n)) return true;
  if (/^test|\.test@|@test\.|test@apnatutorhub/.test(e)) return true;
  if (/\b(test|demo|dummy)\b/.test(e.split("@")[0] || "")) return true;
  return false;
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

function esc(v: unknown): string {
  const s = String(v ?? "");
  return `"${s.replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
}

type BlastFile = [string, string];
const BLAST_FILES: BlastFile[] = [
  ["exports/location_ask_blast_results.csv", "batch1-missing-location"],
  ["exports/generic_location_ask_results.csv", "batch2-generic-city"],
  ["exports/generic_location_ask2_results.csv", "batch3-generic-address"],
];
const REPLY_FILES: BlastFile[] = [
  ["exports/location_reply_updates.csv", "updated"],
  ["exports/location_reply_unparsed.csv", "unparsed"],
  ["exports/location_reply_skipped_had_location.csv", "had-location"],
];

async function main() {
  const sent = new Set<string>();
  const unsub = new Set<string>();
  const sentDate = new Map<string, string>();
  const sentBatch = new Map<string, string>();
  for (const [p, batch] of BLAST_FILES) {
    if (!fs.existsSync(p)) continue;
    const rows = parseCsv(p);
    const header = rows[0];
    const iPhone = header.findIndex((h) => /phone/i.test(h));
    const iStatus = header.findIndex((h) => /^status$/i.test(h));
    const iDate = header.findIndex((h) => /sentAt|sent_at|date/i.test(h));
    for (const r of rows.slice(1)) {
      const d = cleanDisplayPhone(r[iPhone] || "");
      if (d.length !== 10) continue;
      const st = (r[iStatus] || "").toLowerCase();
      const joined = r.slice(4).join(" ").toLowerCase();
      if (st === "sent") { sent.add(d); sentBatch.set(d, batch); if (r[iDate]) sentDate.set(d, r[iDate]); }
      else if (st.includes("unsub") || joined.includes("unsub")) unsub.add(d);
    }
  }

  const repliedUpdated = new Set<string>();
  const repliedAny = new Set<string>();
  for (const [p, kind] of REPLY_FILES) {
    if (!fs.existsSync(p)) continue;
    const rows = parseCsv(p);
    const header = rows[0];
    const iPhone = header.findIndex((h) => /phone/i.test(h));
    for (const r of rows.slice(1)) {
      const d = cleanDisplayPhone(r[iPhone] || "");
      if (d.length !== 10) continue;
      repliedAny.add(d);
      if (kind === "updated") repliedUpdated.add(d);
    }
  }

  const tutors = await prisma.user.findMany({
    where: { role: "TUTOR", isActive: true },
    select: { id: true, name: true, email: true, phone: true, tutorProfile: { select: { address: true, city: true, latitude: true, longitude: true } } },
  });

  const header = ["tutorId", "name", "phone10digit", "city", "address", "askedStatus", "batch", "sentDate", "replyType", "note"];
  const rows: string[] = [header.join(",")];
  const counts = new Map<string, number>();
  const notAskedRows: string[] = [];

  const seen = new Set<string>();
  for (const t of tutors) {
    const prof = t.tutorProfile;
    if (!prof) continue;
    const name = (t.name || "").trim();
    const digits = cleanDisplayPhone(t.phone);
    const cityRaw = (prof.city || "").trim();
    const addr = stripAddressJunk(prof.address || "") || "";

    let status = "", replyType = "", note = "", batch = "", sDate = "";

    if (isTestOrDemoTutor(t.name || "", t.email || "")) { status = "unsendable"; note = "test/demo"; }
    else if (digits.length !== 10 || seen.has(digits)) { status = "unsendable"; note = "phone missing/dupe"; }
    else if (isJunkTutorName(name)) { status = "unsendable"; note = "junk name"; }
    else if (unsub.has(digits)) { status = "unsendable"; note = "unsubscribed"; }
    else seen.add(digits);

    if (status !== "unsendable") {
      if (repliedUpdated.has(digits)) { status = "replied"; replyType = "location-updated"; note = "DB mein location apply ho gayi"; }
      else if (repliedAny.has(digits)) { status = "replied"; replyType = "no-usable-location"; note = "reply aaya but area nahi mila (greeting/junk/confused)"; }
      else if (sent.has(digits)) { status = "sent-no-reply"; batch = sentBatch.get(digits) || ""; sDate = sentDate.get(digits) || ""; note = "message gaya, reply nahi aaya"; }
      else {
        status = "not-asked";
        const addrOk = addr && addr.toLowerCase() !== cityRaw.toLowerCase() &&
          !isJunkLocality(addr) && !isJunkLocalityText(addr, name) && !isGenericLocationText(addr) &&
          !/\b(class|subject|accountancy|maths|science|english|hindi)\b/i.test(addr) && !/^\s*pincode\b/i.test(addr);
        if (addrOk) {
          const locCoord = resolveLocationCoordinates(addr);
          const profLat = (prof as unknown as { latitude?: number | null }).latitude;
          const profLng = (prof as unknown as { longitude?: number | null }).longitude;
          if (locCoord || profLat || profLng) {
            note = "location already OK - ask ki zaroorat nahi";
          } else {
            note = "needs-ask: area hai, coords missing";
          }
        } else if (cityRaw && !isJunkLocality(cityRaw) && !isJunkLocalityText(cityRaw)) {
          note = "needs-ask: sirf city hai, area poochna hai";
        } else {
          note = "needs-ask: city hi nahi, area+city poochna hai";
        }
        notAskedRows.push(`${name} (${digits}) - ${note}`);
      }
    }

    counts.set(status, (counts.get(status) || 0) + 1);
    rows.push([t.id, name, digits, cityRaw, addr, status, batch, sDate, replyType, note].map(esc).join(","));
  }

  fs.writeFileSync("exports/location_ask_status.csv", "\uFEFF" + rows.join("\n"), "utf8");

  console.log(`=== LOCATION-ASK STATUS (active tutors, READ-ONLY) ===\n`);
  for (const k of ["replied", "sent-no-reply", "not-asked", "unsendable"]) {
    console.log(`${String(counts.get(k) || 0).padStart(5)}  ${k}`);
  }
  const notAskedByReply = new Map<string, number>();
  // note prefix of not-asked rows
  console.log(`\n--- Not-asked breakdown ---`);
  const notAskedKinds = new Map<string, number>();
  for (const r of notAskedRows) {
    const kind = r.includes("already OK") ? "location already OK (no ask needed)"
      : r.includes("coords missing") ? "needs-ask: area hai, coords missing"
      : r.includes("sirf city") ? "needs-ask: sirf city hai"
      : "needs-ask: city hi nahi";
    notAskedKinds.set(kind, (notAskedKinds.get(kind) || 0) + 1);
  }
  for (const [k, n] of [...notAskedKinds.entries()].sort((a, b) => b[1] - a[1])) console.log(`${String(n).padStart(5)}  ${k}`);
  console.log(`\n--- Not-asked list (needs-ask only, first 20) ---`);
  notAskedRows.filter((r) => !r.includes("already OK")).slice(0, 20).forEach((r) => console.log("  " + r));
  console.log(`\nCSV -> exports/location_ask_status.csv (${rows.length - 1} rows)`);

  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
