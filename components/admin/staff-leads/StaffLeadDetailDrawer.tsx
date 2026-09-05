"use client";

import React, { useState, useEffect, useTransition, useCallback } from "react";
import Link from "next/link";
import {
  X, Phone, MessageCircle, MapPin, Mail, Sparkles, Clock,
  Calendar, CheckCircle2, AlertTriangle, ArrowLeft, ArrowRight,
  ChevronRight, ExternalLink, Loader2, Save, Send, Star,
  PhoneCall, Shield, BookOpen, GraduationCap, Copy, Check,
} from "lucide-react";
import type { CallOutcome, StaffLeadStatus } from "@prisma/client";
import { logCallAction, getLeadCallLogsAction, updateStaffLeadAction } from "@/app/actions/staff-leads.actions";
import { StaffLeadTypeBadge } from "@/components/admin/staff-leads/StaffLeadTypeControl";
import { getStaffRecordType } from "@/lib/staff-lead-type";
import { STATUS_META, ALL_STATUSES, statusMeta, formatDateShort, formatRelative, maskPhone } from "@/lib/staff-lead-ui";
import type { WorkspaceLead } from "./LeadsWorkspace";

const OUTCOMES: Array<{ key: CallOutcome; num: string; label: string; emoji: string; color: string }> = [
  { key: "ANSWERED", num: "1", label: "Answered", emoji: "📞", color: "hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border-slate-200" },
  { key: "CALLBACK_REQUESTED", num: "2", label: "Callback", emoji: "🔔", color: "hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 border-slate-200" },
  { key: "BUSY", num: "3", label: "Busy", emoji: "⏳", color: "hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 border-slate-200" },
  { key: "NO_ANSWER", num: "4", label: "No Answer", emoji: "📵", color: "hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300 border-slate-200" },
  { key: "CONVERTED", num: "5", label: "Converted", emoji: "🎉", color: "hover:bg-green-50 hover:text-green-700 hover:border-green-300 border-slate-200" },
  { key: "NOT_INTERESTED", num: "6", label: "Not Interested", emoji: "👎", color: "hover:bg-red-50 hover:text-red-700 hover:border-red-300 border-slate-200" },
  { key: "WRONG_NUMBER", num: "0", label: "Wrong No.", emoji: "❌", color: "hover:bg-red-50 hover:text-red-700 hover:border-red-300 border-slate-200" },
];

const QUICK_NOTES = [
  "Interested, asked to call back later",
  "Budget mismatch",
  "Demo class requested",
  "Need home tutor offline",
  "Looking for online classes",
  "Number not reachable",
];

interface DrawerProps {
  lead: WorkspaceLead | null;
  leadsList: WorkspaceLead[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onSelectLead: (lead: WorkspaceLead, index: number) => void;
  onLeadUpdated: (updated: WorkspaceLead) => void;
  protectData?: boolean;
  isRevealed?: boolean;
  onReveal?: (id: string) => void;
}

export function StaffLeadDetailDrawer({
  lead,
  leadsList,
  currentIndex,
  isOpen,
  onClose,
  onSelectLead,
  onLeadUpdated,
  protectData = false,
  isRevealed = false,
  onReveal,
}: DrawerProps) {
  const [selectedOutcome, setSelectedOutcome] = useState<CallOutcome | null>(null);
  const [callNotes, setCallNotes] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [callLogs, setCallLogs] = useState<Array<{
    id: string;
    outcome: CallOutcome;
    notes: string | null;
    calledAt: Date;
    calledBy: { name: string | null; email: string };
  }>>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [isSaving, startTransition] = useTransition();
  const [showWaMenu, setShowWaMenu] = useState(false);
  const [showScriptHelper, setShowScriptHelper] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Load call logs when lead changes
  useEffect(() => {
    if (!lead || !isOpen) return;
    setSelectedOutcome(null);
    setCallNotes("");
    setFollowUpDate("");
    setShowWaMenu(false);
    setLoadingLogs(true);

    getLeadCallLogsAction(lead.id)
      .then((res) => {
        if (res.success && res.data) {
          setCallLogs(res.data.callLogs);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingLogs(false));
  }, [lead?.id, isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === "Escape") {
        onClose();
      } else if (e.altKey && e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.altKey && e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "1") {
        setSelectedOutcome("ANSWERED");
      } else if (e.key === "2") {
        setSelectedOutcome("CALLBACK_REQUESTED");
      } else if (e.key === "3") {
        setSelectedOutcome("BUSY");
      } else if (e.key === "4") {
        setSelectedOutcome("NO_ANSWER");
      } else if (e.key === "5") {
        setSelectedOutcome("CONVERTED");
      } else if (e.key === "6") {
        setSelectedOutcome("NOT_INTERESTED");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex, leadsList]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      const prev = leadsList[currentIndex - 1];
      if (prev) onSelectLead(prev, currentIndex - 1);
    }
  }, [currentIndex, leadsList, onSelectLead]);

  const handleNext = useCallback(() => {
    if (currentIndex < leadsList.length - 1) {
      const next = leadsList[currentIndex + 1];
      if (next) onSelectLead(next, currentIndex + 1);
    }
  }, [currentIndex, leadsList, onSelectLead]);

  if (!isOpen || !lead) return null;

  const isMasked = protectData && !isRevealed;
  const displayPhone = isMasked ? maskPhone(lead.phone) : lead.phone;
  const rawPhone = lead.phone ? lead.phone.replace(/\D/g, "").slice(-10) : "";

  const handleCopyPhone = () => {
    if (!lead.phone || isMasked) return;
    navigator.clipboard.writeText(lead.phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogCallAndNext = () => {
    if (!selectedOutcome) {
      setToastMsg("Please select a call outcome first");
      setTimeout(() => setToastMsg(null), 3000);
      return;
    }

    startTransition(async () => {
      const res = await logCallAction(
        lead.id,
        selectedOutcome,
        callNotes,
        followUpDate ? new Date(followUpDate).toISOString() : null,
      );

      if (res.success) {
        // Map outcome to status
        const statusMap: Record<CallOutcome, StaffLeadStatus> = {
          ANSWERED: "CONTACTED",
          NO_ANSWER: "NO_ANSWER",
          BUSY: "NO_ANSWER",
          WRONG_NUMBER: "REJECTED",
          CALLBACK_REQUESTED: "FOLLOW_UP",
          CONVERTED: "CONVERTED",
          NOT_INTERESTED: "NOT_INTERESTED",
        };
        const updatedLead: WorkspaceLead = {
          ...lead,
          status: statusMap[selectedOutcome] || lead.status,
          lastContactedAt: new Date().toISOString(),
          nextFollowUpAt: followUpDate ? new Date(followUpDate).toISOString() : lead.nextFollowUpAt,
          _count: { callLogs: lead._count.callLogs + 1 },
        };
        onLeadUpdated(updatedLead);

        // Auto-advance to next lead!
        if (currentIndex < leadsList.length - 1) {
          handleNext();
        } else {
          setToastMsg("Call logged! You reached the end of the list.");
          setTimeout(() => setToastMsg(null), 3000);
        }
      } else {
        setToastMsg(res.error ?? "Failed to log call");
        setTimeout(() => setToastMsg(null), 3000);
      }
    });
  };

  const currentStatusMeta = statusMeta(lead.status);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-xl bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-250 ease-out">
          {/* ── Top Header Strip ── */}
          <div className="bg-[#0F2540] text-white px-5 py-3.5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#F5A623] bg-white/10 px-2 py-0.5 rounded-full">
                Lead {currentIndex + 1} of {leadsList.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className="p-1 rounded hover:bg-white/10 disabled:opacity-30 transition-colors text-white cursor-pointer"
                  title="Previous lead (Alt + ←)"
                >
                  <ArrowLeft size={14} />
                </button>
                <button
                  onClick={handleNext}
                  disabled={currentIndex >= leadsList.length - 1}
                  className="p-1 rounded hover:bg-white/10 disabled:opacity-30 transition-colors text-white cursor-pointer"
                  title="Next lead (Alt + →)"
                >
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={`/admin/staff-leads/${lead.id}`}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-white/80 hover:text-white hover:underline"
                target="_blank"
              >
                Full Profile <ExternalLink size={11} />
              </Link>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Close (Esc)"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Toast Notification */}
          {toastMsg && (
            <div className="bg-emerald-600 text-white text-xs font-bold px-4 py-2 flex items-center justify-between shrink-0">
              <span>{toastMsg}</span>
              <button onClick={() => setToastMsg(null)} className="opacity-80 hover:opacity-100"><X size={13} /></button>
            </div>
          )}

          {/* ── Scrollable Body ── */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {/* Lead Identity Box */}
            <div className="p-5 bg-gradient-to-b from-slate-50/70 to-white">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-800 leading-tight">
                    {lead.name || <span className="italic text-slate-400">Unnamed Lead</span>}
                  </h2>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <StaffLeadTypeBadge type={getStaffRecordType(lead.staffNotes)} />
                    <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full ${currentStatusMeta.bg} ${currentStatusMeta.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${currentStatusMeta.dot}`} />
                      {currentStatusMeta.label}
                    </span>
                    {lead.priority > 0 && (
                      <span className="text-[10px] font-extrabold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                        Priority {lead.priority}
                      </span>
                    )}
                    {lead.assignedTo?.name && (
                      <span className="text-[10px] font-semibold text-slate-500">
                        Owner: <strong>{lead.assignedTo.name}</strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Ribbon: Call, WhatsApp & Copy */}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200/80 flex-wrap">
                {rawPhone && !isMasked ? (
                  <>
                    <a
                      href={`tel:${lead.phone}`}
                      className="flex-1 min-w-[140px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-sm transition-all text-center"
                    >
                      <Phone size={14} /> Call (+91 {rawPhone})
                    </a>

                    {/* WhatsApp with Templates */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowWaMenu((v) => !v)}
                        className="flex items-center gap-1 py-2.5 px-3 rounded-xl bg-[#25D366] text-white text-xs font-bold hover:bg-[#1ebd5a] shadow-sm transition-all cursor-pointer"
                        title="Select WhatsApp Template"
                      >
                        <MessageCircle size={14} />
                        <span>WhatsApp</span>
                        <ChevronRight size={12} className={`transition-transform ${showWaMenu ? "rotate-90" : ""}`} />
                      </button>

                      {showWaMenu && (
                        <div className="absolute right-0 top-full mt-2 z-40 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 min-w-[280px]">
                          <div className="px-2 py-1 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">
                            Choose WhatsApp Template:
                          </div>
                          <div className="space-y-1 mt-1 text-xs">
                            {[
                              {
                                label: "1. Missed Call Follow-up",
                                msg: `Hello ${lead.name || ""}, we tried calling you from ApnaTutorHub regarding tuition matching in ${lead.location || "your area"}. When is a convenient time to speak for 2 minutes? Thank you!`,
                              },
                              {
                                label: "2. Tuition Openings in Area",
                                msg: `Hello ${lead.name || ""}, greetings from ApnaTutorHub! We are actively assigning home & online tuitions in ${lead.location || "your area"}. Are you available for new student inquiries this week?`,
                              },
                              {
                                label: "3. Demo Class Trial Confirmation",
                                msg: `Hello ${lead.name || ""}, we would like to confirm your schedule for a demo class trial. Please reply with your preferred day and time! Best regards, ApnaTutorHub`,
                              },
                              {
                                label: "4. Platform Profile Link",
                                msg: `Hello ${lead.name || ""}, please complete your verified profile on ApnaTutorHub to receive direct student leads: https://apnatutorhub.com`,
                              },
                            ].map((tpl, i) => (
                              <a
                                key={i}
                                href={`https://wa.me/91${rawPhone}?text=${encodeURIComponent(tpl.msg)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => setShowWaMenu(false)}
                                className="block p-2 rounded-xl hover:bg-teal-50 text-slate-700 text-left transition-colors"
                              >
                                <p className="font-extrabold text-teal-800 text-[11px]">{tpl.label}</p>
                                <p className="text-[10px] text-slate-400 truncate mt-0.5">{tpl.msg}</p>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyPhone}
                      className="p-2.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all cursor-pointer"
                      title="Copy Phone Number"
                    >
                      {copied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
                    </button>
                  </>
                ) : isMasked ? (
                  <div className="w-full flex items-center justify-between p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                    <span>Phone is masked for security</span>
                    {onReveal && (
                      <button
                        onClick={() => onReveal(lead.id)}
                        className="font-extrabold text-emerald-700 underline cursor-pointer hover:text-emerald-900"
                      >
                        Reveal Contact
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="w-full p-2 text-center text-xs text-slate-400">No phone number available</div>
                )}
              </div>
            </div>

            {/* ── Quick Pitch Talking Points Accordion ── */}
            <div className="px-5 py-2.5 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-600 flex items-center gap-1.5">
                <BookOpen size={13} className="text-blue-600" />
                <span>Talking Points Script:</span>
              </span>
              <button
                type="button"
                onClick={() => setShowScriptHelper((v) => !v)}
                className="text-blue-600 font-extrabold hover:underline cursor-pointer text-[11px]"
              >
                {showScriptHelper ? "Hide Script" : "Show Pitch Script"}
              </button>
            </div>

            {showScriptHelper && (
              <div className="px-5 py-3 bg-blue-50/40 border-b border-blue-100 text-xs text-slate-700 leading-relaxed">
                <p className="font-bold text-blue-900 mb-1">
                  {getStaffRecordType(lead.staffNotes) === "PARENT" ? "👨‍👩‍👧 Parent Inquiry Script:" : "🎓 Tutor Calling Pitch:"}
                </p>
                {getStaffRecordType(lead.staffNotes) === "PARENT" ? (
                  <p>
                    &quot;Namaste <strong>{lead.name || "ji"}</strong>, calling from ApnaTutorHub regarding your inquiry for a home/online tutor in <strong>{lead.location || "your locality"}</strong>. I am here to verify your grade level, subject requirements, and budget to connect you with the best nearby tutor.&quot;
                  </p>
                ) : (
                  <p>
                    &quot;Namaste <strong>{lead.name || "Sir/Ma'am"}</strong>, I am calling from ApnaTutorHub. We have parent tuition inquiries in <strong>{lead.location || "your locality"}</strong> for <strong>{lead.subjects.length ? lead.subjects.join(", ") : "academics"}</strong>. Are you currently available to take home/online tuitions?&quot;
                  </p>
                )}
              </div>
            )}

            {/* ── 1-Click Call Outcome Logger (High-Speed Engine) ── */}
            <div className="p-5 bg-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <PhoneCall size={14} className="text-[#16A34A]" /> Log Call Outcome
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">Press keys [1] - [6]</span>
              </div>

              {/* Outcome Badges Grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 mb-3">
                {OUTCOMES.map((o) => {
                  const isSelected = selectedOutcome === o.key;
                  return (
                    <button
                      key={o.key}
                      type="button"
                      onClick={() => setSelectedOutcome(o.key)}
                      className={`flex items-center justify-between gap-1 p-2 rounded-xl border text-[11px] font-bold transition-all text-left cursor-pointer ${
                        isSelected
                          ? "bg-[#0F2540] text-white border-[#0F2540] shadow-sm ring-2 ring-[#0F2540]/20"
                          : `bg-slate-50 text-slate-700 ${o.color}`
                      }`}
                    >
                      <div className="flex items-center gap-1 truncate">
                        <span className="text-sm">{o.emoji}</span>
                        <span className="truncate">{o.label}</span>
                      </div>
                      <span className="text-[9px] font-mono opacity-60 font-black shrink-0">
                        [{o.num}]
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Quick Notes Selector */}
              <div className="flex flex-wrap gap-1 mb-2">
                {QUICK_NOTES.map((qn) => (
                  <button
                    key={qn}
                    type="button"
                    onClick={() => setCallNotes((prev) => (prev ? `${prev}; ${qn}` : qn))}
                    className="text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                  >
                    + {qn}
                  </button>
                ))}
              </div>

              {/* Notes Input */}
              <textarea
                value={callNotes}
                onChange={(e) => setCallNotes(e.target.value)}
                placeholder="Call notes / discussion summary..."
                rows={2}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-xs text-slate-700 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A] transition-all resize-none mb-2.5"
              />

              {/* Follow-up shortcut & picker */}
              <div className="flex items-center gap-2 mb-3">
                <Clock size={12} className="text-slate-400 shrink-0" />
                <input
                  type="datetime-local"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="border border-slate-200 rounded-lg px-2 py-1 text-[11px] text-slate-700 bg-slate-50 focus:bg-white focus:outline-none"
                  title="Next Follow-up Reminder"
                />
                <button
                  type="button"
                  onClick={() => {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    tomorrow.setHours(11, 0, 0, 0);
                    setFollowUpDate(tomorrow.toISOString().slice(0, 16));
                  }}
                  className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
                >
                  Tomorrow 11 AM
                </button>
              </div>

              {/* Prominent Action Button: Save & Next */}
              <button
                type="button"
                onClick={handleLogCallAndNext}
                disabled={isSaving || !selectedOutcome}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#16A34A] to-[#15803D] text-white text-xs font-extrabold hover:from-[#15803D] hover:to-[#166534] shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    {selectedOutcome ? "Save Outcome & Next Lead ⚡" : "Select an outcome above"}
                  </>
                )}
              </button>
            </div>

            {/* ── Key Lead Information ── */}
            <div className="p-5 space-y-3 bg-white">
              <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block">Lead Info</span>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Phone</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-mono font-bold text-slate-700">{displayPhone || "—"}</span>
                    {lead.phone && !isMasked && (
                      <button onClick={handleCopyPhone} className="text-slate-400 hover:text-slate-600 cursor-pointer" title="Copy">
                        {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Email</span>
                  <span className="text-slate-700 font-medium truncate block mt-0.5">{lead.email || "—"}</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Location</span>
                  <span className="text-slate-700 font-medium flex items-center gap-1 mt-0.5">
                    <MapPin size={11} className="text-slate-400 shrink-0" />
                    {lead.location || "—"}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Added On</span>
                  <span className="text-slate-700 font-medium block mt-0.5">{formatDateShort(lead.createdAt)}</span>
                </div>
              </div>

              {/* Subjects & Classes */}
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Subjects & Classes</span>
                <div className="flex flex-wrap gap-1">
                  {lead.subjects?.map((s) => (
                    <span key={s} className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                      {s}
                    </span>
                  ))}
                  {lead.classes?.map((c) => (
                    <span key={c} className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-bold border border-purple-200">
                      {c}
                    </span>
                  ))}
                  {!lead.subjects?.length && !lead.classes?.length && (
                    <span className="text-slate-400 text-xs italic">None specified</span>
                  )}
                </div>
              </div>

              {/* Notes */}
              {lead.staffNotes && (
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Previous Notes</span>
                  <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 whitespace-pre-wrap">
                    {lead.staffNotes}
                  </p>
                </div>
              )}
            </div>

            {/* ── Call History Timeline ── */}
            <div className="p-5 bg-slate-50/50">
              <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block mb-2.5">
                Call History ({callLogs.length})
              </span>

              {loadingLogs ? (
                <div className="py-6 flex items-center justify-center text-xs text-slate-400 gap-2">
                  <Loader2 size={14} className="animate-spin text-slate-400" /> Loading call logs...
                </div>
              ) : callLogs.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-3 text-center">No call logs recorded yet.</p>
              ) : (
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {callLogs.map((log) => {
                    const outcomeObj = OUTCOMES.find((o) => o.key === log.outcome);
                    return (
                      <div key={log.id} className="bg-white p-2.5 rounded-xl border border-slate-200 text-xs">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-extrabold text-slate-700 flex items-center gap-1">
                            <span>{outcomeObj?.emoji || "📋"}</span>
                            <span>{outcomeObj?.label || log.outcome}</span>
                          </span>
                          <span className="text-[10px] text-slate-400">{formatRelative(log.calledAt)}</span>
                        </div>
                        {log.notes && <p className="text-slate-600 text-[11px] italic mt-0.5">&quot;{log.notes}&quot;</p>}
                        <span className="text-[10px] text-slate-400 block mt-1">
                          By {log.calledBy.name || log.calledBy.email.split("@")[0]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
