"use client";

/**
 * components/PushNotificationProvider.tsx
 *
 * Registers the Service Worker and subscribes the logged-in user for
 * Web Push notifications (native OS notifications even when off-site).
 *
 * Usage: Wrap in the root layout alongside other providers.
 *   <PushNotificationProvider userId={session.user.id} />
 */

import { useEffect } from "react";

type Props = {
  /** The logged-in user's ID. Pass undefined when unauthenticated. */
  userId?: string;
};

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

export function PushNotificationProvider({ userId }: Props) {
  useEffect(() => {
    if (!userId) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.info("[push] Web Push not supported in this browser");
      return;
    }

    async function setupPush() {
      try {
        // 1. Get VAPID public key from server
        const keyRes = await fetch("/api/push/subscribe");
        if (!keyRes.ok) {
          // Web push not configured on server — silently bail
          return;
        }
        const { publicKey } = await keyRes.json();
        if (!publicKey) return;

        // 2. Register the service worker
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
        await navigator.serviceWorker.ready;

        // 3. Check existing subscription
        const existingSub = await registration.pushManager.getSubscription();
        if (existingSub) {
          // Already subscribed — ensure it's saved in DB (re-save idempotently)
          await savePushSubscription(existingSub);
          return;
        }

        // 4. Request notification permission
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          console.info("[push] Notification permission denied");
          return;
        }

        // 5. Subscribe
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as string,
        });

        // 6. Save to server
        await savePushSubscription(subscription);
        console.info("[push] Subscribed successfully");
      } catch (err) {
        console.error("[push] Setup failed:", err);
      }
    }

    async function savePushSubscription(subscription: PushSubscription) {
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
    }

    setupPush();
  }, [userId]);

  // This component renders nothing — it's a side-effect-only provider
  return null;
}
