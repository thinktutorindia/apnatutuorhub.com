"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  Users, Upload, RotateCcw, Search, Filter, CheckSquare, Square,
  Loader2, ArrowRight, UserCheck, ChevronDown, AlertCircle, CheckCircle2
} from "lucide-react";
import { assignLeadsAction, autoRotateLeadsAction } from "@/app/actions/staff-leads.actions";
import type { StaffLeadStatus } from "@prisma/client";

type Lead = {
  id: string; name: string | null; phone: string | null; email: string | null;
  location: string | null; subjects: string[]; classes: string[]; status: StaffLeadStatus;
  assignedToId: string | null; assignedTo: { name: string | null } | null;
};

type StaffMember = {
  id: string; name: string | null; email: string; subAdminRole: string | null;
  _count_leads: number;
};

interface Props {
  leads: Lead[];
  staff: StaffMember[];
}

export function StaffLeadsAssignClient({ leads, staff }: Props) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedStaff, setSelectedStaff] = useState("");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const filtered = leads.filter((l) =>
    !search || [l.name, l.phone, l.email, l.location].some((v) => v?.toLowerCase().includes(search.toLowerCase()))
  );

  const allSelected = filtered.length > 0 && filtered.every((l) => selectedIds.has(l.id));
  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((l) => l.id)));
  };
  const toggle = (id: string) => {
    setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const handleAssign = () => {
    if (!selectedStaff) { setMessage({ type: "error", text: "Select a staff member" }); return; }
    if (selectedIds.size === 0) { setMessage({ type: "error", text: "Select at least one lead" }); return; }
    startTransition(async () => {
      const res = await assignLeadsAction(selectedStaff, [...selectedIds]);
      if (res.success && res.data) {
        setMessage({ type: "success", text: `✓ ${res.data.assigned} leads assigned successfully!` });
        setSelectedIds(new Set());
      } else {
        setMessage({ type: "error", text: res.error ?? "Assignment failed" });
      }
    });
  };

  const handleAutoRotate = () => {
    startTransition(async () => {
      const res = await autoRotateLeadsAction();
      if (res.success && res.data) setMessage({ type: "success", text: `✓ Auto-rotated ${res.data.rotated} NO_ANSWER leads` });
      else setMessage({ type: "error", text: res.error ?? "Auto-rotate failed" });
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Assign Leads to Staff</h1>
          <p className="text-sm text-slate-500 mt-1">{leads.length} unassigned leads · {staff.length} staff members available</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleAutoRotate} disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            {isPending ? <Loader2 size={15} className="animate-spin" /> : <RotateCcw size={15} />}
            Auto-Rotate Yesterday's Leads
          </button>
          <Link href="/admin/staff-leads/upload"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700">
            <Upload size={15} /> Upload More
          </Link>
        </div>
      </div>

      {message && (
        <div className={`rounded-xl p-4 flex items-center gap-2 text-sm ${message.type === "success" ? "bg-emerald-50 border border-emerald-200 text-emerald-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
          {message.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {message.text}
        </div>
      )}

      {/* Staff workload */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {staff.map((s) => (
          <button key={s.id} onClick={() => setSelectedStaff(s.id)}
            className={`p-3 rounded-xl border-2 text-left transition-all ${selectedStaff === s.id ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-white hover:border-slate-300"}`}>
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center mb-2 text-emerald-700 font-bold text-sm">
              {(s.name ?? s.email)[0].toUpperCase()}
            </div>
            <p className="text-xs font-bold text-slate-800 truncate">{s.name ?? s.email.split("@")[0]}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s._count_leads} active leads</p>
          </button>
        ))}
      </div>

      {/* Assign button */}
      {selectedIds.size > 0 && selectedStaff && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
          <p className="text-sm text-emerald-800 font-semibold">
            Assigning <strong>{selectedIds.size}</strong> leads to <strong>{staff.find((s) => s.id === selectedStaff)?.name ?? "selected staff"}</strong>
          </p>
          <button onClick={handleAssign} disabled={isPending}
            className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2">
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />}
            Assign Now
          </button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input type="text" placeholder="Search by name, phone, email, location..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white" />
      </div>

      {/* Leads table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left">
                  <button onClick={toggleAll} className="text-slate-400 hover:text-slate-700">
                    {allSelected ? <CheckSquare size={16} className="text-emerald-600" /> : <Square size={16} />}
                  </button>
                </th>
                <th className="text-left px-4 py-3 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Phone</th>
                <th className="text-left px-4 py-3 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Location</th>
                <th className="text-left px-4 py-3 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Subjects</th>
                <th className="text-left px-4 py-3 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <Users size={32} className="mx-auto mb-3 opacity-30" />
                    <p className="font-semibold">No unassigned leads found</p>
                    <p className="text-xs mt-1">Upload new leads or change filters</p>
                  </td>
                </tr>
              ) : (
                filtered.map((lead) => (
                  <tr key={lead.id} className={`hover:bg-slate-50 transition-colors ${selectedIds.has(lead.id) ? "bg-emerald-50/50" : ""}`}>
                    <td className="px-4 py-3">
                      <button onClick={() => toggle(lead.id)}>
                        {selectedIds.has(lead.id) ? <CheckSquare size={16} className="text-emerald-600" /> : <Square size={16} className="text-slate-300" />}
                      </button>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{lead.name ?? <span className="text-slate-300 italic text-xs">Unknown</span>}</td>
                    <td className="px-4 py-3 font-mono text-slate-700">{lead.phone ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{lead.location ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {lead.subjects.slice(0, 2).map((s) => (
                          <span key={s} className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full">{s}</span>
                        ))}
                        {lead.subjects.length > 2 && <span className="text-xs text-slate-400">+{lead.subjects.length - 2}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/staff-leads/${lead.id}`}
                        className="text-xs text-emerald-600 font-bold hover:underline flex items-center gap-1">
                        View <ArrowRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
