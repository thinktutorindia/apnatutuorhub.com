import Link from "next/link";
import { redirect } from "next/navigation";
import { PlusCircle, UserPlus } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { RequirementForm } from "@/components/parent/RequirementForm";

export const metadata = {
  title: "Post a Requirement | ApnaTutorHub",
};

export default async function PostRequirementPage() {
  const session = await auth();

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
        },
      },
    },
  });

  if (!parentProfile) {
    redirect("/parent/dashboard");
  }

  return (
    <div className="space-y-6 py-4">
      <header className="neu-card flex flex-col gap-3 bg-[#DCFCE7] p-6 md:p-8">
        <div className="neu-badge w-fit bg-white text-[#0F172A]">
          <PlusCircle size={14} />
          New Requirement
        </div>
        <h1 className="text-3xl font-black text-[#0F172A] md:text-4xl">
          Tell us what you need 📝
        </h1>
        <p className="max-w-2xl text-sm font-semibold text-slate-700">
          One short form and verified tutors around you get notified instantly.
          Your phone number and address stay hidden until a tutor unlocks your
          requirement.
        </p>

        {parentProfile.students.length === 0 && (
          <Link
            href="/parent/profile"
            className="neu-btn neu-btn-white w-fit px-5 py-2.5 text-xs"
          >
            <UserPlus size={15} />
            <span>Add a student profile first (optional)</span>
          </Link>
        )}
      </header>

      <RequirementForm
        mode="create"
        students={parentProfile.students}
        defaults={{
          subjects: [],
          classLevel: "",
          board: "",
          mode: "EITHER",
          budgetMin: "",
          budgetMax: "",
          latitude: parentProfile.latitude?.toString() ?? "",
          longitude: parentProfile.longitude?.toString() ?? "",
          city: parentProfile.city ?? "",
          area: "",
          pincode: parentProfile.pincode ?? "",
          timingPreference: "",
          tutorGenderPref: "ANY",
          languagePref: "",
          notes: "",
          studentProfileId: "",
        }}
      />
    </div>
  );
}
