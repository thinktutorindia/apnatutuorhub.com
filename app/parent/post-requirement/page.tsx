import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { RequirementForm } from "@/components/parent/RequirementForm";
import { ShieldCheck, HandCoins, GraduationCap } from "lucide-react";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Post Tuition Requirement — Find Tutors Near You",
  description:
    "Tell us your learning needs, subject, class level, and location. Get matched for free with verified home and online tutors in your area.",
  alternates: {
    canonical: "/parent/post-requirement",
  },
};

export default async function PostRequirementPage({
  searchParams,
}: {
  searchParams?: Promise<{ subject?: string; mode?: string; classLevel?: string; city?: string }>;
}) {
  const [session, params] = await Promise.all([
    auth(),
    searchParams ? searchParams : Promise.resolve({} as { subject?: string; mode?: string; classLevel?: string; city?: string }),
  ]);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const parentProfile = await prisma.parentProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      city: true,
      pincode: true,
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
  });

  if (!parentProfile) {
    redirect("/parent/dashboard");
  }

  // Pre-fill parameters from landing pages / hero cards if provided
  const initialSubjects: string[] = params?.subject?.trim() ? [params.subject.trim()] : [];
  const rawMode = params?.mode?.toUpperCase();
  const initialMode = rawMode === "ONLINE" ? "ONLINE" : rawMode === "EITHER" ? "EITHER" : "OFFLINE";
  const initialClassLevel = params?.classLevel?.trim() || "Class 9-10";
  const initialCity = params?.city?.trim() || parentProfile.city || "";

  return (
    <div className="space-y-6 text-slate-900 pb-12">
      {/* Friendly Header Card */}
      <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-[#0F2540] to-[#163356] text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            100% Free for Parents · Zero Advance · Free Demo
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Find the Perfect Tutor for Your Child
          </h1>
          <p className="text-sm text-slate-200 leading-relaxed font-medium">
            Fill in your child&apos;s class, subject, and locality below. Verified local teachers will reach out, usually within 2 hours.
          </p>
        </div>
      </div>

      <RequirementForm
        mode="create"
        students={parentProfile.students}
        defaults={{
          studentProfileId: "",
          subjects: initialSubjects,
          classLevel: initialClassLevel || "Class 10",
          board: "CBSE",
          mode: initialMode,
          tutorGenderPref: "ANY",
          timingPreference: "Evening (4 PM - 7 PM)",
          languagePref: "English & Hindi",
          budgetMin: "3000",
          budgetMax: "8000",
          city: initialCity,
          area: "",
          pincode: parentProfile.pincode ?? "",
          latitude: parentProfile.latitude?.toString() ?? "",
          longitude: parentProfile.longitude?.toString() ?? "",
          notes: "",
        }}
      />

      {/* Trust & Reassurance strip */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-5">
        {[
          { icon: ShieldCheck, title: "100% Verified Teachers", sub: "Aadhaar, address & degree verified" },
          { icon: HandCoins, title: "Pay Only If Satisfied", sub: "Free demo class before making any payment" },
          { icon: GraduationCap, title: "Personalized Matching", sub: "Home tutors near you or 1-on-1 online" },
        ].map((item) => (
          <div key={item.title} className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 shrink-0">
              <item.icon size={20} />
            </div>
            <div>
              <p className="text-sm font-extrabold text-[#0F2540] leading-tight">{item.title}</p>
              <p className="text-xs font-medium text-slate-500 mt-0.5">{item.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

