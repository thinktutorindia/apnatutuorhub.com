"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, CheckCircle2, X, Sparkles } from "lucide-react";
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

export function EnablePushBanner({
  userId,
  role = "TUTOR",
}: {
  userId?: string;
  role?: "PARENT" | "TUTOR";
}) {
  const [mounted, setMounted] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "denied">("idle");
  const [showGuide, setShowGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }
    if (typeof window !== "undefined") {
      setDismissed(window.localStorage.getItem("ath-push-banner-dismissed") === "1");
    }
  }, []);

  const enablePush = async () => {
    if (!userId || typeof window === "undefined") return;

    if (permission === "denied" || status === "denied") {
      setShowGuide(true);
      return;
    }

    setStatus("loading");

    try {
      const keyRes = await fetch("/api/push/subscribe");
      if (!keyRes.ok) throw new Error("VAPID key route failed");
      const { publicKey } = await keyRes.json();

      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== "granted") {
        setStatus("denied");
        setShowGuide(true);
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
      console.error("[push-banner] Failed to enable push:", err);
      setStatus("idle");
    }
  };

  if (!mounted || permission === "unsupported" || dismissed) return null;

  const isParent = role === "PARENT";

  if (permission === "granted" || status === "success") {
    return null; // Don't take up permanent space if already granted
  }

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          type="button"
          aria-label="Dismiss notification banner"
          onClick={() => {
            setDismissed(true);
            window.localStorage.setItem("ath-push-banner-dismissed", "1");
          }}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X size={16} />
        </button>

        <div className="flex items-start gap-3.5 pr-8 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
            <Bell size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-slate-900">
                {isParent
                  ? "Get instant alerts for tutor replies"
                  : "Get instant alerts when students post near you"}
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                Recommended
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium leading-relaxed max-w-xl">
              Turn on push alerts so you never miss an inquiry or newly posted tuition class in your locality.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={enablePush}
          disabled={status === "loading"}
          className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shrink-0 transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
        >
          {status === "loading" ? (
            "Connecting..."
          ) : status === "denied" || permission === "denied" ? (
            <>
              <BellOff size={14} />
              <span>Permission Denied (Guide)</span>
            </>
          ) : (
            <>
              <Bell size={14} />
              <span>Turn On Alerts</span>
            </>
          )}
        </button>
      </div>

      <UnblockGuideModal isOpen={showGuide} onClose={() => setShowGuide(false)} />
    </>
  );
}
