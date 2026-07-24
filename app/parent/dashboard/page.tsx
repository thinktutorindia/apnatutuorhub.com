import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import {
  PlusCircle,
  BookOpen,
  Users,
  CheckCircle,
  Clock,
  ArrowRight,
  Sparkles,
  MapPin,
} from "lucide-react";

export default async function ParentDashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Fetch parent profile & posted requirements from Supabase
  const parentProfile = await prisma.parentProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      leads: {
        orderBy: { createdAt: "desc" },
        include: {
          purchases: {
            include: {
              tutorProfile: {
                include: { user: true },
              },
            },
          },
        },
      },
    },
  });

  const leads = parentProfile?.leads || [];

  return (
    <div className="space-y-8 py-4">
      {/* Welcome Banner */}
      <div className="neu-card p-6 md:p-8 bg-[#E0F2FE] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="neu-badge bg-white text-[#0F172A]">
            <Sparkles size={14} className="text-amber-500" />
            Parent Dashboard
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-[#0F172A]">
            Welcome back, {session.user.name || "Parent"}! 👋
          </h1>
          <p className="text-sm font-semibold text-slate-700">
            Manage your posted tuition requirements, review tutor applications, and track classes.
          </p>
        </div>

        <a
          href="/parent/post-requirement"
          className="neu-btn neu-btn-primary py-3.5 px-6 text-sm flex items-center gap-2 whitespace-nowrap"
        >
          <PlusCircle size={18} />
          <span>Post New Requirement</span>
        </a>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Posted Requirements",
            value: leads.length,
            icon: BookOpen,
            bg: "#DCFCE7",
          },
          {
            label: "Tutor Applications",
            value: leads.reduce((acc, l) => acc + l.purchases.length, 0),
            icon: Users,
            bg: "#FEF3C7",
          },
          {
            label: "Trial Classes",
            value: 0,
            icon: Clock,
            bg: "#FCE7F3",
          },
          {
            label: "Active Bookings",
            value: 0,
            icon: CheckCircle,
            bg: "#F3E8FF",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="neu-card p-5 space-y-2"
            style={{ backgroundColor: stat.bg }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-slate-700">
                {stat.label}
              </span>
              <div className="w-8 h-8 rounded-lg bg-white border-2 border-[#0F172A] flex items-center justify-center">
                <stat.icon size={16} className="text-[#0F172A]" />
              </div>
            </div>
            <div className="text-3xl font-black text-[#0F172A]">
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Posted Requirements List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-[#0F172A]">
            Your Posted Requirements
          </h2>
          <a
            href="/parent/post-requirement"
            className="text-sm font-extrabold text-[#22C55E] hover:underline flex items-center gap-1"
          >
            <span>Post another</span> <ArrowRight size={16} />
          </a>
        </div>

        {leads.length === 0 ? (
          <div className="neu-card p-10 bg-white text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-[#DCFCE7] border-[2.5px] border-[#0F172A] shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex items-center justify-center mx-auto text-3xl">
              📝
            </div>
            <h3 className="text-xl font-black text-[#0F172A]">
              No tuition requirements posted yet
            </h3>
            <p className="text-sm font-semibold text-slate-600 max-w-md mx-auto">
              Post your first requirement to get matched with top verified home or online tutors in your area!
            </p>
            <a
              href="/parent/post-requirement"
              className="neu-btn neu-btn-primary inline-flex items-center gap-2 py-3 px-6 text-sm"
            >
              <PlusCircle size={18} />
              <span>Post Requirement Now</span>
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {leads.map((lead) => (
              <div key={lead.id} className="neu-card p-6 bg-white space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="neu-badge bg-[#DCFCE7] text-xs">
                      {lead.classLevel}
                    </span>
                    <h3 className="text-xl font-black text-[#0F172A] mt-2">
                      {lead.subjects.join(", ")}
                    </h3>
                  </div>
                  <span className="neu-badge bg-[#FEF3C7] text-xs">
                    {lead.status}
                  </span>
                </div>

                <div className="space-y-2 text-xs font-bold text-slate-600 border-t-2 border-b-2 border-slate-100 py-3">
                  <div className="flex items-center justify-between">
                    <span>Mode:</span>
                    <span className="text-[#0F172A] font-black">{lead.mode}</span>
                  </div>
                  {lead.budgetMax && (
                    <div className="flex items-center justify-between">
                      <span>Budget:</span>
                      <span className="text-[#22C55E] font-black">
                        ₹{lead.budgetMin || 0} - ₹{lead.budgetMax} / hr
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
                    {lead.purchases.length} Tutor Applicants
                  </span>
                  <a
                    href={`/parent/my-leads/${lead.id}/applicants`}
                    className="neu-btn neu-btn-secondary text-xs px-4 py-2"
                  >
                    View Applicants ({lead.purchases.length})
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
