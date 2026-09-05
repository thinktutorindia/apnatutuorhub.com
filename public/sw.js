/**
 * public/sw.js — ApnaTutorHub Service Worker
 *
 * Handles:
 *  1. Web Push notification events → shows OS-level notification
 *  2. notificationclick events → focuses/opens app tab with action URL
 *
 * Registration is done in components/PushNotificationProvider.tsx
 */

self.addEventListener("install", (event) => {
  // Skip waiting so the new SW activates immediately
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

// ── Fetch Event (Required for Chrome PWA installability) ───────────────────────
self.addEventListener("fetch", (event) => {
  // Pass-through to network, allows normal browser caching and PWA install prompt
});

// ── Push Event ────────────────────────────────────────────────────────────────

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "ApnaTutorHub", body: event.data.text(), url: "/" };
  }

  const title = data.title || "ApnaTutorHub";
  const options = {
    body: data.body || "",
    icon: data.icon || "/icons/icon-192x192.svg",
    badge: data.badge || "/icons/badge-72x72.svg",
    tag: data.tag || "apnatutorhub",
    data: { url: data.url || "/" },
    actions: [
      { action: "open", title: "Open" },
      { action: "dismiss", title: "Dismiss" },
    ],
    requireInteraction: false,
    silent: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification Click ────────────────────────────────────────────────────────

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // If a tab with the app is already open, focus it and navigate
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.focus();
            if (client.navigate) client.navigate(targetUrl);
            return;
          }
        }
        // Otherwise open a new tab
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});
