"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  Calendar, Users, PhoneCall, CheckCircle2, Star, RefreshCcw,
  PhoneMissed, Flame, Download, Filter, Search, ChevronDown,
  ChevronRight, ArrowUpRight, TrendingUp, Sparkles, Layers,
  Clock, Shield, BarChart3, ArrowLeft, RefreshCw, Loader2,
  Coffee, Timer, CheckCheck, X, Eye, Phone, MapPin, Award
} from "lucide-react";
import {
  getStaffDailyWorkReportsAction,
  getWorkSessionCallLogsAction,
  StaffWorkSessionReportItem
} from "@/app/actions/staff-leads.actions";

type DailyBreakdownItem = {
  dateKey: string;
  displayDate: string;
  totalCalls: number;
  answered: number;
  interested: number;
  callbacks: number;
  converted: number;
  noAnswer: number;
  activeStaffCount: number;
  staffDetails: Array<{
    staffId: string;
    staffName: string;
    subAdminRole: string | null;
    calls: number;
    answered: number;
    converted: number;
  }>;
};

type StaffMatrixItem = {
  staffId: string;
  staffName: string;
  email: string;
  subAdminRole: string | null;
  totalCalls: number;
  totalHoursLogged: number;
  totalShifts: number;
  answered: number;
  converted: number;
  callbacks: number;
  noAnswer: number;
  activeDays: number;
  avgCallsPerDay: number;
  currentAssigned: number;
  followUpsDue: number;
};

type SessionCallLog = {
  id: string;
  outcome: string;
  notes: string | null;
  calledAt: string;
  lead: {
    id: string;
    name: string | null;
    phone: string | null;
    location: string | null;
    status: string;
  };
};

interface Props {
  initialWorkSessions: StaffWorkSessionReportItem[];
  initialDailyBreakdown: DailyBreakdownItem[];
  initialStaffWeeklyMatrix: StaffMatrixItem[];
  initialPeriodSummary: {
    totalCalls: number;
    totalAnswered: number;
    totalConverted: number;
    totalCallbacks: number;
    totalNoAnswer: number;
    totalHoursWorked: number;
    totalShifts: number;
    answerRate: number;
    conversionRate: number;
  };
  staffList: Array<{ id: string; name: string | null; email: string }>;
  isSuperAdmin: boolean;
}

function formatMinutes(mins: number | null): string {
  if (mins === null || mins === undefined) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatTime(isoString: string | null): string {
  if (!isoString) return "—";
  const d = new Date(isoString);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

export function StaffCrmReportsClient({
  initialWorkSessions,
  initialDailyBreakdown,
  initialStaffWeeklyMatrix,
  initialPeriodSummary,
  staffList,
  isSuperAdmin,
}: Props) {
  const [workSessions, setWorkSessions] = useState(initialWorkSessions);
  const [dailyBreakdown, setDailyBreakdown] = useState(initialDailyBreakdown);
  const [staffWeeklyMatrix, setStaffWeeklyMatrix] = useState(initialStaffWeeklyMatrix);
  const [periodSummary, setPeriodSummary] = useState(initialPeriodSummary);

  const [activePeriod, setActivePeriod] = useState<"today" | "yesterday" | "7days" | "30days" | "all" | "custom">("30days");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState("all");
  const [expandedDateKeys, setExpandedDateKeys] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"TIMESHEETS" | "DAILY" | "STAFF_MATRIX">("TIMESHEETS");
  const [searchStaff, setSearchStaff] = useState("");

  // Modal for Shift Call Logs Drill-down
  const [selectedSessionModal, setSelectedSessionModal] = useState<{
    session: StaffWorkSessionReportItem;
    callLogs: SessionCallLog[];
  } | null>(null);
  const [loadingSessionLogs, setLoadingSessionLogs] = useState(false);

  const [isPending, startTransition] = useTransition();

  const toggleExpandDate = (dateKey: string) => {
    setExpandedDateKeys((prev) => {
      const next = new Set(prev);
      if (next.has(dateKey)) next.delete(dateKey);
      else next.add(dateKey);
      return next;
    });
  };

  const fetchReports = (opts: { start?: string; end?: string; staff?: string }) => {
    startTransition(async () => {
      const res = await getStaffDailyWorkReportsAction({
        startDate: opts.start ?? startDate,
        endDate: opts.end ?? endDate,
        staffId: opts.staff ?? selectedStaffId,
      });

      if (res.success && res.data) {
        setWorkSessions(res.data.workSessions || []);
        setDailyBreakdown(res.data.dailyBreakdown);
        setStaffWeeklyMatrix(res.data.staffWeeklyMatrix);
        setPeriodSummary(res.data.periodSummary);
      }
    });
  };

  const handlePeriodChange = (period: "today" | "yesterday" | "7days" | "30days" | "all" | "custom") => {
    setActivePeriod(period);
    const now = new Date();
    let s = "";
    let e = "";

    if (period === "today") {
      s = now.toISOString().split("T")[0];
      e = s;
    } else if (period === "yesterday") {
      const y = new Date(now.getTime() - 86400000);
      s = y.toISOString().split("T")[0];
      e = s;
    } else if (period === "7days") {
      const past = new Date(now.getTime() - 7 * 86400000);
      s = past.toISOString().split("T")[0];
      e = now.toISOString().split("T")[0];
    } else if (period === "30days") {
      const past = new Date(now.getTime() - 30 * 86400000);
      s = past.toISOString().split("T")[0];
      e = now.toISOString().split("T")[0];
    } else if (period === "all") {
      s = "";
      e = "";
    }

    setStartDate(s);
    setEndDate(e);
    if (period !== "custom") {
      fetchReports({ start: s, end: e });
    }
  };

  const handleStaffChange = (staffId: string) => {
    setSelectedStaffId(staffId);
    fetchReports({ staff: staffId });
  };

  const openShiftLogs = async (session: StaffWorkSessionReportItem) => {
    setLoadingSessionLogs(true);
    const res = await getWorkSessionCallLogsAction(session.id);
    if (res.success && res.data) {
      setSelectedSessionModal({
        session: res.data.session,
        callLogs: res.data.callLogs as SessionCallLog[],
      });
    }
    setLoadingSessionLogs(false);
  };

  const filteredSessions = workSessions.filter((ws) => {
    if (!searchStaff) return true;
    const q = searchStaff.toLowerCase();
    return ws.staffName.toLowerCase().includes(q) || ws.email.toLowerCase().includes(q);
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* ── Top Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/admin/staff-leads"
              className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1"
            >
              <ArrowLeft size={12} /> Back to CRM
            </Link>
            <span className="text-slate-300">·</span>
            <span className="text-[11px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200">
              Timesheets &amp; Daily Work Intelligence
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Staff Shifts, Timesheets &amp; Work Reports
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time daily timesheets, login/logout timestamps, calls made, conversions, and shift drill-downs across all staff.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/admin/staff-leads/my-dashboard"
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-slate-800 flex items-center gap-1.5 shadow-xs"
          >
            <Clock size={14} className="text-emerald-400" /> My Shift Dashboard
          </Link>
          <Link
            href="/admin/staff-leads/manage"
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50"
          >
            <Shield size={14} className="text-purple-600" /> CRM Ops &amp; Allocate
          </Link>
        </div>
      </div>

      {/* ── Filter Controls Bar ── */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* Period quick filters */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 flex-wrap">
            {[
              { key: "today", label: "Today" },
              { key: "yesterday", label: "Yesterday" },
              { key: "7days", label: "Last 7 Days" },
              { key: "30days", label: "Last 30 Days" },
              { key: "all", label: "All Time" },
              { key: "custom", label: "Custom Range" },
            ].map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => handlePeriodChange(p.key as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  activePeriod === p.key
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Staff filter dropdown (for super admin) */}
          {isSuperAdmin && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Staff:</span>
              <select
                value={selectedStaffId}
                onChange={(e) => handleStaffChange(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Team Members ({staffList.length})</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name || s.email}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Custom date range picker */}
        {activePeriod === "custom" && (
          <div className="flex items-center gap-3 pt-3 border-t border-slate-100 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium bg-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium bg-white"
              />
            </div>
            <button
              onClick={() => fetchReports({})}
              disabled={isPending}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1 cursor-pointer"
            >
              {isPending ? <Loader2 size={12} className="animate-spin" /> : <Filter size={12} />} Apply Dates
            </button>
          </div>
        )}
      </div>

      {/* ── KPI Summary Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Total Shifts", value: periodSummary.totalShifts, icon: Clock, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Hours Worked", value: `${periodSummary.totalHoursWorked}h`, icon: Timer, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Calls Logged", value: periodSummary.totalCalls.toLocaleString(), icon: PhoneCall, color: "text-slate-800", bg: "bg-slate-50" },
          { label: "Answered", value: periodSummary.totalAnswered.toLocaleString(), sub: `${periodSummary.answerRate}% rate`, icon: CheckCircle2, color: "text-teal-600", bg: "bg-teal-50" },
          { label: "Callbacks", value: periodSummary.totalCallbacks.toLocaleString(), icon: RefreshCcw, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Conversions", value: periodSummary.totalConverted.toLocaleString(), sub: `${periodSummary.conversionRate}% rate`, icon: Star, color: "text-emerald-600", bg: "bg-emerald-50" },
        ].map(({ label, value, sub, icon: Icon, color, bg }) => (
          <div key={label} className={`${bg} rounded-2xl p-4 border border-white/80`}>
            <Icon size={16} className={`${color} mb-1.5`} />
            <p className="text-2xl font-black text-slate-900">{value}</p>
            <p className="text-[11px] font-bold text-slate-500 mt-0.5">{label}</p>
            {sub && <span className="text-[10px] font-extrabold text-slate-400">{sub}</span>}
          </div>
        ))}
      </div>

      {/* ── View Mode Switcher Tabs ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          <button
            onClick={() => setActiveTab("TIMESHEETS")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "TIMESHEETS"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Clock size={14} className={activeTab === "TIMESHEETS" ? "text-indigo-600" : ""} />
            🕒 Shift Timesheets &amp; Login Logs ({filteredSessions.length})
          </button>

          <button
            onClick={() => setActiveTab("DAILY")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "DAILY"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Calendar size={14} className={activeTab === "DAILY" ? "text-blue-600" : ""} />
            📊 Daily Team Aggregate ({dailyBreakdown.length} Days)
          </button>

          <button
            onClick={() => setActiveTab("STAFF_MATRIX")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "STAFF_MATRIX"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Award size={14} className={activeTab === "STAFF_MATRIX" ? "text-emerald-600" : ""} />
            🏆 Staff Performance Leaderboard ({staffWeeklyMatrix.length})
          </button>
        </div>

        {activeTab === "TIMESHEETS" && (
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search staff name or email..."
              value={searchStaff}
              onChange={(e) => setSearchStaff(e.target.value)}
              className="pl-8 pr-4 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
            />
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════════
          TAB 1: SHIFT TIMESHEETS & LOGIN LOGS
         ══════════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "TIMESHEETS" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Clock size={16} className="text-indigo-600" /> Detailed Staff Work Sessions &amp; Shift Times
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Exact clock-in, clock-out, break durations, calls made during shift, conversions, and shift notes.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-400">
              Showing {filteredSessions.length} sessions
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase font-extrabold tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Staff Member</th>
                  <th className="py-3.5 px-4">Shift Date</th>
                  <th className="py-3.5 px-4">Clock-In (Login)</th>
                  <th className="py-3.5 px-4">Clock-Out (Logout)</th>
                  <th className="py-3.5 px-4">Shift Status</th>
                  <th className="py-3.5 px-4">Work Time</th>
                  <th className="py-3.5 px-4">Break</th>
                  <th className="py-3.5 px-4">Calls Made</th>
                  <th className="py-3.5 px-4">Converted</th>
                  <th className="py-3.5 px-4">Follow-ups</th>
                  <th className="py-3.5 px-4">Shift Notes</th>
                  <th className="py-3.5 px-4 text-right">Drill-Down</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSessions.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-16 text-center text-slate-400">
                      <Clock size={36} className="mx-auto mb-2 opacity-30" />
                      <p className="font-bold text-sm">No work sessions logged in this period</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Staff work sessions are automatically tracked when they Clock In and Clock Out.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredSessions.map((session) => {
                    const isClockedIn = session.status === "CLOCKED_IN";
                    const isOnBreak = session.status === "ON_BREAK";

                    return (
                      <tr key={session.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Staff */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-800 font-extrabold flex items-center justify-center text-xs shrink-0">
                              {session.staffName[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-extrabold text-slate-900 truncate">{session.staffName}</p>
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                  {session.subAdminRole || session.role}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Shift Date */}
                        <td className="py-3 px-4 font-bold text-slate-700 whitespace-nowrap">
                          {formatDate(session.clockIn)}
                        </td>

                        {/* Clock In */}
                        <td className="py-3 px-4 font-mono font-bold text-emerald-700 whitespace-nowrap">
                          🟢 {formatTime(session.clockIn)}
                        </td>

                        {/* Clock Out */}
                        <td className="py-3 px-4 font-mono font-bold text-slate-700 whitespace-nowrap">
                          {session.clockOut ? (
                            <span className="text-slate-600">🔴 {formatTime(session.clockOut)}</span>
                          ) : isClockedIn ? (
                            <span className="text-emerald-600 font-black animate-pulse">🟢 Active Now</span>
                          ) : isOnBreak ? (
                            <span className="text-amber-600 font-black">☕ On Break</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              isClockedIn
                                ? "bg-emerald-100 text-emerald-800"
                                : isOnBreak
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {isClockedIn ? "🟢 ON SHIFT" : isOnBreak ? "☕ ON BREAK" : "⚪ CLOCKED OUT"}
                          </span>
                        </td>

                        {/* Work Time */}
                        <td className="py-3 px-4 font-extrabold text-slate-900 whitespace-nowrap">
                          {session.totalMinutes !== null ? (
                            formatMinutes(session.totalMinutes)
                          ) : isClockedIn ? (
                            <span className="text-emerald-600 font-bold">In progress</span>
                          ) : (
                            "—"
                          )}
                        </td>

                        {/* Break */}
                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                          {session.totalBreakMins > 0 ? `${session.totalBreakMins}m` : "0m"}
                        </td>

                        {/* Calls Made */}
                        <td className="py-3 px-4 font-extrabold text-blue-700 whitespace-nowrap">
                          📞 {session.callsMade}
                        </td>

                        {/* Converted */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {session.leadsConverted > 0 ? (
                            <span className="font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                              ✓ {session.leadsConverted}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-medium">0</span>
                          )}
                        </td>

                        {/* Follow-ups */}
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                          🔔 {session.followUpsSet} set
                          {session.followUpsDone > 0 && ` · ${session.followUpsDone} done`}
                        </td>

                        {/* Notes */}
                        <td className="py-3 px-4 max-w-[200px] truncate text-slate-500 italic">
                          {session.notes || <span className="text-slate-300 not-italic">—</span>}
                        </td>

                        {/* Drill Down */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => openShiftLogs(session)}
                            className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-extrabold text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Eye size={12} /> View Calls
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════════
          TAB 2: DAILY TEAM AGGREGATE
         ══════════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "DAILY" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Calendar size={16} className="text-blue-600" /> Daily Call &amp; Conversion Activity Breakdown
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Click on any day to see the exact breakdown of calls made by each staff member.
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {dailyBreakdown.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Calendar size={32} className="mx-auto mb-2 opacity-30" />
                <p className="font-bold text-sm">No call logs found in this period</p>
              </div>
            ) : (
              dailyBreakdown.map((day) => {
                const isExpanded = expandedDateKeys.has(day.dateKey);
                const answerRate = day.totalCalls > 0 ? Math.round((day.answered / day.totalCalls) * 100) : 0;
                const conversionRate = day.totalCalls > 0 ? Math.round((day.converted / day.totalCalls) * 100) : 0;

                return (
                  <div key={day.dateKey} className="transition-colors hover:bg-slate-50/50">
                    <button
                      type="button"
                      onClick={() => toggleExpandDate(day.dateKey)}
                      className="w-full px-6 py-4 flex items-center justify-between text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 font-extrabold flex items-center justify-center text-sm">
                          {day.displayDate.split(" ")[0]}
                        </div>
                        <div>
                          <p className="font-extrabold text-sm text-slate-900">{day.displayDate}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {day.activeStaffCount} active staff member{day.activeStaffCount > 1 ? "s" : ""} on duty
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right hidden sm:block">
                          <p className="text-xs font-bold text-slate-500">Answered</p>
                          <p className="text-sm font-extrabold text-teal-700">
                            {day.answered} <span className="text-[10px] text-slate-400 font-normal">({answerRate}%)</span>
                          </p>
                        </div>

                        <div className="text-right hidden sm:block">
                          <p className="text-xs font-bold text-slate-500">Converted</p>
                          <p className="text-sm font-extrabold text-emerald-700">
                            {day.converted} <span className="text-[10px] text-slate-400 font-normal">({conversionRate}%)</span>
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-xs font-bold text-slate-500">Total Calls</p>
                          <p className="text-base font-black text-slate-900">{day.totalCalls}</p>
                        </div>

                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                          <ChevronDown size={16} className={`transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        </div>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-6 pb-4 pt-2 bg-slate-50/80 border-t border-slate-100">
                        <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2">
                          Staff Activity on {day.displayDate}:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {day.staffDetails.map((staff) => (
                            <div key={staff.staffId} className="bg-white p-3 rounded-xl border border-slate-200/80 flex items-center justify-between">
                              <div>
                                <p className="font-extrabold text-xs text-slate-800">{staff.staffName}</p>
                                <span className="text-[10px] text-slate-400 font-bold uppercase">{staff.subAdminRole || "Staff"}</span>
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-extrabold text-blue-700">{staff.calls} calls</p>
                                <p className="text-[10px] text-emerald-600 font-bold">{staff.converted} converted</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════════
          TAB 3: STAFF PERFORMANCE LEADERBOARD
         ══════════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "STAFF_MATRIX" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Award size={16} className="text-amber-500" /> Team Performance &amp; Efficiency Leaderboard
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Ranked by total calls logged, hours worked, conversion rate, and active days.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase font-extrabold tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Rank</th>
                  <th className="py-3.5 px-4">Staff Member</th>
                  <th className="py-3.5 px-4">Shifts Logged</th>
                  <th className="py-3.5 px-4">Total Hours</th>
                  <th className="py-3.5 px-4">Total Calls</th>
                  <th className="py-3.5 px-4">Answered</th>
                  <th className="py-3.5 px-4">Converted</th>
                  <th className="py-3.5 px-4">Conversion Rate</th>
                  <th className="py-3.5 px-4">Active Days</th>
                  <th className="py-3.5 px-4">Avg Calls/Day</th>
                  <th className="py-3.5 px-4">Current Queue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staffWeeklyMatrix.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400">
                      No staff metrics available for this period.
                    </td>
                  </tr>
                ) : (
                  staffWeeklyMatrix.map((staff, idx) => {
                    const convRate = staff.totalCalls > 0 ? Math.round((staff.converted / staff.totalCalls) * 100) : 0;
                    const isTop3 = idx < 3;
                    const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`;

                    return (
                      <tr key={staff.staffId} className={`hover:bg-slate-50 transition-colors ${idx === 0 ? "bg-amber-50/30" : ""}`}>
                        <td className="py-3 px-4 font-black text-sm">{medal}</td>
                        <td className="py-3 px-4">
                          <p className="font-extrabold text-slate-900">{staff.staffName}</p>
                          <p className="text-[10px] text-slate-400">{staff.email}</p>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-700">{staff.totalShifts}</td>
                        <td className="py-3 px-4 font-bold text-indigo-700">{staff.totalHoursLogged}h</td>
                        <td className="py-3 px-4 font-black text-slate-900">{staff.totalCalls}</td>
                        <td className="py-3 px-4 font-bold text-teal-700">{staff.answered}</td>
                        <td className="py-3 px-4 font-black text-emerald-700">✓ {staff.converted}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full font-black text-[10px] ${
                            convRate >= 15 ? "bg-emerald-100 text-emerald-800" : convRate >= 5 ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-600"
                          }`}>
                            {convRate}%
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-700">{staff.activeDays} days</td>
                        <td className="py-3 px-4 font-extrabold text-blue-700">{staff.avgCallsPerDay}</td>
                        <td className="py-3 px-4 font-bold text-slate-600">{staff.currentAssigned} leads</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════════
          DRILL-DOWN MODAL: SHIFT CALL LOGS TIMELINE
         ══════════════════════════════════════════════════════════════════════════════ */}
      {selectedSessionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-hidden border border-slate-200 shadow-2xl flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                    Shift Call Log Timeline
                  </span>
                  <span className="text-xs font-bold text-slate-400">
                    {formatDate(selectedSessionModal.session.clockIn)}
                  </span>
                </div>
                <h3 className="text-base font-black text-slate-900 mt-1">
                  {selectedSessionModal.session.staffName} — Shift Calls ({selectedSessionModal.callLogs.length})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Logged between {formatTime(selectedSessionModal.session.clockIn)} and {formatTime(selectedSessionModal.session.clockOut) || "Now"}
                </p>
              </div>
              <button
                onClick={() => setSelectedSessionModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Shift snapshot bar */}
            <div className="grid grid-cols-4 gap-2 p-4 bg-slate-50 border-b border-slate-100 text-center text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 block">Duration</span>
                <span className="font-extrabold text-slate-800">{formatMinutes(selectedSessionModal.session.totalMinutes)}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 block">Calls Made</span>
                <span className="font-extrabold text-blue-700">{selectedSessionModal.session.callsMade}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 block">Converted</span>
                <span className="font-extrabold text-emerald-700">✓ {selectedSessionModal.session.leadsConverted}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 block">Follow-ups</span>
                <span className="font-extrabold text-amber-700">{selectedSessionModal.session.followUpsSet}</span>
              </div>
            </div>

            {/* Call logs list */}
            <div className="p-6 overflow-y-auto space-y-3 flex-1">
              {selectedSessionModal.callLogs.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <PhoneCall size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="font-bold text-xs">No individual calls recorded during this shift window</p>
                </div>
              ) : (
                selectedSessionModal.callLogs.map((log) => {
                  const outcomeBadge: Record<string, { label: string; bg: string; text: string }> = {
                    ANSWERED: { label: "Answered", bg: "bg-emerald-100", text: "text-emerald-800" },
                    CALLBACK_REQUESTED: { label: "Callback", bg: "bg-amber-100", text: "text-amber-800" },
                    CONVERTED: { label: "Converted", bg: "bg-green-100", text: "text-green-800" },
                    NO_ANSWER: { label: "No Answer", bg: "bg-orange-100", text: "text-orange-800" },
                    BUSY: { label: "Busy", bg: "bg-purple-100", text: "text-purple-800" },
                    WRONG_NUMBER: { label: "Wrong Number", bg: "bg-rose-100", text: "text-rose-800" },
                    NOT_INTERESTED: { label: "Not Interested", bg: "bg-red-100", text: "text-red-800" },
                  };
                  const badge = outcomeBadge[log.outcome] || { label: log.outcome, bg: "bg-slate-100", text: "text-slate-700" };

                  return (
                    <div key={log.id} className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-xs text-slate-900">{log.lead.name || "Unknown Lead"}</span>
                          {log.lead.phone && (
                            <span className="text-[11px] font-mono text-slate-500 font-bold">+91 {log.lead.phone}</span>
                          )}
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${badge.bg} ${badge.text}`}>
                            {badge.label}
                          </span>
                        </div>
                        {log.lead.location && (
                          <p className="text-[11px] text-slate-400 flex items-center gap-1">
                            <MapPin size={10} /> {log.lead.location}
                          </p>
                        )}
                        {log.notes && (
                          <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100 mt-1">
                            "{log.notes}"
                          </p>
                        )}
                      </div>

                      <span className="text-[11px] font-bold text-slate-400 font-mono shrink-0">
                        {formatTime(log.calledAt)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50/50">
              <button
                type="button"
                onClick={() => setSelectedSessionModal(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 cursor-pointer"
              >
                Close Timeline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
