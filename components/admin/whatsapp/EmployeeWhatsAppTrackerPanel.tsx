"use client";

import React from "react";
import Link from "next/link";
import {
  Users,
  RefreshCw,
  ArrowLeft,
  MessageSquare,
  Flame,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  Clock,
} from "lucide-react";
import type { WhatsAppEmployeeRepliesReport } from "@/app/actions/whatsapp-chat.actions";

const RANGE_OPTIONS: { id: "today" | "7d" | "30d" | "all"; label: string }[] = [
  { id: "today", label: "Today (IST)" },
  { id: "7d", label: "7 Days" },
  { id: "30d", label: "30 Days" },
  { id: "all", label: "All Time" },
];

function fmtIstDateTime(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

export function EmployeeWhatsAppTrackerPanel({
  report,
  loading,
  range,
  onRangeChange,
  staffId,
  onStaffIdChange,
  onRefresh,
  onClose,
  onFilterInboxByEmployee,
  onOpenChat,
}: {
  report: WhatsAppEmployeeRepliesReport | null;
  loading: boolean;
  range: "today" | "7d" | "30d" | "all";
  onRangeChange: (next: "today" | "7d" | "30d" | "all") => void;
  staffId: string;
  onStaffIdChange: (next: string) => void;
  onRefresh: () => void;
  onClose: () => void;
  onFilterInboxByEmployee: (empId: string) => void;
  onOpenChat: (phone: string) => void;
}) {
  const rangeTotal = !report
    ? 0
    : range === "today"
      ? report.totals.repliesToday
      : range === "7d"
        ? report.totals.replies7d
        : range === "30d"
          ? report.totals.replies30d
          : report.totals.repliesTotal;

  return (
    <div className="flex-1 flex flex-col bg-[#F8FAFC] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Back</span>
          </button>
          <div>
            <h3 className="font-extrabold text-sm text-[#0F2540] flex items-center gap-1.5">
              <Users size={16} className="text-emerald-600" />
              {report?.isSuperAdmin
                ? "Employee WhatsApp Reply Tracker"
                : "My WhatsApp Reply Stats"}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Per-person manual WhatsApp replies sent from the live inbox
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onRangeChange(opt.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                range === opt.id
                  ? "bg-[#0F2540] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer disabled:opacity-50"
            title="Refresh stats"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-emerald-600" : ""} />
          </button>
          {report?.isSuperAdmin && (
            <Link
              href="/admin/sub-admins/analytics"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold hover:bg-emerald-100"
            >
              <span>Full Analytics</span>
              <ArrowUpRight size={12} />
            </Link>
          )}
        </div>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading && !report ? (
          <div className="flex items-center justify-center py-16 text-slate-400 gap-2 text-xs font-semibold">
            <RefreshCw size={18} className="animate-spin text-emerald-600" />
            <span>Loading employee reply stats...</span>
          </div>
        ) : !report ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Unable to load employee stats.
          </div>
        ) : (
          <>
            {/* KPI Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Replies ({RANGE_OPTIONS.find((o) => o.id === range)?.label})
                </p>
                <p className="text-2xl font-black text-emerald-700 mt-1">{rangeTotal}</p>
              </div>
              <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Flame size={11} className="text-orange-500" /> Replies Today
                </p>
                <p className="text-2xl font-black text-orange-600 mt-1">
                  {report.totals.repliesToday}
                </p>
              </div>
              <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Unique Chats Replied
                </p>
                <p className="text-2xl font-black text-sky-700 mt-1">
                  {report.totals.uniqueContacts}
                </p>
              </div>
              <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  {report.isSuperAdmin ? "Active Responders" : "All-Time Total"}
                </p>
                <p className="text-2xl font-black text-[#0F2540] mt-1">
                  {report.isSuperAdmin
                    ? `${report.totals.activeResponders} / ${report.employees.length}`
                    : report.totals.repliesTotal}
                </p>
              </div>
            </div>

            {report.isSuperAdmin && report.totals.unattributedStaffReplies > 0 && (
              <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 font-medium">
                Note: {report.totals.unattributedStaffReplies} legacy replies from before per-user tracking lack a unique staff match (all new replies record the sender&apos;s user ID automatically).
              </p>
            )}

            {/* Per-Employee Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <h4 className="text-xs font-extrabold text-[#0F2540] uppercase tracking-wider">
                  Per-Employee Breakdown
                </h4>
                {report.isSuperAdmin && (
                  <span className="text-[11px] text-slate-400 font-semibold">
                    Click &ldquo;Filter Chats&rdquo; to inspect conversations by person
                  </span>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      <th className="py-2.5 px-4">Employee</th>
                      <th className="py-2.5 px-2.5 text-right">Today</th>
                      <th className="py-2.5 px-2.5 text-right">7d</th>
                      <th className="py-2.5 px-2.5 text-right">30d</th>
                      <th className="py-2.5 px-2.5 text-right">Total</th>
                      <th className="py-2.5 px-2.5 text-right">Chats</th>
                      <th className="py-2.5 px-2.5 text-right">Failed</th>
                      <th className="py-2.5 px-3 text-right">Last Reply</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.employees.map((emp) => (
                      <tr key={emp.staffId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-slate-900">{emp.name}</span>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                              {emp.role === "SUPER_ADMIN"
                                ? "Super"
                                : emp.subAdminRole || "Staff"}
                            </span>
                            {!emp.isActive && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-500">
                                Inactive
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400">{emp.email}</p>
                        </td>
                        <td className="py-2.5 px-2.5 text-right font-black text-orange-600">
                          {emp.repliesToday}
                        </td>
                        <td className="py-2.5 px-2.5 text-right font-bold text-slate-700">
                          {emp.replies7d}
                        </td>
                        <td className="py-2.5 px-2.5 text-right font-bold text-slate-700">
                          {emp.replies30d}
                        </td>
                        <td className="py-2.5 px-2.5 text-right font-black text-emerald-700">
                          {emp.repliesTotal}
                        </td>
                        <td className="py-2.5 px-2.5 text-right font-bold text-sky-700">
                          {emp.uniqueContacts}
                        </td>
                        <td className="py-2.5 px-2.5 text-right">
                          <span
                            className={
                              emp.failedCount > 0 ? "text-rose-600 font-bold" : "text-slate-400"
                            }
                          >
                            {emp.failedCount}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-[11px] text-slate-500 whitespace-nowrap">
                          {fmtIstDateTime(emp.lastReplyAt)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => onFilterInboxByEmployee(emp.staffId)}
                            disabled={emp.repliesTotal === 0}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold hover:bg-emerald-100 disabled:opacity-40 cursor-pointer whitespace-nowrap"
                          >
                            Filter Chats
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Manual Replies Log */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-xs font-extrabold text-[#0F2540] uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare size={14} className="text-emerald-600" />
                  Recent Staff Replies ({report.recentReplies.length})
                </h4>
                {report.isSuperAdmin && (
                  <select
                    value={staffId}
                    onChange={(e) => onStaffIdChange(e.target.value)}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-700 outline-none cursor-pointer"
                  >
                    <option value="">All Employees</option>
                    {report.employees.map((e) => (
                      <option key={e.staffId} value={e.staffId}>
                        {e.name} ({e.repliesTotal})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {report.recentReplies.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 font-medium">
                  No replies recorded in this window.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {report.recentReplies.map((r) => {
                    const isFailed = r.status?.toUpperCase() === "FAILED";
                    return (
                      <div
                        key={r.id}
                        className="px-4 py-3 flex items-start justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap text-[11px]">
                            <span className="font-extrabold text-[#0F2540]">{r.staffName}</span>
                            <span className="text-slate-300">→</span>
                            <span className="font-mono font-bold text-slate-700">+{r.phone}</span>
                            {r.status && (
                              <span
                                className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                                  isFailed
                                    ? "bg-rose-100 text-rose-700"
                                    : "bg-emerald-100 text-emerald-700"
                                }`}
                              >
                                {isFailed ? <AlertCircle size={9} /> : <CheckCircle2 size={9} />}
                                {r.status}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                              <Clock size={10} />
                              {fmtIstDateTime(r.createdAt)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 line-clamp-2 whitespace-pre-wrap break-words">
                            {r.body}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onOpenChat(r.phone)}
                          className="shrink-0 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold cursor-pointer"
                        >
                          Open Chat
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
