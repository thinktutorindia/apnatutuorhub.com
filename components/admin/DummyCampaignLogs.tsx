"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Mail, Smartphone, Bell, CheckCircle2, XCircle, Download, Filter,
  ChevronLeft, ChevronRight, Loader2, Search, Eye, MapPin, Sparkles,
  IndianRupee, Clock, X, ShieldCheck, UserCheck, RefreshCw
} from "lucide-react";
import { getDummyCampaignLogs } from "@/app/actions/dummy-campaign.actions";
import { isGenuineEmail } from "@/lib/lead-utils";

interface LogEntry {
  id: string;
  campaignId: string;
  userId: string;
  userName: string | null;
  userEmail: string;
  channel: string;
  status: string;
  leadData: any;
  errorMessage: string | null;
  sentAt: string;
  campaign: { name: string; targetGroup?: string };
}

interface Props {
  campaignId?: string;
}

const CHANNEL_ICON: Record<string, React.ReactNode> = {
  EMAIL:  <Mail size={12} />,
  PUSH:   <Smartphone size={12} />,
  IN_APP: <Bell size={12} />,
};

const CHANNEL_COLOR: Record<string, string> = {
  EMAIL:  "bg-blue-100 text-blue-800 border-blue-200",
  PUSH:   "bg-purple-100 text-purple-800 border-purple-200",
  IN_APP: "bg-amber-100 text-amber-800 border-amber-200",
};

export function DummyCampaignLogs({ campaignId }: Props) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [emailFilter, setEmailFilter] = useState<"GENUINE_ONLY" | "ALL" | "DUMMY_ONLY">("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [filterChannel, setFilterChannel] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [selectedLogForModal, setSelectedLogForModal] = useState<LogEntry | null>(null);

  const PAGE_SIZE = 15;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const result = await getDummyCampaignLogs({
      campaignId,
      search: search || undefined,
      emailFilter,
      page,
      pageSize: PAGE_SIZE,
      from: fromDate || undefined,
      to: toDate || undefined,
      channel: filterChannel || undefined,
      status: filterStatus || undefined,
    });
    setLogs((result.logs as unknown as LogEntry[]) ?? []);
    setTotal(result.total ?? 0);
    setLoading(false);
  }, [campaignId, search, emailFilter, page, fromDate, toDate, filterChannel, filterStatus]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const exportCSV = () => {
    const rows = [
      ["Campaign", "Tutor Name", "Email", "Email Type", "Channel", "Status", "Locality", "City", "Class", "Subjects", "Budget", "Sent At"],
      ...logs.map((l) => [
        l.campaign?.name ?? "",
        l.userName ?? "Tutor",
        l.userEmail,
        isGenuineEmail(l.userEmail) ? "Real Email" : "System Placeholder",
        l.channel,
        l.status,
        l.leadData?.locality ?? "",
        l.leadData?.city ?? "",
        l.leadData?.classLevel ?? "",
        (l.leadData?.subjects ?? []).join("; "),
        l.leadData?.rateType === "HOURLY"
          ? `₹${l.leadData?.budgetMin}–₹${l.leadData?.budgetMax}/hr`
          : `₹${l.leadData?.budgetMin}–₹${l.leadData?.budgetMax}/mo`,
        new Date(l.sentAt).toLocaleString("en-IN"),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tutor-campaign-dispatch-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="space-y-3.5">
      {/* ── Top Filters Toolbar ── */}
      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 uppercase tracking-wider">
            <Filter size={14} className="text-slate-500" />
            <span>Search &amp; Filter Dispatched Tutors</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchLogs()}
              disabled={loading}
              className="flex items-center gap-1 px-3 py-1 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 transition-all disabled:opacity-50"
            >
              <RefreshCw size={11} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <button
              type="button"
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all shadow-xs"
            >
              <Download size={12} /> Export CSV
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
          {/* Search Box */}
          <div className="relative col-span-1 sm:col-span-2">
            <Search size={13} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search tutor name or email address..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>

          {/* Email Authenticity Filter */}
          <select
            value={emailFilter}
            onChange={(e) => { setEmailFilter(e.target.value as any); setPage(1); }}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <option value="ALL">👥 All Accounts (Real + System)</option>
            <option value="GENUINE_ONLY">🌟 Genuine Real Emails Only</option>
            <option value="DUMMY_ONLY">🤖 System Accounts Only</option>
          </select>

          {/* Channel Filter */}
          <select
            value={filterChannel}
            onChange={(e) => { setFilterChannel(e.target.value); setPage(1); }}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <option value="">All Channels</option>
            <option value="IN_APP">🔔 In-App Bell</option>
            <option value="PUSH">📱 Web Push</option>
            <option value="EMAIL">📧 Email Alert</option>
          </select>
        </div>
      </div>

      {/* ── Tutor Delivery Log Table / Feed ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400 bg-white rounded-2xl border border-slate-200">
          <Loader2 size={24} className="animate-spin mb-2 text-emerald-500" />
          <p className="text-xs font-bold">Loading tutor delivery transcripts...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
          <Sparkles size={28} className="mx-auto text-slate-300 mb-2" />
          <p className="text-xs font-black text-slate-700">No matching delivery logs found</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Click &quot;Fire Now&quot; on any campaign to trigger an instant test run or await the 9:00 AM daily cron.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider text-[10px]">
                <th className="px-4 py-3 text-left">Target Tutor</th>
                <th className="px-3 py-3 text-left">Channel</th>
                <th className="px-3 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Rotated Lead Sent</th>
                <th className="px-3 py-3 text-left">Sent Time</th>
                <th className="px-3 py-3 text-right">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => {
                const isReal = isGenuineEmail(log.userEmail);
                const lead = log.leadData || {};
                const isHourly = lead.rateType === "HOURLY";
                const budgetStr = isHourly
                  ? `₹${lead.budgetMin}–₹${lead.budgetMax}/hr`
                  : `₹${(lead.budgetMin || 0).toLocaleString("en-IN")}–₹${(lead.budgetMax || 0).toLocaleString("en-IN")}/mo`;

                return (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors group">
                    {/* Tutor Profile */}
                    <td className="px-4 py-3 min-w-[200px]">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-black text-slate-900 text-xs">{log.userName || "Tutor"}</p>
                        {isReal ? (
                          <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-black border border-emerald-200">
                            ✓ Real
                          </span>
                        ) : (
                          <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-bold border border-amber-200">
                            🤖 System
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">{log.userEmail}</p>
                    </td>

                    {/* Channel */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black border ${CHANNEL_COLOR[log.channel] ?? "bg-slate-100 text-slate-600"}`}>
                        {CHANNEL_ICON[log.channel]} {log.channel}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      {log.status === "SENT" ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-extrabold text-[11px]">
                          <CheckCircle2 size={13} className="stroke-[2.5]" /> Dispatched
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-600 font-bold text-[11px]" title={log.errorMessage ?? ""}>
                          <XCircle size={13} /> Failed
                        </span>
                      )}
                    </td>

                    {/* Rotated Lead Data */}
                    <td className="px-4 py-3 min-w-[230px]">
                      <div className="flex items-center gap-1.5 text-xs font-black text-slate-800">
                        <MapPin size={11} className="text-emerald-500 shrink-0" />
                        <span className="truncate">{lead.locality || "Locality"}, {lead.city || "City"}</span>
                        {lead.distanceKm !== undefined && (
                          <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-bold">
                            ~{lead.distanceKm}km
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 font-semibold mt-0.5 truncate">
                        {lead.classLevel || "Class"} · {(lead.subjects || []).slice(0, 2).join(", ")} · <strong className="text-emerald-700">{budgetStr}</strong>
                      </p>
                    </td>

                    {/* Sent Time */}
                    <td className="px-3 py-3 text-slate-500 whitespace-nowrap text-[11px]">
                      <p className="font-bold text-slate-700">
                        {new Date(log.sentAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(log.sentAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </td>

                    {/* Inspect Button */}
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setSelectedLogForModal(log)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-700 text-[11px] font-black transition-all"
                      >
                        <Eye size={12} /> View Message
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span className="font-bold">{total.toLocaleString()} total dispatched notifications</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-50 transition-all font-extrabold text-xs"
            >
              <ChevronLeft size={13} /> Prev
            </button>
            <span className="font-black text-slate-700 text-xs px-1">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-50 transition-all font-extrabold text-xs"
            >
              Next <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}

      {/* ── Message Payload Inspector Modal ── */}
      {selectedLogForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative z-10 w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden my-auto text-slate-900">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <div>
                <p className="text-xs font-black text-slate-900">
                  Dispatched Message Transcript
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Sent to {selectedLogForModal.userName || "Tutor"} ({selectedLogForModal.userEmail})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLogForModal(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {/* Recipient & Channel Strip */}
              <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <p className="text-[10px] uppercase font-black text-slate-400">Recipient</p>
                  <p className="font-extrabold text-slate-900 mt-0.5 truncate">
                    {selectedLogForModal.userName || "Tutor"}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate">{selectedLogForModal.userEmail}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-black text-slate-400">Channel &amp; Status</p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black border ${CHANNEL_COLOR[selectedLogForModal.channel] ?? "bg-slate-100"}`}>
                      {CHANNEL_ICON[selectedLogForModal.channel]} {selectedLogForModal.channel}
                    </span>
                    <span className="text-emerald-700 font-extrabold text-[10px] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      ✓ Dispatched
                    </span>
                  </div>
                </div>
              </div>

              {/* Exact Lead Payload */}
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-2">
                <p className="text-xs font-black text-emerald-950 flex items-center gap-1">
                  <MapPin size={13} className="text-emerald-600" />
                  <span>Geo-Rotated Lead Details Sent</span>
                </p>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div>
                    <span className="text-slate-400 font-bold block">Locality &amp; City:</span>
                    <span className="font-black text-slate-900">
                      📍 {selectedLogForModal.leadData?.locality}, {selectedLogForModal.leadData?.city}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">Distance:</span>
                    <span className="font-black text-slate-900">
                      ~{selectedLogForModal.leadData?.distanceKm ?? 2} km from tutor location
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">Class &amp; Board:</span>
                    <span className="font-black text-slate-900">
                      {selectedLogForModal.leadData?.classLevel} · {selectedLogForModal.leadData?.board || "CBSE"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">Budget Sent:</span>
                    <span className="font-black text-emerald-700">
                      {selectedLogForModal.leadData?.rateType === "HOURLY"
                        ? `₹${selectedLogForModal.leadData?.budgetMin}–₹${selectedLogForModal.leadData?.budgetMax}/hr`
                        : `₹${(selectedLogForModal.leadData?.budgetMin || 0).toLocaleString("en-IN")}–₹${(selectedLogForModal.leadData?.budgetMax || 0).toLocaleString("en-IN")}/mo`}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 font-bold block">Subjects:</span>
                    <span className="font-black text-slate-900">
                      {(selectedLogForModal.leadData?.subjects || []).join(", ")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Exact Simulated Notification Text */}
              <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Smartphone size={12} className="text-emerald-400" />
                  <span>Exact Notification Received by Tutor</span>
                </p>

                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1">
                  <p className="text-xs font-black text-white">
                    📍 New Requirement Near {selectedLogForModal.leadData?.locality || "Your Area"}
                  </p>
                  <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                    A student in {selectedLogForModal.leadData?.locality} needs a {(selectedLogForModal.leadData?.subjects || []).join(", ")} tutor for {selectedLogForModal.leadData?.classLevel}. Budget: {selectedLogForModal.leadData?.rateType === "HOURLY" ? `₹${selectedLogForModal.leadData?.budgetMin}–₹${selectedLogForModal.leadData?.budgetMax}/hr` : `₹${(selectedLogForModal.leadData?.budgetMin || 0).toLocaleString("en-IN")}–₹${(selectedLogForModal.leadData?.budgetMax || 0).toLocaleString("en-IN")}/mo`}.
                  </p>
                  <p className="text-[10px] text-emerald-400 font-bold mt-1">
                    Action URL: /tutor/leads
                  </p>
                </div>
              </div>

              {selectedLogForModal.errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                  Error Details: {selectedLogForModal.errorMessage}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLogForModal(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs transition-all shadow-xs"
              >
                Close Transcript
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
