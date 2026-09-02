"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { LottieAnimation } from "@/components/ui/LottieAnimation";

interface PageLoaderProps {
  message?: string;
  subtext?: string;
  size?: number;
}

export function PageLoader({
  message = "Loading ApnaTutorHub...",
  subtext = "Please wait a moment while we load your experience",
}: PageLoaderProps) {
  return (
    <div className="min-h-[350px] w-full flex flex-col items-center justify-center p-6 space-y-4 animate-in fade-in duration-200">
      <LottieAnimation src="/animations/cute-tiger.json" width={220} height={220} />

      <div className="text-center space-y-1.5 max-w-sm px-4">
        <h3 className="text-base font-extrabold text-[#0F2540] tracking-tight">{message}</h3>
        <p className="text-xs font-semibold text-slate-500 leading-relaxed">{subtext}</p>
      </div>

      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200">
        <span className="w-2 h-2 rounded-full bg-[#2D9E6B] animate-pulse" />
        <span className="text-[11px] font-bold text-emerald-800 tracking-wide">Syncing data...</span>
      </div>
    </div>
  );
}

interface ActionOverlayProps {
  isOpen: boolean;
  title?: string;
  subtitle?: string;
}

export function ActionOverlay({
  isOpen,
  title = "Processing...",
  subtitle = "Please wait while we update your changes",
}: ActionOverlayProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white p-6 max-w-sm w-full rounded-3xl border border-slate-200 flex flex-col items-center text-center space-y-3 shadow-2xl animate-in zoom-in-95 duration-150">
        <LottieAnimation src="/animations/cute-tiger.json" width={140} height={140} />
        <div className="space-y-1">
          <h4 className="text-base font-black text-[#0F2540]">{title}</h4>
          <p className="text-xs font-semibold text-slate-600">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

export function InlineSpinner({ size = 16, className = "" }: { size?: number; className?: string }) {
  return <Loader2 size={size} className={`animate-spin ${className}`} />;
}
