"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import { Check, Copy, Upload, AlertCircle, CheckCircle2, Loader2, ArrowLeft, ShieldCheck } from "lucide-react";
import { submitManualPaymentAction } from "@/app/actions/manual-payment.actions";
import type { PaymentRequestType, SubscriptionPlan } from "@prisma/client";

interface UpiQrPaymentCardProps {
  type: PaymentRequestType;
  title: string;
  itemTitle: string;
  amountInr: number;
  coinsAmount?: number;
  plan?: SubscriptionPlan;
  couponCode?: string;
  discountInr?: number;
  onSuccess: (requestId: string) => void;
  onCancel: () => void;
}

export function UpiQrPaymentCard({
  type,
  title,
  itemTitle,
  amountInr,
  coinsAmount,
  plan,
  couponCode,
  discountInr = 0,
  onSuccess,
  onCancel,
}: UpiQrPaymentCardProps) {
  const [utrNumber, setUtrNumber] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const UPI_ID = "BHARATPE2E0T0B7N1S27616@unitype";
  const PAYEE_NAME = "RAKHI";

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(UPI_ID);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setErrorMsg("Screenshot file size cannot exceed 10MB.");
        return;
      }
      setScreenshotFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setErrorMsg(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanUtr = utrNumber.trim();
    if (!cleanUtr || cleanUtr.length < 6) {
      setErrorMsg("Please enter a valid 12-digit UPI Reference / UTR Number.");
      return;
    }

    if (!screenshotFile) {
      setErrorMsg("Please upload your payment screenshot as proof.");
      return;
    }

    setIsUploading(true);

    try {
      // 1. Upload screenshot
      const formData = new FormData();
      formData.append("file", screenshotFile);

      const uploadRes = await fetch("/api/upload/payment-proof", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.url) {
        throw new Error(uploadData.error || "Failed to upload screenshot. Please try again.");
      }

      // 2. Submit payment request action
      const result = await submitManualPaymentAction({
        type,
        plan,
        coinsAmount,
        amountInr,
        utrNumber: cleanUtr,
        screenshotUrl: uploadData.url,
        couponCode,
        discountInr,
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to submit payment request.");
      }

      onSuccess(result.data.requestId);
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={15} />
          <span>Change Package</span>
        </button>
        <span className="text-xs font-extrabold text-[#2D9E6B] bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
          Instant UPI QR Payment
        </span>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Package Summary Card */}
      <div className="bg-[#0F2540] text-white p-4 rounded-2xl flex items-center justify-between shadow-xs">
        <div>
          <span className="text-[11px] uppercase tracking-wider text-emerald-400 font-bold block">
            {title}
          </span>
          <p className="text-sm font-extrabold text-white">{itemTitle}</p>
          {couponCode && (
            <p className="text-[11px] text-amber-300 font-semibold">
              Coupon Applied: {couponCode} (-₹{discountInr})
            </p>
          )}
        </div>
        <div className="text-right">
          <span className="text-[11px] text-gray-300 block font-semibold">Amount to Pay</span>
          <p className="text-2xl font-black text-yellow-400">₹{amountInr}</p>
        </div>
      </div>

      {/* BharatPe QR Card */}
      <div className="bg-gradient-to-b from-slate-50 to-white border-2 border-slate-200/90 rounded-2xl p-4 sm:p-5 flex flex-col items-center text-center space-y-4 shadow-sm">
        <div className="relative w-56 h-72 sm:w-64 sm:h-80 rounded-xl overflow-hidden shadow-md border border-gray-200 bg-white">
          <Image
            src="/images/bharatpe-qr.jpg"
            alt="BharatPe UPI Scanner - RAKHI"
            fill
            className="object-contain"
            priority
          />
        </div>

        {/* UPI Details */}
        <div className="w-full max-w-sm space-y-2">
          <div className="bg-white p-2.5 rounded-xl border border-gray-200 flex items-center justify-between gap-2 shadow-xs">
            <div className="text-left overflow-hidden">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Verified Payee UPI ID</span>
              <p className="text-xs font-extrabold text-gray-800 truncate select-all">{UPI_ID}</p>
            </div>
            <button
              type="button"
              onClick={handleCopyUpi}
              className="px-3 py-1.5 rounded-lg bg-[#0F2540] hover:bg-[#1A3C5E] text-white text-xs font-bold shrink-0 flex items-center gap-1 transition-all"
            >
              {copiedUpi ? (
                <>
                  <Check size={12} className="text-emerald-400" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={12} />
                  <span>Copy UPI</span>
                </>
              )}
            </button>
          </div>
          <p className="text-[11px] text-gray-500 font-medium">
            Payee: <strong className="text-gray-800">{PAYEE_NAME}</strong> · Pay with Google Pay, PhonePe, Paytm, or any UPI app.
          </p>
        </div>
      </div>

      {/* Submission Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            UPI Reference / UTR Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={utrNumber}
            onChange={(e) => setUtrNumber(e.target.value)}
            placeholder="e.g. 4256XXXXXXXX (12-digit UTR)"
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#2D9E6B] focus:border-transparent"
          />
          <span className="text-[10.5px] text-gray-400 block mt-1">
            Found on your Google Pay / PhonePe / Paytm payment receipt under "UPI Transaction ID" or "UTR".
          </span>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            Upload Payment Screenshot <span className="text-red-500">*</span>
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            required
            onChange={handleFileChange}
            className="hidden"
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-gray-300 hover:border-[#2D9E6B] rounded-xl p-4 text-center cursor-pointer bg-slate-50/50 hover:bg-emerald-50/30 transition-all"
          >
            {previewUrl ? (
              <div className="flex items-center justify-center gap-3">
                <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-gray-200">
                  <Image src={previewUrl} alt="Screenshot preview" fill className="object-cover" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-gray-800 truncate max-w-[200px]">
                    {screenshotFile?.name}
                  </p>
                  <p className="text-[10.5px] text-emerald-600 font-bold">✓ Screenshot Selected (Click to change)</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-1 text-gray-500">
                <Upload size={22} className="text-gray-400" />
                <span className="text-xs font-bold text-gray-700">Tap to upload payment screenshot</span>
                <span className="text-[10px] text-gray-400">PNG, JPG, JPEG up to 10MB</span>
              </div>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={isUploading}
          className="w-full py-3 px-4 rounded-xl bg-[#2D9E6B] hover:bg-[#238357] text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed min-h-[46px]"
        >
          {isUploading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Verifying &amp; Submitting...</span>
            </>
          ) : (
            <>
              <ShieldCheck size={17} />
              <span>Submit Payment for Approval</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
