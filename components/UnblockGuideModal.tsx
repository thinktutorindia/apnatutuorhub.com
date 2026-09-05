"use client";

import React from "react";
import { Lock, RefreshCw, X, ArrowRight, MousePointerClick, ToggleRight } from "lucide-react";

export function UnblockGuideModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 overflow-hidden space-y-4"
      >
        {/* Soft background glow */}
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-36 h-36 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 shadow-sm shrink-0">
              <Lock size={20} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#0F2540] leading-tight">
                Enable Notifications in Chrome
              </h3>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                Notifications are currently blocked in your browser
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        {/* Visual Mockup of Chrome Address Bar Dropdown */}
        <div className="rounded-2xl bg-slate-900 p-3.5 text-white space-y-2.5 shadow-md">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-300 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
            <Lock size={12} className="text-emerald-400" />
            <span className="font-semibold text-white">apnatutorhub.com</span>
          </div>

          <div className="rounded-xl bg-slate-800/90 p-2.5 space-y-1.5 border border-slate-700/80 text-xs">
            <div className="flex items-center justify-between py-0.5">
              <span className="text-slate-200 font-semibold text-[11px]">🔔 Notifications</span>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-emerald-400">Switch ON →</span>
                <div className="h-4.5 w-8 rounded-full bg-[#16A34A] p-0.5 flex items-center justify-end">
                  <div className="h-3.5 w-3.5 rounded-full bg-white shadow-xs" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step-by-Step Instructions */}
        <div className="space-y-2 text-xs">
          <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-100">
            <MousePointerClick size={15} className="mt-0.5 shrink-0 text-[#16A34A]" />
            <div>
              <p className="font-bold text-[#0F2540]">Step 1: Click the 🔒 Lock Icon</p>
              <p className="text-[11px] text-slate-600">
                At the top left of your browser next to the URL.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-amber-50/80 border border-amber-100">
            <ToggleRight size={15} className="mt-0.5 shrink-0 text-amber-600" />
            <div>
              <p className="font-bold text-[#0F2540]">Step 2: Turn Notifications ON</p>
              <p className="text-[11px] text-slate-600">
                Toggle the switch next to <strong>Notifications</strong> to ON or click <strong>Reset permission</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={() => {
            onClose();
            window.location.reload();
          }}
          className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#16A34A] to-[#15803D] hover:from-[#15803D] hover:to-[#166534] text-white font-extrabold text-xs sm:text-sm shadow-md shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
        >
          <RefreshCw size={15} />
          <span>I&apos;ve Turned It On — Refresh Page</span>
        </button>
      </div>
    </div>
  );
}
