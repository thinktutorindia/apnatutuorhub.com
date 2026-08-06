"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { createPortal } from "react-dom";
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
  const [mounted, setMounted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown when clicking outside (desktop)
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

  const dropdownContent = (
    <div className="flex flex-col h-full max-h-[85vh]">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-[#0F172A] bg-[#FAF8F5] px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-[#22C55E]" />
          <span className="text-sm font-black text-[#0F172A]">Notifications</span>
          {unreadCount > 0 && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-600 border border-red-200">
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
              className="flex items-center gap-1 text-xs font-bold text-[#22C55E] hover:underline"
              title="Mark all as read"
            >
              <CheckCheck size={13} />
              All
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-1 text-slate-500 hover:bg-slate-200 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto max-h-72">
        {isLoading ? (
          <div className="flex flex-col gap-2 p-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Bell size={28} className="text-slate-300" />
            <p className="text-sm font-semibold text-slate-400">You&apos;re all caught up!</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={`flex items-start gap-3 px-4 py-3 transition-colors ${
                  n.isRead ? "bg-white" : "bg-[#F0FDF4]"
                }`}
              >
                <div className="mt-2 flex-shrink-0">
                  <span
                    className={`block h-2 w-2 rounded-full ${n.isRead ? "bg-slate-300" : "bg-[#22C55E]"}`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[#0F172A] leading-snug">{n.title}</p>
                  <p className="mt-0.5 text-xs text-slate-600 leading-snug">
                    {n.message.length > 80 ? n.message.slice(0, 80) + "…" : n.message}
                  </p>
                  <p className="mt-1 text-[10px] font-semibold text-slate-400">
                    {timeAgo(n.createdAt)}
                  </p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-1">
                  {n.actionUrl && (
                    <Link
                      href={n.actionUrl}
                      onClick={() => {
                        setIsOpen(false);
                        if (!n.isRead) handleMarkRead(n.id);
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                    >
                      <ExternalLink size={11} />
                    </Link>
                  )}
                  {!n.isRead && (
                    <button
                      type="button"
                      onClick={() => handleMarkRead(n.id)}
                      disabled={isPending}
                      className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                      title="Mark as read"
                    >
                      <Check size={11} />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="border-t-2 border-[#0F172A] bg-[#FAF8F5] shrink-0">
        <Link
          href="/notifications"
          onClick={() => setIsOpen(false)}
          className="flex w-full items-center justify-center py-2.5 text-xs font-bold text-[#0F172A] hover:bg-slate-100 transition-colors"
        >
          View all notifications →
        </Link>
      </div>
    </div>
  );

  return (
    <div ref={dropdownRef} className="relative z-50">
      {/* Bell Button */}
      <button
        type="button"
        onClick={handleToggle}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border-2 border-[#0F172A] bg-white text-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] transition-all hover:bg-slate-100 active:scale-95 cursor-pointer"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            className="absolute -right-1.5 -top-1.5 flex items-center justify-center rounded-full bg-[#EF4444] text-[10px] font-black text-white border-2 border-[#0F172A]"
            style={{ minWidth: "18px", height: "18px", lineHeight: 1, padding: "0 3px" }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Mobile Modal Portal (< md) */}
      {isOpen && mounted && (
        <>
          {/* Mobile Overlay */}
          <div className="md:hidden">
            {createPortal(
              <div className="fixed inset-0 z-[999999] flex items-start justify-center pt-16 px-4">
                <div
                  className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
                  onClick={() => setIsOpen(false)}
                />
                <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border-4 border-[#0F172A] bg-white shadow-[6px_6px_0px_0px_#0F172A] z-[1000000]">
                  {dropdownContent}
                </div>
              </div>,
              document.body
            )}
          </div>

          {/* Desktop Absolute Dropdown (md+) */}
          <div className="hidden md:block absolute right-0 top-12 w-80 overflow-hidden rounded-2xl border-2 border-[#0F172A] bg-white shadow-[5px_5px_0px_0px_#0F172A] z-[99999]">
            {dropdownContent}
          </div>
        </>
      )}
    </div>
  );
}
