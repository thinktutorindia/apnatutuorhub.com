"use client";

import { useState, useMemo, useEffect } from "react";
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
  Users,
  Compass,
  Calendar,
  Languages,
  UserCheck,
  Zap,
  Crown,
  Star,
} from "lucide-react";
import { LeadPurchaseModal, type SubscriptionInfo } from "@/components/tutor/LeadPurchaseModal";
import { StartChatButton } from "@/components/chat/StartChatButton";
import { LeadNotifReminderBanner } from "@/components/tutor/LeadNotifReminderBanner";
import { UserSubjectChips } from "@/components/admin/UserSubjectChips";
import { getInquiryDisplayCode, formatLeadBudget } from "@/lib/lead-utils";
import { getLeadPointCost } from "@/lib/subscription-plans";
import { RequestLeadRefundButton } from "@/components/tutor/RequestLeadRefundButton";
import { getWhatsAppSupportLink, SUPPORT_PHONE_DISPLAY } from "@/lib/support";
import type { DummyClaimedLeadInfo } from "@/lib/dummy-campaign-types";
import { hasSubjectOverlap, isLeadMatchedToTutor } from "@/lib/feed-matching";
import { sanitizeLeadNotes } from "@/lib/lead-sanitizer";

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

function formatPostTime(dateStr: string) {
  const d = new Date(dateStr);
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
      ? `₹${info.budgetMin.toLocaleString("en-IN")}–₹${info.budgetMax.toLocaleString("en-IN")}${
          info.rateType === "MONTHLY" ? "/mo" : "/hr"
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
  autoOpenModal = false,
}: {
  lead: FeedLead;
  walletBalance: number;
  subscriptionInfo?: SubscriptionInfo | null;
  autoOpenModal?: boolean;
}) {
  const [modalOpen, setModalOpen] = useState(autoOpenModal);

  const maxTutorsAllowed = lead.maxTutors || 5;
  const currentPurchases = lead.purchaseCount || 0;
  const spotsLeft = Math.max(0, maxTutorsAllowed - currentPurchases);
  const isAlmostFull = spotsLeft <= 2 && spotsLeft > 0;
  const isFull = spotsLeft === 0;
  const progressPercent = Math.min(100, Math.round((currentPurchases / maxTutorsAllowed) * 100));

  const planPointCost = getLeadPointCost(lead.classLevel, lead.budgetMin, lead.budgetMax);
  const remainingPoints =
    subscriptionInfo?.remainingPoints ??
    (subscriptionInfo?.quotaRemaining ?? 0) * 10;
  const isFreeWithPlan = Boolean(
    subscriptionInfo?.hasActivePlan && remainingPoints >= planPointCost
  );

  const timeInfo = formatPostTime(lead.createdAt);

  const phoneClean = lead.parentDetails?.phone
    ? lead.parentDetails.phone.replace(/[^0-9]/g, "")
    : "";

  const modeStyle = MODE_STYLES[lead.mode] || MODE_STYLES.EITHER;

  return (
    <>
      <div
        className={`group relative rounded-3xl bg-white border transition-all duration-300 flex flex-col justify-between p-5 sm:p-6 space-y-4 hover:-translate-y-1 hover:shadow-xl ${
          lead.isPurchased
            ? "border-emerald-300 ring-2 ring-emerald-500/10 shadow-sm"
            : lead.isShortlisted
            ? "border-amber-300 ring-2 ring-amber-500/10 shadow-sm"
            : isFreeWithPlan
            ? "border-amber-200 shadow-2xs hover:border-amber-400"
            : "border-slate-200/90 shadow-2xs hover:border-emerald-400"
        }`}
      >
        <div className="space-y-4">
          {/* Top Row: Class, Board, Mode & Timestamp */}
          <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono font-extrabold text-[11px] text-[#0F2540] bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                #{getInquiryDisplayCode(lead)}
              </span>

              <span className="px-2.5 py-1 rounded-xl text-xs font-extrabold bg-[#0F2540] text-white shadow-2xs">
                {lead.classLevel}
              </span>

              {lead.board && (
                <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  {lead.board}
                </span>
              )}

              <span
                className={`px-2.5 py-0.5 rounded-xl text-[11px] font-bold border ${modeStyle.bg} ${modeStyle.text} ${modeStyle.border}`}
              >
                {MODE_LABELS[lead.mode] ?? lead.mode}
              </span>
            </div>

            {/* Time Posted Badge */}
            <div
              className="flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200 shrink-0"
              title={`Posted on ${timeInfo.exactDate} at ${timeInfo.exactTime}`}
            >
              {timeInfo.isFresh ? (
                <span className="flex items-center gap-1 text-emerald-700 font-extrabold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                  <Clock size={11} className="text-[#2D9E6B]" />
                  <span>{timeInfo.relative}</span>
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Clock size={11} className="text-slate-400" />
                  <span>{timeInfo.relative}</span>
                </span>
              )}
            </div>
          </div>

          {/* Status Badges & Priority */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Competition & Exclusivity Tag */}
              {maxTutorsAllowed === 1 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF3DC] text-[#92400E] border border-[#F5A623]/40 px-2.5 py-0.5 text-[11px] font-800">
                  <Crown size={11} className="text-[#F5A623]" />
                  <span>👑 100% Solo Exclusive</span>
                </span>
              ) : maxTutorsAllowed === 2 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-950 border border-amber-300 px-2.5 py-0.5 text-[11px] font-black shadow-2xs">
                  <Lock size={11} className="text-amber-600" />
                  <span>🔒 Semi-Exclusive (Max 2)</span>
                </span>
              ) : maxTutorsAllowed === 3 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-900 border border-blue-200 px-2.5 py-0.5 text-[11px] font-bold shadow-2xs">
                  <UserCheck size={11} className="text-blue-600" />
                  <span>👥 Low Competition (Max 3)</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-0.5 text-[11px] font-medium shadow-2xs">
                  <Users size={11} className="text-slate-500" />
                  <span>👥 Shared (Max 5)</span>
                </span>
              )}

              {timeInfo.isFresh && (
                <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-800">
                  FRESH
                </span>
              )}
              {isFreeWithPlan && !lead.isPurchased && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 px-2.5 py-0.5 text-[11px] font-bold">
                  <Zap size={11} className="text-emerald-600" />
                  <span>₹999 Plan: Free Unlock</span>
                </span>
              )}
              {lead.isShortlisted && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 text-[11px] font-extrabold shadow-2xs">
                  ★ Shortlisted by Parent
                </span>
              )}
              {lead.isHired && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF3DC] text-[#92400E] border border-[#F5A623]/40 px-2.5 py-0.5 text-[11px] font-800">
                  🏆 Hired
                </span>
              )}
              {lead.isPurchased && !lead.isShortlisted && !lead.isHired && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 px-2.5 py-0.5 text-[11px] font-extrabold shadow-2xs">
                  <CheckCircle2 size={12} className="text-emerald-700" />
                  Unlocked Lead
                </span>
              )}
            </div>

            {lead.distanceKm !== null && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
                <Compass size={11} /> {lead.distanceKm.toFixed(1)} km away
              </span>
            )}
          </div>

          {/* Slots Availability Tracker & Progress Bar */}
          {!lead.isPurchased && (
            <div className="rounded-2xl bg-gradient-to-r from-slate-50 via-slate-50/80 to-slate-50 border border-slate-200/90 p-3 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-bold">
                  {isFull ? (
                    <span className="text-slate-600 font-extrabold flex items-center gap-1">
                      🔒 All {maxTutorsAllowed} tutor slots filled
                    </span>
                  ) : isAlmostFull ? (
                    <span className="text-rose-700 font-extrabold flex items-center gap-1 animate-pulse">
                      <Flame size={14} className="text-rose-600 shrink-0" />
                      🔥 Only {spotsLeft} of {maxTutorsAllowed} tutor slots left!
                    </span>
                  ) : (
                    <span className="text-[#0F2540] font-bold flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#2D9E6B] shadow-xs" />
                      <span>
                        <strong className="text-emerald-700 font-extrabold">{spotsLeft} of {maxTutorsAllowed}</strong> tutor slots available
                      </span>
                    </span>
                  )}
                </div>

                <span className="text-[11px] font-bold text-slate-500 font-mono bg-white px-2 py-0.5 rounded-md border border-slate-200">
                  {currentPurchases}/{maxTutorsAllowed} unlocked
                </span>
              </div>

              {/* Progress Track */}
              <div className="h-2 w-full bg-slate-200/90 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isFull
                      ? "bg-slate-400"
                      : isAlmostFull
                      ? "bg-gradient-to-r from-amber-500 to-rose-500"
                      : "bg-gradient-to-r from-emerald-500 to-[#2D9E6B]"
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Subjects Section */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Required Subjects
            </span>
            <UserSubjectChips subjects={lead.subjects} maxVisible={3} />
          </div>

          {/* Shortlisted Banner */}
          {lead.isShortlisted && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-3.5 text-xs font-semibold text-amber-950 flex items-start gap-2.5 shadow-2xs">
              <span className="text-base shrink-0">⭐</span>
              <div>
                <p className="font-extrabold text-amber-900">You are Shortlisted!</p>
                <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                  The parent reviewed your profile and expressed interest. Reach out via Call or WhatsApp right away.
                </p>
              </div>
            </div>
          )}

          {/* Unlocked Parent Contact Box */}
          {lead.isPurchased && lead.parentDetails ? (
            <div className="space-y-3 rounded-2xl border border-emerald-300 bg-emerald-50/60 p-4 text-xs shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200/80 pb-2.5">
                <div>
                  <span className="text-[10px] font-bold uppercase text-emerald-800 tracking-wider block">
                    Parent Contact Info
                  </span>
                  <p className="text-sm font-extrabold text-[#0F2540]">
                    {lead.parentDetails.name || "Verified Parent"}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {lead.parentProfileId && (
                    <StartChatButton
                      targetProfileId={lead.parentProfileId}
                      leadId={lead.id}
                      role="TUTOR"
                      buttonText="💬 Chat"
                    />
                  )}
                  {lead.parentDetails.phone && (
                    <>
                      <a
                        href={`tel:${lead.parentDetails.phone}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-2xs transition-colors"
                      >
                        <Phone size={11} />
                        <span>Call</span>
                      </a>
                      <a
                        href={`https://wa.me/91${phoneClean}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold text-xs shadow-2xs transition-colors"
                      >
                        <MessageCircle size={11} />
                        <span>WhatsApp</span>
                      </a>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 block">Phone</span>
                  <p className="font-bold text-[#0F2540] font-mono">
                    {lead.parentDetails.phone || "—"}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-500 block">Email</span>
                  <p className="font-bold text-[#0F2540] truncate">
                    {lead.parentDetails.email || "—"}
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <span className="text-[10px] font-bold text-slate-500 block">Address & Locality</span>
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
                      <span className="text-[10px] font-bold text-slate-500 block">Notes from Parent</span>
                      <p className="text-[11px] italic text-slate-700 pt-0.5">
                        &quot;{cleanParentNotes}&quot;
                      </p>
                    </div>
                  );
                })()}
              </div>
            </div>
          ) : (
            /* Requirement Details Grid */
            <div className="space-y-2.5 pt-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-slate-600 font-medium">
                {(lead.area || lead.city) && (
                  <div className="flex items-center gap-1.5 text-slate-800">
                    <MapPin size={13} className="text-[#2D9E6B] shrink-0" />
                    <span className="truncate font-semibold">
                      {[lead.area, lead.city].filter(Boolean).join(", ")}
                    </span>
                  </div>
                )}

                {(lead.budgetMin || lead.budgetMax) && (
                  <div className="flex items-center gap-1.5 text-[#0F2540] font-bold">
                    <IndianRupee size={13} className="text-[#2D9E6B] shrink-0" />
                    <span className="truncate">
                      {formatLeadBudget(lead, "full")}
                    </span>
                  </div>
                )}

                {lead.timingPreference && (
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Clock size={13} className="text-slate-400 shrink-0" />
                    <span className="truncate">{lead.timingPreference}</span>
                  </div>
                )}

                {lead.tutorGenderPref && lead.tutorGenderPref !== "ANY" && (
                  <div className="flex items-center gap-1.5 text-[#0F2540] font-bold">
                    <User size={13} className="shrink-0 text-[#2D9E6B]" />
                    <span>{lead.tutorGenderPref === "FEMALE" ? "Female Tutor Required" : "Male Tutor Required"}</span>
                  </div>
                )}

                {lead.languagePref && (
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Languages size={13} className="text-slate-400 shrink-0" />
                    <span>{lead.languagePref}</span>
                  </div>
                )}
              </div>

              {(() => {
                const cleanNotes = sanitizeLeadNotes(lead.notes, lead.isPurchased);
                if (!cleanNotes) return null;
                return (
                  <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-3 text-[11px] text-slate-700 italic">
                    &quot;{cleanNotes}&quot;
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Card Footer: Coin Cost & Unlock Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3.5 border-t border-slate-100 mt-2 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {isFreeWithPlan ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold text-xs">
                <Zap size={13} className="text-emerald-600" />
                <span>Included in ₹999 Plan</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs shadow-2xs">
                <Coins size={13} className="text-slate-500" />
                <span>{lead.coinCost} Coins to Unlock</span>
              </span>
            )}

            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
              Exact time: {timeInfo.exactTime}
            </span>
          </div>

          {lead.isPurchased ? (
            <div className="flex flex-col items-end gap-1">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-2xl border border-emerald-200">
                <CheckCircle2 size={13} />
                <span>Full Contact Unlocked</span>
              </span>
              {lead.purchaseId && (
                <RequestLeadRefundButton
                  purchaseId={lead.purchaseId}
                  purchasedAt={lead.purchasedAt}
                />
              )}
            </div>
          ) : isFull ? (
            <span className="text-xs font-bold text-slate-400 px-3 py-1.5">
              Closed (Max Capacity)
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl font-extrabold text-xs shadow-md active:scale-95 transition-all cursor-pointer text-center whitespace-normal ${
                isFreeWithPlan
                  ? "bg-emerald-700 hover:bg-emerald-800 text-white shadow-emerald-700/20"
                  : "bg-gradient-to-r from-[#2D9E6B] to-[#1F8255] hover:from-[#238357] hover:to-[#186843] text-white shadow-emerald-500/20"
              }`}
            >
              <Unlock size={13} className="shrink-0" />
              {isFreeWithPlan ? (
                <span>Unlock via ₹999 Plan (Free)</span>
              ) : (
                <>
                  <span className="sm:hidden">Unlock ({lead.coinCost} Coins)</span>
                  <span className="hidden sm:inline">Unlock Parent Contact ({lead.coinCost} Coins)</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {modalOpen && (
        <LeadPurchaseModal
          lead={{
            id: lead.id,
            subjects: lead.subjects,
            classLevel: lead.classLevel,
            mode: lead.mode,
            city: lead.city,
            area: lead.area,
            coinCost: lead.coinCost,
          }}
          walletBalance={walletBalance}
          subscriptionInfo={subscriptionInfo}
          onClose={() => setModalOpen(false)}
        />
      )}
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
}) {
  const hasTutorLocation = Boolean(tutorLocation?.lat && tutorLocation?.lon);
  const hasTutorSubjects = Boolean(tutorSubjects && tutorSubjects.length > 0);
  const hasFilterConfig = hasTutorLocation || hasTutorSubjects;

  const router = useRouter();

  // Refresh server data when user returns to this tab — zero cost while active.
  // This keeps slot counts current without any polling overhead.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [router]);

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

  const unpurchased = useMemo(
    () => leads.filter((l) => !l.isPurchased && l.purchaseCount < (l.maxTutors || 5)),
    [leads]
  );
  const shortlisted = useMemo(() => leads.filter((l) => l.isShortlisted), [leads]);
  const purchased = useMemo(() => leads.filter((l) => l.isPurchased), [leads]);

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
      return l.distanceKm !== null && l.distanceKm <= (teachingRadius || 10);
    });
  }, [unpurchased, hasTutorLocation, teachingRadius]);

  const filtered = useMemo(() => {
    return leads
      .filter((l) => {
        // Tab filtering
        if (viewTab === "matched") {
          if (l.isPurchased || l.purchaseCount >= (l.maxTutors || 5)) return false;
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
          if (l.isPurchased || l.purchaseCount >= (l.maxTutors || 5)) return false;
          if (hasTutorLocation && l.mode !== "ONLINE") {
            if (l.distanceKm === null || l.distanceKm > (teachingRadius || 10)) return false;
          }
        } else if (viewTab === "shortlisted") {
          if (!l.isShortlisted) return false;
        } else if (viewTab === "unlocked") {
          if (!l.isPurchased) return false;
        } else if (viewTab === "all") {
          if (l.isPurchased || l.purchaseCount >= (l.maxTutors || 5)) return false;
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
      {/* Claimed / Fully Booked Alert Banner */}
      {showClaimedBanner && claimedBannerInfo && (
        <DummyClaimedLeadCard info={claimedBannerInfo} onDismiss={() => setShowClaimedBanner(false)} />
      )}

      {/* Push Notification Setup Banner */}
      <LeadNotifReminderBanner />

      {/* ₹999 Growth Plan Upsell Banner — shown when tutor has no active plan */}
      {!subscriptionInfo?.hasActivePlan && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-800 via-emerald-700 to-[#0f5c30] p-5 sm:p-6 text-white shadow-lg border border-emerald-600/40">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/15 text-white border border-white/20 text-xs font-bold">
                <Zap size={13} />
                <span>₹999 / month &nbsp;•&nbsp; 0% Commission &nbsp;•&nbsp; Max 3 tutors per lead</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                Get the ₹999 Growth Plan — Unlock Verified Student Leads
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed">
                Get 2–6 verified student inquiries near your area. You keep 100% of the tuition fee — zero commission, ever.
                Low competition: each lead shared with max 3 tutors only.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 shrink-0">
              <Link
                href="/tutor/plans"
                className="inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl bg-white text-emerald-800 font-extrabold text-sm shadow-md transition-all active:scale-95 hover:bg-emerald-50"
              >
                <Zap size={15} />
                <span>Activate ₹999 Plan</span>
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

      {/* Page Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 ath-panel">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#2D9E6B]">
              Student Enquiries
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="text-xs text-slate-500 font-semibold">Live Feed</span>
          </div>
          <h1
            className="text-xl sm:text-2xl font-bold text-[#0F2540]"
            style={{ fontFamily: "Poppins, sans-serif" }}
          >
            Find Student Requirements
          </h1>
          <p className="text-xs text-slate-600 font-medium">
            Matched with your subjects, teaching mode, and locality radius. ₹999 Growth Plan: Max 3 tutors per lead &amp; 0% commission.
          </p>
        </div>

        {/* Action / Badges Bar */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {/* Subscription Status Card */}
          {subscriptionInfo?.hasActivePlan ? (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-300 rounded-2xl px-4 py-2.5">
              <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                <Zap size={18} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-emerald-900">
                    ₹999 Growth Plan Active
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-700 text-white">
                    0% Commission
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-emerald-800 block">
                  <strong>{subscriptionInfo.quotaRemaining}</strong> leads remaining this month
                </span>
              </div>
              <Link
                href="/tutor/plans"
                className="ml-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 underline"
              >
                Details →
              </Link>
            </div>
          ) : (
            <Link
              href="/tutor/plans"
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md"
            >
              <Zap size={14} />
              <span>Get ₹999 Growth Plan</span>
            </Link>
          )}

          {/* Coin Balance Quick Card */}
          <div className="flex items-center gap-3 bg-amber-50/80 border border-amber-200/90 rounded-2xl px-4 py-2.5 shadow-2xs">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-amber-400/20 text-amber-700 flex items-center justify-center font-extrabold">
                <Coins size={18} />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-800 block">Coin Balance</span>
                <span className="text-sm font-extrabold text-amber-950 font-mono">
                  {walletBalance} Coins
                </span>
              </div>
            </div>

            <Link
              href="/tutor/wallet"
              className="ml-2 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-xs transition-colors"
            >
              Top Up +
            </Link>
          </div>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Lead Feed Tabs" className="flex flex-wrap gap-2">
          {hasFilterConfig && (
            <button
              type="button"
              onClick={() => setViewTab("matched")}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                viewTab === "matched"
                  ? "bg-[#2D9E6B] text-white shadow-md shadow-emerald-500/20"
                  : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
              }`}
            >
              🎯 Matched for Me ({matchedLeads.length})
            </button>
          )}

          {hasTutorLocation && (
            <button
              type="button"
              onClick={() => setViewTab("nearby")}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                viewTab === "nearby"
                  ? "bg-[#0F2540] text-white shadow-md shadow-slate-900/20"
                  : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
              }`}
            >
              📍 Within {teachingRadius || 10} km ({nearbyLeads.length})
            </button>
          )}

          <button
            type="button"
            onClick={() => setViewTab("all")}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              viewTab === "all"
                ? "bg-slate-800 text-white shadow-md"
                : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            🌐 All City Leads ({unpurchased.length})
          </button>

          <button
            type="button"
            onClick={() => setViewTab("shortlisted")}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              viewTab === "shortlisted"
                ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            ★ Shortlisted ({shortlisted.length})
          </button>

          <button
            type="button"
            onClick={() => setViewTab("unlocked")}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              viewTab === "unlocked"
                ? "bg-[#0F2540] text-white shadow-md shadow-slate-900/20"
                : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            ✓ Unlocked Leads ({purchased.length})
          </button>
        </nav>
      </div>

      {/* Informative Context Banners */}
      {viewTab === "matched" && hasFilterConfig && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs font-medium">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white font-black text-sm">
              🎯
            </span>
            <div>
              <span className="font-bold text-emerald-900">
                Auto-filtered for your profile:
              </span>{" "}
              Showing {filtered.length} leads within {teachingRadius || 10} km
              {tutorLocation?.city ? ` of ${tutorLocation.city}` : ""} matching your teaching subjects &amp; grades.
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {hasTutorLocation && (
              <button
                type="button"
                onClick={() => setViewTab("nearby")}
                className="px-2.5 py-1 rounded-xl bg-white border border-emerald-300 text-emerald-800 font-bold hover:bg-emerald-100 transition-colors text-[11px] cursor-pointer"
              >
                View all {nearbyLeads.length} within {teachingRadius || 10} km
              </button>
            )}
            <button
              type="button"
              onClick={() => setViewTab("all")}
              className="px-2.5 py-1 rounded-xl bg-emerald-700 text-white font-bold hover:bg-emerald-800 transition-colors text-[11px] cursor-pointer"
            >
              Browse all {unpurchased.length} city leads
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
                Neighborhood View:
              </span>{" "}
              Showing all {filtered.length} student leads within {teachingRadius || 10} km radius
              {tutorLocation?.address ? ` (${tutorLocation.address})` : ""} across all subjects.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setViewTab("matched")}
            className="px-2.5 py-1 rounded-xl bg-sky-700 text-white font-bold hover:bg-sky-800 transition-colors text-[11px] cursor-pointer shrink-0"
          >
            ← Back to Matched ({matchedLeads.length})
          </button>
        </div>
      )}

      {!hasTutorLocation && (
        <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs font-medium">
          <div className="flex items-center gap-2.5">
            <MapPin size={18} className="text-amber-600 shrink-0" />
            <span>
              <strong>Location not configured:</strong> Set your teaching locality and radius in your profile to auto-filter leads near you.
            </span>
          </div>
          <Link
            href="/tutor/profile"
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shrink-0 transition-colors"
          >
            Set Location →
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
              placeholder="Search by enquiry # (e.g. 32042), subject, class, locality..."
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
              <option value="ALL">All Subjects</option>
              {tutorSubjects.map((s) => (
                <option key={s} value={s}>{s}</option>
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
                className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                  modeFilter === m
                    ? "bg-[#0F2540] text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {m === "ALL" ? "All Modes" : m === "OFFLINE" ? "Offline" : m === "ONLINE" ? "Online" : m === "COACHING" ? "Coaching" : "Either"}
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
            <option value="recent">Sort: Newest First</option>
            <option value="distance">Sort: Closest First</option>
            <option value="budget">Sort: Highest Budget</option>
            <option value="cost">Sort: Lowest Unlock Coins</option>
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
            No student requirements found
          </p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
            {viewTab === "matched"
              ? `No student requirements strictly match your subjects within ${teachingRadius || 10} km right now.`
              : "Try adjusting your search keyword, subject filter, or mode toggle to see more inquiries."}
          </p>
          {viewTab === "matched" && (
            <div className="pt-2 flex flex-wrap justify-center gap-2">
              {hasTutorLocation && nearbyLeads.length > 0 && (
                <button
                  type="button"
                  onClick={() => setViewTab("nearby")}
                  className="px-4 py-2 rounded-xl bg-[#0F2540] text-white font-bold text-xs cursor-pointer"
                >
                  View {nearbyLeads.length} nearby in {teachingRadius || 10} km
                </button>
              )}
              <button
                type="button"
                onClick={() => setViewTab("all")}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-300 cursor-pointer"
              >
                Browse all {unpurchased.length} city leads
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              walletBalance={walletBalance}
              subscriptionInfo={subscriptionInfo}
              autoOpenModal={Boolean(initialInquiryNumber && lead.inquiryNumber === initialInquiryNumber)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
