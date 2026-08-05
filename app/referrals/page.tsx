import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOrCreateReferralCodeAction } from "@/app/actions/referral.actions";
import { ReferralClientView } from "@/components/referrals/ReferralClientView";

export const dynamic = "force-dynamic";
export const metadata = { title: "Referral & Earn Rewards | ApnaTutorHub" };

export default async function ReferralsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Ensure user has a referral code
  let referralCode = (
    await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { referralCode: true },
    })
  )?.referralCode;

  if (!referralCode) {
    const res = await getOrCreateReferralCodeAction();
    if (res.success && res.data) {
      referralCode = res.data.code;
    }
  }

  // Fetch user's referral stats
  const referrals = await prisma.referral.findMany({
    where: { referrerId: session.user.id },
    include: {
      referee: { select: { name: true, email: true, createdAt: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalInvited = referrals.length;
  const rewardedCount = referrals.filter((r) => r.status === "REWARDED").length;
  const totalCoinsEarned = referrals
    .filter((r) => r.status === "REWARDED")
    .reduce((sum, r) => sum + r.rewardCoins, 0);

  const backHref =
    session.user.role === "PARENT"
      ? "/parent/dashboard"
      : session.user.role === "TUTOR"
        ? "/tutor/dashboard"
        : "/admin/dashboard";

  return (
    <ReferralClientView
      referralCode={referralCode ?? "ATH123"}
      totalInvited={totalInvited}
      rewardedCount={rewardedCount}
      totalCoinsEarned={totalCoinsEarned}
      referrals={referrals.map((r) => ({
        id: r.id,
        refereeName: r.referee.name ?? "Friend",
        refereeEmail: r.referee.email,
        status: r.status,
        rewardCoins: r.rewardCoins,
        createdAt: r.createdAt.toISOString(),
      }))}
      backHref={backHref}
    />
  );
}
