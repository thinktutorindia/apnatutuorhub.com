"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BookOpen,
  Clock,
  Filter,
  IndianRupee,
  MapPin,
  Sliders,
  X,
  Sparkles,
  Search,
  Coins,
  ShieldCheck,
  Flame,
  CheckCircle2,
  Phone,
  MessageCircle,
  Award,
  Lock,
  Unlock,
  ChevronRight,
  User,
  Compass,
  Calendar,
  Languages,
  UserCheck,
  Zap,
  Star,
  Target,
  Crown,
  RotateCcw,
} from "lucide-react";
import { LeadPurchaseModal, type SubscriptionInfo } from "@/components/tutor/LeadPurchaseModal";
import type { ParentContact } from "@/app/actions/leads.actions";
import { StartChatButton } from "@/components/chat/StartChatButton";
import { LeadNotifReminderBanner } from "@/components/tutor/LeadNotifReminderBanner";
import { UserSubjectChips } from "@/components/admin/UserSubjectChips";
import { getInquiryDisplayCode, formatLeadBudget, presentLeadPostedAt, publicTutorSlots } from "@/lib/lead-utils";
import { getLeadPointCost } from "@/lib/subscription-plans";
import { RequestLeadRefundButton } from "@/components/tutor/RequestLeadRefundButton";
import { getWhatsAppSupportLink, SUPPORT_PHONE_DISPLAY } from "@/lib/support";
import {
  cleanClassLevelDisplay,
  sanitizeSubjectsForClassLevel,
  type DummyClaimedLeadInfo,
} from "@/lib/dummy-campaign-types";
import { useSeniorTutor, translateClass, translateSubject, translateMode, formatFeeDisplay } from "@/components/tutor/SeniorTutorContext";
import { hasSubjectOverlap, isLeadMatchedToTutor } from "@/lib/feed-matching";
import { sanitizeLeadNotes } from "@/lib/lead-sanitizer";

export function formatMilestoneCount(count: number): string {
  if (count >= 100) {
    const hundreds = Math.floor(count / 100) * 100;
    return `${hundreds}+`;
  }
  if (count >= 50) return "50+";
  return String(count);
}

export type ParentDetails = {
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  board: string | null;
  tutorGenderPref: string | null;
  languagePref: string | null;
  notes: string | null;
  studentName?: string | null;
  studentNotes?: string | null;
};

/** A paid unlock is kept locally so a route refresh can never make the phone
 * disappear while the tutor is still looking at the lead. */
type UnlockedContact = {
  leadId: string;
  inquiryNumber?: number | null;
  title: string;
  phone: string | null;
  name: string | null;
  email: string | null;
  area?: string | null;
  city?: string | null;
  purchaseId?: string | null;
  unlockedAt: string;
};

function unlockedStorageKey(tutorId?: string) {
  return `ath:unlocked-contacts:v1:${tutorId || "anonymous"}`;
}

function readUnlockedContacts(tutorId?: string): UnlockedContact[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(unlockedStorageKey(tutorId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as UnlockedContact[]) : [];
  } catch {
    return [];
  }
}

function whatsappNumber(phone: string | null | undefined) {
  let digits = (phone || "").replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) digits = digits.slice(2);
  else if (digits.startsWith("0") && digits.length === 11) digits = digits.slice(1);
  return digits;
}

function UnlockedContactPanel({ contacts }: { contacts: UnlockedContact[] }) {
  const { lang, t } = useSeniorTutor();
  if (contacts.length === 0) return null;

  return (
    <section className="rounded-3xl border-2 border-emerald-500/40 bg-white p-5 sm:p-6 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100 pb-3">
        <div>
          <h2 className="flex items-center gap-2 text-base sm:text-lg font-black text-slate-900">
            <CheckCircle2 size={20} className="text-emerald-600" />
            {t("unlockedPanelHeading")} ({contacts.length})
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 font-medium mt-0.5">
            {t("unlockedPanelSubtext")}
          </p>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 2xl:grid-cols-3">
        {contacts.map((c) => {
          const wa = whatsappNumber(c.phone);
          return (
            <div
              key={c.leadId}
              className="rounded-2xl border-2 border-emerald-300 bg-emerald-50/70 p-4 sm:p-5 space-y-3 shadow-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-base font-black text-slate-900 truncate">
                    {c.name || (lang === "hi" ? "सत्यापित अभिभावक" : "Verified Parent")}
                  </p>
                  <p className="text-xs text-slate-600 font-semibold">{c.title}</p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-200 text-emerald-900 shrink-0">
                  {t("unlockedStatusBadge")}
                </span>
              </div>

              <div className="bg-white rounded-xl p-3 border border-emerald-200 shadow-2xs">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
                  {t("parentMobileLabel")}
                </span>
                <p className="font-mono text-xl font-black text-slate-900 tracking-wider">
                  {c.phone || "—"}
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                {c.phone && (
                  <a
                    href={`tel:${c.phone}`}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 py-3 text-xs sm:text-sm font-black text-white shadow transition-all active:scale-95"
                  >
                    <Phone size={15} />
                    <span>{t("callParentBtn")}</span>
                  </a>
                )}
                {wa && (
                  <a
                    href={`https://wa.me/${wa}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-3 text-xs sm:text-sm font-black text-white shadow transition-all active:scale-95"
                  >
                    <MessageCircle size={16} />
                    <span>{t("whatsappBtn")}</span>
                  </a>
                )}
              </div>

              {c.purchaseId && (
                <div className="pt-1">
                  <RequestLeadRefundButton
                    purchaseId={c.purchaseId}
                    purchasedAt={c.unlockedAt}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export type FeedLead = {
  id: string;
  inquiryNumber?: number | null;
  parentProfileId?: string;
  subjects: string[];
  classLevel: string;
  mode: string;
  budgetMin: number | null;
  budgetMax: number | null;
  area: string | null;
  city: string | null;
  board?: string | null;
  coinCost: number;
  purchaseCount: number;
  maxTutors: number;
  distanceKm: number | null;
  createdAt: string;
  timingPreference: string | null;
  tutorGenderPref?: string | null;
  languagePref?: string | null;
  notes?: string | null;
  isPurchased: boolean;
  isShortlisted?: boolean;
  isRejected?: boolean;
  isHired?: boolean;
  status: string;
  purchaseId?: string | null;
  purchasedAt?: string | null;
  parentDetails?: ParentDetails | null;
};

const MODE_LABELS: Record<string, string> = {
  ONLINE: "Online",
  OFFLINE: "Home Tuition",
  EITHER: "Home Tuition",
  COACHING: "Home Tuition",
};

const MODE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  ONLINE: { bg: "bg-sky-50", text: "text-sky-800", border: "border-sky-200" },
  OFFLINE: { bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200" },
  EITHER: { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200" },
  COACHING: { bg: "bg-[#EEF3F8]", text: "text-[#0F2540]", border: "border-[#CBD5E1]" },
};

function formatPostTime(dateStr: string, seed = "") {
  const d = presentLeadPostedAt(dateStr, seed);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  let relative = "";
  if (diffMins < 1) relative = "Just now";
  else if (diffMins < 60) relative = `${diffMins}m ago`;
  else if (diffHours < 24) relative = `${diffHours}h ago`;
  else if (diffDays === 1) relative = "Yesterday";
  else if (diffDays < 7) relative = `${diffDays}d ago`;
  else relative = d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

  const exactTime = d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
  const exactDate = d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return { relative, exactTime, exactDate, isFresh: diffHours < 12 };
}

function DummyClaimedLeadCard({
  info,
  onDismiss,
}: {
  info: DummyClaimedLeadInfo;
  onDismiss: () => void;
}) {
  const classLabel = info.classLevel || "Tuition";
  const locality = info.locality || "your area";
  const city = info.city ? `, ${info.city}` : "";
  const subjects = info.subjects || "Matched subjects";
  const budget =
    info.budgetMin && info.budgetMax
      ? `₹${info.budgetMin.toLocaleString("en-IN")}–₹${info.budgetMax.toLocaleString("en-IN")}${info.rateType === "MONTHLY" ? "/mo" : "/hr"
      }`
      : null;
  const modeStyle = MODE_STYLES[info.mode || ""] || MODE_STYLES.EITHER;

  return (
    <div className="space-y-3 animate-in fade-in duration-300">
      <div className="relative overflow-hidden rounded-3xl border border-amber-200 bg-amber-50 p-4 sm:p-5 shadow-xs">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white font-black text-lg shadow-xs">
              🔒
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-amber-950">This requirement is fully booked</h2>
                <span className="rounded-full bg-amber-200 px-2.5 py-0.5 text-[11px] font-bold text-amber-900 border border-amber-300">
                  Tutors assigned
                </span>
              </div>
              <p className="text-xs sm:text-sm font-medium text-amber-900 leading-relaxed mt-1">
                Parents near {locality} already selected tutors. Similar {classLabel.toLowerCase()} enquiries in this area go fast — keep notifications on.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-xl p-1.5 text-amber-700 hover:bg-amber-200 transition-colors cursor-pointer shrink-0"
            title="Dismiss alert"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <article className="rounded-3xl bg-white border border-amber-200 ring-2 ring-amber-500/10 shadow-sm p-5 sm:p-6 space-y-4 opacity-95">
        <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="px-2.5 py-1 rounded-xl text-xs font-extrabold bg-[#0F2540] text-white shadow-2xs">
              {classLabel}
            </span>
            {info.mode && (
              <span className={`px-2.5 py-0.5 rounded-xl text-[11px] font-bold border ${modeStyle.bg} ${modeStyle.text} ${modeStyle.border}`}>
                {MODE_LABELS[info.mode] ?? info.mode}
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-950 border border-amber-300 px-2.5 py-0.5 text-[11px] font-black">
              <Lock size={11} /> Closed
            </span>
          </div>
        </div>

        <div className="flex items-start gap-2 text-sm font-bold text-slate-800">
          <MapPin size={16} className="text-emerald-600 mt-0.5 shrink-0" />
          <span>
            {locality}
            {city}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {subjects.split(",").map((s) => s.trim()).filter(Boolean).map((s) => (
            <span key={s} className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">
              {s}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {budget && (
            <div className="rounded-2xl bg-slate-50 border border-slate-200 px-3 py-2">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Budget</p>
              <p className="text-sm font-black text-emerald-700">{budget}</p>
            </div>
          )}
          {info.days && (
            <div className="rounded-2xl bg-slate-50 border border-slate-200 px-3 py-2">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Days</p>
              <p className="text-sm font-black text-slate-900">{info.days}</p>
            </div>
          )}
          {info.timing && (
            <div className="rounded-2xl bg-slate-50 border border-slate-200 px-3 py-2">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Timing</p>
              <p className="text-sm font-black text-slate-900">{info.timing}</p>
            </div>
          )}
        </div>

        <button
          type="button"
          disabled
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-slate-200 text-slate-500 text-sm font-black cursor-not-allowed"
        >
          <Lock size={15} />
          Unlock closed — tutors already assigned
        </button>

        <a
          href={getWhatsAppSupportLink("Hi ApnaTutorHub Support, I want similar tuition leads near my area.")}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 text-xs font-extrabold text-emerald-800 hover:underline"
        >
          WhatsApp {SUPPORT_PHONE_DISPLAY} for similar leads nearby
        </a>
      </article>
    </div>
  );
}

function LeadCard({
  lead,
  walletBalance,
  subscriptionInfo,
  onUnlock,
}: {
  lead: FeedLead;
  walletBalance: number;
  subscriptionInfo?: SubscriptionInfo | null;
  onUnlock: (lead: FeedLead) => void;
}) {
  const { lang, t } = useSeniorTutor();
  const slots = publicTutorSlots(lead.id, Boolean(lead.isPurchased));
  const maxTutorsAllowed = slots.max;
  const currentPurchases = slots.purchased;
  const spotsLeft = slots.left;
  const isAlmostFull = spotsLeft === 1;
  const isFull = false;
  const progressPercent = Math.min(100, Math.round((currentPurchases / maxTutorsAllowed) * 100));

  const planPointCost = getLeadPointCost(lead.classLevel, lead.budgetMin, lead.budgetMax);
  const remainingPoints =
    subscriptionInfo?.remainingPoints ??
    (subscriptionInfo?.quotaRemaining ?? 0) * 10;
  const hasActiveMembership = Boolean(subscriptionInfo?.hasActivePlan);
  const unlockViaMembershipPoints = Boolean(
    hasActiveMembership && remainingPoints >= planPointCost
  );

  const timeInfo = formatPostTime(lead.createdAt, lead.id);

  const phoneClean = lead.parentDetails?.phone
    ? lead.parentDetails.phone.replace(/[^0-9]/g, "")
    : "";

  const modeStyle = MODE_STYLES[lead.mode] || MODE_STYLES.EITHER;

  return (
    <>
      <div
        className={`group relative rounded-3xl bg-white border-2 transition-all flex flex-col justify-between p-5 sm:p-6 space-y-4 shadow-sm hover:shadow-md ${lead.isPurchased
          ? "border-emerald-500 bg-emerald-50/20"
          : "border-slate-200/90 hover:border-emerald-500"
          }`}
      >
        <div className="space-y-3.5">
          {/* Top Row: Class, Mode & Distance */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-mono font-bold text-xs text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                #{getInquiryDisplayCode(lead)}
              </span>

              <span className="px-3 py-1 rounded-xl text-xs font-black bg-slate-900 text-white">
                {translateClass(cleanClassLevelDisplay(lead.classLevel), lang)}
              </span>

              <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-900 border border-emerald-300">
                {translateMode(lead.mode, lang)}
              </span>
            </div>

            {lead.distanceKm !== null && lead.mode !== "ONLINE" && (
              <span className="text-xs font-bold text-emerald-900 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300 shrink-0">
                📍 {lead.distanceKm.toFixed(1)} {lang === "hi" ? "किमी" : "km"}
              </span>
            )}
          </div>

          {/* Clean Subject Title */}
          <div>
            <h3 className="text-lg font-black text-slate-900 leading-snug">
              {translateSubject(
                (lead.subjects &&
                  sanitizeSubjectsForClassLevel(lead.subjects, lead.classLevel)
                    .slice(0, 3)
                    .join(", ")) ||
                "All Subjects",
                lang
              )}
            </h3>
          </div>

          {/* Shortlisted Banner */}
          {lead.isShortlisted && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-3.5 text-xs font-semibold text-amber-950 flex items-start gap-2.5 shadow-2xs">
              <span className="text-base shrink-0">⭐</span>
              <div>
                <p className="font-extrabold text-amber-900">{t("shortlistedTitle")}</p>
                <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                  {t("shortlistedDesc")}
                </p>
              </div>
            </div>
          )}

          {/* Unlocked Parent Contact Box */}
          {lead.isPurchased && lead.parentDetails ? (
            <div className="space-y-3 rounded-2xl border-2 border-emerald-400 bg-emerald-50/80 p-4 text-xs shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200 pb-2.5">
                <div>
                  <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider block">
                    ✅ {lang === "hi" ? "अभिभावक संपर्क अनलॉक हो गया" : "Parent Contact Unlocked"}
                  </span>
                  <p className="text-base font-black text-[#0F2540]">
                    {lead.parentDetails.name || (lang === "hi" ? "सत्यापित अभिभावक" : "Verified Parent")}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-black text-emerald-800 bg-white border border-emerald-300 shrink-0">
                    ⚡ {slots.left} {slots.left > 1 ? t("slotsLeftPluralText") : t("slotsLeftText")}
                  </span>
                  {lead.parentDetails.phone && (
                    <>
                      <a
                        href={`tel:${lead.parentDetails.phone}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-sm transition-all active:scale-95"
                      >
                        <Phone size={13} />
                        <span>{t("callParentBtn")}</span>
                      </a>
                      <a
                        href={`https://wa.me/91${phoneClean}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-white font-black text-xs shadow-sm transition-all active:scale-95"
                      >
                        <MessageCircle size={13} />
                        <span>{t("whatsappBtn")}</span>
                      </a>
                    </>
                  )}
                  {lead.parentProfileId && (
                    <StartChatButton
                      targetProfileId={lead.parentProfileId}
                      leadId={lead.id}
                      role="TUTOR"
                      buttonText={lang === "hi" ? "💬 इन-ऐप चैट" : "💬 Chat"}
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div className="p-2.5 rounded-xl bg-white border border-emerald-200">
                  <span className="text-[10px] font-black text-emerald-800 uppercase block">{t("parentMobileLabel")}</span>
                  <p className="font-black text-[#0F2540] font-mono text-lg tracking-wide">
                    {lead.parentDetails.phone || "—"}
                  </p>
                </div>

                {lead.parentDetails.email &&
                  !lead.parentDetails.email.startsWith("wa_") &&
                  !lead.parentDetails.email.includes("@apnatutorhub") && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block">Email</span>
                      <p className="font-bold text-[#0F2540] truncate">
                        {lead.parentDetails.email}
                      </p>
                    </div>
                  )}

                <div className="sm:col-span-2">
                  <span className="text-[10px] font-bold text-slate-500 block">{lang === "hi" ? "पता और इलाका" : "Address & Locality"}</span>
                  <p className="font-semibold text-slate-700">
                    {[
                      lead.parentDetails.address,
                      lead.area,
                      lead.city,
                      lead.parentDetails.pincode,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>

                {(() => {
                  const cleanParentNotes = sanitizeLeadNotes(lead.parentDetails.notes, true);
                  if (!cleanParentNotes) return null;
                  return (
                    <div className="sm:col-span-2 rounded-xl bg-white p-2.5 border border-emerald-200">
                      <span className="text-[10px] font-bold text-slate-500 block">{lang === "hi" ? "अभिभावक का विवरण" : "Notes from Parent"}</span>
                      <p className="text-[11px] italic text-slate-700 pt-0.5">
                        &quot;{cleanParentNotes}&quot;
                      </p>
                    </div>
                  );
                })()}
              </div>
            </div>
          ) : (
            /* Requirement Details: Only Wanted Info without Duplication */
            <div className="space-y-2.5 pt-1 text-sm leading-relaxed">
              {/* Landmark */}
              <div className="flex items-center gap-2 text-slate-700">
                <MapPin size={15} className="text-emerald-700 shrink-0" />
                <span className="font-semibold break-words leading-relaxed">
                  <strong className="text-slate-900">
                      {lead.mode === "ONLINE"
                        ? (lang === "hi" ? "ऑनलाइन एनक्वायरी:" : "Online enquiry:")
                        : t("landmarkPrefix")}
                    </strong>{" "}
                    {lead.mode === "ONLINE"
                      ? (lead.city || (lang === "hi" ? "दिल्ली एनसीआर" : "Delhi NCR"))
                      : ([lead.area, lead.city].filter(Boolean).join(", ") || "Delhi NCR")}
                </span>
              </div>

              {/* Timing from DB */}
              {lead.timingPreference && (
                <div className="flex items-center gap-2 text-slate-700">
                  <Clock size={15} className="text-amber-700 shrink-0" />
                  <span className="font-semibold break-words leading-relaxed">
                    <strong className="text-slate-900">{t("timingPrefix")}</strong> {lead.timingPreference}
                  </span>
                </div>
              )}

              {/* Fee & Available Slots Row */}
              <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-slate-900 font-black text-sm">
                  <span className="text-xs font-bold text-slate-500 uppercase">{t("feePrefix")}</span>
                  <span className="text-emerald-900 font-extrabold">{formatFeeDisplay(formatLeadBudget(lead, "full"), lang)}</span>
                </div>

                {spotsLeft > 0 && !lead.isPurchased && (
                  <span className="text-[11px] font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg shrink-0">
                    ⚡ {spotsLeft} {spotsLeft > 1 ? t("slotsLeftPluralText") : t("slotsLeftText")}
                  </span>
                )}
              </div>

              {/* Tutor Gender Pref if specified */}
              {lead.tutorGenderPref && lead.tutorGenderPref !== "ANY" && (
                <div className="pt-0.5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-lg">
                    <User size={13} className="text-slate-500" />
                    <span>{lead.tutorGenderPref === "FEMALE" ? t("femaleTutorRequired") : t("maleTutorRequired")}</span>
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Card Footer: Coin Cost & Unlock Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3.5 border-t border-slate-100 mt-2 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {unlockViaMembershipPoints ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold text-xs">
                <Crown size={13} className="text-amber-500" />
                <span>
                  {lang === "hi"
                    ? `प्लान में शामिल · ${subscriptionInfo?.quotaRemaining ?? Math.max(1, Math.floor(remainingPoints / 10))} अनलॉक शेष`
                    : `Free with your plan · ${subscriptionInfo?.quotaRemaining ?? Math.max(1, Math.floor(remainingPoints / 10))} unlocks left`}
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs shadow-2xs whitespace-nowrap">
                <Coins size={13} className="text-slate-500" />
                <span>{planPointCost} {lang === "hi" ? "कॉइन्स अनलॉक हेतु" : "Coins to Unlock"}</span>
              </span>
            )}

            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
              {lang === "hi" ? "सटीक समय:" : "Exact time:"} {timeInfo.exactTime}
            </span>
            {unlockViaMembershipPoints && (
              <p className="w-full text-[11px] font-semibold text-emerald-800">
                {lang === "hi"
                  ? "इस अनलॉक पर कोई कॉइन नहीं कटेगा — आपके सक्रिय प्लान में शामिल है।"
                  : "No coins will be deducted — this unlock is included in your active plan."}
              </p>
            )}
          </div>

          {lead.isPurchased ? (
            <div className="flex flex-col items-end gap-1">
              <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-800 bg-emerald-100 px-3.5 py-2 rounded-2xl border border-emerald-300">
                <CheckCircle2 size={15} />
                <span>{t("contactUnlockedBadge")}</span>
              </span>
              {lead.purchaseId && (
                <RequestLeadRefundButton
                  purchaseId={lead.purchaseId}
                  purchasedAt={lead.purchasedAt}
                />
              )}
            </div>
          ) : isFull ? (
            <span className="text-xs font-bold text-slate-400 px-3 py-2 bg-slate-100 rounded-xl">
              Closed (Max Capacity)
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onUnlock(lead)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-black text-xs sm:text-sm whitespace-nowrap bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md active:scale-95 transition-all cursor-pointer text-center"
            >
              <Unlock size={15} className="shrink-0" />
              <span>
                {unlockViaMembershipPoints
                  ? t("seeParentPhonePlanBtn")
                  : (lang === "hi"
                    ? "🟢 अभिभावक संपर्क देखें"
                    : "🟢 View Parent Contact")}
              </span>
            </button>
          )}
        </div>
      </div>

    </>
  );
}

export function LeadFeedClient({
  leads,
  walletBalance,
  tutorSubjects = [],
  subscriptionInfo,
  claimedBannerInfo,
  kycStatus,
  teachingRadius = 10,
  tutorClassLevels = [],
  tutorLocation,
  initialInquiryNumber,
  tutorId,
  tutorName,
}: {
  leads: FeedLead[];
  walletBalance: number;
  tutorSubjects?: string[];
  subscriptionInfo?: SubscriptionInfo | null;
  claimedBannerInfo?: DummyClaimedLeadInfo | null;
  kycStatus?: string;
  teachingRadius?: number;
  tutorClassLevels?: string[];
  tutorLocation?: {
    city?: string | null;
    address?: string | null;
    lat?: number | null;
    lon?: number | null;
  };
  initialInquiryNumber?: number;
  tutorId?: string;
  tutorName?: string;
}) {
  const hasTutorLocation = Boolean(
    (tutorLocation?.lat && tutorLocation?.lon) || tutorLocation?.city || tutorLocation?.address
  );
  const hasTutorSubjects = Boolean(tutorSubjects && tutorSubjects.length > 0);
  const hasFilterConfig = true;

  const { lang, t } = useSeniorTutor();
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const cleanTutorName = (tutorName || "").replace(/\s+ji$/i, "").trim() || "Teacher";

  const handleRefreshFeed = () => {
    setIsRefreshing(true);
    router.push(`/tutor/leads?refreshed=${Date.now()}`);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 900);
  };

  const [viewTab, setViewTab] = useState<"matched" | "nearby" | "all" | "shortlisted" | "unlocked">(
    initialInquiryNumber ? "all" : hasFilterConfig ? "matched" : "all"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string>("ALL");
  const [modeFilter, setModeFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"recent" | "distance" | "cost" | "budget">("recent");
  const [showClaimedBanner, setShowClaimedBanner] = useState<boolean>(
    Boolean(claimedBannerInfo?.claimed)
  );

  // Modal lives at feed level (not inside a lead card) so a server refresh or
  // tab re-filter can never unmount it and take the unlocked phone with it.
  const [unlockTarget, setUnlockTarget] = useState<FeedLead | null>(null);
  const [unlockedContacts, setUnlockedContacts] = useState<UnlockedContact[]>([]);
  const autoOpenedRef = useRef(false);

  useEffect(() => {
    const contacts = readUnlockedContacts(tutorId);
    queueMicrotask(() => setUnlockedContacts(contacts));
  }, [tutorId]);

  // Deep link from a notification: open the unlock/apply modal once.
  useEffect(() => {
    if (autoOpenedRef.current || !initialInquiryNumber) return;
    const target = leads.find((l) => l.inquiryNumber === initialInquiryNumber);
    if (target) {
      autoOpenedRef.current = true;
      queueMicrotask(() => setUnlockTarget(target));
    }
  }, [initialInquiryNumber, leads]);

  // Refresh only when the user comes back to the tab. The old 30s timer made
  // the whole 500-lead feed re-render repeatedly and caused visible lag.
  // Never refresh while the unlock modal is open.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && !unlockTarget) {
        router.refresh();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [router, unlockTarget]);

  const handleUnlockSuccess = (contact: ParentContact, purchaseId: string) => {
    if (!unlockTarget) return;

    const entry: UnlockedContact = {
      leadId: unlockTarget.id,
      inquiryNumber: unlockTarget.inquiryNumber,
      title: `${cleanClassLevelDisplay(unlockTarget.classLevel)}${unlockTarget.area || unlockTarget.city
        ? ` · ${[unlockTarget.area, unlockTarget.city].filter(Boolean).join(", ")}`
        : ""
        }`,
      name: contact.name || null,
      phone: contact.phone || null,
      email: contact.email || null,
      area: contact.area || unlockTarget.area,
      city: contact.city || unlockTarget.city,
      purchaseId,
      unlockedAt: new Date().toISOString(),
    };

    setUnlockedContacts((prev) => {
      const next = [entry, ...prev.filter((c) => c.leadId !== entry.leadId)];
      try {
        window.sessionStorage.setItem(
          unlockedStorageKey(tutorId),
          JSON.stringify(next.slice(0, 50))
        );
      } catch {
        // storage unavailable — in-memory state still keeps the phone visible
      }
      return next.slice(0, 50);
    });

    // Server data can now catch up safely; the modal and contact panel are both
    // owned by this component and survive the refresh.
    router.refresh();
  };


  const unpurchased = useMemo(
    () => leads.filter((l) => !l.isPurchased),
    [leads]
  );
  const shortlisted = useMemo(() => leads.filter((l) => l.isShortlisted), [leads]);
  const purchased = useMemo(() => leads.filter((l) => l.isPurchased), [leads]);

  // Every paid unlock from the server is also pinned in the panel, so a reload
  // or a status change can never make a previously unlocked phone disappear.
  const serverUnlockedContacts = useMemo<UnlockedContact[]>(
    () =>
      purchased
        .filter((l) => l.parentDetails?.phone)
        .map((l) => ({
          leadId: l.id,
          inquiryNumber: l.inquiryNumber,
          title: `${cleanClassLevelDisplay(l.classLevel)}${l.area || l.city ? ` · ${[l.area, l.city].filter(Boolean).join(", ")}` : ""
            }`,
          name: l.parentDetails?.name || null,
          phone: l.parentDetails?.phone || null,
          email: l.parentDetails?.email || null,
          area: l.parentDetails?.address || l.area,
          city: l.parentDetails?.city || l.city,
          purchaseId: l.purchaseId,
          unlockedAt: l.purchasedAt || "",
        })),
    [purchased]
  );

  const visibleUnlockedContacts = useMemo(() => {
    const byLead = new Map<string, UnlockedContact>();
    for (const c of serverUnlockedContacts) byLead.set(c.leadId, c);
    // Locally cached contact is fresher and survives a slow server refresh.
    for (const c of unlockedContacts) byLead.set(c.leadId, c);
    return Array.from(byLead.values());
  }, [serverUnlockedContacts, unlockedContacts]);

  const matchedLeads = useMemo(() => {
    return unpurchased.filter((l) =>
      isLeadMatchedToTutor({
        lead: {
          distanceKm: l.distanceKm,
          mode: l.mode,
          subjects: l.subjects,
          classLevel: l.classLevel,
          tutorGenderPref: l.tutorGenderPref,
        },
        tutorSubjects,
        tutorClassLevels,
        teachingRadius,
        hasTutorLocation,
      })
    );
  }, [unpurchased, tutorSubjects, tutorClassLevels, teachingRadius, hasTutorLocation]);

  const nearbyLeads = useMemo(() => {
    return unpurchased.filter((l) => {
      if (!hasTutorLocation) return true;
      if (l.mode === "ONLINE") return true;
      return l.distanceKm !== null && l.distanceKm <= (teachingRadius);
    });
  }, [unpurchased, hasTutorLocation, teachingRadius]);

  const filtered = useMemo(() => {
    return leads
      .filter((l) => {
        // Tab filtering
        if (viewTab === "matched") {
          if (l.isPurchased) return false;
          const isMatch = isLeadMatchedToTutor({
            lead: {
              distanceKm: l.distanceKm,
              mode: l.mode,
              subjects: l.subjects,
              classLevel: l.classLevel,
              tutorGenderPref: l.tutorGenderPref,
            },
            tutorSubjects,
            tutorClassLevels,
            teachingRadius,
            hasTutorLocation,
          });
          if (!isMatch) return false;
        } else if (viewTab === "nearby") {
          if (l.isPurchased) return false;
          if (hasTutorLocation && l.mode !== "ONLINE") {
            if (l.distanceKm === null || l.distanceKm > (teachingRadius)) return false;
          }
        } else if (viewTab === "shortlisted") {
          if (!l.isShortlisted) return false;
        } else if (viewTab === "unlocked") {
          if (!l.isPurchased) return false;
        } else if (viewTab === "all") {
          if (l.isPurchased) return false;
        }

        // Subject filter dropdown
        if (subjectFilter !== "ALL") {
          const matchSub = hasSubjectOverlap([subjectFilter], l.subjects);
          if (!matchSub) return false;
        }

        // Mode filter
        if (modeFilter !== "ALL" && l.mode !== modeFilter) return false;

        // Search Query (Supports Subject, Class, Locality, and Enquiry Number e.g. #32042 / 32042 / ATH-32042)
        if (searchQuery.trim()) {
          const rawQ = searchQuery.trim();
          const q = rawQ.toLowerCase();
          const cleanDigits = rawQ.replace(/[^0-9]/g, "");

          const matchInquiry =
            l.inquiryNumber != null &&
            ((cleanDigits.length > 0 && String(l.inquiryNumber).includes(cleanDigits)) ||
              `#${l.inquiryNumber}`.toLowerCase().includes(q) ||
              `ath-${l.inquiryNumber}`.toLowerCase().includes(q) ||
              getInquiryDisplayCode(l).toLowerCase().includes(q));

          const matchSubj = l.subjects.some((s) => s.toLowerCase().includes(q));
          const matchClass = l.classLevel.toLowerCase().includes(q);
          const matchLoc =
            (l.city && l.city.toLowerCase().includes(q)) ||
            (l.area && l.area.toLowerCase().includes(q));

          if (!matchInquiry && !matchSubj && !matchClass && !matchLoc) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "distance") {
          if (a.distanceKm === null) return 1;
          if (b.distanceKm === null) return -1;
          return a.distanceKm - b.distanceKm;
        }
        if (sortBy === "cost") return a.coinCost - b.coinCost;
        if (sortBy === "budget") return (b.budgetMax || 0) - (a.budgetMax || 0);
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [
    leads,
    viewTab,
    subjectFilter,
    modeFilter,
    searchQuery,
    sortBy,
    tutorSubjects,
    tutorClassLevels,
    teachingRadius,
    hasTutorLocation,
  ]);

  return (
    <div className="space-y-6 text-slate-900">
      {/* Paid unlocks are always shown in full here — never masked, timed or hidden. */}
      <UnlockedContactPanel contacts={visibleUnlockedContacts} />

      {/* Claimed / Fully Booked Alert Banner */}
      {showClaimedBanner && claimedBannerInfo && (
        <DummyClaimedLeadCard info={claimedBannerInfo} onDismiss={() => setShowClaimedBanner(false)} />
      )}

      {/* Push Notification Setup Banner */}
      <LeadNotifReminderBanner />

      {/* ₹2,999 Silver Plan Upsell Banner — shown when tutor has no active plan */}
      {!subscriptionInfo?.hasActivePlan && walletBalance < 10 && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-800 via-emerald-700 to-[#0f5c30] p-5 sm:p-6 text-white shadow-lg border border-emerald-600/40">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/15 text-white border border-white/20 text-xs font-bold">
                <Zap size={13} />
                <span>₹1,257 &nbsp;•&nbsp; 6 Months Validity &nbsp;•&nbsp; 5 Verified Leads Unlock</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                Get the Commission Based Plan (₹1,257) — Unlock Verified Student Leads
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed">
                Start with a low upfront registration fee of ₹1,257 with 6 Months validity. Low competition: each lead shared with max 3 verified tutors only.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 shrink-0">
              <Link
                href="/tutor/plans"
                className="inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl bg-white text-emerald-800 font-extrabold text-sm shadow-md transition-all active:scale-95 hover:bg-emerald-50"
              >
                <Zap size={15} />
                <span>Activate ₹1,257 Commission Plan</span>
              </Link>
              <Link
                href="/tutor/wallet"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition-all active:scale-95"
              >
                <Coins size={14} />
                <span>Or Buy Coins</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ==================== WARM EMERALD HERO WELCOME CARD ==================== */}
      <div className="editorial-card hero-pattern border-[#A7F3D0] p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5 shadow-xs">
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#A7F3D0] text-[#064E3B] font-black text-xs uppercase tracking-wider shadow-2xs">
              <span className="w-2.5 h-2.5 rounded-full bg-[#059669] animate-pulse" />
              <span>{t("liveInquiriesBadge")}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] font-black text-xs">
              {t("seniorEducatorVerified")}
            </span>
          </div>

          <h1 className="font-display font-black text-2xl sm:text-3xl lg:text-4xl text-[#18181B] tracking-tight">
            {lang === "hi" ? `नमस्ते, ${cleanTutorName} जी! 👋` : `Namaste, ${cleanTutorName} Ji! 👋`}
          </h1>

          <p className="text-slate-700 font-medium text-sm sm:text-base">
            {t("welcomeSub")}
          </p>

          {/* Location & Radius & Milestone Active Leads Pill */}
          <div className="pt-0.5 flex flex-wrap items-center gap-2">
            <span className="inline-flex flex-wrap items-center gap-2 px-3.5 py-2 rounded-2xl bg-white border-2 border-[#A7F3D0] text-[#18181B] font-black text-xs sm:text-sm shadow-2xs">
              <MapPin size={16} className="text-[#065F46] shrink-0" />
              <span>
                {tutorLocation?.address || tutorLocation?.city || "Delhi NCR"} • {lang === "hi" ? `${teachingRadius} किमी दायरा` : `Within ${teachingRadius} km`} • {formatMilestoneCount(unpurchased.length)} {lang === "hi" ? "सक्रिय अनुरोध" : "Active Leads"}
              </span>
            </span>
          </div>
        </div>

        {/* Action / Badges Bar */}
        <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleRefreshFeed}
            disabled={isRefreshing}
            className="senior-btn px-5 py-3.5 rounded-2xl btn-emerald-sheen text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition cursor-pointer disabled:opacity-75"
          >
            <RotateCcw size={15} className={isRefreshing ? "animate-spin" : ""} />
            <span>{isRefreshing ? t("refreshingState") : t("refreshInquiriesBtn")}</span>
          </button>

          {/* Subscription Status or Wallet Balance */}
          {subscriptionInfo?.hasActivePlan ? (
            <div className="flex items-center justify-between gap-3 bg-white border-2 border-[#A7F3D0] rounded-2xl px-4 py-2.5 shadow-2xs">
              <div className="flex items-center gap-2">
                <Crown size={16} className="text-emerald-700 shrink-0" />
                <span className="text-xs font-black text-emerald-900">
                  {subscriptionInfo.quotaRemaining} {t("leadsRemainingCount")}
                </span>
              </div>
              <Link
                href="/tutor/plans"
                className="text-[11px] font-extrabold text-emerald-800 hover:underline"
              >
                {t("managePlanLink")}
              </Link>
            </div>
          ) : (
            <Link
              href="/tutor/wallet"
              className="senior-btn px-5 py-3 rounded-2xl bg-white hover:bg-[#FEF3C7] text-[#92400E] border-2 border-[#FDE68A] font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition"
            >
              <Coins size={15} />
              <span>{lang === "hi" ? `🪙 वॉलेट (${walletBalance} कॉइन्स)` : `🪙 Wallet (${walletBalance} Coins)`}</span>
            </Link>
          )}
        </div>
      </div>

      {/* View Tabs (Large, High Legibility, Senior Friendly) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Lead Feed Tabs" className="flex flex-wrap gap-2 p-1.5 bg-slate-100 rounded-2xl border-2 border-slate-200">
          <button
            type="button"
            onClick={() => setViewTab("matched")}
            className={`px-4 py-2.5 rounded-xl text-sm font-black transition-all cursor-pointer ${viewTab === "matched"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-slate-700 hover:text-slate-950 hover:bg-white/70"
              }`}
          >
            {t("tabMatchingSubjects")} ({matchedLeads.length})
          </button>

          <button
            type="button"
            onClick={() => setViewTab("nearby")}
            className={`px-4 py-2.5 rounded-xl text-sm font-black transition-all cursor-pointer ${viewTab === "nearby"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-700 hover:text-slate-950 hover:bg-white/70"
              }`}
          >
            📍 {lang === "hi" ? `${teachingRadius} किमी के दायरे में` : `Within ${teachingRadius} km`} ({nearbyLeads.length})
          </button>

          <button
            type="button"
            onClick={() => setViewTab("all")}
            className={`px-4 py-2.5 rounded-xl text-sm font-black transition-all cursor-pointer ${viewTab === "all"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-700 hover:text-slate-950 hover:bg-white/70"
              }`}
          >
            {t("tabAllCityLeads")} ({formatMilestoneCount(unpurchased.length)})
          </button>

          <button
            type="button"
            onClick={() => setViewTab("unlocked")}
            className={`px-4 py-2.5 rounded-xl text-sm font-black transition-all cursor-pointer ${viewTab === "unlocked"
              ? "bg-emerald-700 text-white shadow-sm"
              : "text-slate-700 hover:text-slate-950 hover:bg-white/70"
              }`}
          >
            {t("tabUnlockedContacts")} ({visibleUnlockedContacts.length})
          </button>
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefreshFeed}
            disabled={isRefreshing}
            className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-800 border-2 border-emerald-300 font-black text-xs inline-flex items-center gap-1.5 shadow-2xs transition cursor-pointer disabled:opacity-70"
            title="Rotate and refresh student inquiries"
          >
            <RotateCcw size={14} className={isRefreshing ? "animate-spin" : ""} />
            <span>{isRefreshing ? t("refreshingState") : t("rotateInquiriesBtn")}</span>
          </button>
        </div>
      </div>

      {/* Informative Context Banners */}
      {viewTab === "matched" && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs font-medium">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-black text-sm shadow-xs">
              <Target size={16} />
            </span>
            <div>
              <span className="font-bold text-emerald-900">
                {t("autoFilteredTitle")}
              </span>{" "}
              {lang === "hi"
                ? `आपके विषय और कक्षा अनुसार ${teachingRadius} किमी के दायरे में ${filtered.length} अनुरोध दिखाए जा रहे हैं।`
                : `Showing ${filtered.length} leads within ${teachingRadius} km${tutorLocation?.address || tutorLocation?.city ? ` near ${tutorLocation.address || tutorLocation.city}` : ""} matching your teaching subjects & grades.`}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setViewTab("nearby")}
              className="px-3.5 py-1.5 rounded-full bg-white border border-emerald-300 text-emerald-800 font-bold hover:bg-emerald-100 transition-colors text-xs cursor-pointer shadow-xs"
            >
              {lang === "hi" ? `${teachingRadius} किमी में सभी ${nearbyLeads.length} देखें` : `View all ${nearbyLeads.length} within ${teachingRadius} km`}
            </button>
            <button
              type="button"
              onClick={() => setViewTab("all")}
              className="px-3.5 py-1.5 rounded-full bg-emerald-800 text-white font-bold hover:bg-emerald-900 transition-colors text-xs cursor-pointer shadow-xs"
            >
              {lang === "hi" ? `पूरे शहर के सभी ${formatMilestoneCount(unpurchased.length)} अनुरोध देखें` : `Browse all ${formatMilestoneCount(unpurchased.length)} city leads`}
            </button>
          </div>
        </div>
      )}

      {viewTab === "nearby" && hasTutorLocation && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-sky-50 border border-sky-200 text-sky-950 text-xs font-medium">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white font-black text-sm">
              📍
            </span>
            <div>
              <span className="font-bold text-sky-900">
                {lang === "hi" ? "इलाका दृश्य:" : "Neighborhood View:"}
              </span>{" "}
              {lang === "hi"
                ? `${teachingRadius} किमी के दायरे में सभी ${filtered.length} छात्र अनुरोध दिखाए जा रहे हैं।`
                : `Showing all ${filtered.length} student leads within ${teachingRadius} km radius${tutorLocation?.address ? ` (${tutorLocation.address})` : ""} across all subjects.`}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setViewTab("matched")}
            className="px-2.5 py-1 rounded-xl bg-sky-700 text-white font-bold hover:bg-sky-800 transition-colors text-[11px] cursor-pointer shrink-0"
          >
            {lang === "hi" ? `← विषय अनुसार अनुरोध (${matchedLeads.length})` : `← Back to Matched (${matchedLeads.length})`}
          </button>
        </div>
      )}

      {!hasTutorLocation && (
        <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs font-medium">
          <div className="flex items-center gap-2.5">
            <MapPin size={18} className="text-amber-600 shrink-0" />
            <span>
              <strong>{lang === "hi" ? "स्थान निर्धारित नहीं है:" : "Location not configured:"}</strong>{" "}
              {lang === "hi" ? "अपने घर के पास के ट्यूशन देखने के लिए प्रोफ़ाइल में क्षेत्र और दूरी सेट करें।" : "Set your teaching locality and radius in your profile to auto-filter leads near you."}
            </span>
          </div>
          <Link
            href="/tutor/profile"
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shrink-0 transition-colors"
          >
            {lang === "hi" ? "स्थान सेट करें →" : "Set Location →"}
          </Link>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="p-4 sm:p-5 ath-panel flex flex-col md:flex-row md:items-center justify-between gap-3.5">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search */}
          <div className="relative flex-1 min-w-0 w-full">
            <Search size={14} className="absolute left-3.5 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full rounded-2xl pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#2D9E6B] font-semibold text-xs"
            />
          </div>

          {/* Subject Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 rounded-2xl px-3 py-1.5 border border-slate-200">
            <Filter size={13} className="text-slate-500" />
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="ALL">{t("allSubjectsOption")}</option>
              {tutorSubjects.map((s) => (
                <option key={s} value={s}>{translateSubject(s, lang)}</option>
              ))}
            </select>
          </div>

          {/* Mode Filter Pills */}
          <div className="flex flex-wrap items-center gap-0.5 rounded-2xl bg-slate-50 p-1 border border-slate-200">
            {(["ALL", "ONLINE", "OFFLINE", "COACHING", "EITHER"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setModeFilter(m)}
                className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${modeFilter === m
                  ? "bg-[#0F2540] text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                {m === "ALL" ? t("allModesOption") : m === "OFFLINE" ? t("offlineMode") : m === "ONLINE" ? t("onlineMode") : m === "COACHING" ? t("coachingMode") : t("eitherMode")}
              </button>
            ))}
          </div>
        </div>

        {/* Sort By */}
        <div className="flex items-center gap-1.5 bg-slate-50 rounded-2xl px-3 py-1.5 border border-slate-200 shrink-0">
          <Sliders size={13} className="text-slate-500" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
          >
            <option value="recent">{t("sortNewest")}</option>
            <option value="distance">{t("sortDistance")}</option>
            <option value="budget">{lang === "hi" ? "क्रम: सबसे अधिक शुल्क" : "Sort: Highest Budget"}</option>
            <option value="cost">{lang === "hi" ? "क्रम: न्यूनतम कॉइन्स" : "Sort: Lowest Unlock Coins"}</option>
          </select>
        </div>
      </div>

      {/* Leads Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-slate-200/80 bg-white p-12 text-center space-y-3 shadow-xs">
          <div className="h-14 w-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <BookOpen size={28} />
          </div>
          <p className="text-base font-bold text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
            {lang === "hi" ? "कोई छात्र अनुरोध नहीं मिला" : "No student requirements found"}
          </p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
            {viewTab === "matched"
              ? (lang === "hi" ? `फिलहाल ${teachingRadius} किमी के दायरे में आपके विषयों से मेल खाने वाला कोई नया अनुरोध नहीं है।` : `No student requirements strictly match your subjects within ${teachingRadius} km right now.`)
              : (lang === "hi" ? "अन्य अनुरोध देखने के लिए खोज शब्द, विषय फ़िल्टर, या मोड बदलें।" : "Try adjusting your search keyword, subject filter, or mode toggle to see more inquiries.")}
          </p>
          {viewTab === "matched" && (
            <div className="pt-2 flex flex-wrap justify-center gap-2">
              {hasTutorLocation && nearbyLeads.length > 0 && (
                <button
                  type="button"
                  onClick={() => setViewTab("nearby")}
                  className="px-4 py-2 rounded-xl bg-[#0F2540] text-white font-bold text-xs cursor-pointer"
                >
                  {lang === "hi" ? `${teachingRadius} किमी में सभी ${nearbyLeads.length} देखें` : `View ${nearbyLeads.length} nearby in ${teachingRadius} km`}
                </button>
              )}
              <button
                type="button"
                onClick={() => setViewTab("all")}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-300 cursor-pointer"
              >
                {lang === "hi" ? `पूरे शहर के सभी ${unpurchased.length} अनुरोध देखें` : `Browse all ${unpurchased.length} city leads`}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-5 grid-cols-1 2xl:grid-cols-3">
          {filtered.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              walletBalance={walletBalance}
              subscriptionInfo={subscriptionInfo}
              onUnlock={setUnlockTarget}
            />
          ))}
        </div>
      )}

      {/* Feed-level modal: a refresh / re-filter cannot unmount it and hide the phone. */}
      {unlockTarget && (
        <LeadPurchaseModal
          lead={{
            id: unlockTarget.id,
            subjects: unlockTarget.subjects,
            classLevel: unlockTarget.classLevel,
            mode: unlockTarget.mode,
            city: unlockTarget.city,
            area: unlockTarget.area,
            coinCost: getLeadPointCost(
              unlockTarget.classLevel,
              unlockTarget.budgetMin,
              unlockTarget.budgetMax
            ),
          }}
          walletBalance={walletBalance}
          subscriptionInfo={subscriptionInfo}
          onClose={() => setUnlockTarget(null)}
          onUnlocked={handleUnlockSuccess}
        />
      )}
    </div>
  );
}
