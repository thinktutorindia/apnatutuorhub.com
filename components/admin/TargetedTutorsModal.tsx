"use client";

import React, { useState, useEffect, useTransition, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  X,
  Search,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Phone,
  MessageCircle,
  MapPin,
  Star,
  Coins,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  BellRing,
  Send,
  ExternalLink,
  Gift,
  Clock,
  Check,
  Copy,
  DollarSign,
  UserCheck,
  ChevronRight,
  Filter,
} from "lucide-react";
import {
  adminGetLeadNotificationDetailsAction,
  adminSendLeadNotificationAction,
  adminAssignLeadDirectlyAction,
  adminQuickCreditCoinsAction,
  type TargetedTutorNotificationDetail,
} from "@/app/actions/admin.actions";
import { UserSubjectChips } from "@/components/admin/UserSubjectChips";
import { ActionOverlay } from "@/components/ui/LoadingState";
import { getInquiryHashTag } from "@/lib/lead-utils";

export interface TargetedTutorsModalProps {
  leadId: string;
  leadCode?: string;
  leadTitle?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function TargetedTutorsModal({
  leadId,
  leadCode,
  leadTitle,
  isOpen,
  onClose,
}: TargetedTutorsModalProps) {
  const [tutors, setTutors] = useState<TargetedTutorNotificationDetail[]>([]);
  const [lead, setLead] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "UNLOCKED" | "DELIVERED" | "UNCLAIMED">("ALL");
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copiedPhoneId, setCopiedPhoneId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadDetails = async () => {
    if (!leadId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await adminGetLeadNotificationDetailsAction(leadId);
      if (res.success && res.data) {
        setLead(res.data.lead);
        setTutors(res.data.targetedTutors);
      } else {
        setError(res.error || "Failed to load targeted tutors list.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadDetails();
      setFeedbackMsg(null);
    }
  }, [isOpen, leadId]);

  const displayedTutors = useMemo(() => {
    let list = [...tutors];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.email.toLowerCase().includes(q) ||
          (t.phone && t.phone.includes(q)) ||
          (t.city && t.city.toLowerCase().includes(q)) ||
          t.subjects.some((s) => s.toLowerCase().includes(q))
      );
    }

    if (filterType === "UNLOCKED") {
      list = list.filter((t) => t.isUnlocked);
    } else if (filterType === "DELIVERED") {
      list = list.filter((t) => t.notificationStatus === "DELIVERED" || t.notificationStatus === "SEEN" || t.notificationStatus === "READ");
    } else if (filterType === "UNCLAIMED") {
      list = list.filter((t) => !t.isUnlocked);
    }

    return list;
  }, [tutors, searchQuery, filterType]);

  const handleCopyPhone = (phone: string, id: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhoneId(id);
    setTimeout(() => setCopiedPhoneId(null), 2000);
  };

  const handleResendNotif = (tutor: TargetedTutorNotificationDetail) => {
    setFeedbackMsg(null);
    startTransition(async () => {
      const res = await adminSendLeadNotificationAction(leadId, [tutor.userId]);
      if (res.success) {
        setFeedbackMsg({
          type: "success",
          text: `🔔 Notification re-dispatched to ${tutor.name}!`,
        });
        loadDetails();
      } else {
        setFeedbackMsg({ type: "error", text: res.error || "Failed to send notification." });
      }
    });
  };

  const handleComplimentaryUnlock = (tutor: TargetedTutorNotificationDetail) => {
    if (!tutor.tutorProfileId) return;
    setFeedbackMsg(null);
    startTransition(async () => {
      const res = await adminAssignLeadDirectlyAction(leadId, tutor.tutorProfileId!);
      if (res.success) {
        setFeedbackMsg({
          type: "success",
          text: `🎁 Lead unlocked complimentary for ${tutor.name}!`,
        });
        loadDetails();
      } else {
        setFeedbackMsg({ type: "error", text: res.error || "Unlock failed." });
      }
    });
  };

  const handleQuickCredit = (tutor: TargetedTutorNotificationDetail, amount: number) => {
    if (!tutor.tutorProfileId) return;
    setFeedbackMsg(null);
    startTransition(async () => {
      const res = await adminQuickCreditCoinsAction(
        tutor.tutorProfileId!,
        amount,
        `Quick credit for enquiry ${leadCode || leadId.slice(-6)}`
      );
      if (res.success) {
        setFeedbackMsg({
          type: "success",
          text: `💳 Added +${amount} coins to ${tutor.name}'s wallet (New balance: ${res.data?.newBalance} coins).`,
        });
        loadDetails();
      } else {
        setFeedbackMsg({ type: "error", text: res.error || "Coin credit failed." });
      }
    });
  };

  const formatWhatsAppUrl = (phone: string, tutorName: string) => {
    const cleanDigits = phone.replace(/\D/g, "");
    const formattedPhone = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;
    const msg = `Hello ${tutorName} Sir/Mam! 👋 Greeting from ApnaTutorHub regarding student tuition requirement ${leadCode ? `#${leadCode}` : ""} (${lead?.classLevel || "Tuition"} - ${lead?.subjects?.join(", ") || "Subject"}). Are you available to take classes?`;
    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`;
  };

  if (!isOpen) return null;

  const displayCode = leadCode || (lead ? getInquiryHashTag(lead) : `#${leadId.slice(-6).toUpperCase()}`);
  const unlockedCount = tutors.filter((t) => t.isUnlocked).length;

  return (
    <>
      <ActionOverlay
        isOpen={isPending}
        title="Processing Admin Action"
        subtitle="Executing notifications and tutor updates..."
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-md overflow-y-auto animate-in fade-in duration-150">
        <div
          role="dialog"
          aria-modal="true"
          className="relative z-10 w-full max-w-5xl max-h-[92vh] flex flex-col bg-white border border-slate-200 shadow-2xl rounded-3xl overflow-hidden my-auto text-slate-900"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/80 shrink-0">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 border border-blue-200/80 text-blue-700 shadow-xs">
                <Users size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3
                    className="text-lg font-bold text-[#0F2540]"
                    style={{ fontFamily: "Poppins, sans-serif" }}
                  >
                    Targeted &amp; Notified Tutors
                  </h3>
                  <span className="font-mono font-extrabold text-xs text-[#0F2540] bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                    {displayCode}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  {lead ? `${lead.classLevel} · ${lead.subjects?.join(", ")} · ${[lead.area, lead.city].filter(Boolean).join(", ") || "Local"} · ${lead.radiusKm} km radius` : "Loading enquiry..."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadDetails}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Refresh Tutors"
              >
                <RefreshCw size={16} className={loading ? "animate-spin text-[#2D9E6B]" : ""} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* KPI Strip */}
          <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <span className="inline-flex items-center gap-1.5 font-extrabold text-[#0F2540]">
                <BellRing size={14} className="text-blue-600" />
                <span>{tutors.length} Total Tutors Targeted</span>
              </span>
              <span className="text-slate-300">•</span>
              <span className="inline-flex items-center gap-1.5 font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                <UserCheck size={13} className="text-emerald-600" />
                <span>{unlockedCount} / {lead?.maxTutors || 5} Unlocked &amp; Connected</span>
              </span>
              <span className="text-slate-300">•</span>
              <span className="font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                <Coins size={12} className="text-amber-600 inline mr-1" />
                <span>{lead?.coinCost || 10} coins unlock cost</span>
              </span>
            </div>
          </div>

          {/* Feedback message */}
          {feedbackMsg && (
            <div
              className={`mx-6 mt-3.5 flex items-center justify-between rounded-2xl p-3.5 text-xs font-bold shrink-0 border ${
                feedbackMsg.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : "bg-rose-50 border-rose-200 text-rose-900"
              }`}
            >
              <div className="flex items-center gap-2.5">
                {feedbackMsg.type === "success" ? (
                  <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle size={16} className="shrink-0 text-rose-600" />
                )}
                <span>{feedbackMsg.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setFeedbackMsg(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Filter & Search Bar */}
          <div className="p-4 sm:px-6 bg-white border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search targeted tutor by name, phone, city, subject..."
                className="w-full rounded-2xl pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#2D9E6B] font-semibold text-xs"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1 bg-slate-50 rounded-2xl px-3 py-1.5 border border-slate-200">
                <Filter size={13} className="text-slate-500" />
                <select
                  value={filterType}
                  onChange={(e: any) => setFilterType(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
                >
                  <option value="ALL">All Targeted Tutors ({tutors.length})</option>
                  <option value="UNLOCKED">🔓 Unlocked / Applied ({unlockedCount})</option>
                  <option value="DELIVERED">✓ Notifications Delivered</option>
                  <option value="UNCLAIMED">⏳ Unclaimed ({tutors.length - unlockedCount})</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tutors List Content */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
            {loading && (
              <div className="py-20 text-center space-y-3">
                <Loader2 size={36} className="animate-spin text-[#2D9E6B] mx-auto" />
                <p className="text-xs font-bold text-slate-500">Loading targeted tutors &amp; delivery tracking...</p>
              </div>
            )}

            {error && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-900 flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {!loading && !error && displayedTutors.length === 0 && (
              <div className="py-16 text-center text-xs font-bold text-slate-500 space-y-2">
                <Users size={36} className="mx-auto text-slate-300" />
                <p className="text-sm text-slate-700 font-extrabold">No targeted tutors found</p>
                <p className="text-slate-400">
                  {tutors.length === 0
                    ? "No tutors have received direct notifications for this lead yet. Use the 'Send' button to dispatch matching tutors."
                    : "No tutors match the current search / filter criteria."}
                </p>
              </div>
            )}

            {!loading && !error && displayedTutors.length > 0 && (
              <div className="grid gap-3.5">
                {displayedTutors.map((tutor) => {
                  const hasPhone = tutor.phone && tutor.phone.length > 5;
                  const isCopied = copiedPhoneId === tutor.userId;

                  return (
                    <div
                      key={tutor.userId}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                        tutor.isUnlocked
                          ? "bg-emerald-50/40 border-emerald-200 shadow-xs"
                          : "bg-white border-slate-200 hover:border-slate-300 shadow-xs"
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                        {/* Tutor Profile Column */}
                        <div className="flex items-start gap-3.5 flex-1 min-w-0">
                          <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-sm text-slate-700 shrink-0 overflow-hidden">
                            {tutor.image ? (
                              <img
                                src={tutor.image}
                                alt={tutor.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span>{tutor.name.charAt(0).toUpperCase()}</span>
                            )}
                          </div>

                          <div className="space-y-1.5 min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-extrabold text-sm text-[#0F2540]">
                                {tutor.name}
                              </h4>
                              {tutor.kycStatus === "APPROVED" && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-200">
                                  <ShieldCheck size={11} className="text-emerald-700" /> Verified KYC
                                </span>
                              )}
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                <Star size={11} className="fill-amber-500 text-amber-500" />
                                <span>{tutor.averageRating?.toFixed(1) || "5.0"}</span>
                                <span className="text-slate-400">({tutor.totalReviews})</span>
                              </span>
                            </div>

                            {/* Contact info */}
                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                              {tutor.phone && (
                                <div className="flex items-center gap-1 font-mono font-bold text-slate-800">
                                  <Phone size={12} className="text-slate-400" />
                                  <span>{tutor.phone}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyPhone(tutor.phone!, tutor.userId)}
                                    className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                                    title="Copy Phone Number"
                                  >
                                    {isCopied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                                  </button>
                                </div>
                              )}
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-500 truncate max-w-[200px]">{tutor.email}</span>
                              {tutor.city && (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <span className="flex items-center gap-1 text-slate-600">
                                    <MapPin size={12} className="text-[#2D9E6B]" />
                                    <span>{[tutor.area, tutor.city].filter(Boolean).join(", ")}</span>
                                  </span>
                                </>
                              )}
                              {tutor.distanceKm !== null && (
                                <span className="font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                                  📍 {tutor.distanceKm} km from student
                                </span>
                              )}
                            </div>

                            {/* Subjects */}
                            <div className="pt-1">
                              <UserSubjectChips subjects={tutor.subjects} maxVisible={4} />
                            </div>

                            {/* Proposal note preview if unlocked */}
                            {tutor.proposalNote && (
                              <div className="mt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-medium text-slate-700 italic">
                                &quot;{tutor.proposalNote}&quot;
                                {tutor.feeQuote && (
                                  <span className="not-italic font-bold text-emerald-800 ml-2">
                                    (Quote: ₹{tutor.feeQuote.toLocaleString("en-IN")})
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Notification & Status Action Column */}
                        <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-3 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                          {/* Status Badge */}
                          <div className="space-y-1 text-left lg:text-right">
                            {tutor.isUnlocked ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 font-extrabold text-[11px] border border-emerald-300">
                                <CheckCircle2 size={12} className="text-emerald-700" />
                                <span>Unlocked Lead ({tutor.coinsSpent ?? 0} coins)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-900 font-bold text-[11px] border border-blue-200">
                                <Clock size={12} className="text-blue-600" />
                                <span>Status: {tutor.notificationStatus || "Notified"}</span>
                              </span>
                            )}
                            <div className="text-[10px] text-slate-500 font-medium">
                              Sent: {new Date(tutor.sentAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                              {tutor.channel && ` · ${tutor.channel}`}
                            </div>
                            <div className="text-[11px] font-bold text-slate-700">
                              Wallet: <strong className="text-[#0F2540]">{tutor.walletBalance} coins</strong>
                            </div>
                          </div>

                          {/* Quick Action Buttons */}
                          <div className="flex flex-wrap items-center gap-2">
                            {hasPhone && (
                              <a
                                href={formatWhatsAppUrl(tutor.phone!, tutor.name)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors"
                                title="Open WhatsApp Chat"
                              >
                                <MessageCircle size={13} />
                                <span>WhatsApp</span>
                              </a>
                            )}

                            {hasPhone && (
                              <a
                                href={`tel:${tutor.phone}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                                title="Call Tutor"
                              >
                                <Phone size={13} />
                              </a>
                            )}

                            <button
                              type="button"
                              onClick={() => handleResendNotif(tutor)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-xs border border-blue-200 transition-colors cursor-pointer"
                              title="Re-send in-app/push notification"
                            >
                              <Send size={12} />
                              <span>Remind</span>
                            </button>

                            {!tutor.isUnlocked && tutor.tutorProfileId && (
                              <button
                                type="button"
                                onClick={() => handleComplimentaryUnlock(tutor)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs border border-amber-200 transition-colors cursor-pointer"
                                title="Complimentary unlock for tutor (0 coins charged)"
                              >
                                <Gift size={12} className="text-amber-600" />
                                <span>Free Unlock</span>
                              </button>
                            )}

                            {tutor.tutorProfileId && tutor.walletBalance < (lead?.coinCost || 10) && (
                              <button
                                type="button"
                                onClick={() => handleQuickCredit(tutor, 10)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 font-bold text-xs border border-purple-200 transition-colors cursor-pointer"
                                title="Quick credit +10 coins"
                              >
                                <Coins size={12} className="text-purple-600" />
                                <span>+10 Coins</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-semibold shrink-0">
            <span>Showing {displayedTutors.length} of {tutors.length} targeted tutors</span>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs cursor-pointer transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
