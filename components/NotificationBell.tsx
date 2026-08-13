"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { Bell, Check, CheckCheck, X, ExternalLink } from "lucide-react";
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

function getNotificationTargetUrl(n: Notification): string {
  if (n.actionUrl && n.actionUrl.trim()) {
    const raw = n.actionUrl.trim();
    if (raw.includes("claimed=true")) return raw;
    if (raw === "/tutor/leads" || raw.startsWith("/tutor/leads?")) {
      const match = n.title.match(/Near\s+([^!.\n]+)/i);
      const loc = match && match[1] ? match[1].trim() : "";
      return `/tutor/leads?claimed=true${loc ? `&locality=${encodeURIComponent(loc)}` : ""}`;
    }
    return raw;
  }

  const titleLower = n.title.toLowerCase();
  const msgLower = n.message.toLowerCase();

  if (
    titleLower.includes("kyc") ||
    msgLower.includes("identity") ||
    msgLower.includes("kyc") ||
    msgLower.includes("document")
  ) {
    return "/tutor/profile";
  }
  if (
    titleLower.includes("booking") ||
    titleLower.includes("tuition") ||
    msgLower.includes("booking")
  ) {
    return "/tutor/bookings";
  }
  if (
    titleLower.includes("wallet") ||
    titleLower.includes("coin") ||
    msgLower.includes("coin")
  ) {
    return "/tutor/wallet";
  }

  const match = n.title.match(/Near\s+([^!.\n]+)/i);
  if (match && match[1]) {
    const loc = match[1].trim();
    return `/tutor/leads?claimed=true&locality=${encodeURIComponent(loc)}`;
  }

  return "/tutor/leads?claimed=true";
}

export function NotificationBell({ initialCount = 0 }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(initialCount);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  async function handleToggle() {
    if (isOpen) {
      setIsOpen(false);
      return;
    }
    setIsOpen(true);
    setIsLoading(true);
    try {
      const data = await getRecentNotificationsAction();
      setNotifications((data as Notification[]) || []);
      setUnreadCount(data ? data.filter((n) => !n.isRead).length : 0);
    } catch {
      // silent fail
    } finally {
      setIsLoading(false);
    }
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

  function handleItemNavigate(n: Notification, targetUrl: string) {
    if (!n.isRead) {
      handleMarkRead(n.id);
    }
    setIsOpen(false);
    if (typeof window !== "undefined") {
      window.location.href = targetUrl;
    }
  }

  return (
    <div ref={dropdownRef} className="relative z-50">
      {/* Bell Button */}
      <button
        type="button"
        onClick={handleToggle}
        className="group relative flex h-9 w-9 items-center justify-center rounded-xl border-2 border-[#0F172A] bg-white text-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] transition-all duration-200 ease-out hover:bg-emerald-50 hover:border-emerald-700 hover:shadow-[3px_3px_0px_0px_#0F172A] active:scale-90 cursor-pointer"
        aria-label="Notifications"
      >
        <Bell
          size={18}
          className="transition-transform duration-300 ease-out group-hover:rotate-12 group-hover:scale-110 group-hover:text-emerald-600"
        />
        {unreadCount > 0 && (
          <span
            className="absolute -right-1.5 -top-1.5 flex items-center justify-center rounded-full bg-[#EF4444] text-[10px] font-black text-white border-2 border-[#0F172A] animate-bounce"
            style={{ minWidth: "18px", height: "18px", lineHeight: 1, padding: "0 3px" }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Unified Responsive Dropdown */}
      {isOpen && (
        <>
          {/* Mobile Overlay */}
          <div
            className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-xs md:hidden"
            onClick={() => setIsOpen(false)}
          />

          {/* Main Dropdown Panel */}
          <div className="fixed inset-x-3 top-16 z-[9999] max-h-[82vh] flex flex-col rounded-3xl border-4 border-[#0F172A] bg-white shadow-[6px_6px_0px_0px_#0F172A] overflow-hidden md:absolute md:inset-auto md:right-0 md:top-12 md:w-96 md:max-h-[85vh] md:rounded-2xl md:border-2 md:shadow-[5px_5px_0px_0px_#0F172A]">
            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-[#0F172A] bg-[#FAF8F5] px-4 py-3 shrink-0">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-[#22C55E]" />
                <span className="text-sm font-black text-[#0F172A]">Notifications</span>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-bold text-red-600 border border-red-200">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    disabled={isPending}
                    className="flex items-center gap-1 text-xs font-bold text-[#22C55E] hover:underline cursor-pointer"
                    title="Mark all as read"
                  >
                    <CheckCheck size={13} />
                    Mark all read
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1 text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer"
                  aria-label="Close notifications"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Notification List */}
            <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100">
              {isLoading ? (
                <div className="flex flex-col gap-2.5 p-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-center px-4">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-1">
                    <Bell size={24} />
                  </div>
                  <p className="text-sm font-bold text-slate-700">You&apos;re all caught up!</p>
                  <p className="text-xs text-slate-400">New notifications will appear here in real-time.</p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {notifications.map((n) => {
                    const targetUrl = getNotificationTargetUrl(n);
                    return (
                      <li key={n.id}>
                        <a
                          href={targetUrl}
                          onClick={(e) => {
                            e.preventDefault();
                            handleItemNavigate(n, targetUrl);
                          }}
                          className={`group flex items-start gap-3 px-4 py-3.5 transition-all cursor-pointer select-none ${
                            n.isRead
                              ? "bg-white hover:bg-slate-50"
                              : "bg-[#F0FDF4] hover:bg-[#E2F7E9]"
                          }`}
                        >
                          {/* Unread indicator dot */}
                          <div className="mt-1.5 flex-shrink-0">
                            <span
                              className={`block h-2.5 w-2.5 rounded-full transition-transform group-hover:scale-125 ${
                                n.isRead ? "bg-slate-300" : "bg-[#22C55E] ring-2 ring-emerald-300/50"
                              }`}
                            />
                          </div>

                          {/* Content */}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-black text-[#0F172A] leading-snug group-hover:text-emerald-700 transition-colors">
                              {n.title}
                            </p>
                            <p className="mt-1 text-xs text-slate-600 leading-relaxed line-clamp-2">
                              {n.message}
                            </p>
                            <div className="mt-1.5 flex items-center gap-2">
                              <span className="text-[10px] font-bold text-slate-400">
                                {timeAgo(n.createdAt)}
                              </span>
                              <span className="text-[10px] font-extrabold text-emerald-600 group-hover:underline flex items-center gap-0.5">
                                Tap to view <ExternalLink size={9} />
                              </span>
                            </div>
                          </div>

                          {/* Right Action Icons */}
                          <div className="flex flex-shrink-0 items-center gap-1.5 mt-0.5">
                            {!n.isRead && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleMarkRead(n.id);
                                }}
                                disabled={isPending}
                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                                title="Mark as read"
                              >
                                <Check size={12} />
                              </button>
                            )}
                          </div>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Footer */}
            <div className="border-t-2 border-[#0F172A] bg-[#FAF8F5] shrink-0">
              <a
                href="/notifications"
                onClick={(e) => {
                  e.preventDefault();
                  setIsOpen(false);
                  if (typeof window !== "undefined") {
                    window.location.href = "/notifications";
                  }
                }}
                className="flex w-full items-center justify-center py-3 text-xs font-black text-[#0F172A] hover:bg-slate-100 transition-colors cursor-pointer"
              >
                View all notifications →
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

