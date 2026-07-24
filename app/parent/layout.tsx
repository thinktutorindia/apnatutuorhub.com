import React from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { LogoBrand } from "@/components/brand/Logo";
import { SignOutButton } from "@/components/auth/SignOutButton";
import {
  BookOpen,
  PlusCircle,
  Users,
  Calendar,
  User,
  Settings,
  Bell,
} from "lucide-react";

export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col">
      {/* Navbar */}
      <header className="pt-4 px-4 max-w-6xl mx-auto w-full">
        <nav className="neu-card px-6 py-3.5 flex items-center justify-between bg-white">
          <LogoBrand size={32} />

          <div className="hidden md:flex items-center gap-6 font-bold text-sm text-[#0F172A]">
            <a
              href="/parent/dashboard"
              className="flex items-center gap-1.5 hover:text-[#22C55E] transition-colors"
            >
              <BookOpen size={16} />
              <span>My Requirements</span>
            </a>
            <a
              href="/parent/post-requirement"
              className="flex items-center gap-1.5 hover:text-[#22C55E] transition-colors"
            >
              <PlusCircle size={16} />
              <span>Post Requirement</span>
            </a>
            <a
              href="/parent/bookings"
              className="flex items-center gap-1.5 hover:text-[#22C55E] transition-colors"
            >
              <Calendar size={16} />
              <span>Bookings</span>
            </a>
          </div>

          <div className="flex items-center gap-3">
            <div className="neu-badge bg-[#E0F2FE] text-[#0F172A] hidden sm:inline-flex items-center gap-1.5">
              <User size={14} />
              <span>{session.user.name || session.user.email}</span>
              <span className="text-[10px] bg-[#0F172A] text-white px-1.5 py-0.5 rounded-full uppercase">
                PARENT
              </span>
            </div>
            <SignOutButton />
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}
