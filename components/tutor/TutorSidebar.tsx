"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/auth/SignOutButton";
import {
  LayoutDashboard, Search, Calendar, MessageSquare,
  Wallet, User, Crown, BookOpen, Star, Bell, HelpCircle,
  ChevronLeft, ChevronRight, X, Menu, Home, Users, CreditCard,
  Settings, ShieldCheck, TrendingUp, Clock, CheckCircle2
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: string | number;
  color?: string;
  children?: NavItem[];
}

interface TutorSidebarProps {
  userName: string;
  userEmail: string;
  walletBalance: number;
  unreadCount: number;
  kycStatus: string;
  profileScore: number;
  totalLeads: number;
  totalBookings: number;
}

const MAIN_NAV: NavItem[] = [
  {
    href: "/tutor/dashboard",
    label: "Dashboard",
    icon: Home,
    color: "#2D9E6B"
  },
  {
    href: "/tutor/leads",
    label: "Student Leads",
    icon: Search,
    color: "#3B82F6",
    badge: "NEW"
  },
  {
    href: "/tutor/bookings",
    label: "My Students",
    icon: Users,
    color: "#8B5CF6"
  },
  {
    href: "/chat",
    label: "Messages",
    icon: MessageSquare,
    color: "#F59E0B"
  },
];

const ACCOUNT_NAV: NavItem[] = [
  {
    href: "/tutor/wallet",
    label: "Coin Wallet",
    icon: Wallet,
    color: "#F5A623"
  },
  {
    href: "/tutor/plans",
    label: "Membership",
    icon: Crown,
    color: "#D97706"
  },
  {
    href: "/tutor/profile",
    label: "My Profile",
    icon: User,
    color: "#6B7280"
  },
  {
    href: "/tutor/help",
    label: "Help Center",
    icon: HelpCircle,
    color: "#06B6D4"
  },
];

export function TutorSidebar({
  userName,
  userEmail,
  walletBalance,
  unreadCount,
  kycStatus,
  profileScore,
  totalLeads,
  totalBookings
}: TutorSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + "/");
  };

  const getKycStatusInfo = () => {
    switch (kycStatus) {
      case "APPROVED":
        return { label: "Verified", color: "#2D9E6B", bg: "#E8F7F0" };
      case "PENDING":
        return { label: "Pending", color: "#D97706", bg: "#FFFBEB" };
      case "REJECTED":
        return { label: "Rejected", color: "#DC2626", bg: "#FEF2F2" };
      default:
        return { label: "Not Verified", color: "#6B7280", bg: "#F8FAFC" };
    }
  };

  const kycInfo = getKycStatusInfo();

  if (!mounted) return null;

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden xl:flex flex-col h-screen fixed left-0 top-0 z-50 bg-white border-r border-gray-200 shadow-lg transition-all duration-300 ${
          collapsed ? "w-20" : "w-72"
        }`}
      >
        {/* Logo Section */}
        <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-green-50">
          {!collapsed ? (
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg">
                <BookOpen size={20} className="text-white" />
              </div>
              <div>
                <span className="font-black text-lg text-gray-900">Apna</span>
                <span className="font-black text-lg text-emerald-600">TutorHub</span>
              </div>
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg mx-auto">
              <BookOpen size={20} className="text-white" />
            </div>
          )}
        </div>

        {/* User Profile Section */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center border-2 border-emerald-200">
              <span className="font-black text-emerald-700">{(userName?.[0] ?? "T").toUpperCase()}</span>
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm text-gray-900 truncate">{userName || "Tutor"}</p>
                <p className="text-xs text-gray-500 truncate">{userEmail}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {profileScore}% Complete
                  </span>
                  {kycStatus === "APPROVED" && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <ShieldCheck size={10} className="text-emerald-600" /> Verified
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Wallet Balance */}
          <div className="mt-3 p-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet size={14} className="text-amber-700" />
                <span className="text-xs font-bold text-amber-900">Coins</span>
              </div>
              <span className="font-black text-amber-800 text-lg">{walletBalance} 🪙</span>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="p-4 border-b border-gray-100">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-sky-50 p-3 text-center">
              <TrendingUp size={16} className="text-sky-600 mx-auto mb-1" />
              <p className="text-2xl font-black text-gray-900">{totalLeads}</p>
              <p className="text-[10px] font-bold text-sky-700">Leads</p>
            </div>
            <div className="rounded-xl bg-purple-50 p-3 text-center">
              <Clock size={16} className="text-purple-600 mx-auto mb-1" />
              <p className="text-2xl font-black text-gray-900">{totalBookings}</p>
              <p className="text-[10px] font-bold text-purple-700">Classes</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {/* Main Section */}
          {!collapsed && (
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider px-3 py-2">Main Menu</p>
          )}
          {MAIN_NAV.map((item) => {
            const active = isActive(item.href);
            const hasUnread = item.href === "/chat" && unreadCount > 0;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                  active
                    ? "bg-emerald-50 text-emerald-700 font-black border-2 border-emerald-200"
                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900 font-bold"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    active ? "bg-emerald-100" : "bg-gray-100"
                  }`}
                >
                  <item.icon
                    size={18}
                    className={active ? "text-emerald-600" : "text-gray-500"}
                  />
                </div>
                {!collapsed && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    {hasUnread && (
                      <span className="w-5 h-5 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center animate-pulse">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                    {item.badge && !active && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
                {collapsed && hasUnread && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[8px] font-black flex items-center justify-center animate-pulse">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}

          {/* Account Section */}
          {!collapsed && (
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider px-3 py-2 mt-2">Account</p>
          )}
          {ACCOUNT_NAV.map((item) => {
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                  active
                    ? "bg-emerald-50 text-emerald-700 font-black border-2 border-emerald-200"
                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900 font-bold"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    active ? "bg-emerald-100" : "bg-gray-100"
                  }`}
                >
                  <item.icon
                    size={18}
                    className={active ? "text-emerald-600" : "text-gray-500"}
                  />
                </div>
                {!collapsed && <span className="flex-1">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Sign Out */}
        <div className="p-3 border-t border-gray-100">
          <SignOutButton
            variant="full"
            text={collapsed ? "" : "Sign Out"}
            iconSize={18}
            className={`w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold ${
              collapsed
                ? "bg-red-50 text-red-600 hover:bg-red-100"
                : "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
            }`}
          />
        </div>

        {/* Collapse Toggle */}
        <div className="p-2 border-t border-gray-100">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
          >
            {collapsed ? (
              <ChevronRight size={18} />
            ) : (
              <>
                <ChevronLeft size={18} />
                <span className="text-xs font-bold">Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 xl:hidden z-50 at-bottom-safe bg-white border-t border-gray-200 shadow-lg">
        <div className="flex items-stretch">
          {MAIN_NAV.map((item) => {
            const active = isActive(item.href);
            const hasUnread = item.href === "/chat" && unreadCount > 0;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex-1 flex flex-col items-center justify-center py-2.5 relative transition-all duration-200 ease-out active:scale-90 min-w-0 ${
                  active
                    ? "text-[#2D9E6B] font-black bg-emerald-50/50"
                    : "text-gray-600 hover:text-gray-900 font-bold"
                }`}
              >
                <div className="relative">
                  <item.icon size={21} strokeWidth={active ? 2.3 : 1.8} />
                  {hasUnread && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-black bg-red-600 text-white flex items-center justify-center animate-pulse">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                  {item.badge && !active && (
                    <span className="absolute -top-1 -right-1 text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500 text-white">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] mt-1 truncate max-w-full px-1 transition-colors">{item.label}</span>
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-b-full bg-[#2D9E6B] animate-pulse" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
