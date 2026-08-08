/**
 * scratch/test-bottleneck-analysis.ts
 * Rigorous Database Bottleneck & Latency Benchmark
 *
 * Tests TWO distinct scenarios:
 * TEST A — HOT ROW / SAME WALLET: 50 simultaneous purchases against 1 wallet (Row Lock Contention)
 * TEST B — DISTRIBUTED WORKLOAD: 10, 50, 100, 250 simultaneous purchases across 10/50/100/250 distinct wallets & leads
 */

import { prisma } from "../lib/prisma";

function getPercentiles(latencies: number[]) {
  if (latencies.length === 0) return { min: 0, max: 0, mean: 0, p50: 0, p95: 0, p99: 0 };
  const sorted = [...latencies].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, val) => acc + val, 0);
  const mean = Math.round(sum / sorted.length);
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean,
    p50: sorted[Math.floor(sorted.length * 0.5)] ?? 0,
    p95: sorted[Math.floor(sorted.length * 0.95)] ?? 0,
    p99: sorted[Math.floor(sorted.length * 0.99)] ?? 0,
  };
}

async function runBottleneckAnalysis() {
  console.log("==================================================");
  console.log("    DATABASE BOTTLENECK & CAPACITY BENCHMARK");
  console.log("==================================================");

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST A: HOT ROW / SAME WALLET CONTENTION (50 requests against 1 wallet)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n--- TEST A: HOT ROW CONTENTION (50 Requests on 1 Single Wallet) ---");

  const hotUser = await prisma.user.create({
    data: {
      email: `hot_wallet_${Date.now()}@example.com`,
      name: "Hot Wallet User",
      role: "TUTOR",
      tutorProfile: {
        create: {
          kycStatus: "APPROVED",
          isVerified: true,
          wallet: { create: { balance: 2000, totalPurchased: 2000 } },
        },
      },
    },
    include: { tutorProfile: { include: { wallet: true } } },
  });

  const hotTutorId = hotUser.tutorProfile!.id;
  const hotWalletId = hotUser.tutorProfile!.wallet!.id;

  const hotLatencies: number[] = [];
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
            balanceAfter: 2000 - (idx + 1) * 20,
            referenceId: `hot_tx_${idx}_${Date.now()}`,
          },
        });
      }, { timeout: 15000, maxWait: 10000 });

      hotLatencies.push(Date.now() - t0);
      return { success: true };
    } catch (err: unknown) {
      hotLatencies.push(Date.now() - t0);
      const e = err as Error;
      return { success: false, error: e.message };
    }
  });

  const hotResults = await Promise.all(hotTasks);
  const hotDuration = Date.now() - startHot;
  const hotSuccess = hotResults.filter((r) => r.success).length;
  const hotFail = hotResults.filter((r) => !r.success).length;
  const hotMetrics = getPercentiles(hotLatencies);

  const finalHotWallet = await prisma.wallet.findUniqueOrThrow({ where: { tutorProfileId: hotTutorId } });

  console.log(`Duration         : ${hotDuration} ms`);
  console.log(`Throughput       : ${(50 / (hotDuration / 1000)).toFixed(2)} req/sec`);
  console.log(`Successes        : ${hotSuccess}`);
  console.log(`Failures         : ${hotFail}`);
  console.log(`Final Balance    : ${finalHotWallet.balance} (Expected ${2000 - hotSuccess * 20})`);
  console.log(`P50 Latency      : ${hotMetrics.p50} ms`);
  console.log(`P95 Latency      : ${hotMetrics.p95} ms`);
  console.log(`P99 Latency      : ${hotMetrics.p99} ms`);

  // Cleanup Hot User
  await prisma.walletTransaction.deleteMany({ where: { walletId: hotWalletId } });
  await prisma.user.delete({ where: { id: hotUser.id } });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST B: DISTRIBUTED WORKLOAD (10, 50, 100, 250 requests across N distinct wallets)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n--- TEST B: DISTRIBUTED WORKLOAD (Distinct Wallets & Leads) ---");

  const distLevels = [10, 50, 100, 250];

  for (const level of distLevels) {
    // Provision `level` unique users
    const users = await Promise.all(
      Array.from({ length: level }).map(async (_, idx) => {
        const u = await prisma.user.create({
          data: {
            email: `dist_user_${level}_${idx}_${Date.now()}@example.com`,
            name: `Dist User ${idx}`,
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

    const distTasks = users.map(async (tutorProfile, idx) => {
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
              referenceId: `dist_tx_${level}_${idx}_${Date.now()}`,
            },
          });
        }, { timeout: 15000, maxWait: 10000 });

        distLatencies.push(Date.now() - t0);
        return { success: true };
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
    const distMetrics = getPercentiles(distLatencies);

    console.log(`\n[Distributed ${level} Concurrent Users]`);
    console.log(`Duration         : ${distDuration} ms`);
    console.log(`Throughput       : ${(level / (distDuration / 1000)).toFixed(2)} req/sec`);
    console.log(`Successes        : ${distSuccess} / ${level} (${((distSuccess / level) * 100).toFixed(1)}%)`);
    console.log(`Failures         : ${distFail}`);
    console.log(`P50 Latency      : ${distMetrics.p50} ms`);
    console.log(`P95 Latency      : ${distMetrics.p95} ms`);
    console.log(`P99 Latency      : ${distMetrics.p99} ms`);

    // Cleanup distributed users
    for (const tutor of users) {
      await prisma.walletTransaction.deleteMany({ where: { walletId: tutor.wallet!.id } });
      await prisma.user.delete({ where: { id: tutor.userId } });
    }
  }

  console.log("\n==================================================");
  console.log("   BOTTLENECK BENCHMARK COMPLETE");
  console.log("==================================================");
}

runBottleneckAnalysis().catch(console.error);
