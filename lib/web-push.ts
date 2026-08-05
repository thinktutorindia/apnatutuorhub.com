/**
 * lib/web-push.ts — Web Push Notifications (VAPID)
 *
 * Sends browser push notifications that appear even when the user is
 * NOT on the site, using the Web Push API standard.
 *
 * How it works:
 *   1. Browser subscribes via Service Worker (public/sw.js)
 *   2. Subscription object (endpoint + keys) is saved to User.pushSubscription in DB
 *   3. Server uses VAPID keys to push a message to the browser endpoint
 *   4. Browser Service Worker receives it and shows a native OS notification
 *
 * Setup:
 *   - Generate VAPID keys once:  node -e "require('web-push').generateVAPIDKeys().then(k=>console.log(JSON.stringify(k)))"
 *   - Set in .env:
 *       VAPID_PUBLIC_KEY=...
 *       VAPID_PRIVATE_KEY=...
 *       VAPID_CONTACT_EMAIL=support@yourdomain.com
 */

import webpush from "web-push";
import { prisma } from "@/lib/prisma";

// ── VAPID Configuration ───────────────────────────────────────────────────────

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_CONTACT = process.env.VAPID_CONTACT_EMAIL ?? "mailto:support@apnatutorhub.com";

export function isWebPushConfigured(): boolean {
  return Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
}

if (isWebPushConfigured()) {
  webpush.setVapidDetails(VAPID_CONTACT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type PushPayload = {
  title: string;
  body: string;
  /** Route to navigate when notification is clicked */
  url?: string;
  /** Icon shown in the notification (absolute URL or /path) */
  icon?: string;
  /** Badge icon for Android */
  badge?: string;
  tag?: string;
};

export type WebPushSubscription = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

// ── Send Push to a Single User ────────────────────────────────────────────────

/**
 * Sends a Web Push notification to a user by userId.
 * Safely ignores users with no subscription or invalid endpoints.
 */
export async function sendWebPush(userId: string, payload: PushPayload): Promise<void> {
  if (!isWebPushConfigured()) {
    console.info("[web-push] VAPID keys not set — skipping push for user", userId);
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { pushSubscription: true },
  });

  if (!user?.pushSubscription) return;

  const subscription = user.pushSubscription as unknown as WebPushSubscription;

  if (!subscription.endpoint || !subscription.keys) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://apnatutorhub.com";
  const icon = payload.icon ?? `${appUrl}/icons/icon-192x192.svg`;
  const badge = payload.badge ?? `${appUrl}/icons/badge-72x72.svg`;

  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon,
    badge,
    url: payload.url ? (payload.url.startsWith("http") ? payload.url : `${appUrl}${payload.url}`) : appUrl,
    tag: payload.tag ?? "apnatutorhub-notification",
  });

  try {
    await webpush.sendNotification(subscription, notificationPayload, {
      TTL: 60 * 60 * 24, // 24-hour TTL
      urgency: "normal",
    });
  } catch (err: unknown) {
    const error = err as { statusCode?: number };
    if (error?.statusCode === 410 || error?.statusCode === 404) {
      // Subscription expired/unregistered — clean up
      await prisma.user.update({
        where: { id: userId },
        data: { pushSubscription: undefined },
      });
      console.info("[web-push] Removed stale subscription for user", userId);
    } else {
      console.error("[web-push] Failed to send push:", err);
    }
  }
}

/**
 * Broadcasts a Web Push notification to all users with active subscriptions.
 * Optionally filtered by role.
 */
export async function broadcastWebPush(
  payload: PushPayload,
  roleFilter?: "PARENT" | "TUTOR"
): Promise<{ sent: number; failed: number }> {
  if (!isWebPushConfigured()) {
    console.info("[web-push] VAPID keys not set — broadcast skipped");
    return { sent: 0, failed: 0 };
  }

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      pushSubscription: { not: undefined },
      ...(roleFilter ? { role: roleFilter } : {}),
    },
    select: { id: true },
  });

  let sent = 0, failed = 0;

  await Promise.allSettled(
    users.map(async (user) => {
      try {
        await sendWebPush(user.id, payload);
        sent++;
      } catch {
        failed++;
      }
    })
  );

  return { sent, failed };
}
