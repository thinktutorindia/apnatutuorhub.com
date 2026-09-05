"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  Users, Upload, RotateCcw, Search, Filter, CheckSquare, Square,
  Loader2, ArrowRight, UserCheck, ChevronDown, AlertCircle, CheckCircle2,
  Sparkles, Layers, Sliders, RefreshCw, Zap, ShieldCheck
} from "lucide-react";
import {
  assignLeadsAction,
  autoRotateLeadsAction,
  distributeLeadsMultiStaffAction,
  type DistributeMode
} from "@/app/actions/staff-leads.actions";
import type { StaffLeadStatus } from "@prisma/client";
import { StaffCrmPlaybook } from "@/components/admin/staff-leads/StaffCrmPlaybook";
import { StaffLeadsNavHeader } from "@/components/admin/staff-leads/StaffLeadsNavHeader";

type Lead = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  location: string | null;
  subjects: string[];
  classes: string[];
  status: StaffLeadStatus;
  assignedToId: string | null;
  assignedTo: { name: string | null } | null;
};

type StaffMember = {
  id: string;
  name: string | null;
  email: string;
  subAdminRole: string | null;
  _count_leads: number;
};

interface Props {
  leads: Lead[];
  totalPoolCount?: number;
  staff: StaffMember[];
}

export function StaffLeadsAssignClient({ leads: initialLeads, totalPoolCount = 0, staff }: Props) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [totalPool, setTotalPool] = useState<number>(totalPoolCount || initialLeads.length);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedStaffIds, setSelectedStaffIds] = useState<Set<string>>(new Set());
  const [distributeMode, setDistributeMode] = useState<DistributeMode>("EQUAL_SPLIT");
  const [quotaPerStaff, setQuotaPerStaff] = useState<number>(100);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string; breakdown?: Record<string, number> } | null>(null);

  const filtered = leads.filter((l) =>
    !search || [l.name, l.phone, l.email, l.location].some((v) => v?.toLowerCase().includes(search.toLowerCase()))
  );

  const allSelected = filtered.length > 0 && filtered.every((l) => selectedIds.has(l.id));
  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((l) => l.id)));
  };

  const toggleLead = (id: string) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleStaff = (id: string) => {
    setSelectedStaffIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const selectAllStaff = () => {
    if (selectedStaffIds.size === staff.length) {
      setSelectedStaffIds(new Set());
    } else {
      setSelectedStaffIds(new Set(staff.map((s) => s.id)));
    }
  };

  // Distribution Execution
  const handleDistribute = (customQuota?: number) => {
    const staffIds = Array.from(selectedStaffIds);
    if (staffIds.length === 0) {
      setMessage({ type: "error", text: "Please select at least one staff member." });
      return;
    }

    const quota = customQuota ?? quotaPerStaff;
    const leadsToAssign = selectedIds.size > 0 ? Array.from(selectedIds) : undefined;

    if (!leadsToAssign && leads.length === 0) {
      setMessage({ type: "error", text: "No unassigned leads available in the pool." });
      return;
    }

    startTransition(async () => {
      const res = await distributeLeadsMultiStaffAction({
        staffUserIds: staffIds,
        leadIds: leadsToAssign,
        quotaPerStaff: quota,
        distributeMode: leadsToAssign ? "EQUAL_SPLIT" : "PER_STAFF_QUOTA",
      });

      if (res.success && res.data) {
        const assignedCount = res.data.totalAssigned;
        const staffNames = staffIds
          .map((id) => staff.find((s) => s.id === id)?.name ?? "Staff")
          .join(", ");

        setMessage({
          type: "success",
          text: `✓ Successfully distributed ${assignedCount} leads across ${staffIds.length} staff (${staffNames})!`,
          breakdown: res.data.breakdown,
        });

        // Decrement total unassigned pool count
        setTotalPool((prev) => Math.max(0, prev - assignedCount));

        // Remove assigned leads from current view
        if (leadsToAssign) {
          const assignedSet = new Set(leadsToAssign);
          setLeads((prev) => prev.filter((l) => !assignedSet.has(l.id)));
          setSelectedIds(new Set());
        } else {
          // Refresh list if bulk quota was pulled from database
          setLeads((prev) => prev.slice(assignedCount));
        }
      } else {
        setMessage({ type: "error", text: res.error ?? "Distribution failed." });
      }
    });
  };

  const handleAutoRotate = () => {
    startTransition(async () => {
      const res = await autoRotateLeadsAction();
      if (res.success && res.data) {
        setMessage({
          type: "success",
          text: `✓ Auto-rotated ${res.data.rotated} stale/no-answer leads across active staff members.`,
        });
      } else {
        setMessage({ type: "error", text: res.error ?? "Auto-rotate failed" });
      }
    });
  };

  // Quick helper calculations
  const selectedStaffList = staff.filter((s) => selectedStaffIds.has(s.id));
  const leadsPerStaffPreview = selectedStaffList.length > 0 && selectedIds.size > 0
    ? Math.floor(selectedIds.size / selectedStaffList.length)
    : quotaPerStaff;

  return (
    <div className="space-y-6">
      {/* ── Unified Nav Header ── */}
      <StaffLeadsNavHeader
        activeKey="assign"
        totalLeads={totalPool}
        subtitle="Split raw unassigned contacts across active telecallers with fair-share quotas."
      />

      {/* Quick Action Ribbon */}
      <div className="ath-panel flex items-center justify-between flex-wrap gap-4 p-4 sm:p-5">
        <div>
          <span className="text-[11px] font-bold text-slate-500">
            Unassigned Lead Pool: <strong className="text-[#2D9E6B] font-extrabold">{totalPool.toLocaleString()}</strong> {totalPool > leads.length ? `(showing ${leads.length})` : ""}
          </span>
          <p className="text-xs text-slate-600 mt-0.5 font-semibold">
            Choose staff members below to distribute contacts evenly or specify custom quotas.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleAutoRotate}
            disabled={isPending}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 transition-all cursor-pointer"
          >
            {isPending ? <Loader2 size={14} className="animate-spin text-emerald-600" /> : <RotateCcw size={14} className="text-slate-500" />}
            Auto-Rotate Yesterday&apos;s Leads
          </button>
          <Link
            href="/admin/staff-leads/upload"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#2D9E6B] text-white text-xs font-800 hover:bg-[#238357]"
          >
            <Upload size={14} /> Upload More Leads
          </Link>
        </div>
      </div>

      <StaffCrmPlaybook compact />

      {/* Alert Notification */}
      {message && (
        <div
          className={`rounded-2xl p-4 flex items-center justify-between gap-3 text-xs font-bold ${
            message.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* ─── Multi-Staff Selection Grid ─── */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-emerald-600" />
            <h2 className="text-sm font-black text-slate-900">
              Select Staff Members ({selectedStaffIds.size} of {staff.length} Selected)
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={selectAllStaff}
              className="text-xs font-extrabold px-3 py-1 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              {selectedStaffIds.size === staff.length ? "Deselect All" : "Select All Active Staff"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {staff.map((s) => {
            const isSelected = selectedStaffIds.has(s.id);
            return (
              <div
                key={s.id}
                onClick={() => toggleStaff(s.id)}
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                  isSelected
                    ? "border-emerald-500 bg-emerald-50/70 shadow-xs"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-extrabold text-xs">
                    {(s.name ?? s.email)[0].toUpperCase()}
                  </div>
                  <div>
                    {isSelected ? (
                      <CheckSquare size={16} className="text-emerald-600" />
                    ) : (
                      <Square size={16} className="text-slate-300" />
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-extrabold text-slate-800 truncate">{s.name ?? s.email.split("@")[0]}</p>
                  <p className="text-[10px] text-slate-500 font-semibold">{s.subAdminRole || "Staff"}</p>
                  <p className="text-[11px] text-emerald-700 font-black mt-1">
                    {s._count_leads} active leads
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Multi-Staff Distribution Control Bar ─── */}
      {selectedStaffIds.size > 0 && (
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6 shadow-lg space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider font-extrabold text-emerald-400 flex items-center gap-1.5">
                <Sparkles size={14} /> Multi-Staff Allocation Ready
              </p>
              <h3 className="text-lg font-black text-white mt-0.5">
                {selectedIds.size > 0
                  ? `Assign ${selectedIds.size} Selected Leads across ${selectedStaffList.length} Staff`
                  : `Allocate Daily Quota across ${selectedStaffList.length} Selected Staff`}
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                {selectedIds.size > 0 ? (
                  <>
                    Split equally: <strong>~{leadsPerStaffPreview} leads each</strong> to {selectedStaffList.map((s) => s.name || s.email.split("@")[0]).join(", ")}.
                  </>
                ) : (
                  <>
                    Pull fresh leads: <strong>{quotaPerStaff} leads per staff</strong> ({quotaPerStaff * selectedStaffList.length} total from <strong>{totalPool.toLocaleString()}</strong> unassigned pool).
                  </>
                )}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 flex-wrap">
              {selectedIds.size === 0 && (
                <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700 rounded-2xl px-3 py-2 flex-wrap shadow-xs">
                  <span className="text-xs text-slate-300 font-bold flex items-center gap-1">
                    <Sliders size={13} className="text-emerald-400" />
                    Custom Quota/Staff:
                  </span>

                  {/* Direct Editable Custom Number Input */}
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={1}
                      max={leads.length || 5000}
                      value={quotaPerStaff || ""}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setQuotaPerStaff(isNaN(val) ? 0 : Math.max(1, val));
                      }}
                      placeholder="Qty"
                      className="w-20 px-2.5 py-1 rounded-xl bg-slate-950 border border-emerald-500 text-emerald-300 font-black text-xs text-center focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                    <span className="text-[11px] text-slate-400 font-semibold">leads</span>
                  </div>

                  {/* Fast Preset Buttons */}
                  <div className="flex items-center gap-1 border-l border-slate-700 pl-2">
                    {[25, 50, 100, 150, 200, 500].map((q) => (
                      <button
                        key={q}
                        onClick={() => setQuotaPerStaff(q)}
                        className={`px-2 py-0.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                          quotaPerStaff === q
                            ? "bg-emerald-500 text-slate-950 font-black shadow-xs"
                            : "bg-slate-700/60 text-slate-300 hover:bg-slate-700 hover:text-white"
                        }`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => handleDistribute()}
                disabled={isPending || (selectedIds.size === 0 && quotaPerStaff <= 0)}
                className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center gap-2 shadow-md shadow-emerald-500/20 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isPending ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                {selectedIds.size > 0
                  ? `Distribute ${selectedIds.size} Leads (~${leadsPerStaffPreview}/staff)`
                  : `Assign ${quotaPerStaff * selectedStaffList.length} Leads (${quotaPerStaff}/staff)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Search & Leads Pool Table ─── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, phone, email, location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Quick Bulk Select Helper */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="font-bold">Select first:</span>
              {[25, 50, 100, 200, 500].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    const topN = filtered.slice(0, num).map((l) => l.id);
                    setSelectedIds(new Set(topN));
                  }}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-extrabold transition-all cursor-pointer"
                >
                  {num}
                </button>
              ))}
              {selectedIds.size > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="px-2 py-1 rounded-xl text-rose-600 hover:bg-rose-50 font-bold transition-all cursor-pointer ml-1"
                >
                  Clear Selection
                </button>
              )}
            </div>

            <span className="text-xs text-slate-600 font-extrabold bg-slate-100 px-3 py-1.5 rounded-xl">
              {selectedIds.size} selected
            </span>
          </div>
        </div>

        {/* Leads Table */}
        <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  <th className="px-4 py-3.5 w-10">
                    <button onClick={toggleAll} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                      {allSelected ? <CheckSquare size={16} className="text-emerald-600" /> : <Square size={16} />}
                    </button>
                  </th>
                  <th className="px-4 py-3.5 font-black text-slate-600 uppercase tracking-wider">Candidate / Tutor</th>
                  <th className="px-4 py-3.5 font-black text-slate-600 uppercase tracking-wider">Phone</th>
                  <th className="px-4 py-3.5 font-black text-slate-600 uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3.5 font-black text-slate-600 uppercase tracking-wider">Location</th>
                  <th className="px-4 py-3.5 font-black text-slate-600 uppercase tracking-wider">Subjects</th>
                  <th className="px-4 py-3.5 font-black text-slate-600 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400">
                      <Users size={36} className="mx-auto mb-3 opacity-30 text-slate-400" />
                      <p className="font-extrabold text-slate-600">No unassigned leads found in the pool</p>
                      <p className="text-xs mt-1 text-slate-400">All data has been distributed or no leads match your search</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((lead) => {
                    const isChecked = selectedIds.has(lead.id);
                    return (
                      <tr
                        key={lead.id}
                        className={`hover:bg-slate-50/80 transition-colors ${isChecked ? "bg-emerald-50/50" : ""}`}
                      >
                        <td className="px-4 py-3">
                          <button onClick={() => toggleLead(lead.id)} className="cursor-pointer">
                            {isChecked ? (
                              <CheckSquare size={16} className="text-emerald-600" />
                            ) : (
                              <Square size={16} className="text-slate-300 hover:text-slate-400" />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3 font-extrabold text-slate-900">
                          {lead.name ?? <span className="text-slate-400 italic font-normal">Unknown Tutor</span>}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-700">
                          {lead.phone ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {lead.email ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {lead.location ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {lead.subjects.slice(0, 2).map((s) => (
                              <span key={s} className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-bold">
                                {s}
                              </span>
                            ))}
                            {lead.subjects.length > 2 && (
                              <span className="text-[10px] text-slate-400 font-bold">+{lead.subjects.length - 2}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/admin/staff-leads/${lead.id}`}
                            className="text-xs text-emerald-600 font-black hover:underline inline-flex items-center gap-1"
                          >
                            Details <ArrowRight size={11} />
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
    </div>
  );
}
