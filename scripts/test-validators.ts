/**
 * Validator tests. Pure: injected fakes, no network, no DB writes, no sends.
 * Run: node node_modules/tsx/dist/cli.mjs scripts/test-validators.ts
 */
import assert from "node:assert/strict";
import {
  validateLocation, validateEmail, validateName, recordEmailFailure,
  type Geocoder, type MxLookup, type NameChecker, type CallbackTasks,
} from "../lib/whatsapp-bot/pipeline/validators";

let passed = 0;
function check(name: string, fn: () => void | Promise<void>) {
  return async () => { await fn(); passed += 1; console.log(`  PASS: ${name}`); };
}

const geoOk: Geocoder = { geocode: async () => ({ locality: "Sangam Vihar", city: "New Delhi", lat: 28.5, lng: 77.2 }) };
const geoFail: Geocoder = { geocode: async () => null };
const mxOk: MxLookup = { hasMx: async () => true };
const mxFail: MxLookup = { hasMx: async () => false };
const nameYes: NameChecker = { isRealPersonName: async () => ({ is_real_person_name: true, confidence: 0.95 }) };
const nameNo: NameChecker = { isRealPersonName: async () => ({ is_real_person_name: true, confidence: 0.4 }) };

const tests: Array<() => Promise<void>> = [
  check("location: city-only 'Delhi' rejected", async () => {
    const r = await validateLocation("Delhi");
    assert.equal(r.ok, false);
    assert.match(r.reason ?? "", /city alone/i);
  }),
  check("location: 'South Delhi' rejected", async () => {
    assert.equal((await validateLocation("South Delhi")).ok, false);
  }),
  check("location: locality + landmark accepted", async () => {
    const r = await validateLocation("Sangam Vihar, New Delhi near Kumar Sweet", geoOk);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.locality, "Sangam Vihar");
    assert.equal(r.value.city, "New Delhi");
    assert.equal(r.value.landmark, "Kumar Sweet");
    assert.equal(r.value.lat, 28.5);
    assert.equal(r.needsReview, false);
  }),
  check("location: lane/road address accepted", async () => {
    const r = await validateLocation("16 No Gali, Ratiya Marg Road");
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.locality, "16 No Gali");
    assert.equal(r.value.city, null, "area must never be stored in city");
  }),
  check("location: geocoder failure → needs review but still valid", async () => {
    const r = await validateLocation("Rohini Sector 24, Delhi", geoFail);
    assert.equal(r.ok, true);
    assert.equal(r.needsReview, true);
    if (r.ok) assert.equal(r.value.lat, null);
  }),
  check("location: 'online' and sentences rejected", async () => {
    assert.equal((await validateLocation("online")).ok, false);
    assert.equal((await validateLocation("Please send me a tutor in Delhi tomorrow morning")).ok, false);
  }),
  check("email: disposable mailinator rejected", async () => {
    const r = await validateEmail("abc@mailinator.com", mxOk);
    assert.equal(r.ok, false);
    assert.match(r.reason ?? "", /supported/i);
  }),
  check("email: typo gets a suggestion", async () => {
    const r = await validateEmail("abc@gmial.com", mxOk);
    assert.equal(r.ok, false);
    assert.equal(r.suggestion, "abc@example.invalid");
  }),
  check("email: placeholder / apnatutorhub.com rejected", async () => {
    assert.equal((await validateEmail("wa_919000000099@apnatutorhub.com", mxOk)).ok, false);
    assert.equal((await validateEmail("teacher@apnatutorhub.com", mxOk)).ok, false);
  }),
  check("email: valid MX accepted, dead MX rejected", async () => {
    assert.equal((await validateEmail("tutor9@example.invalid", mxOk)).ok, true);
    assert.equal((await validateEmail("rohit@definitely-nope.invalid", mxFail)).ok, false);
  }),
  check("email: 2 failures create ONE staff callback task", async () => {
    const created: string[] = [];
    const callbacks: CallbackTasks = { create: async (i) => { created.push(i.reason); return i; } };
    assert.deepEqual(await recordEmailFailure("919000000099", 1, callbacks, "bad domain"), { handoff: false });
    assert.deepEqual(await recordEmailFailure("919000000099", 2, callbacks, "bad domain"), { handoff: true });
    assert.equal(created.length, 1);
    assert.match(created[0], /Email validation failed twice/);
  }),
  check("name: honeyvats93 / Sir / emoji rejected", async () => {
    assert.equal((await validateName("honeyvats93", nameYes)).ok, false);
    assert.equal((await validateName("Sir", nameYes)).ok, false);
    assert.equal((await validateName("😀😀", nameYes)).ok, false);
  }),
  check("name: titled real name accepted, low confidence rejected", async () => {
    assert.equal((await validateName("Mr. Rohit Kumar", nameYes)).ok, true);
    assert.equal((await validateName("Rohit Kumar", nameNo)).ok, false);
  }),
  check("name: no checker falls back with needsReview", async () => {
    const r = await validateName("Rohit Kumar");
    assert.equal(r.ok, true);
    assert.equal(r.needsReview, true);
  }),
];

(async () => {
  for (const t of tests) await t();
  console.log(`\n${passed}/${tests.length} validator checks passed`);
  console.log("No DB write and no WhatsApp send performed.");
})().then(() => process.exit(0)).catch((e) => { console.error("FAIL", e); process.exit(1); });
