/**
 * SUBJECT NORMALIZATION by class band (user rule, 18 Nov 2026):
 *   · Class band 1-8  → subjects = ["All Subjects"] (any subject at primary level = all subjects)
 *   · Class band 9-12 → only SPECIFIC subjects (Maths→Mathematics, SST→Social Science, ...)
 *
 * Never touches profiles without classLevels (band unknown).
 * Test/demo accounts skipped.
 * Run:      npx tsx --env-file=.env scripts/normalize_subjects_by_class.ts
 * Dry:      npx tsx --env-file=.env scripts/normalize_subjects_by_class.ts --dry
 * Out: exports/subject_normalize_changes.csv
 */
import * as fs from "fs";
import { PrismaClient } from "@prisma/client";
import { extractAllGrades } from "../lib/whatsapp-bot/leads-helper";

const prisma = new PrismaClient();
const DRY = process.argv.includes("--dry");

const SUBJECT_PATTERNS: [RegExp, string][] = [
  [/account(?:s|ancy)?\b|\bcosting\b/, "Accountancy"],
  [/\bmaths?\b|mathematics/, "Mathematics"],
  [/\bscience\b|\bsci\b/, "Science"],
  [/physic/, "Physics"],
  [/chemistr/, "Chemistry"],
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
  [/\bgk\b|general\s*knowledge/, "Gk"],
  [/\bevs\b|environmental\s*stud/, "EVS"],
];

function canonicalSubjects(entries: string[]): string[] {
  const out = new Set<string>();
  for (const e of entries) {
    const s = String(e || "").trim();
    if (!s) continue;
    if (/all\s+(subjects|primary)/i.test(s)) continue; // "All Subjects" not allowed for senior band
    const mapped = [...new Set([...SUBJECT_PATTERNS].filter(([re]) => re.test(s.toLowerCase())).map(([, n]) => n))];
    if (mapped.length) { for (const m of mapped) out.add(m); continue; }
    // non-keyword subject name (French, German...) — keep clean title case
    const t = s.replace(/\s+for\s+.*$/i, "").trim();
    if (t.length >= 3 && t.length <= 24 && !/^(nursery|kg|lkg|ukg|primary|secondary|middle|senior|general|all)$/i.test(t)) {
      out.add(t.split(/\s+/).filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" "));
    }
  }
  return [...out];
}

function titleCase(s: string): string {
  return String(s || "").trim().split(/\s+/).filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

function isTestOrDemoTutor(name: string, email: string): boolean {
  const n = (name || "").toLowerCase();
  const e = (email || "").toLowerCase();
  if (/demo|dummy|pending kyc|sample/.test(n)) return true;
  if (/^test|\.test@|@test\.|test@apnatutorhub/.test(e)) return true;
  return /\b(test|demo|dummy)\b/.test(e.split("@")[0] || "");
}

/** Band from classLevels: max grade; "primary-only" when only nursery/kg/primary words. */
function parseBand(classLevels: string[]): { maxGrade: number | null; primaryOnly: boolean } {
  const text = (classLevels || []).join(", ");
  const grades = extractAllGrades(text);
  const numeric = [...grades].filter((g) => g >= 1 && g <= 12);
  const maxGrade = numeric.length ? Math.max(...numeric) : null;
  const primaryOnly =
    !numeric.length &&
    /\b(nursery|kg|lkg|ukg|pre-?nursery|primary|playgroup|pre-?school)\b/i.test(text);
  return { maxGrade, primaryOnly };
}

function esc(v: unknown): string {
  const s = String(v ?? "");
  return `"${s.replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
}

async function main() {
  const profiles = await prisma.tutorProfile.findMany({
    select: { id: true, subjects: true, classLevels: true, user: { select: { id: true, name: true, email: true, phone: true, isActive: true } } },
  });
  console.log(`Tutor profiles: ${profiles.length}\n`);

  const changes: string[][] = [];
  const stats = { allSubjectsSet: 0, canonicalized: 0, seniorAllSubjectsLeft: 0, noBandSkipped: 0, alreadyOk: 0 };
  let scanned = 0;

  for (const p of profiles) {
    if (isTestOrDemoTutor(p.user?.name || "", p.user?.email || "")) continue;
    scanned++;
    const subjects = Array.isArray(p.subjects) ? p.subjects.map(String) : [];
    const classLevels = Array.isArray(p.classLevels) ? p.classLevels.map(String) : [];
    const { maxGrade, primaryOnly } = parseBand(classLevels);

    if (maxGrade == null && !primaryOnly) { stats.noBandSkipped++; continue; }

    let newSubjects: string[] | null = null;
    let band = "";

    if (primaryOnly || (maxGrade != null && maxGrade <= 8)) {
      band = primaryOnly ? "primary(1-8)" : `1-8(max ${maxGrade})`;
      // RULE 1: everything ≤8 → All Subjects
      if (subjects.length !== 1 || (subjects[0] || "").toLowerCase() !== "all subjects") {
        newSubjects = ["All Subjects"];
      }
    } else {
      band = `9-12(max ${maxGrade})`;
      // RULE 2: senior band → specific canonical subjects only
      const canon = canonicalSubjects(subjects);
      const cur = subjects.map((s) => s.trim()).filter(Boolean);
      if (canon.length > 0 && canon.join("|") !== cur.join("|")) {
        newSubjects = canon;
      } else if (canon.length === 0 && cur.length === 1 && /all\s+subjects/i.test(cur[0])) {
        // senior tutor with only "All Subjects" — can't fabricate specifics; leave (needs ask)
        stats.seniorAllSubjectsLeft++;
      }
    }

    if (newSubjects) {
      const sameAsOld = subjects.map((s) => s.trim()).filter(Boolean).join("|") === newSubjects.join("|");
      if (sameAsOld) { stats.alreadyOk++; continue; }
      stats[band.startsWith("primary") || band.startsWith("1-8") ? "allSubjectsSet" : "canonicalized"]++;
      changes.push([
        p.user?.id || "", p.user?.name || "", String(p.user?.phone || ""), band,
        subjects.join(", "), newSubjects.join(", "), classLevels.join(", "),
        new Date().toISOString(),
      ]);
      console.log(`✓ ${p.user?.name || "?"} (${p.user?.phone || "?"}) [${band}] [${subjects.join(", ") || "-"}] → [${newSubjects.join(", ")}]`);
      if (!DRY) await prisma.tutorProfile.update({ where: { id: p.id }, data: { subjects: newSubjects } });
    } else {
      stats.alreadyOk++;
    }
  }

  fs.writeFileSync("exports/subject_normalize_changes.csv", "\uFEFF" + [
    "userId,name,phone,band,oldSubjects,newSubjects,classLevels,changedAt",
    ...changes.map((r) => r.map(esc).join(",")),
  ].join("\n"), "utf8");

  console.log(`\n=== ${DRY ? "DRY-RUN (no DB change)" : "APPLIED"} ===`);
  console.log(`Scanned: ${scanned}`);
  console.log(`Rule-1 (1-8 → All Subjects): ${stats.allSubjectsSet} changed`);
  console.log(`Rule-2 (9-12 → specific canonical): ${stats.canonicalized} changed`);
  console.log(`Senior band with only "All Subjects" (left as-is, needs ask): ${stats.seniorAllSubjectsLeft}`);
  console.log(`No classLevels (band unknown, skipped): ${stats.noBandSkipped}`);
  console.log(`Already correct: ${stats.alreadyOk}`);
  console.log(`CSV -> exports/subject_normalize_changes.csv (${changes.length} rows)`);

  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
