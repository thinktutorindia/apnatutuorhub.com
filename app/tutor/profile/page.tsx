import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { calcProfileScore } from "@/lib/profile-score";
import { TutorProfilePage } from "@/components/tutor/TutorProfilePage";

export const metadata = {
  title: "Profile & KYC | ThinkTutor",
};

export default async function TutorProfilePageRoute() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const tutorProfile = await prisma.tutorProfile.findUnique({
    where: { userId: session.user.id },
    include: { availability: { orderBy: { dayOfWeek: "asc" } } },
  });

  if (!tutorProfile) {
    redirect("/tutor/dashboard");
  }

  const scoreBreakdown = calcProfileScore({
    ...tutorProfile,
    availability: tutorProfile.availability,
  });

  return (
    <TutorProfilePage
      profile={{
        id: tutorProfile.id,
        bio: tutorProfile.bio ?? "",
        qualification: tutorProfile.qualification ?? "",
        experience: tutorProfile.experience?.toString() ?? "0",
        subjects: tutorProfile.subjects,
        classLevels: tutorProfile.classLevels,
        teachingMode: tutorProfile.teachingMode,
        teachingRadius: tutorProfile.teachingRadius.toString(),
        feeMin: tutorProfile.feeMin?.toString() ?? "",
        feeMax: tutorProfile.feeMax?.toString() ?? "",
        city: tutorProfile.city ?? "",
        state: tutorProfile.state ?? "",
        introVideoUrl: tutorProfile.introVideoUrl ?? "",
        availability: tutorProfile.availability,
        kycStatus: tutorProfile.kycStatus,
        kycRejectionNote: tutorProfile.kycRejectionNote ?? null,
        kycIdProofUrl: tutorProfile.kycIdProofUrl ?? null,
        kycAddressUrl: tutorProfile.kycAddressUrl ?? null,
        kycSelfieUrl: tutorProfile.kycSelfieUrl ?? null,
        isVerified: tutorProfile.isVerified,
        profileScore: tutorProfile.profileScore,
      }}
      scoreBreakdown={scoreBreakdown}
    />
  );
}
