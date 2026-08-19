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

  // Filtered & Sorted Tutors List
  const displayedTutors = useMemo(() => {
    let list = [...tutors];

    // Search query filter (client-side instantaneous)
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

    // Filter type
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

    // Sorting
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
  }, [tutors, searchQuery, filterType, sortType, lead?.coinCost]);

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

  const generateWhatsAppText = (tutorName?: string) => {
    if (!lead) return "";
    const parentContact = lead.parentProfile?.user;
    const loc = [lead.area, lead.city, lead.pincode].filter(Boolean).join(", ") || "Delhi NCR";
    const greeting = tutorName ? `Hello ${tutorName} Sir/Mam! 👋\n` : "";
    return `${greeting}🎓 *ApnaTutorHub — Student Tuition Lead* 🎯\n\n📚 *Subjects:* ${lead.subjects?.join(", ")}\n🏫 *Class:* ${lead.classLevel} (${lead.board || "CBSE"})\n📍 *Location:* ${loc}\n🚗 *Mode:* ${lead.mode === "OFFLINE" ? "Home Tuition (Offline)" : lead.mode === "ONLINE" ? "Online Only" : "Home or Online"}\n💰 *Budget:* ₹${lead.budgetMin ?? "Negotiable"} - ₹${lead.budgetMax ?? "Standard"}/month\n⏱ *Timing:* ${lead.timingPreference || "Flexible"}\n👤 *Parent:* ${parentContact?.name || "Verified Parent"}${parentContact?.phone ? ` (${parentContact.phone})` : ""}\n📝 *Notes:* ${lead.notes || "Student looking for dedicated personalized guidance."}\n\n🔗 *Unlock & View on Portal:* https://apnatutorhub.com/tutor/leads`;
  };

  const handleCopyLeadText = () => {
    const text = generateWhatsAppText();
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
                  <span className="text-slate-600 flex items-center gap-1">
                    <MapPin size={12} className="text-[#2D9E6B]" />
                    {[lead.area, lead.city].filter(Boolean).join(", ") || "—"}
                  </span>
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
            <div className="p-4 sm:px-6 bg-white border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
              <div className="flex flex-wrap items-center gap-2.5 flex-1">
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
                    <option value="ALL">All Matched Tutors ({tutors.length})</option>
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

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="px-3.5 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
                >
                  {selectedUserIds.length > 0 ? "Deselect All" : "Select All Unclaimed"}
                </button>
                <button
                  type="button"
                  onClick={() => fetchTutors()}
                  className="p-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition-colors"
                  title="Refresh Tutor Matches"
                >
                  <RefreshCw size={14} className={isLoadingTutors ? "animate-spin text-[#2D9E6B]" : ""} />
                </button>
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
                    Try changing your filter dropdown or searching with another keyword.
                  </p>
                </div>
              ) : (
                displayedTutors.map((tutor) => {
                  const isSelected = selectedUserIds.includes(tutor.userId);
                  const isDropdownOpen = activeDropdownTutorId === tutor.tutorProfileId;
                  const hasEnoughCoins = tutor.walletBalance >= (lead?.coinCost ?? 10);
                  const whatsappUrl = tutor.phone
                    ? `https://wa.me/91${tutor.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                        generateWhatsAppText(tutor.name)
                      )}`
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

                            {tutor.distanceKm !== null && (
                              <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.2 rounded-md border border-blue-200 flex items-center gap-0.5">
                                <MapPin size={11} /> {tutor.distanceKm} km away
                              </span>
                            )}

                            {tutor.alreadyPurchased ? (
                              <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                                Already Unlocked
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-md">
                                Score: {tutor.matchScore}
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
                            <span className="text-slate-500 font-semibold">{tutor.email}</span>
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
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="space-y-1">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <span>{selectedUserIds.length} tutor(s) selected</span>
                  {selectedUserIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowCustomMsgInput(!showCustomMsgInput)}
                      className="text-[11px] font-bold text-[#2D9E6B] hover:underline cursor-pointer"
                    >
                      {showCustomMsgInput ? "Hide custom text" : "Customize message ▾"}
                    </button>
                  )}
                </div>

                {showCustomMsgInput && selectedUserIds.length > 0 && (
                  <input
                    type="text"
                    value={customNotificationMsg}
                    onChange={(e) => setCustomNotificationMsg(e.target.value)}
                    placeholder="Custom push notification message (optional)..."
                    className="w-full sm:w-80 rounded-xl px-3 py-1.5 bg-white border border-slate-200 text-xs font-medium outline-none focus:border-[#2D9E6B]"
                  />
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {selectedUserIds.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={handleCopySelectedPhones}
                      className="px-3.5 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs transition-colors cursor-pointer"
                      title="Copy all phone numbers"
                    >
                      Copy Phone Numbers
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
                  disabled={selectedUserIds.length === 0 || isPending}
                  onClick={handleSendBatchNotifications}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
                >
                  <Send size={14} />
                  <span>Send Notification ({selectedUserIds.length})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
