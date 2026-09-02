"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogoBrand } from "@/components/brand/Logo";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { getWhatsAppSupportLink, SUPPORT_PHONE_DISPLAY } from "@/lib/support";
import { Menu, Phone, X } from "lucide-react";

const linkClass =
  "inline-flex items-center h-11 text-[15px] font-700 text-[#0F2540] hover:text-[#2D9E6B] whitespace-nowrap shrink-0";

export function PublicSiteHeader({
  user,
  dashboardUrl,
  parentCtaUrl,
}: {
  user?: { name?: string | null; role?: string } | null;
  dashboardUrl?: string;
  parentCtaUrl: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const role = user?.role;
  const isTutor = role === "TUTOR";
  const isAdmin = role === "SUPER_ADMIN" || role === "SUB_ADMIN";
  const loggedIn = Boolean(user && dashboardUrl);

  const ctaHref = isTutor ? "/tutor/leads" : parentCtaUrl;
  const ctaLabel = isTutor ? "Find Students" : "Post Requirement Free";
  const ctaShort = isTutor ? "Leads" : "Post Free";
  const showCta = !isAdmin;

  const navLinks = [
    { href: "/find-tutor", label: "Find Tutors" },
    { href: "/#how-it-works", label: "How It Works" },
    { href: parentCtaUrl, label: "Post Requirement" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#E2E8F0] shadow-[0_2px_12px_rgba(15,37,64,0.06)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-[72px] flex items-center justify-between gap-6 min-w-0">
        <div className="flex items-center gap-8 min-w-0">
          <LogoBrand />
          <nav className="hidden lg:flex items-center gap-7">
            <Link href="/find-tutor" className={linkClass}>
              Find Tutors
            </Link>
            <a href="/#how-it-works" className={linkClass}>
              How It Works
            </a>
          </nav>
        </div>

        <div className="flex items-center gap-5 shrink-0">
          <a
            href={getWhatsAppSupportLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden xl:inline-flex items-center gap-2 h-11 text-sm font-700 text-[#2D9E6B] hover:text-[#238357] whitespace-nowrap"
            aria-label={`Helpline ${SUPPORT_PHONE_DISPLAY}`}
          >
            <Phone size={16} />
            {SUPPORT_PHONE_DISPLAY}
          </a>

          {loggedIn ? (
            <>
              <Link href={dashboardUrl!} className={`hidden lg:inline-flex ${linkClass}`}>
                Dashboard
              </Link>
              <span className="hidden lg:inline-flex shrink-0">
                <SignOutButton variant="link" />
              </span>
            </>
          ) : (
            <Link href="/login" className={`hidden lg:inline-flex ${linkClass}`}>
              Log in
            </Link>
          )}

          {showCta && (
            <Link
              href={ctaHref}
              className="inline-flex items-center justify-center h-11 px-5 rounded-xl bg-[#2D9E6B] hover:bg-[#238357] text-white text-sm font-800 whitespace-nowrap shrink-0"
            >
              <span className="sm:hidden">{ctaShort}</span>
              <span className="hidden sm:inline">{ctaLabel}</span>
            </Link>
          )}

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="lg:hidden inline-flex items-center justify-center w-11 h-11 rounded-xl border border-[#E2E8F0] text-[#0F2540]"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-[99999] lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setOpen(false)} />
          <div className="absolute top-0 right-0 h-full w-[min(20rem,100%)] bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-4 h-16 border-b border-[#E2E8F0]">
              <span className="font-800 text-sm text-[#0F2540]">Menu</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-11 h-11 rounded-xl flex items-center justify-center border border-[#E2E8F0]"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
              {navLinks.map((link) =>
                link.href.includes("#") ? (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center min-h-12 px-4 rounded-xl text-sm font-700 text-[#0F2540] hover:bg-[#F8FAFC]"
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.label}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center min-h-12 px-4 rounded-xl text-sm font-700 text-[#0F2540] hover:bg-[#F8FAFC]"
                  >
                    {link.label}
                  </Link>
                )
              )}
              <a
                href={getWhatsAppSupportLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 min-h-12 px-4 rounded-xl text-sm font-700 text-[#2D9E6B]"
              >
                <Phone size={16} />
                Helpline {SUPPORT_PHONE_DISPLAY}
              </a>
            </nav>
            <div className="p-4 border-t border-[#E2E8F0] space-y-2">
              {loggedIn ? (
                <>
                  <Link
                    href={dashboardUrl!}
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-center min-h-12 rounded-xl text-sm font-700 text-[#0F2540] border border-[#E2E8F0]"
                  >
                    Dashboard
                  </Link>
                  <SignOutButton variant="full" text="Sign Out" />
                </>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center min-h-12 rounded-xl text-sm font-700 text-[#0F2540] border border-[#E2E8F0]"
                >
                  Log in
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
