import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { WalletPageClient } from "@/components/wallet/WalletPageClient";

export const metadata = { title: "Coin Wallet | ApnaTutorHub" };

export default async function TutorWalletPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const tutorProfile = await prisma.tutorProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      canTopup: true,
      isOldUser: true,
      wallet: {
        select: {
          balance: true,
          totalPurchased: true,
          totalSpent: true,
          transactions: {
            orderBy: { createdAt: "desc" },
            take: 200, // client paginates
            select: {
              id: true,
              type: true,
              amount: true,
              balanceAfter: true,
              description: true,
              referenceId: true,
              createdAt: true,
            },
          },
        },
      },
    },
  });

  const wallet = tutorProfile?.wallet;

  return (
    <WalletPageClient
      balance={wallet?.balance ?? 0}
      totalPurchased={wallet?.totalPurchased ?? 0}
      totalSpent={wallet?.totalSpent ?? 0}
      transactions={
        wallet?.transactions.map((t) => ({
          ...t,
          createdAt: t.createdAt.toISOString(),
        })) ?? []
      }
      userEmail={session.user.email ?? ""}
      userName={session.user.name ?? "Tutor"}
      canTopup={tutorProfile?.canTopup ?? true}
      isOldUser={tutorProfile?.isOldUser ?? false}
    />
  );
}
