/** PII masking tests — pure, no network. */
import assert from "node:assert/strict";
import { maskForExternal } from "../lib/whatsapp-bot/pipeline/pii";

let passed = 0;
function check(name: string, fn: () => void) { fn(); passed += 1; console.log(`  PASS: ${name}`); }

check("emails masked", () => {
  const out = maskForExternal("mail rohit@example.com and tutor@yahoo.co.in");
  assert.equal(out.includes("rohit@example.com"), false);
  assert.equal((out.match(/<EMAIL>/g) ?? []).length, 2);
});
check("phones masked", () => {
  const out = maskForExternal("Call 9876543210 or +91 98765 43210");
  assert.equal(out.includes("9876543210"), false);
  assert.equal(out.includes("<PHONE>"), true);
});
check("payment ids and UTR masked", () => {
  const out = maskForExternal("pay_U4Stg0IGzZSEsN utr 123456789012");
  assert.equal(out.includes("pay_"), false);
  assert.equal(out.includes("<PAYMENT_ID>"), true);
  assert.equal(out.includes("123456789012"), false);
});
console.log(`\n${passed}/3 PII masking checks passed`);
