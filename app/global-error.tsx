"use client";

import React, { useEffect, useState, useMemo } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [showStack, setShowStack] = useState(true);

  useEffect(() => {
    console.error("[Global Error]:", error);

    const isChunkError =
      error?.name === "ChunkLoadError" ||
      error?.message?.includes("Failed to load chunk") ||
      error?.message?.includes("Loading chunk") ||
      error?.message?.includes("Cannot find module") ||
      error?.message?.includes("CSS chunk");

    if (isChunkError && typeof window !== "undefined") {
      const lastReload = sessionStorage.getItem("chunk_reload_ts");
      const now = Date.now();
      if (!lastReload || now - Number(lastReload) > 15000) {
        sessionStorage.setItem("chunk_reload_ts", String(now));
        window.location.reload();
      }
    }
  }, [error]);

  const handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    } else {
      reset();
    }
  };

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
        };
      }
    }
    return null;
  }, [error]);

  const handleCopy = () => {
    const text = `[Global Critical Error]\nMessage: ${error?.message || "Unknown error"}\nDigest: ${error?.digest || "N/A"}\nStack:\n${error?.stack || "N/A"}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-100 flex items-center justify-center p-4 sm:p-6 font-sans text-slate-900">
        <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 border border-rose-200 text-rose-700 flex items-center justify-center shrink-0 shadow-xs">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-black text-[#0F2540]">
                Critical Application Error
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                An unhandled root exception was caught by the Next.js global error boundary
              </p>
            </div>
          </div>

          {/* Location */}
          {errorLocation && (
            <div className="p-3.5 rounded-2xl bg-slate-950 text-white text-xs font-mono">
              <div className="text-amber-400 font-bold uppercase text-[10px] tracking-wider mb-1">
                Error Source
              </div>
              <div>{errorLocation.file}:{errorLocation.line}:{errorLocation.col} ({errorLocation.fn})</div>
            </div>
          )}

          {/* Message */}
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 space-y-1">
            <div className="text-[10px] uppercase font-bold tracking-wider text-rose-700">Error Message</div>
            <div className="text-xs sm:text-sm font-bold font-mono break-words">{error?.message || "Internal server error"}</div>
            {error?.digest && (
              <div className="text-[10px] font-mono text-rose-600 mt-1">Digest: {error.digest}</div>
            )}
          </div>

          {/* Stack */}
          {error?.stack && (
            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowStack(!showStack)}
                className="w-full text-left px-4 py-2 bg-slate-50 text-xs font-bold text-slate-700 flex justify-between cursor-pointer"
              >
                <span>Full Stack Trace</span>
                <span className="text-slate-400 font-normal">{showStack ? "Hide" : "Show"}</span>
              </button>
              {showStack && (
                <pre className="p-4 bg-white text-[11px] font-mono text-slate-700 overflow-x-auto max-h-48 border-t border-slate-100 whitespace-pre-wrap">
                  {error.stack}
                </pre>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleReload}
              className="flex-1 py-3 px-4 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] text-white font-bold text-xs shadow-md cursor-pointer transition-all"
            >
              Reload Application
            </button>
            <button
              onClick={handleCopy}
              className="py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs cursor-pointer border border-slate-200 transition-all"
            >
              {copied ? "Copied!" : "Copy Error Info"}
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
