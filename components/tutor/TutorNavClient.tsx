"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/auth/SignOutButton";
import {
  LayoutDashboard, Search, Calendar, MessageSquare,
  Wallet, User, X, Menu, ChevronRight, Crown, HelpCircle,
  BookOpen, Star, ShieldCheck, TrendingUp, Clock, Users
} from "lucide-react";

const NAV_ITEMS = [
  {
    href: "/tutor/dashboard",
    label: "Dashboard",
    shortLabel: "Dashboard",
    icon: LayoutDashboard,
    description: "Your leads, students & earnings"
  },
  {
    href: "/tutor/leads",
    label: "Student Leads",
    shortLabel: "Leads",
    icon: Search,
    description: "Find & unlock new students"
  },
  {
    href: "/tutor/bookings",
    label: "My Students",
    shortLabel: "Students",
    icon: Users,
    description: "Manage your classes"
  },
  {
    href: "/chat",
    label: "Messages",
    shortLabel: "Messages",
    icon: MessageSquare,
    description: "Chat with parents"
  },
  {
    href: "/tutor/wallet",
    label: "Wallet",
    shortLabel: "Wallet",
    icon: Wallet,
    description: "Your coins & transactions"
  },
  {
    href: "/tutor/plans",
    label: "Membership",
    shortLabel: "Plans",
    icon: Crown,
    description: "Upgrade your account"
  },
  {
    href: "/tutor/profile",
    label: "Profile",
    shortLabel: "Profile",
    icon: User,
    description: "Edit your details"
  },
  {
    href: "/tutor/help",
    label: "Help",
    shortLabel: "Help",
    icon: HelpCircle,
    description: "Get support"
  },
] as const;

const BOTTOM_TABS = [
  { href: "/tutor/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/tutor/leads", label: "Leads", icon: Search },
  { href: "/chat", label: "Chat", icon: MessageSquare },
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

  // Mobile Drawer
  const drawer = (
    <div className="fixed inset-0 z-[99999] flex justify-end xl:hidden">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs"
        onClick={() => setDrawerOpen(false)}
      />
      <div
        className="relative flex flex-col h-full w-72 bg-white border-l border-gray-200 shadow-2xl z-[100000] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-green-50">
          <span className="font-black text-sm text-gray-900">Menu</span>
          <button
            onClick={() => setDrawerOpen(false)}
            className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-gray-700 hover:bg-gray-200 transition-colors shadow-sm"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* User Card */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-[#2D9E6B] flex items-center justify-center shrink-0 font-black text-sm border-2 border-emerald-200">
              {(userName?.[0] ?? "T").toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-gray-900 truncate">{userName || "Tutor"}</p>
              <p className="text-xs font-600 text-gray-600 truncate">{userEmail}</p>
            </div>
          </div>

          {/* Wallet Balance */}
          <div className="mt-2.5 flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 shadow-sm">
            <div className="flex items-center gap-2">
              <Wallet size={16} className="text-amber-700" />
              <span className="text-xs font-bold text-amber-900">Your Coins</span>
            </div>
            <span className="text-xl font-black text-amber-800">{walletBalance} 🪙</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            const hasUnread = item.href === "/chat" && unreadCount > 0;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setDrawerOpen(false)}
                className={`flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
                  active
                    ? "bg-emerald-50 text-[#2D9E6B] border-2 border-emerald-200 shadow-sm"
                    : "text-gray-800 hover:bg-gray-100 hover:border border-gray-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${active ? "bg-emerald-100" : "bg-gray-100"}`}>
                    <item.icon size={18} className={active ? "text-[#2D9E6B]" : "text-gray-600"} />
                  </div>
                  <div>
                    <span className="block">{item.label}</span>
                    <span className="text-[10px] text-gray-500 font-medium">{item.description}</span>
                  </div>
                </div>
                {hasUnread && (
                  <span className="w-5 h-5 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center animate-pulse">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
                {active && <ChevronRight size={16} className="text-[#2D9E6B]" />}
              </Link>
            );
          })}
        </nav>

        {/* Sign Out */}
        <div className="p-4 border-t border-gray-100">
          <SignOutButton
            variant="full"
            text="Sign Out"
            iconSize={18}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-3.5 text-xs font-black text-red-700 hover:bg-red-100 transition-colors min-h-11"
          />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden xl:flex flex-1 items-center justify-center gap-0.5 2xl:gap-1.5 min-w-0 px-2">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          const hasUnread = item.href === "/chat" && unreadCount > 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-1.5 px-2 2xl:px-3 py-1.5 text-xs 2xl:text-sm font-bold whitespace-nowrap border-b-2 min-h-11 relative ${
                active
                  ? "border-[#2D9E6B] text-[#2D9E6B] bg-emerald-50/50"
                  : "border-transparent text-[#64748B] hover:text-[#0F2540] hover:bg-gray-100"
              }`}
            >
              <item.icon size={14} />
              <span>{item.shortLabel}</span>
              {hasUnread && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[8px] font-black flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1 xl:hidden min-w-0" />

      {/* Mobile Hamburger Button */}
      <button
        onClick={() => setDrawerOpen(true)}
        className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-r from-emerald-50 to-green-50 hover:from-emerald-100 hover:to-green-100 active:scale-90 text-gray-800 xl:hidden transition-all duration-200 ease-out shrink-0 relative z-30 shadow-sm border border-emerald-200"
        aria-label="Open navigation"
      >
        <Menu size={19} />
      </button>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 xl:hidden z-50 at-bottom-safe bg-white border-t border-gray-200 shadow-2xl">
        <div className="flex items-stretch">
          {BOTTOM_TABS.map((tab) => {
            const active = isActive(tab.href);
            const hasUnread = tab.href === "/chat" && unreadCount > 0;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`group flex-1 flex flex-col items-center justify-center py-2.5 relative transition-all duration-200 ease-out active:scale-90 min-w-0 ${
                  active
                    ? "text-[#2D9E6B] font-black bg-emerald-50/50"
                    : "text-gray-600 hover:text-gray-900 font-bold"
                }`}
              >
                <div className="relative">
                  <tab.icon size={21} strokeWidth={active ? 2.3 : 1.8} />
                  {hasUnread && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-black bg-red-600 text-white flex items-center justify-center animate-pulse">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] mt-1 truncate max-w-full px-1 transition-colors">{tab.label}</span>
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-b-full bg-[#2D9E6B] animate-pulse" />
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Drawer Portal */}
      {drawerOpen && mounted && createPortal(drawer, document.body)}
    </>
  );
}
