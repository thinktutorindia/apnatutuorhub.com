/** Monitoring helpers — pure, no DB/network/sends. */
import assert from "node:assert/strict";
import { findStuckThreads, aggregateWeekly, type LogMessage } from "../lib/whatsapp-bot/pipeline/monitoring";

let passed = 0;
function check(name: string, fn: () => void) { fn(); passed += 1; console.log(`  PASS: ${name}`); }

const now = new Date("2026-11-26T12:00:00Z");
const ago = (min: number) => new Date(now.getTime() - min * 60000);
const m = (phone: string, direction: "INBOUND" | "OUTBOUND", body: string, min: number): LogMessage =>
  ({ phone, direction, body, createdAt: ago(min) });

const tests: Array<() => void> = [
  () => check("stuck: last inbound >30min with no reply is flagged", () => {
    const r = findStuckThreads([m("A", "INBOUND", "hello", 45)], now);
    assert.equal(r.length, 1);
    assert.equal(r[0].minutesWaiting, 45);
  }),
  () => check("stuck: replied thread is not flagged", () => {
    const r = findStuckThreads([m("A", "INBOUND", "hello", 45), m("A", "OUTBOUND", "Hi!", 40)], now);
    assert.equal(r.length, 0);
  }),
  () => check("stuck: reactions, opt-outs and intentional silence skipped", () => {
    const list = [m("A", "INBOUND", "[reaction:👍]", 90), m("B", "INBOUND", "STOP", 90), m("C", "INBOUND", "hello", 90)];
    const r = findStuckThreads(list, now, (p) => p === "C");
    assert.equal(r.length, 0);
  }),
  () => check("stuck: recent inbound (<30min) not flagged", () => {
    assert.equal(findStuckThreads([m("A", "INBOUND", "hello", 10)], now).length, 0);
  }),
  () => check("weekly: aggregates decisions, fallbacks, rejects and failures", () => {
    const r = aggregateWeekly({
      outcomes: [
        { decision: "REPLY", reason: null, fallbackUsed: false, channel: "TEXT", createdAt: now },
        { decision: "SILENT", reason: "rate_limit_5_per_10min", fallbackUsed: true, channel: null, createdAt: now },
        { decision: "SILENT", reason: "opt_out", fallbackUsed: false, channel: null, createdAt: now },
      ],
      rejectedSaves: [{ field: "email", reason: "blocked_domain", createdAt: now }],
      failedDeliveries: [{ reason: "131047", createdAt: now }],
    });
    assert.equal(r.outcomesByDecision.REPLY, 1);
    assert.equal(r.silentReasons.rate_limit_5_per_10min, 1);
    assert.equal(r.fallbackUsed, 1);
    assert.equal(r.rejectedSavesByField.email, 1);
    assert.equal(r.failedDeliveriesByReason["131047"], 1);
  }),
];

for (const t of tests) t();
console.log(`\n${passed}/${tests.length} monitoring checks passed`);
