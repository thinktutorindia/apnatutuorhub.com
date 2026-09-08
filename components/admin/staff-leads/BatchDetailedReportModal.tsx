"use client";

import React, { useState, useEffect, useMemo, useTransition } from "react";
import Link from "next/link";
import {
  X, RefreshCw, Loader2, Download, Search, Filter, Phone, Mail, MapPin,
  Users, CheckCircle2, TrendingUp, AlertCircle, Clock, ShieldCheck,
  ChevronRight, ArrowUpRight, Copy, Check, Sparkles, BookOpen, Layers,
  PhoneCall, ExternalLink, SlidersHorizontal, UserCheck
} from "lucide-react";
import {
  getBatchDetailedReportAction,
  bulkReassignLeadsAction,
  type BatchDetailedReport
} from "@/app/actions/staff-leads.actions";
import { STATUS_META, formatPhoneNumber } from "@/lib/staff-lead-ui";

interface Props {
  batchId: string;
  initialBatchName?: string;
  isOpen?: boolean;
  onClose: () => void;
  onBatchUpdated?: () => void;
}

export function BatchDetailedReportModal({
  batchId,
  initialBatchName,
  isOpen = true,
  onClose,
  onBatchUpdated,
}: Props) {
  if (isOpen === false) return null;
  const [currentBatchId, setCurrentBatchId] = useState(batchId);
  const [data, setData] = useState<BatchDetailedReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"ANALYTICS" | "LEADS">("ANALYTICS");

  // Keep currentBatchId in sync if prop changes
  useEffect(() => {
    setCurrentBatchId(batchId);
  }, [batchId]);

  // Filters for Leads tab
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStaffFilter, setSelectedStaffFilter] = useState<string>("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("ALL");
  const [selectedLocationFilter, setSelectedLocationFilter] = useState<string>("ALL");
  const [selectedEmailFilter, setSelectedEmailFilter] = useState<"ALL" | "WITH_EMAIL" | "NO_EMAIL">("ALL");

  // Selection & Reassignment
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [targetReassignStaffId, setTargetReassignStaffId] = useState<string>("");
  const [isReassigning, startReassignTransition] = useTransition();
  const [actionNotice, setActionNotice] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Copied helper
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchReport = async (targetId = currentBatchId) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getBatchDetailedReportAction(targetId);
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.error || "Failed to load batch report.");
      }
    } catch (err: any) {
      setError(err?.message || "An error occurred while loading the report.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(currentBatchId);
  }, [currentBatchId]);

  const copyText = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Filtered Leads computation
  const filteredLeads = useMemo(() => {
    if (!data?.leads) return [];
    return data.leads.filter((lead) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = lead.name?.toLowerCase().includes(q);
        const matchesPhone = lead.phone?.includes(q);
        const matchesEmail = lead.email?.toLowerCase().includes(q);
        const matchesLoc = lead.location?.toLowerCase().includes(q);
        const matchesSubjects = lead.subjects?.some((s) => s.toLowerCase().includes(q));
        if (!matchesName && !matchesPhone && !matchesEmail && !matchesLoc && !matchesSubjects) {
          return false;
        }
      }

      // Staff filter
      if (selectedStaffFilter !== "ALL") {
        if (selectedStaffFilter === "UNASSIGNED") {
          if (lead.assignedTo !== null) return false;
        } else {
          if (lead.assignedTo?.id !== selectedStaffFilter) return false;
        }
      }

      // Status filter
      if (selectedStatusFilter !== "ALL") {
        if (lead.status !== selectedStatusFilter) return false;
      }

      // Location filter
      if (selectedLocationFilter !== "ALL") {
        if ((lead.location || "Unspecified") !== selectedLocationFilter) return false;
      }

      // Email filter
      if (selectedEmailFilter === "WITH_EMAIL") {
        if (!lead.email || !lead.email.includes("@")) return false;
      } else if (selectedEmailFilter === "NO_EMAIL") {
        if (lead.email && lead.email.includes("@")) return false;
      }

      return true;
    });
  }, [data?.leads, searchQuery, selectedStaffFilter, selectedStatusFilter, selectedLocationFilter, selectedEmailFilter]);

  // Bulk Reassign Handler
  const handleBulkReassign = () => {
    if (!selectedLeadIds.length || !targetReassignStaffId) return;
    const targetStaffObj = data?.availableStaff.find((s) => s.id === targetReassignStaffId);
    const targetName = targetStaffObj ? (targetStaffObj.name || targetStaffObj.email) : "Selected Staff";

    startReassignTransition(async () => {
      const res = await bulkReassignLeadsAction(selectedLeadIds, targetReassignStaffId);
      if (res.success && res.data) {
        setActionNotice({
          type: "success",
          text: `✓ Reassigned ${res.data.reassigned} leads to ${targetName}!`,
        });
        setSelectedLeadIds([]);
        fetchReport();
        if (onBatchUpdated) onBatchUpdated();
      } else {
        setActionNotice({
          type: "error",
          text: res.error || "Failed to reassign leads.",
        });
      }
    });
  };

  // CSV Export Handler
  const exportToCSV = () => {
    if (!filteredLeads.length) return;
    const headers = [
      "Candidate Name",
      "Phone",
      "Email",
      "Location",
      "Status",
      "Assigned Staff",
      "Calls Made",
      "Subjects",
      "Classes",
      "Is Promoted",
      "Created At",
    ];

    const rows = filteredLeads.map((l) => [
      `"${(l.name || "").replace(/"/g, '""')}"`,
      `"${(l.phone || "").replace(/"/g, '""')}"`,
      `"${(l.email || "").replace(/"/g, '""')}"`,
      `"${(l.location || "").replace(/"/g, '""')}"`,
      `"${l.status}"`,
      `"${(l.assignedTo?.name || l.assignedTo?.email || "Unassigned").replace(/"/g, '""')}"`,
      l.callCount,
      `"${(l.subjects || []).join(", ").replace(/"/g, '""')}"`,
      `"${(l.classes || []).join(", ").replace(/"/g, '""')}"`,
      l.isPromoted ? "YES" : "NO",
      `"${new Date(l.createdAt).toLocaleDateString("en-IN")}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${(data?.batch.name || "batch").replace(/\s+/g, "_")}_leads.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-6xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh] animate-in fade-in zoom-in-95">
        {/* ── Modal Header ── */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-[#0F2540] to-slate-900 text-white flex items-center justify-between gap-3 shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Layers size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white truncate">
                  {data?.batch.name || initialBatchName || "Batch Analytics & Full Report"}
                </h3>
                {data && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-emerald-300 border border-slate-700">
                    {data.metrics.totalLeads} Total Leads
                  </span>
                )}
                {data && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700 flex items-center gap-1">
                    <CheckCircle2 size={10} />
                    {data.metrics.convertedLeads} Converted ({data.metrics.conversionRate}%)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-semibold truncate mt-0.5">
                {data ? `Uploaded on ${new Date(data.batch.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}` : "Loading batch intelligence…"}
              </p>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center gap-2 shrink-0">
            {data && (
              <button
                type="button"
                onClick={exportToCSV}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Export filtered leads to CSV"
              >
                <Download size={13} />
                <span className="hidden sm:inline">Export CSV</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => fetchReport()}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
              title="Refresh data"
            >
              <RefreshCw size={14} className={loading ? "animate-spin text-emerald-400" : ""} />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-300 border border-slate-700 transition-colors cursor-pointer"
              title="Close modal"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Navigation Tabs & Batch Switcher ── */}
        <div className="px-5 py-2.5 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between gap-3 flex-wrap shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("ANALYTICS")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "ANALYTICS"
                  ? "bg-[#0F2540] text-white shadow-xs"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <TrendingUp size={13} />
              <span>Executive Overview &amp; Staff Matrix</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("LEADS")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "LEADS"
                  ? "bg-[#0F2540] text-white shadow-xs"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Users size={13} />
              <span>Leads Explorer &amp; Live Filters</span>
              {data && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-900 font-bold ml-1">
                  {filteredLeads.length}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Instant Batch Switcher */}
            {data?.allBatches && data.allBatches.length > 1 && (
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-black text-slate-500 flex items-center gap-1 shrink-0">
                  <Layers size={13} className="text-blue-600" /> Switch Batch:
                </span>
                <select
                  value={currentBatchId}
                  onChange={(e) => {
                    setCurrentBatchId(e.target.value);
                    setSelectedLeadIds([]);
                  }}
                  className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer pr-1 max-w-[200px] truncate"
                >
                  {data.allBatches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.totalParsed} leads)
                    </option>
                  ))}
                </select>
              </div>
            )}

            <Link
              href={`/admin/staff-leads?batchId=${currentBatchId}`}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 hover:underline"
              target="_blank"
            >
              <span>Open in Calling Desk</span>
              <ExternalLink size={12} />
            </Link>
          </div>
        </div>

        {/* ── Action Notice ── */}
        {actionNotice && (
          <div className={`px-5 py-2.5 text-xs font-bold flex items-center justify-between border-b ${
            actionNotice.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-red-50 text-red-800 border-red-200"
          }`}>
            <span>{actionNotice.text}</span>
            <button onClick={() => setActionNotice(null)} className="text-slate-400 hover:text-slate-700">
              ✕
            </button>
          </div>
        )}

        {/* ── Main Content Area ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 size={32} className="animate-spin text-emerald-600" />
              <p className="text-sm font-bold text-slate-600">Generating in-depth batch report and staff telemetry…</p>
            </div>
          ) : error ? (
            <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-center space-y-3">
              <AlertCircle size={28} className="mx-auto text-red-500" />
              <p className="font-bold">{error}</p>
              <button
                onClick={() => fetchReport()}
                className="px-4 py-2 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : data ? (
            <>
              {/* ────────────────────────────────────────────────────────── */}
              {/* TAB 1: EXECUTIVE ANALYTICS & STAFF MATRIX                   */}
              {/* ────────────────────────────────────────────────────────── */}
              {activeTab === "ANALYTICS" && (
                <div className="space-y-6">
                  {/* 6 Executive Stat Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {/* 1. Total Leads */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">Total Leads</span>
                      <p className="text-xl font-black text-slate-900">{data.metrics.totalLeads}</p>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {data.batch.totalJunk > 0 ? `${data.batch.totalJunk} junk filtered` : "100% clean parsed"}
                      </p>
                    </div>

                    {/* 2. Conversions */}
                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 block">Conversions</span>
                      <p className="text-xl font-black text-emerald-700">{data.metrics.convertedLeads}</p>
                      <div className="flex items-center gap-1.5">
                        <div className="flex-1 bg-emerald-200 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${Math.min(100, data.metrics.conversionRate)}%` }} />
                        </div>
                        <span className="text-[10px] font-black text-emerald-800">{data.metrics.conversionRate}%</span>
                      </div>
                    </div>

                    {/* 3. Calls Made */}
                    <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 space-y-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-800 block">Calls Logged</span>
                      <p className="text-xl font-black text-blue-700">{data.metrics.totalCallsLogged}</p>
                      <p className="text-[11px] text-blue-700 font-medium">
                        {data.metrics.contactedLeads} contacted / {data.metrics.noAnswerLeads} retries
                      </p>
                    </div>

                    {/* 4. Email Coverage */}
                    <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 space-y-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-800 block">Email Coverage</span>
                      <p className="text-xl font-black text-teal-700">{data.metrics.emailCount}</p>
                      <p className="text-[11px] text-teal-700 font-medium">
                        {data.metrics.emailCoveragePercent}% with email address
                      </p>
                    </div>

                    {/* 5. Assigned Workload */}
                    <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 space-y-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-800 block">Assigned / Pool</span>
                      <p className="text-xl font-black text-indigo-700">{data.metrics.assignedLeads}</p>
                      <p className="text-[11px] text-indigo-700 font-medium">
                        {data.metrics.unassignedLeads} leads unassigned
                      </p>
                    </div>

                    {/* 6. Geographic Reach */}
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 block">Locations Covered</span>
                      <p className="text-xl font-black text-amber-700">{data.metrics.distinctLocationsCount}</p>
                      <p className="text-[11px] text-amber-800 font-medium truncate">
                        Top: {data.locationBreakdown[0]?.location || "Various"}
                      </p>
                    </div>
                  </div>

                  {/* Section 1: "Which staff doing what things" (Staff Matrix) */}
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs space-y-3">
                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                          <UserCheck size={16} className="text-emerald-600" />
                          <span>Staff Performance &amp; Activity Breakdown (&ldquo;Who Did What&rdquo;)</span>
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Calls logged, conversion count, success rate, and pending follow-ups for each team member on this batch.
                        </p>
                      </div>
                      <span className="text-xs font-bold text-slate-400 font-mono">
                        {data.staffBreakdown.length} active team members
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider">
                            <th className="text-left px-4 py-2.5">Staff Member</th>
                            <th className="text-center px-3 py-2.5">Assigned Leads</th>
                            <th className="text-center px-3 py-2.5">Calls Logged</th>
                            <th className="text-center px-3 py-2.5">Conversions</th>
                            <th className="text-center px-3 py-2.5">Conversion %</th>
                            <th className="text-center px-3 py-2.5">Follow-Ups Due</th>
                            <th className="text-right px-4 py-2.5">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-semibold">
                          {data.staffBreakdown.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-8 text-center text-slate-400">
                                No leads assigned yet in this batch.
                              </td>
                            </tr>
                          ) : (
                            data.staffBreakdown.map((s) => (
                              <tr key={s.staffId} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-black flex items-center justify-center text-xs shrink-0">
                                      {s.staffName[0]?.toUpperCase() || "S"}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-extrabold text-slate-900 truncate">{s.staffName}</p>
                                      <p className="text-[10px] text-slate-400 font-mono truncate">{s.staffEmail}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 py-3 text-center font-bold text-slate-800">
                                  {s.assignedCount}
                                  <span className="text-[10px] text-slate-400 font-normal ml-1">
                                    ({data.metrics.totalLeads > 0 ? Math.round((s.assignedCount / data.metrics.totalLeads) * 100) : 0}%)
                                  </span>
                                </td>
                                <td className="px-3 py-3 text-center font-bold text-blue-600">
                                  {s.callsLogged}
                                </td>
                                <td className="px-3 py-3 text-center font-black text-emerald-600">
                                  {s.convertedCount}
                                </td>
                                <td className="px-3 py-3 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <div className="w-14 bg-slate-100 h-2 rounded-full overflow-hidden">
                                      <div
                                        className="bg-emerald-500 h-full rounded-full"
                                        style={{ width: `${Math.min(100, s.conversionRate)}%` }}
                                      />
                                    </div>
                                    <span className="text-[11px] font-black text-slate-800">{s.conversionRate}%</span>
                                  </div>
                                </td>
                                <td className="px-3 py-3 text-center">
                                  {s.followUpsDue > 0 ? (
                                    <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[10px]">
                                      ⚠️ {s.followUpsDue} due
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 text-[11px] font-medium">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedStaffFilter(s.staffId === "unassigned" ? "UNASSIGNED" : s.staffId);
                                      setActiveTab("LEADS");
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#0F2540] text-[10px] font-extrabold cursor-pointer transition-colors"
                                  >
                                    View Leads →
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Section 2: Location & Geographical Footprint */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Location Breakdown Table */}
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs space-y-3">
                      <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                            <MapPin size={16} className="text-amber-600" />
                            <span>Locality &amp; City Breakdown</span>
                          </h4>
                          <p className="text-xs text-slate-500 mt-0.5">Top locations and conversion success per region.</p>
                        </div>
                        <span className="text-xs font-bold text-slate-400 font-mono">
                          {data.locationBreakdown.length} localities
                        </span>
                      </div>

                      <div className="max-h-72 overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider">
                              <th className="text-left px-4 py-2">Locality</th>
                              <th className="text-center px-3 py-2">Leads</th>
                              <th className="text-center px-3 py-2">Converted</th>
                              <th className="text-right px-4 py-2">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-semibold">
                            {data.locationBreakdown.map((loc) => (
                              <tr key={loc.location} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-2.5 font-extrabold text-slate-800">
                                  {loc.location}
                                </td>
                                <td className="px-3 py-2.5 text-center text-slate-700">
                                  {loc.totalLeads}
                                </td>
                                <td className="px-3 py-2.5 text-center font-bold text-emerald-600">
                                  {loc.convertedCount} ({loc.conversionRate}%)
                                </td>
                                <td className="px-4 py-2.5 text-right">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedLocationFilter(loc.location);
                                      setActiveTab("LEADS");
                                    }}
                                    className="text-[10px] font-extrabold text-emerald-700 hover:underline cursor-pointer"
                                  >
                                    Filter →
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Status & Funnel Progression Breakdown */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3 flex flex-col justify-between">
                      <div>
                        <h4 className="text-sm font-black text-slate-900 flex items-center gap-2 mb-1">
                          <SlidersHorizontal size={16} className="text-blue-600" />
                          <span>Status Progression Breakdown</span>
                        </h4>
                        <p className="text-xs text-slate-500 mb-4">
                          Distribution of leads across CRM workflow stages for this batch.
                        </p>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                          {Object.entries(data.statusBreakdown).map(([status, count]) => {
                            const meta = STATUS_META[status as keyof typeof STATUS_META] || { label: status, bg: "bg-slate-100", text: "text-slate-700", ring: "ring-slate-200" };
                            return (
                              <button
                                key={status}
                                type="button"
                                onClick={() => {
                                  setSelectedStatusFilter(status);
                                  setActiveTab("LEADS");
                                }}
                                className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 transition-all text-left cursor-pointer group"
                              >
                                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                                  {meta.label}
                                </span>
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-lg font-black text-slate-900">{count}</span>
                                  <span className="text-[10px] font-bold text-slate-400 group-hover:text-emerald-600">
                                    {data.metrics.totalLeads > 0 ? Math.round((count / data.metrics.totalLeads) * 100) : 0}%
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200/80 flex items-center justify-between text-xs">
                        <span className="font-bold text-emerald-900">
                          Ready to drill into candidate data?
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveTab("LEADS")}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-extrabold text-xs hover:bg-emerald-700 cursor-pointer shadow-xs"
                        >
                          Open Leads Desk ({data.metrics.totalLeads}) →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ────────────────────────────────────────────────────────── */}
              {/* TAB 2: LEADS EXPLORER & LIVE FILTERS                        */}
              {/* ────────────────────────────────────────────────────────── */}
              {activeTab === "LEADS" && (
                <div className="space-y-4">
                  {/* Filter Toolbar */}
                  <div className="bg-slate-50 rounded-2xl border border-slate-200 p-3 sm:p-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                      {/* Search */}
                      <div className="relative lg:col-span-2">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search candidate name, phone, email, locality..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-8 pr-7 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
                        />
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>

                      {/* Staff Filter */}
                      <div>
                        <select
                          value={selectedStaffFilter}
                          onChange={(e) => setSelectedStaffFilter(e.target.value)}
                          className="w-full py-2 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer"
                        >
                          <option value="ALL">All Staff Members</option>
                          <option value="UNASSIGNED">Unassigned Pool</option>
                          {data.availableStaff.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name || s.email}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Status Filter */}
                      <div>
                        <select
                          value={selectedStatusFilter}
                          onChange={(e) => setSelectedStatusFilter(e.target.value)}
                          className="w-full py-2 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer"
                        >
                          <option value="ALL">All Statuses</option>
                          {Object.keys(data.statusBreakdown).map((status) => (
                            <option key={status} value={status}>
                              {status.replace(/_/g, " ")} ({data.statusBreakdown[status]})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Email Filter */}
                      <div>
                        <select
                          value={selectedEmailFilter}
                          onChange={(e) => setSelectedEmailFilter(e.target.value as any)}
                          className="w-full py-2 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer"
                        >
                          <option value="ALL">All Contact Types</option>
                          <option value="WITH_EMAIL">Has Email ({data.metrics.emailCount})</option>
                          <option value="NO_EMAIL">Missing Email ({data.metrics.totalLeads - data.metrics.emailCount})</option>
                        </select>
                      </div>
                    </div>

                    {/* Location chips & Clear Filter Bar */}
                    <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-slate-200/70 text-xs">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Quick Location:</span>
                        <button
                          type="button"
                          onClick={() => setSelectedLocationFilter("ALL")}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold cursor-pointer transition-all ${
                            selectedLocationFilter === "ALL"
                              ? "bg-[#0F2540] text-white"
                              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          All Locations
                        </button>
                        {data.availableLocations.slice(0, 6).map((loc) => (
                          <button
                            key={loc}
                            type="button"
                            onClick={() => setSelectedLocationFilter(loc)}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold cursor-pointer transition-all ${
                              selectedLocationFilter === loc
                                ? "bg-amber-600 text-white"
                                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            {loc}
                          </button>
                        ))}
                      </div>

                      {(searchQuery || selectedStaffFilter !== "ALL" || selectedStatusFilter !== "ALL" || selectedLocationFilter !== "ALL" || selectedEmailFilter !== "ALL") && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery("");
                            setSelectedStaffFilter("ALL");
                            setSelectedStatusFilter("ALL");
                            setSelectedLocationFilter("ALL");
                            setSelectedEmailFilter("ALL");
                          }}
                          className="text-[11px] font-extrabold text-rose-600 hover:underline cursor-pointer"
                        >
                          Reset Filters ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Bulk Reassignment Control Bar */}
                  {selectedLeadIds.length > 0 && (
                    <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between flex-wrap gap-3 animate-in fade-in">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-700" />
                        <span className="text-xs font-black text-emerald-900">
                          {selectedLeadIds.length} leads selected
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={targetReassignStaffId}
                          onChange={(e) => setTargetReassignStaffId(e.target.value)}
                          className="py-1.5 px-3 rounded-xl border border-emerald-300 bg-white text-xs font-semibold text-slate-800"
                        >
                          <option value="">Select target staff member...</option>
                          {data.availableStaff.map((s) => (
                            <option key={s.id} value={s.id}>
                              Assign to: {s.name || s.email}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={handleBulkReassign}
                          disabled={!targetReassignStaffId || isReassigning}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-700 text-white text-xs font-extrabold hover:bg-emerald-800 disabled:opacity-50 cursor-pointer transition-all shadow-xs"
                        >
                          {isReassigning ? "Reassigning..." : "Reassign Leads Now"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedLeadIds([])}
                          className="text-xs text-slate-500 font-bold hover:underline cursor-pointer"
                        >
                          Deselect All
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Leads Data Table */}
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider">
                            <th className="w-8 px-3 py-3 text-center">
                              <input
                                type="checkbox"
                                checked={filteredLeads.length > 0 && selectedLeadIds.length === filteredLeads.length}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedLeadIds(filteredLeads.map((l) => l.id));
                                  } else {
                                    setSelectedLeadIds([]);
                                  }
                                }}
                                className="rounded text-emerald-600 cursor-pointer"
                              />
                            </th>
                            <th className="text-left px-3 py-3">Candidate &amp; Phone</th>
                            <th className="text-left px-3 py-3">Email Address</th>
                            <th className="text-left px-3 py-3">Location &amp; Classes</th>
                            <th className="text-left px-3 py-3">Assigned Staff</th>
                            <th className="text-center px-3 py-3">Status</th>
                            <th className="text-center px-3 py-3">Calls Made</th>
                            <th className="text-right px-4 py-3">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-semibold">
                          {filteredLeads.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="py-12 text-center text-slate-400">
                                No leads match your filter criteria.
                              </td>
                            </tr>
                          ) : (
                            filteredLeads.map((lead) => {
                              const isSelected = selectedLeadIds.includes(lead.id);
                              const statusMetaItem = STATUS_META[lead.status] || { label: lead.status, color: "bg-slate-100 text-slate-700 border-slate-200" };
                              return (
                                <tr key={lead.id} className={`hover:bg-slate-50 transition-colors ${isSelected ? "bg-emerald-50/40" : ""}`}>
                                  {/* Checkbox */}
                                  <td className="px-3 py-3 text-center">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => {
                                        setSelectedLeadIds((prev) =>
                                          prev.includes(lead.id) ? prev.filter((id) => id !== lead.id) : [...prev, lead.id]
                                        );
                                      }}
                                      className="rounded text-emerald-600 cursor-pointer"
                                    />
                                  </td>

                                  {/* Name & Phone */}
                                  <td className="px-3 py-3">
                                    <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                                      <span>{lead.name || "Candidate"}</span>
                                      {lead.isPromoted && (
                                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                                          ✓ Primary
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1 mt-0.5">
                                      <span className="font-mono text-[11px] text-slate-600">
                                        {formatPhoneNumber(lead.phone)}
                                      </span>
                                      {lead.phone && (
                                        <button
                                          type="button"
                                          onClick={() => copyText(lead.phone!, `phone-${lead.id}`)}
                                          className="text-slate-400 hover:text-slate-600 cursor-pointer"
                                          title="Copy phone"
                                        >
                                          {copiedId === `phone-${lead.id}` ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                                        </button>
                                      )}
                                    </div>
                                  </td>

                                  {/* Email */}
                                  <td className="px-3 py-3">
                                    {lead.email ? (
                                      <div className="flex items-center gap-1.5">
                                        <Mail size={12} className="text-teal-600 shrink-0" />
                                        <span className="font-mono text-[11px] text-slate-700 truncate max-w-[170px]">
                                          {lead.email}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => copyText(lead.email!, `email-${lead.id}`)}
                                          className="text-slate-400 hover:text-slate-600 cursor-pointer shrink-0"
                                          title="Copy email"
                                        >
                                          {copiedId === `email-${lead.id}` ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                                        </button>
                                      </div>
                                    ) : (
                                      <span className="text-slate-400 text-[11px] italic font-normal">
                                        Missing email
                                      </span>
                                    )}
                                  </td>

                                  {/* Location & Classes */}
                                  <td className="px-3 py-3">
                                    <p className="font-bold text-slate-800 truncate max-w-[150px]">
                                      {lead.location || "Unspecified"}
                                    </p>
                                    {lead.classes?.length > 0 && (
                                      <p className="text-[10px] text-slate-400 truncate max-w-[150px]">
                                        {lead.classes.slice(0, 2).join(", ")}
                                      </p>
                                    )}
                                  </td>

                                  {/* Assigned Staff */}
                                  <td className="px-3 py-3">
                                    {lead.assignedTo ? (
                                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-800 text-[11px] font-extrabold border border-slate-200">
                                        {lead.assignedTo.name || lead.assignedTo.email.split("@")[0]}
                                      </span>
                                    ) : (
                                      <span className="text-amber-600 font-extrabold text-[11px]">
                                        Unassigned Pool
                                      </span>
                                    )}
                                  </td>

                                  {/* Status */}
                                  <td className="px-3 py-3 text-center">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ring-1 ${statusMetaItem.bg} ${statusMetaItem.text} ${statusMetaItem.ring}`}>
                                      {statusMetaItem.label}
                                    </span>
                                  </td>

                                  {/* Calls Made */}
                                  <td className="px-3 py-3 text-center">
                                    <span className="font-extrabold text-blue-600">{lead.callCount}</span>
                                    {lead.lastContactedAt && (
                                      <span className="text-[10px] text-slate-400 block font-normal">
                                        {new Date(lead.lastContactedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                                      </span>
                                    )}
                                  </td>

                                  {/* Action */}
                                  <td className="px-4 py-3 text-right">
                                    <Link
                                      href={`/admin/staff-leads/my-leads?search=${encodeURIComponent(lead.phone || lead.name || "")}`}
                                      className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-extrabold transition-colors inline-flex items-center gap-1"
                                      target="_blank"
                                    >
                                      <span>Call</span>
                                      <ArrowUpRight size={11} />
                                    </Link>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
