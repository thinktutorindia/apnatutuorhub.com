"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { Bell, Check, CheckCheck, X, ExternalLink } from "lucide-react";
import Link from "next/link";
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
  getRecentNotificationsAction,
} from "@/app/actions/notification.actions";

type Notification = {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  actionUrl: string | null;
  createdAt: Date;
};

interface NotificationBellProps {
  initialCount?: number;
}

function timeAgo(date: Date): string {
  const secs = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export function NotificationBell({ initialCount = 0 }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(initialCount);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleOpen() {
    if (isOpen) { setIsOpen(false); return; }
    setIsOpen(true);
    setIsLoading(true);
    const data = await getRecentNotificationsAction();
    setNotifications(data as Notification[]);
    setUnreadCount(data.filter((n) => !n.isRead).length);
    setIsLoading(false);
  }

  function handleMarkRead(id: string) {
    startTransition(async () => {
      await markNotificationReadAction(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    });
  }

  function handleMarkAllRead() {
    startTransition(async () => {
      await markAllNotificationsReadAction();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    });
  }

  return (
    <div ref={dropdownRef} className="relative" style={{ zIndex: 100 }}>
      {/* Bell Button */}
      <button
        onClick={handleOpen}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl transition-all hover:opacity-80 active:scale-95"
        style={{ background: "rgba(30,41,59,0.8)", border: "1px solid #1E293B" }}
        aria-label="Notifications"
      >
        <Bell size={17} style={{ color: "#94A3B8" }} />
        {unreadCount > 0 && (
          <span
            className="absolute -right-1 -top-1 flex h-4.5 w-4.5 min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
            style={{ background: "#EF4444", fontSize: "10px", height: "18px", minWidth: "18px", lineHeight: 1 }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute right-0 top-11 w-80 overflow-hidden rounded-2xl shadow-2xl"
          style={{ background: "#0F172A", border: "1px solid #1E293B" }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "1px solid #1E293B" }}
          >
            <div className="flex items-center gap-2">
              <Bell size={14} style={{ color: "#22C55E" }} />
              <span className="text-sm font-semibold text-white">Notifications</span>
              {unreadCount > 0 && (
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-bold"
                  style={{ background: "rgba(239,68,68,0.15)", color: "#EF4444" }}
                >
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={isPending}
                  className="flex items-center gap-1 text-xs font-medium transition-opacity hover:opacity-70"
                  style={{ color: "#22C55E" }}
                  title="Mark all as read"
                >
                  <CheckCheck size={12} />
                  All
                </button>
              )}
              <button onClick={() => setIsOpen(false)} style={{ color: "#475569" }}>
                <X size={14} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="flex flex-col gap-2 p-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-14 animate-pulse rounded-xl"
                    style={{ background: "#1E293B" }}
                  />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <Bell size={28} style={{ color: "#334155" }} />
                <p className="text-sm" style={{ color: "#475569" }}>
                  You&apos;re all caught up!
                </p>
              </div>
            ) : (
              <ul className="divide-y" style={{ borderColor: "#1E293B" }}>
                {notifications.map((n) => (
                  <li
                    key={n.id}
                    className="flex items-start gap-3 px-4 py-3 transition-colors"
                    style={{
                      background: n.isRead ? "transparent" : "rgba(34,197,94,0.04)",
                    }}
                  >
                    {/* Unread dot */}
                    <div className="mt-1.5 flex-shrink-0">
                      {!n.isRead ? (
                        <span
                          className="block h-2 w-2 rounded-full"
                          style={{ background: "#22C55E" }}
                        />
                      ) : (
                        <span className="block h-2 w-2 rounded-full" style={{ background: "#1E293B" }} />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-white leading-snug">{n.title}</p>
                      <p className="mt-0.5 text-xs leading-snug" style={{ color: "#64748B" }}>
                        {n.message.length > 80 ? n.message.slice(0, 80) + "…" : n.message}
                      </p>
                      <p className="mt-1 text-[10px]" style={{ color: "#334155" }}>
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>

                    <div className="flex flex-shrink-0 items-center gap-1">
                      {n.actionUrl && (
                        <Link
                          href={n.actionUrl}
                          onClick={() => { setIsOpen(false); if (!n.isRead) handleMarkRead(n.id); }}
                          className="flex h-6 w-6 items-center justify-center rounded-lg transition-all hover:opacity-80"
                          style={{ background: "rgba(34,197,94,0.1)", color: "#22C55E" }}
                        >
                          <ExternalLink size={10} />
                        </Link>
                      )}
                      {!n.isRead && (
                        <button
                          onClick={() => handleMarkRead(n.id)}
                          disabled={isPending}
                          className="flex h-6 w-6 items-center justify-center rounded-lg transition-all hover:opacity-80"
                          style={{ background: "rgba(148,163,184,0.1)", color: "#64748B" }}
                          title="Mark as read"
                        >
                          <Check size={10} />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div style={{ borderTop: "1px solid #1E293B" }}>
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center justify-center py-3 text-xs font-medium transition-colors hover:text-white"
              style={{ color: "#475569" }}
            >
              View all notifications →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
