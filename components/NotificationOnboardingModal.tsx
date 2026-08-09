"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCircle2, Shield, Sparkles, X, MessageSquare, Zap, Wallet } from "lucide-react";

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-[#0F172A]/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        className="neu-card relative z-10 w-full max-w-lg bg-white p-6 sm:p-8 space-y-6 shadow-[8px_8px_0px_0px_#0F172A]"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-4 top-4 neu-btn neu-btn-white h-8 w-8 !p-0 flex items-center justify-center cursor-pointer"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        {/* Header Icon */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-[#0F172A] bg-[#FEF3C7] shadow-[3px_3px_0px_0px_#0F172A]">
            <Bell size={24} className="text-amber-600 animate-bounce" />
          </div>
          <div>
            <div className="neu-badge bg-[#DCFCE7] text-[#0F172A] text-[10px] font-black uppercase mb-1">
              ⚡ Important Alert Setup
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#0F172A] leading-tight">
              Turn On Notifications
            </h2>
          </div>
        </div>

        <p className="text-xs sm:text-sm font-semibold text-slate-700 leading-relaxed">
          We deliver all critical platform alerts, lead matches, and updates directly to your device so you never miss an opportunity!
        </p>

        {/* Benefit Items */}
        <div className="space-y-2.5 rounded-2xl border-2 border-[#0F172A] bg-[#FAF8F5] p-4 text-xs">
          <div className="flex items-start gap-2.5">
            <Zap size={16} className="mt-0.5 shrink-0 text-blue-600" />
            <div>
              <span className="font-extrabold text-[#0F172A]">Instant Lead Matches: </span>
              <span className="font-semibold text-slate-600">Get notified immediately when new tuition requirements open near you.</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Shield size={16} className="mt-0.5 shrink-0 text-emerald-600" />
            <div>
              <span className="font-extrabold text-[#0F172A]">KYC & Account Status: </span>
              <span className="font-semibold text-slate-600">Real-time alerts when your documents or profile updates are reviewed.</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <MessageSquare size={16} className="mt-0.5 shrink-0 text-purple-600" />
            <div>
              <span className="font-extrabold text-[#0F172A]">Direct Messages: </span>
              <span className="font-semibold text-slate-600">Instant notification when parents or tutors send you messages.</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Wallet size={16} className="mt-0.5 shrink-0 text-amber-600" />
            <div>
              <span className="font-extrabold text-[#0F172A]">Coins & Wallet: </span>
              <span className="font-semibold text-slate-600">Receive instant receipts whenever coins are credited to your account.</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          {status === "success" ? (
            <div className="neu-card flex items-center justify-center gap-2 bg-[#DCFCE7] py-3.5 text-sm font-black text-[#0F172A]">
              <CheckCircle2 size={18} className="text-[#22C55E]" />
              <span>Notifications Enabled! Stay tuned! 🎉</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleEnablePush}
              disabled={status === "loading"}
              className="neu-btn neu-btn-primary w-full py-3.5 text-sm flex items-center justify-center gap-2 cursor-pointer font-black"
            >
              {status === "loading" ? (
                <span>Setting up notifications...</span>
              ) : status === "denied" ? (
                <span>Permission Denied in Browser Settings</span>
              ) : (
                <>
                  <Bell size={18} />
                  <span>Turn On Notifications Now</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={handleDismiss}
            disabled={status === "loading"}
            className="w-full text-center text-xs font-extrabold text-slate-500 hover:text-slate-800 transition-colors py-1 cursor-pointer"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}
