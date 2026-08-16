"use client";

import React, { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console or monitoring service (e.g. Sentry / PostHog)
    console.error("[Application Error]:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-8 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
          <AlertTriangle size={32} />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
            Something went wrong!
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 font-500 leading-relaxed">
            An unexpected error occurred while rendering this page. Please reload or try again.
          </p>
          {error?.digest && (
            <p className="text-[11px] font-mono text-slate-400">
              Error Digest: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="flex-1 py-3 px-4 rounded-xl bg-[#2D9E6B] hover:bg-[#238357] text-white font-800 text-xs flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
          >
            <RefreshCw size={14} />
            <span>Try Again</span>
          </button>
          <Link
            href="/"
            className="flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-800 text-xs flex items-center justify-center gap-2 transition-all border border-slate-200"
          >
            <Home size={14} />
            <span>Go Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
