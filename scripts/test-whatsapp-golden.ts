/**
 * scripts/test-whatsapp-golden.ts
 *
 * GOLDEN / CHARACTERISATION TESTS — frozen BEFORE the modular rewrite.
 * Purpose: prove that behaviour we must KEEP (plans, coins, payment link,
 * default password, MANUAL RESET, STOP/START, CRM tagging) is unchanged by
 * each strangler step.
 *
 * HARD RULE: this file never sends a WhatsApp message and never writes to the
 * database. processMessage() performs a read-only profile lookup (same as the
 * existing test-whatsapp-bot.ts suite). No live API calls, no --live flag.
 *
 * A "GAP" is a deliberately recorded mismatch between the CODE and the agreed
 * business rule. It does not fail the suite; it prints the actual value so the
 * rewrite can close it. Search for `gap(` to find all of them.
 *
 * Run: node node_modules/tsx/dist/cli.mjs scripts/test-whatsapp-golden.ts
 */

import assert from "node:assert/strict";
import * as fs from "node:fs";

import {
  GROWTH_PLAN_COINS,
  GROWTH_PLAN_PRICE_INR,
  SUBSCRIPTION_PLANS,
  TOTAL_PLAN_LEAD_POINTS,
  getLeadPointCost,
  getPlanTotalPoints,
} from "../lib/subscription-plans";
import {
  asksCommissionPlan,
  asksPlanPaymentOrQr,
  asksZeroCommissionPlan,
  blocksPaymentQrInChat,
  paymentPlanHint,
} from "../lib/whatsapp-bot/plan-intent";
import { paymentQrImage } from "../lib/whatsapp-bot/engine";
import { isPositiveInterest } from "../lib/whatsapp-interest-sync";
import { processMessage } from "../lib/whatsapp-bot/engine";
import type { BotSession } from "../lib/whatsapp-bot/session";

const ROOT = process.cwd();
const read = (p: string) => fs.readFileSync(`${ROOT}/${p}`, "utf8");

let passed = 0;
let gaps = 0;

type Ctx = { name: string };

function test(name: string, fn: (ctx: Ctx) => void | Promise<void>) {
  return async () => {
    const ctx: Ctx = { name };
    await fn(ctx);
    passed += 1;
    console.log(`  PASS: ${name}`);
  };
}

/** Records a known code-vs-rule mismatch without failing the suite. */
function gap(name: string, actual: unknown, expected: unknown, detail: string) {
  return async () => {
    gaps += 1;
    console.log(`  GAP:  ${name}`);
    console.log(`          expected: ${JSON.stringify(expected)}`);
    console.log(`          actual:   ${JSON.stringify(actual)}`);
    console.log(`          ${detail}`);
  };
}

function makeSession(overrides: Partial<BotSession> = {}): BotSession {
  return {
    id: "golden-session",
    phone: "919000000099",
    userType: "TUTOR",
    step: "DONE",
    data: { lang: "en", _registered: true, name: "Test Tutor" },
    retries: 0,
    isIdle: false,
    ...overrides,
  };
}

async function replyFor(text: string, overrides: Partial<BotSession> = {}) {
  return processMessage(makeSession(overrides), text, { useAi: false, chatHistory: [] });
}

const tests: Array<() => Promise<void>> = [
  // ── 1. COINS ───────────────────────────────────────────────────────────────
  test("coins: Class 1-8 = 10, 9-10 = 20, 11-12/entrance = 30 (budget ignored)", () => {
    assert.equal(getLeadPointCost("Class 1", 5000, 6000), 10);
    assert.equal(getLeadPointCost("Class 5", 1000, 2000), 10);
    assert.equal(getLeadPointCost("Class 8"), 10);
    assert.equal(getLeadPointCost("Class 9", 50_000, 60_000), 20);
    assert.equal(getLeadPointCost("Class 10"), 20);
    assert.equal(getLeadPointCost("Class 11", 0, 0), 30);
    assert.equal(getLeadPointCost("Class 12"), 30);
    assert.equal(getLeadPointCost("JEE / Entrance"), 30);
    assert.equal(getLeadPointCost("NEET"), 30);
  }),

  test("coins: published plan constants are 60", () => {
    assert.equal(TOTAL_PLAN_LEAD_POINTS, 60);
    assert.equal(GROWTH_PLAN_COINS, 60);
    assert.equal(GROWTH_PLAN_PRICE_INR, 2999);
    assert.equal(getPlanTotalPoints(), 60);
    assert.equal(getPlanTotalPoints("BRONZE"), 60);
  }),

  gap(
    "coins: ₹1,257 STARTER must credit 60 coins",
    { getPlanTotalPoints_STARTER: getPlanTotalPoints("STARTER"), walletBonus: 0 },
    { getPlanTotalPoints_STARTER: 60, walletBonus: 60 },
    "subscription-plans.ts:27 returns 50; subscribe/verify/route.ts:138 credits STARTER 0 bonus coins. Rule says 60."
  ),

  test("coins: plan prices and commission note frozen", () => {
    assert.equal(SUBSCRIPTION_PLANS.STARTER.priceInr, 1257);
    assert.match(SUBSCRIPTION_PLANS.STARTER.commissionNote ?? "", /50%.+5%/);
    assert.equal(SUBSCRIPTION_PLANS.BRONZE.priceInr, 2999);
  }),

  // ── 2. PLANS ───────────────────────────────────────────────────────────────
  test("plans: commission and zero-commission intents never cross-match", () => {
    assert.equal(asksCommissionPlan("1257 commission plan"), true);
    assert.equal(asksCommissionPlan("commission wala plan"), true);
    assert.equal(asksZeroCommissionPlan("no commission plan"), true);
    assert.equal(asksZeroCommissionPlan("silver plan"), true);
    assert.equal(asksCommissionPlan("no commission plan"), false, "zero commission must win");
    assert.equal(asksZeroCommissionPlan("1257 plan"), false);
    assert.equal(paymentPlanHint("activate 1257"), "1257");
    assert.equal(paymentPlanHint("2999 zero commission"), "2999");
    assert.equal(paymentPlanHint("plan"), "any");
  }),

  // ── 3. PAYMENT LINK ────────────────────────────────────────────────────────
  test("payment: no QR image is sent; 1-click Razorpay link is the contract", () => {
    assert.deepEqual(paymentQrImage(), {});
    assert.equal(asksPlanPaymentOrQr("send payment link"), true);
    assert.equal(asksPlanPaymentOrQr("qr bhejo"), true);
    assert.equal(asksPlanPaymentOrQr("I am ready to pay"), true);
    assert.equal(asksPlanPaymentOrQr("pehle demo, payment nahi"), false);
    assert.equal(blocksPaymentQrInChat("STOP"), true);
    assert.equal(blocksPaymentQrInChat("not interested"), true);

    const route = read("app/api/webhooks/whatsapp/route.ts");
    assert.match(route, /https:\/\/apnatutorhub\.com\/tutor\/plans\?checkout=STARTER/);
    assert.match(route, /imageUrls: undefined/);
  }),

  test("payment: engine answers a payment question with the checkout link", async () => {
    const r = await replyFor("send me the payment link");
    assert.ok(r.reply?.includes("checkout=STARTER"), `expected checkout link, got: ${r.reply?.slice(0, 200)}`);
    assert.deepEqual(r.imageUrls, undefined);
  }),

  // ── 4. DEFAULT PASSWORD + MANUAL RESET ─────────────────────────────────────
  test("password: default + temporary password constants frozen", () => {
    const register = read("lib/whatsapp-bot/auto-register.ts");
    const engine = read("lib/whatsapp-bot/engine.ts");
    assert.match(register, /bcrypt\.hash\("12345678", 10\)/);
    assert.match(engine, /const tempPass = "Tutor@123"/);
  }),

  test("MANUAL RESET: password question gives reset guidance, never the password", async () => {
    const r = await replyFor("I want to reset my password");
    assert.match(r.reply ?? "", /Forgot Password/);
    assert.match(r.reply ?? "", /apnatutorhub\.com\/login/);
    assert.match(r.reply ?? "", /MANUAL RESET/);
    assert.equal(r.reply?.includes("Tutor@123"), false, "guidance must not leak the temp password");
    assert.ok(r.quickReplies?.some((q) => q.includes("MANUAL RESET")));
  }),

  test("default password: no chat reply contains the default password 12345678", async () => {
    for (const text of ["hi", "my profile", "how do plans work"]) {
      const r = await replyFor(text);
      assert.equal(r.reply?.includes("12345678"), false, `leaked default password for: ${text}`);
    }
  }),

  // ── 5. STOP / START ────────────────────────────────────────────────────────
  test("STOP: opts out, one confirmation, tells user to reply START", async () => {
    const r = await replyFor("STOP");
    assert.match(r.reply ?? "", /unsubscribed/i);
    assert.match(r.reply ?? "", /\*START\*/);
    assert.equal((r.updatedData as Record<string, unknown>)?.unsubscribed, true);
    assert.ok(r.quickReplies?.some((q) => /START/i.test(q)));
  }),

  test("STOP: quoted broadcast footer is NOT an opt-out", async () => {
    const r = await replyFor("(Reply STOP to Unsubscribe)");
    assert.notEqual((r.updatedData as Record<string, unknown>)?.unsubscribed, true);
    assert.doesNotMatch(r.reply ?? "", /unsubscribed from automated/i);
  }),

  test("START: re-subscribes a previously opted-out registered user", async () => {
    const r = await replyFor("START", { data: { lang: "en", _registered: true, unsubscribed: true, name: "Test Tutor" } });
    assert.notEqual((r.updatedData as Record<string, unknown>)?.unsubscribed, true);
    assert.match(r.reply ?? "", /Hello|Priya/i);
  }),

  test("bare 1 / 2 in DONE or WELCOME always produces a valid reply", async () => {
    for (const step of ["DONE", "WELCOME"]) {
      for (const digit of ["1", "2"]) {
        const r = await replyFor(digit, { step, data: { lang: "en" } });
        assert.ok((r.reply ?? "").length > 10, `silent for "${digit}" in ${step}`);
        assert.equal(r.userType, digit === "1" ? "TUTOR" : "PARENT");
      }
    }
  }),

  // ── 6. CRM TAGGING ─────────────────────────────────────────────────────────
  test("CRM: interest classifier tags positives, never opt-outs or blank", () => {
    assert.equal(isPositiveInterest("yes"), true);
    assert.equal(isPositiveInterest("ok"), true);
    assert.equal(isPositiveInterest("1"), true);
    assert.equal(isPositiveInterest("I am interested, please send leads"), true);
    assert.equal(isPositiveInterest("STOP"), false);
    assert.equal(isPositiveInterest("not interested"), false);
    assert.equal(isPositiveInterest(""), false);

    const route = read("app/api/webhooks/whatsapp/route.ts");
    assert.match(route, /if \(isPositiveInterest\(text\)\)/);
    assert.match(route, /autoTagWhatsAppInterest\(\{/);
  }),

  // ── 7. LANGUAGE BASELINE (pre-rewrite, English input) ──────────────────────
  test("language baseline: English input produces English reply", async () => {
    const r = await replyFor("how do plans and fees work?");
    assert.equal(/[\u0900-\u097F]/.test(r.reply ?? ""), false);
    assert.ok((r.reply ?? "").length > 0);
  }),

  // ── 8. ONE-REPLY INVARIANT / FUZZ ──────────────────────────────────────────
  test("fuzz: every input yields exactly one text reply or deliberate silence", async () => {
    const inputs = [
      "", "   ", "👍", "asdfqwerty", "😀😀😀", "?", "hello", "1", "2",
      "STOP", "need help with password", "a".repeat(4000), "class 5 all subjects rohini delhi",
      " biology 10 to 12, 1-5 all sub. ", "reply STOP to unsubscribe",
    ];
    for (const text of inputs) {
      for (const step of ["WELCOME", "DONE"]) {
        const r = await replyFor(text, { step, data: { lang: "en" } });
        assert.equal(typeof r.reply, "string", `no reply field for ${JSON.stringify(text.slice(0, 20))}`);
        assert.ok(!r.imageUrls?.length, `more than one outbound artefact for ${JSON.stringify(text.slice(0, 20))}`);
      }
    }
  }),
];

async function run() {
  for (const t of tests) await t();
  console.log(`\n${passed}/${tests.length} golden checks passed · ${gaps} known gap(s) recorded`);
  console.log("No WhatsApp message was sent and no DB write was performed by this suite.");
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\nGOLDEN FAILURE:", err);
    process.exit(1);
  });
