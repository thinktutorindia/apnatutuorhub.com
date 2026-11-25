"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { NotificationBell } from "@/components/NotificationBell";
import {
  Home,
  Search,
  MessageCircle,
  Wallet,
  User,
  X,
  Menu,
  ChevronRight,
  ChevronDown,
  Crown,
  HelpCircle,
  Users,
  ShieldCheck,
  PhoneCall,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  subLabel: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  hasPulse?: boolean;
  isChat?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/tutor/dashboard",
    label: "Home",
    subLabel: "Dashboard",
    icon: Home,
  },
  {
    href: "/tutor/leads",
    label: "Student Inquiries",
    subLabel: "New Leads",
    icon: Search,
    hasPulse: true,
  },
  {
    href: "/tutor/bookings",
    label: "My Students",
    subLabel: "Classes",
    icon: Users,
  },
  {
    href: "/chat",
    label: "Messages",
    subLabel: "Chat",
    icon: MessageCircle,
    isChat: true,
  },
  {
    href: "/tutor/wallet",
    label: "My Coins",
    subLabel: "Balance",
    icon: Wallet,
  },
  {
    href: "/tutor/plans",
    label: "Membership",
    subLabel: "Plans",
    icon: Crown,
  },
] as const;

const BOTTOM_TABS = [
  { href: "/tutor/dashboard", label: "Home", icon: Home },
  { href: "/tutor/leads", label: "Inquiries", icon: Search },
  { href: "/tutor/bookings", label: "Students", icon: Users },
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/tutor/profile", label: "Profile", icon: User },
] as const;

interface TutorNavClientProps {
  userName: string;
  userEmail: string;
  walletBalance: number;
  unreadCount: number;
  subscriptionPlan?: string | null;
  isSubscriptionActive?: boolean;
  kycStatus?: string;
  initialNotificationCount?: number;
}

export function TutorNavClient({
  userName,
  userEmail,
  walletBalance,
  unreadCount,
  subscriptionPlan,
  isSubscriptionActive,
  kycStatus = "NOT_SUBMITTED",
  initialNotificationCount = 0,
}: TutorNavClientProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isActive = (href: string) => {
    if (href === "/tutor/dashboard") return pathname === "/tutor/dashboard";
    return pathname === href || pathname.startsWith(href + "/");
  };

  const isKycApproved = kycStatus === "APPROVED";
  const displayName = userName.split(" ")[0] || "Teacher";

  // Mobile Drawer
  const drawer = (
    <div className="fixed inset-0 z-[99999] flex justify-end lg:hidden">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={() => setDrawerOpen(false)}
      />
      <div className="relative flex flex-col h-full w-84 bg-white shadow-2xl z-[100000] overflow-y-auto">
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-emerald-50">
          <div>
            <span className="font-extrabold text-base text-slate-900 block">Teacher Menu</span>
            <span className="text-xs text-emerald-800 font-semibold">ApnaTutorHub Portal</span>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-700 hover:bg-slate-100 transition-colors shadow-xs border border-slate-200 cursor-pointer"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* User Card */}
        <div className="p-5 border-b border-slate-200 space-y-3 bg-white">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 font-extrabold text-lg shadow-sm">
              {(userName?.[0] || "T").toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-base font-extrabold text-slate-900 truncate">
                  Namaste {displayName} Ji
                </p>
                {isKycApproved && (
                  <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                )}
              </div>
              <p className="text-xs text-slate-500 truncate">{userEmail}</p>
            </div>
          </div>

          {/* Quick Balance Tiles */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <Link
              href="/tutor/wallet"
              onClick={() => setDrawerOpen(false)}
              className="p-3 rounded-2xl bg-amber-50 border border-amber-300 flex flex-col justify-between"
            >
              <span className="text-xs font-bold text-amber-900">Your Coins</span>
              <span className="text-xl font-black text-amber-950 mt-1">🪙 {walletBalance}</span>
            </Link>

            <Link
              href="/tutor/plans"
              onClick={() => setDrawerOpen(false)}
              className="p-3 rounded-2xl bg-emerald-50 border border-emerald-300 flex flex-col justify-between"
            >
              <span className="text-xs font-bold text-emerald-900">Plan Status</span>
              <span className="text-xs font-black text-emerald-800 uppercase mt-1 truncate">
                {isSubscriptionActive ? subscriptionPlan || "Active" : "Free Trial"}
              </span>
            </Link>
          </div>
        </div>

        {/* Navigation Links with Big Readable Text */}
        <nav className="flex-1 p-4 space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            const hasUnread = item.isChat && unreadCount > 0;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setDrawerOpen(false)}
                className={`flex items-center justify-between gap-3 p-3.5 rounded-2xl text-base font-bold transition-all ${
                  active
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-800 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    <item.icon size={20} />
                  </div>
                  <span>{item.label}</span>
                </div>

                <div className="flex items-center gap-2">
                  {hasUnread && (
                    <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-xs font-black">
                      {unreadCount} New
                    </span>
                  )}
                  <ChevronRight size={18} className={active ? "text-white" : "text-slate-400"} />
                </div>
              </Link>
            );
          })}

          <div className="pt-3 mt-3 border-t border-slate-200 space-y-1.5">
            <Link
              href="/tutor/profile"
              onClick={() => setDrawerOpen(false)}
              className="flex items-center justify-between gap-3 p-3.5 rounded-2xl text-base font-bold text-slate-800 hover:bg-slate-100"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                  <User size={20} />
                </div>
                <span>Profile &amp; Settings</span>
              </div>
              <ChevronRight size={18} className="text-slate-400" />
            </Link>

            <Link
              href="/tutor/help"
              onClick={() => setDrawerOpen(false)}
              className="flex items-center justify-between gap-3 p-3.5 rounded-2xl text-base font-bold text-slate-800 hover:bg-slate-100"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                  <HelpCircle size={20} />
                </div>
                <span>Help &amp; Questions</span>
              </div>
              <ChevronRight size={18} className="text-slate-400" />
            </Link>
          </div>
        </nav>

        {/* WhatsApp Helpline & Sign Out */}
        <div className="p-4 border-t border-slate-200 space-y-2.5 bg-slate-50">
          <a
            href="https://wa.me/919319193109?text=Namaste%20ApnaTutorHub%2C%20mujhe%20help%20chahiye."
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-xs transition-colors"
          >
            <PhoneCall size={16} />
            <span>WhatsApp Coordinator Help</span>
          </a>

          <SignOutButton
            variant="full"
            text="Sign Out"
            iconSize={18}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-300 bg-white py-3 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
          />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Main Navigation Tabs (Clean, Big & Easy to Read) */}
      <nav className="hidden lg:flex items-center gap-2 flex-1 justify-center max-w-2xl px-2">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          const hasUnread = item.isChat && unreadCount > 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-sm font-extrabold transition-all ${
                active
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-700 hover:text-slate-950 hover:bg-slate-100"
              }`}
            >
              <item.icon size={18} className={active ? "text-white" : "text-slate-600"} />
              <span>{item.label}</span>

              {item.hasPulse && !active && (
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              )}

              {hasUnread && (
                <span className="px-1.5 py-0.5 rounded-full bg-red-600 text-white text-xs font-black">
                  {unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Desktop Right Header Actions: Big Coin Pill + Profile Dropdown */}
      <div className="hidden lg:flex items-center gap-3 shrink-0">
        {/* Big Clear Coin Pill */}
        <Link
          href="/tutor/wallet"
          className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-50 hover:bg-amber-100 border-2 border-amber-300 text-amber-950 text-sm font-black transition-all shadow-2xs hover:scale-102"
          title="Click to see your coin wallet"
        >
          <span className="text-lg">🪙</span>
          <span>{walletBalance} Coins</span>
        </Link>

        {/* Notifications Bell */}
        <NotificationBell initialCount={initialNotificationCount} viewerRole="TUTOR" />

        {/* User Profile Dropdown Pill */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setProfileDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2.5 p-1.5 pl-3 rounded-2xl border-2 border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 transition-all text-left shadow-2xs cursor-pointer"
            aria-expanded={profileDropdownOpen}
            aria-label="User profile menu"
          >
            <div className="flex flex-col text-left">
              <span className="text-xs font-black text-slate-900 leading-tight">
                {displayName} Ji
              </span>
              <span className="text-[11px] text-emerald-700 font-bold">
                {isSubscriptionActive ? "Active Plan" : "Teacher"}
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm shadow-2xs">
              {(userName?.[0] || "T").toUpperCase()}
            </div>
            <ChevronDown size={16} className="text-slate-400 mr-0.5" />
          </button>

          {profileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-white border-2 border-slate-200 shadow-xl py-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-sm font-extrabold text-slate-900">{userName}</p>
                <p className="text-xs text-slate-500 truncate mt-0.5">{userEmail}</p>
              </div>

              <div className="py-1.5 space-y-0.5">
                <Link
                  href="/tutor/profile"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-50"
                >
                  <User size={17} className="text-slate-500" />
                  <span>Profile &amp; Settings</span>
                </Link>

                <Link
                  href="/tutor/plans"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-50"
                >
                  <Crown size={17} className="text-emerald-600" />
                  <span>Membership Plans</span>
                </Link>

                <a
                  href="https://wa.me/919319193109?text=Namaste%20ApnaTutorHub%2C%20mujhe%20help%20chahiye."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-emerald-800 hover:bg-emerald-50"
                >
                  <PhoneCall size={17} className="text-emerald-600" />
                  <span>WhatsApp Coordinator</span>
                </a>
              </div>

              <div className="pt-2 border-t border-slate-100 px-3">
                <SignOutButton
                  variant="link"
                  className="w-full text-left py-2 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-2"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Right Controls: Coin Pill + Menu Button */}
      <div className="flex lg:hidden items-center gap-2 ml-auto shrink-0">
        <Link
          href="/tutor/wallet"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs font-black"
        >
          <span>🪙</span>
          <span>{walletBalance}</span>
        </Link>

        <NotificationBell initialCount={initialNotificationCount} viewerRole="TUTOR" />

        <button
          onClick={() => setDrawerOpen(true)}
          className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors shrink-0 border border-slate-200 cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu size={22} />
        </button>
      </div>

      {/* Mobile Bottom Navigation Bar (Large Touch Targets & Clear Icons) */}
      <div className="fixed bottom-0 left-0 right-0 lg:hidden z-40 bg-white/95 backdrop-blur-md border-t-2 border-slate-200 shadow-xl safe-bottom">
        <div className="flex items-stretch justify-around max-w-lg mx-auto">
          {BOTTOM_TABS.map((tab) => {
            const active = isActive(tab.href);
            const hasUnread = tab.href === "/chat" && unreadCount > 0;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex-1 flex flex-col items-center justify-center py-3 px-1 relative transition-all active:scale-95 ${
                  active ? "text-emerald-700 font-black" : "text-slate-600 font-bold"
                }`}
              >
                <div className="relative">
                  <tab.icon size={22} strokeWidth={active ? 2.6 : 2} />
                  {hasUnread && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-black bg-red-600 text-white flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                  {tab.href === "/tutor/leads" && !active && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  )}
                </div>
                <span className="text-xs mt-1 truncate">{tab.label}</span>
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 rounded-b-full bg-emerald-600" />
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
