import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { RequirementForm } from "@/components/parent/RequirementForm";
import { LEAD_STATUS_META, type LeadStatusKey } from "@/lib/validations";

export const metadata = {
  title: "Edit Requirement | ApnaTutorHub",
};

const EDITABLE_STATUSES = new Set<LeadStatusKey>([
  "ACTIVE",
  "MATCHING",
  "APPLICATIONS_RECEIVED",
]);

export default async function EditRequirementPage({
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
    select: {
      id: true,
      students: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          classLevel: true,
          board: true,
          subjects: true,
          notes: true,
        },
      },
    },
  });

  if (!parentProfile) {
    redirect("/parent/dashboard");
  }

  const lead = await prisma.lead.findFirst({
    where: { id, parentProfileId: parentProfile.id },
  });

  if (!lead) {
    notFound();
  }

  if (!EDITABLE_STATUSES.has(lead.status as LeadStatusKey)) {
    redirect("/parent/my-leads");
  }

  const statusMeta = LEAD_STATUS_META[lead.status as LeadStatusKey];

  return (
    <div className="space-y-6 py-4">
      <Link
        href="/parent/my-leads"
        className="inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-600 hover:text-[#2D9E6B]"
      >
        <ArrowLeft size={15} />
        <span>Back to my requirements</span>
      </Link>

      <header className="ath-panel flex flex-col gap-3 p-6 md:p-8 bg-[#0F2540] text-white">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-800 border border-white/20">
            <Pencil size={14} />
            Edit Requirement
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-800 bg-emerald-500/25 text-emerald-200 border border-emerald-400/40">
            {statusMeta.label}
          </span>
        </div>
        <h1 className="text-xl sm:text-3xl font-800 text-white md:text-4xl break-words" style={{ fontFamily: "Poppins, sans-serif" }}>
          {lead.subjects.join(", ")}
        </h1>
        <p className="text-sm font-500 text-slate-200">
          {lead.classLevel} · posted{" "}
          {lead.createdAt.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </p>
      </header>

      <RequirementForm
        mode="edit"
        leadId={lead.id}
        locked={lead.purchaseCount > 0}
        students={parentProfile.students}
        defaults={{
          subjects: lead.subjects,
          classLevel: lead.classLevel,
          board: lead.board ?? "",
          mode: lead.mode,
          budgetMin: lead.budgetMin?.toString() ?? "",
          budgetMax: lead.budgetMax?.toString() ?? "",
          latitude: lead.latitude?.toString() ?? "",
          longitude: lead.longitude?.toString() ?? "",
          city: lead.city ?? "",
          area: lead.area ?? "",
          pincode: lead.pincode ?? "",
          timingPreference: lead.timingPreference ?? "",
          tutorGenderPref: lead.tutorGenderPref ?? "ANY",
          languagePref: lead.languagePref ?? "",
          notes: lead.notes ?? "",
          studentProfileId: lead.studentProfileId ?? "",
        }}
      />
    </div>
  );
}
