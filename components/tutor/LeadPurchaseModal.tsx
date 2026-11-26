"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Copy,
  IndianRupee,
  Mail,
  MapPin,
  Phone,
  Send,
  Shield,
  Unlock,
  X,
  Coins,
  Sparkles,
  Check,
  Lock,
  Crown,
  Award,
} from "lucide-react";
import {
  purchaseLeadAction,
  submitApplicationAction,
  type ParentContact,
  type ApplicationState,
} from "@/app/actions/leads.actions";
import { FieldError, FormAlert } from "@/components/ui/FieldError";
import { getLeadPointCost } from "@/lib/subscription-plans";
import { COIN_TOPUP_ENABLED } from "@/lib/razorpay";
import { isTill8thClass } from "@/lib/lead-utils";
import {
  cleanClassLevelDisplay,
  sanitizeSubjectsForClassLevel,
} from "@/lib/dummy-campaign-types";
import { useSeniorTutor, translateClass, translateSubject } from "@/components/tutor/SeniorTutorContext";

const applicationInitial: ApplicationState = { success: false };

type Stage = "confirm" | "purchasing" | "success" | "error";

type LeadSummary = {
  id: string;
  subjects: string[];
  classLevel: string;
  mode: string;
  city: string | null;
  area: string | null;
  coinCost: number;
  budgetMin?: number | null;
  budgetMax?: number | null;
};

export type SubscriptionInfo = {
  planId: string;
  planName: string | null;
  badge: string | null;
  monthlyQuota: number;
  quotaUsed: number;
  quotaRemaining: number;
  remainingPoints?: number;
  hasActivePlan: boolean;
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="ml-1.5 rounded-lg border border-slate-200 p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
      title="Copy to clipboard"
    >
      {copied ? (
        <Check size={13} className="text-[#2D9E6B]" />
      ) : (
        <Copy size={13} />
      )}
    </button>
  );
}

export function LeadPurchaseModal({
  lead,
  walletBalance,
  subscriptionInfo,
  onClose,
  onUnlocked,
}: {
  lead: LeadSummary;
  walletBalance: number;
  subscriptionInfo?: SubscriptionInfo | null;
  onClose: () => void;
  /** Called immediately after a successful paid unlock so the parent can keep
   * the contact visible even if the underlying lead card is filtered out. */
  onUnlocked?: (contact: ParentContact, purchaseId: string) => void;
}) {
  const { lang, t } = useSeniorTutor();
  const [stage, setStage] = useState<Stage>("confirm");
  const [errorMsg, setErrorMsg] = useState("");
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [contact, setContact] = useState<ParentContact | null>(null);
  const [purchaseId, setPurchaseId] = useState<string>("");
  const [showSlowHint, setShowSlowHint] = useState(false);

  const planPointCost = getLeadPointCost(lead.classLevel, lead.budgetMin, lead.budgetMax);
  const remainingPoints =
    subscriptionInfo?.remainingPoints ??
    (subscriptionInfo?.quotaRemaining ?? 0) * 10;
  const remainingLeads =
    subscriptionInfo?.quotaRemaining ?? Math.max(1, Math.floor(remainingPoints / 10));
  const unlockViaMembershipPoints = Boolean(
    subscriptionInfo?.hasActivePlan && remainingPoints >= planPointCost
  );

  const [appState, appAction, appPending] = useActionState(
    submitApplicationAction,
    applicationInitial
  );

  useEffect(() => {
    if (appState.success) {
      setTimeout(onClose, 1200);
    }
  }, [appState.success, onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && stage !== "purchasing") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose, stage]);

  const handleConfirm = async () => {
    if (isPurchasing) return;
    setIsPurchasing(true);
    setStage("purchasing");
    setErrorMsg("");
    setShowSlowHint(false);
    const slowHintTimer = setTimeout(() => setShowSlowHint(true), 12000);
    try {
      const result = await purchaseLeadAction(lead.id);
      if (!result.success || !result.data) {
        setErrorMsg(result.error ?? "Failed to unlock lead. Please try again.");
        setStage("error");
        return;
      }

      setContact(result.data.parentContact);
      setPurchaseId(result.data.purchaseId);
      setStage("success");
      // Keep the unlocked phone in the parent feed's persistent panel before any
      // route refresh can re-render/filter the card that opened this modal.
      onUnlocked?.(result.data.parentContact, result.data.purchaseId);
    } catch (err) {
      // A Prisma timeout / dropped server action used to leave the spinner
      // spinning forever. Surface a retryable error instead. The action is
      // idempotent, so pressing Try Again can never charge twice.
      setErrorMsg(
        "Unlock took too long or the connection dropped. Please try again — your contact will show automatically if the unlock already completed."
      );
      setStage("error");
    } finally {
      clearTimeout(slowHintTimer);
      setIsPurchasing(false);
    }
  };

  const canAfford = unlockViaMembershipPoints || walletBalance >= lead.coinCost;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      {stage !== "purchasing" && (
        <button
          type="button"
          aria-label="Close"
          className="fixed inset-0 cursor-default"
          onClick={onClose}
        />
      )}

      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-7 space-y-5 text-slate-900 animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-emerald-50 text-[#2D9E6B] border border-emerald-200/80 flex items-center justify-center font-extrabold shadow-xs">
              {stage === "success" ? <CheckCircle2 size={22} /> : <Unlock size={20} />}
            </div>
            <div>
              <h2
                className="text-lg font-bold text-[#0F2540]"
                style={{ fontFamily: "Poppins, sans-serif" }}
              >
                {stage === "success"
                  ? (lang === "hi" ? "अनलॉक सफल रहा! 🎉" : "Lead Unlocked Successfully! 🎉")
                  : t("unlockModalHeading")}
              </h2>
              <p className="text-xs font-semibold text-slate-500">
                {translateClass(cleanClassLevelDisplay(lead.classLevel), lang)} ·{" "}
                {translateSubject(
                  sanitizeSubjectsForClassLevel(lead.subjects, lead.classLevel)
                    .slice(0, 3)
                    .join(", "),
                  lang
                )}
              </p>
            </div>
          </div>

          {stage !== "purchasing" && (
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* ── Stage: Confirm ── */}
        {stage === "confirm" && (
          <div className="space-y-4">
            {/* Subscription Benefit vs Coin Cost Box */}
            {unlockViaMembershipPoints ? (
              <div className="rounded-2xl border border-amber-200 bg-[#FFF8E8] p-4.5 text-center space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#F5A623] text-[#0F2540] font-extrabold text-[11px]">
                  <Crown size={12} />
                  <span>{subscriptionInfo?.planName ?? (lang === "hi" ? "सक्रिय मेंबरशिप" : "Active Membership")} {lang === "hi" ? "का लाभ" : "Benefit"}</span>
                </div>
                <p className="text-2xl sm:text-3xl font-extrabold text-[#0F2540] flex items-center justify-center gap-1.5">
                  <span>{t("freeUnlockHeading")}</span>
                </p>
                <p className="text-xs font-semibold text-slate-700">
                  {lang === "hi"
                    ? `आपकी सक्रिय सदस्यता में 100% शामिल। वॉलेट से कोई कॉइन नहीं कटेगा (प्लान में ${remainingLeads} अनलॉक शेष)।`
                    : `Covered 100% by your active membership. No coins will be deducted from your wallet (${remainingLeads} plan unlocks remaining).`}
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-center space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-amber-800 tracking-wider">
                  {lang === "hi" ? "अनलॉक शुल्क" : "Lead Unlock Cost"}
                </span>
                <p className="text-3xl font-extrabold text-amber-950 font-mono flex items-center justify-center gap-1.5">
                  <Coins size={26} className="text-amber-500" />
                  <span>{lead.coinCost} {t("coinsBadge")}</span>
                </p>
                <p className="text-xs font-semibold text-slate-600">
                  {lang === "hi" ? "आपका वॉलेट बैलेंस:" : "Your wallet balance:"} <strong className="text-slate-900">{walletBalance} {t("coinsBadge")}</strong>
                  {walletBalance >= lead.coinCost && (
                    <span className="block text-[11px] text-emerald-700 font-bold mt-0.5">
                      {lang === "hi"
                        ? `(अनलॉक के बाद शेष: ${walletBalance - lead.coinCost} कॉइन्स)`
                        : `(Remaining after unlock: ${walletBalance - lead.coinCost} Coins)`}
                    </span>
                  )}
                </p>
              </div>
            )}

            {/* Unlocked Benefits */}
            <div className="space-y-2 rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-4 text-xs font-semibold text-slate-700">
              <p className="font-bold text-[#0F2540]">{t("whatYouUnlockHeading")}</p>
              <ul className="space-y-1.5 text-xs text-slate-700 font-medium">
                <li className="flex items-center gap-2">
                  <Phone size={14} className="text-[#2D9E6B]" />
                  <span>{t("unlockBenefit1")}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Mail size={14} className="text-[#2D9E6B]" />
                  <span>{t("unlockBenefit2")}</span>
                </li>
                <li className="flex items-center gap-2">
                  <MapPin size={14} className="text-[#2D9E6B]" />
                  <span>{t("unlockBenefit3")}</span>
                </li>
              </ul>
            </div>

            {!canAfford ? (
              <div className="space-y-3 pt-1">
                <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200 text-xs font-semibold text-amber-900 space-y-1">
                  <div className="flex items-center justify-between font-bold">
                    <span>Coins Required: {lead.coinCost}</span>
                    <span>Your Balance: {walletBalance} Coins</span>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    You need {lead.coinCost - walletBalance} more coins (or an active membership plan) to unlock this student&apos;s contact details.
                  </p>
                  <p className="text-[11px] font-bold text-emerald-700 flex items-center gap-1 pt-0.5">
                    <Sparkles size={12} /> KYC is optional — choose an option below to unlock instantly!
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {COIN_TOPUP_ENABLED ? (
                    <Link
                      href="/tutor/wallet"
                      onClick={onClose}
                      className="flex flex-col items-center justify-center p-3.5 rounded-2xl border-2 border-amber-300 bg-amber-50/50 hover:bg-amber-100 hover:border-amber-400 text-center transition-all group shadow-2xs"
                    >
                      <Coins size={22} className="text-amber-600 mb-1 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-800 text-amber-950">Top Up Coins →</span>
                      <span className="text-[10px] text-amber-800 font-medium mt-0.5">Coin packs starting from ₹250</span>
                    </Link>
                  ) : (
                    <Link
                      href="/tutor/plans?checkout=STARTER"
                      onClick={onClose}
                      className="flex flex-col items-center justify-center p-3.5 rounded-2xl border-2 border-amber-300 bg-amber-50 text-center transition-all group shadow-2xs"
                    >
                      <Coins size={22} className="text-amber-600 mb-1" />
                      <span className="text-xs font-800 text-amber-950">Top-Up Unavailable · Starter Plan ₹1,257 →</span>
                      <span className="text-[10px] text-amber-800 font-medium mt-0.5">60 coins · 6 months validity</span>
                    </Link>
                  )}

                  <Link
                    href="/tutor/plans"
                    onClick={onClose}
                    className="flex flex-col items-center justify-center p-3.5 rounded-2xl border-2 border-[#0F2540]/20 bg-[#0F2540]/5 hover:bg-[#0F2540]/10 hover:border-[#0F2540]/40 text-center transition-all group shadow-2xs"
                  >
                    <Crown size={22} className="text-[#0F2540] mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-800 text-[#0F2540]">VIP Membership →</span>
                    <span className="text-[10px] text-slate-600 font-medium mt-0.5">10+ free unlocks/mo & 0% fee</span>
                  </Link>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col-reverse gap-2.5 sm:flex-row pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  {t("cancelModalBtn")}
                </button>
                <button
                  type="button"
                  disabled={isPurchasing}
                  onClick={handleConfirm}
                  className={`flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl text-white font-extrabold text-xs shadow-md active:scale-95 transition-all cursor-pointer ${unlockViaMembershipPoints
                      ? "bg-[#0F2540] hover:bg-[#1A3C5E]"
                      : "bg-[#2D9E6B] hover:bg-[#238357] shadow-emerald-500/20"
                    }`}
                >
                  <Unlock size={14} />
                  <span>
                    {unlockViaMembershipPoints
                      ? t("confirmUnlockBtn")
                      : (lang === "hi"
                          ? `अनलॉक की पुष्टि करें (${lead.coinCost} कॉइन्स)`
                          : `Confirm Unlock (${lead.coinCost} Coins)`)}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Stage: Purchasing ── */}
        {stage === "purchasing" && (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-slate-200 border-t-[#2D9E6B]" />
            <p className="text-xs font-bold text-[#0F2540]">
              Unlocking lead and verifying slot availability…
            </p>
            {showSlowHint && (
              <p className="text-[11px] font-semibold text-slate-500 max-w-xs">
                Network thoda slow hai — kripya 10–15 second aur wait karein. Page close na karein.
              </p>
            )}
          </div>
        )}

        {/* ── Stage: Success + Apply ── */}
        {stage === "success" && contact && (() => {
          const phoneClean = contact.phone ? contact.phone.replace(/\D/g, "").slice(-10) : "";
          return (
            <div className="space-y-4">
              <div className="rounded-3xl border-2 border-emerald-400 bg-emerald-50/90 p-5 space-y-4 text-xs shadow-md">
                <div className="flex items-center gap-2 font-black text-emerald-900 text-sm">
                  <Shield size={18} className="text-emerald-600" />
                  <span>✅ {lang === "hi" ? "अभिभावक संपर्क विवरण अनलॉक हो गया" : "Parent Contact Details Unlocked"}</span>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-emerald-200 space-y-3">
                  {contact.name && (
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-500 font-bold">{lang === "hi" ? "छात्र / अभिभावक:" : "Student / Parent:"}</span>
                      <span className="font-black text-slate-900 text-sm">{contact.name}</span>
                    </div>
                  )}

                  <div>
                    <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider block mb-1">
                      {t("parentMobileLabel")}
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="font-black text-emerald-950 font-mono text-2xl tracking-wider select-all">
                        {contact.phone ?? "—"}
                      </span>
                      {contact.phone && <CopyButton text={contact.phone} />}
                    </div>
                  </div>

                  {contact.phone && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <a
                        href={`tel:${contact.phone}`}
                        className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 text-center"
                      >
                        <Phone size={15} />
                        <span>{t("callParentNow")}</span>
                      </a>
                      <a
                        href={`https://wa.me/91${phoneClean}?text=Namaste%2C%20main%20ApnaTutorHub%20se%20verified%20tutor%20hoon%20aapke%20tuition%20requirement%20ke%20liye.`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-white font-black text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 text-center"
                      >
                        <span className="text-sm">💬</span>
                        <span>{t("whatsappParent")}</span>
                      </a>
                    </div>
                  )}

                  {(contact.area || contact.city || contact.pincode) && (
                    <div className="pt-2 border-t border-slate-100 text-xs">
                      <span className="text-slate-500 font-bold block mb-0.5">{lang === "hi" ? "पता / इलाका:" : "Address / Locality:"}</span>
                      <span className="font-bold text-slate-800">
                        {[contact.area, contact.city, contact.pincode].filter(Boolean).join(", ")}
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-bold">
                  {t("seniorTeacherTip")}
                </div>
              </div>

              {/* Proposal form */}
              <form action={appAction} className="space-y-3 pt-1">
                <input type="hidden" name="purchaseId" value={purchaseId} />

                <label className="block text-xs font-bold text-[#0F2540]">
                  {t("sendInAppProposal")}
                </label>

                {appState.error && <FormAlert tone="error" message={appState.error} />}
                {appState.success && (
                  <FormAlert tone="success" message={lang === "hi" ? "प्रस्ताव सफलतापूर्वक भेजा गया!" : "Proposal sent successfully!"} />
                )}

                <textarea
                  name="proposalNote"
                  rows={2}
                  placeholder={lang === "hi" ? "अपना परिचय दें — शिक्षण अनुभव, परिणाम और समय की उपलब्धता…" : "Introduce yourself — teaching experience, relevant results, and schedule availability…"}
                  className="w-full rounded-2xl p-3 bg-white border border-slate-200 text-xs font-semibold text-slate-900 outline-none focus:border-[#2D9E6B] resize-none"
                />

                <div className="relative">
                  <IndianRupee
                    size={14}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    name="feeQuote"
                    type="number"
                    min={0}
                    step={50}
                    placeholder={
                      isTill8thClass(lead.classLevel)
                        ? (lang === "hi" ? "अपेक्षित मासिक शुल्क (₹ / महीना)" : "Expected Monthly Fee Quote (₹ / month)")
                        : (lang === "hi" ? "अपेक्षित प्रति घंटा शुल्क (₹ / घंटा)" : "Expected Hourly Fee Quote (₹ / hour)")
                    }
                    className="w-full rounded-2xl pl-9 pr-3.5 py-2.5 bg-white border border-slate-200 text-xs font-semibold text-slate-900 outline-none focus:border-[#2D9E6B]"
                  />
                </div>

                <div className="flex flex-col-reverse gap-2.5 sm:flex-row pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs transition-colors cursor-pointer w-full text-center"
                  >
                    {t("doneCloseWindowBtn")}
                  </button>
                  <button
                    type="submit"
                    disabled={appPending}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition-all cursor-pointer"
                  >
                    <Send size={13} />
                    <span>{appPending ? t("sendingState") : t("sendProposalBtn")}</span>
                  </button>
                </div>
              </form>
            </div>
          );
        })()}

        {/* ── Stage: Error ── */}
        {stage === "error" && (
          <div className="space-y-4">
            <FormAlert tone="error" message={errorMsg} />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStage("confirm")}
                className="flex-1 py-2.5 rounded-2xl bg-[#2D9E6B] text-white font-bold text-xs cursor-pointer"
              >
                Try Again
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-2xl bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
