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
    <div className="space-y-6 text-slate-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 ath-panel">
        <div className="space-y-1.5">
          <span className="text-[11px] font-800 uppercase tracking-widest text-[#2D9E6B]">Free for parents</span>
          <h1 className="text-2xl sm:text-3xl font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
            Tell us what your child needs
          </h1>
          <p className="text-sm text-slate-600 font-500 max-w-xl">
            Just the class, subject and your area. Verified tutors nearby will see it and reach out, usually within a few hours.
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

      {/* Reassurance strip (matches the promise parents see everywhere) */}
      <div className="ath-panel p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: ShieldCheck, title: "100% verified teachers", sub: "Aadhaar & degree checked" },
          { icon: HandCoins, title: "Pay only when satisfied", sub: "No advance, no parent fees" },
          { icon: GraduationCap, title: "Free demo class first", sub: "Meet the tutor before you decide" },
        ].map((item) => (
          <div key={item.title} className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-[#2D9E6B] border border-emerald-100 shrink-0">
              <item.icon size={20} />
            </div>
            <div>
              <p className="text-sm font-800 text-[#0F2540] leading-tight">{item.title}</p>
              <p className="text-xs font-500 text-slate-500">{item.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

