import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { RequirementForm } from "@/components/parent/RequirementForm";

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white border border-slate-200 shadow-xs">
        <div className="space-y-1">
          <span className="text-[11px] font-800 uppercase tracking-widest text-[#2D9E6B]">New Tuition Listing</span>
          <h1 className="text-2xl font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
            Post a Tuition Requirement
          </h1>
          <p className="text-xs text-slate-600 font-600">
            Tell us what subjects, class level, budget, and teaching mode you need. Nearby verified tutors will be notified instantly.
          </p>
        </div>
      </div>

      <RequirementForm
        mode="create"
        students={parentProfile.students}
        defaults={{
          studentProfileId: "",
          subjects: initialSubjects,
          classLevel: initialClassLevel,
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
    </div>
  );
}

