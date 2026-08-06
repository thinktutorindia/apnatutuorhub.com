import React from "react";
import Link from "next/link";
import { LogoBrand } from "@/components/brand/Logo";
import { AuthIllustration } from "@/components/illustrations/AuthIllustration";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col md:flex-row items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-center">

        {/* Left — Illustration panel (hidden on mobile) */}
        <div className="hidden md:flex md:col-span-5 flex-col items-center justify-center">
          <AuthIllustration />
        </div>

        {/* Right — Form panel */}
        <div className="col-span-1 md:col-span-7 w-full">
          <div className="rounded-3xl border-2 border-[#0F172A] bg-white p-5 sm:p-8 shadow-[6px_6px_0px_0px_#0F172A] space-y-5">
            {/* Card Header */}
            <div className="flex justify-between items-center pb-3 border-b-2 border-slate-100">
              <LogoBrand size={32} />
              <Link
                href="/"
                className="text-xs font-extrabold text-slate-500 hover:text-[#0F172A] underline transition-colors"
              >
                ← Back to Home
              </Link>
            </div>
            {children}
          </div>
        </div>

      </div>
    </div>
  );
}
