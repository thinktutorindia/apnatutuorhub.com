"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, CheckCircle2 } from "lucide-react";

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

export function EnablePushBanner({ userId }: { userId?: string }) {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "denied">("idle");

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);
  }, []);

  const enablePush = async () => {
    if (!userId || typeof window === "undefined") return;
    setStatus("loading");

    try {
      // 1. Get VAPID public key
      const keyRes = await fetch("/api/push/subscribe");
      if (!keyRes.ok) throw new Error("VAPID key route failed");
      const { publicKey } = await keyRes.json();

      // 2. Request browser permission
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== "granted") {
        setStatus("denied");
        return;
      }

      // 3. Register SW
      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;

      // 4. Subscribe
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as string,
      });

      // 5. Save to server DB
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

  if (permission === "unsupported") return null;

  if (permission === "granted" || status === "success") {
    return (
      <div className="neu-card flex items-center justify-between bg-[#DCFCE7] p-4 text-xs font-bold text-[#0F172A]">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={16} className="text-[#22C55E]" />
          <span>VAPID Web Push Notifications Active on this Device ✅</span>
        </div>
        <span className="rounded-full border-2 border-[#0F172A] bg-white px-2.5 py-0.5 text-[10px] font-black">
          Connected
        </span>
      </div>
    );
  }

  return (
    <div className="neu-card flex flex-col items-start justify-between gap-4 bg-[#FFEDD5] border-2 border-[#0F172A] shadow-[4px_4px_0px_0px_#0F172A] p-5 sm:flex-row sm:items-center">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-2 border-[#0F172A] bg-white shadow-[2px_2px_0px_0px_#0F172A]">
          <Bell size={22} className="text-orange-600 animate-bounce" />
        </div>
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-black text-[#0F172A] uppercase tracking-wide">
              ⚠️ Turn On Notifications to Get Instant Student Leads & Inquiries
            </h2>
            <span className="neu-badge bg-red-100 text-red-700 border-red-300 text-[10px] font-extrabold">
              MUST ENABLE
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-700 max-w-2xl leading-relaxed">
            Without notification permission enabled, you will NOT get instant alerts when parents post tuition requirements in your area. Enable now so you never miss student leads!
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={enablePush}
        disabled={status === "loading"}
        className="neu-btn neu-btn-primary shrink-0 px-6 py-3.5 text-xs font-black flex items-center gap-2 cursor-pointer shadow-[3px_3px_0px_0px_#0F172A]"
      >
        {status === "loading" ? (
          "Enabling Notifications..."
        ) : status === "denied" || permission === "denied" ? (
          <>
            <BellOff size={15} />
            <span>Permission Denied in Browser</span>
          </>
        ) : (
          <>
            <Bell size={15} />
            <span>Turn On Notifications Now</span>
          </>
        )}
      </button>
    </div>
  );
}
