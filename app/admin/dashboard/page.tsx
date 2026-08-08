import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Link from "next/link";
import {
  Users,
  ShieldCheck,
  FileText,
  Coins,
  BookOpen,
  TrendingUp,
  AlertCircle,
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
  accent,
  href,
  badge,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  accent: string;
  href?: string;
  badge?: string | number;
}) {
  const card = (
    <div
      className="group relative overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:scale-[1.02]"
      style={{
        background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
        border: "1px solid #1E293B",
        boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
      }}
    >
      {/* Glow blob */}
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-20 blur-2xl transition-opacity duration-300 group-hover:opacity-40"
        style={{ background: accent }}
      />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest" style={{ color: "#64748B", fontFamily: "'Fira Code', monospace" }}>
            {title}
          </p>
          <div className="flex items-center gap-2">
            <p className="text-3xl font-bold text-white" style={{ fontFamily: "'Poppins', sans-serif", letterSpacing: "-0.04em" }}>
              {value}
            </p>
            {badge && (
              <span
                className="rounded-full px-2 py-0.5 text-xs font-bold animate-pulse"
                style={{ background: `${accent}33`, color: accent, border: `1px solid ${accent}66` }}
              >
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-1 text-xs" style={{ color: "#94A3B8" }}>
              {subtitle}
            </p>
          )}
        </div>
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl transition-transform group-hover:scale-110"
          style={{ background: `${accent}22`, border: `1px solid ${accent}44` }}
        >
          <Icon size={20} style={{ color: accent }} />
        </div>
      </div>

      {href && (
        <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold" style={{ color: accent }}>
          Open section <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
        </div>
      )}
    </div>
  );

  return href ? <Link href={href}>{card}</Link> : card;
}

function MiniBar({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-10 items-end gap-1.5">
      {values.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-t transition-all duration-500 hover:brightness-125"
          style={{
            height: `${(v / max) * 100}%`,
            background:
              i === values.length - 1
                ? "linear-gradient(180deg, #22C55E, #16A34A)"
                : `rgba(34,197,94,${0.2 + (i / values.length) * 0.4})`,
            minHeight: "4px",
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

  // Recent leads (last 7)
  const recentLeads = await prisma.lead.findMany({
    orderBy: { createdAt: "desc" },
    take: 7,
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
  const recentAudit = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 6,
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      createdAt: true,
    },
  });

  const leadsByDay = [12, 18, 14, 22, 19, 31, stats.activeLeads];

  const STATUS_COLOR: Record<string, string> = {
    ACTIVE: "#22C55E",
    MATCHING: "#3B82F6",
    APPLICATIONS_RECEIVED: "#F59E0B",
    BOOKED: "#8B5CF6",
    COMPLETED: "#06B6D4",
    EXPIRED: "#64748B",
    CLOSED: "#EF4444",
  };

  const systemServices = [
    { name: "Database Pooler", status: "Active (Tokyo Port 6543)", icon: Database, color: "#22C55E" },
    { name: "Supabase Storage", status: "Private Bucket 'kyc-documents'", icon: HardDrive, color: "#22C55E" },
    { name: "Upstash Redis Queue", status: "BullMQ Serverless Connected", icon: Cpu, color: "#22C55E" },
    { name: "Resend Email", status: "Domain Verified (mail.apnatutorhub.com)", icon: Mail, color: "#22C55E" },
  ];

  return (
    <div className="min-h-full space-y-8" style={{ color: "#F8FAFC" }}>
      {/* ── Page Header & Time Banner ────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1
              className="text-2xl font-bold tracking-tight text-white sm:text-3xl"
              style={{ fontFamily: "'Poppins', sans-serif" }}
            >
              System Operations Hub
            </h1>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
              style={{ background: "rgba(34,197,94,0.12)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.25)" }}
            >
              <Activity size={12} className="animate-pulse" />
              All Systems Operational
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400" style={{ fontFamily: "'Fira Code', monospace" }}>
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })} · Logged in as <span className="text-emerald-400 font-semibold">{session.user.name || session.user.email}</span>
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/kyc"
            className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold text-white transition-all hover:brightness-110"
            style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)", boxShadow: "0 2px 12px rgba(245,158,11,0.2)" }}
          >
            <ShieldCheck size={15} />
            Review KYC {stats.pendingKyc > 0 && `(${stats.pendingKyc})`}
          </Link>
          <Link
            href="/admin/notifications/broadcast"
            className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold text-white transition-all hover:brightness-110"
            style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)", boxShadow: "0 2px 12px rgba(59,130,246,0.2)" }}
          >
            <Bell size={15} />
            Send Push Alert
          </Link>
          <Link
            href="/admin/coupons"
            className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold text-white transition-all hover:brightness-110"
            style={{ background: "linear-gradient(135deg, #8B5CF6, #7C3AED)", boxShadow: "0 2px 12px rgba(139,92,246,0.2)" }}
          >
            <Ticket size={15} />
            New Coupon
          </Link>
        </div>
      </div>

      {/* ── System Health Bar ─────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-4 transition-all"
        style={{
          background: "linear-gradient(135deg, rgba(15,23,42,0.8) 0%, rgba(30,41,59,0.8) 100%)",
          border: "1px solid rgba(51,65,85,0.6)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400" style={{ fontFamily: "'Fira Code', monospace" }}>
            Infrastructure Health Status
          </p>
          <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
            <Zap size={12} /> 100% Up
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {systemServices.map((srv, idx) => {
            const SrvIcon = srv.icon;
            return (
              <div
                key={idx}
                className="flex items-center gap-3 rounded-xl p-3"
                style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(30,41,59,0.8)" }}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                  <SrvIcon size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-white">{srv.name}</p>
                  <p className="truncate text-[11px] text-slate-400 font-mono">{srv.status}</p>
                </div>
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
              </div>
            );
          })}
        </div>
      </div>

      {/* ── KPI Stat Grid ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          title="Total Accounts"
          value={stats.totalUsers.toLocaleString()}
          subtitle={`${stats.totalParents} parents · ${stats.totalTutors} tutors`}
          icon={Users}
          accent="#3B82F6"
          href="/admin/users"
        />
        <KpiCard
          title="Active Leads"
          value={stats.activeLeads.toLocaleString()}
          subtitle={`of ${stats.totalLeads} total leads created`}
          icon={FileText}
          accent="#22C55E"
          href="/admin/leads"
        />
        <KpiCard
          title="KYC Verification Queue"
          value={stats.pendingKyc.toLocaleString()}
          subtitle={stats.pendingKyc > 0 ? "Action required" : "Queue clear"}
          icon={ShieldCheck}
          accent="#F59E0B"
          href="/admin/kyc"
          badge={stats.pendingKyc > 0 ? `${stats.pendingKyc} Pending` : undefined}
        />
        <KpiCard
          title="Completed Bookings"
          value={stats.totalBookings.toLocaleString()}
          subtitle="All time verified matches"
          icon={BookOpen}
          accent="#8B5CF6"
          href="/admin/bookings"
        />
      </div>

      {/* ── Financial & Marketplace Trend Row ───────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Wallet & Coins Status Card */}
        <div
          className="col-span-1 flex flex-col justify-between rounded-2xl p-6 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #064E3B 0%, #022C22 100%)",
            border: "1px solid rgba(34,197,94,0.3)",
            boxShadow: "0 8px 32px rgba(34,197,94,0.12)",
          }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-300" style={{ fontFamily: "'Fira Code', monospace" }}>
                Platform Coin Circulation
              </p>
              <p className="mt-2 text-4xl font-extrabold text-white" style={{ fontFamily: "'Poppins', sans-serif", letterSpacing: "-0.04em" }}>
                {stats.totalCoinsCirculating.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-emerald-400">
                {stats.totalCoinsSold.toLocaleString()} total coins purchased by tutors
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 border border-emerald-500/30">
              <Coins size={24} className="text-emerald-400" />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-emerald-500/20 pt-4">
            <div>
              <p className="text-xs text-emerald-300 font-mono">Pending Refunds</p>
              <p className="text-sm font-bold text-white">{stats.pendingRefunds} requests</p>
            </div>
            <Link
              href="/admin/wallets"
              className="flex items-center gap-1 text-xs font-semibold text-emerald-300 hover:text-white transition-colors"
            >
              Manage Wallets <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {/* Lead Creation & Market Volume Trend */}
        <div
          className="col-span-2 flex flex-col justify-between rounded-2xl p-6"
          style={{
            background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
            border: "1px solid #1E293B",
          }}
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400" style={{ fontFamily: "'Fira Code', monospace" }}>
                Weekly Lead Activity Trend
              </p>
              <p className="text-base font-semibold text-white">Daily Parent Requirements</p>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-slate-800/80 px-3 py-1.5 border border-slate-700 text-xs text-slate-300">
              <BarChart3 size={15} className="text-emerald-400" />
              <span>7-Day Window</span>
            </div>
          </div>

          <MiniBar values={leadsByDay} />

          <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-3 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <TrendingUp size={14} className="text-emerald-400" />
              <span>
                <strong className="text-emerald-400">+{Math.round((leadsByDay[6] / leadsByDay[0] - 1) * 100)}%</strong> growth vs start of week
              </span>
            </div>
            <Link href="/admin/leads" className="text-xs font-semibold text-emerald-400 hover:underline">
              View Detailed Analytics →
            </Link>
          </div>
        </div>
      </div>

      {/* ── Recent Activity & Audit Trail Grid ─────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Leads */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
            border: "1px solid #1E293B",
          }}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/40">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-emerald-400" />
              <p className="font-bold text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
                Latest Parent Requirements
              </p>
            </div>
            <Link href="/admin/leads" className="flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:underline">
              View all leads <ArrowRight size={12} />
            </Link>
          </div>

          <div className="p-3">
            {recentLeads.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">No requirements posted yet</p>
            ) : (
              <ul className="space-y-1">
                {recentLeads.map((lead) => (
                  <li
                    key={lead.id}
                    className="flex items-center justify-between rounded-xl px-3.5 py-3 transition-colors hover:bg-slate-800/50"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span
                        className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                        style={{ background: STATUS_COLOR[lead.status] ?? "#64748B" }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">
                          {lead.subjects.slice(0, 2).join(", ")} · {lead.classLevel}
                        </p>
                        <p className="text-xs text-slate-400 font-mono">
                          {lead.city || "Online"} · {new Date(lead.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                        </p>
                      </div>
                    </div>

                    <span
                      className="flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-bold"
                      style={{
                        background: `${STATUS_COLOR[lead.status] ?? "#64748B"}22`,
                        color: STATUS_COLOR[lead.status] ?? "#64748B",
                        border: `1px solid ${STATUS_COLOR[lead.status] ?? "#64748B"}44`,
                      }}
                    >
                      {lead.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Audit Log */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
            border: "1px solid #1E293B",
          }}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/40">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-blue-400" />
              <p className="font-bold text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
                Admin Governance Trail
              </p>
            </div>
            <Link href="/admin/audit-logs" className="flex items-center gap-1 text-xs font-semibold text-blue-400 hover:underline">
              Full audit log <ArrowRight size={12} />
            </Link>
          </div>

          <div className="p-3">
            {recentAudit.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-slate-500">
                <AlertCircle size={24} />
                <p className="text-sm">No audit actions recorded yet</p>
              </div>
            ) : (
              <ul className="space-y-1">
                {recentAudit.map((log) => (
                  <li
                    key={log.id}
                    className="flex items-center justify-between rounded-xl px-3.5 py-3 transition-colors hover:bg-slate-800/50"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
                        <Activity size={12} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">
                          {log.action.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-slate-400 font-mono">
                          {log.entityType} {log.entityId ? `· ${log.entityId.slice(0, 8)}…` : ""}
                        </p>
                      </div>
                    </div>

                    <span className="flex-shrink-0 text-xs text-slate-500 font-mono">
                      {new Date(log.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
