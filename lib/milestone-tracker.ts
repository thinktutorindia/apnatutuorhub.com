/**
 * lib/milestone-tracker.ts
 * Phase 12 — Tutor Milestone Reward Engine & Featured Tutor Assignment
 */

import { prisma } from "@/lib/prisma";
import { notifyWalletCredited } from "@/lib/aws-notification";

export type MilestoneTier = {
  bookingsRequired: number;
  bonusCoins: number;
  title: string;
  badgeName: string;
};

export const MILESTONE_TIERS: MilestoneTier[] = [
  { bookingsRequired: 1, bonusCoins: 30, title: "First Tuition Milestone", badgeName: "First Tuition Completed" },
  { bookingsRequired: 5, bonusCoins: 50, title: "5 Tuitions Milestone", badgeName: "Rising Star Tutor" },
  { bookingsRequired: 10, bonusCoins: 100, title: "10 Tuitions Milestone", badgeName: "Featured Pro Tutor" },
  { bookingsRequired: 25, bonusCoins: 250, title: "25 Tuitions Master Milestone", badgeName: "Elite Tutor" },
];

/**
 * Checks and triggers milestone rewards for a tutor after a booking is marked COMPLETED.
 * Idempotent: uses WalletTransaction referenceId "MILESTONE_<tutorProfileId>_<bookingsRequired>"
 */
export async function evaluateTutorMilestones(tutorProfileId: string) {
  const tutor = await prisma.tutorProfile.findUnique({
    where: { id: tutorProfileId },
    include: {
      user: { select: { id: true, email: true, name: true } },
      wallet: true,
    },
  });

  if (!tutor || !tutor.wallet) return;

  // Count total COMPLETED bookings for this tutor
  const completedCount = await prisma.booking.count({
    where: { tutorProfileId, status: "COMPLETED" },
  });

  for (const tier of MILESTONE_TIERS) {
    if (completedCount >= tier.bookingsRequired) {
      const refId = `MILESTONE_${tutorProfileId}_${tier.bookingsRequired}`;

      // Check if this milestone reward was already claimed
      const existingTx = await prisma.walletTransaction.findFirst({
        where: { walletId: tutor.wallet.id, referenceId: refId },
      });

      if (!existingTx) {
        // Atomic transaction: credit wallet balance + record BONUS transaction
        await prisma.$transaction(async (tx) => {
          const updatedWallet = await tx.wallet.update({
            where: { id: tutor.wallet!.id },
            data: { balance: { increment: tier.bonusCoins } },
          });

          await tx.walletTransaction.create({
            data: {
              walletId: tutor.wallet!.id,
              type: "BONUS",
              amount: tier.bonusCoins,
              balanceAfter: updatedWallet.balance,
              description: `🎉 Milestone Bonus: ${tier.title} (${tier.bookingsRequired} bookings)`,
              referenceId: refId,
            },
          });

          // If reached 10+ bookings, auto-assign Featured status
          if (tier.bookingsRequired >= 10 && !tutor.isFeatured) {
            await tx.tutorProfile.update({
              where: { id: tutorProfileId },
              data: { isFeatured: true },
            });
          }
        });

        // Send notification & email
        await notifyWalletCredited({
          tutorUserId: tutor.userId,
          tutorEmail: tutor.user.email,
          coins: tier.bonusCoins,
          reason: "milestone",
        });

        console.log(`[Milestone Engine] Credited ${tier.bonusCoins} coins to tutor ${tutorProfileId} for ${tier.title}`);
      }
    }
  }
}

/**
 * Cron / Batch job to auto-assign "Featured Tutor" badge to the top 5% highest-rated tutors
 * with at least 5 reviews.
 */
export async function syncFeaturedTutorsJob() {
  const tutors = await prisma.tutorProfile.findMany({
    where: { totalReviews: { gte: 5 } },
    orderBy: [{ averageRating: "desc" }, { totalReviews: "desc" }],
    select: { id: true, averageRating: true, isFeatured: true },
  });

  if (tutors.length === 0) return { updated: 0 };

  const top5PercentCount = Math.max(1, Math.ceil(tutors.length * 0.05));
  const featuredIds = new Set(tutors.slice(0, top5PercentCount).map((t) => t.id));

  let updated = 0;
  for (const t of tutors) {
    const shouldBeFeatured = featuredIds.has(t.id);
    if (t.isFeatured !== shouldBeFeatured) {
      await prisma.tutorProfile.update({
        where: { id: t.id },
        data: { isFeatured: shouldBeFeatured },
      });
      updated++;
    }
  }

  return { updated, featuredCount: top5PercentCount };
}
