/**
 * Subject-reply harvester: scan inbound WhatsApp messages from every active,
 * sendable tutor, parse subjects + classes from their replies, and refresh
 * TutorProfile (latest values replace old — only explicit additive words merge).
 * Normalization follows the platform rule: 1-8 → per-class "All Subjects",
 * 9-12 → class-specific subjects.
 *
 * Run:      npx tsx --env-file=.env scripts/apply_subject_replies.ts
 * Dry:      npx tsx --env-file=.env scripts/apply_subject_replies.ts --dry
 * Window:   --days N (default 7)
 *
 * Out: exports/subject_reply_updates.csv · exports/subject_reply_unparsed.csv
 */
import * as fs from "fs";
import { PrismaClient } from "@prisma/client";
import { isJunkLocality } from "../lib/whatsapp-bot/leads-helper";
import { normalizeSubjectsForClassRule } from "../lib/subject-normalization";
import { stripAddressJunk } from "../lib/format-rich-nearby-location";
import { resolveLocationCoordinates } from "../lib/geocoding";

const prisma = new PrismaClient();
const DRY = process.argv.includes("--dry");
const DAYS = (() => {
  const i = process.argv.indexOf("--days");
  return i >= 0 ? Math.max(1, parseInt(process.argv[i + 1] || "7", 10) || 7) : 7;
})();

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

function isJunkLocalityText(loc: string, tutorName?: string): boolean {
  const l = (loc || "").toLowerCase().trim();
  if (!l || l.length < 3) return true;
  if (/^(noted|sorry|nhi|nahi|nothing|none|pending|mention it|not mentioned|na|no|yes|ok|okay|hk|thik|theek|wait|later|soon|skip)\b/.test(l)) return true;
  if (/location at|current location|my location|coordinates/.test(l)) return true;
  if (/\d{1,3}\.\d{3,}.*\d{1,3}\.\d{3,}/.test(l)) return true;
  if (/^(north|south|east|west)\s*(,|\band\b|\.)?\s*(and)?\s*,?\s*\.?$/.test(l)) return true;
  if (/\b\d+\s*km\b|from\s+border|^outside$/.test(l)) return true;
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
  if (n.replace(/[^a-zA-Z]/g, "").length < 3) return true;
  if (/^(unknown|user|whatsapp user|parent|student|sir|madam|na|nhi)$/.test(l)) return true;
  if (/\b(school|academy|institute|coaching|tutorial|classes|centre|center|home tuition|tuition)\b/.test(l)) return true;
  if (/helpline|corporation|\bpvt\b|\bltd\b|\bllp\b|\benterprises\b|\btraders\b|\bcompany\b/.test(l)) return true;
  if (n.split(/\s+/).length >= 6) return true;
  return false;
}

function isTestOrDemoTutor(name: string, email: string): boolean {
  const n = (name || "").toLowerCase();
  const e = (email || "").toLowerCase();
  if (/demo|dummy|pending kyc|sample/.test(n)) return true;
  if (/^test|\.test@|@test\.|test@apnatutorhub/.test(e)) return true;
  return /\b(test|demo|dummy)\b/.test(e.split("@")[0] || "");
}

// ── Subject keyword map (same as sync_whatsapp_profile_updates) ─────────────
const SUBJECT_PATTERNS: [RegExp, string][] = [
  [/account(?:s|ancy)?\b|\bcosting\b/, "Accountancy"],
  [/\bmath\w*\b|mathematics|ganit/, "Mathematics"],
  [/\bscience\b|\bsci\b|vigyan/, "Science"],
  [/physic/, "Physics"],
  [/\bchem(?:istry|ical)?\b/, "Chemistry"],
  [/\bbio/, "Biology"],
  [/\benglish\b/, "English"],
  [/\bhindi\b/, "Hindi"],
  [/\bsanskrit\b/, "Sanskrit"],
  [/\burdu\b/, "Urdu"],
  [/\becon/, "Economics"],
  [/business\s*stud/, "Business Studies"],
  [/\bcommerce\b/, "Commerce"],
  [/\bcomputer\b|\bpython\b|\bjava\b|\bcoding\b/, "Computer Science"],
  [/\bsst\b|social\s*stud|social\s*science/, "Social Science"],
  [/\bhistor/, "History"],
  [/geograph/, "Geography"],
  [/politic(?:al)?\s*science|\bpol\s*sci|\bpolity\b/, "Political Science"],
  [/psycholog/, "Psychology"],
  [/sociolog/, "Sociology"],
  [/\bfrench\b/, "French"],
  [/\bgerman\b/, "German"],
  [/\bspanish\b/, "Spanish"],
  [/\bgk\b|general\s*knowledge/, "Gk"],
  [/\bevs\b|environmental\s*stud/, "EVS"],
  [/all\s*(?:core\s*)?subjects?|\bcombo\b|\bsabhi\b|har\s*subject/, "All Subjects"],
];

function extractSubjectsFromText(text: string): Set<string> {
  const found = new Set<string>();
  const lower = text.toLowerCase();
  for (const [re, name] of SUBJECT_PATTERNS) {
    if (re.test(lower)) found.add(name);
  }
  return found;
}

/** Grades → directory-style classLevels ("Class 6-8", "Class 11"). */
function gradesToClassLevels(grades: Set<number>): string[] {
  const sorted = [...grades].filter((g) => g >= 1 && g <= 12).sort((a, b) => a - b);
  if (!sorted.length) return [];
  const out: string[] = [];
  let start = sorted[0], prev = sorted[0];
  for (let i = 1; i <= sorted.length; i++) {
    const g = sorted[i];
    if (g === prev + 1) { prev = g; continue; }
    out.push(start === prev ? `Class ${start}` : `Class ${start}-${prev}`);
    start = g; prev = g;
  }
  return out;
}

const ROMAN_VALS: Record<string, number> = {
  i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12,
};

/**
 * Context-aware grade extraction for free-form chat replies.
 * Unlike extractAllGrades(), this never treats English "I" or a bare menu
 * number ("1") as a class — only class keywords, ranges, ordinals and buckets.
 */
function extractGradesStrict(text: string): Set<number> {
  const grades = new Set<number>();
  const lower = String(text || "").toLowerCase();
  const addNum = (n: number) => { if (n >= 1 && n <= 12) grades.add(n); };
  const tokVal = (tok: string): number => {
    const clean = tok.replace(/(?:st|nd|rd|th)$/i, "");
    if (/^\d{1,2}$/.test(clean)) return parseInt(clean, 10);
    return ROMAN_VALS[clean] || 0;
  };
  const addRange = (a: string, b: string) => {
    const av = tokVal(a);
    const bv = tokVal(b);
    if (!av || !bv) return;
    for (let g = Math.min(av, bv); g <= Math.max(av, bv); g++) addNum(g);
  };

  // Numeric / Roman ranges: "6 to 10", "9-12", "IX-X", "9th to 12th",
  // Hindi "1st se 6th".
  for (const m of lower.matchAll(/\b(\d{1,2}(?:st|nd|rd|th)?|[ivx]{1,4})\s*(?:to|-|–|—|&|and|se)\s*(\d{1,2}(?:st|nd|rd|th)?|[ivx]{1,4})\b/g)) {
    addRange(m[1], m[2]);
  }

  // Class / grade lists: "Class 11,12", "classes 6-8", "Class 1st to 12th"
  const classListRe =
    /\b(?:class(?:es)?|grade|std|standard)\s*[-:=]?\s*((?:\d{1,2}(?:st|nd|rd|th)?|[ivx]{1,4})(?:(?:\s*(?:,|&|\/|and|to|-|–|—|se)\s*)(?:\d{1,2}(?:st|nd|rd|th)?|[ivx]{1,4}))*)/g;
  for (const m of lower.matchAll(classListRe)) {
    for (const part of m[1].split(/\s*(?:,|&|\/|and)\s*/)) {
      const range = part.match(/^(\d{1,2}(?:st|nd|rd|th)?|[ivx]{1,4})\s*(?:to|-|–|—|se)\s*(\d{1,2}(?:st|nd|rd|th)?|[ivx]{1,4})$/);
      if (range) addRange(range[1], range[2]);
      else {
        const v = tokVal(part);
        if (v) addNum(v);
      }
    }
  }

  // Upto / till inclusive; below / under exclusive ("below 10th" = 1-9).
  for (const m of lower.matchAll(/\b(upto|till|below|under)\s*(?:class(?:es)?\s*)?(\d{1,2})(?:st|nd|rd|th)?\b|\b(upto|till|below|under)\s*(?:class(?:es)?\s*)?([ivx]{1,4})\b/g)) {
    const kw = (m[1] || m[3] || "").toLowerCase();
    const v = tokVal(m[2] || m[4] || "");
    const max = /below|under/.test(kw) ? v - 1 : v;
    for (let g = 1; g <= max; g++) addNum(g);
  }
  // Ordinals already covered by an upto/below phrase must not re-add the
  // boundary grade ("below 10th" is not Class 10).
  const lowerNoUpto = lower.replace(
    /\b(?:upto|till|below|under)\s*(?:class(?:es)?\s*)?(?:\d{1,2}(?:st|nd|rd|th)?|[ivx]{1,4})\b/g,
    " "
  );

  // Pre-primary range: "Nur - 9th", "Nursery to 8", "KG-12"
  const preTo = lower.match(/\b(?:nursery|nur|pre[-\s]?primary|kg|lkg|ukg)\s*(?:-|–|—|to|and|&)\s*(\d{1,2})(?:st|nd|rd|th)?\b/);
  if (preTo) {
    const v = parseInt(preTo[1], 10);
    for (let g = 1; g <= v; g++) addNum(g);
  }

  // Explicit ordinals: "9th", "12th", "1st"
  for (const m of lower.matchAll(/\b(\d{1,2})(?:st|nd|rd|th)\b/g)) addNum(parseInt(m[1], 10));

  // Bucket keywords
  if (/\b(?:primary|pre-primary|nursery|kg|lkg|ukg)\b/.test(lower)) for (let i = 1; i <= 5; i++) addNum(i);
  if (/\bmiddle\s*(?:school|classes)?\b/.test(lower)) for (let i = 6; i <= 8; i++) addNum(i);
  if (/\bsecondary\s*(?:school)?\b/.test(lower) && !/\bsenior\b/.test(lower)) { addNum(9); addNum(10); }
  if (/\bsenior\s*secondary\b/.test(lower)) { addNum(11); addNum(12); }

  return grades;
}

const CHAT_NOISE_RE =
  /reply\s+stop|apnatutorhub\.com|1️⃣|2️⃣|3️⃣|unlock|membership|vip\s+plan|contact\s+080|template|hello!?\s*👋|please\s+(?:check|share)\s+the\s+following/i;

/** Requests / payment / availability chatter that must never become subjects or grades. */
const REQUEST_NOISE_RE =
  /\b(?:give|send|share)\s+(?:me|us)\b|\bbhejo\b|\bchahiye\b|\benquir(?:y|ies)\b|\b(?:do|any)\s+you\s+have\b|\bclasses?\s+(?:in|at|near)\b|\bpayment\b|\bpay\b|\bcommission\b|\bfees?\b|\bprice\b|\bplans?\b|\bmembership\b|\baccount\s*(?:number|no\.?|details?|holder)\b|\bbank\s+account\b|\b(?:phone|whatsapp|mobile|contact)\s*(?:number|no)\b|\bcall\s+me\b|\bhow\s+to\b/i;

/** Parse subjects + grades from inbound reply bodies (skip bot noise). */
function parseSubjectReply(bodies: string[]): { subjects: string[]; grades: Set<number>; raw: string } {
  const subjectSet = new Set<string>();
  const grades = new Set<number>();
  const raws: string[] = [];

  for (const b of bodies) {
    for (const s of String(b).split(/\n|\||•/)) {
      const seg = s.trim();
      if (!seg) continue;
      const lower = seg.toLowerCase();
      if (CHAT_NOISE_RE.test(lower)) continue;
      if (REQUEST_NOISE_RE.test(lower)) continue;
      if (/^(hello|hi|hey|ok|okay|yes|no|yess?|nope|thanks|thank you|stop|start|bye|hii+i*|🙏)\b/.test(lower) && seg.length < 30) continue;
      if (/^\[.*\]$/.test(seg)) continue; // "[audio]", "[unsupported]" etc.

      const subj = extractSubjectsFromText(seg);
      const gr = extractGradesStrict(seg);
      if (subj.size > 0 || gr.size > 0) {
        if (subj.size > 0) for (const x of subj) subjectSet.add(x);
        for (const g of gr) grades.add(g);
        raws.push(seg.slice(0, 90));
      }
    }
  }
  return { subjects: [...subjectSet], grades, raw: raws.slice(0, 4).join(" | ") };
}

function esc(v: unknown): string {
  const s = String(v ?? "");
  return `"${s.replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
}

async function main() {
  // ── load unsubscribed (from blast results) ──
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
  const unsub = new Set<string>();
  for (const p of ["exports/location_ask_blast_results.csv", "exports/generic_location_ask_results.csv", "exports/generic_location_ask2_results.csv"]) {
    if (!fs.existsSync(p)) continue;
    const rows = parseCsv(p);
    const header = rows[0];
    const iPhone = header.findIndex((h) => /phone/i.test(h));
    for (const r of rows.slice(1)) {
      const d = cleanDisplayPhone(r[iPhone] || "");
      if (d.length === 10 && r.slice(4).join(" ").toLowerCase().includes("unsub")) unsub.add(d);
    }
  }

  // ── target pool: every active, sendable tutor ─────────────────────────────
  // User rule (18 Nov 2026): subjects/classes must be refreshed from chat on
  // every reply — even when the profile already has values. No exceptions.
  const tutors = await prisma.user.findMany({
    where: { role: "TUTOR", isActive: true },
    select: {
      id: true, name: true, email: true, phone: true,
      tutorProfile: { select: { id: true, address: true, city: true, subjects: true, classLevels: true } },
    },
  });

  const seen = new Set<string>();
  const targetByPhone = new Map<string, (typeof tutors)[number]>();
  let poolSize = 0;
  for (const t of tutors) {
    const prof = t.tutorProfile;
    if (!prof) continue;
    const name = (t.name || "").trim();
    const digits = cleanDisplayPhone(t.phone);
    if (isTestOrDemoTutor(t.name || "", t.email || "")) continue;
    if (digits.length !== 10 || seen.has(digits)) continue;
    if (isJunkTutorName(name)) continue;
    if (unsub.has(digits)) continue;
    seen.add(digits);
    poolSize++;
    targetByPhone.set(digits, t);
  }
  console.log(`Target pool (all active sendable tutors, always refresh): ${poolSize}`);

  // ── scan inbound chats ──
  const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000);
  const msgs = await prisma.whatsappChatMessage.findMany({
    where: { direction: "INBOUND", createdAt: { gte: since } },
    select: { phone: true, body: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  console.log(`Inbound msgs last ${DAYS}d: ${msgs.length}`);

  const byPhone = new Map<string, string[]>();
  for (const m of msgs) {
    const d = cleanDisplayPhone(m.phone);
    if (!targetByPhone.has(d)) continue;
    const list = byPhone.get(d) || [];
    list.push(m.body);
    byPhone.set(d, list);
  }
  console.log(`Replied from target pool: ${byPhone.size}\n`);

  const updated: string[][] = [];
  const noParse: string[][] = [];
  let updatedCount = 0;

  for (const [digits, bodies] of byPhone) {
    const t = targetByPhone.get(digits)!;
    const prof = t.tutorProfile!;
    const parsed = parseSubjectReply(bodies);
    const existingSubjects = Array.isArray(prof.subjects) ? prof.subjects.map(String) : [];
    const existingClasses = Array.isArray(prof.classLevels) ? prof.classLevels.map(String) : [];

    const newClasses = parsed.grades.size > 0 ? gradesToClassLevels(parsed.grades) : [];
    const finalClasses = newClasses.length ? newClasses : existingClasses;

    // Always normalize against the final class levels using the shared rule:
    //   1-8 → "All Subjects for Class <n>" · 9-12 → class-specific subjects.
    const normalizedReply = parsed.subjects.length
      ? normalizeSubjectsForClassRule(parsed.subjects, finalClasses)
      : [];
    const normalizedExisting = normalizeSubjectsForClassRule(existingSubjects, finalClasses);

    const patch: { subjects?: string[]; classLevels?: string[] } = {};
    const notes: string[] = [];

    if (normalizedReply.length) {
      patch.subjects = normalizedReply;
      notes.push(`subjects=[${normalizedReply.join(", ")}]`);
    } else if (newClasses.length && existingSubjects.length && normalizedExisting.length > 0 && JSON.stringify(normalizedExisting) !== JSON.stringify(existingSubjects)) {
      // Class change only → renormalise the existing subjects for the new band.
      patch.subjects = normalizedExisting;
      notes.push(`subjects(renormalised)=[${normalizedExisting.join(", ")}]`);
    }
    if (newClasses.length) {
      patch.classLevels = newClasses;
      notes.push(`classes=[${newClasses.join(", ")}]`);
    }

    if (!patch.subjects && !patch.classLevels) {
      noParse.push([t.name || "", digits, parsed.raw || bodies.map((b) => String(b).replace(/\s+/g, " ").slice(0, 70)).join(" ⏎ ").slice(0, 200)]);
      continue;
    }

    updated.push([t.id, t.name || "", digits, parsed.raw, existingSubjects.join(", "), (patch.subjects || existingSubjects).join(", "), (patch.classLevels || existingClasses).join(", "), new Date().toISOString()]);
    updatedCount++;
    console.log(`✓ ${t.name} (${digits}): ${notes.join(" · ")}`);
    if (!DRY) await prisma.tutorProfile.update({ where: { id: prof.id }, data: patch });
  }

  fs.writeFileSync("exports/subject_reply_updates.csv", "\uFEFF" + [
    "userId,name,phone,replyRaw,oldSubjects,newSubjects,newClasses,updatedAt",
    ...updated.map((r) => r.map(esc).join(",")),
  ].join("\n"), "utf8");
  fs.writeFileSync("exports/subject_reply_unparsed.csv", "\uFEFF" + [
    "name,phone,replyText",
    ...noParse.map((r) => r.map(esc).join(",")),
  ].join("\n"), "utf8");

  console.log(`\n=== Replied: ${byPhone.size} · updated: ${updatedCount} · unparsed: ${noParse.length} ===`);
  console.log(`Files: exports/subject_reply_updates.csv · exports/subject_reply_unparsed.csv`);

  if (noParse.length) {
    console.log("\n--- Unparsed replies (first 25) ---");
    noParse.slice(0, 25).forEach((r) => console.log(`${r[0]} (${r[1]}): ${r[2]}`));
  }

  await prisma.$disconnect();
}

function isDefaultDelhiCoords(lat?: number | null, lng?: number | null): boolean {
  return lat != null && lng != null &&
    Math.abs(lat - 28.5355) < 0.02 && Math.abs(lng - 77.2410) < 0.02;
}

main().catch((e) => { console.error(e); process.exit(1); });
