"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  AlertTriangle,
  RefreshCw,
  Home,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  FileCode,
  ArrowLeft,
  Terminal,
} from "lucide-react";
import Link from "next/link";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [showStack, setShowStack] = useState(true);

  useEffect(() => {
    console.error("[Application Error]:", error);
  }, [error]);

  // Extract the most relevant file location from the stack trace
  const errorLocation = useMemo(() => {
    if (!error?.stack) return null;
    const lines = error.stack.split("\n");
    for (const line of lines) {
      const match = line.match(/(?:at\s+)?([^\s()]+)?\s*\(?([a-zA-Z0-9_/\\:.-]+):(\d+):(\d+)\)?/);
      if (match && !match[2].includes("node_modules") && !match[2].includes("next/dist")) {
        const fullPath = match[2].replace(/\\/g, "/");
        const shortPath = fullPath.split("/").slice(-3).join("/");
        return {
          fn: match[1] || "Anonymous Function",
          file: shortPath,
          fullPath: match[2],
          line: match[3],
          col: match[4],
          raw: line.trim(),
        };
      }
    }
    return null;
  }, [error]);

  const handleCopyError = () => {
    const errorDetails = `[Application Error]\nName: ${error?.name || "Error"}\nMessage: ${error?.message || "Unknown error"}\nDigest: ${error?.digest || "N/A"}\nLocation: ${errorLocation ? `${errorLocation.file}:${errorLocation.line}:${errorLocation.col} in ${errorLocation.fn}` : "N/A"}\n\nStack Trace:\n${error?.stack || "No stack trace available."}`;
    navigator.clipboard.writeText(errorDetails);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 sm:p-6 bg-[#F8FAFC] text-slate-900">
      <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in duration-200">
        {/* Error Header */}
        <div className="flex items-center justify-between px-6 py-4.5 bg-gradient-to-r from-rose-50/80 via-white to-rose-50/80 border-b border-rose-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-rose-100/80 border border-rose-200 text-rose-700 flex items-center justify-center shrink-0 shadow-2xs">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
                Application Runtime Error
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                An exception was thrown during rendering or data fetching
              </p>
            </div>
          </div>

          {error?.digest && (
            <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-xl border border-slate-200">
              Digest: {error.digest}
            </span>
          )}
        </div>

        <div className="p-6 space-y-5">
          {/* Exact Error Location Badge */}
          {errorLocation && (
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-900 text-white shadow-xs">
              <FileCode size={18} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.2 rounded-md border border-amber-400/20">
                    Error Location
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-200">
                    {errorLocation.file}:{errorLocation.line}:{errorLocation.col}
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-mono mt-1">
                  in <strong className="text-white">{errorLocation.fn}</strong>
                </p>
              </div>
            </div>
          )}

          {/* Error Message Card */}
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-1 text-rose-950">
            <span className="text-[10px] uppercase font-extrabold tracking-wider text-rose-700 block">
              {error?.name || "Error Details"}
            </span>
            <p className="text-xs sm:text-sm font-bold font-mono leading-relaxed break-words text-rose-900">
              {error?.message || "An unexpected error occurred."}
            </p>
          </div>

          {/* Stack Trace Box (Collapsible) */}
          {error?.stack && (
            <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50">
              <div
                onClick={() => setShowStack(!showStack)}
                className="flex items-center justify-between px-4 py-2.5 bg-slate-100/80 cursor-pointer select-none text-xs font-bold text-slate-700 hover:bg-slate-200/70 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Terminal size={14} className="text-[#2D9E6B]" />
                  <span>Stack Trace</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <span className="text-[11px] font-medium">
                    {showStack ? "Hide" : "Show Details"}
                  </span>
                  {showStack ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </div>

              {showStack && (
                <div className="p-4 max-h-56 overflow-y-auto font-mono text-[11px] text-slate-700 whitespace-pre-wrap leading-relaxed border-t border-slate-200 bg-white">
                  {error.stack}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => reset()}
              className="flex-1 min-w-[130px] flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] text-white font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-98 transition-all cursor-pointer"
            >
              <RefreshCw size={15} />
              <span>Try Again / Reload</span>
            </button>

            <button
              type="button"
              onClick={handleCopyError}
              className="flex items-center justify-center gap-1.5 py-3 px-4 rounded-2xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-bold text-xs shadow-2xs transition-colors cursor-pointer"
            >
              {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              <span>{copied ? "Copied!" : "Copy Error Info"}</span>
            </button>

            <button
              type="button"
              onClick={() => window.history.back()}
              className="flex items-center justify-center gap-1.5 py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Go Back</span>
            </button>

            <Link
              href="/"
              className="flex items-center justify-center gap-1.5 py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
            >
              <Home size={14} />
              <span>Home</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
