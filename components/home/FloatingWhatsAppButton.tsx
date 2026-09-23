"use client";

import React, { useState, useEffect } from "react";
import { X } from "lucide-react";

export function FloatingWhatsAppButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Auto-show speech bubble after 3 seconds for better engagement
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isDismissed) {
        setIsOpen(true);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [isDismissed]);

  const whatsappNumber = "919319193109";
  const defaultText = encodeURIComponent(
    "Namaste ApnaTutorHub! Mujhe tuition / home tutor ke baare mein jaankari chahiye."
  );
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${defaultText}`;

  return (
    <div
      className="fixed bottom-5 right-5 z-50 flex flex-col items-end pointer-events-auto select-none"
      style={{ isolation: "isolate" }}
    >
      {/* Interactive Tooltip / Mini Chat Prompt */}
      {isOpen && !isDismissed && (
        <div className="mb-3 max-w-[260px] sm:max-w-[280px] bg-white text-slate-800 rounded-2xl p-3.5 shadow-2xl border border-emerald-100 flex items-start gap-2.5 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 text-emerald-600 font-bold text-xs mt-0.5">
            ATH
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-xs font-bold text-slate-900 leading-none">
                ApnaTutorHub Support
              </span>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setIsDismissed(true);
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded-full hover:bg-slate-100"
                aria-label="Close tooltip"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[12px] text-slate-600 leading-snug">
              Need a verified tutor or have questions? Chat with our coordinator directly!
            </p>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              Start WhatsApp Chat →
            </a>
          </div>
        </div>
      )}

      {/* Main Floating Button */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with ApnaTutorHub on WhatsApp"
        className="group relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-[#128C7E] to-[#25D366] text-white shadow-[0_4px_24px_rgba(37,211,102,0.4)] hover:shadow-[0_6px_30px_rgba(37,211,102,0.6)] hover:scale-105 active:scale-95 transition-all duration-300 ease-out focus:outline-none focus:ring-4 focus:ring-emerald-400/50"
      >
        {/* Radar / Pulse Wave effect */}
        <span className="absolute -inset-1 rounded-full bg-[#25D366] opacity-35 animate-ping -z-10 pointer-events-none" />

        {/* Unread Indicator Badge */}
        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center">
          <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping" />
          <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[10px] font-bold text-white items-center justify-center shadow">
            1
          </span>
        </span>

        {/* WhatsApp SVG Icon */}
        <svg
          viewBox="0 0 32 32"
          className="w-7 h-7 sm:w-8 sm:h-8 fill-current drop-shadow-sm transition-transform duration-300 group-hover:rotate-6"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M16 2C8.268 2 2 8.268 2 16c0 2.768.803 5.352 2.19 7.525L2.25 30l6.703-1.905A13.913 13.913 0 0016 30c7.732 0 14-6.268 14-14S23.732 2 16 2zm8.01 19.822c-.332.934-1.642 1.721-2.678 1.942-.71.15-1.636.27-4.757-.998-3.99-1.621-6.55-5.69-6.75-5.952-.198-.26-1.62-2.155-1.62-4.11 0-1.956 1.026-2.918 1.39-3.313.364-.395.795-.494 1.06-.494.265 0 .53.003.762.014.246.012.576-.093.901.69.332.8.13 3.19.13 3.19s-.044.209-.17.382c-.126.173-.243.284-.367.435-.124.15-.262.336-.374.453-.127.133-.26.276-.112.531.148.255.658 1.085 1.412 1.757.971.865 1.79 1.134 2.045 1.261.255.127.404.106.554-.067.15-.173.642-.75.813-1.008.172-.258.343-.216.577-.129.233.086 1.482.7 1.737.828.255.128.425.19.489.298.064.108.064.627-.268 1.561z" />
        </svg>

        {/* Desktop Hover Label */}
        <span className="hidden sm:group-hover:block absolute right-full mr-3 whitespace-nowrap bg-slate-900/90 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-xl shadow-lg pointer-events-none transition-opacity">
          Chat on WhatsApp
        </span>
      </a>
    </div>
  );
}
