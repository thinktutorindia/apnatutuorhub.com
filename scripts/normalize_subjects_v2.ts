/**
 * SUBJECT NORMALIZATION v2 (user rule refined, 18 Nov 2026):
 *   · Class 1-8  → per-class entries: "All Subjects For Class 1-3", "All Subjects For Class 5"
 *   · Class 9-12 → class-specific subjects, NO generic: "Mathematics for Class X",
 *                  "Accountancy for Class XI", ranges merged ("IX-X")
 *   · Exam/course qualifiers kept: "Chemistry for IITJEE", "Accountancy for B.Com"
 *
 * Uses the ORIGINAL subjects from exports/db_backup_2026-11-18.json (pre-v1
 * normalization) so "Maths for Class X" class info that v1 stripped is recovered.
 * Band comes from classLevels. Test/demo skipped. Never fabricates classes the
 * tutor didn't give (entry without class ref → profile's own senior class span).
 *
 * Run: npx tsx --env-file=.env scripts/normalize_subjects_v2.ts
 * Dry: npx tsx --env-file=.env scripts/normalize_subjects_v2.ts --dry
 * Out: exports/subject_normalize_v2_changes.csv
 */
import * as fs from "fs";
import { PrismaClient } from "@prisma/client";
import { extractAllGrades } from "../lib/whatsapp-bot/leads-helper";

const prisma = new PrismaClient();
const DRY = process.argv.includes("--dry");
const BACKUP_FILE = "exports/db_backup_2026-11-18.json";

const ROMAN: Record<number, string> = { 1: "I", 2: "II", 3: "III", 4: "IV", 5: "V", 6: "VI", 7: "VII", 8: "VIII", 9: "IX", 10: "X", 11: "XI", 12: "XII" };
const ROMAN_TO_NUM: Record<string, number> = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12 };

const SUBJECT_PATTERNS: [RegExp, string][] = [
  [/account(?:s|ancy)?\b|\bcosting\b/, "Accountancy"],
  [/\bmaths?\b|mathematics/, "Mathematics"],
  [/\bscience\b|\bsci\b/, "Science"],
  [/physic/, "Physics"],
  [/chemistr/, "Chemistry"],
  [/\bbio(logy)?\b|\bbotany\b|\bzoology\b/, "Biology"],
  [/\benglish\b/, "English"],
  [/\bhindi\b/, "Hindi"],
  [/\bsanskrit\b/, "Sanskrit"],
  [/\burdu\b/, "Urdu"],
  [/\becon/, "Economics"],
  [/business\s*stud/, "Business Studies"],
  [/\bcommerce\b/, "Commerce"],
  [/\bcomputer\b|\bpython\b|\bjava\b|\bcoding\b/, "Computer Science"],
  [/\bsst\b|social\s*stud|social\s*science|individuals\s+and\s+societies/, "Social Science"],
  [/\bhistor/, "History"],
  [/geograph/, "Geography"],
  [/politic(?:al)?\s*science|\bpol\s*sci|\bpolity\b/, "Political Science"],
  [/psycholog/, "Psychology"],
  [/sociolog/, "Sociology"],
  [/\bfrench\b/, "French"],
  [/\bgk\b|general\s*knowledge/, "Gk"],
  [/\bevs\b|environmental\s*stud/, "EVS"],
];

const EXAM_QUALIFIER_RE = /\b(iit\s*jee|neet|medical\s*entrance|engineering\s*entrance|olympiad|ntse|b\.?\s*com[^,]*|graduation|college)\b/i;

/** Grab class ref like "Class X", "IX - X", "6 to 8", "upto Class V" from entry text. */
function parseClassRef(text: string): { nums: number[]; consumed: string } | null {
  const re = /(?:for|upto|till)\s+(?:class\s+)?((?:[ivxlIVXL]{1,4}|\d{1,2})(?:\s*(?:-|–|—|to|&)\s*(?:[ivxlIVXL]{1,4}|\d{1,2}))?)(?![a-z])/i;
  const m = text.match(re);
  if (!m) return null;
  const token = m[1].toLowerCase();
  const toNum = (p: string): number | null => {
    if (/^\d{1,2}$/.test(p)) return parseInt(p, 10);
    if (ROMAN_TO_NUM[p]) return ROMAN_TO_NUM[p];
    return null;
  };
  // range ("IX - X", "6 to 8") → expand to full range
  const rangeMatch = token.match(/^(\S+?)\s*(?:-|–|—|to|&)\s*(\S+)$/);
  let nums: number[] = [];
  if (rangeMatch) {
    const a = toNum(rangeMatch[1]), b = toNum(rangeMatch[2]);
    if (a != null && b != null && a <= b) for (let n = a; n <= b; n++) nums.push(n);
  }
  if (!nums.length) {
    for (const p of token.split(/\s*[-–—&]\s*|\s+/).filter(Boolean)) {
      const n = toNum(p);
      if (n != null) nums.push(n);
    }
  }
  if (!nums.length) return null;
  return { nums, consumed: m[0] };
}

function formatClassNums(nums: number[]): string | null {
  const valid = [...new Set(nums)].filter((n) => n >= 1 && n <= 12).sort((a, b) => a - b);
  if (!valid.length) return null;
  // contiguous → "IX-X", else "XI, XII"
  const contiguous = valid.length > 1 && valid[valid.length - 1] - valid[0] === valid.length - 1;
  if (contiguous) return `${ROMAN[valid[0]]}-${ROMAN[valid[valid.length - 1]]}`;
  return valid.map((n) => ROMAN[n]).join(", ");
}

function canonicalSubjectFrom(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [re, name] of SUBJECT_PATTERNS) {
    if (re.test(lower)) return name;
  }
  const t = text.trim();
  if (t.length >= 3 && t.length <= 30 && !/^(nursery|kg|lkg|ukg|primary|secondary|middle|senior|general|all)$/i.test(t)) {
    return t.split(/\s+/).filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
  }
  return null;
}

/** Senior band → class-specific subject entries from original subjects. */
function buildSeniorSubjects(orig: string[], classLevels: string[]): string[] {
  const out = new Set<string>();
  // profile's own senior class span (from classLevels)
  const grades = [...extractAllGrades(classLevels.join(", "))].filter((g) => g >= 1 && g <= 12);
  const seniorProfile = [...new Set(grades.filter((g) => g > 8))].sort((a, b) => a - b);
  const span = seniorProfile.length
    ? (seniorProfile.length > 1 && seniorProfile[seniorProfile.length - 1] - seniorProfile[0] === seniorProfile.length - 1
      ? `${ROMAN[seniorProfile[0]]}-${ROMAN[seniorProfile[seniorProfile.length - 1]]}`
      : seniorProfile.map((g) => ROMAN[g]).join(", "))
    : null;

  for (const e0 of orig) {
    let entry = String(e0 || "").trim();
    if (!entry) continue;
    const isAllSubjects = /^all\s+(subjects|primary)/i.test(entry);
    if (isAllSubjects) {
      // "All Subjects For Class X" entries: keep ONLY if they carry class detail and profile has no senior span context —
      // for senior band, junior all-subjects claims are dropped (unknowable); senior ref kept.
      const ref = parseClassRef(entry);
      if (ref) {
        const c = formatClassNums(ref.nums);
        if (c && ref.nums.every((n) => n > 8)) out.add(`All Subjects for Class ${c}`);
      }
      continue;
    }
    // exam qualifier (IITJEE/NEET/B.Com/College) — keep
    const qm = entry.match(EXAM_QUALIFIER_RE);
    let qualifier: string | null = null;
    let work = entry;
    if (qm) {
      qualifier = qm[0].replace(/\s+/g, " ").trim();
      work = entry.slice(0, qm.index || 0) || entry.replace(qm[0], "");
    }
    const ref = parseClassRef(work);
    let subjText = work;
    if (ref) subjText = work.replace(ref.consumed, "");
    subjText = subjText.replace(/\b(class(es)?)\b/gi, " ").replace(/[,&+]/g, " ").replace(/\s+/g, " ").trim();
    if (!subjText && ref) subjText = "";
    const subj = canonicalSubjectFrom(subjText || work.split(/for|upto/i)[0]);
    if (!subj) continue;

    if (qualifier) {
      const qLabel = /b\.?\s*com/i.test(qualifier) ? "B.Com" : /iit/i.test(qualifier) ? "IITJEE" : /neet/i.test(qualifier) ? "NEET" : titleCaseQ(qualifier);
      out.add(`${subj} for ${qLabel}`);
      continue;
    }
    if (ref) {
      const c = formatClassNums(ref.nums);
      if (c) { out.add(`${subj} for Class ${c}`); continue; }
    }
    // no class info in entry → attach profile's own senior span
    if (span) out.add(`${subj} for Class ${span}`);
    else out.add(subj);
  }
  return [...out];
}

function titleCaseQ(s: string): string {
  return s.split(/\s+/).filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

/** Junior band → "All Subjects for Class <n>" per classLevels entry (sorted). */
function buildJuniorSubjects(classLevels: string[]): string[] {
  const entries: { label: string; n: number }[] = [];
  for (const cl of classLevels) {
    const t = String(cl || "").trim();
    if (!t) continue;
    const nums = [...extractAllGrades(t)].filter((n) => n >= 1 && n <= 12).sort((a, b) => a - b);
    if (nums.length) {
      const contiguous = nums.length > 1 && nums[nums.length - 1] - nums[0] === nums.length - 1;
      const label = contiguous ? `${nums[0]}-${nums[nums.length - 1]}` : nums.join(", ");
      entries.push({ label: `All Subjects for Class ${label}`, n: nums[0] });
    } else if (/nursery|kg|lkg|ukg|playgroup|pre-?school/i.test(t)) {
      entries.push({ label: `All Subjects for Pre-Primary`, n: 0 });
    } else {
      entries.push({ label: `All Subjects for ${titleCaseQ(t)}`, n: 0 });
    }
  }
  const seen = new Set<string>();
  return entries
    .sort((a, b) => a.n - b.n)
    .map((e) => e.label)
    .filter((l) => { if (seen.has(l)) return false; seen.add(l); return true; });
}

function parseBand(classLevels: string[]): { maxGrade: number | null; primaryOnly: boolean } {
  const text = (classLevels || []).join(", ");
  const grades = extractAllGrades(text);
  const numeric = [...grades].filter((g) => g >= 1 && g <= 12);
  const maxGrade = numeric.length ? Math.max(...numeric) : null;
  const primaryOnly = !numeric.length && /\b(nursery|kg|lkg|ukg|pre-?nursery|primary|playgroup|pre-?school)\b/i.test(text);
  return { maxGrade, primaryOnly };
}

function isTestOrDemoTutor(name: string, email: string): boolean {
  const n = (name || "").toLowerCase();
  const e = (email || "").toLowerCase();
  if (/demo|dummy|pending kyc|sample/.test(n)) return true;
  if (/^test|\.test@|@test\.|test@apnatutorhub/.test(e)) return true;
  return /\b(test|demo|dummy)\b/.test(e.split("@")[0] || "");
}

function esc(v: unknown): string {
  const s = String(v ?? "");
  return `"${s.replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
}

async function main() {
  if (!fs.existsSync(BACKUP_FILE)) { console.error(`Backup not found: ${BACKUP_FILE}`); process.exit(1); }
  const backup = JSON.parse(fs.readFileSync(BACKUP_FILE, "utf8")) as Record<string, Array<Record<string, unknown>>>;
  const origByUserId = new Map<string, string[]>();
  for (const row of backup.TutorProfile || []) {
    const uid = String(row.userId || "");
    const subj = Array.isArray(row.subjects) ? (row.subjects as string[]).map(String) : [];
    origByUserId.set(uid, subj);
  }

  const profiles = await prisma.tutorProfile.findMany({
    select: { id: true, userId: true, subjects: true, classLevels: true, user: { select: { id: true, name: true, email: true, phone: true } } },
  });
  console.log(`Tutor profiles: ${profiles.length}\n`);

  const changes: string[][] = [];
  const stats = { juniorSet: 0, seniorSet: 0, noBandSkipped: 0, alreadyOk: 0 };
  let scanned = 0;

  for (const p of profiles) {
    if (isTestOrDemoTutor(p.user?.name || "", p.user?.email || "")) continue;
    scanned++;
    const orig = origByUserId.get(p.userId) ?? (Array.isArray(p.subjects) ? p.subjects.map(String) : []);
    const classLevels = Array.isArray(p.classLevels) ? p.classLevels.map(String) : [];
    const { maxGrade, primaryOnly } = parseBand(classLevels);
    if (maxGrade == null && !primaryOnly) { stats.noBandSkipped++; continue; }

    let newSubjects: string[] | null = null;
    let band = "";
    if (primaryOnly || (maxGrade != null && maxGrade <= 8)) {
      band = primaryOnly ? "pre-primary" : `1-8(max ${maxGrade})`;
      newSubjects = buildJuniorSubjects(classLevels);
      if (!newSubjects.length) newSubjects = ["All Subjects"];
    } else {
      band = `9-12(max ${maxGrade})`;
      newSubjects = buildSeniorSubjects(orig, classLevels);
      if (!newSubjects.length) newSubjects = null; // nothing derivable — leave as-is
    }

    if (newSubjects) {
      const cur = (Array.isArray(p.subjects) ? p.subjects.map(String) : []).map((s) => s.trim()).filter(Boolean);
      if (cur.join("|") === newSubjects.join("|")) { stats.alreadyOk++; continue; }
      if (band.startsWith("1-8") || band === "pre-primary") stats.juniorSet++; else stats.seniorSet++;
      changes.push([p.userId, p.user?.name || "", String(p.user?.phone || ""), band, cur.join(", "), newSubjects.join(", "), classLevels.join(", "), new Date().toISOString()]);
      console.log(`✓ ${p.user?.name || "?"} (${p.user?.phone || "?"}) [${band}] [${cur.join(", ") || "-"}] → [${newSubjects.join(", ")}]`);
      if (!DRY) await prisma.tutorProfile.update({ where: { id: p.id }, data: { subjects: newSubjects } });
    } else {
      stats.alreadyOk++;
    }
  }

  fs.writeFileSync("exports/subject_normalize_v2_changes.csv", "\uFEFF" + [
    "userId,name,phone,band,oldSubjects,newSubjects,classLevels,changedAt",
    ...changes.map((r) => r.map(esc).join(",")),
  ].join("\n"), "utf8");

  console.log(`\n=== ${DRY ? "DRY-RUN (no DB change)" : "APPLIED"} ===`);
  console.log(`Scanned: ${scanned}`);
  console.log(`1-8 → "All Subjects For Class <n>": ${stats.juniorSet}`);
  console.log(`9-12 → class-specific subjects: ${stats.seniorSet}`);
  console.log(`No classLevels (skipped): ${stats.noBandSkipped}`);
  console.log(`Already correct: ${stats.alreadyOk}`);
  console.log(`CSV -> exports/subject_normalize_v2_changes.csv (${changes.length} rows)`);

  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
