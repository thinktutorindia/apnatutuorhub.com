/**
 * Outbound gate tests. Pure evaluator + source assertions. No DB/network/sends.
 * Run: node node_modules/tsx/dist/cli.mjs scripts/test-outbound-gate.ts
 */
import assert from "node:assert/strict";
import * as fs from "node:fs";
import { evaluateOutbound } from "../lib/whatsapp-bot/pipeline/outbound-gate";

let passed = 0;
function check(name: string, fn: () => void) { fn(); passed += 1; console.log(`  PASS: ${name}`); }

const now = new Date("2026-11-26T12:00:00Z");
const recent = new Date("2026-11-26T11:00:00Z");
const old = new Date("2026-11-25T08:00:00Z");

const tests: Array<() => void> = [
  () => check("opt-out blocks every mode", () => {
    for (const mode of ["text", "template", "image"] as const) {
      const d = evaluateOutbound({ unsubscribed: true, lastInboundAt: recent, now, mode });
      assert.equal(d.allowed, false);
      assert.equal(d.reason, "unsubscribed");
    }
  }),
  () => check("text inside 24h window is allowed", () => {
    const d = evaluateOutbound({ unsubscribed: false, lastInboundAt: recent, now, mode: "text" });
    assert.equal(d.allowed, true);
    assert.equal(d.mode, "text");
  }),
  () => check("text outside 24h window switches to approved template", () => {
    const d = evaluateOutbound({ unsubscribed: false, lastInboundAt: old, now, mode: "text" });
    assert.equal(d.allowed, true);
    assert.equal(d.mode, "template");
    assert.equal(d.reason, "24h_window_expired_use_template");
  }),
  () => check("template remains allowed outside window", () => {
    const d = evaluateOutbound({ unsubscribed: false, lastInboundAt: old, now, mode: "template" });
    assert.equal(d.allowed, true);
    assert.equal(d.mode, "template");
  }),
  () => check("no inbound history forces template-only", () => {
    const d = evaluateOutbound({ unsubscribed: false, lastInboundAt: null, now, mode: "text" });
    assert.equal(d.mode, "template");
  }),
  () => check("low-level sender consults gate; only replies bypass", () => {
    const sender = fs.readFileSync("lib/aqua-whatsapp.ts", "utf8");
    assert.match(sender, /canSendWhatsApp\(to, input\.mode\)/);
    assert.match(sender, /bypassOutboundGate/);
    const bot = fs.readFileSync("lib/whatsapp-bot/sender.ts", "utf8");
    assert.match(bot, /bypassOutboundGate: true/);
    const staff = fs.readFileSync("app/actions/whatsapp-chat.actions.ts", "utf8");
    assert.match(staff, /bypassOutboundGate: true/);
  }),
];

for (const t of tests) t();
console.log(`\n${passed}/${tests.length} outbound-gate checks passed`);
console.log("No DB write and no WhatsApp send performed.");
