"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Download, Smartphone, X, CheckCircle2, Share, PlusSquare } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if running in standalone mode (already installed as PWA)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    setIsInstalled(isStandalone);

    // Detect iOS devices
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(ios);

    const handleBeforeInstall = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          setIsInstalled(true);
          setDeferredPrompt(null);
          return true;
        }
      } catch (err) {
        console.warn("[pwa] Install prompt error:", err);
      }
    } else if (isIOS) {
      setShowIOSModal(true);
    }
    return false;
  }, [deferredPrompt, isIOS]);

  return {
    canInstall: Boolean(deferredPrompt) || (isIOS && !isInstalled),
    isInstalled,
    isIOS,
    showIOSModal,
    setShowIOSModal,
    install,
  };
}

export function PWAInstallBanner({ className = "" }: { className?: string }) {
  const { canInstall, isInstalled, isIOS, showIOSModal, setShowIOSModal, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isDismissed = localStorage.getItem("pwa_banner_dismissed");
      if (isDismissed) setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem("pwa_banner_dismissed", "true");
    } catch {}
  };

  if (isInstalled || dismissed || !canInstall) return null;

  return (
    <>
      <div
        className={`rounded-2xl p-3.5 bg-gradient-to-r from-[#0F2540] via-[#16355d] to-[#0A192F] text-white border border-white/10 shadow-lg flex items-center justify-between gap-3 animate-in slide-in-from-top-2 ${className}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#2D9E6B] text-white flex items-center justify-center shrink-0 shadow-md">
            <Smartphone size={20} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#F5A623] text-[#0F2540] px-1.5 py-0.2 rounded font-mono">
                Staff App
              </span>
              <h4 className="text-xs sm:text-sm font-extrabold text-white truncate">
                Install ApnaTutorHub on Chrome / Phone
              </h4>
            </div>
            <p className="text-[11px] text-white/70 truncate sm:whitespace-normal mt-0.5 font-medium">
              1-tap home screen access, full-screen calling desk &amp; faster workflow on mobile.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={install}
            className="px-3.5 py-1.5 rounded-xl bg-[#2D9E6B] hover:bg-[#238357] text-white text-xs font-black inline-flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95 shrink-0"
          >
            <Download size={13} />
            <span>Install App</span>
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1 rounded-lg text-white/40 hover:text-white/80 cursor-pointer"
            title="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* iOS Safari Add to Home Screen Instructions Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 text-slate-900 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  📲
                </div>
                <h3 className="font-extrabold text-sm text-[#0F2540]">Install on iPhone / iPad</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 font-medium">
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                  1
                </span>
                <div>
                  <p className="font-bold text-slate-800">Tap the Share button</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Look for the <Share size={12} className="inline text-blue-600 mx-0.5" /> Share icon at the bottom of Safari.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                  2
                </span>
                <div>
                  <p className="font-bold text-slate-800">Select &apos;Add to Home Screen&apos;</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Scroll down and tap <PlusSquare size={12} className="inline text-slate-700 mx-0.5" /> Add to Home Screen.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#0F2540] text-white font-black text-xs cursor-pointer shadow-xs"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
