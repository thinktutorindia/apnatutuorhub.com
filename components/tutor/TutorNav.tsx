"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Compass,
  LayoutDashboard,
  ShieldCheck,
  Wallet,
} from "lucide-react";

const LINKS = [
  { href: "/tutor/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tutor/leads", label: "Leads Feed", icon: Compass },
  { href: "/tutor/wallet", label: "Wallet", icon: Wallet },
  { href: "/tutor/profile", label: "Profile & KYC", icon: ShieldCheck },
] as const;

export function TutorNav() {
  const pathname = usePathname();

  return (
    <div className="hidden items-center gap-1 text-sm font-bold text-[#0F172A] md:flex">
      {LINKS.map((link) => {
        const isActive = pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors ${
              isActive
                ? "border-2 border-[#0F172A] bg-[#FEF3C7]"
                : "hover:text-[#22C55E]"
            }`}
          >
            <link.icon size={15} />
            <span>{link.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
