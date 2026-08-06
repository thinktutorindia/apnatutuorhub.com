"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  FileText,
  Wallet,
  Settings,
  ClipboardList,
  LogOut,
  GraduationCap,
  ChevronRight,
  UserCog,
  Bell,
  Ticket,
  BarChart3,
  Menu,
  X,
} from "lucide-react";
import { signOut } from "next-auth/react";

const ALL_NAV_ITEMS = [
  { label: "Dashboard",     href: "/admin/dashboard",                      icon: LayoutDashboard, roles: null },
  { label: "Analytics",     href: "/admin/analytics",                      icon: BarChart3,       roles: null },
  { label: "Users",         href: "/admin/users",                           icon: Users,           roles: ["SUPER_ADMIN", "SUPPORT", "VERIFICATION", "OPERATIONS"] },
  { label: "KYC Queue",     href: "/admin/kyc",                             icon: ShieldCheck,     roles: ["SUPER_ADMIN", "VERIFICATION"],  badge: "!" },
  { label: "Leads",         href: "/admin/leads",                           icon: FileText,        roles: ["SUPER_ADMIN", "OPERATIONS", "MARKETING", "SUPPORT"] },
  { label: "Wallets",       href: "/admin/wallets",                         icon: Wallet,          roles: ["SUPER_ADMIN", "FINANCE"] },
  { label: "Notifications", href: "/admin/notifications/broadcast",         icon: Bell,            roles: ["SUPER_ADMIN", "MARKETING"] },
  { label: "Coupons",       href: "/admin/coupons",                         icon: Ticket,          roles: ["SUPER_ADMIN", "MARKETING"] },
  { label: "Settings",      href: "/admin/settings",                        icon: Settings,        roles: ["SUPER_ADMIN", "MARKETING"] },
  { label: "Audit Logs",    href: "/admin/audit-logs",                      icon: ClipboardList,   roles: ["SUPER_ADMIN", "SUPPORT", "VERIFICATION", "FINANCE", "OPERATIONS", "MARKETING"] },
  { label: "Sub-Admins",    href: "/admin/sub-admins",                      icon: UserCog,         roles: ["SUPER_ADMIN"] },
] as const;

const SUB_ADMIN_ROLE_LABELS: Record<string, { label: string; color: string }> = {
  SUPPORT:      { label: "support",      color: "#38BDF8" },
  VERIFICATION: { label: "verification", color: "#A78BFA" },
  FINANCE:      { label: "finance",      color: "#4ADE80" },
  OPERATIONS:   { label: "operations",   color: "#FB923C" },
  MARKETING:    { label: "marketing",    color: "#F472B6" },
  SUPER_ADMIN:  { label: "super_admin",  color: "#22C55E" },
};

interface AdminSidebarProps {
  userName: string;
  userRole?: string;
  subAdminRole?: string | null;
}

export function AdminSidebar({ userName, userRole = "SUPER_ADMIN", subAdminRole }: AdminSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const effectiveRole = userRole === "SUB_ADMIN" ? (subAdminRole ?? "") : userRole;
  const roleLabel = SUB_ADMIN_ROLE_LABELS[effectiveRole] ?? { label: effectiveRole.toLowerCase(), color: "#94A3B8" };

  const handleSignOut = () => {
    setMobileOpen(false);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    signOut({ callbackUrl: `${origin}/login` });
  };

  const visibleNavItems = ALL_NAV_ITEMS.filter(({ roles, href }) => {
    if (href === "/admin/dashboard") return true;
    if (roles === null) return true;
    return (roles as readonly string[]).includes(effectiveRole);
  });

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo / Brand Header */}
      <div
        className="flex items-center justify-between gap-3 px-6 py-5"
        style={{ borderBottom: "1px solid #1E293B" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ background: "linear-gradient(135deg, #22C55E, #16A34A)" }}
          >
            <GraduationCap size={18} color="#fff" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-sm font-bold text-white" style={{ fontFamily: "'Poppins', sans-serif", letterSpacing: "-0.02em" }}>
              ApnaTutorHub
            </p>
            <p className="text-xs" style={{ color: roleLabel.color, fontFamily: "'Fira Code', monospace" }}>
              {roleLabel.label}
            </p>
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 lg:hidden"
          aria-label="Close sidebar"
        >
          <X size={20} />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p
          className="mb-2 px-3 text-xs font-semibold uppercase tracking-widest"
          style={{ color: "#475569" }}
        >
          Governance
        </p>
        <ul className="space-y-1">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/admin/dashboard"
                ? pathname === item.href
                : pathname.startsWith(item.href);
            const badge = "badge" in item ? (item as { badge?: string }).badge : undefined;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200"
                  style={{
                    background: active
                      ? "linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05))"
                      : "transparent",
                    color: active ? "#22C55E" : "#94A3B8",
                    border: active ? "1px solid rgba(34,197,94,0.2)" : "1px solid transparent",
                  }}
                >
                  <Icon size={16} strokeWidth={active ? 2.5 : 2} />
                  <span style={{ fontFamily: "'Fira Sans', sans-serif" }}>{item.label}</span>
                  {badge && !active && (
                    <span
                      className="ml-auto flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold"
                      style={{ background: "#EF4444", color: "#fff" }}
                    >
                      {badge}
                    </span>
                  )}
                  {active && (
                    <ChevronRight
                      size={14}
                      className="ml-auto opacity-70"
                      style={{ color: "#22C55E" }}
                    />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer — user info + sign out */}
      <div
        className="px-4 py-4"
        style={{ borderTop: "1px solid #1E293B" }}
      >
        <div
          className="mb-3 flex items-center gap-3 rounded-xl px-3 py-2.5"
          style={{ background: "rgba(30,41,59,0.6)" }}
        >
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white shrink-0"
            style={{ background: roleLabel.color }}
          >
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-white">
              {userName}
            </p>
            <p
              className="text-xs"
              style={{ color: roleLabel.color, fontFamily: "'Fira Code', monospace" }}
            >
              {roleLabel.label}
            </p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-150 hover:bg-red-900/20 hover:text-red-400"
          style={{ color: "#64748B" }}
        >
          <LogOut size={15} />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Topbar */}
      <div className="flex items-center justify-between border-b border-[#1E293B] bg-[#0F172A] px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-xl border border-slate-700 bg-slate-800 p-2 text-white hover:bg-slate-700"
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-500 text-white">
              <GraduationCap size={15} />
            </div>
            <span className="font-bold text-white text-sm">ApnaTutorHub Admin</span>
          </div>
        </div>
      </div>

      {/* Desktop Sidebar (Fixed) */}
      <aside
        className="fixed inset-y-0 left-0 z-40 hidden flex-col lg:flex"
        style={{
          width: "260px",
          background: "linear-gradient(180deg, #0F172A 0%, #0A0F1E 100%)",
          borderRight: "1px solid #1E293B",
        }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (Slide-Over) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="relative flex w-4/5 max-w-xs flex-1 flex-col"
            style={{
              background: "linear-gradient(180deg, #0F172A 0%, #0A0F1E 100%)",
              borderRight: "1px solid #1E293B",
            }}
          >
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
