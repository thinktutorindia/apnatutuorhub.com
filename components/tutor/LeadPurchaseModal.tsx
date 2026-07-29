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
      className="ml-1.5 rounded-md border border-[#0F172A] p-1 text-slate-500 hover:bg-slate-100"
    >
      {copied ? (
        <CheckCircle2 size={12} className="text-[#22C55E]" />
      ) : (
        <Copy size={12} />
      )}
    </button>
  );
}

export function LeadPurchaseModal({
  lead,
  walletBalance,
  onClose,
}: {
  lead: LeadSummary;
  walletBalance: number;
  onClose: () => void;
}) {
  const [stage, setStage] = useState<Stage>("confirm");
  const [errorMsg, setErrorMsg] = useState("");
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [contact, setContact] = useState<ParentContact | null>(null);
  const [purchaseId, setPurchaseId] = useState<string>("");

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

  const canAfford = walletBalance >= lead.coinCost;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#0F172A]/40 p-4 py-10 backdrop-blur-sm">
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
        className="neu-card relative z-10 w-full max-w-lg bg-white p-6"
      >
        {/* Header */}
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-[#0F172A]">
              {stage === "success" ? "Lead Unlocked! 🎉" : "Unlock Lead"}
            </h2>
            <p className="text-[11px] font-semibold text-slate-500">
              {lead.classLevel} · {lead.subjects.slice(0, 3).join(", ")}
            </p>
          </div>
          {stage !== "purchasing" && (
            <button
              type="button"
              onClick={onClose}
              className="neu-btn neu-btn-white h-9 w-9 !p-0"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* ── Stage: Confirm ── */}
        {stage === "confirm" && (
          <div className="space-y-5">
            <div className="rounded-2xl border-2 border-[#0F172A] bg-[#FEF3C7] p-5 text-center">
              <p className="text-xs font-extrabold uppercase text-slate-500">
                Coin Cost
              </p>
              <p className="mt-1 text-5xl font-black text-[#0F172A]">
                🪙 {lead.coinCost}
              </p>
              <p className="mt-1 text-xs font-bold text-slate-600">
                Your balance: {walletBalance} coins
              </p>
            </div>

            <div className="space-y-2 rounded-2xl border-2 border-[#0F172A] bg-[#DCFCE7] p-4 text-sm font-semibold text-slate-700">
              <p className="font-extrabold text-[#0F172A]">What you unlock:</p>
              <ul className="space-y-1 text-xs">
                <li className="flex items-center gap-2">
                  <Phone size={13} className="text-[#22C55E]" /> Parent&apos;s phone number
                </li>
                <li className="flex items-center gap-2">
                  <Mail size={13} className="text-[#22C55E]" /> Parent&apos;s email address
                </li>
                <li className="flex items-center gap-2">
                  <MapPin size={13} className="text-[#22C55E]" /> Exact area & pincode
                </li>
              </ul>
            </div>

            {!canAfford && (
              <FormAlert
                tone="error"
                message={`You need ${lead.coinCost - walletBalance} more coins. Top up your wallet first.`}
              />
            )}

            <div className="flex gap-3">
              <button
                type="button"
                disabled={!canAfford || isPurchasing}
                onClick={handleConfirm}
                className="neu-btn neu-btn-primary flex-1 py-3.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Unlock size={16} />
                <span>Confirm — Use {lead.coinCost} Coins</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="neu-btn neu-btn-white px-5 py-3.5 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── Stage: Purchasing ── */}
        {stage === "purchasing" && (
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <div className="h-12 w-12 animate-spin rounded-full border-[4px] border-[#E2E8F0] border-t-[#22C55E]" />
            <p className="text-sm font-extrabold text-[#0F172A]">
              Unlocking lead…
            </p>
          </div>
        )}

        {/* ── Stage: Success + Apply ── */}
        {stage === "success" && contact && (
          <div className="space-y-5">
            <div className="rounded-2xl border-2 border-[#22C55E] bg-[#DCFCE7] p-5">
              <p className="mb-3 flex items-center gap-2 text-sm font-extrabold text-[#0F172A]">
                <Shield size={16} className="text-[#22C55E]" />
                Parent Contact Details
              </p>
              <div className="space-y-2 text-sm">
                {contact.name && (
                  <div className="flex items-center gap-2">
                    <span className="w-16 text-[11px] font-black uppercase text-slate-500">
                      Name
                    </span>
                    <span className="font-extrabold text-[#0F172A]">
                      {contact.name}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="w-16 text-[11px] font-black uppercase text-slate-500">
                    Phone
                  </span>
                  <span className="font-extrabold text-[#0F172A]">
                    {contact.phone ?? "Not provided"}
                  </span>
                  {contact.phone && <CopyButton text={contact.phone} />}
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-16 text-[11px] font-black uppercase text-slate-500">
                    Email
                  </span>
                  <span className="break-all font-extrabold text-[#0F172A]">
                    {contact.email}
                  </span>
                  <CopyButton text={contact.email} />
                </div>
                {(contact.area || contact.city || contact.pincode) && (
                  <div className="flex items-start gap-2">
                    <span className="w-16 shrink-0 text-[11px] font-black uppercase text-slate-500">
                      Address
                    </span>
                    <span className="font-extrabold text-[#0F172A]">
                      {[contact.area, contact.city, contact.pincode]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Proposal form */}
            <form action={appAction} className="space-y-4">
              <input type="hidden" name="purchaseId" value={purchaseId} />

              <p className="text-xs font-extrabold text-[#0F172A]">
                Send a Proposal{" "}
                <span className="font-semibold text-slate-400">(recommended)</span>
              </p>

              {appState.error && <FormAlert tone="error" message={appState.error} />}
              {appState.success && (
                <FormAlert tone="success" message="Proposal sent!" />
              )}

              <textarea
                name="proposalNote"
                rows={3}
                placeholder="Introduce yourself — your teaching style, experience with this level, and why you're a great fit…"
                className="neu-input resize-none text-sm"
              />

              <div className="relative">
                <IndianRupee
                  size={14}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  name="feeQuote"
                  type="number"
                  min={0}
                  step={50}
                  placeholder="Your fee quote (₹/hr)"
                  className="neu-input pl-10 text-sm"
                />
              </div>
              <FieldError messages={appState.fieldErrors?.proposalNote} />

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={appPending}
                  className="neu-btn neu-btn-primary flex-1 py-3 text-sm"
                >
                  <Send size={15} />
                  <span>{appPending ? "Sending…" : "Send Proposal"}</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="neu-btn neu-btn-white px-5 py-3 text-sm"
                >
                  Skip
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
                className="neu-btn neu-btn-primary flex-1 py-3 text-sm"
              >
                Try Again
              </button>
              <button
                type="button"
                onClick={onClose}
                className="neu-btn neu-btn-white px-5 py-3 text-sm"
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
