import * as fs from "fs";
import { PrismaClient } from "@prisma/client";
import { isJunkLocality } from "../lib/whatsapp-bot/leads-helper";
import { stripAddressJunk } from "../lib/format-rich-nearby-location";
import { parseClassGradesFromText } from "../lib/subject-normalization";
import { parseGradeNumbers } from "../lib/subject-taxonomy";

const prisma = new PrismaClient();

function parseCsv(file: string): string[][] {
  if (!fs.existsSync(file)) return [];
  const text = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let cur = "", row: string[] = [], inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) { if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') inQ = false; else cur += ch; }
    else if (ch === '"') inQ = true;
    else if (ch === ",") { row.push(cur); cur = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cur); cur = ""; if (row.some((c) => c !== "")) rows.push(row); row = []; }
    else cur += ch;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}
const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
const digits = (p: string | null | undefined) => {
  const d = String(p || "").replace(/\D/g, "");
  return d.length === 12 && d.startsWith("91") ? d.slice(2) : d.length === 11 && d.startsWith("0") ? d.slice(1) : d;
};
const NCR = /\b(new delhi|delhi|noida|greater noida|gurgaon|gurugram|ghaziabad|faridabad|loni)\b/i;
function genericLoc(t: string): boolean {
  const s = String(t || "").toLowerCase()
    .replace(/\b(north|south|east|west|new|old|upper|lower)\b/g, "")
    .replace(/\b(delhi|delhi ncr|ncr|noida|greater noida|gurgaon|gurugram|ghaziabad|faridabad|loni)\b/g, "")
    .replace(/\b(haryana|uttar pradesh|india|up)\b/g, "")
    .replace(/[\s,.\-–/]/g, "");
  return s.length === 0;
}
function junkText(loc: string): boolean {
  const l = String(loc || "").toLowerCase().trim();
  if (!l || l.length < 3) return true;
  if (/^(noted|sorry|nhi|nahi|nothing|none|pending|mention it|not mentioned|na|no|yes|ok|okay|hk|thik|theek|wait|later|soon|skip)\b/.test(l)) return true;
  if (/location at|current location|my location|coordinates/.test(l)) return true;
  if (/\d{1,3}\.\d{3,}.*\d{1,3}\.\d{3,}/.test(l)) return true;
  if (/^(north|south|east|west)\s*(,|\band\b|\.)?\s*(and)?\s*,?\s*\.?$/.test(l)) return true;
  if (/\b\d+\s*km\b|from\s+border|^outside$/.test(l)) return true;
  if (/\b(class|subject|maths|mathematics|science|physics|chemistry|english|hindi|online|unable to teach)\b/.test(l)) return true;
  return isJunkLocality(l);
}
function junkReason(addr: string, city: string): string {
  const l = String(addr || "").toLowerCase().trim();
  if (!l || l.length < 3) return "blank/short address";
  if (l === city.toLowerCase().trim()) return "address = city";
  if (/^(north|south|east|west)\s*(,|\band\b|\.)?\s*(and)?\s*,?\s*\.?$/.test(l)) return "direction only";
  if (/\d{1,3}\.\d{3,}.*\d{1,3}\.\d{3,}/.test(l)) return "coordinates in address";
  if (/\b(class|subject|maths|mathematics|science|physics|chemistry|english|hindi|online|unable to teach)\b/.test(l)) return "subject/class chatter";
  if (/^(noted|sorry|nhi|nahi|nothing|none|pending|mention it|not mentioned|na|no|yes|ok|okay|hk|thik|theek|wait|later|soon|skip)\b/.test(l)) return "junk word";
  if (/location at|current location|my location/.test(l)) return "chat phrase";
  if (/^(delhi ncr|delhi|ncr|none|null|undefined|tutor|student|tuition)$/i.test(l)) return "city/placeholder as address";
  if (/\b(chiye|chahiye|call|padhna|padhana|hu|hoon|hai|hain)\b/i.test(l)) return "Hinglish chatter";
  if (/\b\d+\s*km\b|from\s+border|^outside$/.test(l)) return "distance text";
  return "other junk";
}
function isDefaultCoords(lat: number | null, lng: number | null): boolean {
  return lat != null && lng != null && Math.abs(lat - 28.5355) < 0.02 && Math.abs(lng - 77.2410) < 0.02;
}

type Loc = "OK" | "GENERIC" | "JUNK" | "MISSING" | "NO_COORDS" | "BAD_CITY";
function locStatus(addrRaw: string, cityRaw: string, lat: number | null, lng: number | null): Loc {
  const addr = stripAddressJunk(addrRaw || "") || "";
  const city = String(cityRaw || "").trim();
  if (!addr || !city) return "MISSING";
  if (junkText(addr) || addr.toLowerCase() === city.toLowerCase()) return "JUNK";
  if (genericLoc(addr)) return "GENERIC";
  if (!NCR.test(city) || /^(noted|nhi|nahi|none|null|undefined|tutor|student|tuition|pending)$/i.test(city.trim())) return "BAD_CITY";
  if (lat == null || lng == null || isDefaultCoords(lat, lng)) return "NO_COORDS";
  return "OK";
}

type Sub = "OK" | "MISSING" | "JUNIOR_PARTIAL" | "SENIOR_GENERIC" | "SENIOR_PARTIAL" | "MALFORMED" | "UNKNOWN_BAND";
function subStatus(subjects: string[], classes: string[]): Sub {
  if (!subjects.length) return "MISSING";
  if (subjects.some((s) => /for\s+class\s+[ivx\d]+\s*[-–]\s*[ivx\d]+|for\s+class\s+[ivx\d]+\s*,/i.test(s))) return "MALFORMED";
  const g = parseClassGradesFromText(classes.join(", "));
  if (!g.length) return "UNKNOWN_BAND";
  const junior = g.filter((n) => n >= 1 && n <= 8);
  const senior = g.filter((n) => n >= 9 && n <= 12);
  const allLabels = subjects.filter((s) => /all\s*(?:core\s*)?subjects?/i.test(s));
  if (junior.some((n) => !allLabels.some((s) => parseGradeNumbers(s).includes(n)))) return "JUNIOR_PARTIAL";
  if (senior.length) {
    const concrete = subjects.filter((s) => !/all\s*(?:core\s*)?subjects?/i.test(s) && parseGradeNumbers(s).some((n) => n >= 9));
    if (!concrete.length) return "SENIOR_GENERIC";
    if (senior.some((n) => !concrete.some((s) => parseGradeNumbers(s).includes(n)))) return "SENIOR_PARTIAL";
  }
  return "OK";
}

async function main() {
  const statusRows = parseCsv("exports/location_ask_status.csv");
  const sh = statusRows[0];
  const ix = (name: string) => sh.indexOf(name);
  const statusByPhone = new Map<string, { asked: string; note: string; reply: string; city: string; address: string }>();
  for (const r of statusRows.slice(1)) {
    statusByPhone.set(digits(r[ix("phone10digit")]), { asked: r[ix("askedStatus")] || "", note: r[ix("note")] || "", reply: r[ix("replyType")] || "", city: r[ix("city")] || "", address: r[ix("address")] || "" });
  }

  const unsub = new Set<string>();
  const sentPhones = new Set<string>();
  for (const f of ["location_ask_blast_results.csv", "generic_location_ask_results.csv", "generic_location_ask2_results.csv", "baddata_notasked7_results.csv"]) {
    const rows = parseCsv(`exports/${f}`);
    const h = rows[0] || [];
    const p = h.indexOf("phone"), st = h.indexOf("status"), raw = h.indexOf("rawStatus");
    for (const r of rows.slice(1)) {
      const d = digits(r[p]);
      const s = `${r[st] || ""} ${r[raw] || ""}`;
      if (/unsub/i.test(s) && d.length === 10) unsub.add(d);
      if (/^sent$/i.test(r[st] || "") && d.length === 10) sentPhones.add(d);
    }
  }
  for (const [phone, s] of statusByPhone) {
    if (s.asked === "unsendable" && /unsub/i.test(s.note)) unsub.add(phone);
    if (s.asked.startsWith("sent")) sentPhones.add(phone);
  }

  const users = await prisma.user.findMany({
    where: { role: "TUTOR" },
    select: { id: true, name: true, email: true, phone: true, isActive: true, tutorProfile: { select: { address: true, city: true, latitude: true, longitude: true, subjects: true, classLevels: true } } },
  });
  const seen = new Set<string>();
  const detail: string[][] = [];
  const counts: Record<string, number> = {};
  const locCounts: Record<string, number> = {};
  const subCounts: Record<string, number> = {};
  const reasons: Record<string, number> = {};
  const badCities: Record<string, number> = {};
  const notifyWrong: Record<string, number> = {};

  for (const u of users) {
    const p = u.tutorProfile;
    if (!p) continue;
    const phone = digits(u.phone);
    const name = String(u.name || "").trim();
    const demo = /\b(test|demo|dummy)\b/i.test(`${name} ${u.email || ""}`);
    const junkName = !name || /\d/.test(name) || name.replace(/[^a-zA-Z]/g, "").length < 3 || /^Tutor(\s|$|\d)/i.test(name);
    const excluded = !u.isActive || phone.length !== 10 || seen.has(phone) || junkName || demo || unsub.has(phone);
    if (phone.length === 10 && !seen.has(phone)) seen.add(phone);
    const st = statusByPhone.get(phone);
    const subs = Array.isArray(p.subjects) ? p.subjects.map(String) : [];
    const cls = Array.isArray(p.classLevels) ? p.classLevels.map(String) : [];
    const L = locStatus(p.address || "", p.city || "", p.latitude ?? null, p.longitude ?? null);
    const S = subStatus(subs, cls);
    const cat = excluded ? "EXCLUDED" : L === "OK" && S === "OK" ? "FULLY_CORRECT" : L !== "OK" && S !== "OK" ? "BOTH_ISSUE" : L !== "OK" ? "LOCATION_ISSUE" : "SUBJECT_ISSUE";
    counts[cat] = (counts[cat] || 0) + 1;
    locCounts[L] = (locCounts[L] || 0) + 1;
    subCounts[S] = (subCounts[S] || 0) + 1;
    const cleanAddr = stripAddressJunk((p.address || "").trim()) || "";
    const reason = L === "JUNK" ? `location-junk: ${junkReason(cleanAddr, p.city || "")}`
      : L === "BAD_CITY" ? `location-bad-city: ${(p.city || "").trim() || "blank"}`
      : L === "GENERIC" ? "location-generic: city/direction only"
      : L === "MISSING" ? "location-missing" : L === "NO_COORDS" ? "location-no-coords/default"
      : S === "MISSING" ? "subject-missing" : S === "UNKNOWN_BAND" ? "subject-unknown-classes"
      : S === "SENIOR_GENERIC" ? "subject-senior-generic" : S === "SENIOR_PARTIAL" ? "subject-senior-partial"
      : S === "JUNIOR_PARTIAL" ? "subject-junior-partial" : "none";
    reasons[reason] = (reasons[reason] || 0) + 1;
    if (L === "BAD_CITY") badCities[(p.city || "").trim() || "blank"] = (badCities[(p.city || "").trim() || "blank"] || 0) + 1;

    // Sent a notification but the data is still wrong / no usable reply
    if (st?.asked === "sent-no-reply" && !excluded && (L !== "OK" || S !== "OK")) {
      const key = L !== "OK" ? `location:${L}` : `subject:${S}`;
      notifyWrong[key] = (notifyWrong[key] || 0) + 1;
    }
    if (st?.reply === "no-usable-location" && !excluded) {
      const key = `repliedNoUsable:${L}`;
      notifyWrong[key] = (notifyWrong[key] || 0) + 1;
    }

    if (cat !== "FULLY_CORRECT" || excluded) {
      detail.push([name, phone, cat, L, S, (p.address || "").trim(), (p.city || "").trim(), subs.join("; "), cls.join("; "), st?.asked || "", st?.note || "", excluded ? (unsub.has(phone) ? "unsubscribed" : demo ? "test/demo" : junkName ? "junk-name" : phone.length !== 10 ? "no-phone" : "inactive/dupe") : ""]);
    }
  }

  console.log(`Tutors total: ${users.length}`);
  console.log(`Categories: ${JSON.stringify(counts)}`);
  console.log(`Location status: ${JSON.stringify(locCounts)}`);
  console.log(`Subject status: ${JSON.stringify(subCounts)}`);
  console.log(`Unsubscribed unique phones: ${unsub.size}`);
  console.log(`Top reasons: ${JSON.stringify(Object.entries(reasons).sort((a,b)=>b[1]-a[1]).slice(0,18))}`);
  console.log(`Bad cities top: ${JSON.stringify(Object.entries(badCities).sort((a,b)=>b[1]-a[1]).slice(0,12))}`);
  console.log(`Sent-ask phones still wrong (no reply): ${JSON.stringify(notifyWrong)}`);
  console.log(`Sent-no-reply total (status file): ${[...statusByPhone.values()].filter((s) => s.asked === "sent-no-reply").length}`);
  console.log(`Replied but no usable location: ${[...statusByPhone.values()].filter((s) => s.reply === "no-usable-location").length}`);

  fs.writeFileSync("exports/data_quality_report_2026-11-18.csv", "\uFEFF" + [
    ["name", "phone", "category", "locationStatus", "subjectStatus", "address", "city", "subjects", "classLevels", "askedStatus", "note", "exclusionReason"].join(","),
    ...detail.map((r) => r.map(esc).join(",")),
  ].join("\r\n"), "utf8");
  console.log(`Detail: exports/data_quality_report_2026-11-18.csv (${detail.length} rows)`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
