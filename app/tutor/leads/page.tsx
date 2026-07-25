import Link from "next/link";
import { redirect } from "next/navigation";
import { Compass } from "lucide-react";
import { auth } from "@/auth";

export const metadata = { title: "Lead Feed | ThinkTutor" };

export default async function TutorLeadsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="space-y-6 py-4">
      <header className="neu-card flex flex-col gap-3 bg-[#E0F2FE] p-6 md:p-8">
        <div className="neu-badge w-fit bg-white text-[#0F172A]">
          <Compass size={14} />
          Lead Feed
        </div>
        <h1 className="text-3xl font-black text-[#0F172A] md:text-4xl">
          Matched Tuition Leads 🎯
        </h1>
        <p className="max-w-2xl text-sm font-semibold text-slate-700">
          Parents actively looking for tutors in your subjects and teaching
          radius will appear here once KYC is approved.
        </p>
      </header>

      <div className="neu-card space-y-4 bg-white p-10 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border-[2.5px] border-[#0F172A] bg-[#E0F2FE] text-3xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
          🔍
        </div>
        <h2 className="text-xl font-black text-[#0F172A]">Coming in Phase 6</h2>
        <p className="mx-auto max-w-md text-sm font-semibold text-slate-600">
          The lead browsing and purchase flow is being built next. Complete your
          KYC and profile so you&apos;re ready to unlock leads the moment it
          launches.
        </p>
        <Link
          href="/tutor/profile"
          className="neu-btn neu-btn-primary inline-flex px-6 py-3 text-sm"
        >
          Complete Profile & KYC
        </Link>
      </div>
    </div>
  );
}
