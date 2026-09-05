"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCircle2, Shield, Sparkles, X, MessageSquare, Zap, Wallet, Loader2 } from "lucide-react";
import { UnblockGuideModal } from "@/components/UnblockGuideModal";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function NotificationOnboardingModal({ userId }: { userId?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "denied">("idle");
  const [showGuideModal, setShowGuideModal] = useState(false);

  useEffect(() => {
    if (!userId || typeof window === "undefined") return;

    // Check if Notification API is supported
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      return;
    }

    // Only show modal if browser permission is still 'default' (not granted, not denied)
    if (Notification.permission !== "default") {
      return;
    }

    // Check if user dismissed the prompt recently (in last 24h)
    const lastDismissed = localStorage.getItem("apnatutorhub_notif_dismissed");
    if (lastDismissed) {
      const dismissedTime = Number(lastDismissed);
      if (Date.now() - dismissedTime < 24 * 60 * 60 * 1000) {
        return; // Wait 24h before prompting again
      }
    }

    // Show modal after 1-second delay for smooth onboarding flow
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, [userId]);

  const handleEnablePush = async () => {
    if (!userId) return;

    if (Notification.permission === "denied" || status === "denied") {
      setShowGuideModal(true);
      return;
    }

    setStatus("loading");

    try {
      // 1. Fetch VAPID key
      const keyRes = await fetch("/api/push/subscribe");
      if (!keyRes.ok) throw new Error("Failed to fetch VAPID key");
      const { publicKey } = await keyRes.json();

      // 2. Request browser permission (must be in direct click event!)
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        setShowGuideModal(true);
        return;
      }

      // 3. Register SW & subscribe
      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as string,
      });

      // 4. Save to DB
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });

      setStatus("success");
      setTimeout(() => {
        setIsOpen(false);
      }, 1800);
    } catch (err) {
      console.error("[notif-modal] Failed to subscribe:", err);
      setStatus("idle");
    }
  };

  const handleDismiss = () => {
    localStorage.setItem("apnatutorhub_notif_dismissed", Date.now().toString());
    setIsOpen(false);
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            role="dialog"
            aria-modal="true"
            className="relative z-10 w-full max-w-[420px] bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 overflow-hidden"
          >
            {/* Soft ambient background glows */}
            <div className="absolute top-0 right-0 -mt-6 -mr-6 w-36 h-36 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
            <div className="absolute top-0 left-0 -mt-6 -ml-6 w-36 h-36 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />

            {/* Close Button */}
            <button
              type="button"
              onClick={handleDismiss}
              className="absolute right-4 top-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X size={15} />
            </button>

            {/* Header Icon + Title */}
            <div className="flex items-start gap-3.5 mb-3.5">
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#16A34A] to-[#15803D] text-white shadow-lg shadow-emerald-500/25">
                <Bell size={22} className="animate-bounce" />
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-400 border-2 border-white" />
                </span>
              </div>
              <div className="min-w-0 pr-6">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/70 text-emerald-800 text-[10px] font-extrabold uppercase tracking-wide mb-1">
                  <Sparkles size={11} className="text-emerald-600" />
                  <span>Stay Updated</span>
                </div>
                <h2 className="text-lg sm:text-xl font-extrabold text-[#0F2540] tracking-tight leading-tight">
                  Turn On Notifications
                </h2>
              </div>
            </div>

            <p className="text-xs font-medium text-slate-500 leading-relaxed mb-4">
              Receive real-time alerts so you never miss student inquiries, teacher applications, or account updates.
            </p>

            {/* 2x2 Clean Benefit Grid (Compact & Scroll-free) */}
            <div className="grid grid-cols-2 gap-2 mb-5">
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50/90 border border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <Zap size={14} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#0F2540] truncate">Lead Matches</p>
                  <p className="text-[10px] text-slate-500 truncate">Instant student alerts</p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50/90 border border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <Shield size={14} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#0F2540] truncate">KYC & Account</p>
                  <p className="text-[10px] text-slate-500 truncate">Verification status</p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50/90 border border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                  <MessageSquare size={14} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#0F2540] truncate">Direct Messages</p>
                  <p className="text-[10px] text-slate-500 truncate">Chat replies & demo</p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50/90 border border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                  <Wallet size={14} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#0F2540] truncate">Coins & Wallet</p>
                  <p className="text-[10px] text-slate-500 truncate">Instant receipts</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              {status === "success" ? (
                <div className="flex items-center justify-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl py-3 px-4 text-xs font-bold">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span>Notifications Enabled Successfully! 🎉</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleEnablePush}
                  disabled={status === "loading"}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#16A34A] to-[#15803D] hover:from-[#15803D] hover:to-[#166534] text-white font-extrabold text-xs sm:text-sm shadow-md shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                >
                  {status === "loading" ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Setting up notifications...</span>
                    </>
                  ) : status === "denied" ? (
                    <span>Permission Denied — Click for Guide</span>
                  ) : (
                    <>
                      <Bell size={16} />
                      <span>Turn On Notifications Now</span>
                    </>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={handleDismiss}
                disabled={status === "loading"}
                className="w-full text-center text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors py-1 cursor-pointer"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shared Visual Unblock Guide Modal */}
      <UnblockGuideModal isOpen={showGuideModal} onClose={() => setShowGuideModal(false)} />
    </>
  );
}
