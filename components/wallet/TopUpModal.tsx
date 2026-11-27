"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Wallet, X, Ticket, Tag, AlertCircle, Zap, Lock, ArrowLeft } from "lucide-react";
import { CoinPackageGrid } from "@/components/wallet/CoinPackageGrid";
import { validateCouponAction, type ValidateCouponResult } from "@/app/actions/coupon.actions";
import { createCoinOrderAction, confirmCoinPaymentAction } from "@/app/actions/wallet.actions";
import {
  COIN_PACKAGES,
  COIN_TOPUP_ENABLED,
  COIN_TOPUP_UNAVAILABLE_MSG,
  type CoinPackageId,
} from "@/lib/razorpay";
import { UpiQrPaymentCard } from "@/components/payment/UpiQrPaymentCard";
import { TermsAgreementCheckbox } from "@/components/payment/TermsAgreementCheckbox";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: new (options: Record<string, any>) => { open: () => void };
  }
}

type ModalState = "packages" | "checkout_choice" | "qr_payment" | "submitted" | "paying" | "success" | "error";

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
  const [selectedPkg, setSelectedPkg] = useState<any>(null);
  const [submittedReqId, setSubmittedReqId] = useState<string>("");
  const [loadingPkg, setLoadingPkg] = useState<CoinPackageId | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [creditedCoins, setCreditedCoins] = useState(0);
  const [termsAccepted, setTermsAccepted] = useState(false);

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

  const handleSelectPackage = (pkgId: CoinPackageId) => {
    if (!COIN_TOPUP_ENABLED) {
      setErrorMsg(COIN_TOPUP_UNAVAILABLE_MSG);
      return;
    }
    const pkg = COIN_PACKAGES.find((p: any) => p.id === pkgId);
    if (!pkg) return;
    setSelectedPkg(pkg);
    setTermsAccepted(false);
    setModalState("checkout_choice");
  };

  const handleOnlineCoinCheckout = async (pkgId: CoinPackageId) => {
    if (!COIN_TOPUP_ENABLED) {
      setErrorMsg(COIN_TOPUP_UNAVAILABLE_MSG);
      return;
    }
    if (!termsAccepted) {
      setErrorMsg("Please accept the Terms & Conditions before proceeding to payment.");
      return;
    }
    const pkg = COIN_PACKAGES.find((p: any) => p.id === pkgId);
    if (!pkg) return;
    setLoadingPkg(pkgId);
    setErrorMsg("");

    try {
      const res = await createCoinOrderAction(pkgId, appliedCoupon?.code);
      if (!res.success || !res.data) {
        throw new Error(res.error || "Failed to create payment order");
      }

      const orderData = res.data;
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "ApnaTutorHub",
        description: `${orderData.packageName} (${orderData.totalCoins} Coins)`,
        order_id: orderData.orderId,
        prefill: {
          name: userName,
          email: userEmail,
        },
        theme: {
          color: "#2D9E6B",
        },
        handler: async function (response: any) {
          setModalState("paying");
          const confirmRes = await confirmCoinPaymentAction({
            orderId: response.razorpay_order_id,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
            packageId: pkgId,
          });

          if (confirmRes.success && confirmRes.data) {
            setCreditedCoins(orderData.totalCoins);
            setModalState("success");
            onSuccess(orderData.totalCoins);
          } else {
            setErrorMsg(confirmRes.error || "Payment verification failed");
            setModalState("error");
          }
        },
        modal: {
          ondismiss: () => {
            setModalState("checkout_choice");
            setLoadingPkg(null);
          },
        },
      };

      const razorpayWindow = (window as any).Razorpay;
      if (razorpayWindow) {
        setModalState("paying");
        const rzp = new razorpayWindow(options);
        rzp.open();
      } else {
        setSelectedPkg(pkg);
        setModalState("qr_payment");
      }
    } catch (err: any) {
      console.warn("Razorpay error, falling back to QR", err);
      setErrorMsg(err.message || "Failed to open online payment. You can pay via UPI QR below.");
      setSelectedPkg(pkg);
      setModalState("qr_payment");
    } finally {
      setLoadingPkg(null);
    }
  };

  const getFinalPrice = (basePrice: number) => {
    if (!appliedCoupon) return basePrice;
    return Math.max(1, basePrice - (appliedCoupon.discountAmountInr ?? 0));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 py-8 backdrop-blur-xs">
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
        className="relative z-10 w-full max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl bg-white p-6 space-y-5 shadow-2xl border border-gray-200"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <Wallet size={20} />
            </div>
            <div>
              <h2 id="topup-modal-title" className="text-lg font-800 text-gray-900">
                Top Up Coins
              </h2>
              <p className="text-xs text-gray-500 font-medium">
                {COIN_TOPUP_ENABLED
                  ? "Scan UPI QR to pay via any UPI app · Instant admin verification!"
                  : "Coin top-up packs are currently unavailable · Activate Starter Plan (₹1,257)"}
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
        {modalState === "packages" && COIN_TOPUP_ENABLED && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Ticket size={16} className="text-amber-700" />
                <span className="text-xs font-700 text-amber-900">Have a Promo or Referral Coupon?</span>
              </div>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Enter code (e.g. NEWJOINING, APNATUTOR25)"
                  className="w-full pl-9 pr-3 py-2 text-xs uppercase font-700 tracking-wider rounded-xl border border-amber-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <button
                type="button"
                onClick={() => handleApplyCoupon(500)}
                disabled={couponLoading || !couponCode.trim()}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-700 shrink-0 disabled:opacity-50 transition-colors"
              >
                {couponLoading ? "Checking..." : "Apply"}
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
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-green-50 border border-green-200 p-2.5 text-xs text-gray-900">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 size={16} className="text-green-600 shrink-0" />
                  <span className="min-w-0 font-bold">
                    Coupon &quot;{appliedCoupon.code}&quot; Applied! Discount: ₹{appliedCoupon.discountAmountInr} OFF
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAppliedCoupon(null);
                    setCouponCode("");
                  }}
                  className="text-gray-500 hover:text-gray-800 underline text-xs font-bold"
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
            {!COIN_TOPUP_ENABLED && (
              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-800 text-amber-950 flex items-center gap-1.5">
                    <AlertCircle size={16} className="text-amber-600 shrink-0" />
                    <span>Coin Top-Up Currently Unavailable</span>
                  </p>
                  <p className="text-xs text-amber-900/90 font-medium leading-relaxed">
                    {COIN_TOPUP_UNAVAILABLE_MSG}
                  </p>
                </div>
                <Link
                  href="/tutor/plans?checkout=STARTER"
                  onClick={onClose}
                  className="shrink-0 inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-[#0F2540] hover:bg-[#1A3C5E] !text-white text-xs font-800 whitespace-nowrap transition-colors shadow-xs"
                >
                  Move to Starter Plan (₹1,257) →
                </Link>
              </div>
            )}
            {errorMsg && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-500 text-red-600">
                {errorMsg}
              </div>
            )}
            <CoinPackageGrid
              onSelect={handleSelectPackage}
              loading={loadingPkg}
              appliedCoupon={appliedCoupon}
              disabled={!COIN_TOPUP_ENABLED}
            />
          </>
        )}

        {/* Checkout Method Choice (Instant Online vs Manual UPI QR) */}
        {modalState === "checkout_choice" && selectedPkg && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <button
              type="button"
              onClick={() => setModalState("packages")}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Back to Packages</span>
            </button>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">
                    Selected Coin Pack
                  </span>
                  <h3 className="text-lg font-black text-gray-900 mt-0.5">
                    🪙 {selectedPkg.name} ({selectedPkg.totalCoins} Coins)
                  </h3>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-[#0F2540]">
                    ₹{getFinalPrice(selectedPkg.priceInr).toLocaleString("en-IN")}
                  </div>
                  {appliedCoupon && (
                    <span className="text-[11px] font-bold text-emerald-700">
                      Saved ₹{appliedCoupon.discountAmountInr} with {appliedCoupon.code}
                    </span>
                  )}
                </div>
              </div>

              <p className="text-xs text-gray-600 leading-relaxed font-medium">
                Unlock high-intent parent inquiries instantly with coins. Unlocked contacts remain permanently accessible on your account.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <TermsAgreementCheckbox
                id="topup-terms-checkbox"
                checked={termsAccepted}
                onChange={setTermsAccepted}
              />
              <button
                type="button"
                disabled={loadingPkg !== null || !termsAccepted}
                onClick={() => handleOnlineCoinCheckout(selectedPkg.id)}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Zap size={15} />
                <span>
                  Pay Online (Instant Coins Credit) — ₹{getFinalPrice(selectedPkg.priceInr).toLocaleString("en-IN")} →
                </span>
              </button>

              <div className="flex items-center gap-2 my-1">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">or</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <button
                type="button"
                disabled={!termsAccepted}
                onClick={() => setModalState("qr_payment")}
                className="w-full py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Lock size={13} className="text-gray-500" />
                <span>Pay via Kotak UPI QR (Offline / Screenshot Transfer)</span>
              </button>
            </div>
          </div>
        )}

        {/* UPI QR Payment Step */}
        {modalState === "qr_payment" && selectedPkg && (
          <UpiQrPaymentCard
            type="COIN_TOPUP"
            title="Coin Top-Up Package"
            itemTitle={`${selectedPkg.name} — ${selectedPkg.totalCoins} Coins`}
            amountInr={getFinalPrice(selectedPkg.priceInr)}
            coinsAmount={selectedPkg.totalCoins}
            couponCode={appliedCoupon?.code}
            discountInr={appliedCoupon?.discountAmountInr ?? 0}
            onSuccess={(reqId: string) => {
              setSubmittedReqId(reqId);
              setModalState("submitted");
            }}
            onCancel={() => setModalState("packages")}
          />
        )}

        {/* Payment Submitted Confirmation */}
        {modalState === "submitted" && (
          <div className="flex flex-col items-center gap-4 py-10 text-center space-y-2">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 shadow-md">
              <CheckCircle2 size={36} />
            </div>
            <div>
              <span className="text-xs font-black uppercase text-emerald-600 tracking-wider">
                Payment Verification Pending
              </span>
              <h3 className="text-2xl font-black text-[#0F2540] mt-1">
                Payment Submitted! 🎉
              </h3>
              <p className="mt-2 text-xs text-gray-600 max-w-md mx-auto leading-relaxed">
                Your payment screenshot and UTR reference have been sent to our admin team. Once verified (usually within <strong>15–30 minutes</strong>), your coins will be automatically credited to your wallet.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 px-8 py-3 rounded-xl bg-[#0F2540] hover:bg-[#1A3C5E] text-white text-xs font-extrabold shadow-md cursor-pointer transition-all"
            >
              Done / Return to Wallet
            </button>
          </div>
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
              className="px-6 py-2.5 rounded-xl bg-[#0F2540] text-white text-xs font-bold"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
