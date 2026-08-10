"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Wallet, X, Ticket, Tag, AlertCircle } from "lucide-react";
import { CoinPackageGrid } from "@/components/wallet/CoinPackageGrid";
import {
  createCoinOrderAction,
  confirmCoinPaymentAction,
} from "@/app/actions/wallet.actions";
import { validateCouponAction, type ValidateCouponResult } from "@/app/actions/coupon.actions";
import type { CoinPackageId } from "@/lib/razorpay";

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

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<ValidateCouponResult | null>(null);

  const scriptLoaded = useRef(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && modalState !== "paying") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose, modalState]);

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

  const handleApplyCoupon = async (packagePriceInr: number = 500) => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError(null);

    const res = await validateCouponAction(couponCode.trim(), packagePriceInr);
    setCouponLoading(false);

    if (!res.success || !res.data) {
      setCouponError(res.error ?? "Invalid coupon code");
      setAppliedCoupon(null);
    } else {
      setAppliedCoupon(res.data);
      setCouponError(null);
    }
  };

  const handleSelectPackage = async (pkgId: CoinPackageId) => {
    setLoadingPkg(pkgId);
    setErrorMsg("");

    const result = await createCoinOrderAction(pkgId, appliedCoupon?.code);
    setLoadingPkg(null);

    if (!result.success || !result.data) {
      setErrorMsg(result.error ?? "Failed to create order. Please try again.");
      return;
    }

    const { orderId, amount, currency, keyId, totalCoins } = result.data;

    if (!window.Razorpay) {
      setErrorMsg("Razorpay checkout script not loaded. Please refresh and try again.");
      return;
    }

    setModalState("paying");

    const rzp = new window.Razorpay({
      key: keyId,
      amount,
      currency,
      order_id: orderId,
      name: "ApnaTutorHub",
      description: `${result.data.packageName} — ${totalCoins} Coins ${appliedCoupon ? `(Coupon ${appliedCoupon.code})` : ""}`,
      image: "/logo.png",
      prefill: {
        name: userName,
        email: userEmail,
        contact: "9999999999",
      },
      theme: { color: "#1A7F5A" },
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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 py-10 backdrop-blur-xs">
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
        className="relative z-10 w-full max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl bg-white p-6 space-y-5 shadow-xl border border-gray-200"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <Wallet size={20} />
            </div>
            <div>
              <h2 id="topup-modal-title" className="text-lg font-700 text-gray-900">
                Top Up Coins
              </h2>
              <p className="text-xs text-gray-500">
                Secure payment via Razorpay · Apply coupon codes for instant discounts!
              </p>
            </div>
          </div>
          {modalState !== "paying" && (
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Coupon Code Redemption Input Section */}
        {modalState === "packages" && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Ticket size={16} className="text-amber-700" />
              <span className="text-xs font-600 text-gray-900 uppercase tracking-wide">
                Have a Coupon Code?
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Tag size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Enter code (e.g. WELCOME50, APNATUTOR25)"
                  className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-4 py-2 text-xs font-600 text-gray-900 uppercase outline-none focus:border-green-600 placeholder:text-gray-400 placeholder:normal-case font-mono"
                />
              </div>

              <button
                type="button"
                onClick={() => handleApplyCoupon(500)}
                disabled={couponLoading || !couponCode.trim()}
                className="at-btn at-btn-accent at-btn-sm shrink-0 w-full sm:w-auto"
              >
                {couponLoading ? "Checking..." : "Apply Coupon"}
              </button>
            </div>

            {/* Pre-defined Coupon Quick Suggestion Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] font-500 text-gray-500 mr-1">Available Coupons:</span>
              {[
                { code: "NEWJOINING", label: "₹50 OFF" },
                { code: "WELCOME50", label: "₹50 OFF" },
                { code: "SUPER100", label: "₹100 OFF" },
                { code: "APNATUTOR25", label: "25% OFF" },
              ].map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    setCouponCode(c.code);
                    handleApplyCoupon(500);
                  }}
                  className="rounded-md border border-amber-300 bg-white px-2 py-0.5 text-[11px] font-600 text-amber-800 hover:bg-amber-100 cursor-pointer transition-colors"
                >
                  🏷️ {c.code} ({c.label})
                </button>
              ))}
            </div>
            {couponError && (
              <div className="flex items-center gap-1.5 text-xs font-500 text-red-600">
                <AlertCircle size={14} />
                <span>{couponError}</span>
              </div>
            )}

            {/* Applied Coupon Badge */}
            {appliedCoupon && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-green-50 border border-green-200 p-2.5 text-xs text-gray-900">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 size={16} className="text-green-600 shrink-0" />
                  <span className="min-w-0">
                    Coupon <strong>"{appliedCoupon.code}"</strong> Applied! Discount: ₹{appliedCoupon.discountAmountInr} OFF
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAppliedCoupon(null);
                    setCouponCode("");
                  }}
                  className="text-gray-500 hover:text-gray-800 underline text-xs"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        )}

        {/* States */}
        {modalState === "packages" && (
          <>
            {errorMsg && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-500 text-red-600">
                {errorMsg}
              </div>
            )}
            <CoinPackageGrid onSelect={handleSelectPackage} loading={loadingPkg} appliedCoupon={appliedCoupon} />
          </>
        )}

        {modalState === "paying" && (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-green-600" />
            <p className="text-sm font-600 text-gray-900">
              Razorpay checkout is open…
            </p>
            <p className="text-xs text-gray-500">
              Complete the payment in the Razorpay popup. Do not close this window.
            </p>
          </div>
        )}

        {modalState === "success" && (
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600">
              <CheckCircle2 size={32} />
            </div>
            <div>
              <p className="text-2xl font-700 text-gray-900">
                🪙 {creditedCoins} Coins Added!
              </p>
              <p className="mt-1 text-sm text-gray-600">
                Your wallet has been updated. Start connecting with students!
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="at-btn at-btn-primary px-8 py-2.5 text-sm"
            >
              Done
            </button>
          </div>
        )}

        {modalState === "error" && (
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <p className="text-sm font-500 text-red-600">{errorMsg}</p>
            <button
              type="button"
              onClick={() => setModalState("packages")}
              className="at-btn at-btn-primary px-6 py-2.5 text-sm"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
