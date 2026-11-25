"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, CheckCircle2, X } from "lucide-react";
import { UnblockGuideModal } from "@/components/UnblockGuideModal";
import { useSeniorTutor } from "@/components/tutor/SeniorTutorContext";

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
  const { lang } = useSeniorTutor();
  const [mounted, setMounted] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "denied">("idle");
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }
    if (typeof window !== "undefined") {
      setDismissed(window.localStorage.getItem("ath-lead-notif-banner-dismissed") === "1");
    }
  }, []);

  const handleEnablePush = async () => {
    if (!userId || typeof window === "undefined") return;

    if (permission === "denied" || status === "denied") {
      setShowGuideModal(true);
      return;
    }

    setStatus("loading");

    try {
      const keyRes = await fetch("/api/push/subscribe");
      if (!keyRes.ok) throw new Error("VAPID route error");
      const { publicKey } = await keyRes.json();

      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== "granted") {
        setStatus("denied");
        setShowGuideModal(true);
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;

      const existingSub = await registration.pushManager.getSubscription();
      if (existingSub) await existingSub.unsubscribe();

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
      });

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });

      setStatus("success");
    } catch (err) {
      console.error("[lead-notif] Failed to enable push:", err);
      setStatus("idle");
    }
  };

  if (!mounted || permission === "unsupported" || dismissed || permission === "granted" || status === "success") {
    return null;
  }

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl bg-slate-900 text-white p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          type="button"
          aria-label="Dismiss banner"
          onClick={() => {
            setDismissed(true);
            window.localStorage.setItem("ath-lead-notif-banner-dismissed", "1");
          }}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X size={15} />
        </button>

        <div className="flex items-start gap-3.5 pr-8 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
            <Bell size={18} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">
              {lang === "hi" ? "नए छात्र अनुरोधों के तुरंत नोटिफिकेशन" : "Instant Student Lead Notifications"}
            </h4>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
              {lang === "hi"
                ? "जैसे ही आपके विषय और इलाके में कोई नया ट्यूशन अनुरोध आए, तुरंत सूचना प्राप्त करें।"
                : "Get notified immediately when parents near your locality post tuition requirements in your subjects."}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleEnablePush}
          disabled={status === "loading"}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shrink-0 transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
        >
          {status === "loading" ? (
            lang === "hi" ? "सक्रिय हो रहा है..." : "Enabling..."
          ) : status === "denied" || permission === "denied" ? (
            <>
              <BellOff size={14} />
              <span>{lang === "hi" ? "अनुमति अस्वीकृत (मार्गदर्शिका)" : "Permission Denied (Guide)"}</span>
            </>
          ) : (
            <>
              <Bell size={14} />
              <span>{lang === "hi" ? "🔔 अलर्ट चालू करें" : "Enable Lead Alerts"}</span>
            </>
          )}
        </button>
      </div>

      <UnblockGuideModal isOpen={showGuideModal} onClose={() => setShowGuideModal(false)} />
    </>
  );
}
