"use server";

import { prisma } from "@/lib/prisma";

export interface PublicTutorResult {
  id: string;
  name: string; // first name + last initial only e.g. "Ramesh K."
  qualification: string;
  experience: number;
  subjects: string[];
  classLevels: string[];
  teachingMode: string;
  feeMin: number | null;
  feeMax: number | null;
  city: string | null;
  state: string | null;
  averageRating: number;
  totalReviews: number;
  isVerified: boolean;
  isFeatured: boolean;
  bio: string | null;
  profileScore: number;
}

function maskName(fullName: string | null): string {
  if (!fullName) return "Tutor";
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

export async function searchTutorsPublic(params: {
  subjects?: string[];
  classLevel?: string;
  mode?: string;
  budgetMax?: number;
  city?: string;
  board?: string;
}): Promise<{ tutors: PublicTutorResult[]; total: number }> {
  const { subjects, classLevel, mode, budgetMax, city } = params;

  const where: any = {
    kycStatus: "APPROVED",
    isVerified: true,
    isActive: true,
  };

  if (subjects && subjects.length > 0) {
    where.subjects = { hasSome: subjects };
  }

  if (classLevel) {
    where.classLevels = { has: classLevel };
  }

  if (mode && mode !== "EITHER") {
    where.teachingMode = { in: [mode, "EITHER"] };
  }

  if (budgetMax) {
    where.feeMin = { lte: budgetMax };
  }

  if (city) {
    where.city = { contains: city, mode: "insensitive" };
  }

  const profiles = await prisma.tutorProfile.findMany({
    where,
    orderBy: [
      { isFeatured: "desc" },
      { profileScore: "desc" },
      { averageRating: "desc" },
    ],
    take: 12,
    select: {
      id: true,
      qualification: true,
      experience: true,
      subjects: true,
      classLevels: true,
      teachingMode: true,
      feeMin: true,
      feeMax: true,
      city: true,
      state: true,
      averageRating: true,
      totalReviews: true,
      isVerified: true,
      isFeatured: true,
      bio: true,
      profileScore: true,
      user: {
        select: { name: true },
      },
    },
  });

  const total = await prisma.tutorProfile.count({ where });

  const tutors: PublicTutorResult[] = profiles.map((p) => ({
    id: p.id,
    name: maskName(p.user.name),
    qualification: p.qualification ?? "",
    experience: p.experience ?? 0,
    subjects: p.subjects,
    classLevels: p.classLevels,
    teachingMode: p.teachingMode,
    feeMin: p.feeMin,
    feeMax: p.feeMax,
    city: p.city,
    state: p.state,
    averageRating: p.averageRating,
    totalReviews: p.totalReviews,
    isVerified: p.isVerified,
    isFeatured: p.isFeatured,
    bio: p.bio,
    profileScore: p.profileScore,
  }));

  return { tutors, total };
}
