"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Search,
  Users,
  MessageCircle,
  Wallet,
  Crown,
  PhoneCall,
  X,
  Volume2,
  VolumeX,
  MapPin,
  Sliders,
  Check,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Phone,
  Bell,
  Loader2,
} from "lucide-react";
import { useSeniorTutor, type TextScale, type Language } from "@/components/tutor/SeniorTutorContext";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { NotificationBell } from "@/components/NotificationBell";
import { updateTutorQuickPreferencesAction } from "@/app/actions/tutor.actions";
import { ChatInboxModal } from "@/components/chat/ChatInboxModal";

interface SeniorTutorShellProps {
  children: React.ReactNode;
  userName: string;
  userEmail: string;
  walletBalance: number;
  unreadMessagesCount: number;
  unreadNotificationsCount?: number;
  subscriptionPlan?: string | null;
  isSubscriptionActive?: boolean;
  kycStatus?: string;
}

export function SeniorTutorShell({
  children,
  userName,
  userEmail,
  walletBalance,
  unreadMessagesCount,
  unreadNotificationsCount = 0,
  subscriptionPlan,
  isSubscriptionActive,
  kycStatus,
}: SeniorTutorShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSavingArea, setIsSavingArea] = useState(false);
  const [chatInboxOpen, setChatInboxOpen] = useState(false);

  const {
    scale,
    setScale,
    lang,
    setLang,
    isSpeaking,
    toggleReadAloud,
    isAreaModalOpen,
    openAreaModal,
    closeAreaModal,
    currentArea,
    currentRadius,
    setAreaAndRadius,
    isHelpModalOpen,
    openHelpModal,
    closeHelpModal,
    feedbackMessage,
    showFeedback,
    hideFeedback,
    t,
  } = useSeniorTutor();

  // Temporary local slider state inside Area Modal
  const [modalRadius, setModalRadius] = useState(currentRadius);
  const [modalArea, setModalArea] = useState(currentArea);

  // Sync state when opening modal
  React.useEffect(() => {
    setModalRadius(currentRadius);
    setModalArea(currentArea);
  }, [currentRadius, currentArea, isAreaModalOpen]);

  const isHomeActive = pathname === "/tutor/dashboard" || pathname === "/tutor";
  const isInquiriesActive = pathname.startsWith("/tutor/leads");
  const isStudentsActive = pathname.startsWith("/tutor/bookings");
  const isMessagesActive = pathname.startsWith("/chat");
  const isWalletActive = pathname.startsWith("/tutor/wallet");
  const isMembershipActive = pathname.startsWith("/tutor/plans");

  const navItems = [
    {
      href: "/tutor/dashboard",
      label: t("navHome"),
      icon: Home,
      isActive: isHomeActive,
    },
    {
      href: "/tutor/leads",
      label: t("navInquiries"),
      icon: Search,
      isActive: isInquiriesActive,
      badge: lang === "hi" ? "4 नए" : "4 New",
      badgeColor: "bg-[#065F46] text-white",
    },
    {
      href: "/tutor/bookings",
      label: t("navStudents"),
      icon: Users,
      isActive: isStudentsActive,
      badge: lang === "hi" ? "1 सक्रिय" : "1 Ongoing",
      badgeColor: "bg-emerald-100 text-emerald-950 border border-emerald-300",
    },
    {
      href: "/chat",
      label: t("navMessages"),
      icon: MessageCircle,
      isActive: isMessagesActive,
      inbox: true,
      badge: unreadMessagesCount > 0 ? String(unreadMessagesCount) : undefined,
      badgeColor: "bg-red-600 text-white",
    },
    {
      href: "/tutor/wallet",
      label: t("navWallet"),
      icon: Wallet,
      isActive: isWalletActive,
      badge: `${walletBalance} ${t("coinsBadge")}`,
      badgeColor: "bg-amber-100 text-amber-900 border border-amber-300",
    },
    {
      href: "/tutor/plans",
      label: t("navMembership"),
      icon: Crown,
      isActive: isMembershipActive,
      badge: isSubscriptionActive ? t("activePlanBadge") : undefined,
      badgeColor: "bg-emerald-100 text-emerald-900 border border-emerald-300",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row tutor-paper-bg font-sans">
      {/* ==================== MOBILE HEADER BAR ==================== */}
      <div className="lg:hidden bg-white border-b-2 border-[#E5DEC9] px-4 py-3.5 sticky top-0 z-40 flex items-center justify-between gap-3 shadow-xs">
        <Link href="/tutor/dashboard" className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl btn-emerald-sheen text-white flex items-center justify-center shrink-0">
            <span className="text-xl">🎓</span>
          </div>
          <div>
            <span className="font-extrabold text-xl text-[#18181B] block leading-tight">
              ApnaTutorHub
            </span>
            <span className="text-xs font-bold text-[#065F46] uppercase tracking-wider">
              {t("portalBadge")}
            </span>
          </div>
        </Link>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="senior-btn px-4 py-2.5 rounded-2xl btn-emerald-sheen text-white font-bold flex items-center gap-2 cursor-pointer shadow-sm"
          aria-expanded={mobileMenuOpen}
        >
          <span className="text-lg">☰</span>
          <span>{t("menuBtn")}</span>
        </button>
      </div>

      {/* ==================== MOBILE BACKDROP OVERLAY ==================== */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-[#18181B]/60 z-40 lg:hidden"
        />
      )}

      {/* ==================== LEFT GUIDED NAVIGATION RAIL (275px Desktop) ==================== */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-[285px] lg:w-[270px] shrink-0 bg-white border-r-2 border-[#E5DEC9] flex flex-col justify-between p-3 sm:p-3.5 pb-12 lg:pb-8 overflow-y-auto transition-transform duration-200 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="space-y-2.5">
          {/* Brand Header */}
          <div className="pb-2.5 border-b-2 border-[#E5DEC9] space-y-2">
            <div className="flex items-center justify-between">
              <Link href="/tutor/dashboard" className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl btn-emerald-sheen text-white flex items-center justify-center shrink-0 shadow-md">
                  <span className="text-xl">🎓</span>
                </div>
                <div>
                  <span className="font-extrabold text-lg text-[#18181B] block leading-tight">
                    ApnaTutorHub
                  </span>
                  <span className="text-[11px] font-black text-[#065F46] uppercase tracking-wider">
                    {t("portalBadge")}
                  </span>
                </div>
              </Link>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="lg:hidden p-1.5 rounded-xl border-2 border-[#E5DEC9] text-[#18181B] font-bold cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-2.5 py-1 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] font-bold text-xs flex items-center gap-1.5">
              <span>🏅</span>
              <span>{t("seniorEducatorBadge")}</span>
            </div>
          </div>

          {/* 6 Navigation Destinations */}
          <div>
            <p className="px-2 text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
              {t("navHeading")}
            </p>

            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const navClass = `relative w-full min-h-[46px] px-3 py-2 rounded-xl border-2 flex items-center justify-between gap-2 text-left transition cursor-pointer ${
                  item.isActive
                    ? "border-[#065F46] bg-[#ECFDF5] text-[#064E3B] font-black shadow-2xs"
                    : "border-[#E5DEC9] bg-white text-[#18181B] hover:border-[#065F46] hover:bg-[#ECFDF5]/50 font-bold"
                }`;
                const inner = (
                  <>
                    {item.isActive && (
                      <span className="absolute left-0 top-2 bottom-2 w-1.5 rounded-r-full bg-[#065F46]" />
                    )}
                    <span className="flex items-center gap-2.5 pl-1">
                      <Icon
                        size={19}
                        className={`shrink-0 ${
                          item.isActive ? "text-[#065F46]" : "text-slate-600"
                        }`}
                      />
                      <span className="leading-snug text-sm sm:text-base">{item.label}</span>
                    </span>
                    {item.badge && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-black shrink-0 ${
                          item.badgeColor ?? "bg-[#065F46] text-white"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </>
                );
                if ("inbox" in item && item.inbox) {
                  return (
                    <button
                      key={item.href}
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setChatInboxOpen(true);
                      }}
                      className={navClass}
                    >
                      {inner}
                    </button>
                  );
                }
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={navClass}
                  >
                    {inner}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Bottom Profile & Trust Card */}
        <div className="pt-3 mt-3 border-t-2 border-[#E5DEC9]">
          <div className="bg-[#FAF7F2] border-2 border-[#E5DEC9] rounded-2xl p-3 space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full btn-emerald-sheen text-white font-extrabold text-base flex items-center justify-center shrink-0 shadow-xs">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-extrabold text-[#18181B] truncate text-sm">
                  {(userName || "").replace(/\s+ji$/i, "").trim()} {lang === "hi" ? "जी" : "Ji"}
                </p>
                <p className="text-[11px] font-bold text-[#B45309]">5.0 ★ {t("seniorFaculty")}</p>
              </div>
            </div>

            <div className="px-2.5 py-1 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#064E3B] font-black text-[11px] flex items-center justify-center gap-1.5">
              <span>{kycStatus === "APPROVED" ? t("idVerifiedStatus") : t("registeredTeacherBadge")}</span>
            </div>

            <div className="pt-0.5 flex items-center justify-between text-xs">
              <Link
                href="/tutor/profile"
                className="text-[#065F46] hover:underline font-bold"
              >
                {t("myProfile")}
              </Link>
              <SignOutButton text={t("signOut")} />
            </div>
          </div>
        </div>
      </aside>

      {/* ==================== RIGHT MAIN WORKSPACE ==================== */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* 1. TOP COMFORT & ACCESSIBILITY CONTROL BAR */}
        <header className="bg-white/95 backdrop-blur-md border-b-2 border-[#E5DEC9] px-3 sm:px-6 py-2.5 sticky top-0 z-30 shadow-xs">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
            {/* Left Controls: Text Size + Language */}
            <div className="flex flex-wrap items-center gap-2">
              <div
                className="inline-flex items-center rounded-2xl border-2 border-[#E5DEC9] bg-[#FAF7F2] p-0.5 sm:p-1"
                role="group"
                aria-label="Text Size Switcher"
              >
                <button
                  type="button"
                  onClick={() => setScale("normal")}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-xl font-black text-xs transition cursor-pointer ${
                    scale === "normal"
                      ? "bg-[#065F46] text-white shadow-xs"
                      : "text-[#18181B] hover:bg-white"
                  }`}
                >
                  {t("scaleNormal")}
                </button>
                <button
                  type="button"
                  onClick={() => setScale("large")}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-xl font-black text-xs transition cursor-pointer ${
                    scale === "large"
                      ? "bg-[#065F46] text-white shadow-xs"
                      : "text-[#18181B] hover:bg-white"
                  }`}
                >
                  {t("scaleLarge")}
                </button>
                <button
                  type="button"
                  onClick={() => setScale("xlarge")}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-xl font-black text-xs transition cursor-pointer ${
                    scale === "xlarge"
                      ? "bg-[#065F46] text-white shadow-xs"
                      : "text-[#18181B] hover:bg-white"
                  }`}
                >
                  {t("scaleXLarge")}
                </button>
              </div>

              <div
                className="inline-flex rounded-2xl border-2 border-[#E5DEC9] p-0.5 sm:p-1 bg-[#FAF7F2]"
                role="group"
                aria-label="Language Switcher"
              >
                <button
                  type="button"
                  onClick={() => setLang("en")}
                  className={`px-3 py-1.5 rounded-xl font-black text-xs transition cursor-pointer ${
                    lang === "en"
                      ? "bg-[#065F46] text-white shadow-xs"
                      : "text-[#18181B] hover:bg-white"
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setLang("hi")}
                  className={`px-3 py-1.5 rounded-xl font-black text-xs transition cursor-pointer ${
                    lang === "hi"
                      ? "bg-[#065F46] text-white shadow-xs"
                      : "text-[#18181B] hover:bg-white"
                  }`}
                >
                  हिंदी (Hindi)
                </button>
              </div>
            </div>

            {/* Right Controls: Read Aloud + Helpline + Notification Bell */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => toggleReadAloud()}
                className={`min-h-[42px] px-3 sm:px-3.5 py-1.5 rounded-2xl border-2 font-black text-xs flex items-center gap-2 transition cursor-pointer shadow-xs ${
                  isSpeaking
                    ? "speaking bg-[#FEF3C7] text-[#92400E] border-[#FCD34D]"
                    : "bg-[#FFFBEB] hover:bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]"
                }`}
              >
                <span className="flex items-end gap-0.5 h-4" aria-hidden="true">
                  <span className="soundwave-bar" />
                  <span className="soundwave-bar" />
                  <span className="soundwave-bar" />
                  <span className="soundwave-bar" />
                </span>
                <span>{isSpeaking ? t("stopReadingBtn") : t("readAloudBtn")}</span>
              </button>

              <button
                type="button"
                onClick={openHelpModal}
                className="min-h-[42px] px-3 sm:px-3.5 py-1.5 rounded-2xl bg-white hover:bg-[#ECFDF5] text-[#064E3B] border-2 border-[#065F46] font-black text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <PhoneCall size={16} className="text-[#065F46] shrink-0" />
                <span>{t("topHelpBtn")}</span>
              </button>

              <div className="shrink-0 flex items-center">
                <NotificationBell initialCount={unreadNotificationsCount} viewerRole="TUTOR" />
              </div>
            </div>
          </div>
        </header>

        {/* Reassuring Status Feedback Banner */}
        {feedbackMessage && (
          <div className="max-w-5xl w-full mx-auto px-4 sm:px-6 pt-3">
            <div className="rounded-2xl border-2 border-[#065F46] bg-[#ECFDF5] p-3.5 shadow-sm flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-[#065F46] text-white flex items-center justify-center font-black shrink-0 text-sm">
                  ✓
                </span>
                <p className="font-black text-[#18181B] text-xs sm:text-sm">{feedbackMessage}</p>
              </div>
              <button
                type="button"
                onClick={hideFeedback}
                className="px-3 py-1 rounded-xl bg-white border-2 border-[#E5DEC9] font-bold text-xs text-[#18181B] hover:bg-[#FAF7F2] cursor-pointer"
              >
                {t("closeBtn")}
              </button>
            </div>
          </div>
        )}

        {/* Main Workspace Body */}
        <main className="flex-1 max-w-5xl w-full mx-auto px-3.5 sm:px-6 py-6 space-y-6 min-w-0 overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* ==================== EDIT AREA & RADIUS MODAL (2 km to 15 km) ==================== */}
      {isAreaModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-[#18181B]/75 flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="bg-white border-2 border-[#18181B] rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-extrabold text-2xl text-[#18181B]">
                {t("editAreaBtn")}
              </h2>
              <button
                type="button"
                onClick={closeAreaModal}
                className="px-3.5 py-2 rounded-xl border-2 border-[#E5DEC9] font-bold cursor-pointer hover:bg-[#FAF7F2]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block font-black text-sm text-[#18181B] mb-2">
                  {t("yourLocalityLabel")}
                </label>
                <input
                  type="text"
                  value={modalArea}
                  onChange={(e) => setModalArea(e.target.value)}
                  placeholder="e.g. Sangam Vihar, Saket, Malviya Nagar, Delhi"
                  className="w-full px-4 py-3.5 rounded-2xl border-2 border-[#E5DEC9] font-black text-sm text-[#18181B] bg-[#FAF7F2] outline-none focus:border-[#065F46] focus:bg-white"
                />
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {[
                    "Sangam Vihar, Delhi",
                    "Saket, Delhi",
                    "Malviya Nagar, Delhi",
                    "Alaknanda, Delhi",
                    "Kalkaji, Delhi",
                    "Greater Kailash, Delhi",
                    "Hauz Khas, Delhi",
                    "Rohini, Delhi",
                    "Dwarka, Delhi",
                  ].map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setModalArea(loc)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        modalArea === loc
                          ? "bg-[#065F46] text-white border-[#065F46]"
                          : "bg-white text-slate-700 border-[#E5DEC9] hover:border-[#065F46]"
                      }`}
                    >
                      {loc.split(",")[0]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-[#FAF7F2] border-2 border-[#E5DEC9] rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-black text-sm text-[#18181B]">
                    {t("distanceLabel")}
                  </label>
                  <span className="px-3.5 py-1 rounded-xl bg-[#065F46] text-white font-extrabold text-base">
                    {modalRadius} km
                  </span>
                </div>

                <input
                  type="range"
                  min="2"
                  max="15"
                  step="1"
                  value={modalRadius}
                  onChange={(e) => setModalRadius(Number(e.target.value))}
                  className="senior-slider cursor-pointer"
                />

                <div className="flex justify-between text-xs font-black text-slate-500">
                  <span>2 km (Walking)</span>
                  <span>8 km (Scooter)</span>
                  <span>15 km (Metro/Car)</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                disabled={isSavingArea}
                onClick={async () => {
                  setIsSavingArea(true);
                  try {
                    const parts = modalArea.split(",");
                    const city = parts.length > 1 ? parts[parts.length - 1].trim() : "Delhi";
                    const address = modalArea.trim();
                    const res = await updateTutorQuickPreferencesAction({
                      city: city || "Delhi",
                      address: address || "Delhi NCR",
                      teachingRadius: modalRadius,
                    });
                    if (res.success) {
                      setAreaAndRadius(modalArea, modalRadius);
                      closeAreaModal();
                      showFeedback(
                        lang === "hi"
                          ? `क्षेत्र सफलतापूर्वक सहेजा गया: ${modalArea} (${modalRadius} किमी)`
                          : `Teaching area saved to ${modalArea} (Within ${modalRadius} km).`
                      );
                      router.refresh();
                    } else {
                      showFeedback(res.error || "Could not save area preferences.");
                    }
                  } catch {
                    showFeedback("Error saving area preferences.");
                  } finally {
                    setIsSavingArea(false);
                  }
                }}
                className="senior-btn flex-1 rounded-2xl btn-emerald-sheen text-white font-black cursor-pointer shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSavingArea ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Saving…</span>
                  </>
                ) : (
                  <span>{t("saveBtn")}</span>
                )}
              </button>
              <button
                type="button"
                disabled={isSavingArea}
                onClick={closeAreaModal}
                className="senior-btn flex-1 rounded-2xl bg-white border-2 border-[#18181B] text-[#18181B] font-black cursor-pointer hover:bg-[#FAF7F2]"
              >
                {t("cancelBtn")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== OFFICIAL HELPLINE & SUPPORT MODAL ==================== */}
      {isHelpModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-[#18181B]/75 flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="bg-white border-2 border-[#18181B] rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="px-3 py-1 rounded-full bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] font-black text-xs uppercase">
                  Senior Educator Helpline
                </span>
                <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-[#18181B] mt-2">
                  {t("helpModalTitle")}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeHelpModal}
                className="px-3.5 py-2 rounded-xl border-2 border-[#E5DEC9] font-bold cursor-pointer hover:bg-[#FAF7F2]"
              >
                ✕
              </button>
            </div>

            <p className="text-slate-700 font-medium leading-relaxed text-sm">
              {t("helpModalSub")}
            </p>

            <div className="space-y-3 pt-1">
              <a
                href="tel:+919319193109"
                onClick={() => {
                  closeHelpModal();
                  showFeedback("Connecting to Helpline (+91 93191 93109)...");
                }}
                className="senior-btn w-full px-5 py-4 rounded-2xl btn-emerald-sheen text-white font-black text-base sm:text-lg flex items-center justify-center gap-2.5 cursor-pointer shadow-md text-center"
              >
                <Phone size={20} className="shrink-0" />
                <span>{t("callbackBtn")}</span>
              </a>

              <a
                href={`https://wa.me/919319193109?text=${encodeURIComponent(`Namaste, main ${userName || "Tutor"} ApnaTutorHub par verified educator hoon. Mujhe support chahiye.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  closeHelpModal();
                  showFeedback("Opening WhatsApp Support Coordinator...");
                }}
                className="senior-btn w-full px-5 py-4 rounded-2xl bg-[#ECFDF5] hover:bg-[#D1FAE5] text-[#064E3B] border-2 border-[#065F46] font-black text-base sm:text-lg flex items-center justify-center gap-2.5 transition-all text-center cursor-pointer shadow-xs"
              >
                <MessageCircle size={20} className="shrink-0 text-[#065F46]" />
                <span>{t("whatsappHelpBtn")}</span>
              </a>
            </div>
          </div>
        </div>
      )}
      {chatInboxOpen && <ChatInboxModal onClose={() => setChatInboxOpen(false)} />}
    </div>
  );
}
