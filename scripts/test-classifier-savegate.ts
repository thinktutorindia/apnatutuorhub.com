/**
 * Classifier + SAVE GATE tests. Injected fakes only — no Gemini, DB or sends.
 * Run: node node_modules/tsx/dist/cli.mjs scripts/test-classifier-savegate.ts
 */
import assert from "node:assert/strict";
import { classify, type GeminiClassifier } from "../lib/whatsapp-bot/pipeline/classifier";
import { applySaveGate, type ProfileStore, type ProfileFields, type ProfileSnapshot } from "../lib/whatsapp-bot/pipeline/save-gate";
import type { Classification } from "../lib/whatsapp-bot/pipeline/classifier";

let passed = 0;
async function check(name: string, fn: () => void | Promise<void>) {
  await fn(); passed += 1; console.log(`  PASS: ${name}`);
}

function fakeStore(initial: ProfileSnapshot = {}) {
  const state = { snapshot: initial, updates: [] as ProfileFields[], rejects: [] as Array<{ field: string; input: string; reason: string }> };
  const store: ProfileStore = {
    snapshot: async () => state.snapshot,
    update: async (f) => { state.updates.push(f); state.snapshot = { ...state.snapshot, ...f }; },
    logReject: async (e) => { state.rejects.push({ field: e.field, input: e.input, reason: e.reason }); },
  };
  return { store, state };
}

const goodJson: GeminiClassifier = {
  classify: async () => JSON.stringify({
    message_type: "ANSWER_TO_PENDING", intent: "update", confidence: 0.9,
    extracted: { email: { value: "tutor9@example.invalid", confidence: 0.95 } },
  }),
};

const c = (over: Partial<Classification> = {}): Classification => ({
  message_type: "PROFILE_INFO", intent: "update", confidence: 0.9, extracted: {}, ...over,
});

(async () => {
  await check("classifier: one Gemini call, strict JSON accepted", async () => {
    let calls = 0;
    const gemini: GeminiClassifier = { classify: async () => { calls += 1; return JSON.stringify({ message_type: "PROFILE_INFO", intent: "update", confidence: 0.9, extracted: {} }); } };
    const r = await classify("Rohit Kumar", { gemini });
    assert.equal(calls, 1);
    assert.equal(r.usedFallback, undefined);
    assert.equal(r.message_type, "PROFILE_INFO");
  });

  await check("classifier: invalid JSON and thrown errors fall back deterministically", async () => {
    const bad: GeminiClassifier = { classify: async () => "not json" };
    const thrown: GeminiClassifier = { classify: async () => { throw new Error("timeout"); } };
    for (const g of [bad, thrown]) {
      const r = await classify("what is the fee?", { gemini: g });
      assert.equal(r.usedFallback, true);
      assert.equal(r.message_type, "QUESTION");
      assert.equal(r.intent, "fees");
    }
  });

  await check("classifier: fee question never extracts a pending email", async () => {
    const r = await classify("what is the fee?", { pendingField: "email" });
    assert.equal(r.message_type, "QUESTION");
    assert.equal(r.intent, "fees");
    assert.deepEqual(r.extracted, {});
  });

  await check("save gate: fee question writes nothing", async () => {
    const { store, state } = fakeStore();
    const r = await applySaveGate({ phone: "919000000099", classification: c({ message_type: "QUESTION", intent: "fees", extracted: { email: { value: "tutor9@example.invalid", confidence: 0.99 } } }), store });
    assert.equal(r.status, "NO_SAVE");
    assert.equal(state.updates.length, 0);
  });

  await check("save gate: disposable email rejected and logged", async () => {
    const { store, state } = fakeStore();
    const r = await applySaveGate({ phone: "919000000099", classification: c({ extracted: { email: { value: "abc@mailinator.com", confidence: 0.95 } } }), store });
    assert.equal(r.status, "REJECTED");
    assert.equal(state.updates.length, 0);
    assert.equal(state.rejects.length, 1);
    assert.equal(state.rejects[0].field, "email");
  });

  await check("save gate: low confidence needs confirmation and is logged", async () => {
    const { store, state } = fakeStore();
    const r = await applySaveGate({ phone: "919000000099", classification: c({ extracted: { name: { value: "Rohit", confidence: 0.5 } } }), store });
    assert.equal(r.status, "NEEDS_CONFIRMATION");
    assert.equal(state.updates.length, 0);
    assert.match(state.rejects[0].reason, /low_confidence/);
  });

  await check("save gate: never overwrites a valid value without explicit change", async () => {
    const { store, state } = fakeStore({ email: "old@example.invalid" });
    const r = await applySaveGate({ phone: "919000000099", classification: c({ extracted: { email: { value: "new@example.invalid", confidence: 0.95 } } }), store });
    assert.equal(r.status, "NEEDS_CONFIRMATION");
    assert.equal(state.updates.length, 0);
    const r2 = await applySaveGate({ phone: "919000000099", classification: c({ extracted: { email: { value: "new@example.invalid", confidence: 0.95 } } }), store, confirmedChange: true });
    assert.equal(r2.status, "SAVED");
    assert.equal(state.snapshot.email, "new@example.invalid");
  });

  await check("save gate: classes expand with Roman numerals", async () => {
    const { store, state } = fakeStore();
    const r = await applySaveGate({ phone: "919000000099", classification: c({ extracted: { classes_subjects: { value: "9 to 12 maths", confidence: 0.95 } } }), store });
    assert.equal(r.status, "SAVED");
    assert.deepEqual(state.updates[0].subjects, [
      "Mathematics for Class IX", "Mathematics for Class X", "Mathematics for Class XI", "Mathematics for Class XII",
    ]);
  });

  await check("save gate: city-only location rejected and logged", async () => {
    const { store, state } = fakeStore();
    const r = await applySaveGate({ phone: "919000000099", classification: c({ extracted: { location: { value: "Delhi", confidence: 0.95 } } }), store });
    assert.equal(r.status, "REJECTED");
    assert.equal(state.rejects[0].field, "area");
  });

  await check("Gemini-extracted email goes through validator before save", async () => {
    const r = await classify("abc@mailinator.com", { gemini: goodJson });
    assert.equal(r.extracted.email?.value, "tutor9@example.invalid");
    const { store } = fakeStore();
    const saved = await applySaveGate({ phone: "919000000099", classification: r, store });
    assert.equal(saved.status, "SAVED");
  });

  console.log(`\n${passed}/10 classifier/save-gate checks passed`);
  console.log("No Gemini call, DB write or WhatsApp send performed.");
})().catch((e) => { console.error("FAIL", e); process.exit(1); });
