"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, CheckCircle2 } from "lucide-react";
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

export function LeadNotifReminderBanner({ userId }: { userId?: string }) {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "unsupported";
    }
    return Notification.permission;
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "denied">("idle");
  const [showGuideModal, setShowGuideModal] = useState(false);

  const handleEnablePush = async () => {
    if (!userId || typeof window === "undefined") return;

    if (permission === "denied" || status === "denied") {
      setShowGuideModal(true);
      return;
    }

    setStatus("loading");

    try {
      // Fetch VAPID key
      const keyRes = await fetch("/api/push/subscribe");
      if (!keyRes.ok) throw new Error("VAPID route error");
      const { publicKey } = await keyRes.json();

      // Request browser permission
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== "granted") {
        setStatus("denied");
        setShowGuideModal(true);
        return;
      }

      // Register SW & subscribe
      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as string,
      });

      // Save subscription to server DB
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });

      setStatus("success");
    } catch (err) {
      console.error("[lead-notif-banner] Error enabling push:", err);
      setStatus("idle");
    }
  };

  if (permission === "unsupported") return null;

  if (permission === "granted" || status === "success") {
    return (
      <div className="neu-card flex items-center justify-between flex-wrap gap-2 bg-[#DCFCE7] p-3.5 text-xs font-bold text-[#0F172A]">
        <div className="flex items-center gap-2 min-w-0">
          <CheckCircle2 size={16} className="text-[#22C55E]" />
          <span className="min-w-0">Push Notifications Active — You will get real-time lead alerts & student inquiries! ✅</span>
        </div>
        <span className="neu-badge bg-white text-[10px] text-[#22C55E]">Active</span>
      </div>
    );
  }

  return (
    <>
      {/* Warning Banner */}
      <div className="neu-card flex flex-col items-start justify-between gap-4 bg-[#FFEDD5] p-5 border-2 border-[#0F172A] shadow-[4px_4px_0px_0px_#0F172A] sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-2 border-[#0F172A] bg-white shadow-[2px_2px_0px_0px_#0F172A]">
            <Bell size={22} className="text-orange-600 animate-bounce" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-black text-[#0F172A] uppercase tracking-wide">
                ⚠️ Enable Push Notifications to Receive Instant Leads
              </h2>
              <span className="neu-badge bg-red-100 text-red-700 border-red-300 text-[10px] font-extrabold">
                REQUIRED FOR LEADS
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-700 max-w-2xl leading-relaxed">
              Without notification permission enabled, you will NOT get instant popups when parents post tuition requirements in your subjects and city. Turn it on now to secure student leads first!
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleEnablePush}
          disabled={status === "loading"}
          className="neu-btn neu-btn-primary btn-shine w-full sm:w-auto shrink-0 px-6 py-3.5 text-xs font-black flex items-center justify-center gap-2 whitespace-normal text-center cursor-pointer shadow-[3px_3px_0px_0px_#0F172A] hover:scale-105 active:scale-95 transition-all duration-200 ease-out"
        >
          {status === "loading" ? (
            "Enabling Notifications..."
          ) : status === "denied" || permission === "denied" ? (
            <>
              <BellOff size={15} />
              <span>Permission Denied in Browser — Click for Guide</span>
            </>
          ) : (
            <>
              <Bell size={15} />
              <span>Turn On Notifications for Leads</span>
            </>
          )}
        </button>
      </div>

      {/* Shared Visual Unblock Guide Modal */}
      <UnblockGuideModal isOpen={showGuideModal} onClose={() => setShowGuideModal(false)} />
    </>
  );
}
