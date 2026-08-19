"use client";

import { useState, useMemo } from "react";
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
  parentDetails?: ParentDetails | null;
};

const MODE_LABELS: Record<string, string> = {
  ONLINE: "Online Only",
  OFFLINE: "Home Tuition (Offline)",
  EITHER: "Home or Online",
};

const MODE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  ONLINE: { bg: "bg-sky-50", text: "text-sky-800", border: "border-sky-200" },
  OFFLINE: { bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200" },
  EITHER: { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200" },
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

function LeadCard({
  lead,
  walletBalance,
  subscriptionInfo,
}: {
  lead: FeedLead;
  walletBalance: number;
  subscriptionInfo?: SubscriptionInfo | null;
}) {
  const [modalOpen, setModalOpen] = useState(false);

  const maxTutorsAllowed = lead.maxTutors || 5;
  const currentPurchases = lead.purchaseCount || 0;
  const spotsLeft = Math.max(0, maxTutorsAllowed - currentPurchases);
  const isAlmostFull = spotsLeft <= 2 && spotsLeft > 0;
  const isFull = spotsLeft === 0;
  const progressPercent = Math.min(100, Math.round((currentPurchases / maxTutorsAllowed) * 100));

  const isFreeWithPlan = Boolean(
    subscriptionInfo?.hasActivePlan && (subscriptionInfo?.quotaRemaining ?? 0) > 0
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
            ? "border-purple-200/90 shadow-2xs hover:border-purple-400"
            : "border-slate-200/90 shadow-2xs hover:border-emerald-400"
        }`}
      >
        <div className="space-y-4">
          {/* Top Row: Class, Board, Mode & Timestamp */}
          <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex flex-wrap items-center gap-1.5">
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
              {isFreeWithPlan && !lead.isPurchased && (
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 text-purple-900 border border-purple-200 px-2.5 py-0.5 text-[11px] font-extrabold shadow-2xs">
                  <Crown size={11} className="text-purple-600" />
                  <span>VIP Plan: Free Unlock</span>
                </span>
              )}
              {lead.isShortlisted && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 text-[11px] font-extrabold shadow-2xs">
                  ★ Shortlisted by Parent
                </span>
              )}
              {lead.isHired && (
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 text-purple-900 border border-purple-300 px-2.5 py-0.5 text-[11px] font-extrabold shadow-2xs">
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

                {lead.parentDetails.notes && (
                  <div className="sm:col-span-2 rounded-xl bg-white p-2.5 border border-emerald-200">
                    <span className="text-[10px] font-bold text-slate-500 block">Notes from Parent</span>
                    <p className="text-[11px] italic text-slate-700 pt-0.5">
                      &quot;{lead.parentDetails.notes}&quot;
                    </p>
                  </div>
                )}
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
                      {lead.budgetMin && lead.budgetMax
                        ? `₹${lead.budgetMin.toLocaleString("en-IN")} – ₹${lead.budgetMax.toLocaleString("en-IN")} / month`
                        : lead.budgetMax
                        ? `Up to ₹${lead.budgetMax.toLocaleString("en-IN")} / month`
                        : `From ₹${lead.budgetMin?.toLocaleString("en-IN")} / month`}
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
                  <div className="flex items-center gap-1.5 text-purple-700 font-bold">
                    <User size={13} className="shrink-0 text-purple-500" />
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

              {lead.notes && (
                <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-3 text-[11px] text-slate-700 italic">
                  &quot;{lead.notes}&quot;
                </div>
              )}
            </div>
          )}
        </div>

        {/* Card Footer: Coin Cost & Unlock Action */}
        <div className="flex items-center justify-between pt-3.5 border-t border-slate-100 mt-2">
          <div className="flex items-center gap-2">
            {isFreeWithPlan ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-purple-50 text-purple-950 border border-purple-200 font-extrabold text-xs shadow-2xs">
                <Crown size={14} className="text-purple-600" />
                <span>0 Coins (VIP)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-amber-50 text-amber-950 border border-amber-200 font-extrabold text-xs shadow-2xs">
                <Coins size={14} className="text-amber-500" />
                <span>{lead.coinCost} Coins</span>
              </span>
            )}

            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
              Exact time: {timeInfo.exactTime}
            </span>
          </div>

          {lead.isPurchased ? (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-2xl border border-emerald-200">
              <CheckCircle2 size={13} />
              <span>Full Contact Unlocked</span>
            </span>
          ) : isFull ? (
            <span className="text-xs font-bold text-slate-400 px-3 py-1.5">
              Closed (Max Capacity)
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className={`inline-flex items-center gap-1.5 px-4.5 py-2.5 rounded-2xl font-extrabold text-xs shadow-md active:scale-95 transition-all cursor-pointer ${
                isFreeWithPlan
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-purple-500/25"
                  : "bg-gradient-to-r from-[#2D9E6B] to-[#1F8255] hover:from-[#238357] hover:to-[#186843] text-white shadow-emerald-500/20"
              }`}
            >
              <Unlock size={13} />
              <span>{isFreeWithPlan ? "Unlock Free (Plan)" : `Unlock Lead (${lead.coinCost} 🪙)`}</span>
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
  tutorSubjects,
  subscriptionInfo,
  claimedBannerInfo,
}: {
  leads: FeedLead[];
  walletBalance: number;
  tutorSubjects: string[];
  subscriptionInfo?: SubscriptionInfo | null;
  claimedBannerInfo?: {
    claimed: boolean;
    locality?: string;
    subjects?: string;
  } | null;
}) {
  const [viewTab, setViewTab] = useState<"available" | "shortlisted" | "unlocked" | "all">("available");
  const [searchQuery, setSearchQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string>("ALL");
  const [modeFilter, setModeFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"recent" | "distance" | "cost" | "budget">("recent");
  const [showClaimedBanner, setShowClaimedBanner] = useState<boolean>(
    Boolean(claimedBannerInfo?.claimed)
  );

  const unpurchased = leads.filter((l) => !l.isPurchased && l.purchaseCount < (l.maxTutors || 5));
  const shortlisted = leads.filter((l) => l.isShortlisted);
  const purchased = leads.filter((l) => l.isPurchased);

  const filtered = useMemo(() => {
    return leads
      .filter((l) => {
        // Tab filtering
        if (viewTab === "available" && (l.isPurchased || l.purchaseCount >= (l.maxTutors || 5))) return false;
        if (viewTab === "shortlisted" && !l.isShortlisted) return false;
        if (viewTab === "unlocked" && !l.isPurchased) return false;

        // Subject filter
        if (subjectFilter !== "ALL" && !l.subjects.includes(subjectFilter)) return false;

        // Mode filter
        if (modeFilter !== "ALL" && l.mode !== modeFilter) return false;

        // Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          const matchSubj = l.subjects.some((s) => s.toLowerCase().includes(q));
          const matchClass = l.classLevel.toLowerCase().includes(q);
          const matchLoc = (l.city && l.city.toLowerCase().includes(q)) || (l.area && l.area.toLowerCase().includes(q));
          if (!matchSubj && !matchClass && !matchLoc) return false;
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
  }, [leads, viewTab, subjectFilter, modeFilter, searchQuery, sortBy]);

  return (
    <div className="space-y-6 text-slate-900">
      {/* Claimed / Fully Booked Alert Banner */}
      {showClaimedBanner && (
        <div className="relative overflow-hidden rounded-3xl border border-amber-200 bg-amber-50 p-5 sm:p-6 shadow-xs animate-in fade-in duration-300">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white font-black text-xl shadow-xs">
                🔒
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-bold text-amber-950">
                    Tuition Requirement Fully Booked &amp; Closed
                  </h2>
                  <span className="rounded-full bg-amber-200 px-2.5 py-0.5 text-[11px] font-bold text-amber-900 border border-amber-300">
                    Tutors Assigned
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-medium text-amber-900 leading-relaxed">
                  {claimedBannerInfo?.locality
                    ? `The ${claimedBannerInfo.subjects ? `${claimedBannerInfo.subjects} ` : ""}student requirement near ${claimedBannerInfo.locality} has reached maximum tutor applications.`
                    : "This tuition requirement has already reached maximum capacity and is closed to new unlocks."}
                </p>
                <p className="text-xs font-bold text-amber-800 pt-1">
                  💡 <span className="underline">Tip:</span> Turn on push notifications so you can unlock fresh enquiries in your area within seconds of posting!
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowClaimedBanner(false)}
              className="rounded-xl p-1.5 text-amber-700 hover:bg-amber-200 transition-colors cursor-pointer shrink-0"
              title="Dismiss alert"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Push Notification Setup Banner */}
      <LeadNotifReminderBanner />

      {/* Page Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
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
            Matched with your subjects, teaching mode, and locality radius. Max 5 tutors per lead.
          </p>
        </div>

        {/* Action / Badges Bar */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {/* Subscription Status Card */}
          {subscriptionInfo?.hasActivePlan ? (
            <div className="flex items-center gap-3 bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 border border-purple-200 rounded-2xl px-4 py-2.5 shadow-2xs">
              <div className="h-9 w-9 rounded-xl bg-purple-500 text-white flex items-center justify-center font-extrabold shadow-xs">
                <Crown size={18} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-extrabold text-purple-950">
                    {subscriptionInfo.planName}
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-purple-200 text-purple-900">
                    VIP
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-purple-800 block">
                  <strong>{subscriptionInfo.quotaRemaining}</strong> of {subscriptionInfo.monthlyQuota} Free Leads Left
                </span>
              </div>
              <Link
                href="/tutor/plans"
                className="ml-1 text-[11px] font-extrabold text-purple-700 hover:text-purple-900 underline"
              >
                Plans →
              </Link>
            </div>
          ) : (
            <Link
              href="/tutor/plans"
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold text-xs shadow-md shadow-purple-500/20 transition-all active:scale-95"
            >
              <Crown size={14} />
              <span>Get VIP Membership</span>
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
          <button
            type="button"
            onClick={() => setViewTab("available")}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              viewTab === "available"
                ? "bg-[#2D9E6B] text-white shadow-md shadow-emerald-500/20"
                : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            🟢 Available Leads ({unpurchased.length})
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

          <button
            type="button"
            onClick={() => setViewTab("all")}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              viewTab === "all"
                ? "bg-slate-800 text-white shadow-md"
                : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            All ({leads.length})
          </button>
        </nav>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3.5">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3.5 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by subject, class, or locality..."
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
          <div className="flex items-center rounded-2xl bg-slate-50 p-1 border border-slate-200">
            {(["ALL", "ONLINE", "OFFLINE", "EITHER"] as const).map((m) => (
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
                {m === "ALL" ? "All Modes" : m === "OFFLINE" ? "Offline" : m === "ONLINE" ? "Online" : "Either"}
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
        <div className="rounded-3xl border border-slate-200/80 bg-white p-16 text-center space-y-3 shadow-xs">
          <div className="h-14 w-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <BookOpen size={28} />
          </div>
          <p className="text-base font-bold text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
            No student requirements found
          </p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
            Try adjusting your search keyword, subject filter, or mode toggle to see more inquiries.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              walletBalance={walletBalance}
              subscriptionInfo={subscriptionInfo}
            />
          ))}
        </div>
      )}
    </div>
  );
}
