import Link from "next/link";
import { redirect } from "next/navigation";
import { Wallet } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Coin Wallet | ThinkTutor" };

export default async function TutorWalletPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const tutorProfile = await prisma.tutorProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      wallet: {
        select: { balance: true, totalPurchased: true, totalSpent: true },
      },
    },
  });

  const balance = tutorProfile?.wallet?.balance ?? 0;

  return (
    <div className="space-y-6 py-4">
      <header className="neu-card flex flex-col gap-3 bg-[#FEF3C7] p-6 md:p-8">
        <div className="neu-badge w-fit bg-white text-[#0F172A]">
          <Wallet size={14} />
          Coin Wallet
        </div>
        <h1 className="text-3xl font-black text-[#0F172A] md:text-4xl">
          Your Coins 🪙
        </h1>
        <p className="max-w-xl text-sm font-semibold text-slate-700">
          Use coins to unlock parent contact details from matched leads. Buy
          more coins via Razorpay checkout.
        </p>
      </header>

      <div className="neu-card space-y-4 bg-[#FEF3C7] p-8 text-center">
        <p className="text-xs font-extrabold uppercase text-slate-500">
          Current Balance
        </p>
        <p className="text-6xl font-black text-[#0F172A]">
          {balance} <span className="text-4xl">🪙</span>
        </p>
      </div>

      <div className="neu-card space-y-4 bg-white p-10 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border-[2.5px] border-[#0F172A] bg-[#FEF3C7] text-3xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
          💳
        </div>
        <h2 className="text-xl font-black text-[#0F172A]">
          Top-up & transactions — Coming in Phase 4
        </h2>
        <p className="mx-auto max-w-md text-sm font-semibold text-slate-600">
          Razorpay checkout, transaction history, refund requests, and coin
          packages are being built next.
        </p>
        <Link
          href="/tutor/dashboard"
          className="neu-btn neu-btn-secondary inline-flex px-6 py-3 text-sm"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
