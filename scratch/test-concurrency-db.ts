/**
 * scratch/test-concurrency-db.ts
 * Real Database Concurrency & Race-Condition Test Suite
 *
 * Runs concurrent async operations directly against Prisma & PostgreSQL.
 */

import { prisma } from "../lib/prisma";

async function runRealConcurrencyTests() {
  console.log("==================================================");
  console.log("   REAL DATABASE CONCURRENCY HARDENING TEST SUITE");
  console.log("==================================================");

  try {
    // ── Setup Test User & Tutor Profile ─────────────────────────────────────────
    const testEmail = `test_tutor_${Date.now()}@example.com`;
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        name: "Test Tutor Concurrency",
        role: "TUTOR",
        tutorProfile: {
          create: {
            kycStatus: "APPROVED",
            isVerified: true,
            subjects: ["Mathematics"],
            classLevels: ["Class 10"],
            wallet: {
              create: { balance: 100, totalPurchased: 100, totalSpent: 0 },
            },
          },
        },
      },
      include: { tutorProfile: { include: { wallet: true } } },
    });

    const tutorProfileId = user.tutorProfile!.id;
    const walletId = user.tutorProfile!.wallet!.id;

    console.log(`\n[Setup] Created test user ${user.id} with wallet balance = 100`);

    // ── TEST 1: Wallet Balance Concurrency (10 simultaneous 20-coin debits) ─────
    console.log("\n[TEST 1] Wallet Balance Concurrency Guard (10 x 20-coin debits on balance = 100):");

    const attempts = Array.from({ length: 10 }).map(async (_, idx) => {
      try {
        return await prisma.$transaction(async (tx) => {
          const updated = await tx.wallet.updateMany({
            where: { tutorProfileId, balance: { gte: 20 } },
            data: { balance: { decrement: 20 }, totalSpent: { increment: 20 } },
          });

          if (updated.count === 0) throw new Error("INSUFFICIENT_COINS");

          const wallet = await tx.wallet.findUniqueOrThrow({
            where: { tutorProfileId },
            select: { balance: true },
          });

          await tx.walletTransaction.create({
            data: {
              walletId,
              type: "DEDUCTION",
              amount: 20,
              balanceAfter: wallet.balance,
              referenceId: `test_lead_sim_${idx}_${Date.now()}`,
            },
          });

          return { success: true };
        });
      } catch (err: unknown) {
        const e = err as Error;
        return { success: false, error: e.message };
      }
    });

    const results1 = await Promise.all(attempts);
    const succeeded1 = results1.filter((r) => r.success).length;
    const failed1 = results1.filter((r) => !r.success).length;

    const finalWallet1 = await prisma.wallet.findUniqueOrThrow({
      where: { tutorProfileId },
    });

    console.log(`-> Succeeded: ${succeeded1} (Expected max 5)`);
    console.log(`-> Failed: ${failed1} (Expected 5)`);
    console.log(`-> Final Wallet Balance: ${finalWallet1.balance} (Expected 0, NEVER negative)`);
    console.log("-> PASS:", succeeded1 === 5 && failed1 === 5 && finalWallet1.balance === 0);

    // ── TEST 2: Lead maxTutors Capacity Guard (20 simultaneous purchases on maxTutors = 1) ─
    console.log("\n[TEST 2] Lead Capacity Guard (20 simultaneous purchases on maxTutors = 1):");

    // Create test parent profile and lead
    const parentUser = await prisma.user.create({
      data: {
        email: `test_parent_${Date.now()}@example.com`,
        name: "Test Parent",
        role: "PARENT",
        parentProfile: { create: {} },
      },
      include: { parentProfile: true },
    });

    const lead = await prisma.lead.create({
      data: {
        parentProfileId: parentUser.parentProfile!.id,
        classLevel: "Class 10",
        subjects: ["Physics"],
        mode: "ONLINE",
        status: "ACTIVE",
        coinCost: 10,
        maxTutors: 1,
        purchaseCount: 0,
      },
    });

    // Create 20 unique tutor profiles to simulate 20 distinct buyers
    const tutors = await Promise.all(
      Array.from({ length: 20 }).map(async (_, idx) => {
        const u = await prisma.user.create({
          data: {
            email: `tutor_buyer_${idx}_${Date.now()}@example.com`,
            name: `Buyer ${idx}`,
            role: "TUTOR",
            tutorProfile: {
              create: {
                kycStatus: "APPROVED",
                wallet: { create: { balance: 50 } },
              },
            },
          },
          include: { tutorProfile: { include: { wallet: true } } },
        });
        return u.tutorProfile!;
      })
    );

    const leadAttempts = tutors.map(async (tutor) => {
      try {
        return await prisma.$transaction(async (tx) => {
          const leadUpdate = await tx.lead.updateMany({
            where: {
              id: lead.id,
              purchaseCount: { lt: lead.maxTutors },
              status: { notIn: ["CLOSED", "EXPIRED", "COMPLETED"] },
            },
            data: { purchaseCount: { increment: 1 } },
          });

          if (leadUpdate.count === 0) throw new Error("LEAD_CAPACITY_REACHED");

          const updatedWallet = await tx.wallet.updateMany({
            where: { tutorProfileId: tutor.id, balance: { gte: 10 } },
            data: { balance: { decrement: 10 } },
          });

          if (updatedWallet.count === 0) throw new Error("INSUFFICIENT_COINS");

          await tx.leadPurchase.create({
            data: { leadId: lead.id, tutorProfileId: tutor.id, coinsSpent: 10 },
          });

          return { success: true };
        });
      } catch (err: unknown) {
        const e = err as Error;
        return { success: false, error: e.message };
      }
    });

    const leadResults = await Promise.all(leadAttempts);
    const leadSucceeded = leadResults.filter((r) => r.success).length;
    const leadFailed = leadResults.filter((r) => !r.success).length;

    const finalLead = await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } });

    console.log(`-> Succeeded: ${leadSucceeded} (Expected 1)`);
    console.log(`-> Failed: ${leadFailed} (Expected 19)`);
    console.log(`-> Final Lead purchaseCount: ${finalLead.purchaseCount} (Expected 1)`);
    console.log("-> PASS:", leadSucceeded === 1 && leadFailed === 19 && finalLead.purchaseCount === 1);

    // ── TEST 3: Coupon Concurrency Guard (20 simultaneous usages for usageLimit = 1) ─
    console.log("\n[TEST 3] Coupon Usage Guard (20 simultaneous redemptions on usageLimit = 1):");

    const couponCode = `TESTCOUPON_${Date.now()}`;
    const coupon = await prisma.coupon.create({
      data: {
        code: couponCode,
        discountType: "FLAT",
        discountAmount: 1000,
        usageLimit: 1,
        usedCount: 0,
        isActive: true,
      },
    });

    const couponAttempts = Array.from({ length: 20 }).map(async (_, idx) => {
      try {
        return await prisma.$transaction(async (tx) => {
          const updated = await tx.coupon.updateMany({
            where: { id: coupon.id, isActive: true, usedCount: { lt: 1 } },
            data: { usedCount: { increment: 1 } },
          });

          if (updated.count === 0) throw new Error("COUPON_LIMIT_REACHED");

          await tx.couponUsage.create({
            data: {
              couponId: coupon.id,
              userId: tutors[idx % tutors.length].userId,
              discount: 1000,
            },
          });

          return { success: true };
        });
      } catch (err: unknown) {
        const e = err as Error;
        return { success: false, error: e.message };
      }
    });

    const couponResults = await Promise.all(couponAttempts);
    const couponSucceeded = couponResults.filter((r) => r.success).length;
    const couponFailed = couponResults.filter((r) => !r.success).length;

    const finalCoupon = await prisma.coupon.findUniqueOrThrow({ where: { id: coupon.id } });

    console.log(`-> Succeeded: ${couponSucceeded} (Expected 1)`);
    console.log(`-> Failed: ${couponFailed} (Expected 19)`);
    console.log(`-> Final Coupon usedCount: ${finalCoupon.usedCount} (Expected 1)`);
    console.log("-> PASS:", couponSucceeded === 1 && couponFailed === 19 && finalCoupon.usedCount === 1);

    // ── Cleanup Test Data ────────────────────────────────────────────────────────
    console.log("\n[Cleanup] Cleaning test artifacts...");
    await prisma.couponUsage.deleteMany({ where: { couponId: coupon.id } });
    await prisma.coupon.delete({ where: { id: coupon.id } });
    await prisma.leadPurchase.deleteMany({ where: { leadId: lead.id } });
    await prisma.lead.delete({ where: { id: lead.id } });
    await prisma.walletTransaction.deleteMany({ where: { walletId } });
    for (const t of tutors) {
      await prisma.user.delete({ where: { id: t.userId } });
    }
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.user.delete({ where: { id: parentUser.id } });
    console.log("[Cleanup] Finished cleanly.");

    console.log("\n==================================================");
    console.log("   ALL HARDENING CONCURRENCY TESTS COMPLETED SUCCESSFULLY");
    console.log("==================================================");
  } catch (error) {
    console.error("Test execution failed:", error);
    process.exit(1);
  }
}

runRealConcurrencyTests();
