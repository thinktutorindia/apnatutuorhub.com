"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/auth/SignOutButton";
import {
  LayoutDashboard, Search, Calendar, MessageSquare,
  Wallet, User, LogOut, X, Menu, ChevronRight, Crown, Gift,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/tutor/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/tutor/leads", label: "Find Students", icon: Search },
  { href: "/tutor/plans", label: "Membership Plans", icon: Crown },
  { href: "/tutor/bookings", label: "Classes", icon: Calendar },
  { href: "/chat", label: "Messages", icon: MessageSquare },
  { href: "/tutor/wallet", label: "Wallet", icon: Wallet },
  { href: "/tutor/profile", label: "My Profile", icon: User },
  { href: "/referrals", label: "Referrals", icon: Gift },
] as const;

const BOTTOM_TABS = [
  { href: "/tutor/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/tutor/leads", label: "Students", icon: Search },
  { href: "/chat", label: "Messages", icon: MessageSquare },
  { href: "/tutor/wallet", label: "Wallet", icon: Wallet },
  { href: "/tutor/profile", label: "Profile", icon: User },
] as const;

interface TutorNavClientProps {
  userName: string;
  userEmail: string;
  walletBalance: number;
  unreadCount: number;
}

export function TutorNavClient({ userName, userEmail, walletBalance, unreadCount }: TutorNavClientProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const drawer = (
    <div className="fixed inset-0 z-[99999] flex justify-end md:hidden">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs"
        onClick={() => setDrawerOpen(false)}
      />
      <div
        className="relative flex flex-col h-full w-72 bg-white border-l border-gray-200 shadow-2xl z-[100000] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <span className="font-800 text-sm text-gray-900">Menu</span>
          <button
            onClick={() => setDrawerOpen(false)}
            className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-700 hover:bg-gray-200 transition-colors"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* User card */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200/80">
            <div
              className="w-10 h-10 rounded-full bg-emerald-100 text-[#2D9E6B] flex items-center justify-center shrink-0 font-800 text-sm"
            >
              {(userName?.[0] ?? "T").toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-800 text-gray-900 truncate">{userName || "Tutor"}</p>
              <p className="text-xs font-600 text-gray-600 truncate">{userEmail}</p>
            </div>
          </div>
          <div
            className="mt-2.5 flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-amber-100/90 border border-amber-300/80"
          >
            <span className="text-xs font-800 text-amber-950">Coins Balance</span>
            <span className="text-sm font-800 text-amber-950">{walletBalance} 🪙</span>
          </div>
        </div>

        {/* Links */}
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setDrawerOpen(false)}
                className={`flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl text-sm font-700 transition-colors ${
                  active
                    ? "bg-emerald-50 text-[#2D9E6B] font-800 border border-emerald-200"
                    : "text-gray-800 hover:bg-gray-100"
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </div>
                {active && <ChevronRight size={16} className="text-[#2D9E6B]" />}
              </Link>
            );
          })}
        </nav>

        {/* Sign out */}
        <div className="p-4 border-t border-gray-100">
          <SignOutButton variant="full" text="Sign out" iconSize={18} />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop nav links */}
      <nav className="hidden md:flex items-center gap-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-700 transition-all duration-200 ease-out hover:scale-105 active:scale-95 whitespace-nowrap ${
                active
                  ? "bg-emerald-50 text-[#2D9E6B] font-800 border border-emerald-200/80 shadow-2xs"
                  : "text-gray-800 hover:bg-gray-100 hover:text-gray-900 hover:shadow-2xs"
              }`}
            >
              <item.icon size={15} className="transition-transform duration-200 ease-out group-hover:scale-110 group-hover:-rotate-6" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Mobile hamburger */}
      <button
        onClick={() => setDrawerOpen(true)}
        className="flex items-center justify-center w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 active:scale-90 text-gray-800 md:hidden transition-all duration-200 ease-out shrink-0 relative z-30"
        aria-label="Open navigation"
      >
        <Menu size={19} />
      </button>

      {/* Mobile bottom tab bar */}
      <div
        className="fixed bottom-0 left-0 right-0 md:hidden z-50 at-bottom-safe bg-white border-t border-gray-200 shadow-lg"
      >
        <div className="flex items-stretch">
          {BOTTOM_TABS.map((tab) => {
            const active = isActive(tab.href);
            const hasUnread = tab.href === "/chat" && unreadCount > 0;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`group flex-1 flex flex-col items-center justify-center py-2.5 relative transition-all duration-200 ease-out active:scale-90 min-w-0 ${
                  active ? "text-[#2D9E6B] font-800" : "text-gray-600 hover:text-gray-900 font-600"
                }`}
              >
                <div className="relative transition-transform duration-200 group-hover:scale-110">
                  <tab.icon size={21} strokeWidth={active ? 2.3 : 1.8} />
                  {hasUnread && (
                    <span
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-800 bg-red-600 text-white flex items-center justify-center animate-pulse"
                    >
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] mt-1 truncate max-w-full px-1 transition-colors">{tab.label}</span>
                {active && (
                  <span
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-b-full bg-[#2D9E6B] animate-pulse"
                  />
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Drawer portal */}
      {drawerOpen && mounted && createPortal(drawer, document.body)}
    </>
  );
}
