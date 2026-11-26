/**
 * SHADOW PIPELINE TESTS — prefilter, context helpers and language policy.
 * Pure checks only: no DB writes, no WhatsApp sends.
 *
 * Run: node node_modules/tsx/dist/cli.mjs scripts/test-pipeline-shadow.ts
 */
import assert from "node:assert/strict";
import * as fs from "node:fs";

import { evaluatePrefilter, rateLimitAllows } from "../lib/whatsapp-bot/pipeline/prefilter";
import {
  computeMissing,
  computeInvalid,
  windowExpiresAt,
  isWindowOpen,
  isPendingSoft,
  hoursSince,
} from "../lib/whatsapp-bot/pipeline/context";
import { detectLanguage, replyInLanguage } from "../lib/whatsapp-bot/pipeline/language";

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`  PASS: ${name}`);
}

const tests: Array<() => void> = [
  () => check("prefilter: reaction is silent", () => {
    assert.deepEqual(evaluatePrefilter({ text: "[reaction:👍]", messageType: "reaction" }), { decision: "SILENT", reason: "reaction" });
  }),
  () => check("prefilter: status event is silent", () => {
    assert.equal(evaluatePrefilter({ text: "[status:delivered]" }).reason, "status_event");
  }),
  () => check("prefilter: duplicate message id is silent", () => {
    const seen = new Set(["wamid.abc"]);
    assert.equal(evaluatePrefilter({ text: "hello", messageId: "wamid.abc", seenMessageIds: seen }).reason, "duplicate_message_id");
  }),
  () => check("prefilter: duplicate text is silent", () => {
    assert.equal(evaluatePrefilter({ text: "welcome", recentTexts: ["Welcome"] }).reason, "duplicate_text");
  }),
  () => check("prefilter: other business auto-reply is silent", () => {
    assert.equal(evaluatePrefilter({ text: "Thank you for contacting us, we will get back shortly." }).reason, "other_business_auto_reply");
  }),
  () => check("prefilter: quoted/forwarded alert text is silent", () => {
    assert.equal(evaluatePrefilter({ text: "[Tuition Enquiry #45341] Client: Mrs. Sharma Class: Class 5" }).reason, "quoted_alert");
  }),
  () => check("prefilter: opt-out words set flag", () => {
    const r = evaluatePrefilter({ text: "not interested" });
    assert.equal(r.decision, "SILENT");
    assert.equal(r.unsubscribed, true);
  }),
  () => check("prefilter: START re-subscribes", () => {
    assert.equal(evaluatePrefilter({ text: "START" }).reSubscribed, true);
  }),
  () => check("prefilter: bare ack silent only without pending question", () => {
    assert.equal(evaluatePrefilter({ text: "ok" }).reason, "bare_ack_no_pending");
    assert.equal(evaluatePrefilter({ text: "ok", hasPendingQuestion: true }).decision, "REPLY");
    assert.equal(evaluatePrefilter({ text: "1" }).decision, "REPLY", "bare digit must never be silenced");
  }),
  () => check("rate limit: max 5 replies / 10 min", () => {
    const now = new Date("2026-11-26T10:00:00Z");
    const counter = { windowStart: new Date("2026-11-26T09:55:00Z"), repliesInWindow: 5, lastReplyText: null, lastReplyTextCount: 0 };
    assert.equal(rateLimitAllows(counter, now).reason, "rate_limit_5_per_10min");
    assert.equal(rateLimitAllows({ ...counter, windowStart: new Date("2026-11-26T09:40:00Z") }, now).allowed, true);
  }),
  () => check("rate limit: max 2 identical replies in a row", () => {
    const now = new Date();
    const c = { windowStart: now, repliesInWindow: 2, lastReplyText: "Hi!", lastReplyTextCount: 2 };
    assert.equal(rateLimitAllows(c, now, "Hi!").reason, "repeat_text_limit");
    assert.equal(rateLimitAllows(c, now, "Hello").allowed, true);
  }),
  () => check("language: English in → English out", () => {
    assert.equal(detectLanguage("What is the fee?"), "EN");
    assert.match(replyInLanguage("What is the fee?", "fallback"), /^Sorry, I didn't get that/);
  }),
  () => check("language: Hinglish in → Hinglish out", () => {
    assert.equal(detectLanguage("aapki fees kya hai?"), "HINGLISH");
    assert.match(replyInLanguage("aapki fees kya hai?", "fallback"), /samajh nahi paya/);
    assert.match(replyInLanguage("batao lead kaise dekhe", "needEmail"), /bhejiye/);
  }),
  () => check("language: Hindi in → Hindi out", () => {
    assert.equal(detectLanguage("आपकी फी क्या है?"), "HI");
    assert.match(replyInLanguage("आपकी फी क्या है?", "needName"), /[\u0900-\u097F]/);
  }),
  () => check("context: missing and invalid fields computed from DB profile", () => {
    const missing = computeMissing({ name: null, email: "wa_919000000099@apnatutorhub.com", emailIsPlaceholder: true });
    assert.ok(missing.includes("name"));
    assert.ok(missing.includes("email"));
    assert.ok(missing.includes("location"));
    assert.ok(missing.includes("classes_subjects"));
    assert.deepEqual(computeInvalid({ email: "wa_x@apnatutorhub.com", emailIsPlaceholder: true }), ["email_placeholder"]);
  }),
  () => check("context: 24h window and 12h soft-pending rules", () => {
    const now = new Date("2026-11-26T12:00:00Z");
    const inbound = new Date("2026-11-25T14:00:00Z");
    assert.equal(windowExpiresAt(inbound)?.toISOString(), "2026-11-26T14:00:00.000Z");
    assert.equal(isWindowOpen(inbound, now), true);
    assert.equal(isWindowOpen(new Date("2026-11-25T10:00:00Z"), now), false);
    assert.equal(isPendingSoft(new Date("2026-11-25T23:00:00Z"), now), true);
    assert.equal(isPendingSoft(new Date("2026-11-26T11:00:00Z"), now), false);
    assert.equal(hoursSince(inbound, now), 22);
  }),
  () => check("shadow wiring: records outcome flag present, sender untouched", () => {
    const route = fs.readFileSync("app/api/webhooks/whatsapp/route.ts", "utf8");
    assert.match(route, /WA_PIPELINE_SHADOW/);
    assert.match(route, /recordOutcome\(/);
    for (const file of ["lib/whatsapp-bot/pipeline/prefilter.ts", "lib/whatsapp-bot/pipeline/context.ts", "lib/whatsapp-bot/pipeline/language.ts"]) {
      const src = fs.readFileSync(file, "utf8");
      assert.equal(/sendBotMessage|sendAquaWhatsAppMessage/.test(src), false, `${file} must never send`);
    }
  }),
];

for (const t of tests) t();
console.log(`\n${passed}/${tests.length} shadow pipeline checks passed`);
console.log("No DB write and no WhatsApp send performed.");
