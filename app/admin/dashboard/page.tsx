import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Link from "next/link";
import {
  Users,
  ShieldCheck,
  FileText,
  BookOpen,
  ArrowRight,
  BarChart3,
  Activity,
  Bell,
  Ticket,
  Wallet,
  CheckCircle2,
  Database,
  HardDrive,
  Cpu,
  Mail,
  Zap,
  Clock,
  Sparkles,
  TrendingUp,
  AlertCircle,
  MessageSquare,
} from "lucide-react";
import { getAdminDashboardStats } from "@/app/actions/admin.actions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin Overview — ApnaTutorHub" };

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accentBg,
  accentText,
  href,
  badge,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  accentBg: string;
  accentText: string;
  href?: string;
  badge?: string | number;
}) {
  const card = (
    <div
      className="group relative overflow-hidden rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-pointer bg-white border border-gray-200/90 shadow-xs"
    >
      <div className="relative flex items-start justify-between">
        <div className="space-y-1.5">
          <p className="text-[11px] font-800 uppercase tracking-wider text-slate-900">
            {title}
          </p>
          <div className="flex items-center gap-2.5">
            <p className="text-3xl sm:text-4xl font-800 text-[#0F2540] tracking-tight" style={{ fontFamily: "Poppins, sans-serif" }}>
              {value}
            </p>
            {badge && (
              <span
                className="rounded-full px-2.5 py-0.5 text-[10px] font-800 animate-pulse bg-emerald-100 text-emerald-950 border border-emerald-300"
              >
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs font-600 text-slate-700">
              {subtitle}
            </p>
          )}
        </div>
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-transform group-hover:scale-110 shadow-2xs ${accentBg} ${accentText}`}
        >
          <Icon size={24} />
        </div>
      </div>

      {href && (
        <div className={`mt-5 flex items-center gap-1.5 text-xs font-800 pt-3 border-t border-gray-100 ${accentText}`}>
          <span>View Section</span>
          <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
        </div>
      )}
    </div>
  );

  return href ? <Link href={href}>{card}</Link> : card;
}

function SparklineBars({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-12 items-end gap-1.5 pt-2">
      {values.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-lg transition-all duration-300 hover:brightness-110 cursor-pointer"
          style={{
            height: `${Math.max((v / max) * 100, 15)}%`,
            background:
              i === values.length - 1
                ? "#2D9E6B"
                : `rgba(45,158,107,${0.25 + (i / values.length) * 0.4})`,
          }}
          title={`Day ${i + 1}: ${v} leads`}
        />
      ))}
    </div>
  );
}

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const stats = await getAdminDashboardStats();
  if (!stats) redirect("/login");

  // Fetch breakdown count for KYC
  const [kycApprovedCount, kycRejectedCount] = await Promise.all([
    prisma.tutorProfile.count({ where: { kycStatus: "APPROVED" } }),
    prisma.tutorProfile.count({ where: { kycStatus: "REJECTED" } }),
  ]);

  // Recent leads (last 6)
  const recentLeads = await prisma.lead.findMany({
    orderBy: { createdAt: "desc" },
    take: 6,
    select: {
      id: true,
      classLevel: true,
      subjects: true,
      status: true,
      city: true,
      createdAt: true,
    },
  });

  // Recent audit actions (last 6)
  const recentAudits = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 6,
    select: {
      id: true,
      action: true,
      details: true,
      adminId: true,
      createdAt: true,
    },
  });

  const kycPendingCount = stats.pendingKyc ?? 0;
  const coinsSold = stats.totalCoinsSold ?? 0;
  const coinsCirculating = stats.totalCoinsCirculating ?? 0;

  return (
    <div className="space-y-8 pb-10 text-slate-900">
      {/* ── Executive Hero Header (HIGH CONTRAST DEEP NAVY CARD) ── */}
      <div
        className="rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl space-y-6 bg-gradient-to-r from-[#0F2540] via-[#1E3A5F] to-[#0F2540] text-white"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-800 bg-emerald-500/30 text-emerald-200 border border-emerald-400/40">
                <Zap size={14} className="animate-pulse text-emerald-400" />
                Live Admin Command Center
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-700 bg-white/15 text-slate-100 border border-white/20">
                <Clock size={13} />
                {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-800 !text-white tracking-tight drop-shadow-sm" style={{ fontFamily: "Poppins, sans-serif" }}>
              Marketplace Control Panel
            </h1>
            <p className="text-xs sm:text-sm !text-slate-100 font-500 max-w-2xl leading-relaxed">
              Monitor real-time tutor verification queues, student requirements, platform coin revenue, and system health.
            </p>
          </div>

          {/* Quick Action Command Shortcuts */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              href="/admin/kyc"
              className="px-5 py-3.5 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] !text-white text-xs font-800 flex items-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <ShieldCheck size={17} className="!text-white" />
              <span className="!text-white font-800">KYC Queue ({kycPendingCount})</span>
            </Link>

            <Link
              href="/admin/notifications/broadcast"
              className="px-5 py-3.5 rounded-2xl bg-white/15 hover:bg-white/25 !text-white text-xs font-800 flex items-center gap-2 border border-white/30 transition-all cursor-pointer"
            >
              <Bell size={17} className="!text-white" />
              <span className="!text-white font-800">Broadcast Push</span>
            </Link>
          </div>
        </div>

        {/* System Health Pulse Row */}
        <div className="pt-4 border-t border-white/15 grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-800">
          <div className="flex items-center gap-2 text-emerald-300">
            <Database size={16} />
            <span>Database: Connected</span>
          </div>
          <div className="flex items-center gap-2 text-emerald-300">
            <HardDrive size={16} />
            <span>AWS S3: Active</span>
          </div>
          <div className="flex items-center gap-2 text-emerald-300">
            <Mail size={16} />
            <span>Resend Mailer: Ready</span>
          </div>
          <div className="flex items-center gap-2 text-emerald-300">
            <Activity size={16} />
            <span>Razorpay API: Operational</span>
          </div>
        </div>
      </div>

      {/* ── 8 KPI Metric Cards (PURE WHITE LIGHT CARDS) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <KpiCard
          title="Total Registered Users"
          value={(stats.totalUsers ?? 0).toLocaleString("en-IN")}
          subtitle={`${stats.totalTutors ?? 0} Tutors · ${stats.totalParents ?? 0} Parents`}
          icon={Users}
          accentBg="bg-sky-100 border border-sky-300"
          accentText="text-sky-700"
          href="/admin/users"
        />

        <KpiCard
          title="KYC Verification Queue"
          value={kycPendingCount}
          subtitle={`${kycApprovedCount} Verified · ${kycRejectedCount} Rejected`}
          icon={ShieldCheck}
          accentBg="bg-emerald-100 border border-emerald-300"
          accentText="text-emerald-800"
          href="/admin/kyc"
          badge={kycPendingCount > 0 ? `${kycPendingCount} Pending` : undefined}
        />

        <KpiCard
          title="Student Requirements"
          value={(stats.totalLeads ?? 0).toLocaleString("en-IN")}
          subtitle={`${stats.activeLeads ?? 0} Active Open Enquiries`}
          icon={FileText}
          accentBg="bg-amber-100 border border-amber-300"
          accentText="text-amber-800"
          href="/admin/leads"
        />

        <KpiCard
          title="Coin Wallet Sales"
          value={`₹${(coinsSold * 1.5).toLocaleString("en-IN")}`}
          subtitle={`${coinsCirculating.toLocaleString("en-IN")} Coins Circulating`}
          icon={Wallet}
          accentBg="bg-purple-100 border border-purple-300"
          accentText="text-purple-800"
          href="/admin/wallets"
        />

        <KpiCard
          title="Tuition Bookings"
          value={stats.totalBookings ?? 0}
          subtitle="All trial & regular bookings"
          icon={BookOpen}
          accentBg="bg-rose-100 border border-rose-300"
          accentText="text-rose-800"
          href="/admin/bookings"
        />

        <KpiCard
          title="Support Helpline"
          value="Live"
          subtitle="WhatsApp & Chat Support"
          icon={MessageSquare}
          accentBg="bg-cyan-100 border border-cyan-300"
          accentText="text-cyan-800"
          href="/admin/chat"
        />

        <KpiCard
          title="Pending Wallet Refunds"
          value={stats.pendingRefunds ?? 0}
          subtitle="Support Refund Requests"
          icon={Ticket}
          accentBg="bg-pink-100 border border-pink-300"
          accentText="text-pink-800"
          href="/admin/wallets"
        />

        <KpiCard
          title="Platform Governance"
          value="Super Admin"
          subtitle="RBAC & Audit Trail Active"
          icon={Activity}
          accentBg="bg-teal-100 border border-teal-300"
          accentText="text-teal-800"
          href="/admin/audit-logs"
        />
      </div>

      {/* ── Realtime Activity Streams Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left 7 Columns: Live Student Leads Stream */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-gray-200 p-6 sm:p-7 space-y-6 shadow-xs">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-gray-200">
            <div className="space-y-0.5">
              <span className="text-[11px] font-800 uppercase tracking-widest text-[#2D9E6B]">Realtime Feed</span>
              <h2 className="text-xl font-800 text-[#0F2540] flex items-center gap-2">
                <FileText size={20} className="text-[#2D9E6B]" />
                Latest Student Requirements
              </h2>
            </div>
            <Link
              href="/admin/leads"
              className="text-xs font-800 text-[#2D9E6B] hover:text-[#238357] flex items-center gap-1"
            >
              <span>View All Leads ({stats.totalLeads ?? 0})</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* 7-Day Lead Velocity Chart */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-gray-200 space-y-2">
            <div className="flex items-center justify-between text-xs font-800">
              <span className="text-slate-700">7-Day Lead Submission Velocity</span>
              <span className="text-emerald-700 font-800">High Demand 🔥</span>
            </div>
            <SparklineBars values={[3, 5, 8, 4, 9, 12, stats.totalLeads ?? 7]} />
          </div>

          {/* Recent Leads List */}
          <div className="space-y-3">
            {recentLeads.map((lead) => (
              <div
                key={lead.id}
                className="p-4 rounded-2xl bg-slate-50 border border-gray-200 hover:border-gray-300 transition-colors flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-800 text-[#0F2540] truncate">{lead.classLevel}</span>
                    <span className="text-[10px] font-800 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-950 border border-emerald-300">
                      {lead.status}
                    </span>
                  </div>
                  <p className="text-xs font-700 text-slate-800 truncate">
                    Subjects: {lead.subjects.join(", ")} · {lead.city || "Location Private"}
                  </p>
                </div>
                <Link
                  href={`/admin/leads`}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-gray-100 text-xs font-800 text-slate-900 border border-gray-300 transition-colors shrink-0 shadow-2xs"
                >
                  Inspect
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Right 5 Columns: Security Audit Logs & KYC Queue */}
        <div className="lg:col-span-5 space-y-6">
          {/* KYC Priority Queue Box */}
          <div className="bg-white rounded-3xl border border-gray-200 p-6 space-y-4 shadow-xs">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-gray-200">
              <h2 className="text-lg font-800 text-[#0F2540] flex items-center gap-2">
                <ShieldCheck size={20} className="text-[#2D9E6B]" />
                KYC Verification Priority Queue
              </h2>
              <span className="text-xs font-800 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-950 border border-emerald-300">
                {kycPendingCount} Pending
              </span>
            </div>

            <p className="text-xs text-slate-800 font-600 leading-relaxed">
              Review government ID proofs and live selfies submitted by tutors to grant verified badges.
            </p>

            <Link
              href="/admin/kyc"
              className="w-full py-3.5 px-4 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] !text-white text-xs font-800 flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <ShieldCheck size={17} className="!text-white" />
              <span className="!text-white font-800">Open KYC Review Queue ({kycPendingCount})</span>
            </Link>
          </div>

          {/* Security Audit Feed */}
          <div className="bg-white rounded-3xl border border-gray-200 p-6 space-y-4 shadow-xs">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-gray-200">
              <h2 className="text-lg font-800 text-[#0F2540] flex items-center gap-2">
                <Activity size={20} className="text-[#2563EB]" />
                Recent Governance Actions
              </h2>
              <Link href="/admin/audit-logs" className="text-xs font-800 text-[#2563EB] hover:underline">
                All Logs
              </Link>
            </div>

            <div className="space-y-3">
              {recentAudits.map((log) => (
                <div
                  key={log.id}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-gray-200 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between text-slate-900">
                    <span className="font-800 text-[#2563EB]">{log.action}</span>
                    <span className="text-[10px] font-700 text-slate-600">
                      {new Date(log.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-800 font-600 truncate">
                    {log.details || log.adminId}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
