"use client";

import React, { useState, useTransition } from "react";
import { Loader2, AlertTriangle } from "lucide-react";

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

  const getVariantStyles = () => {
    switch (variant) {
      case "danger":
        return "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 font-800 shadow-2xs";
      case "warning":
        return "bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 font-800 shadow-2xs";
      case "success":
        return "bg-emerald-50 text-emerald-950 border border-emerald-200 hover:bg-emerald-100 font-800 shadow-2xs";
      case "secondary":
        return "bg-slate-100 text-slate-800 border border-slate-300 hover:bg-slate-200 font-800 shadow-2xs";
      default:
        return "bg-white text-[#0F2540] border border-slate-300 hover:bg-slate-50 font-800 shadow-2xs";
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
        className={`inline-flex items-center justify-center gap-1.5 rounded-2xl transition-all duration-200 disabled:opacity-50 cursor-pointer ${
          size === "sm" ? "px-3 py-1.5 text-xs font-800" : "px-4 py-2 text-xs font-800"
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

      {/* Confirmation Modal (Corporate Light) */}
      {showConfirm && (
        <div className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 p-6 max-w-sm w-full rounded-3xl shadow-2xl space-y-4 text-slate-900">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="font-800 text-base text-[#0F2540]">
                  {confirmTitle || "Confirm Action"}
                </h3>
                <p className="text-xs font-600 text-slate-600">This action requires confirmation</p>
              </div>
            </div>

            <p className="text-xs font-700 text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-200">
              {confirmMessage}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 rounded-2xl text-xs font-800 text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecute}
                className="px-4 py-2 rounded-2xl text-xs font-800 text-white bg-red-600 hover:bg-red-700 shadow-md transition-colors cursor-pointer"
              >
                Confirm &amp; Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
