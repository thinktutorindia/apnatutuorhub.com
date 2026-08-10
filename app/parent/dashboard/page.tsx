import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight, BookOpen, MapPin, PlusCircle, Users, CheckCircle, UserCog, ChevronRight,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { EnablePushBanner } from "@/components/EnablePushBanner";

const OPEN_STATUSES = ["ACTIVE", "MATCHING", "APPLICATIONS_RECEIVED"] as const;

export default async function ParentDashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true },
  });

  if (!dbUser) redirect("/login");

  let parentProfile = await prisma.parentProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      city: true,
      pincode: true,
      _count: { select: { students: true, leads: true } },
      leads: {
        orderBy: { createdAt: "desc" },
        take: 5,
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
    try {
      const created = await prisma.parentProfile.create({
        data: { userId: session.user.id },
      });
      parentProfile = {
        id: created.id,
        city: null,
        pincode: null,
        _count: { students: 0, leads: 0 },
        leads: [],
      };
    } catch {
      redirect("/login");
    }
  }

  const [openRequirements, totalInterestedTutors] = await Promise.all([
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

  const firstName = session.user.name?.split(" ")[0] || "there";

  return (
    <div className="space-y-6 text-slate-900">
      {/* Push Notification Opt-in */}
      <EnablePushBanner userId={session.user.id} />

      {/* Hero Welcome Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#0F2540] via-[#1E3A5F] to-[#0F2540] text-white shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-800 uppercase tracking-widest text-emerald-400">Parent Learning Hub</span>
            <h1 className="text-2xl sm:text-3xl font-800 tracking-tight" style={{ fontFamily: "Poppins, sans-serif" }}>
              Welcome back, {firstName} 👋
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-600">
              Find verified home &amp; online tutors for your children, manage requirements, and track class progress
            </p>
          </div>

          <Link
            href="/parent/post-requirement"
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] text-white text-xs font-800 shadow-md transition-all shrink-0 cursor-pointer"
          >
            <PlusCircle size={16} />
            <span>Post New Requirement</span>
          </Link>
        </div>
      </div>

      {/* Location Nudge */}
      {!parentProfile.city && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-3xl bg-amber-50 border border-amber-200 text-amber-950 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-800 shrink-0 border border-amber-300">
              <MapPin size={18} />
            </div>
            <p className="text-xs sm:text-sm font-700">
              Add your city &amp; location in your profile so our matching engine can connect you with nearby tutors.
            </p>
          </div>
          <Link
            href="/parent/profile"
            className="px-4 py-2 rounded-2xl bg-white border border-amber-300 text-amber-950 font-800 text-xs hover:bg-amber-100 shrink-0 self-start sm:self-auto"
          >
            Update Profile
          </Link>
        </div>
      )}

      {/* Quick Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Requirements", value: parentProfile._count.leads, icon: BookOpen, href: "/parent/my-leads", color: "text-[#2563EB]", bg: "bg-blue-50" },
          { label: "Tutors Interested", value: totalInterestedTutors, icon: Users, href: "/parent/my-leads", color: "text-[#2D9E6B]", bg: "bg-emerald-50" },
          { label: "Active Open Leads", value: openRequirements, icon: CheckCircle, href: "/parent/my-leads", color: "text-[#7C3AED]", bg: "bg-purple-50" },
        ].map((stat) => (
          <Link
            key={stat.label}
            href={stat.href || "#"}
            className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-2 group"
          >
            <div className="flex items-center justify-between">
              <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${stat.bg} ${stat.color}`}>
                <stat.icon size={20} />
              </div>
              <ChevronRight size={16} className="text-slate-400 group-hover:text-slate-700 transition-transform group-hover:translate-x-1" />
            </div>
            <div>
              <p className="text-2xl font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
                {stat.value}
              </p>
              <p className="text-xs font-700 text-slate-600 mt-0.5">{stat.label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Requirements List Card Section */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-lg font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
              Your Posted Requirements
            </h2>
            <p className="text-xs font-600 text-slate-600">Review applicant responses and tutor proposals</p>
          </div>
          {parentProfile.leads.length > 0 && (
            <Link
              href="/parent/my-leads"
              className="text-xs font-800 text-[#2D9E6B] hover:underline flex items-center gap-1"
            >
              <span>View All ({parentProfile._count.leads})</span>
              <ArrowRight size={14} />
            </Link>
          )}
        </div>

        {parentProfile.leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-emerald-50 text-[#2D9E6B] border border-emerald-200">
              <BookOpen size={28} />
            </div>
            <h3 className="text-base font-800 text-[#0F2540]">No tuition requirements posted yet</h3>
            <p className="text-xs font-600 text-slate-600 max-w-sm">
              Post your subject requirement to start receiving tutor profiles and proposals in your locality.
            </p>
            <Link
              href="/parent/post-requirement"
              className="px-5 py-2.5 rounded-2xl bg-[#2D9E6B] text-white text-xs font-800 hover:bg-[#238357] shadow-md transition-all mt-2"
            >
              Post First Requirement
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {parentProfile.leads.map((lead) => {
              const applicantsCount = lead._count.purchases;
              return (
                <div
                  key={lead.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-200 hover:bg-slate-100/80 transition-all"
                >
                  <div className="space-y-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-800 text-[#0F2540] text-base truncate">
                        {lead.subjects.join(", ")}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-800 bg-blue-100 text-blue-950 border border-blue-300">
                        {lead.classLevel}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-800 bg-slate-200 text-slate-800 border border-slate-300">
                        {lead.mode}
                      </span>
                    </div>

                    <p className="text-xs font-700 text-slate-600">
                      Location: {lead.city || "Location Private"} · Budget: ₹{lead.budgetMin || 0} - ₹{lead.budgetMax || "Negotiable"}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-xs font-800 text-[#2D9E6B]">
                        {applicantsCount} {applicantsCount === 1 ? "Tutor Applicant" : "Tutors Applicant"}
                      </span>
                    </div>
                    <Link
                      href={`/parent/my-leads/${lead.id}/applicants`}
                      className="px-4 py-2 rounded-2xl bg-[#0F2540] hover:bg-[#1E3A5F] text-white text-xs font-800 shadow-2xs flex items-center gap-1 transition-all"
                    >
                      <span>View Tutors</span>
                      <ChevronRight size={14} />
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
