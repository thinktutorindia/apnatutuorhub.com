"use client";

import React, { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Global Error]:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-900">
        <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-xl p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto shadow-xs">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold text-[#0F2540]">
              Application Error
            </h1>
            <p className="text-sm text-slate-600 font-medium">
              A critical server error occurred. Please try reloading the application.
            </p>
            {error?.digest && (
              <p className="text-xs font-mono text-slate-400">
                Digest: {error.digest}
              </p>
            )}
          </div>

          <button
            onClick={() => reset()}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] text-white font-bold text-sm shadow-md cursor-pointer transition-all"
          >
            Reload Page
          </button>
        </div>
      </body>
    </html>
  );
}
