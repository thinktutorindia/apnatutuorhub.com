import { redirect } from "next/navigation";
import { UserCog } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
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
    <div className="space-y-8 py-4">
      <header className="neu-card flex flex-col gap-2 bg-[#F3E8FF] p-6 md:p-8">
        <div className="neu-badge w-fit bg-white text-[#0F172A]">
          <UserCog size={14} />
          Account Settings
        </div>
        <h1 className="text-3xl font-black text-[#0F172A] md:text-4xl">
          My Profile
        </h1>
        <p className="max-w-2xl text-sm font-semibold text-slate-700">
          Keep your location accurate — we use it to match you with verified
          tutors nearby, and to pre-fill your tuition requirements.
        </p>
      </header>

      <ParentProfileForm
        defaults={{
          name: user.name ?? "",
          email: user.email,
          phone: user.phone ?? "",
          city: parentProfile.city ?? "",
          state: parentProfile.state ?? "",
          pincode: parentProfile.pincode ?? "",
          address: parentProfile.address ?? "",
          latitude: parentProfile.latitude,
          longitude: parentProfile.longitude,
        }}
      />

      <StudentProfilesSection students={parentProfile.students} />
    </div>
  );
}
