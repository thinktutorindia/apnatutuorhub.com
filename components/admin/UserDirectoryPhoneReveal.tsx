"use client";

import React, { useState } from "react";
import { Lock, Eye, Phone, MessageCircle, Loader2 } from "lucide-react";
import { revealUserDirectoryPhoneAction } from "@/app/actions/staff-presence.actions";

interface UserDirectoryPhoneRevealProps {
  userId: string;
  userName?: string | null;
  maskedPhone?: string | null;
  initialRawPhone?: string | null;
  isSuperAdmin?: boolean;
}

export function UserDirectoryPhoneReveal({
  userId,
  userName,
  maskedPhone,
  initialRawPhone,
  isSuperAdmin = false,
}: UserDirectoryPhoneRevealProps) {
  const [revealedPhone, setRevealedPhone] = useState<string | null>(initialRawPhone || null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // If Super Admin, show raw phone directly
  if (isSuperAdmin) {
    if (!initialRawPhone) {
      return (
        <p className="mt-0.5 text-[10px] font-bold text-amber-900 bg-amber-50 inline-flex px-1.5 py-0.5 rounded border border-amber-200">
          No mobile on file
        </p>
      );
    }
    const cleanDigits = initialRawPhone.replace(/\D/g, "");
    return (
      <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
        <a
          href={`tel:${initialRawPhone}`}
          className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#0F2540] hover:text-[#2D9E6B] transition-colors"
        >
          <Phone size={10} className="text-[#2D9E6B]" />
          <span>{initialRawPhone}</span>
        </a>
        <a
          href={`https://wa.me/91${cleanDigits}?text=${encodeURIComponent(
            `Hello ${userName || "User"}! Greeting from ApnaTutorHub.`
          )}`}
          target="_blank"
          rel="noreferrer"
          className="text-emerald-700 hover:text-emerald-800 p-0.5"
          title="Direct WhatsApp"
        >
          <MessageCircle size={12} />
        </a>
      </div>
    );
  }

  // Staff / Sub-Admin view:
  if (!maskedPhone) {
    return (
      <p
        className="mt-0.5 text-[10px] font-bold text-amber-900 bg-amber-50 inline-flex px-1.5 py-0.5 rounded border border-amber-200"
        title="Add mobile from Edit — staff can fill it when missing."
      >
        No mobile on file
      </p>
    );
  }

  // Already revealed in this session
  if (revealedPhone) {
    const cleanDigits = revealedPhone.replace(/\D/g, "");
    return (
      <div className="mt-0.5 flex items-center gap-1.5 flex-wrap animate-in fade-in-50">
        <a
          href={`tel:${revealedPhone}`}
          onClick={() => {
            try {
              localStorage.setItem(
                "ath_recent_dial",
                JSON.stringify({ leadId: userId, leadName: userName || "User", phone: revealedPhone, time: Date.now() })
              );
            } catch {}
          }}
          className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-300 font-mono transition-colors"
          title="Click to dial on phone"
        >
          <Phone size={10} className="text-emerald-600" />
          <span>{revealedPhone}</span>
        </a>
        <a
          href={`https://wa.me/91${cleanDigits}?text=${encodeURIComponent(
            `Hello ${userName || "User"}! Greeting from ApnaTutorHub Support.`
          )}`}
          target="_blank"
          rel="noreferrer"
          className="text-emerald-700 hover:text-emerald-800 p-0.5"
          title="WhatsApp Chat"
        >
          <MessageCircle size={13} />
        </a>
      </div>
    );
  }

  const handleReveal = async () => {
    if (loading) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await revealUserDirectoryPhoneAction(userId);
      if (res.success && res.data?.allowed && res.data.phone) {
        setRevealedPhone(res.data.phone);
      } else {
        setErrorMsg(res.data?.reason || res.error || "Cannot reveal phone number");
      }
    } catch {
      setErrorMsg("Failed to reveal phone number");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-0.5 space-y-1">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span
          className="flex items-center gap-1 text-[11px] font-bold text-slate-500 font-mono"
          title="Phone number masked for staff security. Tap reveal to view (100 daily limit)."
        >
          <Lock size={10} className="text-amber-500 shrink-0" />
          <span>{maskedPhone}</span>
        </span>
        <button
          type="button"
          onClick={handleReveal}
          disabled={loading}
          className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-800 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 border border-emerald-300 rounded-lg px-2 py-0.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          title="Reveal phone number (Counts against your 100 daily quota)"
        >
          {loading ? (
            <Loader2 size={10} className="animate-spin text-emerald-700" />
          ) : (
            <Eye size={10} className="text-emerald-700" />
          )}
          <span>{loading ? "Revealing..." : "Reveal"}</span>
        </button>
      </div>
      {errorMsg && (
        <span className="text-[10px] font-bold text-red-600 block animate-in fade-in-50">
          ⚠️ {errorMsg}
        </span>
      )}
    </div>
  );
}
