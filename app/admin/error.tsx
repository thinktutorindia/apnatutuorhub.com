"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  AlertTriangle,
  RefreshCw,
  LayoutDashboard,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  FileCode,
  ArrowLeft,
  Terminal,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [showStack, setShowStack] = useState(true);

  useEffect(() => {
    console.error("[Admin Portal Error]:", error);
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
          fn: match[1] || "Admin Component",
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
    const errorDetails = `[Admin Portal Error]\nName: ${error?.name || "Error"}\nMessage: ${error?.message || "Unknown error"}\nDigest: ${error?.digest || "N/A"}\nLocation: ${errorLocation ? `${errorLocation.file}:${errorLocation.line}:${errorLocation.col} in ${errorLocation.fn}` : "N/A"}\n\nStack Trace:\n${error?.stack || "No stack trace available."}`;
    navigator.clipboard.writeText(errorDetails);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 text-slate-900 animate-in fade-in duration-200">
      <div className="w-full max-w-3xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Error Header */}
        <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-rose-50/90 via-white to-rose-50/90 border-b border-rose-100">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-2xl bg-rose-100/90 border border-rose-200 text-rose-700 flex items-center justify-center shrink-0 shadow-2xs">
              <ShieldAlert size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
                  Admin Module Error
                </h2>
                <span className="text-[10px] uppercase font-extrabold tracking-wider bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full border border-rose-200">
                  Diagnostic View
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                An exception occurred while executing this administrative action or query
              </p>
            </div>
          </div>

          {error?.digest && (
            <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-xl border border-slate-200 shrink-0">
              Digest: {error.digest}
            </span>
          )}
        </div>

        <div className="p-6 sm:p-7 space-y-5">
          {/* Exact Error Location Badge */}
          {errorLocation ? (
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-950 text-white shadow-sm border border-slate-800">
              <FileCode size={20} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] uppercase font-black tracking-wider text-amber-300 bg-amber-400/15 px-2 py-0.5 rounded-md border border-amber-400/30">
                    Source Location
                  </span>
                  <span className="text-xs font-mono font-bold text-amber-200">
                    {errorLocation.file}:{errorLocation.line}:{errorLocation.col}
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-mono mt-1.5 break-all">
                  in <strong className="text-white font-bold">{errorLocation.fn}</strong>
                </p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                  {errorLocation.fullPath}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-slate-100 text-slate-600 text-xs font-medium">
              Location details not parsed in current client bundle. See stack trace below.
            </div>
          )}

          {/* Error Message Card */}
          <div className="p-4 rounded-2xl bg-rose-50/90 border border-rose-200 space-y-1.5 text-rose-950">
            <span className="text-[10px] uppercase font-black tracking-wider text-rose-700 block">
              {error?.name || "Exception Message"}
            </span>
            <p className="text-xs sm:text-sm font-bold font-mono leading-relaxed break-words text-rose-950">
              {error?.message || "An unexpected error occurred during execution."}
            </p>
          </div>

          {/* Stack Trace Box (Collapsible) */}
          {error?.stack && (
            <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50">
              <div
                onClick={() => setShowStack(!showStack)}
                className="flex items-center justify-between px-4 py-2.5 bg-slate-100 cursor-pointer select-none text-xs font-bold text-slate-700 hover:bg-slate-200/80 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Terminal size={14} className="text-[#2D9E6B]" />
                  <span>Full Stack Trace</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <span className="text-[11px] font-medium">
                    {showStack ? "Hide" : "Show Trace"}
                  </span>
                  {showStack ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </div>

              {showStack && (
                <div className="p-4 max-h-64 overflow-y-auto font-mono text-[11px] text-slate-800 whitespace-pre-wrap leading-relaxed border-t border-slate-200 bg-white selection:bg-rose-100">
                  {error.stack}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => reset()}
              className="flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] text-white font-extrabold text-xs shadow-md shadow-emerald-500/20 active:scale-98 transition-all cursor-pointer"
            >
              <RefreshCw size={15} />
              <span>Retry Page / Action</span>
            </button>

            <button
              type="button"
              onClick={handleCopyError}
              className="flex items-center justify-center gap-1.5 py-3 px-4 rounded-2xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-bold text-xs shadow-2xs transition-colors cursor-pointer"
            >
              {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              <span>{copied ? "Copied to Clipboard!" : "Copy Error Info"}</span>
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
              href="/admin/dashboard"
              className="flex items-center justify-center gap-1.5 py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
            >
              <LayoutDashboard size={14} />
              <span>Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
