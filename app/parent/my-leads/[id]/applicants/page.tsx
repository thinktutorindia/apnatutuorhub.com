import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Tutor Applicants | ThinkTutor",
};

export default async function ApplicantsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [session, { id }] = await Promise.all([auth(), params]);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const parentProfile = await prisma.parentProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!parentProfile) {
    redirect("/parent/dashboard");
  }

  const lead = await prisma.lead.findFirst({
    where: { id, parentProfileId: parentProfile.id },
    select: {
      id: true,
      subjects: true,
      classLevel: true,
      status: true,
      _count: { select: { purchases: true } },
    },
  });

  if (!lead) {
    notFound();
  }

  return (
    <div className="space-y-6 py-4">
      <Link
        href="/parent/my-leads"
        className="inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-600 hover:text-[#22C55E]"
      >
        <ArrowLeft size={15} />
        <span>Back to my requirements</span>
      </Link>

      <header className="neu-card flex flex-col gap-3 bg-[#FEF3C7] p-6 md:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <div className="neu-badge bg-white text-[#0F172A]">
            <Users size={14} />
            Applicants
          </div>
          <span className="neu-badge bg-[#DCFCE7] text-[11px]">
            {lead.classLevel}
          </span>
        </div>
        <h1 className="text-3xl font-black text-[#0F172A] md:text-4xl">
          {lead.subjects.join(", ")}
        </h1>
        <p className="text-sm font-semibold text-slate-700">
          {lead._count.purchases} tutor{lead._count.purchases !== 1 ? "s" : ""}{" "}
          unlocked this requirement so far.
        </p>
      </header>

      <div className="neu-card space-y-4 bg-white p-10 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border-[2.5px] border-[#0F172A] bg-[#FEF3C7] text-3xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
          👀
        </div>
        <h2 className="text-xl font-black text-[#0F172A]">
          {lead._count.purchases === 0
            ? "No tutor applications yet"
            : "Full applicant comparison coming soon"}
        </h2>
        <p className="mx-auto max-w-md text-sm font-semibold text-slate-600">
          {lead._count.purchases === 0
            ? "Sit tight! Verified tutors near you are being matched and notified. Applications typically arrive within a few hours."
            : "The side-by-side tutor comparison view (ratings, experience, distance, shortlist/reject) is being built in Phase 6."}
        </p>
        <Link
          href="/parent/my-leads"
          className="neu-btn neu-btn-secondary inline-flex items-center gap-2 px-6 py-3 text-sm"
        >
          <ArrowLeft size={16} />
          <span>Back to Requirements</span>
        </Link>
      </div>
    </div>
  );
}
