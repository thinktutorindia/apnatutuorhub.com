"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  MapPin,
  Clock,
  Phone,
  MessageCircle,
  Volume2,
  Lock,
  Unlock,
  CheckCircle2,
  Coins,
  ArrowRight,
  ShieldCheck,
  Star,
  Users,
  Calendar,
  Sparkles,
} from "lucide-react";
import { useSeniorTutor, translateClass, translateSubject, formatFeeDisplay } from "@/components/tutor/SeniorTutorContext";
import { purchaseLeadAction } from "@/app/actions/leads.actions";
import { cleanClassLevelDisplay, sanitizeSubjectsForClassLevel } from "@/lib/dummy-campaign-types";
import { formatLeadBudget } from "@/lib/lead-utils";
import { StartChatButton } from "@/components/chat/StartChatButton";
import { RequestLeadRefundButton } from "@/components/tutor/RequestLeadRefundButton";

export type SeniorLeadItem = {
  id: string;
  inquiryNumber: number;
  classLevel: string;
  subjects: string[];
  mode: string;
  city: string | null;
  area: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  timingPreference: string | null;
  distanceKm: number | null;
  isPurchased: boolean;
  parentName?: string | null;
  parentPhone?: string | null;
  parentProfileId?: string | null;
  purchaseId?: string | null;
  purchasedAt?: string | null;
};

interface SeniorDashboardClientProps {
  tutorName: string;
  walletBalance: number;
  initialUnlockedCount: number;
  ongoingBookingsCount: number;
  leads: SeniorLeadItem[];
  tutorSubjectsCount: number;
  isSubscriptionActive: boolean;
}

function cleanDisplaySubject(sub: string, classLevel: string): string {
  const match = classLevel.match(/\d+/);
  const num = match ? parseInt(match[0], 10) : null;
  const isJunior = (num !== null && num <= 8) || /^(?:class\s*[1-8]|primary|middle)$/i.test(classLevel.trim());

  if (isJunior) {
    return "All Subjects";
  }

  if (!sub) return "Mathematics";
  let s = sub.trim();
  // Strip redundant "for Class 12", "for Grade X", "- Class X", "(Class X)", etc.
  s = s.replace(/\s*(?:for|-|\(|\/|–|—|,)?\s*(?:class|grade|std|standard)\s*(?:[0-9]{1,2}|[ivx]+)?\b/gi, "");
  s = s.replace(/\b(?:for|in|of)\s+class\s+[0-9]{1,2}\b/gi, "");
  s = s.replace(/\bclass\s+[0-9]{1,2}\b/gi, "");
  s = s.replace(/\s+(?:[0-9]{1,2}|[ivx]+)\s*(?:st|nd|rd|th)?\s*(?:grade|class|std)?$/i, "");
  s = s.replace(/\bmaths\b/gi, "Mathematics");
  s = s.replace(/\s+/g, " ").trim();

  return s || "Mathematics";
}

export function SeniorDashboardClient({
  tutorName,
  walletBalance: initialWalletBalance,
  initialUnlockedCount,
  ongoingBookingsCount,
  leads: initialLeads,
  tutorSubjectsCount,
  isSubscriptionActive,
}: SeniorDashboardClientProps) {
  const {
    lang,
    t,
    currentArea,
    currentRadius,
    openAreaModal,
    speak,
    showFeedback,
  } = useSeniorTutor();

  const [walletBalance, setWalletBalance] = useState(initialWalletBalance);
  const [unlockedCount, setUnlockedCount] = useState(initialUnlockedCount);
  const [leads, setLeads] = useState<SeniorLeadItem[]>(initialLeads);
  const [activeFilter, setActiveFilter] = useState<"all" | "closest" | "highest" | "unlocked">("all");
  const [pendingUnlockLead, setPendingUnlockLead] = useState<SeniorLeadItem | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);

  const newLeads = useMemo(() => leads.filter((l) => !l.isPurchased), [leads]);
  const unlockedLeads = useMemo(() => leads.filter((l) => l.isPurchased), [leads]);

  // Filtered inquiries calculation
  const filteredLeads = useMemo(() => {
    if (activeFilter === "unlocked") {
      return unlockedLeads;
    }
    let list = [...newLeads];
    if (activeFilter === "closest") {
      list = list.filter((l) => l.distanceKm !== null && l.distanceKm < 3.0);
      list.sort((a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99));
    } else if (activeFilter === "highest") {
      list.sort((a, b) => (b.budgetMax || b.budgetMin || 0) - (a.budgetMax || a.budgetMin || 0));
    }
    return list.slice(0, 8);
  }, [newLeads, unlockedLeads, activeFilter]);

  const handleListenInquiry = (lead: SeniorLeadItem) => {
    const subjectsText = sanitizeSubjectsForClassLevel(lead.subjects, lead.classLevel).slice(0, 3).join(", ");
    const areaText = lead.area ? `${lead.area}, ${lead.city}` : lead.city || "Delhi";
    const budgetText = formatLeadBudget(lead, "short");
    const distText = lead.distanceKm ? `${lead.distanceKm.toFixed(1)} kilometer door` : "";

    const text =
      lang === "hi"
        ? `${cleanClassLevelDisplay(lead.classLevel)}, ${subjectsText}। होम ट्यूशन, ${areaText} ${distText}। शुल्क ${budgetText}।`
        : `${cleanClassLevelDisplay(lead.classLevel)}, ${subjectsText}. Home tuition at ${areaText} ${distText ? `about ${distText}` : ""}. Fee offered: ${budgetText}.`;

    speak(text);
  };

  const handleOpenUnlockConfirm = (lead: SeniorLeadItem) => {
    if (!isSubscriptionActive && walletBalance < 10) {
      showFeedback(
        lang === "hi"
          ? "फ़ोन नंबर देखने के लिए कम से कम 10 कॉइन्स आवश्यक हैं। कॉइन्स जोड़ें।"
          : "You need at least 10 Coins to view a parent phone number. Please add coins in Coin Wallet."
      );
      return;
    }
    setPendingUnlockLead(lead);
  };

  const handleExecuteUnlock = async () => {
    if (!pendingUnlockLead) return;
    setIsUnlocking(true);

    try {
      const res = await purchaseLeadAction(pendingUnlockLead.id);
      if (!res.success || !res.data) {
        showFeedback(res.error || "Could not unlock parent contact. Please try again.");
        setIsUnlocking(false);
        setPendingUnlockLead(null);
        return;
      }

      const parentContact = res.data.parentContact;
      const purchaseId = res.data.purchaseId;
      // Deduct coins if not on unlimited plan
      if (!isSubscriptionActive) {
        setWalletBalance((prev) => Math.max(0, prev - 10));
      }
      setUnlockedCount((prev) => prev + 1);

      // Update lead in local state
      setLeads((prev) =>
        prev.map((l) =>
          l.id === pendingUnlockLead.id
            ? {
                ...l,
                isPurchased: true,
                parentName: parentContact.name || "Verified Parent",
                parentPhone: parentContact.phone,
                purchaseId: purchaseId || l.purchaseId,
                purchasedAt: new Date().toISOString(),
              }
            : l
        )
      );

  setPendingUnlockLead(null);
  showFeedback(
    lang === "hi"
      ? `सफलता! ${parentContact.name || "अभिभावक"} का फ़ोन नंबर (${parentContact.phone}) अनलॉक हो गया है।`
      : `Contact Unlocked! Parent phone number (${parentContact.phone}) is now visible below.`
  );
} catch {
  showFeedback("Unlock request timed out. Please try again.");
} finally {
  setIsUnlocking(false);
}
  };

const cleanTutorName = (tutorName || "").replace(/\s+ji$/i, "").trim() || "Teacher";

return (
    <div className="space-y-6 sm:space-y-7">
      {/* ==================== WARM EMERALD HERO WELCOME CARD ==================== */}
      <div className="editorial-card hero-pattern border-[#A7F3D0] p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5 shadow-xs">
        <div className="space-y-2.5">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#A7F3D0] text-[#064E3B] font-black text-xs uppercase tracking-wider shadow-2xs">
            <span className="w-2.5 h-2.5 rounded-full bg-[#059669] animate-pulse" />
            <span>{t("verifiedNetworkBadge")}</span>
          </span>

          <h1 className="font-display font-black text-2xl sm:text-3xl lg:text-4xl text-[#18181B] tracking-tight">
            {lang === "hi" ? `नमस्ते, ${cleanTutorName} जी! 👋` : `Namaste, ${cleanTutorName} Ji! 👋`}
          </h1>

          <p className="text-slate-700 font-medium text-sm sm:text-base">
            {t("welcomeSub")}
          </p>

          {/* Location & Radius Pill */}
          <div className="pt-0.5">
            <span className="inline-flex flex-wrap items-center gap-2 px-3.5 py-2 rounded-2xl bg-white border-2 border-[#A7F3D0] text-[#18181B] font-black text-xs sm:text-sm shadow-2xs">
              <MapPin size={16} className="text-[#065F46] shrink-0" />
              <span>
                {currentArea} • {lang === "hi" ? `${currentRadius} किमी दायरा` : `Within ${currentRadius} km`} • {tutorSubjectsCount || 9} {lang === "hi" ? "विषय" : "Subjects"}
              </span>
            </span>
          </div>
        </div>

        <div className="shrink-0">
          <button
            type="button"
            onClick={openAreaModal}
            className="senior-btn w-full lg:w-auto px-5 py-3.5 rounded-2xl bg-white hover:bg-[#ECFDF5] text-[#064E3B] border-2 border-[#065F46] font-black text-sm flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
          >
            <span>📍 {t("editAreaBtn")}</span>
          </button>
        </div>
      </div>

      {/* ==================== 4 AT-A-GLANCE SUMMARY CARDS ==================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Available Wallet Coins */}
        <div className="editorial-card p-4 sm:p-5 bg-[#FFFBEB] border-2 border-[#FDE68A] flex flex-col justify-between space-y-3 shadow-xs min-w-0 transition-all hover:border-[#B45309]">
          <div className="flex items-start justify-between gap-2">
            <span className="min-h-[36px] flex items-center text-xs sm:text-sm font-black text-[#92400E] leading-snug">
              {t("statWalletLabel")}
            </span>
            <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#FEF3C7] text-[#92400E] font-display font-black flex items-center justify-center shrink-0 text-base sm:text-lg">
              🪙
            </span>
          </div>
          <div>
            <div className="font-display font-black text-2xl sm:text-3xl text-[#18181B] break-words leading-tight">
              {walletBalance} {t("coinsBadge")}
            </div>
            <Link
              href="/tutor/wallet"
              className="mt-1 inline-flex items-center gap-1 text-xs sm:text-sm font-black text-[#B45309] underline hover:text-[#18181B]"
            >
              {t("addCoinsMini")}
            </Link>
          </div>
        </div>

        {/* Card 2: Parent Contacts Unlocked */}
        <div className="editorial-card p-4 sm:p-5 bg-white border-2 border-[#E5DEC9] flex flex-col justify-between space-y-3 shadow-xs min-w-0 transition-all hover:border-[#065F46]">
          <div className="flex items-start justify-between gap-2">
            <span className="min-h-[36px] flex items-center text-xs sm:text-sm font-black text-slate-800 leading-snug">
              {t("statUnlockedLabel")}
            </span>
            <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#ECFDF5] text-[#065F46] flex items-center justify-center shrink-0">
              <Unlock size={18} />
            </span>
          </div>
          <div>
            <div className="font-display font-black text-2xl sm:text-3xl text-[#18181B] break-words leading-tight">
              {unlockedCount} {lang === "hi" ? "अनलॉक" : "Unlocked"}
            </div>
            <p className="mt-1 text-xs font-bold text-slate-500">
              {t("statUnlockedSub")}
            </p>
          </div>
        </div>

        {/* Card 3: Active Tuition Classes */}
        <div className="editorial-card p-4 sm:p-5 bg-white border-2 border-[#E5DEC9] flex flex-col justify-between space-y-3 shadow-xs min-w-0 transition-all hover:border-[#065F46]">
          <div className="flex items-start justify-between gap-2">
            <span className="min-h-[36px] flex items-center text-xs sm:text-sm font-black text-slate-800 leading-snug">
              {t("statActiveLabel")}
            </span>
            <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#ECFDF5] text-[#065F46] flex items-center justify-center shrink-0">
              <Users size={18} />
            </span>
          </div>
          <div>
            <div className="font-display font-black text-2xl sm:text-3xl text-[#18181B] break-words leading-tight">
              {ongoingBookingsCount || 1} {lang === "hi" ? "सक्रिय" : "Ongoing"}
            </div>
            <Link
              href="/tutor/bookings"
              className="mt-1 inline-flex items-center gap-1 text-xs font-black text-[#065F46] underline hover:text-[#064E3B]"
            >
              {t("statActiveSub")}
            </Link>
          </div>
        </div>

        {/* Card 4: Tutor Rating */}
        <div className="editorial-card p-4 sm:p-5 bg-white border-2 border-[#E5DEC9] flex flex-col justify-between space-y-3 shadow-xs min-w-0 transition-all hover:border-[#B45309]">
          <div className="flex items-start justify-between gap-2">
            <span className="min-h-[36px] flex items-center text-xs sm:text-sm font-black text-slate-800 leading-snug">
              {t("statRatingLabel")}
            </span>
            <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#FEF3C7] text-[#B45309] flex items-center justify-center shrink-0 font-black text-base sm:text-lg">
              ★
            </span>
          </div>
          <div>
            <div className="font-display font-black text-2xl sm:text-3xl text-[#18181B] break-words leading-tight">
              5.0 ★
            </div>
            <p className="mt-1 text-xs font-black text-[#065F46]">
              {t("statRatingSub")}
            </p>
          </div>
        </div>
      </div>

      {/* ==================== PRIORITY 'NEW STUDENT INQUIRIES' ==================== */}
      <div className="space-y-5">
        <div>
          <h2 className="font-display font-black text-2xl sm:text-3xl text-[#18181B]">
            {t("inquiriesHeading")}
          </h2>
          <p className="text-slate-700 font-medium text-sm sm:text-base mt-1">
            {t("inquiriesSub")}
          </p>
        </div>

        {/* Simple 1-Click Filter Pills */}
        <div className="flex flex-wrap items-center gap-2.5" role="group">
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={`min-h-[46px] px-4 py-2 rounded-2xl border-2 font-black text-xs sm:text-sm transition cursor-pointer shadow-xs ${
              activeFilter === "all"
                ? "bg-[#065F46] text-white border-[#065F46]"
                : "bg-white text-[#18181B] border-[#E5DEC9] hover:border-[#065F46]"
            }`}
          >
            {t("filterAll")} ({newLeads.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("closest")}
            className={`min-h-[46px] px-4 py-2 rounded-2xl border-2 font-black text-xs sm:text-sm transition cursor-pointer shadow-xs ${
              activeFilter === "closest"
                ? "bg-[#065F46] text-white border-[#065F46]"
                : "bg-white text-[#18181B] border-[#E5DEC9] hover:border-[#065F46]"
            }`}
          >
            {t("filterClosest")}
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("highest")}
            className={`min-h-[46px] px-4 py-2 rounded-2xl border-2 font-black text-xs sm:text-sm transition cursor-pointer shadow-xs ${
              activeFilter === "highest"
                ? "bg-[#065F46] text-white border-[#065F46]"
                : "bg-white text-[#18181B] border-[#E5DEC9] hover:border-[#065F46]"
            }`}
          >
            {t("filterHighest")}
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("unlocked")}
            className={`min-h-[46px] px-4 py-2 rounded-2xl border-2 font-black text-xs sm:text-sm transition cursor-pointer shadow-xs ${
              activeFilter === "unlocked"
                ? "bg-[#065F46] text-white border-[#065F46]"
                : "bg-white text-[#18181B] border-[#E5DEC9] hover:border-[#065F46]"
            }`}
          >
            {t("filterUnlocked")} ({unlockedLeads.length})
          </button>
        </div>

        {/* Wide Breathable Horizontal Inquiry Cards */}
        <div className="space-y-5">
          {filteredLeads.length === 0 ? (
            <div className="editorial-card p-10 text-center space-y-3">
              <p className="font-display font-black text-xl text-[#18181B]">
                No student inquiries match this filter right now.
              </p>
              <p className="text-slate-600 font-medium text-sm">
                Click &quot;{t("filterAll")}&quot; to view all nearby student requirements.
              </p>
            </div>
          ) : (
            filteredLeads.map((item) => {
              const cleanClass = cleanClassLevelDisplay(item.classLevel);
              const rawSubs = sanitizeSubjectsForClassLevel(item.subjects, cleanClass);
              const cleanedSubs = rawSubs.map((s) => cleanDisplaySubject(s, cleanClass)).filter(Boolean);
              const uniqueSubs = Array.from(new Set(cleanedSubs));
              const strippedSubs = uniqueSubs
                .map((s) => s.replace(new RegExp(`\\b${cleanClass}\\b`, "gi"), "").replace(/\s*(?:for|-|,)\s*$/i, "").replace(/\s+/g, " ").trim())
                .filter(Boolean);
              const subjectsTitle = strippedSubs.slice(0, 3).join(", ") || uniqueSubs.slice(0, 3).join(", ") || (lang === "hi" ? "सभी विषय" : "All Subjects");
              const displayClass = translateClass(cleanClass, lang);
              const displaySubject = translateSubject(subjectsTitle, lang);
              const classTitle = `${displayClass} • ${displaySubject}`;
              const landmark = item.area ? `${item.area}, ${item.city || "Delhi"}` : item.city || "Delhi NCR";
              const timing = item.timingPreference || (lang === "hi" ? "शाम (सुविधानुसार)" : "Evening (Flexible)");
              const feeText = formatLeadBudget(item, "full");
              const phoneClean = item.parentPhone ? item.parentPhone.replace(/[^0-9]/g, "").slice(-10) : "";

              if (item.isPurchased && item.parentPhone) {
                return (
                  <article
                    key={item.id}
                    className="editorial-card p-5 sm:p-7 border-[#065F46] bg-[#ECFDF5]/50 flex flex-col xl:flex-row xl:items-center justify-between gap-5 shadow-sm min-w-0 overflow-hidden w-full"
                  >
                    <div className="space-y-3 flex-1 min-w-0 w-full">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-3 py-1 rounded-xl bg-[#065F46] text-white font-black text-xs uppercase tracking-wider">
                          {t("contactUnlockedBadge")}
                        </span>
                        {item.distanceKm !== null && (
                          <span className="px-3 py-1 rounded-xl bg-[#D1FAE5] text-[#064E3B] font-black text-xs">
                            📍 {item.distanceKm.toFixed(1)} {lang === "hi" ? "किमी दूर" : "km away"}
                          </span>
                        )}
                        <span className="px-3 py-1 rounded-xl bg-white border border-[#E5DEC9] text-[#18181B] font-bold text-xs">
                          🕒 {timing}
                        </span>
                      </div>

                      <h3 className="font-display font-black text-xl sm:text-2xl text-[#18181B] leading-snug break-words">
                        {classTitle}
                      </h3>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-slate-700 font-semibold text-xs sm:text-sm break-words">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-[#A7F3D0]">
                          <MapPin size={14} className="text-[#065F46] shrink-0" />
                          <span><strong className="text-[#18181B] font-black">{t("landmarkPrefix")}</strong> {landmark}</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-[#A7F3D0]">
                          <strong className="text-[#18181B] font-black">{t("feePrefix")}</strong> {formatFeeDisplay(feeText, lang)}
                        </span>
                      </div>

                      <div className="bg-white border-2 border-[#065F46] rounded-2xl p-3.5 sm:p-4 inline-block w-full sm:w-auto shadow-xs">
                        <p className="font-black text-sm sm:text-base text-[#18181B]">
                          {item.parentName || "Verified Parent"}
                        </p>
                        <p className="font-display font-black text-xl sm:text-2xl text-[#065F46] tracking-wider font-mono">
                          {item.parentPhone}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row xl:flex-col gap-2.5 shrink-0 w-full xl:w-72 pt-3 xl:pt-0 border-t xl:border-t-0 border-[#A7F3D0]">
                      <a
                        href={`tel:${ item.parentPhone.replace(/[^+\d]/g, "") } `}
                        className="senior-btn w-full px-5 py-3 rounded-2xl btn-emerald-sheen text-white font-black text-center flex items-center justify-center gap-2 text-sm sm:text-base shadow-md transition-all active:scale-95"
                      >
                        <Phone size={17} />
                        <span>{t("callParentNow")}</span>
                      </a>
                      <a
                        href={`https://wa.me/91${phoneClean}?text=Namaste%2C%20main%20ApnaTutorHub%20se%20verified%20tutor%20hoon%20aapke%20tuition%20requirement%20ke%20liye.`}
target = "_blank"
rel = "noopener noreferrer"
className = "senior-btn w-full px-5 py-3 rounded-2xl bg-white hover:bg-[#ECFDF5] text-[#064E3B] border-2 border-[#065F46] font-black flex items-center justify-center gap-2 cursor-pointer shadow-xs text-sm sm:text-base transition-all active:scale-95 text-center"
  >
                        <MessageCircle size={17} />
                        <span>{t("whatsappParent")}</span>
                      </a >
{
  item.parentProfileId && (
    <StartChatButton
      targetProfileId={item.parentProfileId}
      leadId={item.id}
      role="TUTOR"
      className="senior-btn w-full px-5 py-2.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-300 font-black text-center flex items-center justify-center gap-2 text-xs sm:text-sm shadow-2xs transition-all active:scale-95 cursor-pointer"
      buttonText={lang === "hi" ? "💬 इन-ऐप चैट" : "💬 In-App Direct Chat"}
    />
  )
}
{
  item.purchaseId && (
    <div className="pt-0.5 flex justify-center w-full">
      <RequestLeadRefundButton
        purchaseId={item.purchaseId}
        purchasedAt={item.purchasedAt}
      />
    </div>
  )
}
                    </div >
                  </article >
                );
              }

return (
  <article
    key={item.id}
    className="editorial-card p-5 sm:p-7 flex flex-col xl:flex-row xl:items-center justify-between gap-5 shadow-sm hover:border-[#065F46] transition-all min-w-0 overflow-hidden w-full"
  >
    <div className="space-y-3 flex-1 min-w-0 w-full">
      <div className="flex flex-wrap items-center gap-2">
        <span className="px-3 py-1 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-[#18181B] font-black text-xs uppercase tracking-wider">
          🏠 {t("homeTuitionBadge")}
        </span>
        {item.distanceKm !== null && (
          <span className="px-3 py-1 rounded-xl bg-[#D1FAE5] text-[#064E3B] font-black text-xs">
            📍 {item.distanceKm.toFixed(1)} {lang === "hi" ? "किमी दूर" : "km away"}
          </span>
        )}
        <button
          type="button"
          onClick={() => handleListenInquiry(item)}
          className="min-h-[36px] px-3 py-1 rounded-xl bg-[#FFFBEB] hover:bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A] font-black text-xs inline-flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
          aria-label="Listen to student requirement"
        >
          <Volume2 size={15} />
          <span>{t("listenBtn")}</span>
        </button>
      </div>

      <h3 className="font-display font-black text-xl sm:text-2xl text-[#18181B] leading-snug break-words">
        {classTitle}
      </h3>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-slate-700 font-semibold text-xs sm:text-sm break-words">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-50 border border-slate-200">
          <MapPin size={14} className="text-[#065F46] shrink-0" />
          <span><strong className="text-[#18181B] font-black">{t("landmarkPrefix")}</strong> {landmark}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-50 border border-slate-200">
          <Clock size={14} className="text-[#B45309] shrink-0" />
          <span><strong className="text-[#18181B] font-black">{t("timingPrefix")}</strong> {timing}</span>
        </span>
      </div>
    </div>

    <div className="flex flex-col sm:flex-row xl:flex-col items-start sm:items-center xl:items-end justify-between gap-3 pt-3.5 xl:pt-0 border-t xl:border-t-0 border-[#E5DEC9] shrink-0 w-full xl:w-auto xl:min-w-[240px]">
      <div className="xl:text-right">
        <span className="text-xs font-black uppercase tracking-wider text-slate-500 block">
          {t("tuitionFeeHeader")}
        </span>
        <span className="font-display font-black text-xl sm:text-2xl text-[#18181B] whitespace-normal sm:whitespace-nowrap">
          {formatFeeDisplay(feeText, lang)}
        </span>
      </div>

      <button
        type="button"
        onClick={() => handleOpenUnlockConfirm(item)}
        className="senior-btn w-full sm:w-auto xl:w-full min-h-[50px] px-5 sm:px-6 py-3 rounded-2xl btn-emerald-sheen text-white font-black text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-95 text-center"
      >
        <Phone size={17} className="shrink-0" />
        <span>
          {isSubscriptionActive
            ? t("seeParentPhonePlanBtn")
            : t("seePhoneBtn")}
        </span>
      </button>
    </div>
  </article>
);
            })
          )}
        </div >
      </div >

  {/* ==================== STEP-BY-STEP UNLOCK CONFIRMATION MODAL ==================== */ }
{
  pendingUnlockLead && (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-[#18181B]/75 flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="bg-white border-2 border-[#18181B] rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="px-3 py-1 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0] text-[#064E3B] font-black text-xs uppercase tracking-wider">
              {t("confirmStepBadge")}
            </span>
            <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-[#18181B] mt-2">
              {t("confirmModalTitle")}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setPendingUnlockLead(null)}
            className="px-4 py-2 rounded-xl border-2 border-[#E5DEC9] font-bold text-[#18181B] hover:bg-[#FAF7F2] cursor-pointer"
          >
            ✕
          </button>
        </div>

        <p className="text-slate-700 font-medium text-sm sm:text-base">
          {isSubscriptionActive
            ? t("usePlanCreditModalText")
            : t("confirmExplainText")}
        </p>

        {/* Selected Inquiry & Visual Coin Math Breakdown */}
        <div className="bg-[#FAF7F2] border-2 border-[#E5DEC9] rounded-2xl p-5 space-y-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-500">
              {t("selectedStudentLabel")}
            </p>
            <p className="font-display font-black text-xl text-[#18181B] mt-0.5">
              {translateClass(cleanClassLevelDisplay(pendingUnlockLead.classLevel), lang)} •{" "}
              {sanitizeSubjectsForClassLevel(pendingUnlockLead.subjects, pendingUnlockLead.classLevel)
                .slice(0, 3)
                .map((s) => translateSubject(s, lang))
                .join(", ")}
            </p>
            <p className="font-bold text-slate-700 text-sm">
              {pendingUnlockLead.area ? `${pendingUnlockLead.area}, ${pendingUnlockLead.city}` : pendingUnlockLead.city || "Delhi"} •{" "}
              {formatFeeDisplay(formatLeadBudget(pendingUnlockLead, "full"), lang)}
            </p>
          </div>

          <div className="border-t-2 border-[#E5DEC9] pt-4 space-y-1.5 text-sm sm:text-base">
            <div className="flex justify-between font-bold text-slate-700">
              <span>{t("mathCurrentLabel")}</span>
              <span>
                {isSubscriptionActive ? t("activeMembershipLeads") : `${walletBalance} ${t("coinsBadge")}`}
              </span>
            </div>
            <div className="flex justify-between font-bold text-[#B45309]">
              <span>{t("mathCostLabel")}</span>
              <span>{isSubscriptionActive ? t("zeroCoinsIncludedPlan") : `− 10 ${t("coinsBadge")}`}</span>
            </div>
            <div className="flex justify-between font-display font-black text-xl text-[#065F46] border-t border-[#E5DEC9] pt-2">
              <span>{t("mathRemainingLabel")}</span>
              <span>
                {isSubscriptionActive ? t("membershipActive") : `${Math.max(0, walletBalance - 10)} ${t("coinsBadge")}`}
              </span>
            </div>
          </div>
        </div>

        {/* Two Large Clear Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            disabled={isUnlocking}
            onClick={handleExecuteUnlock}
            className="senior-btn flex-1 px-6 py-4 rounded-2xl btn-emerald-sheen text-white font-black text-lg cursor-pointer shadow-md disabled:opacity-50"
          >
            {isUnlocking
              ? (lang === "hi" ? "अनलॉक हो रहा है…" : "Unlocking…")
              : isSubscriptionActive
                ? (lang === "hi" ? "हाँ, फ़ोन नंबर दिखाएं (0 कॉइन्स)" : "Yes, Show Phone Number (0 Coins)")
                : (lang === "hi" ? "हाँ, फ़ोन नंबर दिखाएं (10 कॉइन्स)" : "Yes, Show Phone Number (10 Coins)")}
          </button>
          <button
            type="button"
            disabled={isUnlocking}
            onClick={() => setPendingUnlockLead(null)}
            className="senior-btn flex-1 px-6 py-4 rounded-2xl bg-white hover:bg-[#FAF7F2] text-[#18181B] font-black text-lg border-2 border-[#18181B] cursor-pointer"
          >
            {t("noGoBackBtn")}
          </button>
        </div>
      </div>
    </div>
  )
}
    </div >
  );
}
