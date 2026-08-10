"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  Compass,
  LayoutDashboard,
  MessageSquare,
  ShieldCheck,
  Wallet,
  Menu,
  X,
  User,
  LogOut,
} from "lucide-react";
import { SignOutButton } from "@/components/auth/SignOutButton";

const LINKS = [
  { href: "/tutor/dashboard", label: "Dashboard", shortLabel: "Dashboard", icon: LayoutDashboard },
  { href: "/tutor/leads", label: "Leads Feed", shortLabel: "Leads", icon: Compass },
  { href: "/tutor/bookings", label: "Bookings", shortLabel: "Bookings", icon: Calendar },
  { href: "/chat", label: "Messages", shortLabel: "Messages", icon: MessageSquare },
  { href: "/tutor/wallet", label: "Wallet & Coins", shortLabel: "Wallet", icon: Wallet },
  { href: "/tutor/profile", label: "Profile & KYC", shortLabel: "KYC", icon: ShieldCheck },
] as const;

interface TutorNavProps {
  userName?: string;
  userEmail?: string;
  walletBalance?: number;
}

export function TutorNav({ userName, userEmail, walletBalance = 0 }: TutorNavProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const drawerJSX = (
    <div className="fixed inset-0 z-[999999] flex justify-end md:hidden">
      {/* Dark Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Slide Drawer Panel */}
      <div className="relative flex h-full w-[280px] sm:w-[320px] flex-col border-l-4 border-[#0F172A] bg-white p-5 shadow-[-8px_0px_0px_0px_rgba(15,23,42,0.15)] z-[1000000] overflow-y-auto">
        {/* Header with Close X Button */}
        <div className="mb-6 flex items-center justify-between border-b-2 border-[#0F172A] pb-4">
          <span className="font-heading text-lg font-black text-[#0F172A]">Menu</span>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="rounded-xl border-2 border-[#0F172A] bg-[#FAF8F5] p-2 text-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] hover:bg-slate-100 active:scale-95 transition-all cursor-pointer"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* User Card */}
        <div className="mb-6 flex items-center gap-3 rounded-2xl border-2 border-[#0F172A] bg-[#FEF3C7] p-3.5 shadow-[3px_3px_0px_0px_#0F172A]">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[#0F172A] bg-white shrink-0">
            <User size={20} className="text-[#0F172A]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-black text-[#0F172A]">{userName || "Tutor"}</p>
            <p className="truncate text-[11px] font-bold text-slate-600">{userEmail}</p>
          </div>
          <span className="rounded-full bg-[#0F172A] px-2 py-0.5 text-[9px] font-black uppercase text-white shrink-0">
            {walletBalance} 🪙
          </span>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-2.5">
          {LINKS.map((link) => {
            const isActive = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3.5 rounded-2xl border-2 border-[#0F172A] px-4 py-3 text-sm font-extrabold shadow-[3px_3px_0px_0px_#0F172A] transition-all active:scale-98 ${
                  isActive
                    ? "bg-[#FEF3C7] text-[#0F172A]"
                    : "bg-[#FAF8F5] text-[#0F172A] hover:bg-slate-50"
                }`}
              >
                <link.icon size={18} className={isActive ? "text-[#D97706]" : "text-slate-600"} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sign Out Button */}
        <div className="mt-6 pt-4 border-t-2 border-[#0F172A]">
          <SignOutButton
            text="Sign Out"
            iconSize={18}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#0F172A] bg-[#FCE7F3] py-3.5 text-xs font-black text-[#EF4444] shadow-[3px_3px_0px_0px_#0F172A] hover:bg-red-100"
          />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Navigation Links (md+) */}
      <div className="hidden items-center gap-1 text-xs lg:text-sm font-bold text-[#0F172A] md:flex">
        {LINKS.map((link) => {
          const isActive = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1.5 lg:px-3 transition-colors whitespace-nowrap ${
                isActive ? "border-2 border-[#0F172A] bg-[#FEF3C7]" : "hover:text-[#22C55E]"
              }`}
            >
              <link.icon size={14} />
              <span>{link.shortLabel}</span>
            </Link>
          );
        })}
      </div>

      {/* Mobile Hamburger Button (md:hidden) */}
      <button
        type="button"
        onClick={() => setMobileMenuOpen(true)}
        className="flex items-center justify-center rounded-xl border-2 border-[#0F172A] bg-[#FAF8F5] p-2 text-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] md:hidden hover:bg-slate-100 active:scale-95 transition-all cursor-pointer shrink-0"
        aria-label="Open navigation menu"
      >
        <Menu size={20} />
      </button>

      {/* Portal Drawer for Mobile */}
      {mobileMenuOpen && mounted && createPortal(drawerJSX, document.body)}
    </>
  );
}
