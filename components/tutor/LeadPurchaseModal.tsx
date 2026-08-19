"use client";

import { useActionState, useEffect, useState } from "react";
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
};

export type SubscriptionInfo = {
  planId: string;
  planName: string | null;
  badge: string | null;
  monthlyQuota: number;
  quotaUsed: number;
  quotaRemaining: number;
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
}: {
  lead: LeadSummary;
  walletBalance: number;
  subscriptionInfo?: SubscriptionInfo | null;
  onClose: () => void;
}) {
  const [stage, setStage] = useState<Stage>("confirm");
  const [errorMsg, setErrorMsg] = useState("");
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [contact, setContact] = useState<ParentContact | null>(null);
  const [purchaseId, setPurchaseId] = useState<string>("");

  const isFreeWithPlan = Boolean(
    subscriptionInfo?.hasActivePlan && (subscriptionInfo?.quotaRemaining ?? 0) > 0
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
    setIsPurchasing(true);
    setStage("purchasing");
    const result = await purchaseLeadAction(lead.id);
    setIsPurchasing(false);

    if (!result.success || !result.data) {
      setErrorMsg(result.error ?? "Failed to unlock lead.");
      setStage("error");
      return;
    }

    setContact(result.data.parentContact);
    setPurchaseId(result.data.purchaseId);
    setStage("success");
  };

  const canAfford = isFreeWithPlan || walletBalance >= lead.coinCost;

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
                {stage === "success" ? "Lead Unlocked Successfully! 🎉" : "Unlock Student Requirement"}
              </h2>
              <p className="text-xs font-semibold text-slate-500">
                {lead.classLevel} · {lead.subjects.slice(0, 3).join(", ")}
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
            {isFreeWithPlan ? (
              <div className="rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 p-4.5 text-center space-y-1.5 shadow-2xs">
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-purple-100 border border-purple-300 text-purple-950 font-extrabold text-[11px]">
                  <Crown size={12} className="text-purple-600" />
                  <span>{subscriptionInfo?.planName ?? "VIP Plan"} Benefit</span>
                </div>
                <p className="text-2xl sm:text-3xl font-extrabold text-purple-950 flex items-center justify-center gap-1.5">
                  <span>✨ 0 Coins (Free Unlock)</span>
                </p>
                <p className="text-xs font-semibold text-purple-900">
                  Included in your plan. Uses 1 of your <strong>{subscriptionInfo?.quotaRemaining} remaining monthly leads</strong>.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-center space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-amber-800 tracking-wider">
                  Lead Unlock Cost
                </span>
                <p className="text-3xl font-extrabold text-amber-950 font-mono flex items-center justify-center gap-1.5">
                  <Coins size={26} className="text-amber-500" />
                  <span>{lead.coinCost} Coins</span>
                </p>
                <p className="text-xs font-semibold text-slate-600">
                  Your wallet balance: <strong className="text-slate-900">{walletBalance} coins</strong>
                </p>
              </div>
            )}

            {/* Unlocked Benefits */}
            <div className="space-y-2 rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-4 text-xs font-semibold text-slate-700">
              <p className="font-bold text-[#0F2540]">What you unlock instantly:</p>
              <ul className="space-y-1.5 text-xs text-slate-700 font-medium">
                <li className="flex items-center gap-2">
                  <Phone size={14} className="text-[#2D9E6B]" />
                  <span>Direct parent WhatsApp &amp; phone number</span>
                </li>
                <li className="flex items-center gap-2">
                  <Mail size={14} className="text-[#2D9E6B]" />
                  <span>Verified email &amp; communication channel</span>
                </li>
                <li className="flex items-center gap-2">
                  <MapPin size={14} className="text-[#2D9E6B]" />
                  <span>Exact student locality, address &amp; notes</span>
                </li>
              </ul>
            </div>

            {!canAfford && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800">
                You need {lead.coinCost - walletBalance} more coins. Please top up your wallet to unlock this lead.
              </div>
            )}

            <div className="flex flex-col-reverse gap-2.5 sm:flex-row pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!canAfford || isPurchasing}
                onClick={handleConfirm}
                className={`flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-xs shadow-md active:scale-95 transition-all cursor-pointer ${
                  isFreeWithPlan
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-purple-500/25"
                    : "bg-[#2D9E6B] hover:bg-[#238357] shadow-emerald-500/20"
                }`}
              >
                <Unlock size={14} />
                <span>
                  {isFreeWithPlan
                    ? "Confirm Free Unlock (0 Coins)"
                    : `Confirm Unlock (${lead.coinCost} Coins)`}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* ── Stage: Purchasing ── */}
        {stage === "purchasing" && (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-slate-200 border-t-[#2D9E6B]" />
            <p className="text-xs font-bold text-[#0F2540]">
              Unlocking lead and verifying slot availability…
            </p>
          </div>
        )}

        {/* ── Stage: Success + Apply ── */}
        {stage === "success" && contact && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4.5 space-y-2.5 text-xs">
              <div className="flex items-center gap-2 font-bold text-[#0F2540]">
                <Shield size={16} className="text-[#2D9E6B]" />
                <span>Parent Contact Information</span>
              </div>

              <div className="space-y-1.5 text-slate-800">
                {contact.name && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-semibold">Parent Name:</span>
                    <span className="font-bold text-[#0F2540]">{contact.name}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">Phone:</span>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-[#0F2540] font-mono">{contact.phone ?? "—"}</span>
                    {contact.phone && <CopyButton text={contact.phone} />}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">Email:</span>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-[#0F2540]">{contact.email}</span>
                    <CopyButton text={contact.email} />
                  </div>
                </div>
                {(contact.area || contact.city || contact.pincode) && (
                  <div className="flex items-start justify-between">
                    <span className="text-slate-500 font-semibold">Address:</span>
                    <span className="font-semibold text-slate-700 text-right max-w-xs">
                      {[contact.area, contact.city, contact.pincode].filter(Boolean).join(", ")}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Proposal form */}
            <form action={appAction} className="space-y-3 pt-1">
              <input type="hidden" name="purchaseId" value={purchaseId} />

              <label className="block text-xs font-bold text-[#0F2540]">
                Send an In-App Proposal <span className="text-slate-400 font-normal">(Optional)</span>
              </label>

              {appState.error && <FormAlert tone="error" message={appState.error} />}
              {appState.success && (
                <FormAlert tone="success" message="Proposal sent successfully!" />
              )}

              <textarea
                name="proposalNote"
                rows={2}
                placeholder="Introduce yourself — teaching experience, relevant results, and schedule availability…"
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
                  placeholder="Expected Monthly / Hourly Fee Quote (₹)"
                  className="w-full rounded-2xl pl-9 pr-3.5 py-2.5 bg-white border border-slate-200 text-xs font-semibold text-slate-900 outline-none focus:border-[#2D9E6B]"
                />
              </div>

              <div className="flex flex-col-reverse gap-2.5 sm:flex-row pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Done / Close
                </button>
                <button
                  type="submit"
                  disabled={appPending}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] text-white font-extrabold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
                >
                  <Send size={13} />
                  <span>{appPending ? "Sending…" : "Send Proposal to Parent"}</span>
                </button>
              </div>
            </form>
          </div>
        )}

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
