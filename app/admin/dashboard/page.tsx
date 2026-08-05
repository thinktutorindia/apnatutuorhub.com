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
} from "lucide-react";
import { getAdminDashboardStats } from "@/app/actions/admin.actions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin Dashboard — ThinkTutor" };

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accent,
  href,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  accent: string;
  href?: string;
}) {
  const card = (
    <div
      className="group relative overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:scale-[1.02]"
      style={{
        background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
        border: "1px solid #1E293B",
        boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
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
          <p className="text-3xl font-bold text-white" style={{ fontFamily: "'Poppins', sans-serif", letterSpacing: "-0.04em" }}>
            {value}
          </p>
          {subtitle && (
            <p className="mt-1 text-xs" style={{ color: "#475569" }}>
              {subtitle}
            </p>
          )}
        </div>
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ background: `${accent}22`, border: `1px solid ${accent}44` }}
        >
          <Icon size={18} style={{ color: accent }} />
        </div>
      </div>

      {href && (
        <div className="mt-4 flex items-center gap-1 text-xs font-medium" style={{ color: accent }}>
          View details <ArrowRight size={12} />
        </div>
      )}
    </div>
  );

  return href ? <Link href={href}>{card}</Link> : card;
}

function MiniBar({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-8 items-end gap-1">
      {values.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-t transition-all duration-500"
          style={{
            height: `${(v / max) * 100}%`,
            background:
              i === values.length - 1
                ? "#22C55E"
                : `rgba(34,197,94,${0.2 + (i / values.length) * 0.4})`,
            minHeight: "4px",
          }}
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

  const leadsByDay = [12, 18, 9, 22, 15, 30, stats.activeLeads];

  const STATUS_COLOR: Record<string, string> = {
    ACTIVE: "#22C55E",
    MATCHING: "#3B82F6",
    APPLICATIONS_RECEIVED: "#F59E0B",
    BOOKED: "#8B5CF6",
    COMPLETED: "#06B6D4",
    EXPIRED: "#64748B",
    CLOSED: "#EF4444",
  };

  return (
    <div className="min-h-full" style={{ color: "#F8FAFC" }}>
      {/* Page header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "'Poppins', sans-serif", letterSpacing: "-0.04em", color: "#F8FAFC" }}
          >
            Platform Overview
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: "#475569", fontFamily: "'Fira Code', monospace" }}>
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
            style={{ background: "rgba(34,197,94,0.1)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.2)" }}
          >
            <Activity size={10} />
            Live
          </span>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          title="Total Users"
          value={stats.totalUsers.toLocaleString()}
          subtitle={`${stats.totalParents} parents · ${stats.totalTutors} tutors`}
          icon={Users}
          accent="#3B82F6"
          href="/admin/users"
        />
        <KpiCard
          title="Active Leads"
          value={stats.activeLeads.toLocaleString()}
          subtitle={`of ${stats.totalLeads} total leads`}
          icon={FileText}
          accent="#22C55E"
          href="/admin/leads"
        />
        <KpiCard
          title="KYC Pending"
          value={stats.pendingKyc.toLocaleString()}
          subtitle="awaiting review"
          icon={ShieldCheck}
          accent="#F59E0B"
          href="/admin/kyc"
        />
        <KpiCard
          title="Total Bookings"
          value={stats.totalBookings.toLocaleString()}
          subtitle="all time"
          icon={BookOpen}
          accent="#8B5CF6"
        />
      </div>

      {/* Second row: Coins + trend */}
      <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div
          className="col-span-1 rounded-2xl p-5"
          style={{
            background: "linear-gradient(135deg, #064E3B 0%, #022C22 100%)",
            border: "1px solid rgba(34,197,94,0.2)",
            boxShadow: "0 4px 24px rgba(34,197,94,0.08)",
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#6EE7B7", fontFamily: "'Fira Code', monospace" }}>
                Coins Circulating
              </p>
              <p className="mt-1 text-3xl font-bold text-white" style={{ fontFamily: "'Poppins', sans-serif", letterSpacing: "-0.04em" }}>
                {stats.totalCoinsCirculating.toLocaleString()}
              </p>
              <p className="mt-1 text-xs" style={{ color: "#059669" }}>
                {stats.totalCoinsSold.toLocaleString()} total sold
              </p>
            </div>
            <Coins size={36} style={{ color: "#22C55E", opacity: 0.6 }} />
          </div>
        </div>

        <div
          className="col-span-2 rounded-2xl p-5"
          style={{
            background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
            border: "1px solid #1E293B",
          }}
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#64748B", fontFamily: "'Fira Code', monospace" }}>
                Lead Activity
              </p>
              <p className="text-sm font-semibold text-white">Last 7 days</p>
            </div>
            <BarChart3 size={16} style={{ color: "#22C55E" }} />
          </div>
          <MiniBar values={leadsByDay} />
          <div className="mt-2 flex items-center gap-1 text-xs" style={{ color: "#475569" }}>
            <TrendingUp size={12} style={{ color: "#22C55E" }} />
            <span>
              <span style={{ color: "#22C55E" }}>+{Math.round((leadsByDay[6] / leadsByDay[0] - 1) * 100)}%</span> vs last week
            </span>
          </div>
        </div>
      </div>

      {/* Bottom: Recent Leads + Audit Log */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Leads */}
        <div
          className="rounded-2xl"
          style={{
            background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
            border: "1px solid #1E293B",
          }}
        >
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid #1E293B" }}>
            <p className="font-semibold text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
              Recent Leads
            </p>
            <Link href="/admin/leads" className="flex items-center gap-1 text-xs font-medium" style={{ color: "#22C55E" }}>
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="p-2">
            {recentLeads.length === 0 ? (
              <p className="py-8 text-center text-sm" style={{ color: "#475569" }}>No leads yet</p>
            ) : (
              <ul>
                {recentLeads.map((lead) => (
                  <li
                    key={lead.id}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/5"
                  >
                    <span
                      className="h-2 w-2 flex-shrink-0 rounded-full"
                      style={{ background: STATUS_COLOR[lead.status] ?? "#475569" }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">
                        {lead.subjects.slice(0, 2).join(", ")} · {lead.classLevel}
                      </p>
                      <p className="text-xs" style={{ color: "#475569" }}>
                        {lead.city || "—"} · {new Date(lead.createdAt).toLocaleDateString("en-IN")}
                      </p>
                    </div>
                    <span
                      className="flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold"
                      style={{
                        background: `${STATUS_COLOR[lead.status] ?? "#475569"}22`,
                        color: STATUS_COLOR[lead.status] ?? "#475569",
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
          className="rounded-2xl"
          style={{
            background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
            border: "1px solid #1E293B",
          }}
        >
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid #1E293B" }}>
            <p className="font-semibold text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
              Recent Admin Actions
            </p>
            <Link href="/admin/audit-logs" className="flex items-center gap-1 text-xs font-medium" style={{ color: "#22C55E" }}>
              Full log <ArrowRight size={12} />
            </Link>
          </div>
          <div className="p-2">
            {recentAudit.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8">
                <AlertCircle size={24} style={{ color: "#334155" }} />
                <p className="text-sm" style={{ color: "#475569" }}>No admin actions yet</p>
              </div>
            ) : (
              <ul>
                {recentAudit.map((log) => (
                  <li
                    key={log.id}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                  >
                    <div
                      className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
                      style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.2)" }}
                    >
                      <Activity size={12} style={{ color: "#3B82F6" }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">
                        {log.action.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs" style={{ color: "#475569", fontFamily: "'Fira Code', monospace" }}>
                        {log.entityType}
                        {log.entityId ? ` · ${log.entityId.slice(0, 8)}…` : ""}
                      </p>
                    </div>
                    <span className="flex-shrink-0 text-xs" style={{ color: "#334155" }}>
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
