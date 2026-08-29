import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TutorOnboardingWizard } from "@/components/tutor/onboarding/TutorOnboardingWizard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Complete Your Tutor Profile - ApnaTutorHub",
  description:
    "Set up your tutor profile in a few easy steps to start receiving matched student leads near you.",
};

export default async function TutorOnboardingPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/tutor/onboarding");
  }

  let tutorProfile = await prisma.tutorProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      onboardingStep: true,
      city: true,
      state: true,
      pincode: true,
      address: true,
      latitude: true,
      longitude: true,
      gender: true,
      teachingStartYear: true,
      subjects: true,
      classLevels: true,
      teachingMode: true,
      teachingRadius: true,
      educationCourse: true,
      educationSubjects: true,
      educationUniversity: true,
      educationYear: true,
      interestedIn: true,
      profession: true,
      dateOfBirth: true,
      referralSource: true,
      maritalStatus: true,
      bio: true,
    },
  });

  if (!tutorProfile) {
    const created = await prisma.tutorProfile.create({
      data: { userId: session.user.id },
    });
    await prisma.wallet.upsert({
      where: { tutorProfileId: created.id },
      create: { tutorProfileId: created.id },
      update: {},
    });
    await prisma.user.update({
      where: { id: session.user.id },
      data: { role: "TUTOR" },
    });

    tutorProfile = {
      id: created.id,
      onboardingStep: 1,
      city: created.city,
      state: created.state,
      pincode: created.pincode,
      address: created.address,
      latitude: created.latitude,
      longitude: created.longitude,
      gender: created.gender,
      teachingStartYear: created.teachingStartYear,
      subjects: created.subjects,
      classLevels: created.classLevels,
      teachingMode: created.teachingMode,
      teachingRadius: created.teachingRadius,
      educationCourse: created.educationCourse,
      educationSubjects: created.educationSubjects,
      educationUniversity: created.educationUniversity,
      educationYear: created.educationYear,
      interestedIn: created.interestedIn,
      profession: created.profession,
      dateOfBirth: created.dateOfBirth,
      referralSource: created.referralSource,
      maritalStatus: created.maritalStatus,
      bio: created.bio,
    };
  }

  // If onboarding already complete, redirect to plans
  if (tutorProfile.onboardingStep >= 7) {
    redirect("/tutor/plans");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, image: true },
  });

  return (
    <TutorOnboardingWizard
      profile={{
        id: tutorProfile.id,
        onboardingStep: tutorProfile.onboardingStep,
        city: tutorProfile.city ?? "",
        state: tutorProfile.state ?? "",
        pincode: tutorProfile.pincode ?? "",
        address: tutorProfile.address ?? "",
        latitude: tutorProfile.latitude ?? null,
        longitude: tutorProfile.longitude ?? null,
        gender: tutorProfile.gender ?? "",
        teachingStartYear: tutorProfile.teachingStartYear ?? null,
        subjects: tutorProfile.subjects,
        classLevels: tutorProfile.classLevels,
        teachingMode: tutorProfile.teachingMode,
        teachingRadius: tutorProfile.teachingRadius,
        educationCourse: tutorProfile.educationCourse ?? "",
        educationSubjects: tutorProfile.educationSubjects ?? "",
        educationUniversity: tutorProfile.educationUniversity ?? "",
        educationYear: tutorProfile.educationYear ?? "",
        interestedIn: tutorProfile.interestedIn,
        profession: tutorProfile.profession ?? "",
        dateOfBirth: tutorProfile.dateOfBirth ?? "",
        referralSource: tutorProfile.referralSource ?? "",
        maritalStatus: tutorProfile.maritalStatus ?? "",
        bio: tutorProfile.bio ?? "",
        photoUrl: user?.image ?? "",
        tutorName: user?.name ?? "",
      }}
    />
  );
}
