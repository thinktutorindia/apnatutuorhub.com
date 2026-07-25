import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  CheckCircle,
  MapPin,
  PlusCircle,
  Sparkles,
  Users,
  UserCog,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { LEAD_STATUS_META, type LeadStatusKey } from "@/lib/validations";

const OPEN_STATUSES = ["ACTIVE", "MATCHING", "APPLICATIONS_RECEIVED"] as const;

export default async function ParentDashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const parentProfile = await prisma.parentProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      city: true,
      pincode: true,
      _count: { select: { students: true, leads: true } },
      leads: {
        orderBy: { createdAt: "desc" },
        take: 4,
        select: {
          id: true,
          subjects: true,
          classLevel: true,
          mode: true,
          budgetMin: true,
          budgetMax: true,
          city: true,
          status: true,
          maxTutors: true,
          _count: { select: { purchases: true } },
        },
      },
    },
  });

  if (!parentProfile) {
    redirect("/login");
  }

  const [openRequirements, totalApplicants] = await Promise.all([
    prisma.lead.count({
      where: {
        parentProfileId: parentProfile.id,
        status: { in: [...OPEN_STATUSES] },
      },
    }),
    prisma.leadPurchase.count({
      where: { lead: { parentProfileId: parentProfile.id } },
    }),
  ]);

  const stats = [
    {
      label: "Posted Requirements",
      value: parentProfile._count.leads,
      icon: BookOpen,
      background: "#DCFCE7",
    },
    {
      label: "Tutor Applications",
      value: totalApplicants,
      icon: Users,
      background: "#FEF3C7",
    },
    {
      label: "Open Requirements",
      value: openRequirements,
      icon: CheckCircle,
      background: "#FCE7F3",
    },
    {
      label: "Student Profiles",
      value: parentProfile._count.students,
      icon: UserCog,
      background: "#F3E8FF",
    },
  ];

  return (
    <div className="space-y-8 py-4">
      {/* Welcome Banner */}
      <div className="neu-card flex flex-col items-start justify-between gap-6 bg-[#E0F2FE] p-6 md:flex-row md:items-center md:p-8">
        <div className="space-y-2">
          <div className="neu-badge bg-white text-[#0F172A]">
            <Sparkles size={14} className="text-amber-500" />
            Parent Dashboard
          </div>
          <h1 className="text-3xl font-black text-[#0F172A] md:text-4xl">
            Welcome back, {session.user.name || "Parent"}! 👋
          </h1>
          <p className="text-sm font-semibold text-slate-700">
            Manage your posted tuition requirements, review tutor applications,
            and track classes.
          </p>
        </div>

        <Link
          href="/parent/post-requirement"
          className="neu-btn neu-btn-primary flex shrink-0 items-center gap-2 px-6 py-3.5 text-sm"
        >
          <PlusCircle size={18} />
          <span>Post New Requirement</span>
        </Link>
      </div>

      {!parentProfile.city && (
        <div className="neu-card flex flex-col gap-3 bg-[#FFEDD5] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2">
            <MapPin size={18} className="mt-0.5 shrink-0" />
            <p className="text-xs font-bold text-slate-700">
              Add your city and pincode so we can match you with verified tutors
              nearby.
            </p>
          </div>
          <Link
            href="/parent/profile"
            className="neu-btn neu-btn-white shrink-0 px-5 py-2.5 text-xs"
          >
            <UserCog size={15} />
            <span>Complete Profile</span>
          </Link>
        </div>
      )}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="neu-card space-y-2 p-5"
            style={{ backgroundColor: stat.background }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-slate-700">
                {stat.label}
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-[#0F172A] bg-white">
                <stat.icon size={16} className="text-[#0F172A]" />
              </div>
            </div>
            <div className="text-3xl font-black text-[#0F172A]">
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Requirements */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-[#0F172A]">
            Recent Requirements
          </h2>
          <Link
            href="/parent/my-leads"
            className="flex items-center gap-1 text-sm font-extrabold text-[#22C55E] hover:underline"
          >
            <span>View all</span> <ArrowRight size={16} />
          </Link>
        </div>

        {parentProfile.leads.length === 0 ? (
          <div className="neu-card space-y-4 bg-white p-10 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border-[2.5px] border-[#0F172A] bg-[#DCFCE7] text-3xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
              📝
            </div>
            <h3 className="text-xl font-black text-[#0F172A]">
              No tuition requirements posted yet
            </h3>
            <p className="mx-auto max-w-md text-sm font-semibold text-slate-600">
              Post your first requirement to get matched with top verified home or
              online tutors in your area!
            </p>
            <Link
              href="/parent/post-requirement"
              className="neu-btn neu-btn-primary inline-flex items-center gap-2 px-6 py-3 text-sm"
            >
              <PlusCircle size={18} />
              <span>Post Requirement Now</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {parentProfile.leads.map((lead) => {
              const statusMeta = LEAD_STATUS_META[lead.status as LeadStatusKey];

              return (
                <div key={lead.id} className="neu-card space-y-4 bg-white p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="neu-badge bg-[#DCFCE7] text-xs">
                        {lead.classLevel}
                      </span>
                      <h3 className="mt-2 text-xl font-black text-[#0F172A]">
                        {lead.subjects.join(", ")}
                      </h3>
                    </div>
                    <span
                      className="neu-badge shrink-0 text-[11px]"
                      style={{ backgroundColor: statusMeta.background }}
                    >
                      {statusMeta.label}
                    </span>
                  </div>

                  <div className="space-y-2 border-y-2 border-slate-100 py-3 text-xs font-bold text-slate-600">
                    <div className="flex items-center justify-between">
                      <span>Mode:</span>
                      <span className="font-black text-[#0F172A]">
                        {lead.mode}
                      </span>
                    </div>
                    {lead.budgetMax && (
                      <div className="flex items-center justify-between">
                        <span>Budget:</span>
                        <span className="font-black text-[#22C55E]">
                          ₹{lead.budgetMin ?? 0} - ₹{lead.budgetMax} / hr
                        </span>
                      </div>
                    )}
                    {lead.city && (
                      <div className="flex items-center gap-1 text-slate-600">
                        <MapPin size={12} />
                        <span>{lead.city}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-bold text-slate-500">
                      {lead._count.purchases} of {lead.maxTutors} tutors unlocked
                    </span>
                    <Link
                      href={`/parent/my-leads/${lead.id}/applicants`}
                      className="neu-btn neu-btn-secondary px-4 py-2 text-xs"
                    >
                      View Applicants ({lead._count.purchases})
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
