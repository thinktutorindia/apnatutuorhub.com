"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  History,
  X,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Loader2,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Edit3,
  Layers,
  MapPin,
  Phone,
  IndianRupee,
  MessageSquare,
} from "lucide-react";
import { getLeadHistoryAction, type LeadAuditHistoryItem } from "@/app/actions/admin.actions";

interface LeadHistoryModalProps {
  leadId: string;
  leadCode?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function LeadHistoryModal({
  leadId,
  leadCode,
  isOpen,
  onClose,
}: LeadHistoryModalProps) {
  const [history, setHistory] = useState<LeadAuditHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !leadId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    getLeadHistoryAction(leadId)
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.data) {
          setHistory(res.data.history);
        } else {
          setError(res.error || "Failed to load lead audit history.");
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || "Failed to load lead history.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, leadId]);

  if (!isOpen) return null;

  const creationEntry = history.find(
    (h) => h.action === "ADMIN_CREATE_LEAD" || h.action === "LEAD_CREATED"
  );
  const editEntries = history.filter(
    (h) => h.action !== "ADMIN_CREATE_LEAD" && h.action !== "LEAD_CREATED"
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black">
              <History size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-[#0F2540]">
                  Lead Activity &amp; Correction Audit Trail
                </h3>
                {leadCode && (
                  <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                    #{leadCode}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-semibold">
                Transparent log of first-time staff entries, corrections, and resolved values.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-6">
          {loading && (
            <div className="py-16 text-center space-y-3">
              <Loader2 size={32} className="animate-spin text-[#2D9E6B] mx-auto" />
              <p className="text-xs font-bold text-slate-500">Loading audit history timeline...</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs font-bold text-red-900 flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && history.length === 0 && (
            <div className="py-12 text-center text-xs font-bold text-slate-500 space-y-2">
              <FileText size={32} className="mx-auto text-slate-300" />
              <p>No audit records recorded yet for this lead.</p>
              <p className="text-[11px] text-slate-400">All future edits and corrections will appear here automatically.</p>
            </div>
          )}

          {!loading && !error && history.length > 0 && (
            <div className="space-y-6 relative before:absolute before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
              {history.map((item, idx) => {
                const isCreation =
                  item.action === "ADMIN_CREATE_LEAD" || item.action === "LEAD_CREATED";
                const isUpdate = item.action === "LEAD_UPDATE";
                const hasChanges = item.changes && item.changes.length > 0;

                return (
                  <div key={item.id || idx} className="relative pl-10 space-y-2">
                    {/* Timeline Node Icon */}
                    <div
                      className={`absolute left-1.5 top-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-black shadow-xs ${
                        isCreation
                          ? "bg-emerald-500 border-white text-white"
                          : isUpdate
                          ? "bg-amber-500 border-white text-white"
                          : "bg-blue-500 border-white text-white"
                      }`}
                    >
                      {isCreation ? "1" : idx + 1}
                    </div>

                    {/* Entry Card */}
                    <div
                      className={`p-4 rounded-2xl border space-y-3 ${
                        isCreation
                          ? "bg-emerald-50/50 border-emerald-200"
                          : isUpdate
                          ? "bg-amber-50/40 border-amber-200"
                          : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      {/* Meta Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-200/80 pb-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide border ${
                              isCreation
                                ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                                : isUpdate
                                ? "bg-amber-100 text-amber-900 border-amber-300"
                                : "bg-blue-100 text-blue-900 border-blue-300"
                            }`}
                          >
                            {isCreation ? "🟢 Initial First Entry" : isUpdate ? "✏️ Staff Edit / Correction" : item.action}
                          </span>
                          <span className="text-xs font-black text-[#0F2540] flex items-center gap-1">
                            <User size={13} className="text-[#2D9E6B]" />
                            {item.adminName}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-md">
                            {item.adminRole}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono font-bold text-slate-500 flex items-center gap-1">
                          <Clock size={12} />
                          {new Date(item.createdAt).toLocaleString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      {/* Resolution Reason Note if provided */}
                      {item.resolutionReason && (
                        <div className="p-2.5 rounded-xl bg-amber-100/70 border border-amber-300 text-amber-950 text-xs font-bold flex items-start gap-2">
                          <MessageSquare size={15} className="text-amber-700 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider block text-amber-800">
                              Resolution / Correction Reason:
                            </span>
                            <span>&quot;{item.resolutionReason}&quot;</span>
                          </div>
                        </div>
                      )}

                      {/* Initial Data Summary (For First Entry) */}
                      {isCreation && item.initialData && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                          <div className="p-2 rounded-xl bg-white border border-emerald-100 space-y-0.5">
                            <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Class &amp; Subjects</span>
                            <span className="font-bold text-slate-900">
                              {item.initialData.classLevel} · {Array.isArray(item.initialData.subjects) ? item.initialData.subjects.join(", ") : item.initialData.subjects}
                            </span>
                          </div>
                          <div className="p-2 rounded-xl bg-white border border-emerald-100 space-y-0.5">
                            <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Location</span>
                            <span className="font-bold text-slate-900">
                              {[item.initialData.area, item.initialData.city].filter(Boolean).join(", ") || "Pan-India / Not specified"}
                            </span>
                          </div>
                          {item.initialData.parentName && (
                            <div className="p-2 rounded-xl bg-white border border-emerald-100 space-y-0.5">
                              <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Parent Contact</span>
                              <span className="font-bold text-slate-900">
                                {item.initialData.parentName} {item.initialData.parentPhone ? `(${item.initialData.parentPhone})` : ""}
                              </span>
                            </div>
                          )}
                          {(item.initialData.budgetMin || item.initialData.budgetMax) && (
                            <div className="p-2 rounded-xl bg-white border border-emerald-100 space-y-0.5">
                              <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Budget</span>
                              <span className="font-bold text-slate-900">
                                ₹{item.initialData.budgetMin ?? 0} - ₹{item.initialData.budgetMax ?? "N/A"}/mo
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Field-by-Field Diff Comparison (For Edit / Corrections) */}
                      {hasChanges && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                            Field Changes &amp; Corrections ({item.changes?.length}):
                          </span>
                          <div className="grid gap-2">
                            {item.changes?.map((ch, cIdx) => (
                              <div
                                key={cIdx}
                                className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs"
                              >
                                <span className="font-extrabold text-[#0F2540] min-w-[110px]">
                                  {ch.label}
                                </span>
                                <div className="flex items-center gap-2 flex-1 flex-wrap">
                                  {/* Old / Wrong Value */}
                                  <span className="px-2.5 py-1 rounded-lg bg-red-50 text-red-900 border border-red-200 font-bold line-through text-[11px]">
                                    {Array.isArray(ch.oldValue) ? ch.oldValue.join(", ") : String(ch.oldValue ?? "None")}
                                  </span>
                                  <ArrowRight size={13} className="text-slate-400 shrink-0" />
                                  {/* Resolved / New Value */}
                                  <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-950 border border-emerald-300 font-black text-[11px] shadow-2xs">
                                    {Array.isArray(ch.newValue) ? ch.newValue.join(", ") : String(ch.newValue ?? "None")}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Fallback summary text if no structured changes */}
                      {!isCreation && !hasChanges && (
                        <p className="text-xs font-semibold text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200">
                          {item.summary}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500">
            Total {history.length} audit {history.length === 1 ? "entry" : "entries"} logged
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#0F2540] hover:bg-[#1a3560] text-white text-xs font-black cursor-pointer shadow-xs"
          >
            Close Timeline
          </button>
        </div>
      </div>
    </div>
  );
}
