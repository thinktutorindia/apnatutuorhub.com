/**
 * SUBJECT NORMALIZATION v3 — one canonical label per class.
 *   · Class 1-8  → "All Subjects for Class 1", "All Subjects for Class 2", ...
 *                  (a tutor may hold any number of these)
 *   · Class 9-12 → subject + own class: "Mathematics for Class X",
 *                  "Physics for Class XII", "Accountancy for Class XI", ...
 *                  Qualifiers (IITJEE/NEET/B.Com) are kept as-is.
 *   · Range/comma labels from v2 are expanded into per-class labels.
 *
 * Reads CURRENT TutorProfile subjects+classLevels (not the backup). Profiles
 * with no usable class information are skipped — never guess a class.
 *
 * Dry: npx tsx --env-file=.env scripts/normalize_subjects_v3.ts --dry
 * Run: npx tsx --env-file=.env scripts/normalize_subjects_v3.ts --apply
 * Out: exports/subject_normalize_v3_changes.csv
 */
import * as fs from "fs";
import { PrismaClient } from "@prisma/client";
import { normalizeSubjectsForClassRule, parseClassGradesFromText } from "../lib/subject-normalization";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

function esc(v: unknown): string {
  return `"${String(v ?? "").replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
}

async function main() {
  const tutors = await prisma.user.findMany({
    where: { role: "TUTOR", isActive: true },
    select: {
      id: true, name: true, email: true, phone: true,
      tutorProfile: { select: { id: true, subjects: true, classLevels: true } },
    },
  });

  const rows: string[][] = [];
  let changed = 0;
  for (const t of tutors) {
    const prof = t.tutorProfile;
    if (!prof) continue;
    if (/\b(test|demo|dummy)\b/i.test(`${t.name || ""} ${t.email || ""}`)) continue;
    const subjects = Array.isArray(prof.subjects) ? prof.subjects.map(String) : [];
    const classes = Array.isArray(prof.classLevels) ? prof.classLevels.map(String) : [];
    if (!subjects.length) continue;

    const classGrades = parseClassGradesFromText(classes.join(", "));
    // Skip profiles whose band cannot be established (blank / "General" / junk).
    const hasSubjectGrade = subjects.some((s) => parseClassGradesFromText(s).length > 0);
    if (!classGrades.length && !hasSubjectGrade) continue;

    const next = normalizeSubjectsForClassRule(subjects, classes);
    if (!next.length || JSON.stringify(next) === JSON.stringify(subjects)) continue;

    changed++;
    rows.push([t.id, t.name || "", t.phone || "", classes.join(";"), subjects.join("; "), next.join("; ")]);
    console.log(`✓ ${t.name} (${t.phone}): ${subjects.join(", ")} → ${next.join(", ")}`);
    if (APPLY) await prisma.tutorProfile.update({ where: { id: prof.id }, data: { subjects: next } });
  }

  const out = APPLY ? "exports/subject_normalize_v3_changes.csv" : "exports/subject_normalize_v3_dryrun.csv";
  if (rows.length) {
    fs.writeFileSync(out, "\uFEFF" + [
      ["userId", "name", "phone", "classLevels", "oldSubjects", "newSubjects"].join(","),
      ...rows.map((r) => r.map(esc).join(",")),
    ].join("\r\n"), "utf8");
  }

  console.log(`\n=== ${APPLY ? "applied" : "would update"}: ${changed} profiles · ${out} ===`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
