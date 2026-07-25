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
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
        
        {/* Left — Illustration panel (hidden on mobile) */}
        <div className="hidden md:flex md:col-span-5 flex-col items-center justify-center">
          <AuthIllustration />
        </div>

        {/* Right — Form panel (Neubrutalism Card) */}
        <div className="md:col-span-7 w-full">
          <div className="neu-card p-6 md:p-10 bg-white space-y-6">
            <div className="flex justify-between items-center pb-2 border-b-2 border-slate-200">
              <LogoBrand size={36} />
              <Link
                href="/"
                className="text-xs font-extrabold text-slate-600 hover:text-[#0F172A] underline"
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
