"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { actionError, actionSuccess, type ActionResult } from "@/lib/action-result";

/**
 * Generates a unique 6-character alphanumeric referral code for the logged in user if they don't have one.
 */
export async function getOrCreateReferralCodeAction(): Promise<ActionResult<{ code: string }>> {
  const session = await auth();
  if (!session?.user) return actionError("Unauthenticated");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { referralCode: true, name: true },
  });

  if (!user) return actionError("User not found");

  if (user.referralCode) {
    return actionSuccess({ code: user.referralCode });
  }

  // Generate code: e.g. "TUT" + 3 random alphanumeric uppercase
  let newCode = "";
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 10) {
    attempts++;
    const randStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    const prefix = user.name ? user.name.replace(/[^A-Z]/gi, "").substring(0, 3).toUpperCase() : "ATH";
    newCode = `${prefix}${randStr}`;

    const existing = await prisma.user.findUnique({ where: { referralCode: newCode } });
    if (!existing) isUnique = true;
  }

  const updatedUser = await prisma.user.update({
    where: { id: session.user.id },
    data: { referralCode: newCode },
  });

  return actionSuccess({ code: updatedUser.referralCode! });
}

/**
 * Triggered when a new user registers with a referral code or completes KYC.
 * Rewards 50 coins to Referrer & 25 coins to Referee upon KYC approval.
 */
export async function processReferralRewardOnKyc(refereeUserId: string) {
  const referral = await prisma.referral.findUnique({
    where: { refereeId: refereeUserId },
    include: {
      referrer: { include: { tutorProfile: { include: { wallet: true } } } },
      referee: { include: { tutorProfile: { include: { wallet: true } } } },
    },
  });

  if (!referral || referral.status === "REWARDED") return;

  // Credit referrer wallet if tutor
  if (referral.referrer.tutorProfile?.wallet) {
    const wallet = referral.referrer.tutorProfile.wallet;
    const updated = await prisma.wallet.update({
      where: { id: wallet.id },
      data: { balance: { increment: referral.rewardCoins } },
    });

    await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: "BONUS",
        amount: referral.rewardCoins,
        balanceAfter: updated.balance,
        description: `🎁 Referral Bonus: Invited friend ${referral.referee.name ?? "Tutor"} joined and completed KYC!`,
        referenceId: `REF_${referral.id}_REFERRER`,
      },
    });

    await prisma.notification.create({
      data: {
        userId: referral.referrerId,
        title: `🎁 ${referral.rewardCoins} Referral Coins Earned!`,
        message: `Your invited tutor ${referral.referee.name ?? "friend"} got verified. Bonus coins added to your wallet!`,
        actionUrl: "/tutor/wallet",
      },
    });
  }

  // Credit referee wallet if tutor
  if (referral.referee.tutorProfile?.wallet) {
    const wallet = referral.referee.tutorProfile.wallet;
    const updated = await prisma.wallet.update({
      where: { id: wallet.id },
      data: { balance: { increment: referral.refereeCoins } },
    });

    await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: "BONUS",
        amount: referral.refereeCoins,
        balanceAfter: updated.balance,
        description: `🎁 Welcome Referral Bonus: Verified via invite code ${referral.code}!`,
        referenceId: `REF_${referral.id}_REFEREE`,
      },
    });

    await prisma.notification.create({
      data: {
        userId: referral.refereeId,
        title: `🎁 Welcome ${referral.refereeCoins} Bonus Coins!`,
        message: `Thanks for joining via referral code ${referral.code}. Your welcome bonus coins have been credited!`,
        actionUrl: "/tutor/wallet",
      },
    });
  }

  await prisma.referral.update({
    where: { id: referral.id },
    data: { status: "REWARDED" },
  });
}
