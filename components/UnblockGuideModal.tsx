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
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-[#0F172A]/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        className="neu-card relative z-10 w-full max-w-md bg-white p-6 space-y-5 shadow-[8px_8px_0px_0px_#0F172A]"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b-2 border-[#0F172A] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-[#0F172A] bg-[#FEF3C7] shadow-[2px_2px_0px_0px_#0F172A]">
              <Lock size={18} className="text-amber-600" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#0F172A] leading-tight">
                How to Enable Notifications in Chrome
              </h3>
              <p className="text-[11px] font-semibold text-slate-500">
                Your browser is currently blocking notification popups
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="neu-btn neu-btn-white h-8 w-8 !p-0 flex items-center justify-center cursor-pointer"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        {/* Visual Mockup of Chrome Address Bar Dropdown */}
        <div className="rounded-2xl border-2 border-[#0F172A] bg-[#0F172A] p-4 text-white space-y-3 shadow-[3px_3px_0px_0px_#22C55E]">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-300 bg-[#1E293B] px-3 py-1.5 rounded-lg border border-slate-700">
            <Lock size={12} className="text-emerald-400" />
            <span className="font-bold text-white">apnatutorhub.com</span>
          </div>

          {/* Simulated Chrome Dropdown */}
          <div className="rounded-xl bg-[#1E293B] p-3 space-y-2 border border-slate-700 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-slate-700/60">
              <div className="flex items-center gap-2 font-bold text-slate-200">
                <span>🔔 Notifications</span>
              </div>
              {/* Animated Toggle Switch */}
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-extrabold text-amber-400 animate-pulse">Switch ON →</span>
                <div className="h-5 w-9 rounded-full bg-[#22C55E] p-0.5 flex items-center justify-end cursor-pointer shadow-inner">
                  <div className="h-4 w-4 rounded-full bg-white shadow-md" />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span>Or click button:</span>
              <span className="rounded-md border border-slate-600 bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-300">
                Reset permission
              </span>
            </div>
          </div>
        </div>

        {/* Step-by-Step Instructions */}
        <div className="space-y-2 text-xs font-semibold text-slate-700">
          <div className="flex items-start gap-2.5 rounded-xl bg-[#DCFCE7] p-3 border-2 border-[#0F172A]">
            <MousePointerClick size={16} className="mt-0.5 shrink-0 text-[#22C55E]" />
            <div>
              <p className="font-black text-[#0F172A]">Step 1: Click the 🔒 Lock Icon</p>
              <p className="text-[11px] font-semibold text-slate-700">
                Look at the top left of your browser, next to the web address <code className="font-mono bg-white px-1 py-0.5 rounded border border-[#0F172A]">apnatutorhub.com</code>.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-xl bg-[#FEF3C7] p-3 border-2 border-[#0F172A]">
            <ToggleRight size={16} className="mt-0.5 shrink-0 text-amber-600" />
            <div>
              <p className="font-black text-[#0F172A]">Step 2: Turn Notifications Switch ON</p>
              <p className="text-[11px] font-semibold text-slate-700">
                Click the toggle switch next to <strong>Notifications</strong> to turn it <strong>ON (Blue/Green)</strong>, or click <strong>Reset permission</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-xl bg-[#E0F2FE] p-3 border-2 border-[#0F172A]">
            <RefreshCw size={16} className="mt-0.5 shrink-0 text-blue-600" />
            <div>
              <p className="font-black text-[#0F172A]">Step 3: Refresh the Page</p>
              <p className="text-[11px] font-semibold text-slate-700">
                Click the button below to reload and activate real-time tuition lead alerts!
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
          className="neu-btn neu-btn-primary w-full py-3.5 text-sm font-black flex items-center justify-center gap-2 cursor-pointer shadow-[3px_3px_0px_0px_#0F172A]"
        >
          <RefreshCw size={16} />
          <span>I've Turned It On — Refresh Page Now</span>
        </button>
      </div>
    </div>
  );
}
