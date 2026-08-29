import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { GraduationCap, ArrowRight, Sparkles } from "lucide-react";
import { ParentProfileForm } from "@/components/parent/ParentProfileForm";
import { StudentProfilesSection } from "@/components/parent/StudentProfilesSection";

export const metadata = {
  title: "My Profile | ApnaTutorHub",
};

export default async function ParentProfilePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      phone: true,
      image: true,
      parentProfile: {
        select: {
          city: true,
          state: true,
          pincode: true,
          address: true,
          latitude: true,
          longitude: true,
          students: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              name: true,
              classLevel: true,
              board: true,
              subjects: true,
              notes: true,
              image: true,
            },
          },
        },
      },
    },
  });

  if (!user?.parentProfile) {
    redirect("/parent/dashboard");
  }

  const { parentProfile } = user;

  return (
    <div className="space-y-6 text-slate-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white border border-slate-200 shadow-xs">
        <div className="space-y-1">
          <span className="text-[11px] font-800 uppercase tracking-widest text-[#2D9E6B]">Account Preferences</span>
          <h1 className="text-2xl font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
            Parent Profile &amp; Children Details
          </h1>
          <p className="text-xs text-slate-600 font-600">
            Manage your personal contact info, location address, and student profiles for faster requirement posting
          </p>
        </div>
      </div>

      {/* Dual Role / Teach as Tutor Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-teal-500/10 p-6 sm:p-8 border border-amber-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[11px] font-extrabold">
            <Sparkles size={13} className="text-amber-600" />
            <span>Dual Role Privilege</span>
          </div>
          <h2 className="text-lg sm:text-xl font-800 text-[#0F2540]">
            Want to teach &amp; earn as a Tutor too? 🎓
          </h2>
          <p className="text-xs text-slate-600 font-500 max-w-xl leading-relaxed">
            You can keep your parent account active and also register as a verified tutor on ApnaTutorHub. Set your own teaching fees, choose your nearby localities, and receive verified student leads.
          </p>
        </div>
        <Link
          href="/tutor/onboarding"
          className="px-5 py-3 rounded-2xl bg-[#0F2540] hover:bg-[#1A3C5E] text-white font-800 text-xs shadow-md hover:shadow-lg transition-all shrink-0 hover:scale-105 active:scale-95 flex items-center gap-2"
        >
          <GraduationCap size={16} className="text-amber-400" />
          <span>Register as Tutor</span>
          <ArrowRight size={14} />
        </Link>
      </div>

      {/* Profile Form Container */}
      <div className="rounded-3xl bg-white p-6 sm:p-8 border border-slate-200 shadow-xs">
        <ParentProfileForm
          defaults={{
            name: user.name ?? "",
            email: user.email,
            phone: user.phone ?? "",
            image: user.image ?? "",
            city: parentProfile.city ?? "",
            state: parentProfile.state ?? "",
            pincode: parentProfile.pincode ?? "",
            address: parentProfile.address ?? "",
            latitude: parentProfile.latitude ?? null,
            longitude: parentProfile.longitude ?? null,
          }}
        />
      </div>

      {/* Student Profiles Section */}
      <div className="rounded-3xl bg-white p-6 sm:p-8 border border-slate-200 shadow-xs">
        <StudentProfilesSection students={parentProfile.students} />
      </div>
    </div>
  );
}
