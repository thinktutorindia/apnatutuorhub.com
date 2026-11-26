/**
 * Idempotency test: the verify route and the Razorpay webhook both delegate
 * coin credit to creditPlanCoinsIfAbsent(). Running both for the SAME payment
 * must produce exactly ONE credit of exactly 60 coins.
 *
 * Uses an in-memory fake transaction — no DB writes, no network, no sends.
 *
 * Run: node node_modules/tsx/dist/cli.mjs scripts/test-plan-credit-idempotency.ts
 */
import assert from "node:assert/strict";
import * as fs from "node:fs";

import { creditPlanCoinsIfAbsent } from "../lib/plan-credit";

function fakeTx() {
  const state = { balance: 0, transactions: [] as Array<{ referenceId: string; amount: number; type: string }> };
  const tx = {
    walletTransaction: {
      findFirst: async ({ where }: { where: { referenceId: string } }) =>
        state.transactions.find((t) => t.referenceId === where.referenceId) ?? null,
      create: async ({ data }: { data: { referenceId: string; amount: number; type: string } }) => {
        state.transactions.push(data);
        return data;
      },
    },
    wallet: {
      upsert: async ({ create, update }: { create: { balance: number }; update: { balance: { increment: number } } }) => {
        state.balance += update.balance.increment ?? create.balance;
        return { id: "wallet_test", balance: state.balance };
      },
    },
  };
  return { tx, state };
}

async function main() {
  const { tx, state } = fakeTx();
  const args = {
    tutorProfileId: "tutor_test",
    planId: "STARTER",
    paymentId: "pay_FAKE0000000001",
    planName: "Commission Based Plan",
  };

  // Path 1: /api/tutor/subscribe/verify
  const a = await creditPlanCoinsIfAbsent(tx as never, { ...args, source: "subscribe/verify" });
  // Path 2: /api/webhooks/razorpay — same payment, replayed
  const b = await creditPlanCoinsIfAbsent(tx as never, { ...args, source: "razorpay-webhook" });

  assert.equal(a.credited, 60, "first path must credit exactly 60");
  assert.equal(b.credited, 0, "second path must be a no-op");
  assert.equal(b.alreadyCredited, true);
  assert.equal(state.balance, 60, "wallet balance must be exactly 60");
  assert.equal(state.transactions.length, 1, "exactly one credit transaction");
  assert.equal(state.transactions[0]?.amount, 60);
  assert.equal(state.transactions[0]?.referenceId, "pay_FAKE0000000001");
  assert.equal(state.transactions[0]?.type, "PURCHASE");

  // Both live routes really call the shared helper.
  for (const file of [
    "app/api/tutor/subscribe/verify/route.ts",
    "app/api/webhooks/razorpay/route.ts",
    "app/actions/manual-payment.actions.ts",
  ]) {
    assert.match(fs.readFileSync(file, "utf8"), /creditPlanCoinsIfAbsent\(tx, \{/, `${file} must use the idempotent helper`);
  }

  console.log("PASS: verify + webhook replay => exactly 60 coins, 1 transaction");
  console.log("No DB write and no WhatsApp send performed.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error("FAIL", e); process.exit(1); });
