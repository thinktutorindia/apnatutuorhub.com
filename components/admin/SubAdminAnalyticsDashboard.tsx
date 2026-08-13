"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import type { SubAdminAnalyticsData, SubAdminStat } from "@/app/actions/subadmin-analytics.actions";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import {
  Users,
  Activity,
  ShieldCheck,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Wallet,
  MessageSquare,
  Star,
  ChevronRight,
  Award,
  Zap,
  ArrowUpRight,
  Flame,
  BarChart2,
} from "lucide-react";

// ─── Constants ─────────────────────────────────────────────────────────────────

const DEPT_COLORS: Record<string, string> = {
  VERIFICATION: "#7C3AED",
  SUPPORT: "#0284C7",
  FINANCE: "#16A34A",
  OPERATIONS: "#EA580C",
  MARKETING: "#DB2777",
  UNASSIGNED: "#94A3B8",
};

const DEPT_LABEL: Record<string, string> = {
  VERIFICATION: "Verification",
  SUPPORT: "Support",
  FINANCE: "Finance",
  OPERATIONS: "Operations",
  MARKETING: "Marketing",
  UNASSIGNED: "Unassigned",
};

const ACTION_LABEL: Record<string, string> = {
  KYC_APPROVE: "KYC Approved",
  KYC_REJECT: "KYC Rejected",
  SUSPEND_USER: "User Suspended",
  REACTIVATE_USER: "User Reactivated",
  WALLET_ADMIN_CREDIT: "Wallet Credit",
  WALLET_ADMIN_DEBIT: "Wallet Debit",
  LEAD_FORCE_CLOSE: "Lead Closed",
  LEAD_FORCE_EXPIRE: "Lead Expired",
  LEAD_FORCE_RADIUS_EXPAND: "Lead Radius Expand",
  SETTING_UPDATE: "Setting Updated",
  ADMIN_RESET_PASSWORD: "Password Reset",
  DELETE_USER: "User Deleted",
};

const CHART_COLORS = ["#2D9E6B", "#1A3C5E", "#7C3AED", "#EA580C", "#DB2777", "#0284C7", "#16A34A", "#D97706"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function fmtDateTime(iso: string | null) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDeptColor(dept: string | null) {
  return DEPT_COLORS[dept ?? "UNASSIGNED"] ?? "#94A3B8";
}

function getDeptLabel(dept: string | null) {
  return DEPT_LABEL[dept ?? "UNASSIGNED"] ?? dept ?? "Unassigned";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KPICard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: any;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-extrabold text-slate-600 uppercase tracking-wide">{label}</span>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: color + "22", color }}
        >
          <Icon size={18} />
        </div>
      </div>
      <p className="text-2xl font-black" style={{ color, fontFamily: "Poppins, sans-serif" }}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-slate-500 font-semibold">{sub}</p>}
    </div>
  );
}

function MiniSparkline({ data }: { data: { date: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={48}>
      <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2D9E6B" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#2D9E6B" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="count" stroke="#2D9E6B" strokeWidth={2} fill="url(#spark)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Staff Profile Card ────────────────────────────────────────────────────────

function StaffCard({
  stat,
  isMostActive,
  selected,
  onClick,
}: {
  stat: SubAdminStat;
  isMostActive: boolean;
  selected: boolean;
  onClick: () => void;
}) {
  const deptColor = getDeptColor(stat.department);
  const initials = stat.name
    ? stat.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : stat.email.slice(0, 2).toUpperCase();

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer ${
        selected
          ? "border-[#2D9E6B] bg-emerald-50 shadow-md"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-black shrink-0"
          style={{ backgroundColor: deptColor }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-black text-[#0F2540] truncate">
              {stat.name || stat.email.split("@")[0]}
            </p>
            {isMostActive && (
              <span className="text-[9px] font-black text-amber-700 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full shrink-0">
                🔥 TOP
              </span>
            )}
            <span
              className={`text-[9px] font-black px-2 py-0.5 rounded-full shrink-0 ${
                stat.isActive ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
              }`}
            >
              {stat.isActive ? "Active" : "Suspended"}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-semibold truncate">{stat.email}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span
              className="text-[10px] font-black px-2.5 py-0.5 rounded-full"
              style={{ backgroundColor: deptColor + "22", color: deptColor }}
            >
              {getDeptLabel(stat.department)}
            </span>
            <span className="text-[11px] text-slate-600 font-bold">
              {stat.totalActions} actions
            </span>
          </div>
        </div>
        <ChevronRight size={16} className={`shrink-0 mt-1 ${selected ? "text-[#2D9E6B]" : "text-slate-300"}`} />
      </div>
      <MiniSparkline data={stat.dailyActivity} />
    </button>
  );
}

// ─── Staff Detail Panel ────────────────────────────────────────────────────────

function StaffDetailPanel({
  stat,
  isMostActive,
}: {
  stat: SubAdminStat;
  isMostActive: boolean;
}) {
  const deptColor = getDeptColor(stat.department);

  const metricCards = [
    { label: "Total Actions", value: stat.totalActions, icon: Activity, color: "#1A3C5E" },
    { label: "Last 7 Days", value: stat.actionsLast7Days, icon: Zap, color: "#7C3AED" },
    { label: "Last 30 Days", value: stat.actionsLast30Days, icon: TrendingUp, color: "#2D9E6B" },
    { label: "Staff Notes", value: stat.notesAuthored, icon: MessageSquare, color: "#0284C7" },
    { label: "KYC Approved", value: stat.kycApprovals, icon: CheckCircle2, color: "#16A34A" },
    { label: "KYC Rejected", value: stat.kycRejections, icon: XCircle, color: "#DC2626" },
    { label: "Suspensions", value: stat.suspensions, icon: ShieldCheck, color: "#D97706" },
    { label: "Wallet Ops", value: stat.walletAdjustments, icon: Wallet, color: "#DB2777" },
  ];

  return (
    <div className="space-y-5">
      {/* Profile Header */}
      <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4">
        <div className="flex items-start gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-lg font-black shrink-0"
            style={{ backgroundColor: deptColor }}
          >
            {stat.name
              ? stat.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
              : stat.email.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xl font-black text-[#0F2540]">{stat.name || "Unnamed"}</h3>
              {isMostActive && (
                <span className="text-xs font-black text-amber-700 bg-amber-100 border border-amber-300 px-3 py-1 rounded-full">
                  🔥 Most Active Staff
                </span>
              )}
            </div>
            <p className="text-sm text-slate-600 font-semibold">{stat.email}</p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span
                className="text-xs font-black px-3 py-1 rounded-full"
                style={{ backgroundColor: deptColor + "22", color: deptColor }}
              >
                {getDeptLabel(stat.department)} Dept
              </span>
              <span
                className={`text-xs font-black px-3 py-1 rounded-full border ${
                  stat.isActive
                    ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                    : "bg-red-100 text-red-900 border-red-300"
                }`}
              >
                {stat.isActive ? "Active Staff" : "Suspended"}
              </span>
            </div>
          </div>
          <Link
            href={`/admin/users/${stat.id}/edit`}
            className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0F2540] text-white text-xs font-black hover:bg-[#1A3C5E] transition-all"
          >
            <ArrowUpRight size={14} />
            Edit User
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs text-slate-600 font-bold">
          <div>
            <span className="text-slate-400 font-extrabold block">Joined</span>
            {fmtDateTime(stat.joinedAt)}
          </div>
          <div>
            <span className="text-slate-400 font-extrabold block">First Action</span>
            {fmtDateTime(stat.firstActionAt)}
          </div>
          <div>
            <span className="text-slate-400 font-extrabold block">Last Action</span>
            {fmtDateTime(stat.lastActionAt)}
          </div>
          <div>
            <span className="text-slate-400 font-extrabold block">Dept.</span>
            {getDeptLabel(stat.department)}
          </div>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {metricCards.map((m) => (
          <div
            key={m.label}
            className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-1.5 text-center"
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center mx-auto"
              style={{ backgroundColor: m.color + "22", color: m.color }}
            >
              <m.icon size={16} />
            </div>
            <p className="text-2xl font-black" style={{ color: m.color, fontFamily: "Poppins,sans-serif" }}>
              {m.value}
            </p>
            <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Daily Activity Chart */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        <h4 className="text-sm font-black text-[#0F2540] flex items-center gap-2">
          <BarChart2 size={16} className="text-[#2D9E6B]" />
          Daily Activity — Last 30 Days
        </h4>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={stat.dailyActivity} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="staffArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={deptColor} stopOpacity={0.25} />
                <stop offset="95%" stopColor={deptColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "#94A3B8", fontWeight: 700 }}
              tickFormatter={(v) => fmtDate(v)}
              interval={4}
              axisLine={false}
              tickLine={false}
            />
            <YAxis tick={{ fontSize: 10, fill: "#94A3B8", fontWeight: 700 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ fontSize: 11, fontWeight: 700, borderRadius: 12, border: "1px solid #E2E8F0" }}
              labelFormatter={(v) => fmtDate(String(v))}
              formatter={(v: any) => [v, "Actions"]}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke={deptColor}
              strokeWidth={2.5}
              fill="url(#staffArea)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Top Actions Bar Chart */}
      {stat.topActions.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
          <h4 className="text-sm font-black text-[#0F2540] flex items-center gap-2">
            <Star size={16} className="text-amber-500" />
            Top Actions Performed
          </h4>
          <div className="space-y-2.5">
            {stat.topActions.map((a, i) => {
              const max = stat.topActions[0]?.count || 1;
              const pct = Math.round((a.count / max) * 100);
              return (
                <div key={a.action} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-700">{ACTION_LABEL[a.action] || a.action}</span>
                    <span className="text-[#0F2540] font-black">{a.count}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SubAdminAnalyticsDashboard({ data }: { data: SubAdminAnalyticsData }) {
  const [selectedId, setSelectedId] = useState<string | null>(
    data.subAdmins[0]?.id ?? null
  );

  const selectedStat = useMemo(
    () => data.subAdmins.find((s) => s.id === selectedId) ?? null,
    [data.subAdmins, selectedId]
  );

  // Sort sub-admins by total actions (most active first)
  const sortedSubAdmins = useMemo(
    () => [...data.subAdmins].sort((a, b) => b.totalActions - a.totalActions),
    [data.subAdmins]
  );

  const mostActiveId = data.platformTotals.mostActiveId;

  return (
    <div className="space-y-7">
      {/* ── Platform KPI Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KPICard
          label="Total Staff Actions"
          value={data.platformTotals.totalAuditActions}
          sub="All time, all sub-admins"
          icon={Activity}
          color="#1A3C5E"
        />
        <KPICard
          label="Actions (30 Days)"
          value={data.platformTotals.last30DaysActions}
          sub="Recent team activity"
          icon={TrendingUp}
          color="#2D9E6B"
        />
        <KPICard
          label="Active Staff"
          value={data.platformTotals.activeSubAdmins}
          sub={`of ${data.subAdmins.length} total members`}
          icon={Users}
          color="#7C3AED"
        />
        <KPICard
          label="Departments"
          value={data.departmentBreakdown.length}
          sub="Unique teams active"
          icon={Award}
          color="#EA580C"
        />
      </div>

      {/* ── Team Trend Chart ── */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-[#0F2540] flex items-center gap-2">
            <Flame size={18} className="text-orange-500" />
            Team Daily Activity Trend — Last 30 Days
          </h2>
          <span className="text-xs font-black text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            All Sub-Admins Combined
          </span>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data.teamDailyTrend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="teamGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2D9E6B" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#2D9E6B" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "#94A3B8", fontWeight: 700 }}
              tickFormatter={(v) => fmtDate(v)}
              interval={4}
              axisLine={false}
              tickLine={false}
            />
            <YAxis tick={{ fontSize: 10, fill: "#94A3B8", fontWeight: 700 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ fontSize: 11, fontWeight: 700, borderRadius: 12, border: "1px solid #E2E8F0" }}
              labelFormatter={(v) => fmtDate(String(v))}
              formatter={(v: any) => [v, "Team Actions"]}
            />
            <Area type="monotone" dataKey="count" stroke="#2D9E6B" strokeWidth={2.5} fill="url(#teamGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Action & Department Breakdown Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Action Breakdown */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-black text-[#0F2540] flex items-center gap-2">
            <BarChart2 size={18} className="text-[#1A3C5E]" />
            Platform-Wide Action Breakdown
          </h2>
          {data.actionBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={data.actionBreakdown.map((a) => ({
                  name: ACTION_LABEL[a.action] || a.action.replace(/_/g, " "),
                  count: a.count,
                }))}
                layout="vertical"
                margin={{ top: 0, right: 10, left: 5, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#94A3B8", fontWeight: 700 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: 9, fill: "#475569", fontWeight: 700 }}
                  width={110}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{ fontSize: 11, fontWeight: 700, borderRadius: 12, border: "1px solid #E2E8F0" }}
                  formatter={(v: any) => [v, "Actions"]}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {data.actionBreakdown.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="py-12 text-center text-slate-400 text-sm font-semibold">
              No audit log actions recorded yet.
            </div>
          )}
        </div>

        {/* Department Breakdown Donut */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-black text-[#0F2540] flex items-center gap-2">
            <Users size={18} className="text-[#7C3AED]" />
            Activity by Department
          </h2>
          {data.departmentBreakdown.length > 0 ? (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <ResponsiveContainer width={200} height={200}>
                <PieChart>
                  <Pie
                    data={data.departmentBreakdown}
                    dataKey="count"
                    nameKey="dept"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                  >
                    {data.departmentBreakdown.map((entry, i) => (
                      <Cell key={i} fill={DEPT_COLORS[entry.dept] || CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ fontSize: 11, fontWeight: 700, borderRadius: 12 }}
                    formatter={(v: any, _: any, props: any) => [v, getDeptLabel(props.payload?.dept)]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 flex-1">
                {data.departmentBreakdown.map((d) => {
                  const total = data.platformTotals.totalAuditActions || 1;
                  const pct = Math.round((d.count / total) * 100);
                  return (
                    <div key={d.dept} className="flex items-center gap-2.5 text-xs font-bold">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: DEPT_COLORS[d.dept] || "#94A3B8" }}
                      />
                      <span className="text-slate-700 flex-1">{getDeptLabel(d.dept)}</span>
                      <span className="text-[#0F2540] font-black">{d.count}</span>
                      <span className="text-slate-400 text-[10px] w-8 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-sm font-semibold">
              No department activity data yet.
            </div>
          )}
        </div>
      </div>

      {/* ── Staff Leaderboard + Detail Panel ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-5">
        {/* Staff List Sidebar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-[#0F2540] flex items-center gap-2">
              <Users size={18} className="text-[#2D9E6B]" />
              Staff Leaderboard
            </h2>
            <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
              {data.subAdmins.length} members
            </span>
          </div>
          <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
            {sortedSubAdmins.length > 0 ? (
              sortedSubAdmins.map((stat) => (
                <StaffCard
                  key={stat.id}
                  stat={stat}
                  isMostActive={stat.id === mostActiveId}
                  selected={selectedId === stat.id}
                  onClick={() => setSelectedId(stat.id)}
                />
              ))
            ) : (
              <div className="p-8 text-center rounded-2xl bg-white border border-slate-200 text-sm text-slate-400 font-semibold">
                No sub-admins created yet. Create them in Staff Management.
              </div>
            )}
          </div>
        </div>

        {/* Staff Detail Panel */}
        <div>
          {selectedStat ? (
            <StaffDetailPanel
              stat={selectedStat}
              isMostActive={selectedStat.id === mostActiveId}
            />
          ) : (
            <div className="p-12 text-center rounded-3xl bg-white border border-slate-200 text-slate-400 font-semibold text-sm">
              Select a staff member from the leaderboard to see their detailed activity report.
            </div>
          )}
        </div>
      </div>

      {/* ── Comparison Bar Chart across all sub-admins ── */}
      {data.subAdmins.length > 0 && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-black text-[#0F2540] flex items-center gap-2">
            <TrendingUp size={18} className="text-[#2D9E6B]" />
            Staff Performance Comparison — Total vs Last 30 Days
          </h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={sortedSubAdmins.map((s) => ({
                name: (s.name || s.email.split("@")[0]).slice(0, 12),
                "Total Actions": s.totalActions,
                "Last 30 Days": s.actionsLast30Days,
                "Last 7 Days": s.actionsLast7Days,
              }))}
              margin={{ top: 5, right: 10, left: -15, bottom: 5 }}
              barCategoryGap="25%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#475569", fontWeight: 700 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94A3B8", fontWeight: 700 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ fontSize: 11, fontWeight: 700, borderRadius: 12, border: "1px solid #E2E8F0" }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, fontWeight: 700, paddingTop: 12 }}
                iconType="circle"
              />
              <Bar dataKey="Total Actions" fill="#1A3C5E" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Last 30 Days" fill="#2D9E6B" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Last 7 Days" fill="#7C3AED" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
