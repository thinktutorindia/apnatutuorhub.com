import React from "react";
import { Loader2 } from "lucide-react";
import { LottieAnimation } from "@/components/ui/LottieAnimation";

interface PageLoaderProps {
  message?: string;
  subtext?: string;
  size?: number;
}

export function PageLoader({
  message = "Loading...",
  subtext = "Please wait a moment while we process your request",
  size = 180,
}: PageLoaderProps) {
  return (
    <div className="min-h-[400px] w-full flex flex-col items-center justify-center p-8 space-y-4">
      <div className="relative flex items-center justify-center">
        <LottieAnimation width={size} height={size} />
      </div>
      <div className="text-center space-y-1">
        <h3 className="text-base font-extrabold text-[#0F172A] tracking-tight">{message}</h3>
        <p className="text-xs font-semibold text-slate-600 max-w-xs">{subtext}</p>
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
    <div className="fixed inset-0 z-[9999] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="neu-card bg-white p-6 max-w-sm w-full rounded-3xl flex flex-col items-center text-center space-y-3 shadow-2xl">
        <LottieAnimation width={120} height={120} />
        <div>
          <h4 className="text-base font-black text-[#0F172A]">{title}</h4>
          <p className="text-xs font-semibold text-slate-600 mt-1">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

export function InlineSpinner({ size = 16, className = "" }: { size?: number; className?: string }) {
  return <Loader2 size={size} className={`animate-spin ${className}`} />;
}
