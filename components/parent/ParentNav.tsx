"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Calendar,
  LayoutDashboard,
  MessageSquare,
  PlusCircle,
  UserCog,
  Menu,
  X,
  User,
  Gift,
  GraduationCap,
} from "lucide-react";
import { SignOutButton } from "@/components/auth/SignOutButton";

const LINKS = [
  { href: "/parent/dashboard", label: "Home", shortLabel: "Home", icon: LayoutDashboard },
  { href: "/parent/my-leads", label: "Requirements", shortLabel: "Requirements", icon: BookOpen },
  { href: "/parent/post-requirement", label: "Post Requirement", shortLabel: "Post Req", icon: PlusCircle },
  { href: "/parent/bookings", label: "Classes", shortLabel: "Classes", icon: Calendar },
  { href: "/chat", label: "Messages", shortLabel: "Messages", icon: MessageSquare },
  { href: "/parent/profile", label: "My Profile", shortLabel: "Profile", icon: UserCog },
  { href: "/referrals", label: "Referrals", shortLabel: "Referrals", icon: Gift },
] as const;

interface ParentNavProps {
  userName?: string;
  userEmail?: string;
}

export function ParentNav({ userName, userEmail }: ParentNavProps) {
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

  const isActive = (href: string) => pathname === href || (href !== "/parent/dashboard" && pathname.startsWith(href));

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

        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-[#E2E8F0] bg-[#E8F7F0] p-3.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shrink-0 text-[#2D9E6B] border border-emerald-100">
            <User size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-800 text-[#0F2540]">{userName || "Parent"} · Parent</p>
            <p className="truncate text-[11px] font-600 text-[#64748B]">{userEmail}</p>
          </div>
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
                  active
                    ? "bg-[#E8F7F0] text-[#238357]"
                    : "text-[#0F2540] hover:bg-[#F8FAFC]"
                }`}
              >
                <link.icon size={18} className={active ? "text-[#2D9E6B]" : "text-[#64748B]"} />
                <span>{link.label}</span>
              </Link>
            );
          })}
          <Link
            href="/tutor/onboarding"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3.5 rounded-xl bg-[#FFF3DC] px-4 py-3 text-sm font-700 text-[#92400E] hover:bg-amber-100 min-h-11"
          >
            <GraduationCap size={18} className="text-[#F5A623]" />
            <span>Become a Tutor</span>
          </Link>
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
                active
                  ? "border-[#2D9E6B] text-[#2D9E6B]"
                  : "border-transparent hover:text-[#2D9E6B]"
              }`}
            >
              <link.icon size={14} />
              <span>{link.shortLabel}</span>
            </Link>
          );
        })}
        <Link
          href="/tutor/onboarding"
          className="flex items-center gap-1 rounded-full px-3 py-1.5 bg-[#FFF3DC] text-[#92400E] hover:bg-amber-100 whitespace-nowrap ml-1 text-xs font-800 min-h-11"
        >
          <GraduationCap size={14} />
          <span>Teach</span>
        </Link>
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
