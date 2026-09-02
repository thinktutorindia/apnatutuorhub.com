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
  Gift,
} from "lucide-react";
import { SignOutButton } from "@/components/auth/SignOutButton";

const LINKS = [
  { href: "/tutor/dashboard", label: "Home", shortLabel: "Home", icon: LayoutDashboard },
  { href: "/tutor/leads", label: "Find Student Leads", shortLabel: "Leads", icon: Compass },
  { href: "/tutor/bookings", label: "Classes", shortLabel: "Classes", icon: Calendar },
  { href: "/chat", label: "Messages", shortLabel: "Messages", icon: MessageSquare },
  { href: "/tutor/wallet", label: "Coin Wallet", shortLabel: "Wallet", icon: Wallet },
  { href: "/tutor/profile", label: "Profile & KYC", shortLabel: "Profile", icon: ShieldCheck },
  { href: "/referrals", label: "Referrals", shortLabel: "Referrals", icon: Gift },
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
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const drawerJSX = (
    <div className="fixed inset-0 z-[999999] flex justify-end md:hidden">
      <div
        className="fixed inset-0 bg-[#0A192F]/50 cursor-pointer"
        onClick={() => setMobileMenuOpen(false)}
      />
      <div className="relative flex h-full w-[280px] sm:w-[320px] flex-col bg-white p-5 shadow-[0_18px_44px_rgba(15,37,64,0.18)] z-[1000000] overflow-y-auto border-l border-[#E2E8F0]">
        <div className="mb-6 flex items-center justify-between border-b border-[#E2E8F0] pb-4">
          <span className="text-lg font-800 text-[#0F2540]">Menu</span>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="rounded-xl border border-[#E2E8F0] bg-white p-2 text-[#0F2540] hover:bg-[#F8FAFC] min-h-11 min-w-11 inline-flex items-center justify-center"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-[#E2E8F0] bg-[#FFF3DC] p-3.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shrink-0 text-[#F5A623] border border-amber-100">
            <User size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-800 text-[#0F2540]">{userName || "Tutor"}</p>
            <p className="truncate text-[11px] font-600 text-[#64748B]">{userEmail}</p>
          </div>
          <span className="rounded-full bg-[#0F2540] px-2 py-0.5 text-[10px] font-800 text-white shrink-0">
            {walletBalance} 🪙
          </span>
        </div>

        <nav className="flex-1 space-y-1.5">
          {LINKS.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-700 min-h-11 ${
                  active ? "bg-[#E8F7F0] text-[#238357]" : "text-[#0F2540] hover:bg-[#F8FAFC]"
                }`}
              >
                <link.icon size={18} className={active ? "text-[#2D9E6B]" : "text-[#64748B]"} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 pt-4 border-t border-[#E2E8F0]">
          <SignOutButton
            text="Sign Out"
            iconSize={18}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] py-3.5 text-xs font-800 text-[#DC2626] hover:bg-red-50 min-h-11"
          />
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="hidden items-center gap-1 text-sm font-700 text-[#0F2540] md:flex">
        {LINKS.map((link) => {
          const active = isActive(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-1 rounded-none px-2.5 py-2 lg:px-3 whitespace-nowrap border-b-2 min-h-11 ${
                active ? "border-[#2D9E6B] text-[#2D9E6B]" : "border-transparent hover:text-[#2D9E6B]"
              }`}
            >
              <link.icon size={14} />
              <span>{link.shortLabel}</span>
            </Link>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setMobileMenuOpen(true)}
        className="flex items-center justify-center rounded-xl border border-[#E2E8F0] bg-white p-2 text-[#0F2540] md:hidden hover:bg-[#F8FAFC] min-h-11 min-w-11 shrink-0"
        aria-label="Open navigation menu"
      >
        <Menu size={20} />
      </button>

      {mobileMenuOpen && mounted && createPortal(drawerJSX, document.body)}
    </>
  );
}
