"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Mail, Smartphone, Bell, CheckCircle2, XCircle, Download, Filter, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { getDummyCampaignLogs } from "@/app/actions/dummy-campaign.actions";

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
  campaign: { name: string };
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
  EMAIL:  "bg-blue-100 text-blue-700",
  PUSH:   "bg-purple-100 text-purple-700",
  IN_APP: "bg-amber-100 text-amber-700",
};

export function DummyCampaignLogs({ campaignId }: Props) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [filterChannel, setFilterChannel] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const PAGE_SIZE = 20;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const result = await getDummyCampaignLogs({
      campaignId,
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
  }, [campaignId, page, fromDate, toDate, filterChannel, filterStatus]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const exportCSV = () => {
    const rows = [
      ["Campaign", "User Name", "Email", "Channel", "Status", "Locality", "Subjects", "Class", "Budget", "Sent At"],
      ...logs.map((l) => [
        l.campaign?.name ?? "",
        l.userName ?? "",
        l.userEmail,
        l.channel,
        l.status,
        l.leadData?.locality ?? "",
        (l.leadData?.subjects ?? []).join("; "),
        l.leadData?.classLevel ?? "",
        `₹${l.leadData?.budgetMin}–₹${l.leadData?.budgetMax}`,
        new Date(l.sentAt).toLocaleString("en-IN"),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `campaign-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Filter size={14} className="text-slate-400 shrink-0" />
        <input
          type="date"
          value={fromDate}
          onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
          className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />
        <span className="text-slate-400 text-xs">to</span>
        <input
          type="date"
          value={toDate}
          onChange={(e) => { setToDate(e.target.value); setPage(1); }}
          className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />
        <select
          value={filterChannel}
          onChange={(e) => { setFilterChannel(e.target.value); setPage(1); }}
          className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          <option value="">All Channels</option>
          <option value="EMAIL">Email</option>
          <option value="PUSH">Push</option>
          <option value="IN_APP">In-App</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          <option value="">All Status</option>
          <option value="SENT">Sent</option>
          <option value="FAILED">Failed</option>
        </select>
        <button
          onClick={exportCSV}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-all"
        >
          <Download size={12} /> Export CSV
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-8 text-slate-400">
          <Loader2 size={20} className="animate-spin mr-2" /> Loading logs...
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-xs font-bold">
          No delivery logs found. Run a campaign to see results here.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-3 py-2 text-left font-extrabold text-slate-500 uppercase tracking-wider">Tutor</th>
                <th className="px-3 py-2 text-left font-extrabold text-slate-500 uppercase tracking-wider">Channel</th>
                <th className="px-3 py-2 text-left font-extrabold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-3 py-2 text-left font-extrabold text-slate-500 uppercase tracking-wider">Lead Data</th>
                <th className="px-3 py-2 text-left font-extrabold text-slate-500 uppercase tracking-wider">Sent At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-2.5">
                    <p className="font-bold text-slate-800">{log.userName || "—"}</p>
                    <p className="text-slate-400">{log.userEmail}</p>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`flex items-center gap-1 w-fit px-2 py-0.5 rounded-full font-bold ${CHANNEL_COLOR[log.channel] ?? "bg-slate-100 text-slate-600"}`}>
                      {CHANNEL_ICON[log.channel]} {log.channel}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    {log.status === "SENT" ? (
                      <span className="flex items-center gap-1 text-emerald-600 font-bold">
                        <CheckCircle2 size={12} /> Sent
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-rose-600 font-bold" title={log.errorMessage ?? ""}>
                        <XCircle size={12} /> Failed
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <p className="font-semibold text-slate-700">
                      📍 {log.leadData?.locality ?? "—"}, {log.leadData?.city ?? "—"}
                    </p>
                    <p className="text-slate-400">
                      {(log.leadData?.subjects ?? []).join(", ")} · {log.leadData?.classLevel ?? "—"}
                      {" · "}₹{log.leadData?.budgetMin}–₹{log.leadData?.budgetMax}
                    </p>
                  </td>
                  <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">
                    {new Date(log.sentAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                    {" "}
                    {new Date(log.sentAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{total.toLocaleString()} total records</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-all font-bold"
            >
              <ChevronLeft size={12} /> Prev
            </button>
            <span className="font-bold">{page} / {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-all font-bold"
            >
              Next <ChevronRight size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
