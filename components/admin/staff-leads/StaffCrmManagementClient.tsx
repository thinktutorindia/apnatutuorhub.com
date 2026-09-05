"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  Users, UserCheck, PhoneCall, Sparkles, RotateCcw, Trash2, ArrowRight,
  TrendingUp, CheckCircle2, AlertCircle, Clock, Star, PhoneOff, PhoneMissed,
  Shield, Layers, ChevronRight, RefreshCw, Loader2, ArrowUpRight, BarChart3
} from "lucide-react";
import {
  smartAutoDistributeAction,
  autoRotateLeadsAction,
  deleteLeadBatchAction,
  bulkReassignLeadsAction
} from "@/app/actions/staff-leads.actions";
import { StaffCrmPlaybook } from "@/components/admin/staff-leads/StaffCrmPlaybook";
import { StaffLeadsNavHeader } from "@/components/admin/staff-leads/StaffLeadsNavHeader";

type StaffStat = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  subAdminRole: string | null;
  activeLeads: number;
  callsToday: number;
  callsTotal: number;
  converted: number;
  noAnswer: number;
  followUpsDue: number;
};

type BatchStat = {
  id: string;
  name: string;
  totalParsed: number;
  createdAt: Date;
  totalLeads: number;
  convertedLeads: number;
  conversionRate: number;
};

interface Props {
  staffStats: StaffStat[];
  batchStats: BatchStat[];
  statusBreakdown: Record<string, number>;
  unassignedCount: number;
  dueFollowUpsCount: number;
}

export function StaffCrmManagementClient({
  staffStats: initialStaffStats,
  batchStats: initialBatchStats,
  statusBreakdown: initialStatusBreakdown,
  unassignedCount: initialUnassignedCount,
  dueFollowUpsCount: initialDueFollowUpsCount,
}: Props) {
  const [staffStats, setStaffStats] = useState(initialStaffStats);
  const [batchStats, setBatchStats] = useState(initialBatchStats);
  const [unassignedCount, setUnassignedCount] = useState(initialUnassignedCount);
  const [dueFollowUpsCount, setDueFollowUpsCount] = useState(initialDueFollowUpsCount);
  const [limitPerStaff, setLimitPerStaff] = useState(20);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [deletingBatchId, setDeletingBatchId] = useState<string | null>(null);

  const handleAutoDistribute = () => {
    startTransition(async () => {
      const res = await smartAutoDistributeAction({ limitPerStaff });
      if (res.success && res.data) {
        setMessage({
          type: "success",
          text: `✓ Distributed ${res.data.distributed} leads across ${res.data.staffCount} staff members (${limitPerStaff} max each).`,
        });
        setUnassignedCount((prev) => Math.max(0, prev - res.data!.distributed));
      } else {
        setMessage({ type: "error", text: res.error ?? "Distribution failed" });
      }
    });
  };

  const handleDailyRotate = () => {
    startTransition(async () => {
      const res = await autoRotateLeadsAction();
      if (res.success && res.data) {
        setMessage({
          type: "success",
          text: `✓ Auto-rotated and refreshed ${res.data.rotated} stale/no-answer leads across active staff.`,
        });
      } else {
        setMessage({ type: "error", text: res.error ?? "Rotation failed" });
      }
    });
  };

  const handleDeleteBatch = (batchId: string) => {
    setDeletingBatchId(batchId);
    startTransition(async () => {
      const res = await deleteLeadBatchAction(batchId);
      if (res.success && res.data) {
        setMessage({
          type: "success",
          text: `✓ Deleted batch and removed ${res.data.deletedLeads} unpromoted leads.`,
        });
        setBatchStats((prev) => prev.filter((b) => b.id !== batchId));
      } else {
        setMessage({ type: "error", text: res.error ?? "Failed to delete batch" });
      }
      setDeletingBatchId(null);
    });
  };

  const totalLeads = Object.values(initialStatusBreakdown).reduce((a, b) => a + b, 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* ── Unified Nav Header ── */}
      <StaffLeadsNavHeader
        activeKey="manage"
        totalLeads={totalLeads}
        subtitle="Daily allocation, team fair-share auto-distribution, staff performance, and batch staging."
      />

      <StaffCrmPlaybook compact />

      {message && (
        <div
          className={`rounded-2xl p-4 flex items-center justify-between gap-3 text-sm ${
            message.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-700 text-xs font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Quick Automated Actions Control Bar */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div>
            <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
              <RefreshCw size={18} className="text-emerald-400" /> Automated Lead Allocation &amp; Daily Rotation
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Distribute fresh unassigned leads or rotate stale yesterday&apos;s leads with a single click.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-xs text-slate-400 block">Unassigned Leads Pool</span>
              <span className="text-xl font-extrabold text-emerald-400">{unassignedCount}</span>
            </div>
            <div className="h-8 w-px bg-slate-700 mx-2" />
            <div className="text-right">
              <span className="text-xs text-slate-400 block">Follow-Ups Due</span>
              <span className="text-xl font-extrabold text-amber-400">{dueFollowUpsCount}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Smart Distribute */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 flex flex-col justify-between">
            <div>
              <p className="text-sm font-extrabold text-white mb-1">Smart Auto-Distribute Unassigned</p>
              <p className="text-xs text-slate-400 mb-3">
                Distributes unassigned leads evenly across all {staffStats.length} active staff members.
              </p>
            </div>
            <div className="space-y-2 mt-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-400 font-semibold">Quota per Staff:</span>
                <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-xl px-2 py-1">
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={limitPerStaff}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setLimitPerStaff(isNaN(val) ? 1 : Math.max(1, val));
                    }}
                    className="w-16 bg-transparent text-xs font-mono font-bold text-white text-center focus:outline-none"
                    placeholder="e.g. 25"
                  />
                  <span className="text-[11px] text-slate-400 font-medium pr-1">leads / staff</span>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1">
                  {[5, 10, 25, 50].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setLimitPerStaff(preset)}
                      className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                        limitPerStaff === preset
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-700/60 text-slate-300 hover:bg-slate-700"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                  {unassignedCount > 0 && staffStats.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setLimitPerStaff(Math.ceil(unassignedCount / staffStats.length))}
                      className="text-[10px] font-bold px-2 py-1 rounded-lg bg-teal-900/60 text-teal-300 hover:bg-teal-800 transition-colors cursor-pointer"
                      title="Distribute all unassigned leads evenly"
                    >
                      All ({Math.ceil(unassignedCount / staffStats.length)} each)
                    </button>
                  )}
                </div>
              </div>

              <button
                onClick={handleAutoDistribute}
                disabled={isPending || unassignedCount === 0}
                className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-40 flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-950/40 cursor-pointer"
              >
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                Distribute {Math.min(unassignedCount, staffStats.length * limitPerStaff)} Leads Now ({limitPerStaff} per staff)
              </button>
            </div>
          </div>

          {/* Daily Rotate */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 flex flex-col justify-between">
            <div>
              <p className="text-sm font-extrabold text-white mb-1">Daily Refresh &amp; Rotation Engine</p>
              <p className="text-xs text-slate-400 mb-3">
                Transfers yesterday&apos;s unanswered leads to new staff members so every lead gets fresh attention.
              </p>
            </div>
            <button
              onClick={handleDailyRotate}
              disabled={isPending}
              className="w-full py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 disabled:opacity-40 flex items-center justify-center gap-1.5 transition-colors mt-2"
            >
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
              Run Daily Rotation &amp; Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Staff Performance & Workload */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Users size={18} className="text-emerald-600" /> Staff Workload &amp; Performance
            </h2>
            <p className="text-xs text-slate-500">Live stats of calls made, active queues, and conversion rates per team member.</p>
          </div>
          <span className="text-xs font-bold text-slate-400">{staffStats.length} staff members</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {staffStats.map((staff) => (
            <div
              key={staff.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 font-extrabold flex items-center justify-center text-sm">
                    {(staff.name ?? staff.email)[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-slate-900">{staff.name ?? staff.email.split("@")[0]}</p>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {staff.subAdminRole ?? staff.role}
                    </span>
                  </div>
                </div>
                <Link
                  href={`/admin/staff-leads?assignedToId=${staff.id}`}
                  className="text-xs text-emerald-600 font-bold hover:underline flex items-center gap-1"
                >
                  View <ArrowRight size={12} />
                </Link>
              </div>

              {/* Metrics grid */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Queue</span>
                  <span className="text-base font-extrabold text-slate-800">{staff.activeLeads}</span>
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Calls Today</span>
                  <span className="text-base font-extrabold text-blue-600">{staff.callsToday}</span>
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Converted</span>
                  <span className="text-base font-extrabold text-emerald-600">{staff.converted}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
                <span>Total Calls Logged: <strong>{staff.callsTotal}</strong></span>
                {staff.followUpsDue > 0 ? (
                  <span className="text-amber-600 font-bold">⚠️ {staff.followUpsDue} due follow-ups</span>
                ) : (
                  <span className="text-emerald-600 font-semibold">✓ Queue clean</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Batch History & Conversion Metrics */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Layers size={18} className="text-blue-600" /> Upload Batches &amp; Staging Performance
            </h2>
            <p className="text-xs text-slate-500">Track conversion rates and manage uploaded data batches.</p>
          </div>
          <span className="text-xs font-bold text-slate-400">{batchStats.length} batches</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Batch Name</th>
                  <th className="text-left px-4 py-3 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Date Uploaded</th>
                  <th className="text-left px-4 py-3 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Total Leads</th>
                  <th className="text-left px-4 py-3 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Converted</th>
                  <th className="text-left px-4 py-3 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Conversion %</th>
                  <th className="text-right px-4 py-3 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batchStats.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No batches uploaded yet.
                    </td>
                  </tr>
                ) : (
                  batchStats.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-800">{b.name}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 font-mono">
                        {new Date(b.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700">{b.totalLeads}</td>
                      <td className="px-4 py-3 font-bold text-emerald-600">{b.convertedLeads}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full"
                              style={{ width: `${Math.min(100, b.conversionRate)}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-slate-700">{b.conversionRate}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/staff-leads?batchId=${b.id}`}
                            className="text-xs text-emerald-600 font-bold hover:underline"
                          >
                            View Leads
                          </Link>
                          <button
                            onClick={() => handleDeleteBatch(b.id)}
                            disabled={deletingBatchId === b.id}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete batch and unpromoted leads"
                          >
                            {deletingBatchId === b.id ? (
                              <Loader2 size={13} className="animate-spin text-red-500" />
                            ) : (
                              <Trash2 size={13} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
