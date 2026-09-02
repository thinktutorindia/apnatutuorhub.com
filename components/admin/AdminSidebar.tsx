"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Logo } from "@/components/brand/Logo";
import { getAllowedSubAdminModules } from "@/lib/rbac";
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  FileText,
  Calendar,
  MessageSquare,
  Wallet,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Radio,
  Ticket,
  Search,
  BarChart3,
  UserCog,
  ClipboardList,
  Megaphone,
  Phone,
  Upload,
  UserPlus,
  PhoneCall,
  Star,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
  superAdminOnly?: boolean;
}

interface AdminSidebarProps {
  userName: string;
  userEmail: string;
  userRole: string;
  subAdminRole?: string | null;
  customPermissions?: string[] | null;
  kycPendingCount?: number;
}

export function AdminSidebar({
  userName,
  userEmail,
  userRole,
  subAdminRole,
  customPermissions,
  kycPendingCount = 0,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [crmManual, setCrmManual] = useState<boolean | null>(null);
  const crmExpanded = crmManual ?? pathname.startsWith("/admin/staff-leads");
  const isSuperAdmin = userRole === "SUPER_ADMIN";

  const allowedModules = getAllowedSubAdminModules({
    role: userRole,
    subAdminRole,
    customPermissions,
  });

  const roleLabel = isSuperAdmin
    ? "SUPER ADMIN"
    : (subAdminRole ?? userRole).replaceAll("_", " ");

  const commandCenter: NavItem[] = [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/admin/users", label: "User Directory", icon: Users },
    { href: "/admin/kyc", label: "KYC Queue", icon: ShieldCheck, badge: kycPendingCount },
  ];

  const operations: NavItem[] = [
    { href: "/admin/leads", label: "Student Leads Feed", icon: FileText },
    { href: "/admin/bookings", label: "Bookings", icon: Calendar },
    { href: "/admin/chat", label: "Chat Monitor", icon: MessageSquare },
    { href: "/admin/reviews", label: "Review Queue", icon: Star },
    { href: "/admin/wallets", label: "Coin Wallet Ledger", icon: Wallet },
    { href: "/admin/notifications", label: "Push Notification Hub", icon: Bell },
    { href: "/admin/notifications/broadcast", label: "Broadcast Dispatch", icon: Radio },
    { href: "/admin/coupons", label: "Coupon Engine", icon: Ticket },
    { href: "/admin/search", label: "Search Engine", icon: Search, superAdminOnly: true },
    { href: "/admin/settings", label: "System Settings", icon: Settings },
    { href: "/admin/audit-logs", label: "Audit Logs", icon: ClipboardList },
    { href: "/admin/dummy-campaigns", label: "Dummy Campaigns", icon: Megaphone, superAdminOnly: true },
    { href: "/admin/sub-admins", label: "Team & Roles", icon: UserCog, superAdminOnly: true },
    { href: "/admin/sub-admins/analytics", label: "Staff Analytics", icon: BarChart3, superAdminOnly: true },
  ];

  const staffCrm: NavItem[] = [
    { href: "/admin/staff-leads", label: "Staff CRM Dashboard", icon: Phone },
    { href: "/admin/staff-leads/my-dashboard", label: "My Dashboard", icon: LayoutDashboard },
    { href: "/admin/staff-leads/my-leads", label: "My Calling Queue", icon: PhoneCall },
    { href: "/admin/staff-leads/manage", label: "Lead Pipeline", icon: FileText },
    { href: "/admin/staff-leads/reports", label: "Reports", icon: BarChart3 },
    { href: "/admin/staff-leads/upload", label: "Bulk Upload", icon: Upload },
    { href: "/admin/staff-leads/assign", label: "Assign Leads", icon: UserPlus },
  ];

  function canSee(item: NavItem) {
    if (item.superAdminOnly && !isSuperAdmin) return false;
    if (isSuperAdmin) return true;
    if (allowedModules.includes(item.href)) return true;
    if (item.href === "/admin/staff-leads/my-dashboard") {
      return allowedModules.includes("/admin/staff-leads/my-leads");
    }
    return false;
  }

  function isActive(href: string) {
    if (pathname === href) return true;
    if (href === "/admin/dashboard" || href === "/admin/notifications") return false;
    if (href === "/admin/staff-leads") {
      const reserved = new Set(["my-dashboard", "my-leads", "manage", "reports", "upload", "assign"]);
      const parts = pathname.split("/");
      return parts.length === 4 && parts[2] === "staff-leads" && !reserved.has(parts[3]);
    }
    if (href === "/admin/users" && pathname.startsWith("/admin/users/")) return true;
    if (href === "/admin/dummy-campaigns" && pathname.startsWith("/admin/dummy-campaigns/")) return true;
    return false;
  }

  const visibleCommand = commandCenter.filter(canSee);
  const visibleOps = operations.filter(canSee);
  const visibleCrm = staffCrm.filter(canSee);

  const NavLink = ({ item }: { item: NavItem }) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    return (
      <Link
        href={item.href}
        onClick={() => setOpen(false)}
        className={`relative flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-[13px] font-700 transition-colors ${
          active ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
        }`}
      >
        {active && (
          <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[#2D9E6B]" />
        )}
        <Icon size={16} strokeWidth={1.75} className={active ? "text-white" : "text-white/55"} />
        <span className="flex-1 truncate">{item.label}</span>
        {item.badge && item.badge > 0 ? (
          <span className="min-w-[18px] rounded-full bg-[#E11D48] px-1.5 py-0.5 text-center text-[10px] font-800 leading-none text-white">
            {item.badge > 99 ? "99+" : item.badge}
          </span>
        ) : null}
      </Link>
    );
  };

  const SidebarContent = (
    <div className="flex h-full flex-col bg-[#0F2540] text-white">
      <div className="border-b border-white/10 px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <Link href="/" className="inline-flex items-center" aria-label="ApnaTutorHub home">
            <Logo size={32} />
          </Link>
          <span className="rounded-md bg-[#F5A623] px-1.5 py-0.5 text-[9px] font-800 tracking-wide text-[#0F2540]">
            PRO
          </span>
        </div>
        <p className="mt-3 text-[10px] font-800 uppercase tracking-[0.18em] text-[#F5A623]">{roleLabel}</p>
        <p className="mt-1 truncate text-[11px] font-600 text-white/45" title={userEmail}>
          {userName}
        </p>
      </div>

      <nav className="admin-sidebar-scroll flex-1 space-y-3 overflow-y-auto px-2.5 py-3">
        {visibleCommand.length > 0 && (
          <div>
            <p className="mb-1.5 px-3 text-[10px] font-800 uppercase tracking-[0.16em] text-white/35">
              Command Center
            </p>
            <div className="space-y-0.5">
              {visibleCommand.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </div>
          </div>
        )}

        {visibleOps.length > 0 && (
          <div>
            <p className="mb-1.5 px-3 text-[10px] font-800 uppercase tracking-[0.16em] text-white/35">
              Operations
            </p>
            <div className="space-y-0.5">
              {visibleOps.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </div>
          </div>
        )}

        {visibleCrm.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setCrmManual((v) => !(v ?? crmExpanded))}
              className="mb-1.5 flex w-full items-center justify-between px-3 text-[10px] font-800 uppercase tracking-[0.16em] text-white/35"
            >
              Staff CRM
              {crmExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
            {crmExpanded && (
              <div className="space-y-0.5">
                {visibleCrm.map((item) => (
                  <NavLink key={item.href} item={item} />
                ))}
              </div>
            )}
          </div>
        )}
      </nav>

      <div className="border-t border-white/10 p-3 pb-14">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2D9E6B] px-3 py-2.5 text-[13px] font-800 text-white hover:bg-[#238357]"
        >
          <LogOut size={15} strokeWidth={1.75} />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed left-3 top-3 z-50 flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F2540] text-white shadow-lg lg:hidden"
        aria-label="Open menu"
      >
        <Menu size={18} />
      </button>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] lg:block">{SidebarContent}</aside>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-[260px] lg:hidden">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 z-10 rounded-lg p-1 text-white/70"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
            {SidebarContent}
          </aside>
        </>
      ) : null}
    </>
  );
}
