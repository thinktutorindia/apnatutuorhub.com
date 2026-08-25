"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  Calendar, Users, PhoneCall, CheckCircle2, Star, RefreshCcw,
  PhoneMissed, Flame, Download, Filter, Search, ChevronDown,
  ChevronRight, ArrowUpRight, TrendingUp, Sparkles, Layers,
  Clock, Shield, BarChart3, ArrowLeft, RefreshCw, Loader2
} from "lucide-react";
import { getStaffDailyWorkReportsAction } from "@/app/actions/staff-leads.actions";

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
  answered: number;
  converted: number;
  callbacks: number;
  noAnswer: number;
  activeDays: number;
  avgCallsPerDay: number;
  currentAssigned: number;
  followUpsDue: number;
};

interface Props {
  initialDailyBreakdown: DailyBreakdownItem[];
  initialStaffWeeklyMatrix: StaffMatrixItem[];
  initialPeriodSummary: {
    totalCalls: number;
    totalAnswered: number;
    totalConverted: number;
    totalCallbacks: number;
    totalNoAnswer: number;
    answerRate: number;
    conversionRate: number;
  };
  staffList: Array<{ id: string; name: string | null; email: string }>;
  isSuperAdmin: boolean;
}

export function StaffCrmReportsClient({
  initialDailyBreakdown,
  initialStaffWeeklyMatrix,
  initialPeriodSummary,
  staffList,
  isSuperAdmin,
}: Props) {
  const [dailyBreakdown, setDailyBreakdown] = useState(initialDailyBreakdown);
  const [staffWeeklyMatrix, setStaffWeeklyMatrix] = useState(initialStaffWeeklyMatrix);
  const [periodSummary, setPeriodSummary] = useState(initialPeriodSummary);

  const [activePeriod, setActivePeriod] = useState<"today" | "yesterday" | "7days" | "30days" | "all" | "custom">("30days");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState("all");
  const [expandedDateKeys, setExpandedDateKeys] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"DAILY" | "STAFF_MATRIX">("DAILY");

  const [isPending, startTransition] = useTransition();

  const toggleExpandDate = (dateKey: string) => {
    setExpandedDateKeys((prev) => {
      const next = new Set(prev);
      if (next.has(dateKey)) next.delete(dateKey);
      else next.add(dateKey);
      return next;
    });
  };

  const handlePeriodChange = (period: "today" | "yesterday" | "7days" | "30days" | "all" | "custom") => {
    setActivePeriod(period);
    const now = new Date();
    let s = "";
    let e = "";

    if (period === "today") {
      s = now.toISOString().slice(0, 10);
      e = now.toISOString().slice(0, 10);
    } else if (period === "yesterday") {
      const y = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      s = y.toISOString().slice(0, 10);
      e = y.toISOString().slice(0, 10);
    } else if (period === "7days") {
      const w = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      s = w.toISOString().slice(0, 10);
      e = now.toISOString().slice(0, 10);
    } else if (period === "30days") {
      const m = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      s = m.toISOString().slice(0, 10);
      e = now.toISOString().slice(0, 10);
    }

    if (period !== "custom") {
      setStartDate(s);
      setEndDate(e);
      loadReport(s, e, selectedStaffId);
    }
  };

  const loadReport = (startStr = startDate, endStr = endDate, staffId = selectedStaffId) => {
    startTransition(async () => {
      const res = await getStaffDailyWorkReportsAction({
        startDate: startStr || undefined,
        endDate: endStr || undefined,
        staffId: staffId === "all" ? undefined : staffId,
      });

      if (res.success && res.data) {
        setDailyBreakdown(res.data.dailyBreakdown);
        setStaffWeeklyMatrix(res.data.staffWeeklyMatrix);
        setPeriodSummary(res.data.periodSummary);
      }
    });
  };

  // Export Daily Report to CSV
  const handleExportCSV = () => {
    let csv = "Date,Total Calls,Answered,Interested,Callbacks,Converted,No Answer,Active Staff Count\n";
    dailyBreakdown.forEach((d) => {
      csv += `"${d.displayDate}",${d.totalCalls},${d.answered},${d.interested},${d.callbacks},${d.converted},${d.noAnswer},${d.activeStaffCount}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `crm_daily_work_report_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* ── Top Header Banner ── */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200">
              Super Admin · Work Reports
            </span>
            <span className="text-[11px] font-bold text-slate-400">
              Day-by-Day & Weekly CRM Tracking
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Daily & Weekly CRM Work Reports</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit daily calls made, teacher discussions, conversions, and team progress day-by-day across all staff members.
          </p>
        </div>

        {/* Quick Links & Export CSV */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/admin/staff-leads/manage"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-black shadow-xs"
          >
            <Layers size={13} className="text-amber-500" /> CRM Management
          </Link>

          <Link
            href="/admin/staff-leads"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs"
          >
            <PhoneCall size={13} className="text-blue-500" /> Staff CRM Feed
          </Link>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-sm transition-all cursor-pointer"
          >
            <Download size={14} /> Export Report CSV
          </button>
        </div>
      </div>

      {/* ── Filter Controls (Period & Staff Selector) ── */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between flex-wrap gap-4">
        {/* Preset Periods */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { key: "today", label: "Today" },
            { key: "yesterday", label: "Yesterday" },
            { key: "7days", label: "Last 7 Days (Weekly)" },
            { key: "30days", label: "Last 30 Days (Monthly)" },
            { key: "all", label: "All Time" },
            { key: "custom", label: "Custom Range" },
          ].map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => handlePeriodChange(p.key as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activePeriod === p.key
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom Date Inputs if Custom Selected */}
        {activePeriod === "custom" && (
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-800"
            />
            <span className="text-slate-400 text-xs font-bold">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-800"
            />
            <button
              type="button"
              onClick={() => loadReport(startDate, endDate, selectedStaffId)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer"
            >
              Apply
            </button>
          </div>
        )}

        {/* Staff Filter Dropdown */}
        {isSuperAdmin && (
          <div className="flex items-center gap-2">
            <select
              value={selectedStaffId}
              onChange={(e) => {
                setSelectedStaffId(e.target.value);
                loadReport(startDate, endDate, e.target.value);
              }}
              className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="all">👥 All Staff Combined</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name || s.email}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => loadReport()}
              disabled={isPending}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              title="Refresh Report"
            >
              <RefreshCw size={14} className={isPending ? "animate-spin" : ""} />
            </button>
          </div>
        )}
      </div>

      {/* ── KPI Summary Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-extrabold uppercase">Total Calls</span>
            <PhoneCall size={14} className="text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{periodSummary.totalCalls}</div>
          <div className="text-[10px] text-slate-400 font-bold mt-0.5">In selected range</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-extrabold uppercase">Answered</span>
            <CheckCircle2 size={14} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-700">{periodSummary.totalAnswered}</div>
          <div className="text-[10px] text-emerald-600 font-bold mt-0.5">{periodSummary.answerRate}% rate</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-extrabold uppercase">Converted</span>
            <Star size={14} className="text-purple-500" />
          </div>
          <div className="text-2xl font-black text-purple-700">{periodSummary.totalConverted}</div>
          <div className="text-[10px] text-purple-600 font-bold mt-0.5">{periodSummary.conversionRate}% rate</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-extrabold uppercase">Callbacks</span>
            <RefreshCcw size={14} className="text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-700">{periodSummary.totalCallbacks}</div>
          <div className="text-[10px] text-slate-400 font-bold mt-0.5">Follow-ups set</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-extrabold uppercase">No Answer</span>
            <PhoneMissed size={14} className="text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-700">{periodSummary.totalNoAnswer}</div>
          <div className="text-[10px] text-slate-400 font-bold mt-0.5">Unreachable</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-extrabold uppercase">Days Tracked</span>
            <Calendar size={14} className="text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-indigo-700">{dailyBreakdown.length}</div>
          <div className="text-[10px] text-slate-400 font-bold mt-0.5">Active dates</div>
        </div>
      </div>

      {/* ── View Tab Switcher ── */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("DAILY")}
          className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "DAILY"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          <Calendar size={13} /> Day-by-Day Performance Timeline ({dailyBreakdown.length} Days)
        </button>

        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab("STAFF_MATRIX")}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "STAFF_MATRIX"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Users size={13} /> Staff Weekly/Monthly Comparison Matrix ({staffWeeklyMatrix.length} Staff)
          </button>
        )}
      </div>

      {/* ═════════════════════════════════════════════════════════════════════════════════
          TAB 1: DAY-BY-DAY PERFORMANCE TIMELINE TABLE
         ═════════════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "DAILY" && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-black text-slate-900 text-base">Day-by-Day CRM Work Breakdown</h3>
              <p className="text-xs text-slate-400">Click on any day row to expand and view each staff member's exact contribution.</p>
            </div>
            <span className="text-xs font-bold text-slate-400">
              {dailyBreakdown.length} active work days recorded
            </span>
          </div>

          {dailyBreakdown.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <Calendar size={36} className="mx-auto text-slate-300" />
              <p className="text-sm font-bold text-slate-700">No work logged for this period</p>
              <p className="text-xs text-slate-400">Calls logged by staff will populate this daily breakdown automatically.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-extrabold uppercase text-[10px] border-b border-slate-100">
                  <tr>
                    <th className="py-3.5 px-5">Work Date</th>
                    <th className="py-3.5 px-5 text-center">Total Calls</th>
                    <th className="py-3.5 px-5 text-center">Answered</th>
                    <th className="py-3.5 px-5 text-center">Interested 🔥</th>
                    <th className="py-3.5 px-5 text-center">Callbacks</th>
                    <th className="py-3.5 px-5 text-center">Converted ✓</th>
                    <th className="py-3.5 px-5 text-center">No Answer</th>
                    <th className="py-3.5 px-5 text-right">Active Staff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {dailyBreakdown.map((day) => {
                    const isExpanded = expandedDateKeys.has(day.dateKey);
                    return (
                      <React.Fragment key={day.dateKey}>
                        <tr
                          onClick={() => toggleExpandDate(day.dateKey)}
                          className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                        >
                          <td className="py-4 px-5 font-black text-slate-900 flex items-center gap-2">
                            <span className="text-slate-400">
                              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </span>
                            <span>{day.displayDate}</span>
                          </td>
                          <td className="py-4 px-5 text-center font-black text-slate-900">
                            {day.totalCalls}
                          </td>
                          <td className="py-4 px-5 text-center text-emerald-700 font-bold">
                            {day.answered}
                          </td>
                          <td className="py-4 px-5 text-center text-orange-700 font-bold">
                            {day.interested}
                          </td>
                          <td className="py-4 px-5 text-center text-amber-700 font-bold">
                            {day.callbacks}
                          </td>
                          <td className="py-4 px-5 text-center text-purple-700 font-black">
                            {day.converted}
                          </td>
                          <td className="py-4 px-5 text-center text-rose-700 font-bold">
                            {day.noAnswer}
                          </td>
                          <td className="py-4 px-5 text-right">
                            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-bold text-[11px]">
                              {day.activeStaffCount} staff active
                            </span>
                          </td>
                        </tr>

                        {/* Expanded Staff Details for this day */}
                        {isExpanded && (
                          <tr className="bg-slate-50/50">
                            <td colSpan={8} className="p-4 pl-12">
                              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 space-y-2">
                                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                                  Staff Contribution on {day.displayDate}:
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                                  {day.staffDetails.map((sd) => (
                                    <div
                                      key={sd.staffId}
                                      className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between"
                                    >
                                      <div>
                                        <p className="font-bold text-slate-900 text-xs">{sd.staffName}</p>
                                        <p className="text-[10px] text-slate-400">{sd.subAdminRole || "Staff"}</p>
                                      </div>
                                      <div className="text-right">
                                        <p className="font-black text-slate-900 text-xs">{sd.calls} calls</p>
                                        <p className="text-[10px] text-emerald-600 font-bold">{sd.answered} answered · {sd.converted} converted</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════════════
          TAB 2: STAFF WEEKLY / MONTHLY MATRIX (Super Admin Only)
         ═════════════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "STAFF_MATRIX" && isSuperAdmin && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-black text-slate-900 text-base">Staff Workload & Performance Comparison Matrix</h3>
              <p className="text-xs text-slate-400">Compare calls, answered rates, conversion rates, and current pending follow-ups across staff.</p>
            </div>
            <span className="text-xs font-bold text-slate-400">
              {staffWeeklyMatrix.length} total staff tracked
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-extrabold uppercase text-[10px] border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-5">Staff Member</th>
                  <th className="py-3.5 px-5">Role</th>
                  <th className="py-3.5 px-5 text-center">Calls in Period</th>
                  <th className="py-3.5 px-5 text-center">Answered</th>
                  <th className="py-3.5 px-5 text-center">Converted ✓</th>
                  <th className="py-3.5 px-5 text-center">Callbacks</th>
                  <th className="py-3.5 px-5 text-center">Active Days</th>
                  <th className="py-3.5 px-5 text-center">Avg Calls/Day</th>
                  <th className="py-3.5 px-5 text-right">Current Queue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {staffWeeklyMatrix.map((sm) => (
                  <tr key={sm.staffId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-5">
                      <p className="font-bold text-slate-900">{sm.staffName}</p>
                      <p className="text-[10px] text-slate-400">{sm.email}</p>
                    </td>
                    <td className="py-4 px-5">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold text-[11px]">
                        {sm.subAdminRole || "Staff"}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-center font-black text-slate-900 text-sm">
                      {sm.totalCalls}
                    </td>
                    <td className="py-4 px-5 text-center text-emerald-700 font-bold">
                      {sm.answered}
                    </td>
                    <td className="py-4 px-5 text-center text-purple-700 font-black text-sm">
                      {sm.converted}
                    </td>
                    <td className="py-4 px-5 text-center text-amber-700 font-bold">
                      {sm.callbacks}
                    </td>
                    <td className="py-4 px-5 text-center text-slate-800 font-bold">
                      {sm.activeDays} days
                    </td>
                    <td className="py-4 px-5 text-center text-slate-900 font-extrabold">
                      {sm.avgCallsPerDay}/day
                    </td>
                    <td className="py-4 px-5 text-right">
                      <p className="font-black text-slate-900">{sm.currentAssigned} leads</p>
                      {sm.followUpsDue > 0 && (
                        <p className="text-[10px] text-amber-600 font-bold">{sm.followUpsDue} due</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
