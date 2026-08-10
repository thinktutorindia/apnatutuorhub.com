"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/auth/SignOutButton";
import {
  LayoutDashboard, BookOpen, Calendar, MessageSquare,
  User, LogOut, X, Menu, ChevronRight, PlusCircle,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/parent/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/parent/my-leads", label: "Requirements", icon: BookOpen },
  { href: "/parent/post-requirement", label: "Post Requirement", icon: PlusCircle },
  { href: "/parent/bookings", label: "Classes", icon: Calendar },
  { href: "/chat", label: "Messages", icon: MessageSquare },
  { href: "/parent/profile", label: "My Profile", icon: User },
] as const;

const BOTTOM_TABS = [
  { href: "/parent/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/parent/my-leads", label: "Requirements", icon: BookOpen },
  { href: "/parent/bookings", label: "Classes", icon: Calendar },
  { href: "/chat", label: "Messages", icon: MessageSquare },
  { href: "/parent/profile", label: "Profile", icon: User },
] as const;

interface ParentNavClientProps {
  userName: string;
  userEmail: string;
  unreadCount: number;
}

export function ParentNavClient({ userName, userEmail }: ParentNavClientProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  const isActive = (href: string) => pathname === href || (href !== "/parent/dashboard" && pathname.startsWith(href));

  return (
    <>
      {/* Desktop Navigation Header */}
      <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          const isPostReq = item.href === "/parent/post-requirement";

          if (isPostReq) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-800 bg-[#2D9E6B] text-white shadow-xs hover:bg-[#238357] hover:scale-105 active:scale-95 transition-all duration-200 ease-out whitespace-nowrap"
              >
                <PlusCircle size={15} className="transition-transform duration-200 group-hover:rotate-90" />
                <span>{item.label}</span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-800 transition-all duration-200 ease-out hover:scale-105 active:scale-95 whitespace-nowrap ${
                active
                  ? "bg-white text-[#0F2540] shadow-2xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <Icon size={15} className={`transition-transform duration-200 group-hover:scale-110 ${active ? "text-[#2D9E6B]" : "text-slate-400 group-hover:text-[#2D9E6B]"}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Mobile Menu Trigger Button */}
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="md:hidden flex items-center justify-center p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 cursor-pointer"
        aria-label="Open Navigation Menu"
      >
        <Menu size={20} />
      </button>

      {/* Mobile Drawer Navigation */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[99999] flex justify-end md:hidden">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="relative flex flex-col h-full w-72 bg-white border-l border-slate-200 shadow-2xl z-[100000]">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <span className="font-800 text-sm text-[#0F2540]">Parent Portal Navigation</span>
              <button
                onClick={() => setDrawerOpen(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center bg-white border border-slate-200 text-slate-500 hover:text-slate-900"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 border-b border-slate-200 bg-slate-50/50">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-[#0F2540] text-white flex items-center justify-center shrink-0 font-800 text-sm shadow-xs">
                  {(userName?.[0] ?? "P").toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-800 text-[#0F2540] truncate">{userName || "Parent"}</p>
                  <p className="text-[11px] font-600 text-slate-500 truncate">{userEmail}</p>
                </div>
              </div>
            </div>

            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className={`flex items-center justify-between gap-3 px-4 py-3 rounded-2xl text-xs font-800 transition-all ${
                      active
                        ? "bg-[#0F2540] text-white shadow-xs"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={18} className={active ? "text-[#2D9E6B]" : "text-slate-400"} />
                      <span>{item.label}</span>
                    </div>
                    {active && <ChevronRight size={16} className="text-emerald-400" />}
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-slate-200 bg-slate-50">
              <SignOutButton variant="full" text="Sign Out Parent" iconSize={16} />
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Fixed Tab Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-lg">
        {BOTTOM_TABS.map((tab) => {
          const active = isActive(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all ${
                active ? "text-[#2D9E6B] font-800" : "text-slate-500 font-600"
              }`}
            >
              <Icon size={18} className={active ? "text-[#2D9E6B]" : "text-slate-400"} />
              <span className="text-[10px]">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
