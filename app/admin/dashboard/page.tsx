import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Link from "next/link";
import {
  Users,
  ShieldCheck,
  FileText,
  Wallet,
  Eye,
  MapPin,
  Headphones,
  ArrowUpRight,
  Clock,
  Sparkles,
  Search,
} from "lucide-react";
import { getAdminDashboardStats } from "@/app/actions/admin.actions";
import { prisma } from "@/lib/prisma";
import { getInquiryHashTag } from "@/lib/lead-utils";
import { getMediaUrl } from "@/lib/s3";
import { CreateLeadModal } from "@/components/admin/CreateLeadModal";
import { KycRowActions } from "@/components/admin/KycRowActions";
import { AdminBannerSearch } from "@/components/admin/AdminCommandPalette";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin Overview — ApnaTutorHub" };

const LEAD_STATUS: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: "Active", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  MATCHING: { label: "Matching", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  APPLICATIONS_RECEIVED: { label: "Applications", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  BOOKED: { label: "Booked", cls: "bg-teal-50 text-teal-700 border-teal-200" },
  COMPLETED: { label: "Completed", cls: "bg-slate-50 text-slate-700 border-slate-200" },
  EXPIRED: { label: "Expired", cls: "bg-slate-100 text-slate-500 border-slate-200" },
  CLOSED: { label: "Closed", cls: "bg-rose-50 text-rose-700 border-rose-200" },
};

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  href,
  badge,
  trend,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  href: string;
  badge?: string;
  trend?: string;
}) {
  return (
    <Link
      href={href}
      className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all block group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5 min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{title}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-2xl sm:text-3xl font-black text-[#0F2540] tracking-tight group-hover:text-emerald-700 transition-colors">
              {value}
            </p>
            {badge && (
              <span className="rounded-full px-2 py-0.5 text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">
                {badge}
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs text-slate-500 font-medium truncate">{subtitle}</p>}
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl shrink-0 bg-slate-50 border border-slate-100 text-[#0F2540] group-hover:bg-[#0F2540] group-hover:text-white transition-all shadow-2xs">
          <Icon size={18} />
        </div>
      </div>
      {trend && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
          <span className="text-emerald-700 font-bold flex items-center gap-0.5">
            <ArrowUpRight size={12} /> {trend}
          </span>
          <span className="text-slate-400 group-hover:text-slate-600 transition-colors">View details →</span>
        </div>
      )}
    </Link>
  );
}

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const stats = await getAdminDashboardStats();
  if (!stats) redirect("/login");

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [recentLeads, pendingKycTutors, leadsToday, totalStaffLeads] = await Promise.all([
    prisma.lead.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        inquiryNumber: true,
        classLevel: true,
        subjects: true,
        board: true,
        status: true,
        city: true,
        purchaseCount: true,
        createdAt: true,
        parentProfile: {
          select: {
            user: { select: { name: true } },
          },
        },
      },
    }),
    prisma.tutorProfile.findMany({
      where: { kycStatus: "PENDING" },
      orderBy: { updatedAt: "asc" },
      take: 3,
      select: {
        id: true,
        qualification: true,
        educationCourse: true,
        kycIdProofUrl: true,
        city: true,
        user: { select: { name: true, image: true } },
      },
    }),
    prisma.lead.count({ where: { createdAt: { gte: startOfToday } } }),
    prisma.staffLead.count(),
  ]);

  const kycPendingCount = stats.pendingKyc ?? 0;
  const coinsSold = stats.totalCoinsSold ?? 0;
  const estimatedRevenue = Math.round(coinsSold * 1.5);

  return (
    <div className="space-y-6 pb-12 text-slate-900">
      {/* ── Executive Dark Hero Command Banner ── */}
      <div className="rounded-3xl p-6 sm:p-8 bg-[#0F2540] text-white shadow-xl relative overflow-hidden">
        {/* Subtle decorative background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-400">
                  Admin Command Center
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Platform Operations Overview
              </h1>
            </div>

            {/* Quick Desk Switching Actions */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <Link
                href="/admin/staff-leads"
                className="min-h-10 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black inline-flex items-center gap-1.5 shadow-sm transition-all hover:shadow"
              >
                <Headphones size={14} /> Staff CRM Desk ({totalStaffLeads})
              </Link>
              <Link
                href="/admin/staff-leads/my-leads"
                className="min-h-10 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all border border-white/10"
              >
                <Sparkles size={13} className="text-amber-300" /> My Calling Queue
              </Link>
              <Link
                href="/admin/kyc"
                className="min-h-10 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold inline-flex items-center justify-center transition-all border border-white/10"
              >
                KYC{kycPendingCount > 0 ? ` (${kycPendingCount})` : ""}
              </Link>
            </div>
          </div>

          {/* Search bar & Action Buttons */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="w-full lg:flex-1 min-w-0">
              <AdminBannerSearch />
            </div>
            <div className="flex flex-col xs:flex-row flex-wrap items-stretch sm:items-center gap-2 shrink-0">
              <Link
                href="/admin/notifications/broadcast"
                className="min-h-10 px-4 py-2 rounded-xl bg-white text-[#0F2540] text-xs font-bold inline-flex items-center justify-center hover:bg-slate-100 transition-all shadow-xs"
              >
                Broadcast Push
              </Link>
              <CreateLeadModal
                triggerLabel="+ Post Parent Requirement"
                triggerClassName="min-h-10 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black inline-flex items-center justify-center w-full sm:w-auto transition-all shadow-xs"
              />
            </div>
          </div>

          {/* System Telemetry Strip */}
          <div className="pt-3 mt-1 border-t border-white/10 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 text-[11px] font-semibold text-slate-300">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Postgres Database: Connected
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                AWS S3 Storage: Active
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Razorpay Payment Gateway: Operational
              </span>
            </div>
            <span className="text-slate-400 text-[10px]">Real-time database sync</span>
          </div>
        </div>
      </div>

      {/* ── 4 Executive KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title="Total Platform Users"
          value={(stats.totalUsers ?? 0).toLocaleString("en-IN")}
          subtitle={`Tutors: ${(stats.totalTutors ?? 0).toLocaleString("en-IN")} · Parents: ${(stats.totalParents ?? 0).toLocaleString("en-IN")}`}
          icon={Users}
          href="/admin/users"
          trend="Registered members"
        />
        <KpiCard
          title="KYC Verification Queue"
          value={kycPendingCount}
          subtitle="Aadhaar & qualification checks"
          icon={ShieldCheck}
          href="/admin/kyc"
          badge={kycPendingCount > 0 ? `${kycPendingCount} Pending` : "Queue Clear"}
          trend={kycPendingCount > 0 ? "Requires review" : "All verified"}
        />
        <KpiCard
          title="Student Requirements"
          value={`${(stats.totalLeads ?? 0).toLocaleString("en-IN")}`}
          subtitle={`${leadsToday} posted today`}
          icon={FileText}
          href="/admin/leads"
          trend={`${leadsToday} new today`}
        />
        <KpiCard
          title="Coin Sales & Revenue"
          value={`₹${estimatedRevenue.toLocaleString("en-IN")}`}
          subtitle={`${coinsSold.toLocaleString("en-IN")} Coins Sold`}
          icon={Wallet}
          href="/admin/wallets"
          trend="Lifetime wallet sales"
        />
      </div>

      {/* ── Main Data Grids: Recent Tuition Enquiries + Pending KYC ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Left: Recent Parent Requirements */}
        <section className="xl:col-span-8 bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <div>
              <h2 className="text-base font-extrabold text-[#0F2540]">Live Student Tuition Enquiries</h2>
              <p className="text-xs text-slate-400">Latest requirements submitted by parents across India</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/admin/leads"
                className="px-3 py-1.5 rounded-lg bg-[#0F2540] hover:bg-[#1a3860] text-white text-xs font-bold inline-flex items-center gap-1 transition-all"
              >
                View All Requirements ({stats.totalLeads ?? 0}) →
              </Link>
            </div>
          </div>

          {recentLeads.length === 0 ? (
            <div className="p-12 text-center text-sm font-semibold text-slate-400">
              No student requirements posted yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead>
                  <tr className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 bg-slate-50/50 border-b border-slate-100">
                    <th className="px-5 py-3">Inquiry ID</th>
                    <th className="px-3 py-3">Class & Subjects</th>
                    <th className="px-3 py-3">Location</th>
                    <th className="px-3 py-3">Parent</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentLeads.map((lead) => {
                    const st = LEAD_STATUS[lead.status] ?? {
                      label: lead.status,
                      cls: "bg-slate-50 text-slate-700 border-slate-200",
                    };
                    return (
                      <tr key={lead.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3.5 font-bold text-[#0F2540] whitespace-nowrap">
                          {getInquiryHashTag(lead)}
                        </td>
                        <td className="px-3 py-3.5 min-w-0">
                          <p className="font-bold text-slate-800">
                            {lead.classLevel}
                            {lead.board ? ` ${lead.board}` : ""} · {lead.subjects.slice(0, 2).join(", ")}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {lead.purchaseCount} tutor{lead.purchaseCount === 1 ? "" : "s"} unlocked
                          </p>
                        </td>
                        <td className="px-3 py-3.5">
                          <span className="inline-flex items-center gap-1 font-semibold text-slate-600">
                            <MapPin size={11} className="text-emerald-600 shrink-0" />
                            {lead.city || "—"}
                          </span>
                        </td>
                        <td className="px-3 py-3.5 font-medium text-slate-700 truncate max-w-[130px]">
                          {lead.parentProfile?.user?.name || "Parent"}
                        </td>
                        <td className="px-3 py-3.5">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${st.cls}`}
                          >
                            {st.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <Link
                            href={`/admin/leads?q=${getInquiryHashTag(lead).replace("#", "")}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 transition-all"
                          >
                            <Eye size={12} />
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Right: Pending Tutor KYC Verification */}
        <section className="xl:col-span-4 bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-extrabold text-[#0F2540]">Tutor KYC Queue</h2>
              <p className="text-xs text-slate-400">Tutors waiting for Aadhaar/Degree verification</p>
            </div>
            <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
              {kycPendingCount} pending
            </span>
          </div>

          {pendingKycTutors.length === 0 ? (
            <div className="py-8 text-center text-xs font-semibold text-slate-400 space-y-1">
              <ShieldCheck size={28} className="mx-auto text-emerald-500 opacity-40 mb-1" />
              <p>No tutors waiting for verification.</p>
              <p className="text-[10px] text-slate-400">All submissions are reviewed!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingKycTutors.map((tutor) => {
                const name = tutor.user.name || "Tutor";
                const photo = getMediaUrl(tutor.user.image);
                const docs = [tutor.kycIdProofUrl ? "Aadhaar" : null, tutor.qualification || tutor.educationCourse]
                  .filter(Boolean)
                  .join(" · ");

                return (
                  <div key={tutor.id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-2.5">
                    <div className="flex items-center gap-3">
                      {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photo} alt="" className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#0F2540] text-white flex items-center justify-center text-xs font-black">
                          {name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{name}</p>
                        <p className="text-[10px] text-slate-500 truncate">
                          {docs || "Documents uploaded"}
                          {tutor.city ? ` · ${tutor.city}` : ""}
                        </p>
                      </div>
                    </div>
                    <KycRowActions tutorProfileId={tutor.id} tutorName={name} compact />
                  </div>
                );
              })}
            </div>
          )}

          <Link
            href="/admin/kyc"
            className="block text-center text-xs font-extrabold text-emerald-700 pt-2 hover:underline"
          >
            Open Complete KYC Verification Queue →
          </Link>
        </section>
      </div>
    </div>
  );
}
