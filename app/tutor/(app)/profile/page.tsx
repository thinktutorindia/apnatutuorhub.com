import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { calcProfileScore } from "@/lib/profile-score";
import { TutorProfilePage } from "@/components/tutor/TutorProfilePage";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tutor Profile & Verification — ApnaTutorHub",
  description:
    "Complete your tutor profile, submit KYC verifications, set teaching availability, and connect with student requirements near you.",
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

  if (tutorProfile.onboardingStep < 7) {
    redirect("/tutor/onboarding");
  }

  const scoreBreakdown = calcProfileScore({
    ...tutorProfile,
    availability: tutorProfile.availability,
  });

  // Fetch coin balance from wallet
  const wallet = await prisma.wallet.findUnique({
    where: { tutorProfileId: tutorProfile.id },
    select: { balance: true },
  });

  const profileExt = tutorProfile as typeof tutorProfile & {
    pincode?: string | null;
    address?: string | null;
  };

  return (
    <TutorProfilePage
      profile={{
        id: tutorProfile.id,
        bio: tutorProfile.bio ?? "",
        qualification: tutorProfile.qualification || tutorProfile.educationCourse || "",
        experience: tutorProfile.experience?.toString() ?? "0",
        subjects: tutorProfile.subjects,
        classLevels: tutorProfile.classLevels,
        teachingMode: tutorProfile.teachingMode,
        teachingRadius: tutorProfile.teachingRadius.toString(),
        feeMin: tutorProfile.feeMin?.toString() ?? "",
        feeMax: tutorProfile.feeMax?.toString() ?? "",
        city: tutorProfile.city ?? "",
        state: tutorProfile.state ?? "",
        pincode: tutorProfile.pincode ?? "",
        address: tutorProfile.address ?? "",
        latitude: tutorProfile.latitude ?? null,
        longitude: tutorProfile.longitude ?? null,
        introVideoUrl: tutorProfile.introVideoUrl ?? "",
        availability: tutorProfile.availability,
        kycStatus: tutorProfile.kycStatus,
        kycRejectionNote: tutorProfile.kycRejectionNote ?? null,
        kycIdProofUrl: tutorProfile.kycIdProofUrl ?? null,
        kycAddressUrl: tutorProfile.kycAddressUrl ?? null,
        kycSelfieUrl: tutorProfile.kycSelfieUrl ?? null,
        isVerified: tutorProfile.isVerified,
        profileScore: tutorProfile.profileScore,
        coinBalance: wallet?.balance ?? 0,
        gender: tutorProfile.gender ?? "",
        teachingStartYear: tutorProfile.teachingStartYear?.toString() ?? "",
        educationCourse: tutorProfile.educationCourse ?? "",
        educationSubjects: tutorProfile.educationSubjects ?? "",
        educationUniversity: tutorProfile.educationUniversity ?? "",
        educationYear: tutorProfile.educationYear ?? "",
        profession: tutorProfile.profession ?? "",
        dateOfBirth: tutorProfile.dateOfBirth ?? "",
        referralSource: tutorProfile.referralSource ?? "",
        maritalStatus: tutorProfile.maritalStatus ?? "",
        interestedIn: tutorProfile.interestedIn ?? [],
      }}
      scoreBreakdown={scoreBreakdown}
    />
  );
}

