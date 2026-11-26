/** Cutover decoder tests — pure, no env changes, no DB/network/sends. */
import assert from "node:assert/strict";
import { parseCutoverMode, parseAllowlist, useNewPipeline } from "../lib/whatsapp-bot/pipeline/cutover";

let passed = 0;
function check(name: string, fn: () => void) { fn(); passed += 1; console.log(`  PASS: ${name}`); }

const tests: Array<() => void> = [
  () => check("unknown/unset mode is OFF", () => {
    assert.equal(parseCutoverMode(), "OFF");
    assert.equal(parseCutoverMode("garbage"), "OFF");
    assert.equal(parseCutoverMode("p50"), "P50");
  }),
  () => check("OFF blocks everyone, including allowlist", () => {
    const allow = parseAllowlist("+91 90000 00001, 9000000002");
    assert.equal(useNewPipeline({ mode: "OFF", phone: "919000000001", allowlist: allow }), false);
  }),
  () => check("STAFF only allows the allowlist", () => {
    const allow = parseAllowlist("9000000001");
    assert.equal(useNewPipeline({ mode: "STAFF", phone: "919000000001", allowlist: allow }), true);
    assert.equal(useNewPipeline({ mode: "STAFF", phone: "919000000002", allowlist: allow }), false);
  }),
  () => check("NEW only allows unregistered users", () => {
    assert.equal(useNewPipeline({ mode: "NEW", phone: "919000000001", isRegistered: false }), true);
    assert.equal(useNewPipeline({ mode: "NEW", phone: "919000000001", isRegistered: true }), false);
  }),
  () => check("percentage buckets are deterministic and monotonic", () => {
    const p10 = useNewPipeline({ mode: "P10", phone: "919000000001" });
    const p50 = useNewPipeline({ mode: "P50", phone: "919000000001" });
    const p100 = useNewPipeline({ mode: "P100", phone: "919000000001" });
    assert.equal(p100, true);
    if (p10) assert.equal(p50, true);
    assert.equal(useNewPipeline({ mode: "P10", phone: "919000000001" }), p10);
  }),
];

for (const t of tests) t();
console.log(`\n${passed}/${tests.length} cutover checks passed`);
console.log("No env var changed, no DB write, no WhatsApp send performed.");
