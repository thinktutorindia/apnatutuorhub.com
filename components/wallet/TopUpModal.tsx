"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Wallet, X } from "lucide-react";
import { CoinPackageGrid } from "@/components/wallet/CoinPackageGrid";
import {
  createCoinOrderAction,
  confirmCoinPaymentAction,
} from "@/app/actions/wallet.actions";
import type { CoinPackageId } from "@/lib/razorpay";

// Minimal type shim for the Razorpay Checkout.js script
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: new (options: Record<string, any>) => { open: () => void };
  }
}

type ModalState = "packages" | "paying" | "success" | "error";

export function TopUpModal({
  userEmail,
  userName,
  onClose,
  onSuccess,
}: {
  userEmail: string;
  userName: string;
  onClose: () => void;
  onSuccess: (coins: number) => void;
}) {
  const [modalState, setModalState] = useState<ModalState>("packages");
  const [loadingPkg, setLoadingPkg] = useState<CoinPackageId | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [creditedCoins, setCreditedCoins] = useState(0);
  const scriptLoaded = useRef(false);

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && modalState !== "paying") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose, modalState]);

  // Load Razorpay checkout script once on mount
  useEffect(() => {
    if (scriptLoaded.current) return;
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      scriptLoaded.current = true;
    };
    document.head.appendChild(script);
    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  const handleSelectPackage = async (pkgId: CoinPackageId) => {
    setLoadingPkg(pkgId);
    setErrorMsg("");

    const result = await createCoinOrderAction(pkgId);

    setLoadingPkg(null);

    if (!result.success || !result.data) {
      setErrorMsg(result.error ?? "Failed to create order. Please try again.");
      return;
    }

    const { orderId, amount, currency, keyId, totalCoins } = result.data;

    if (!window.Razorpay) {
      setErrorMsg(
        "Razorpay checkout script not loaded. Please refresh and try again."
      );
      return;
    }

    setModalState("paying");

    const rzp = new window.Razorpay({
      key: keyId,
      amount,
      currency,
      order_id: orderId,
      name: "ApnaTutorHub",
      description: `${result.data.packageName} — ${totalCoins} Coins`,
      image: "/logo.png",
      prefill: {
        name: userName,
        email: userEmail,
        contact: "9999999999", // Required by Razorpay for UPI method display
      },
      config: {
        display: {
          blocks: {
            upi: {
              name: "Pay via UPI (GPay, PhonePe, Paytm, QR)",
              instruments: [
                {
                  method: "upi",
                },
              ],
            },
          },
          sequence: ["block.upi", "block.other"],
          preferences: {
            show_default_blocks: true,
          },
        },
      },
      theme: { color: "#22C55E" },
      handler: async (response: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }) => {
        setModalState("paying");
        const confirmRes = await confirmCoinPaymentAction({
          orderId: response.razorpay_order_id,
          paymentId: response.razorpay_payment_id,
          signature: response.razorpay_signature,
          packageId: pkgId,
        });

        if (confirmRes.success) {
          setCreditedCoins(totalCoins);
          setModalState("success");
          onSuccess(totalCoins);
        } else {
          setErrorMsg(confirmRes.error ?? "Failed to confirm payment.");
          setModalState("error");
        }
      },
      modal: {
        ondismiss: () => {
          setModalState("packages");
        },
      },
    });

    rzp.open();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#0F172A]/40 p-4 py-10 backdrop-blur-sm">
      {/* Backdrop */}
      {modalState !== "paying" && (
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
        aria-labelledby="topup-modal-title"
        className="neu-card relative z-10 w-full max-w-2xl bg-white p-6"
      >
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[#0F172A] bg-[#FEF3C7]">
              <Wallet size={20} />
            </div>
            <div>
              <h2
                id="topup-modal-title"
                className="text-xl font-black text-[#0F172A]"
              >
                Top Up Coins
              </h2>
              <p className="text-[11px] font-semibold text-slate-500">
                Secure payment via Razorpay · Coins credited instantly
              </p>
            </div>
          </div>
          {modalState !== "paying" && (
            <button
              type="button"
              onClick={onClose}
              className="neu-btn neu-btn-white h-9 w-9 !p-0"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* States */}
        {modalState === "packages" && (
          <>
            {errorMsg && (
              <div className="mb-4 rounded-xl border-2 border-red-500 bg-red-50 px-4 py-3 text-xs font-bold text-red-600">
                {errorMsg}
              </div>
            )}
            <CoinPackageGrid onSelect={handleSelectPackage} loading={loadingPkg} />
          </>
        )}

        {modalState === "paying" && (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="h-14 w-14 animate-spin rounded-full border-[4px] border-[#E2E8F0] border-t-[#22C55E]" />
            <p className="text-sm font-extrabold text-[#0F172A]">
              Razorpay checkout is open…
            </p>
            <p className="text-xs font-semibold text-slate-500">
              Complete the payment in the Razorpay popup. Do not close this window.
            </p>
          </div>
        )}

        {modalState === "success" && (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-[2.5px] border-[#0F172A] bg-[#DCFCE7] shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
              <CheckCircle2 size={32} className="text-[#22C55E]" />
            </div>
            <div>
              <p className="text-2xl font-black text-[#0F172A]">
                🪙 {creditedCoins} Coins Added!
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-600">
                Your wallet has been updated. Start browsing leads!
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="neu-btn neu-btn-primary px-8 py-3 text-sm"
            >
              Done
            </button>
          </div>
        )}

        {modalState === "error" && (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <p className="text-sm font-bold text-red-500">{errorMsg}</p>
            <button
              type="button"
              onClick={() => setModalState("packages")}
              className="neu-btn neu-btn-primary px-6 py-3 text-sm"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
