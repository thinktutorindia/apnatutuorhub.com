"use client";

import { useState } from "react";
import { BookOpen, Clock, Filter, IndianRupee, MapPin, Sliders, X } from "lucide-react";
import { LeadPurchaseModal } from "@/components/tutor/LeadPurchaseModal";
import { StartChatButton } from "@/components/chat/StartChatButton";
import { LeadNotifReminderBanner } from "@/components/tutor/LeadNotifReminderBanner";

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
  coinCost: number;
  purchaseCount: number;
  maxTutors: number;
  distanceKm: number | null;
  createdAt: string;
  timingPreference: string | null;
  isPurchased: boolean;
  isShortlisted?: boolean;
  isRejected?: boolean;
  isHired?: boolean;
  status: string;
  parentDetails?: ParentDetails | null;
};

const MODE_LABELS: Record<string, string> = {
  ONLINE: "Online",
  OFFLINE: "Offline",
  EITHER: "Either",
};

const MODE_BG: Record<string, string> = {
  ONLINE: "#E0F2FE",
  OFFLINE: "#DCFCE7",
  EITHER: "#FEF3C7",
};

function LeadCard({
  lead,
  walletBalance,
}: {
  lead: FeedLead;
  walletBalance: number;
}) {
  const [modalOpen, setModalOpen] = useState(false);

  const spotsLeft = lead.maxTutors - lead.purchaseCount;
  const isAlmostFull = spotsLeft <= 2;

  const phoneClean = lead.parentDetails?.phone
    ? lead.parentDetails.phone.replace(/[^0-9]/g, "")
    : "";

  return (
    <>
      <div className="neu-card flex flex-col gap-4 bg-white p-5 transition-all">
        {/* Top row */}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="neu-badge text-[11px]"
              style={{ backgroundColor: "#E0F2FE" }}
            >
              {lead.classLevel}
            </span>
            <span
              className="neu-badge text-[11px]"
              style={{ backgroundColor: MODE_BG[lead.mode] ?? "#F3E8FF" }}
            >
              {MODE_LABELS[lead.mode] ?? lead.mode}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {lead.isShortlisted && (
              <span className="neu-badge bg-[#FEF3C7] text-[11px] font-black text-[#B45309]">
                ★ Shortlisted
              </span>
            )}
            {lead.isHired && (
              <span className="neu-badge bg-[#F3E8FF] text-[11px] font-black text-[#7E22CE]">
                🏆 Hired
              </span>
            )}
            {lead.isRejected && (
              <span className="neu-badge bg-[#FCE7F3] text-[11px] text-[#EC4899]">
                ✗ Declined
              </span>
            )}
            {lead.isPurchased && !lead.isShortlisted && !lead.isHired && !lead.isRejected && (
              <span className="neu-badge bg-[#DCFCE7] text-[11px] font-black text-[#15803D]">
                ✓ Unlocked
              </span>
            )}
            {!lead.isPurchased && isAlmostFull && (
              <span className="neu-badge bg-[#FCE7F3] text-[11px] text-[#EC4899]">
                🔥 {spotsLeft} spot{spotsLeft !== 1 ? "s" : ""} left
              </span>
            )}
          </div>
        </div>

        {/* Subjects */}
        <div className="flex flex-wrap gap-1.5">
          {lead.subjects.map((s) => (
            <span
              key={s}
              className="rounded-full border-[2px] border-[#0F172A] bg-[#DCFCE7] px-2.5 py-0.5 text-[11px] font-extrabold"
            >
              {s}
            </span>
          ))}
        </div>

        {/* Shortlisted Banner */}
        {lead.isShortlisted && (
          <div className="rounded-xl border-2 border-[#0F172A] bg-[#FEF3C7] p-3 text-xs font-black text-[#78350F] shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] flex items-center gap-2">
            <span className="text-lg">⭐</span>
            <div>
              <p className="font-extrabold">You are Shortlisted!</p>
              <p className="text-[11px] font-semibold text-[#92400E]">
                The parent has selected your profile. Reach out via Call or WhatsApp to discuss class details.
              </p>
            </div>
          </div>
        )}

        {/* Unlocked Parent Contact Box */}
        {lead.isPurchased && lead.parentDetails ? (
          <div className="space-y-3 rounded-2xl border-2 border-[#0F172A] bg-[#F0FDF4] p-4 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-green-200 pb-2">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400">
                  Parent Contact
                </p>
                <p className="text-sm font-black text-[#0F172A]">
                  {lead.parentDetails.name}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {lead.parentProfileId && (
                  <StartChatButton
                    targetProfileId={lead.parentProfileId}
                    leadId={lead.id}
                    role="TUTOR"
                    buttonText="💬 Chat with Parent"
                  />
                )}
                {lead.parentDetails.phone && (
                  <>
                    <a
                      href={`tel:${lead.parentDetails.phone}`}
                      className="neu-btn neu-btn-primary px-3 py-1 text-xs"
                    >
                      📞 Call
                    </a>
                    <a
                      href={`https://wa.me/91${phoneClean}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="neu-btn bg-[#25D366] text-xs text-white"
                    >
                      💬 WhatsApp
                    </a>
                  </>
                )}
              </div>
            </div>

            <div className="grid gap-2 text-xs font-semibold text-slate-700 sm:grid-cols-2">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-slate-400">
                  Phone / Contact
                </span>
                <p className="font-extrabold text-[#0F172A]">
                  {lead.parentDetails.phone || lead.parentDetails.email || "N/A"}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-extrabold uppercase text-slate-400">
                  Email
                </span>
                <p className="font-extrabold text-[#0F172A]">
                  {lead.parentDetails.email || "N/A"}
                </p>
              </div>

              <div className="sm:col-span-2">
                <span className="text-[10px] font-extrabold uppercase text-slate-400">
                  Full Location & Address
                </span>
                <p className="font-bold text-slate-800">
                  {[
                    lead.parentDetails.address,
                    lead.area,
                    lead.city,
                    lead.parentDetails.pincode,
                    lead.parentDetails.state,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </div>

              {lead.parentDetails.studentName && (
                <div>
                  <span className="text-[10px] font-extrabold uppercase text-slate-400">
                    Student
                  </span>
                  <p className="font-bold text-slate-800">
                    {lead.parentDetails.studentName} ({lead.classLevel})
                  </p>
                </div>
              )}

              {lead.parentDetails.tutorGenderPref && (
                <div>
                  <span className="text-[10px] font-extrabold uppercase text-slate-400">
                    Gender Preference
                  </span>
                  <p className="font-bold text-slate-800">
                    {lead.parentDetails.tutorGenderPref}
                  </p>
                </div>
              )}

              {lead.parentDetails.notes && (
                <div className="rounded-xl border border-slate-200 bg-white/90 p-2.5 sm:col-span-2">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400">
                    Parent Requirement Notes
                  </span>
                  <p className="text-xs italic text-slate-700">
                    &quot;{lead.parentDetails.notes}&quot;
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Masked Details for Unlocked Leads */
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 text-xs font-semibold text-slate-600">
            {(lead.area || lead.city) && (
              <span className="flex items-center gap-1">
                <MapPin size={12} className="text-slate-400" />
                {[lead.area, lead.city].filter(Boolean).join(", ")}
              </span>
            )}
            {lead.distanceKm !== null && (
              <span className="flex items-center gap-1">
                📍 {lead.distanceKm.toFixed(1)} km away
              </span>
            )}
            {(lead.budgetMin || lead.budgetMax) && (
              <span className="flex items-center gap-1">
                <IndianRupee size={12} className="text-slate-400" />
                {lead.budgetMin && lead.budgetMax
                  ? `₹${lead.budgetMin}–₹${lead.budgetMax}/hr`
                  : lead.budgetMax
                    ? `up to ₹${lead.budgetMax}/hr`
                    : `from ₹${lead.budgetMin}/hr`}
              </span>
            )}
            {lead.timingPreference && (
              <span className="flex items-center gap-1">
                <Clock size={12} className="text-slate-400" />
                {lead.timingPreference}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t-2 border-[#E2E8F0] pt-3">
          <div className="flex items-center gap-2">
            <span className="rounded-full border-2 border-[#0F172A] bg-[#FEF3C7] px-3 py-1 text-sm font-black">
              🪙 {lead.coinCost}
            </span>
            <span className="text-[11px] text-slate-400">
              {new Date(lead.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
              })}
            </span>
          </div>

          {lead.isPurchased ? (
            <span className="text-xs font-black text-[#15803D]">
              Full Contact Unlocked ✓
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="neu-btn neu-btn-primary px-4 py-2 text-xs"
            >
              Unlock Lead 🔓
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
  claimedBannerInfo,
}: {
  leads: FeedLead[];
  walletBalance: number;
  tutorSubjects: string[];
  claimedBannerInfo?: {
    claimed: boolean;
    locality?: string;
    subjects?: string;
  } | null;
}) {
  const [viewTab, setViewTab] = useState<"available" | "shortlisted" | "unlocked" | "all">("available");
  const [subjectFilter, setSubjectFilter] = useState<string>("ALL");
  const [modeFilter, setModeFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"recent" | "distance" | "cost">("recent");
  const [showClaimedBanner, setShowClaimedBanner] = useState<boolean>(
    Boolean(claimedBannerInfo?.claimed)
  );

  const unpurchased = leads.filter((l) => !l.isPurchased);
  const shortlisted = leads.filter((l) => l.isShortlisted);
  const purchased = leads.filter((l) => l.isPurchased);

  const filtered = leads
    .filter((l) => {
      if (viewTab === "available" && l.isPurchased) return false;
      if (viewTab === "shortlisted" && !l.isShortlisted) return false;
      if (viewTab === "unlocked" && !l.isPurchased) return false;

      if (subjectFilter !== "ALL" && !l.subjects.includes(subjectFilter)) return false;
      if (modeFilter !== "ALL" && l.mode !== modeFilter) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "distance") {
        if (a.distanceKm === null) return 1;
        if (b.distanceKm === null) return -1;
        return a.distanceKm - b.distanceKm;
      }
      if (sortBy === "cost") return a.coinCost - b.coinCost;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return (
    <div className="space-y-5">
      {/* Claimed / Fully Booked Alert Banner */}
      {showClaimedBanner && (
        <div className="relative overflow-hidden rounded-3xl border-2 border-amber-500 bg-[#FFFBEB] p-5 sm:p-6 shadow-[5px_5px_0px_0px_#B45309] animate-in fade-in duration-300">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white font-black text-xl shadow-sm">
                ⚡
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-extrabold text-amber-950">
                    Tuition Requirement Already Claimed
                  </h2>
                  <span className="rounded-full bg-amber-200 px-2.5 py-0.5 text-[11px] font-black text-amber-900 border border-amber-300">
                    Fully Booked
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-medium text-amber-900 leading-relaxed">
                  {claimedBannerInfo?.locality
                    ? `The ${claimedBannerInfo.subjects ? `${claimedBannerInfo.subjects} ` : ""}student requirement near ${claimedBannerInfo.locality} has already reached maximum tutor applications and is now closed.`
                    : "This tuition requirement has reached maximum tutor responses and is no longer accepting new applications."}
                </p>
                <p className="text-xs font-bold text-amber-800 pt-1">
                  💡 <span className="underline">Tip:</span> Keep your Web Push notifications enabled so you can unlock new student inquiries within seconds of posting!
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

      <LeadNotifReminderBanner />

      {/* View Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Lead Feed Tabs" className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setViewTab("available")}
            className={`rounded-full border-2 border-[#0F172A] px-4 py-2 text-xs font-black transition-all ${
              viewTab === "available"
                ? "bg-[#22C55E] text-white shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]"
                : "bg-white text-[#0F172A] hover:bg-slate-50 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
            }`}
          >
            Available Leads ({unpurchased.length})
          </button>

          <button
            type="button"
            onClick={() => setViewTab("shortlisted")}
            className={`rounded-full border-2 border-[#0F172A] px-4 py-2 text-xs font-black transition-all ${
              viewTab === "shortlisted"
                ? "bg-[#FEF3C7] text-[#78350F] shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]"
                : "bg-white text-[#0F172A] hover:bg-slate-50 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
            }`}
          >
            ★ Shortlisted ({shortlisted.length})
          </button>

          <button
            type="button"
            onClick={() => setViewTab("unlocked")}
            className={`rounded-full border-2 border-[#0F172A] px-4 py-2 text-xs font-black transition-all ${
              viewTab === "unlocked"
                ? "bg-[#E0F2FE] text-[#0369A1] shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]"
                : "bg-white text-[#0F172A] hover:bg-slate-50 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
            }`}
          >
            Unlocked Leads ({purchased.length})
          </button>

          <button
            type="button"
            onClick={() => setViewTab("all")}
            className={`rounded-full border-2 border-[#0F172A] px-4 py-2 text-xs font-black transition-all ${
              viewTab === "all"
                ? "bg-[#0F172A] text-white shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]"
                : "bg-white text-[#0F172A] hover:bg-slate-50 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
            }`}
          >
            All ({leads.length})
          </button>
        </nav>

        <span className="neu-badge bg-[#FEF3C7] font-black">
          🪙 {walletBalance} Coins
        </span>
      </div>

      {/* Filter / sort bar */}
      <div className="neu-card flex flex-col gap-3 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Filter size={14} className="text-slate-400" />
          {/* Subject filter */}
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="rounded-full border-2 border-[#0F172A] bg-white px-3 py-1.5 text-xs font-bold shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] focus:outline-none"
          >
            <option value="ALL">All Subjects</option>
            {tutorSubjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Mode filter */}
          {(["ALL", "ONLINE", "OFFLINE", "EITHER"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setModeFilter(m)}
              className={`rounded-full border-2 border-[#0F172A] px-3 py-1.5 text-[11px] font-extrabold transition-all ${
                modeFilter === m
                  ? "bg-[#0F172A] text-white"
                  : "bg-white hover:bg-slate-50"
              }`}
            >
              {m === "ALL" ? "All Modes" : MODE_LABELS[m]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Sliders size={13} className="text-slate-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="rounded-full border-2 border-[#0F172A] bg-white px-3 py-1.5 text-xs font-bold shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] focus:outline-none"
          >
            <option value="recent">Newest First</option>
            <option value="distance">Closest First</option>
            <option value="cost">Lowest Cost</option>
          </select>
        </div>
      </div>

      {/* Lead cards grid */}
      {filtered.length === 0 ? (
        <div className="neu-card space-y-3 bg-white p-12 text-center">
          <BookOpen size={36} className="mx-auto text-slate-300" />
          <p className="text-lg font-black text-[#0F172A]">
            No leads match your filters
          </p>
          <p className="text-sm font-semibold text-slate-500">
            Try adjusting your filters or check back soon — new requirements are
            posted every day.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((lead) => (
            <LeadCard key={lead.id} lead={lead} walletBalance={walletBalance} />
          ))}
        </div>
      )}
    </div>
  );
}
