"use client";

import React, { useState, useTransition } from "react";
import { Loader2, AlertTriangle, CheckCircle, Trash2 } from "lucide-react";

interface ActionButtonProps {
  action: () => Promise<any>;
  label: string;
  loadingLabel?: string;
  confirmTitle?: string;
  confirmMessage?: string;
  variant?: "danger" | "warning" | "success" | "primary" | "secondary";
  size?: "sm" | "md";
  className?: string;
  icon?: React.ReactNode;
}

export function ActionButton({
  action,
  label,
  loadingLabel,
  confirmTitle,
  confirmMessage,
  variant = "primary",
  size = "sm",
  className = "",
  icon,
}: ActionButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const getVariantStyles = () => {
    switch (variant) {
      case "danger":
        return "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/40";
      case "warning":
        return "bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 hover:border-amber-500/40";
      case "success":
        return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/40";
      case "secondary":
        return "bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700";
      default:
        return "bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 hover:border-blue-500/40";
    }
  };

  const handleExecute = () => {
    setShowConfirm(false);
    startTransition(async () => {
      try {
        await action();
      } catch (err: any) {
        console.error(err);
      }
    });
  };

  const handleClick = () => {
    if (confirmMessage) {
      setShowConfirm(true);
    } else {
      handleExecute();
    }
  };

  const displayLoadingLabel = loadingLabel || (label.toLowerCase().includes("delete") ? "Deleting..." : label.toLowerCase().includes("suspend") ? "Suspending..." : "Processing...");

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 cursor-pointer ${
          size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-4 py-2 text-sm"
        } ${getVariantStyles()} ${className}`}
      >
        {isPending ? (
          <>
            <Loader2 size={13} className="animate-spin" />
            <span>{displayLoadingLabel}</span>
          </>
        ) : (
          <>
            {icon}
            <span>{label}</span>
          </>
        )}
      </button>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#0F172A] border border-[#1E293B] p-6 max-w-sm w-full rounded-2xl shadow-2xl space-y-4 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center shrink-0 border border-red-500/20">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold">{confirmTitle || "Confirm Action"}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{confirmMessage}</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1E293B]">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecute}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-red-500 text-slate-950 hover:bg-red-400 cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 size={14} />
                <span>Confirm & Proceed</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
