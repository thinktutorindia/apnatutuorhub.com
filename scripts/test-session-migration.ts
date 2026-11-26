/** Mid-flow migration tests — pure, no DB/network/sends. */
import assert from "node:assert/strict";
import { migrateLegacySession, preservedFields } from "../lib/whatsapp-bot/pipeline/session-migration";

let passed = 0;
function check(name: string, fn: () => void) { fn(); passed += 1; console.log(`  PASS: ${name}`); }

const tests: Array<() => void> = [
  () => check("T_EMAIL keeps collected email and asks no welcome", () => {
    const r = migrateLegacySession({ phone: "A", step: "T_EMAIL", data: { email: "tutor9@example.invalid", name: "Rohit" } });
    assert.equal(r.pendingField, "email");
    assert.equal(r.sendWelcome, false);
    assert.equal(r.preserved.email, "tutor9@example.invalid");
    assert.ok(r.notes.some((n) => /confirmation before overwriting/.test(n)));
  }),
  () => check("T_AREA keeps area + city", () => {
    const r = migrateLegacySession({ phone: "A", step: "T_AREA", data: { area: "Rohini", city: "Delhi" } });
    assert.equal(r.pendingField, "location");
    assert.deepEqual(preservedFields(r), ["area", "city"]);
  }),
  () => check("LANG_SELECT does not send a second welcome to a registered user", () => {
    const r = migrateLegacySession({ phone: "A", step: "LANG_SELECT", data: { _registered: true, name: "Rohit" } });
    assert.equal(r.sendWelcome, false);
    assert.equal(r.preserved.name, "Rohit");
  }),
  () => check("WELCOME for a brand-new user sends exactly one welcome", () => {
    assert.equal(migrateLegacySession({ phone: "A", step: "WELCOME", data: {} }).sendWelcome, true);
  }),
  () => check("T_CLASSES preserves subjects and classLevels", () => {
    const r = migrateLegacySession({ phone: "A", step: "T_CLASSES", data: { subjects: ["Maths for Class XI"], classLevels: ["Class 11"] } });
    assert.equal(r.pendingField, "classes_subjects");
    assert.ok(preservedFields(r).includes("subjects"));
    assert.ok(preservedFields(r).includes("classLevels"));
  }),
  () => check("password steps stay dedicated", () => {
    const r = migrateLegacySession({ phone: "A", step: "T_PASSWORD", data: { name: "Rohit" } });
    assert.equal(r.pendingField, undefined);
    assert.equal(r.sendWelcome, false);
    assert.match(r.notes[0], /dedicated handler/);
  }),
  () => check("no collected field is silently dropped", () => {
    const r = migrateLegacySession({ phone: "A", step: "DONE", data: { name: "Rohit", email: "r@example.invalid", area: "Rohini", subjects: ["All Subjects for Class 5"] } });
    assert.deepEqual(preservedFields(r).sort(), ["area", "email", "name", "subjects"]);
  }),
];

for (const t of tests) t();
console.log(`\n${passed}/${tests.length} session-migration checks passed`);
console.log("No DB write and no WhatsApp send performed.");
