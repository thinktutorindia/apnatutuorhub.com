/**
 * Taxonomy + range-parser tests from the rewrite spec. Pure, no DB/network.
 * Run: node node_modules/tsx/dist/cli.mjs scripts/test-taxonomy.ts
 */
import assert from "node:assert/strict";
import { parseClassesAndSubjects, normaliseEntries, extractGrades, formatEntry } from "../lib/whatsapp-bot/pipeline/taxonomy";

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`  PASS: ${name}`);
}
const parse = (s: string) => normaliseEntries(parseClassesAndSubjects(s));

const tests: Array<() => void> = [
  () => check('"9 to 12 maths" → Maths IX, X, XI, XII', () => {
    assert.deepEqual(parse("9 to 12 maths"), [
      "Mathematics for Class IX", "Mathematics for Class X",
      "Mathematics for Class XI", "Mathematics for Class XII",
    ]);
  }),
  () => check('"1 to 8 all subjects" → 8 junior entries', () => {
    assert.deepEqual(parse("1 to 8 all subjects"), Array.from({ length: 8 }, (_, i) => `All Subjects for Class ${i + 1}`));
  }),
  () => check('"physics chemistry 11 12" → 4 senior entries', () => {
    assert.deepEqual(parse("physics chemistry 11 12"), [
      "Chemistry for Class XI", "Physics for Class XI",
      "Chemistry for Class XII", "Physics for Class XII",
    ]);
  }),
  () => check('"biology 10 to 12" → Science X + Biology XI/XII', () => {
    assert.deepEqual(parse("biology 10 to 12"), [
      "Science for Class X", "Biology for Class XI", "Biology for Class XII",
    ]);
  }),
  () => check('"science class 12" → rejected with specific-subject prompt', () => {
    const r = parseClassesAndSubjects("science class 12");
    assert.equal(r.ok, false);
    assert.match(r.prompt ?? "", /specific subject/i);
    assert.deepEqual(r.entries, []);
  }),
  () => check('"nursery to 5" → Pre-Primary + Classes 1..5', () => {
    assert.deepEqual(parse("nursery to 5"), [
      "All Subjects for Pre-Primary",
      "All Subjects for Class 1", "All Subjects for Class 2", "All Subjects for Class 3",
      "All Subjects for Class 4", "All Subjects for Class 5",
    ]);
  }),
  () => check('"1+2" → two junior entries', () => {
    assert.deepEqual(parse("1+2"), ["All Subjects for Class 1", "All Subjects for Class 2"]);
  }),
  () => check('"physics 9-10" → Science IX/X, not Physics', () => {
    assert.deepEqual(parse("physics 9-10"), ["Science for Class IX", "Science for Class X"]);
  }),
  () => check('"history 9-10" → Social Science IX/X', () => {
    assert.deepEqual(parse("history 9-10"), ["Social Science for Class IX", "Social Science for Class X"]);
  }),
  () => check("mixed input splits by band", () => {
    assert.deepEqual(parse("biology 10 to 12, 1-5 all subjects"), [
      "All Subjects for Class 1", "All Subjects for Class 2", "All Subjects for Class 3",
      "All Subjects for Class 4", "All Subjects for Class 5",
      "Science for Class X", "Biology for Class XI", "Biology for Class XII",
    ]);
  }),
  () => check("junior specific subjects are reported but stored as All Subjects", () => {
    const r = parseClassesAndSubjects("class 5 maths science");
    assert.equal(r.ok, true);
    assert.deepEqual(r.entries, ["All Subjects for Class 5"]);
    assert.ok(r.notes.some((n) => /Classes 1-8 are listed as All Subjects/.test(n)));
  }),
  () => check("sector numbers and 6-digit pincodes are not classes", () => {
    assert.deepEqual(extractGrades("Sector 62 Noida, pincode 110001, class 5 maths"), [5]);
  }),
  () => check("formatter keeps Roman numerals only for 9-12", () => {
    assert.equal(formatEntry("All Subjects", 5), "All Subjects for Class 5");
    assert.equal(formatEntry("Mathematics", 9), "Mathematics for Class IX");
    assert.equal(formatEntry("Physics", 11), "Physics for Class XI");
  }),
  () => check("no fee/budget input can change the taxonomy", () => {
    assert.deepEqual(parse("class 11 physics, budget ₹50,000/hour"), ["Physics for Class XI"]);
  }),
];

for (const t of tests) t();
console.log(`\n${passed}/${tests.length} taxonomy checks passed`);
