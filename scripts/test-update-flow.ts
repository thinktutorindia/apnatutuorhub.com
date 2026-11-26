/**
 * Update flow + returning-user tests. Pure/injected, no DB/network/sends.
 * Run: node node_modules/tsx/dist/cli.mjs scripts/test-update-flow.ts
 */
import assert from "node:assert/strict";
import {
  isUpdateMenu, parseUpdateMenuPick, parseUpdateRequest, returningUserPrefix, composeReturningReply,
} from "../lib/whatsapp-bot/pipeline/update-flow";

let passed = 0;
async function check(name: string, fn: () => void | Promise<void>) {
  await fn(); passed += 1; console.log(`  PASS: ${name}`);
}

(async () => {
  await check("update menu recognized and picks map to fields", () => {
    assert.equal(isUpdateMenu("Update details"), true);
    assert.equal(parseUpdateMenuPick("2"), "email");
    assert.equal(parseUpdateMenuPick("location"), "location");
    assert.equal(parseUpdateMenuPick("9"), null);
  });

  await check("natural language area update uses same location validator + confirmation", async () => {
    const r = await parseUpdateRequest("change my area to Rohini, Delhi");
    assert.equal(r.kind, "CONFIRM");
    if (r.kind !== "CONFIRM") return;
    assert.equal(r.request.field, "location");
    assert.equal(r.request.proposed, "Rohini");
    assert.equal(r.request.needsConfirmation, true);
  });

  await check("invalid email update rejected before any save", async () => {
    const r = await parseUpdateRequest("change my email to abc@mailinator.com");
    assert.equal(r.kind, "INVALID");
    if (r.kind === "INVALID") assert.equal(r.field, "email");
  });

  await check("valid email update needs YES/NO confirmation", async () => {
    const r = await parseUpdateRequest("change my email to tutor9@example.invalid");
    assert.equal(r.kind, "CONFIRM");
    if (r.kind === "CONFIRM") assert.equal(r.request.proposed, "tutor9@example.invalid");
  });

  await check("bad name rejected; subjects use taxonomy", async () => {
    assert.equal((await parseUpdateRequest("change my name to honeyvats93")).kind, "INVALID");
    const s = await parseUpdateRequest("change my subjects to 9 to 12 maths");
    assert.equal(s.kind, "CONFIRM");
    if (s.kind === "CONFIRM") assert.match(s.request.proposed, /Mathematics for Class IX/);
  });

  await check("normal question is not treated as an update", async () => {
    assert.equal((await parseUpdateRequest("what is the fee?")).kind, "NO_UPDATE");
  });

  await check("returning user after 3 days gets one welcome-back line", () => {
    assert.equal(returningUserPrefix("leads", 72).length > 0, true);
    assert.equal(returningUserPrefix("leads", 1), "");
    const reply = composeReturningReply("leads", "Here are your leads.", 72, "Please share your email.");
    assert.equal(reply.split("\n\n").length, 3);
    assert.match(reply, /Welcome back/);
  });

  await check("returning-user line matches user language", () => {
    assert.match(returningUserPrefix("aapki fees kya hai", 72), /Wapas swagat/);
    assert.match(returningUserPrefix("फी क्या है?", 72), /[\u0900-\u097F]/);
  });

  console.log(`\n${passed}/8 update-flow checks passed`);
  console.log("No DB write and no WhatsApp send performed.");
})().catch((e) => { console.error("FAIL", e); process.exit(1); });
