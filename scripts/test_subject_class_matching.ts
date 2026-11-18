/**
 * Subject + class matching regression checks for notification dispatch.
 * Run: npx tsx scripts/test_subject_class_matching.ts
 * Pure logic only — no DB, no sends.
 */
import { isSubjectAndClassMatched } from "../lib/matching-engine";
import { isClassCompatible } from "../lib/whatsapp-bot/leads-helper";
import { parseGradeNumbers } from "../lib/subject-taxonomy";

type Case = { name: string; subjects: string[]; classes: string[]; leadSubjects: string[]; leadClass: string; want: boolean };

const junior = Array.from({ length: 8 }, (_, i) => `All Subjects for Class ${i + 1}`);

const cases: Case[] = [
  { name: "junior per-class → class 7 lead", subjects: junior, classes: ["Class 1-8"], leadSubjects: ["All Subjects"], leadClass: "Class 7", want: true },
  { name: "junior per-class does NOT match class 10", subjects: junior, classes: ["Class 1-8"], leadSubjects: ["All Subjects"], leadClass: "Class 10", want: false },
  { name: "junior range label still matches class 7", subjects: ["All Subjects for Class 1-8"], classes: ["Class 1-8"], leadSubjects: ["All Subjects"], leadClass: "Class 7", want: true },
  { name: "junior range label does NOT match class 10", subjects: ["All Subjects for Class 1-8"], classes: ["Class 1-8"], leadSubjects: ["All Subjects"], leadClass: "Class 10", want: false },
  { name: "Maths for Class X → class 10", subjects: ["Mathematics for Class X"], classes: ["Class 10"], leadSubjects: ["Mathematics"], leadClass: "Class 10", want: true },
  { name: "Maths for Class X does NOT match class 12", subjects: ["Mathematics for Class X"], classes: ["Class 10"], leadSubjects: ["Mathematics"], leadClass: "Class 12", want: false },
  { name: "Maths for Class XII → class 12", subjects: ["Mathematics for Class XII"], classes: ["Class 12"], leadSubjects: ["Mathematics"], leadClass: "Class 12", want: true },
  { name: "Science X-XII → class 12", subjects: ["Science for Class X-XII"], classes: ["Class 10", "Class 11", "Class 12"], leadSubjects: ["Science"], leadClass: "Class 12", want: true },
  { name: "English IX, XI, XII → class 11", subjects: ["English for Class IX, XI, XII"], classes: ["Class 9", "Class 11", "Class 12"], leadSubjects: ["English"], leadClass: "Class 11", want: true },
  { name: "Chemistry IITJEE → class 12", subjects: ["Chemistry for IITJEE"], classes: ["Class 11", "Class 12"], leadSubjects: ["Chemistry"], leadClass: "Class 12", want: true },
  { name: "Maths for X + Physics XII: no Class 10 Physics leak", subjects: ["Mathematics for Class X", "Physics for Class XII"], classes: ["Class 10", "Class 12"], leadSubjects: ["Physics"], leadClass: "Class 10", want: false },
  { name: "senior all-subject expansion IX → class 9", subjects: ["Mathematics for Class IX", "Science for Class IX"], classes: ["Class 9"], leadSubjects: ["Mathematics"], leadClass: "Class 9", want: true },
];

let fail = 0;
for (const c of cases) {
  const got = isSubjectAndClassMatched(c.subjects, c.classes, c.leadSubjects, c.leadClass);
  const ok = got === c.want;
  if (!ok) fail++;
  console.log(`${ok ? "PASS" : "FAIL"} ${c.name} → ${got}${ok ? "" : ` (want ${c.want})`}`);
}
const classCases: Array<{ name: string; tutorClass: string[]; leadClass: string; want: boolean }> = [
  { name: "class 1-8 covers class 7", tutorClass: ["Class 1-8"], leadClass: "Class 7", want: true },
  { name: "class 1-8 rejects class 10", tutorClass: ["Class 1-8"], leadClass: "Class 10", want: false },
  { name: "subject label in classLevels cannot bypass class check", tutorClass: ["All Subjects for Class 1-8"], leadClass: "Class 10", want: false },
  { name: "generic 'General' still bypasses", tutorClass: ["General"], leadClass: "Class 10", want: true },
];
for (const c of classCases) {
  const got = isClassCompatible(c.tutorClass, c.leadClass);
  const ok = got === c.want;
  if (!ok) fail++;
  console.log(`${ok ? "PASS" : "FAIL"} ${c.name} → ${got}${ok ? "" : ` (want ${c.want})`}`);
}

for (const [label, want] of [
  ["All Subjects for Class 7", [7]],
  ["Science for Class X-XII", [10, 11, 12]],
  ["English for Class IX, XI, XII", [9, 11, 12]],
] as Array<[string, number[]]>) {
  const got = parseGradeNumbers(label).sort((a, b) => a - b);
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fail++;
  console.log(`${ok ? "PASS" : "FAIL"} parseGradeNumbers(${label}) → ${JSON.stringify(got)}`);
}
console.log(`\n${cases.length + classCases.length + 3 - fail}/${cases.length + classCases.length + 3} passed`);
process.exit(fail ? 1 : 0);
