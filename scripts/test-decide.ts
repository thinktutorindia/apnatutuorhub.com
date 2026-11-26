/**
 * Decide + compose tests. Pure, no DB/network/sends.
 * Run: node node_modules/tsx/dist/cli.mjs scripts/test-decide.ts
 */
import assert from "node:assert/strict";
import { decide } from "../lib/whatsapp-bot/pipeline/decide";
import { compose } from "../lib/whatsapp-bot/pipeline/compose";
import type { Classification } from "../lib/whatsapp-bot/pipeline/classifier";

let passed = 0;
function check(name: string, fn: () => void) { fn(); passed += 1; console.log(`  PASS: ${name}`); }

const c = (over: Partial<Classification> = {}): Classification => ({
  message_type: "QUESTION", intent: "fees", confidence: 0.9, extracted: {}, ...over,
});

const tests: Array<() => void> = [
  () => check("fee question answered FIRST, then ONE missing field", () => {
    const d = decide({ inbound: "what is the fee?", classification: c({ intent: "fees" }), missing: ["name", "email", "location", "classes_subjects"] });
    assert.match(d.reply, /Fees are fixed by class/);
    assert.match(d.reply, /full name/);
    assert.equal(d.reply.split("\n\n").length, 2, "exactly one answer + one question");
    assert.equal(d.askedField, "name");
    assert.equal(d.shouldRecordAsk, true);
  }),
  () => check("direct lead intent answered before onboarding", () => {
    const d = decide({ inbound: "show me leads", classification: c({ intent: "leads" }), missing: ["email"] });
    assert.match(d.reply, /apnatutorhub\.com\/tutor\/leads/);
    assert.match(d.reply, /valid email/);
  }),
  () => check("plans intent uses 60-coin wording", () => {
    const d = decide({ inbound: "plans please", classification: c({ intent: "plans" }), missing: [] });
    assert.match(d.reply, /60 coins/);
  }),
  () => check("ignored twice stops asking for 24h", () => {
    const askedAt = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const d = decide({ inbound: "ok", classification: c({ message_type: "CHITCHAT", intent: "other" }), missing: ["email"], askCount: 2, askedAt });
    assert.equal(d.askedField, undefined);
    assert.equal(d.shouldRecordAsk, false);
    assert.doesNotMatch(d.reply, /valid email/);
    const after24 = decide({ inbound: "ok", classification: c({ message_type: "CHITCHAT", intent: "other" }), missing: ["email"], askCount: 2, askedAt: new Date(Date.now() - 25 * 60 * 60 * 1000) });
    assert.equal(after24.askedField, "email");
  }),
  () => check("confirmation asks YES/NO and records no new field question", () => {
    const d = decide({ inbound: "new@example.invalid", classification: c({ message_type: "PROFILE_INFO", intent: "update" }), missing: [], confirmation: { field: "email", proposed: "new@example.invalid" } });
    assert.match(d.reply, /YES/);
    assert.equal(d.reply.includes("new@example.invalid"), false, "confirmation must not echo the full email");
    assert.match(d.reply, /\*\*\*\*@example\.invalid/);
    assert.deepEqual(d.quickReplies, ["YES", "NO"]);
    assert.equal(d.askedField, undefined);
  }),
  () => check("Hinglish in → Hinglish out", () => {
    const d = decide({ inbound: "fees kya hai?", classification: c({ intent: "fees" }), missing: ["email"] });
    assert.match(d.reply, /class ke hisaab se/);
    assert.match(d.reply, /valid email address bhejiye/);
  }),
  () => check("Hindi in → Hindi out", () => {
    const d = decide({ inbound: "फी क्या है?", classification: c({ intent: "fees" }), missing: ["email"] });
    assert.match(d.reply, /[\u0900-\u097F]/);
    assert.match(d.reply, /ईमेल/);
  }),
  () => check("broadcast 'interested' answers with lead info THEN asks one field", () => {
    const previous = "[Tuition Enquiry #45341]\nClass: Class 5 (All Subjects)\nStudent location: Jhandewalan, Delhi\nBudget: ₹6,400 – ₹6,550 / month";
    const d = decide({
      inbound: "I am interested",
      classification: c({ message_type: "CHITCHAT", intent: "interested" }),
      missing: ["email"],
      previousBotMessage: previous,
    });
    assert.match(d.reply, /#45341/);
    assert.match(d.reply, /Class 5/);
    assert.match(d.reply, /Jhandewalan/);
    assert.match(d.reply, /unlock/i);
    assert.match(d.reply, /valid email/);
    assert.equal(d.reply.indexOf("#45341") < d.reply.indexOf("valid email"), true, "answer must come before the question");
  }),
  () => check("compose produces one message with no empty parts", () => {
    assert.equal(compose("Answer.", "Question?"), "Answer.\n\nQuestion?");
    assert.equal(compose("Only answer."), "Only answer.");
  }),
];

for (const t of tests) t();
console.log(`\n${passed}/${tests.length} decide/compose checks passed`);
