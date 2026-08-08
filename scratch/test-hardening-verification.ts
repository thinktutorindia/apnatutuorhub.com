/**
 * scratch/test-hardening-verification.ts
 * Final Hardening Verification & Failure Injection Suite
 *
 * Tests:
 * 1. Clean Staging 50-Concurrent Distributed Writes (Reproducibility)
 * 2. Hot-Wallet Test with Sufficient Balance (50 requests on balance = 5000)
 * 3. Transaction Rollback Verification (Failure Injection)
 */

import { prisma } from "../lib/prisma";

function getMetrics(latencies: number[]) {
  if (latencies.length === 0) return { min: 0, max: 0, mean: 0, p50: 0, p95: 0, p99: 0 };
  const sorted = [...latencies].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, val) => acc + val, 0);
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean: Math.round(sum / sorted.length),
    p50: sorted[Math.floor(sorted.length * 0.5)] ?? 0,
    p95: sorted[Math.floor(sorted.length * 0.95)] ?? 0,
    p99: sorted[Math.floor(sorted.length * 0.99)] ?? 0,
  };
}

async function runHardeningVerification() {
  console.log("==================================================");
  console.log("    FINAL HARDENING VERIFICATION & TEST SUITE");
  console.log("==================================================");

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 1: REPRODUCIBILITY TEST — 50 Concurrent Distributed Writes
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n[STEP 1] 50 Concurrent Distributed Writes (Clean Staging State):");

  const distUsers = await Promise.all(
    Array.from({ length: 50 }).map(async (_, idx) => {
      const u = await prisma.user.create({
        data: {
          email: `repro_user_${idx}_${Date.now()}@example.com`,
          name: `Repro User ${idx}`,
          role: "TUTOR",
          tutorProfile: {
            create: {
              kycStatus: "APPROVED",
              wallet: { create: { balance: 100 } },
            },
          },
        },
        include: { tutorProfile: { include: { wallet: true } } },
      });
      return u.tutorProfile!;
    })
  );

  const distLatencies: number[] = [];
  const startDist = Date.now();

  const distTasks = distUsers.map(async (tutorProfile, idx) => {
    const t0 = Date.now();
    try {
      await prisma.$transaction(async (tx) => {
        const updated = await tx.wallet.updateMany({
          where: { tutorProfileId: tutorProfile.id, balance: { gte: 20 } },
          data: { balance: { decrement: 20 }, totalSpent: { increment: 20 } },
        });

        if (updated.count === 0) throw new Error("INSUFFICIENT_BALANCE");

        await tx.walletTransaction.create({
          data: {
            walletId: tutorProfile.wallet!.id,
            type: "DEDUCTION",
            amount: 20,
            balanceAfter: 80,
            referenceId: `repro_tx_${idx}_${Date.now()}`,
          },
        });
      }, { timeout: 15000, maxWait: 10000 });

      distLatencies.push(Date.now() - t0);
      return { success: true, error: null };
    } catch (err: unknown) {
      distLatencies.push(Date.now() - t0);
      const e = err as Error;
      return { success: false, error: e.message };
    }
  });

  const distResults = await Promise.all(distTasks);
  const distDuration = Date.now() - startDist;
  const distSuccess = distResults.filter((r) => r.success).length;
  const distFail = distResults.filter((r) => !r.success).length;
  const distMetrics = getMetrics(distLatencies);

  console.log(`Duration         : ${distDuration} ms`);
  console.log(`Throughput       : ${(50 / (distDuration / 1000)).toFixed(2)} req/sec`);
  console.log(`Successes        : ${distSuccess} / 50 (${((distSuccess / 50) * 100).toFixed(1)}%)`);
  console.log(`Failures         : ${distFail}`);
  console.log(`P50 Latency      : ${distMetrics.p50} ms`);
  console.log(`P95 Latency      : ${distMetrics.p95} ms`);
  console.log(`P99 Latency      : ${distMetrics.p99} ms`);

  // Cleanup distUsers
  for (const t of distUsers) {
    await prisma.walletTransaction.deleteMany({ where: { walletId: t.wallet!.id } });
    await prisma.user.delete({ where: { id: t.userId } });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 2: HOT WALLET SUFFICIENT BALANCE TEST (50 requests on balance = 5000)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n[STEP 2] Hot Wallet Test (50 Requests on Balance = 5000):");

  const hotUser = await prisma.user.create({
    data: {
      email: `hot_suff_${Date.now()}@example.com`,
      name: "Hot Wallet Large Balance",
      role: "TUTOR",
      tutorProfile: {
        create: {
          kycStatus: "APPROVED",
          wallet: { create: { balance: 5000 } },
        },
      },
    },
    include: { tutorProfile: { include: { wallet: true } } },
  });

  const hotTutorId = hotUser.tutorProfile!.id;
  const hotWalletId = hotUser.tutorProfile!.wallet!.id;

  const hotLatencies: number[] = [];
  const errorBreakdown: Record<string, number> = {};
  const startHot = Date.now();

  const hotTasks = Array.from({ length: 50 }).map(async (_, idx) => {
    const t0 = Date.now();
    try {
      await prisma.$transaction(async (tx) => {
        const updated = await tx.wallet.updateMany({
          where: { tutorProfileId: hotTutorId, balance: { gte: 20 } },
          data: { balance: { decrement: 20 }, totalSpent: { increment: 20 } },
        });

        if (updated.count === 0) throw new Error("INSUFFICIENT_BALANCE");

        await tx.walletTransaction.create({
          data: {
            walletId: hotWalletId,
            type: "DEDUCTION",
            amount: 20,
            balanceAfter: 5000 - (idx + 1) * 20,
            referenceId: `hot_suff_tx_${idx}_${Date.now()}`,
          },
        });
      }, { timeout: 20000, maxWait: 15000 });

      hotLatencies.push(Date.now() - t0);
      return { success: true };
    } catch (err: unknown) {
      hotLatencies.push(Date.now() - t0);
      const e = err as Error;
      const key = e.message.includes("Transaction already closed")
        ? "Transaction Timeout (>20s)"
        : e.message.includes("connection pool")
        ? "Connection Pool Timeout"
        : e.message;
      errorBreakdown[key] = (errorBreakdown[key] || 0) + 1;
      return { success: false, error: e.message };
    }
  });

  const hotResults = await Promise.all(hotTasks);
  const hotDuration = Date.now() - startHot;
  const hotSuccess = hotResults.filter((r) => r.success).length;
  const hotFail = hotResults.filter((r) => !r.success).length;
  const hotMetrics = getMetrics(hotLatencies);

  const finalHotWallet = await prisma.wallet.findUniqueOrThrow({ where: { tutorProfileId: hotTutorId } });

  console.log(`Duration         : ${hotDuration} ms`);
  console.log(`Throughput       : ${(50 / (hotDuration / 1000)).toFixed(2)} req/sec`);
  console.log(`Successes        : ${hotSuccess} / 50`);
  console.log(`Failures         : ${hotFail}`);
  console.log(`Error Breakdown  :`, JSON.stringify(errorBreakdown));
  console.log(`Final Balance    : ${finalHotWallet.balance} (Expected ${5000 - hotSuccess * 20})`);
  console.log(`P50 Latency      : ${hotMetrics.p50} ms`);
  console.log(`P95 Latency      : ${hotMetrics.p95} ms`);

  // Cleanup Hot User
  await prisma.walletTransaction.deleteMany({ where: { walletId: hotWalletId } });
  await prisma.user.delete({ where: { id: hotUser.id } });

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 3: TRANSACTION ROLLBACK FAILURE INJECTION TESTS
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n[STEP 3] Transaction Rollback Verification (Failure Injection):");

  const rollbackUser = await prisma.user.create({
    data: {
      email: `rollback_user_${Date.now()}@example.com`,
      name: "Rollback Test User",
      role: "TUTOR",
      tutorProfile: {
        create: {
          kycStatus: "APPROVED",
          wallet: { create: { balance: 100 } },
        },
      },
    },
    include: { tutorProfile: { include: { wallet: true } } },
  });

  const rbTutorId = rollbackUser.tutorProfile!.id;
  const rbWalletId = rollbackUser.tutorProfile!.wallet!.id;

  // Test Case 1: Wallet update succeeds, subsequent statement fails -> Verify wallet rolls back
  console.log("-> Test 3.1: Wallet update succeeds, injected error follows...");
  try {
    await prisma.$transaction(async (tx) => {
      await tx.wallet.updateMany({
        where: { tutorProfileId: rbTutorId },
        data: { balance: { decrement: 20 } },
      });

      // Inject simulated failure
      throw new Error("SIMULATED_FAILURE_INJECTION");
    });
  } catch (err: any) {
    console.log("   Caught expected failure:", err.message);
  }

  const walletAfterRollback1 = await prisma.wallet.findUniqueOrThrow({ where: { tutorProfileId: rbTutorId } });
  console.log("   Wallet balance after rollback:", walletAfterRollback1.balance, "(Expected 100)");
  const test1Pass = walletAfterRollback1.balance === 100;
  console.log("   Result 3.1:", test1Pass ? "PASS (Wallet rolled back perfectly)" : "FAIL");

  // Cleanup Rollback User
  await prisma.walletTransaction.deleteMany({ where: { walletId: rbWalletId } });
  await prisma.user.delete({ where: { id: rollbackUser.id } });

  console.log("\n==================================================");
  console.log("   HARDENING VERIFICATION SUITE COMPLETE");
  console.log("==================================================");
}

runHardeningVerification().catch(console.error);
