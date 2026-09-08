"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  Users, UserCheck, PhoneCall, Sparkles, RotateCcw, Trash2, ArrowRight,
  TrendingUp, CheckCircle2, AlertCircle, Clock, Star, PhoneOff, PhoneMissed,
  Shield, Layers, ChevronRight, RefreshCw, Loader2, ArrowUpRight, BarChart3,
  MapPin, Mail, ExternalLink, SlidersHorizontal
} from "lucide-react";
import {
  smartAutoDistributeAction,
  autoRotateLeadsAction,
  deleteLeadBatchAction,
  bulkReassignLeadsAction
} from "@/app/actions/staff-leads.actions";
import { StaffCrmPlaybook } from "@/components/admin/staff-leads/StaffCrmPlaybook";
import { StaffLeadsNavHeader } from "@/components/admin/staff-leads/StaffLeadsNavHeader";
import { BatchDetailedReportModal } from "@/components/admin/staff-leads/BatchDetailedReportModal";

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

export type BatchStat = {
  id: string;
  name: string;
  totalParsed: number;
  totalJunk?: number;
  createdAt: Date | string;
  totalLeads: number;
  convertedLeads: number;
  conversionRate: number;
  promotedCount?: number;
  assignedCount?: number;
  unassignedCount?: number;
  callsCount?: number;
  emailCount?: number;
  emailCoveragePercent?: number;
  locationsCount?: number;
  topLocations?: string[];
  staffCount?: number;
  staffMembers?: Array<{ id: string; name: string; email: string; assignedCount: number; conversions: number }>;
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
  const [selectedReportBatchId, setSelectedReportBatchId] = useState<string | null>(null);

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

      {/* Batch History & In-Depth Performance Hub */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Layers size={18} className="text-blue-600" /> Upload Batches &amp; Staging Performance
            </h2>
            <p className="text-xs text-slate-500">
              Deep telemetry on every uploaded batch: staff activity, conversion rates, email coverage, and locality breakdown.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/staff-leads/upload"
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <span>+ Upload New Batch</span>
            </Link>
            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-xl">
              {batchStats.length} batches
            </span>
          </div>
        </div>

        {batchStats.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
            <Layers size={32} className="mx-auto text-slate-300" />
            <p className="font-bold">No batches uploaded yet.</p>
            <p className="text-xs text-slate-400">Import WhatsApp dumps or CSV files to see comprehensive batch telemetry.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {batchStats.map((b) => {
              const dateLabel = new Date(b.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              });

              return (
                <div
                  key={b.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all p-4 sm:p-5 space-y-4"
                >
                  {/* Top Bar: Title, Badges & Actions */}
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-black text-slate-900 truncate">
                          {b.name}
                        </h3>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold border border-slate-200">
                          {b.totalLeads} Leads
                        </span>
                        {b.promotedCount !== undefined && b.promotedCount > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                            <CheckCircle2 size={10} />
                            {b.promotedCount} Promoted to Primary
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 font-medium">
                          Uploaded {dateLabel}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setSelectedReportBatchId(b.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-black flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                      >
                        <BarChart3 size={13} />
                        <span>Full Report &amp; Filters</span>
                      </button>

                      <Link
                        href={`/admin/staff-leads?batchId=${b.id}`}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold flex items-center gap-1 transition-colors"
                      >
                        <span>Desk Queue</span>
                        <ArrowRight size={12} />
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleDeleteBatch(b.id)}
                        disabled={deletingBatchId === b.id}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Delete batch and unpromoted leads"
                      >
                        {deletingBatchId === b.id ? (
                          <Loader2 size={14} className="animate-spin text-red-500" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* 4 In-Depth Key Metric Pillars */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100">
                    {/* 1. Conversions */}
                    <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 space-y-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 block">Conversions</span>
                      <div className="flex items-center justify-between">
                        <span className="text-base font-black text-emerald-800">
                          {b.convertedLeads} <span className="text-xs text-emerald-600 font-semibold">/ {b.totalLeads}</span>
                        </span>
                        <span className="text-xs font-black text-emerald-700">{b.conversionRate}%</span>
                      </div>
                      <div className="w-full bg-emerald-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-600 h-full rounded-full"
                          style={{ width: `${Math.min(100, b.conversionRate)}%` }}
                        />
                      </div>
                    </div>

                    {/* 2. Staff Activity ("Which staff doing what") */}
                    <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/80 space-y-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-800 block">
                        Team Activity &amp; Calls
                      </span>
                      <div className="flex items-center justify-between">
                        <span className="text-base font-black text-blue-900">
                          {b.callsCount || 0} <span className="text-xs text-blue-600 font-semibold">calls logged</span>
                        </span>
                        <span className="text-xs font-extrabold text-blue-700">
                          {b.assignedCount || 0} assigned
                        </span>
                      </div>
                      <p className="text-[10px] text-blue-700 font-semibold truncate">
                        {b.staffMembers && b.staffMembers.length > 0
                          ? `Active: ${b.staffMembers.map((s) => `${s.name} (${s.conversions} conv)`).slice(0, 2).join(", ")}`
                          : "Ready for auto-distribution"}
                      </p>
                    </div>

                    {/* 3. Email Coverage & Readiness */}
                    <div className="p-3 rounded-xl bg-teal-50/70 border border-teal-200/80 space-y-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-800 block">
                        Email Outreach Coverage
                      </span>
                      <div className="flex items-center justify-between">
                        <span className="text-base font-black text-teal-900">
                          {b.emailCount || 0} <span className="text-xs text-teal-600 font-semibold">with email</span>
                        </span>
                        <span className="text-xs font-black text-teal-700">{b.emailCoveragePercent || 0}%</span>
                      </div>
                      <p className="text-[10px] text-teal-700 font-semibold">
                        {b.emailCount && b.emailCount > 0 ? "Ready for direct mailing" : "Phone-primary batch"}
                      </p>
                    </div>

                    {/* 4. Locality Coverage */}
                    <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 block">
                        Geographic Reach
                      </span>
                      <div className="flex items-center justify-between">
                        <span className="text-base font-black text-amber-900">
                          {b.locationsCount || 0} <span className="text-xs text-amber-700 font-semibold">localities</span>
                        </span>
                        <MapPin size={14} className="text-amber-600 shrink-0" />
                      </div>
                      <p className="text-[10px] text-amber-800 font-bold truncate">
                        {b.topLocations && b.topLocations.length > 0
                          ? b.topLocations.slice(0, 2).join(", ")
                          : "Various Delhi NCR"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── In-Depth Batch Report Modal ── */}
      {selectedReportBatchId && (
        <BatchDetailedReportModal
          batchId={selectedReportBatchId}
          onClose={() => setSelectedReportBatchId(null)}
          onBatchUpdated={() => {
            // Re-fetch management hub data if updated
          }}
        />
      )}
    </div>
  );
}
