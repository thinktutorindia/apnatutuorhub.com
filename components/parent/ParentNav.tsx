"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Calendar,
  LayoutDashboard,
  PlusCircle,
  UserCog,
} from "lucide-react";

const LINKS = [
  { href: "/parent/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/parent/my-leads", label: "Requirements", icon: BookOpen },
  { href: "/parent/post-requirement", label: "Post", icon: PlusCircle },
  { href: "/parent/bookings", label: "Bookings", icon: Calendar },
  { href: "/parent/profile", label: "Profile", icon: UserCog },
] as const;

export function ParentNav() {
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
                ? "border-2 border-[#0F172A] bg-[#DCFCE7]"
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
