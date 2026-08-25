"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Users, Upload, TrendingUp, CheckCircle2, XCircle, PhoneMissed,
  Phone, Star, Clock, Filter, Search, ArrowRight, RotateCcw, Sparkles
} from "lucide-react";
import type { StaffLeadStatus } from "@prisma/client";

const STATUS_STYLES: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  NEW:            { label: "New",           bg: "bg-slate-100",   text: "text-slate-600",   dot: "bg-slate-400"   },
  ASSIGNED:       { label: "Assigned",      bg: "bg-blue-100",    text: "text-blue-700",    dot: "bg-blue-500"    },
  CONTACTED:      { label: "Contacted",     bg: "bg-teal-100",    text: "text-teal-700",    dot: "bg-teal-500"    },
  FOLLOW_UP:      { label: "Follow Up",     bg: "bg-amber-100",   text: "text-amber-700",   dot: "bg-amber-500"   },
  INTERESTED:     { label: "Interested",    bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
  NOT_INTERESTED: { label: "Not Interested",bg: "bg-red-100",     text: "text-red-700",     dot: "bg-red-500"     },
  NO_ANSWER:      { label: "No Answer",     bg: "bg-orange-100",  text: "text-orange-700",  dot: "bg-orange-500"  },
  CONVERTED:      { label: "Converted",     bg: "bg-green-100",   text: "text-green-700",   dot: "bg-green-500"   },
  REJECTED:       { label: "Rejected",      bg: "bg-red-100",     text: "text-red-700",     dot: "bg-red-400"     },
  DUPLICATE:      { label: "Duplicate",     bg: "bg-slate-100",   text: "text-slate-500",   dot: "bg-slate-300"   },
};

type Lead = {
  id: string; name: string | null; phone: string | null; email: string | null;
  location: string | null; subjects: string[]; classes: string[]; status: StaffLeadStatus;
  assignedToId: string | null; assignedTo: { name: string | null } | null;
  isPromoted: boolean; createdAt: Date; lastContactedAt: Date | null;
  nextFollowUpAt: Date | null; _count: { callLogs: number };
};

type Stats = {
  total: number; newLeads: number; assigned: number; contacted: number;
  interested: number; converted: number; notInterested: number; noAnswer: number; followUp: number;
} | null;

type Batch = { id: string; name: string; totalParsed: number; createdAt: Date; _count: { leads: number } };

interface Props {
  stats: Stats;
  leads: Lead[];
  total: number;
  batches: Batch[];
}

export function StaffLeadsDashboardClient({ stats, leads, total, batches }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StaffLeadStatus | "ALL">("ALL");

  const filtered = leads.filter((l) => {
    const matchStatus = statusFilter === "ALL" || l.status === statusFilter;
    const matchSearch = !search || [l.name, l.phone, l.email, l.location].some((v) => v?.toLowerCase().includes(search.toLowerCase()));
    return matchStatus && matchSearch;
  });

  const statCards = stats ? [
    { label: "Total Leads",     value: stats.total,           icon: Users,        color: "text-slate-700",   bg: "bg-slate-50"   },
    { label: "New",             value: stats.newLeads,        icon: Sparkles,     color: "text-blue-700",    bg: "bg-blue-50"    },
    { label: "Assigned",        value: stats.assigned,        icon: Phone,        color: "text-teal-700",    bg: "bg-teal-50"    },
    { label: "Interested",      value: stats.interested,      icon: Star,         color: "text-amber-700",   bg: "bg-amber-50"   },
    { label: "Converted",       value: stats.converted,       icon: CheckCircle2, color: "text-emerald-700", bg: "bg-emerald-50" },
    { label: "Not Interested",  value: stats.notInterested,   icon: XCircle,      color: "text-red-700",     bg: "bg-red-50"     },
    { label: "No Answer",       value: stats.noAnswer,        icon: PhoneMissed,  color: "text-orange-700",  bg: "bg-orange-50"  },
    { label: "Follow Up",       value: stats.followUp,        icon: Clock,        color: "text-purple-700",  bg: "bg-purple-50"  },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Staff Leads CRM</h1>
          <p className="text-sm text-slate-500 mt-1">Staging area for raw leads — validate, follow up, then promote to main database</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <Link href="/admin/staff-leads/manage"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-slate-800 shadow-xs">
            <TrendingUp size={14} className="text-emerald-400" /> CRM Management
          </Link>
          <Link href="/admin/staff-leads/my-leads"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 shadow-xs">
            <Phone size={14} className="text-blue-600" /> My Leads & Logs
          </Link>
          <Link href="/admin/staff-leads/assign"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 shadow-xs">
            <Users size={14} className="text-purple-600" /> Assign
          </Link>
          <Link href="/admin/staff-leads/upload"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-black hover:bg-emerald-700 shadow-xs">
            <Upload size={14} /> Upload Leads
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      {statCards.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {statCards.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className={`${bg} rounded-2xl p-4 text-center border border-white/80`}>
              <Icon size={18} className={`${color} mx-auto mb-2`} />
              <p className={`text-2xl font-extrabold ${color}`}>{value.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Recent batches */}
      {batches.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h2 className="font-extrabold text-slate-900 mb-3 flex items-center gap-2"><TrendingUp size={16} className="text-emerald-600" /> Recent Uploads</h2>
          <div className="flex flex-wrap gap-2">
            {batches.slice(0, 6).map((b) => (
              <div key={b.id} className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <Upload size={12} className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-700">{b.name}</p>
                  <p className="text-xs text-slate-400">{b._count.leads} leads · {new Date(b.createdAt).toLocaleDateString("en-IN")}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter + search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search name, phone, location..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StaffLeadStatus | "ALL")}
          className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white">
          <option value="ALL">All Status</option>
          {Object.entries(STATUS_STYLES).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
        </select>
        <span className="text-xs text-slate-400">{filtered.length} of {total}</span>
      </div>

      {/* Leads table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {["Name", "Phone", "Email", "Location", "Subjects", "Assigned To", "Status", "Calls", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-extrabold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400">
                    <Users size={32} className="mx-auto mb-3 opacity-30" />
                    <p className="font-semibold">No leads found</p>
                    <p className="text-xs mt-1">
                      <Link href="/admin/staff-leads/upload" className="text-emerald-600 hover:underline">Upload some leads</Link> to get started
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((lead) => {
                  const style = STATUS_STYLES[lead.status] ?? STATUS_STYLES.NEW;
                  return (
                    <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-800">{lead.name ?? <span className="text-slate-300 italic text-xs">Unknown</span>}</td>
                      <td className="px-4 py-3 font-mono text-slate-800 text-xs font-bold whitespace-nowrap">{lead.phone ? `+91 ${lead.phone}` : <span className="text-red-400 font-bold text-xs">—</span>}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs break-all">{lead.email ?? <span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs font-medium">{lead.location ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {lead.subjects.slice(0, 2).map((s) => <span key={s} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100 font-medium">{s}</span>)}
                          {lead.subjects.length > 2 && <span className="text-xs text-slate-400 font-bold">+{lead.subjects.length - 2}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs font-medium">{lead.assignedTo?.name ?? <span className="text-slate-300">Unassigned</span>}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${style.bg} ${style.text}`}>{style.label}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs text-center font-bold">{lead._count.callLogs}</td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/admin/staff-leads/${lead.id}`}
                          className="text-xs text-emerald-600 font-bold hover:underline inline-flex items-center gap-1 whitespace-nowrap">
                          Open <ArrowRight size={11} />
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
  );
}
