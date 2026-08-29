"use client";

import React, { useState, useTransition, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import {
  Send,
  X,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  Search,
  Loader2,
  Users,
  MapPin,
  Star,
  Coins,
  ShieldCheck,
  Phone,
  MessageCircle,
  Gift,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Award,
  MoreVertical,
  DollarSign,
  PlusCircle,
  UserCheck,
  ChevronDown,
  Filter,
  SlidersHorizontal,
  BellRing,
  MailCheck,
  MailX,
  Zap,
  CheckCheck,
  ShieldAlert,
} from "lucide-react";
import {
  adminGetMatchingTutorsForLeadAction,
  adminSendLeadNotificationAction,
  adminAssignLeadDirectlyAction,
  adminAssignLeadWithCoinsDeductionAction,
  adminQuickCreditCoinsAction,
  adminBatchAssignLeadFreeAction,
  type MatchedTutorSummary,
} from "@/app/actions/admin.actions";
import { UserSubjectChips } from "@/components/admin/UserSubjectChips";
import { ActionOverlay } from "@/components/ui/LoadingState";
import { formatLeadNotifyTemplate } from "@/lib/lead-notify-template";
import { getInquiryDisplayCode, getInquiryHashTag, isGenuineEmail, isSystemGeneratedEmail, isTill5thClass } from "@/lib/lead-utils";

export function SendLeadToTutorModal({
  leadId,
  leadTitle,
  triggerClassName,
  triggerText = "Send to Tutors",
}: {
  leadId: string;
  leadTitle?: string;
  triggerClassName?: string;
  triggerText?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [lead, setLead] = useState<any | null>(null);
  const [tutors, setTutors] = useState<MatchedTutorSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingTutors, setIsLoadingTutors] = useState(false);

  // Filters & Sorting
  const [emailCategoryFilter, setEmailCategoryFilter] = useState<"ALL" | "GENUINE_ONLY" | "SYSTEM_ONLY">("GENUINE_ONLY");
  const [filterType, setFilterType] = useState<
    "ALL" | "TOP_MATCH" | "NEARBY" | "VERIFIED" | "HAS_COINS" | "TOP_RATED" | "UNCLAIMED"
  >("ALL");
  const [sortType, setSortType] = useState<
    "MATCH_SCORE" | "DISTANCE" | "COINS" | "RATING" | "NAME"
  >("MATCH_SCORE");

  // Selected tutor IDs for batch dispatch
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [showCustomMsgInput, setShowCustomMsgInput] = useState(false);
  const [customNotificationMsg, setCustomNotificationMsg] = useState("");
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copiedLead, setCopiedLead] = useState(false);
  const [copiedPhoneId, setCopiedPhoneId] = useState<string | null>(null);

  // Open action dropdown menu per tutor
  const [activeDropdownTutorId, setActiveDropdownTutorId] = useState<string | null>(null);

  const fetchTutors = async (search?: string) => {
    setIsLoadingTutors(true);
    setFeedbackMsg(null);
    try {
      const res = await adminGetMatchingTutorsForLeadAction(leadId, search);
      if (res.success && res.data) {
        setLead(res.data.lead);
        setTutors(res.data.tutors);
        const parentContact = res.data.lead?.parentProfile?.user;
        const initialTemplate = formatLeadNotifyTemplate({
          id: res.data.lead.id,
          clientName: parentContact?.name || "Not Specified",
          subjects: res.data.lead.subjects,
          classLevel: res.data.lead.classLevel,
          board: res.data.lead.board,
          mode: res.data.lead.mode,
          area: res.data.lead.area,
          city: res.data.lead.city,
          state: res.data.lead.state,
          pincode: res.data.lead.pincode,
          budgetMin: res.data.lead.budgetMin,
          budgetMax: res.data.lead.budgetMax,
          genderPreference: res.data.lead.genderPreference,
          notes: res.data.lead.notes,
          timingPreference: res.data.lead.timingPreference,
          schedule: res.data.lead.timingPreference || "5 Days a Week",
          contactWhatsApp: "87997 07960",
        });
        setCustomNotificationMsg((prev) => prev || initialTemplate);
      } else {
        setFeedbackMsg({ type: "error", text: res.error ?? "Failed to load matching tutors." });
      }
    } catch (err: any) {
      setFeedbackMsg({ type: "error", text: err.message ?? "Error loading tutors" });
    } finally {
      setIsLoadingTutors(false);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    fetchTutors();
  };

  const handleClose = () => {
    setIsOpen(false);
    setSelectedUserIds([]);
    setFeedbackMsg(null);
    setActiveDropdownTutorId(null);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTutors(searchQuery);
  };

  // Counts
  const isOnlineDisabled = lead && lead.mode === "ONLINE" && isTill5thClass(lead.classLevel);
  const genuineCount = useMemo(() => tutors.filter((t) => isGenuineEmail(t.email)).length, [tutors]);
  const systemCount = useMemo(() => tutors.filter((t) => isSystemGeneratedEmail(t.email)).length, [tutors]);
  const selectedTutors = useMemo(() => tutors.filter((t) => selectedUserIds.includes(t.userId)), [tutors, selectedUserIds]);
  const selectedGenuineCount = useMemo(() => selectedTutors.filter((t) => isGenuineEmail(t.email)).length, [selectedTutors]);
  const selectedSystemCount = useMemo(() => selectedTutors.filter((t) => isSystemGeneratedEmail(t.email)).length, [selectedTutors]);

  // Filtered & Sorted Tutors List
  const displayedTutors = useMemo(() => {
    let list = [...tutors];

    // 1. Email Authenticity Filter
    if (emailCategoryFilter === "GENUINE_ONLY") {
      list = list.filter((t) => isGenuineEmail(t.email));
    } else if (emailCategoryFilter === "SYSTEM_ONLY") {
      list = list.filter((t) => isSystemGeneratedEmail(t.email));
    }

    // 2. Search query filter (client-side instantaneous)
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

    // 3. Match / Eligibility filter
    if (filterType === "TOP_MATCH") {
      list = list.filter((t) => t.matchScore >= 40);
    } else if (filterType === "NEARBY") {
      list = list.filter((t) => t.distanceKm !== null && t.distanceKm <= 15);
    } else if (filterType === "VERIFIED") {
      list = list.filter((t) => t.kycStatus === "APPROVED");
    } else if (filterType === "HAS_COINS") {
      list = list.filter((t) => t.walletBalance >= (lead?.coinCost ?? 10));
    } else if (filterType === "TOP_RATED") {
      list = list.filter((t) => t.averageRating >= 4.0);
    } else if (filterType === "UNCLAIMED") {
      list = list.filter((t) => !t.alreadyPurchased);
    }

    // 4. Sorting
    list.sort((a, b) => {
      if (a.alreadyPurchased !== b.alreadyPurchased) {
        return a.alreadyPurchased ? 1 : -1;
      }
      if (sortType === "MATCH_SCORE") return b.matchScore - a.matchScore;
      if (sortType === "DISTANCE") {
        if (a.distanceKm === null) return 1;
        if (b.distanceKm === null) return -1;
        return a.distanceKm - b.distanceKm;
      }
      if (sortType === "COINS") return b.walletBalance - a.walletBalance;
      if (sortType === "RATING") return b.averageRating - a.averageRating;
      if (sortType === "NAME") return a.name.localeCompare(b.name);
      return 0;
    });

    return list;
  }, [tutors, emailCategoryFilter, searchQuery, filterType, sortType, lead?.coinCost]);

  const toggleSelectTutor = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const toggleSelectAll = () => {
    const unpurchased = displayedTutors.filter((t) => !t.alreadyPurchased);
    if (selectedUserIds.length === unpurchased.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(unpurchased.map((t) => t.userId));
    }
  };

  const selectTopN = (n: number, genuineOnly: boolean = false) => {
    let pool = displayedTutors.filter((t) => !t.alreadyPurchased);
    if (genuineOnly) {
      pool = pool.filter((t) => isGenuineEmail(t.email));
    }
    const targetIds = pool.slice(0, n).map((t) => t.userId);
    setSelectedUserIds(targetIds);
  };

  const selectAllFiltered = (genuineOnly: boolean = false) => {
    let pool = displayedTutors.filter((t) => !t.alreadyPurchased);
    if (genuineOnly) {
      pool = pool.filter((t) => isGenuineEmail(t.email));
    }
    setSelectedUserIds(pool.map((t) => t.userId));
  };

  const deselectAll = () => {
    setSelectedUserIds([]);
  };

  const generateWhatsAppText = (tutorName?: string) => {
    if (!lead) return "";
    const parentContact = lead.parentProfile?.user;
    const greeting = tutorName ? `Hello ${tutorName} Sir/Mam! 👋\n\n` : "";
    const formatted = formatLeadNotifyTemplate({
      id: lead.id,
      clientName: parentContact?.name || "Not Specified",
      subjects: lead.subjects,
      classLevel: lead.classLevel,
      board: lead.board,
      mode: lead.mode,
      area: lead.area,
      city: lead.city,
      state: lead.state,
      pincode: lead.pincode,
      budgetMin: lead.budgetMin,
      budgetMax: lead.budgetMax,
      genderPreference: lead.genderPreference,
      notes: lead.notes,
      timingPreference: lead.timingPreference,
      schedule: lead.timingPreference || "5 Days a Week",
      contactWhatsApp: "87997 07960",
    });
    return `${greeting}${formatted}`;
  };

  const buildSafeWhatsAppUrl = (phone: string, text: string) => {
    let digits = phone.replace(/\D/g, "");
    if (digits.startsWith("91") && digits.length === 12) {
      // already has 91 country code
    } else if (digits.length === 10) {
      digits = `91${digits}`;
    } else if (digits.startsWith("0") && digits.length === 11) {
      digits = `91${digits.slice(1)}`;
    }
    return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
  };

  const handleCopyLeadText = () => {
    const text = customNotificationMsg.trim() || generateWhatsAppText();
    navigator.clipboard.writeText(text);
    setCopiedLead(true);
    setTimeout(() => setCopiedLead(false), 2000);
  };

  const handleCopyPhone = (phone: string, tutorId: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhoneId(tutorId);
    setTimeout(() => setCopiedPhoneId(null), 2000);
  };

  // 1. Batch Notifications
  const handleSendBatchNotifications = () => {
    if (selectedUserIds.length === 0) return;
    setFeedbackMsg(null);

    startTransition(async () => {
      const res = await adminSendLeadNotificationAction(
        leadId,
        selectedUserIds,
        customNotificationMsg.trim() || undefined
      );
      if (res.success) {
        setFeedbackMsg({
          type: "success",
          text: `🎯 Successfully dispatched notification to ${res.data?.sentCount} tutor(s)!`,
        });
        setSelectedUserIds([]);
      } else {
        setFeedbackMsg({ type: "error", text: res.error ?? "Failed to send notifications." });
      }
    });
  };

  // 2. Batch Free Allocation
  const handleBatchAssignFree = () => {
    const selectedTutors = tutors.filter((t) => selectedUserIds.includes(t.userId));
    const tutorProfileIds = selectedTutors.map((t) => t.tutorProfileId);
    if (tutorProfileIds.length === 0) return;

    setFeedbackMsg(null);
    startTransition(async () => {
      const res = await adminBatchAssignLeadFreeAction(leadId, tutorProfileIds);
      if (res.success) {
        setFeedbackMsg({
          type: "success",
          text: `🎁 Batch assigned lead to ${res.data?.assignedCount} tutor(s) for free!`,
        });
        setSelectedUserIds([]);
        fetchTutors();
      } else {
        setFeedbackMsg({ type: "error", text: res.error ?? "Batch allocation failed." });
      }
    });
  };

  // 3. Single Free Unlock
  const handleAssignDirectlyFree = async (tutor: MatchedTutorSummary) => {
    setActiveDropdownTutorId(null);
    setFeedbackMsg(null);

    startTransition(async () => {
      const res = await adminAssignLeadDirectlyAction(leadId, tutor.tutorProfileId);
      if (res.success) {
        setFeedbackMsg({
          type: "success",
          text: `🎁 Lead unlocked for free for ${tutor.name}! They can view parent contact details now.`,
        });
        fetchTutors();
      } else {
        setFeedbackMsg({ type: "error", text: res.error ?? "Failed to assign lead." });
      }
    });
  };

  // 4. Single Paid Unlock (Coins Deduction)
  const handleAssignWithCoins = async (tutor: MatchedTutorSummary) => {
    setActiveDropdownTutorId(null);
    setFeedbackMsg(null);

    startTransition(async () => {
      const res = await adminAssignLeadWithCoinsDeductionAction(leadId, tutor.tutorProfileId);
      if (res.success) {
        setFeedbackMsg({
          type: "success",
          text: `💰 Assigned lead to ${tutor.name} and deducted ${lead?.coinCost ?? 10} coins from their wallet.`,
        });
        fetchTutors();
      } else {
        setFeedbackMsg({ type: "error", text: res.error ?? "Failed to assign lead with coins." });
      }
    });
  };

  // 5. Quick Coin Credit
  const handleQuickCreditCoins = async (tutor: MatchedTutorSummary, amount: number) => {
    setActiveDropdownTutorId(null);
    setFeedbackMsg(null);

    startTransition(async () => {
      const res = await adminQuickCreditCoinsAction(
        tutor.tutorProfileId,
        amount,
        `Quick credit via Lead Dispatch for ${lead?.classLevel || "enquiry"}`
      );
      if (res.success) {
        setFeedbackMsg({
          type: "success",
          text: `💳 Credited +${amount} coins to ${tutor.name}'s wallet (New Balance: ${res.data?.newBalance} coins).`,
        });
        fetchTutors();
      } else {
        setFeedbackMsg({ type: "error", text: res.error ?? "Coin credit failed." });
      }
    });
  };

  // 6. Single In-App Notification
  const handleSendSingleNotification = async (tutor: MatchedTutorSummary) => {
    setActiveDropdownTutorId(null);
    setFeedbackMsg(null);

    startTransition(async () => {
      const res = await adminSendLeadNotificationAction(leadId, [tutor.userId]);
      if (res.success) {
        setFeedbackMsg({
          type: "success",
          text: `🔔 In-app & push notification dispatched to ${tutor.name}!`,
        });
      } else {
        setFeedbackMsg({ type: "error", text: res.error ?? "Failed to send notification." });
      }
    });
  };

  // 7. Copy Selected Phone Numbers
  const handleCopySelectedPhones = () => {
    const selectedTutors = tutors.filter((t) => selectedUserIds.includes(t.userId));
    const phones = selectedTutors.map((t) => t.phone).filter(Boolean).join(", ");
    if (phones) {
      navigator.clipboard.writeText(phones);
      setFeedbackMsg({
        type: "success",
        text: `📋 Copied ${selectedTutors.length} phone numbers to clipboard!`,
      });
    }
  };

  return (
    <>
      <ActionOverlay
        isOpen={isPending}
        title="Processing Admin Operation"
        subtitle="Executing lead dispatch, wallet updates, and notifications..."
      />

      <button
        type="button"
        onClick={handleOpen}
        className={
          triggerClassName ??
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#2D9E6B] border border-emerald-200 text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
        }
      >
        <Send size={13} />
        <span>{triggerText}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
          <div
            role="dialog"
            aria-modal="true"
            className="relative z-10 w-full max-w-5xl max-h-[92vh] flex flex-col bg-white border border-slate-200 shadow-2xl rounded-3xl overflow-hidden my-auto text-slate-900"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/80 shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200/80 text-[#2D9E6B] shadow-xs">
                  <Send size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3
                      className="text-lg font-bold text-[#0F2540]"
                      style={{ fontFamily: "Poppins, sans-serif" }}
                    >
                      Lead Dispatch &amp; Tutor Allocation
                    </h3>
                    <span className="text-[10px] uppercase font-extrabold tracking-wider bg-emerald-100 text-[#1F8255] px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Full Admin Privileges
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    {lead ? `${lead.classLevel} · ${lead.subjects?.join(", ")} · ${lead.city || "Local"}` : "Loading enquiry..."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Lead Details Ribbon */}
            {lead && (
              <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-[#0F2540]">
                    {lead.classLevel} ({lead.board || "CBSE"})
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="font-bold text-emerald-700">
                    {lead.subjects?.join(", ")}
                  </span>
                  <span className="text-slate-300">•</span>
                  {lead.mode === "ONLINE" ? (
                    <span className="font-extrabold text-teal-800 bg-teal-100 px-2.5 py-0.5 rounded-md border border-teal-300 flex items-center gap-1">
                      🌐 Online (Pan-India)
                    </span>
                  ) : (
                    <span className="text-slate-600 flex items-center gap-1">
                      <MapPin size={12} className="text-[#2D9E6B]" />
                      {[lead.area, lead.city].filter(Boolean).join(", ") || "—"}
                    </span>
                  )}
                  <span className="text-slate-300">•</span>
                  <span className="font-mono font-bold text-[#0F2540]">
                    ₹{lead.budgetMin ?? "—"}-₹{lead.budgetMax ?? "—"}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-md border border-amber-300">
                    {lead.coinCost} coins to unlock
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="font-medium text-slate-500">
                    Unlocked: <strong className="text-slate-800">{lead.purchases?.length ?? 0}/{lead.maxTutors} tutors</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyLeadText}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-white border border-slate-200 text-xs font-bold text-[#2D9E6B] hover:bg-emerald-50 cursor-pointer shadow-2xs"
                  >
                    {copiedLead ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copiedLead ? "Copied Pitch!" : "Copy WhatsApp Pitch"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Feedback Alert */}
            {isOnlineDisabled && (
              <div className="mx-6 mt-3.5 flex items-center gap-2.5 rounded-2xl p-3.5 text-xs font-bold bg-amber-50 border border-amber-300 text-amber-950">
                <AlertCircle size={16} className="shrink-0 text-amber-600" />
                <span>🚸 Online classes are disabled for classes up to 5th grade (children cannot take online classes). Notifications cannot be sent for this lead.</span>
              </div>
            )}

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

            {/* Filter & Search Toolbar */}
            <div className="p-4 sm:px-6 bg-white border-b border-slate-100 space-y-3 shrink-0">
              {/* Row 1: Email Authenticity Tabs (Genuine vs System vs All) */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 pb-1 border-b border-slate-100">
                <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-2xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setEmailCategoryFilter("GENUINE_ONLY")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                      emailCategoryFilter === "GENUINE_ONLY"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                    }`}
                    title="Real, verified user emails (Safe to notify, protects sending credits)"
                  >
                    <MailCheck size={13} />
                    <span>🌟 Genuine Real Emails</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        emailCategoryFilter === "GENUINE_ONLY"
                          ? "bg-emerald-800 text-emerald-100"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {genuineCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEmailCategoryFilter("SYSTEM_ONLY")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                      emailCategoryFilter === "SYSTEM_ONLY"
                        ? "bg-amber-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                    }`}
                    title="Auto-generated placeholder emails (@apnatutorhub.com test accounts)"
                  >
                    <MailX size={13} />
                    <span>🤖 System Accounts</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        emailCategoryFilter === "SYSTEM_ONLY"
                          ? "bg-amber-800 text-amber-100"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {systemCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEmailCategoryFilter("ALL")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                      emailCategoryFilter === "ALL"
                        ? "bg-slate-800 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                    }`}
                    title="Show all matched accounts (Genuine + System)"
                  >
                    <Users size={13} />
                    <span>👥 All Accounts</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        emailCategoryFilter === "ALL"
                          ? "bg-slate-950 text-slate-200"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {tutors.length}
                    </span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fetchTutors()}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition-colors"
                    title="Refresh Tutor Matches"
                  >
                    <RefreshCw size={13} className={isLoadingTutors ? "animate-spin text-[#2D9E6B]" : ""} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {/* Row 2: Search, Filters & Sorting */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-2 flex-1">
                  {/* Search */}
                  <div className="relative flex-1 min-w-[200px]">
                    <Search size={14} className="absolute left-3.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search tutor name, phone, city, subject..."
                      className="w-full rounded-2xl pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#2D9E6B] font-semibold text-xs"
                    />
                  </div>

                  {/* Filter Dropdown */}
                  <div className="flex items-center gap-1 bg-slate-50 rounded-2xl px-3 py-1.5 border border-slate-200">
                    <Filter size={13} className="text-slate-500" />
                    <select
                      value={filterType}
                      onChange={(e: any) => setFilterType(e.target.value)}
                      className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
                    >
                      <option value="ALL">All Matches ({displayedTutors.length})</option>
                      <option value="TOP_MATCH">🎯 High Match Score (&gt;40)</option>
                      <option value="NEARBY">📍 Near Location (&lt;15 km)</option>
                      <option value="VERIFIED">🛡️ Verified KYC Only</option>
                      <option value="HAS_COINS">💰 Has Sufficient Coins (&gt;={lead?.coinCost ?? 10})</option>
                      <option value="TOP_RATED">⭐ Top Rated (4.0+ ⭐)</option>
                      <option value="UNCLAIMED">🔓 Unclaimed Leads Only</option>
                    </select>
                  </div>

                  {/* Sort Dropdown */}
                  <div className="flex items-center gap-1 bg-slate-50 rounded-2xl px-3 py-1.5 border border-slate-200">
                    <SlidersHorizontal size={13} className="text-slate-500" />
                    <select
                      value={sortType}
                      onChange={(e: any) => setSortType(e.target.value)}
                      className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
                    >
                      <option value="MATCH_SCORE">Sort: Best Match Score</option>
                      <option value="DISTANCE">Sort: Nearest Distance</option>
                      <option value="COINS">Sort: Highest Coins</option>
                      <option value="RATING">Sort: Highest Rating</option>
                      <option value="NAME">Sort: Alphabetical (A-Z)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Row 3: Quick Multi-Select Pills (High Speed Bulk Dispatch) */}
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Zap size={11} className="text-amber-500" /> Quick Select:
                </span>

                <button
                  type="button"
                  onClick={() => selectTopN(10, true)}
                  className="px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-[11px] font-bold cursor-pointer transition-colors"
                >
                  Top 10 Genuine
                </button>

                <button
                  type="button"
                  onClick={() => selectTopN(25, true)}
                  className="px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-[11px] font-bold cursor-pointer transition-colors"
                >
                  Top 25 Genuine
                </button>

                <button
                  type="button"
                  onClick={() => selectTopN(50, true)}
                  className="px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-[11px] font-bold cursor-pointer transition-colors"
                >
                  Top 50 Genuine
                </button>

                <button
                  type="button"
                  onClick={() => selectAllFiltered(false)}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-[11px] font-bold cursor-pointer transition-colors"
                >
                  Select All Filtered ({displayedTutors.filter((t) => !t.alreadyPurchased).length})
                </button>

                {selectedUserIds.length > 0 && (
                  <button
                    type="button"
                    onClick={deselectAll}
                    className="px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-[11px] font-bold cursor-pointer transition-colors ml-auto"
                  >
                    ✕ Deselect All ({selectedUserIds.length})
                  </button>
                )}
              </div>
            </div>

            {/* Main Tutors List */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
              {isLoadingTutors ? (
                <div className="py-16 text-center space-y-2">
                  <Loader2 size={30} className="animate-spin text-[#2D9E6B] mx-auto" />
                  <p className="text-xs text-slate-500 font-medium">Computing live distance and subject matches...</p>
                </div>
              ) : displayedTutors.length === 0 ? (
                <div className="py-16 text-center space-y-2">
                  <Users size={34} className="text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-[#0F2540]">No tutors found matching this filter</p>
                  <p className="text-xs text-slate-500 font-medium">
                    Try switching tabs above (e.g. Genuine vs System vs All) or searching with another keyword.
                  </p>
                </div>
              ) : (
                displayedTutors.map((tutor) => {
                  const isSelected = selectedUserIds.includes(tutor.userId);
                  const isDropdownOpen = activeDropdownTutorId === tutor.tutorProfileId;
                  const hasEnoughCoins = tutor.walletBalance >= (lead?.coinCost ?? 10);
                  const isReal = isGenuineEmail(tutor.email);
                  const whatsappMsg =
                    customNotificationMsg.trim() || generateWhatsAppText(tutor.name);
                  const whatsappUrl = tutor.phone
                    ? buildSafeWhatsAppUrl(tutor.phone, whatsappMsg)
                    : null;

                  return (
                    <div
                      key={tutor.tutorProfileId}
                      className={`relative p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3.5 ${
                        tutor.alreadyPurchased
                          ? "bg-slate-50/80 border-slate-200 opacity-80"
                          : isSelected
                          ? "bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-400/20"
                          : "bg-white border-slate-200 hover:border-slate-300 shadow-2xs"
                      }`}
                    >
                      {/* Tutor Left Column */}
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        {!tutor.alreadyPurchased && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectTutor(tutor.userId)}
                            className="mt-1 h-4 w-4 rounded text-[#2D9E6B] focus:ring-emerald-500 cursor-pointer"
                          />
                        )}

                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-[#0F2540]">{tutor.name}</span>

                            {/* Email Authenticity Badge */}
                            {isReal ? (
                              <span
                                className="inline-flex items-center gap-0.5 text-[10px] font-extrabold bg-emerald-100 text-emerald-900 px-2 py-0.2 rounded-md border border-emerald-300"
                                title="Real, genuine verified email address (Safe for credit use)"
                              >
                                <MailCheck size={11} className="text-emerald-700" /> Real Email
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-0.5 text-[10px] font-extrabold bg-amber-100 text-amber-950 px-2 py-0.2 rounded-md border border-amber-300"
                                title="System placeholder email account (@apnatutorhub.com)"
                              >
                                <MailX size={11} className="text-amber-700" /> System Account
                              </span>
                            )}

                            {tutor.kycStatus === "APPROVED" && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.2 rounded-md border border-emerald-200">
                                <ShieldCheck size={11} /> Verified KYC
                              </span>
                            )}

                            {tutor.averageRating > 0 && (
                              <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded-md border border-amber-200">
                                <Star size={11} className="fill-amber-400 text-amber-400" />
                                {tutor.averageRating.toFixed(1)} ({tutor.totalReviews})
                              </span>
                            )}

                            {lead?.mode === "ONLINE" ? (
                              <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2 py-0.2 rounded-md border border-teal-200 flex items-center gap-0.5">
                                <Sparkles size={11} className="text-teal-600" /> Online (Pan-India)
                              </span>
                            ) : tutor.distanceKm !== null ? (
                              <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.2 rounded-md border border-blue-200 flex items-center gap-0.5">
                                <MapPin size={11} /> {tutor.distanceKm} km away
                              </span>
                            ) : null}

                            {tutor.alreadyPurchased ? (
                              <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                                Already Unlocked
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-md">
                                Score: {tutor.matchScore}
                              </span>
                            )}

                            {tutor.hasNotificationSent && (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-blue-50 text-blue-800 px-2 py-0.5 rounded-md border border-blue-200"
                                title={`Dispatched: ${tutor.lastNotifiedAt ? new Date(tutor.lastNotifiedAt).toLocaleString("en-IN") : "Recently"}`}
                              >
                                <BellRing size={10} className="text-blue-600" />
                                <span>Notified ({tutor.notificationStatus || "Delivered"})</span>
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 font-medium">
                            {tutor.phone && (
                              <button
                                type="button"
                                onClick={() => handleCopyPhone(tutor.phone!, tutor.tutorProfileId)}
                                className="hover:text-[#2D9E6B] flex items-center gap-1 font-mono text-[11px] cursor-pointer"
                                title="Click to copy phone"
                              >
                                <Phone size={11} />
                                <span>{tutor.phone}</span>
                                {copiedPhoneId === tutor.tutorProfileId && (
                                  <span className="text-[10px] text-emerald-600 font-bold">(Copied!)</span>
                                )}
                              </button>
                            )}
                            <span>•</span>
                            <span className="truncate">{tutor.city || "Delhi NCR"}</span>
                            <span>•</span>
                            <span className="text-slate-600 font-medium truncate max-w-[220px] sm:max-w-none">
                              {tutor.email}
                            </span>
                          </div>

                          {/* Subject Chips */}
                          <div className="pt-0.5">
                            <UserSubjectChips subjects={tutor.subjects} maxVisible={4} />
                          </div>
                        </div>
                      </div>

                      {/* Tutor Right Column Controls */}
                      <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                        {/* Wallet Balance Badge */}
                        <div className="text-right mr-1.5 hidden sm:block">
                          <span className="text-[10px] text-slate-400 block font-semibold">Wallet Coins</span>
                          <span
                            className={`font-mono font-bold text-xs ${
                              hasEnoughCoins ? "text-emerald-700" : "text-amber-700"
                            }`}
                          >
                            {tutor.walletBalance} coins
                          </span>
                        </div>

                        {/* Quick WhatsApp Link */}
                        {whatsappUrl && (
                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors"
                            title="Open direct WhatsApp conversation with lead pitch"
                          >
                            <MessageCircle size={13} />
                            <span>WhatsApp</span>
                          </a>
                        )}

                        {/* Quick Assign Free Button */}
                        {!tutor.alreadyPurchased && (
                          <button
                            type="button"
                            onClick={() => handleAssignDirectlyFree(tutor)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs transition-colors cursor-pointer"
                            title="Grant free unlock (0 coins)"
                          >
                            <Gift size={13} />
                            <span>Assign Free</span>
                          </button>
                        )}

                        {/* Dropdown Menu Toggle (Full Admin Privileges) */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveDropdownTutorId(
                                isDropdownOpen ? null : tutor.tutorProfileId
                              )
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold transition-colors cursor-pointer"
                            title="Full Privileges Menu"
                          >
                            <span>Privileges</span>
                            <ChevronDown size={13} />
                          </button>

                          {/* Dropdown Menu Items */}
                          {isDropdownOpen && (
                            <div className="absolute right-0 top-9 z-30 w-64 rounded-2xl bg-white border border-slate-200 shadow-2xl p-1.5 space-y-1 text-xs animate-in fade-in zoom-in-95 duration-150 text-slate-800">
                              <div className="px-3 py-1.5 text-[10px] uppercase font-extrabold tracking-wider text-slate-400 border-b border-slate-100">
                                Tutor Admin Controls
                              </div>

                              {whatsappUrl && (
                                <a
                                  href={whatsappUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-emerald-50 text-emerald-800 font-semibold cursor-pointer transition-colors"
                                >
                                  <MessageCircle size={14} className="text-[#2D9E6B]" />
                                  <span>Open WhatsApp Chat</span>
                                </a>
                              )}

                              <button
                                type="button"
                                onClick={() => handleSendSingleNotification(tutor)}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-800 font-semibold text-left cursor-pointer transition-colors"
                              >
                                <BellRing size={14} className="text-amber-600" />
                                <span>Send In-App &amp; Push Alert</span>
                              </button>

                              {!tutor.alreadyPurchased && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleAssignDirectlyFree(tutor)}
                                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-indigo-50 text-indigo-700 font-bold text-left cursor-pointer transition-colors"
                                  >
                                    <Gift size={14} />
                                    <span>Assign Free (0 Coins)</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleAssignWithCoins(tutor)}
                                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-amber-50 text-amber-800 font-bold text-left cursor-pointer transition-colors"
                                  >
                                    <DollarSign size={14} />
                                    <span>Assign &amp; Deduct {lead?.coinCost ?? 10} Coins</span>
                                  </button>
                                </>
                              )}

                              <div className="my-1 border-t border-slate-100" />

                              <button
                                type="button"
                                onClick={() => handleQuickCreditCoins(tutor, lead?.coinCost ?? 10)}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-emerald-50 text-emerald-900 font-semibold text-left cursor-pointer transition-colors"
                              >
                                <PlusCircle size={14} className="text-[#2D9E6B]" />
                                <span>Top-up +{lead?.coinCost ?? 10} Coins to Wallet</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleQuickCreditCoins(tutor, 50)}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-emerald-50 text-emerald-900 font-semibold text-left cursor-pointer transition-colors"
                              >
                                <Coins size={14} className="text-[#2D9E6B]" />
                                <span>Top-up +50 Bonus Coins</span>
                              </button>

                              <div className="my-1 border-t border-slate-100" />

                              <Link
                                href={`/admin/users/${tutor.userId}/edit`}
                                target="_blank"
                                className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer transition-colors"
                              >
                                <UserCheck size={14} className="text-slate-500" />
                                <span>View / Edit Full Profile</span>
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer / Batch Dispatch & Action Bar */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 space-y-3 shrink-0">
              {/* Expandable 1-Click Customizer */}
              {showCustomMsgInput && (
                <div className="w-full rounded-2xl bg-white border border-slate-200 p-4 space-y-3 shadow-xs animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                        <Sparkles size={13} />
                      </div>
                      <span className="text-xs font-black text-[#0F2540]">1-Click Message Customizer &amp; Link Dispatch</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {customNotificationMsg && (
                        <button
                          type="button"
                          onClick={() => setCustomNotificationMsg("")}
                          className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                        >
                          Clear Text
                        </button>
                      )}
                      <span className="text-[10px] font-mono font-bold text-slate-400">
                        {customNotificationMsg.length} chars
                      </span>
                    </div>
                  </div>

                  {/* 1-Click Preset Templates */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      ⚡ Quick Preset Templates (1-Click Fill)
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCustomNotificationMsg(generateWhatsAppText())}
                        className="px-3 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-200 text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                      >
                        🎯 Full Lead Template
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const leadNum = getInquiryDisplayCode(lead);
                          const classStr = `${lead?.classLevel || "Standard"}${lead?.subjects?.length ? ` (${lead.subjects.slice(0, 2).join(", ")})` : ""}`;
                          const locStr = [lead?.area, lead?.city].filter(Boolean).join(", ") || "Delhi NCR";
                          setCustomNotificationMsg(
                            `🚨 URGENT REQUIREMENT: Lead #${leadNum} for ${classStr} in ${locStr}! Dm on WhatsApp 87997 07960 or unlock on portal.`
                          );
                        }}
                        className="px-3 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-200 text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                      >
                        ⚡ Urgent Alert
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const leadNum = getInquiryDisplayCode(lead);
                          const feesStr = lead?.budgetMin && lead?.budgetMax ? `₹${lead.budgetMin} - ₹${lead.budgetMax}/mo` : "₹5000/mo";
                          const locStr = [lead?.area, lead?.city].filter(Boolean).join(", ") || "Delhi NCR";
                          setCustomNotificationMsg(
                            `💎 HIGH BUDGET TUITION: Lead #${leadNum} offering ${feesStr} in ${locStr}. Dm on WhatsApp 87997 07960 to claim.`
                          );
                        }}
                        className="px-3 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-950 border border-blue-200 text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                      >
                        💰 High Budget Alert
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const leadNum = getInquiryDisplayCode(lead);
                          setCustomNotificationMsg(
                            `👑 VIP Plan Reminder: You can unlock lead #${leadNum} for 0 coins with your VIP Plan! View Membership Plans: https://apnatutorhub.com/tutor/plans`
                          );
                        }}
                        className="px-3 py-1 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-950 border border-purple-200 text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                      >
                        👑 VIP 0-Coin Unlock
                      </button>
                    </div>
                  </div>

                  {/* 1-Click Variable Insert Chips */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      🧩 Insert Fields &amp; Links in Clicks
                    </p>
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          const leadNum = getInquiryDisplayCode(lead);
                          setCustomNotificationMsg((prev) => (prev ? `${prev} #${leadNum}` : `Enquiry #${leadNum}`));
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold border border-slate-200 cursor-pointer"
                      >
                        + Lead ID
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const name = lead?.parentProfile?.user?.name || "Client";
                          setCustomNotificationMsg((prev) => (prev ? `${prev} (Client: ${name})` : `Client: ${name}`));
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold border border-slate-200 cursor-pointer"
                      >
                        + Client Name
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const str = `${lead?.classLevel || "Standard"}${lead?.subjects?.length ? ` (${lead.subjects.join(", ")})` : ""}`;
                          setCustomNotificationMsg((prev) => (prev ? `${prev} ${str}` : str));
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold border border-slate-200 cursor-pointer"
                      >
                        + Class &amp; Subjects
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const loc = [lead?.area, lead?.city].filter(Boolean).join(", ") || "Delhi NCR";
                          setCustomNotificationMsg((prev) => (prev ? `${prev} Location: ${loc}` : `Location: ${loc}`));
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold border border-slate-200 cursor-pointer"
                      >
                        + Location
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const fees = lead?.budgetMin && lead?.budgetMax ? `₹${lead.budgetMin} - ₹${lead.budgetMax}/mo` : "₹5000/mo";
                          setCustomNotificationMsg((prev) => (prev ? `${prev} Fees: ${fees}` : `Fees: ${fees}`));
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold border border-slate-200 cursor-pointer"
                      >
                        + Fees
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomNotificationMsg((prev) => (prev ? `${prev} Dm on WhatsApp 87997 07960` : "Dm on WhatsApp 87997 07960"));
                        }}
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-950 text-[11px] font-extrabold border border-emerald-200 cursor-pointer"
                      >
                        + WhatsApp (87997 07960)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomNotificationMsg((prev) => (prev ? `${prev} 👑 VIP Membership: https://apnatutorhub.com/tutor/plans` : "👑 VIP Membership: https://apnatutorhub.com/tutor/plans"));
                        }}
                        className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-950 text-[11px] font-extrabold border border-purple-200 cursor-pointer"
                      >
                        + Membership Plan Link
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomNotificationMsg((prev) => (prev ? `${prev} 🔗 Unlock on Portal: https://apnatutorhub.com/tutor/leads` : "🔗 Unlock on Portal: https://apnatutorhub.com/tutor/leads"));
                        }}
                        className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-950 text-[11px] font-extrabold border border-blue-200 cursor-pointer"
                      >
                        + Portal Leads Link
                      </button>
                    </div>
                  </div>

                  {/* Message Input Box */}
                  <textarea
                    rows={3}
                    value={customNotificationMsg}
                    onChange={(e) => setCustomNotificationMsg(e.target.value)}
                    placeholder="Click preset templates or chips above, or customize message here..."
                    className="w-full rounded-xl p-3 bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-[#2D9E6B] transition-all resize-y"
                  />
                </div>
              )}

              {/* Action Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-xs font-black text-slate-900">
                      {selectedUserIds.length} tutor(s) selected
                    </span>
                    {selectedUserIds.length > 0 && (
                      <span className="text-[11px] text-slate-600 font-semibold bg-slate-200/70 px-2 py-0.5 rounded-md">
                        ({selectedGenuineCount} Real Emails, {selectedSystemCount} System Accounts)
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowCustomMsgInput(!showCustomMsgInput)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#2D9E6B] hover:text-[#238357] hover:underline cursor-pointer"
                    >
                      <Sparkles size={13} />
                      <span>{showCustomMsgInput ? "Hide customizer" : "Customize message with 1-click templates ▾"}</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                    <ShieldCheck size={11} className="text-emerald-600 shrink-0" />
                    <span>Credit Guard Active: Real email deliverability protected (No email credits used for system accounts).</span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {selectedUserIds.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={handleCopySelectedPhones}
                        className="px-3.5 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs transition-colors cursor-pointer shadow-2xs"
                        title="Copy all selected phone numbers"
                      >
                        Copy Phones
                      </button>

                      <button
                        type="button"
                        onClick={handleBatchAssignFree}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                        title="Directly unlock for all selected tutors"
                      >
                        <Gift size={14} />
                        <span>Batch Assign Free ({selectedUserIds.length})</span>
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    disabled={selectedUserIds.length === 0 || isPending || isOnlineDisabled}
                    onClick={handleSendBatchNotifications}
                    title={isOnlineDisabled ? "Online notifications disabled for <= Class 5" : undefined}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
                  >
                    <Send size={14} />
                    <span>Send Notification ({selectedUserIds.length})</span>
                  </button>
                </div>
              </div>
            </div>
        </div>
      </div>
    )}
  </>
);
}
