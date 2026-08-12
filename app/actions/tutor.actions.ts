"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { resolveTutorContext } from "@/lib/tutor-context";
import {
  actionFieldErrors,
  actionSuccess,
  type ActionResult,
} from "@/lib/action-result";
import { formFloat, formInt, formList, formString } from "@/lib/form-data";
import { tutorProfileSchema } from "@/lib/validations";
import { getProfileScore } from "@/lib/profile-score";
import { geocodeLocation } from "@/lib/geocoding";

export type TutorProfileState = ActionResult<{ updated: true }>;
export type TutorStepState = ActionResult<{ updated: true; nextStep?: number }>;

// ────────────────────────────────────────────────
// Save Tutor Profile Step (partial — all fields optional)
// Called on every "Save & Continue" click to persist progress to DB.
// ────────────────────────────────────────────────

export async function saveTutorStepAction(
  _prevState: TutorStepState,
  formData: FormData
): Promise<TutorStepState> {
  const auth = await resolveTutorContext();
  if (!auth.ok) return auth.result;

  // Read whichever fields are present in this step's form
  const subjects = formList(formData, "subjects");
  const classLevels = formList(formData, "classLevels");
  const teachingMode = formString(formData, "teachingMode");
  const teachingRadius = formInt(formData, "teachingRadius");
  const feeMin = formInt(formData, "feeMin");
  const feeMax = formInt(formData, "feeMax");
  const city = formString(formData, "city");
  const state = formString(formData, "state");
  const pincode = formString(formData, "pincode");
  const address = formString(formData, "address");
  const bio = formString(formData, "bio");
  const qualification = formString(formData, "qualification");
  const experience = formInt(formData, "experience");
  const introVideoUrl = formString(formData, "introVideoUrl");
  const formLat = formFloat(formData, "latitude");
  const formLng = formFloat(formData, "longitude");
  const nextStep = formInt(formData, "nextStep");

  const educationCourse = formString(formData, "educationCourse");
  const educationSubjects = formString(formData, "educationSubjects");
  const educationUniversity = formString(formData, "educationUniversity");
  const educationYear = formString(formData, "educationYear");
  const profession = formString(formData, "profession");
  const dateOfBirth = formString(formData, "dateOfBirth");
  const maritalStatus = formString(formData, "maritalStatus");
  const gender = formString(formData, "gender");
  const teachingStartYear = formInt(formData, "teachingStartYear");

  // Fetch current profile to preserve existing data and coords
  const current = await prisma.tutorProfile.findUnique({
    where: { id: auth.context.tutorProfileId },
    select: {
      latitude: true,
      longitude: true,
      kycStatus: true,
      isVerified: true,
      availability: true,
    },
  });

  // Geocode if we have text location but no explicit coords
  let lat: number | null = formLat ?? current?.latitude ?? null;
  let lng: number | null = formLng ?? current?.longitude ?? null;

  if (
    (lat == null || lng == null) &&
    (city || state || pincode || address)
  ) {
    const geo = await geocodeLocation({ address, city, state, pincode });
    if (geo) { lat = geo.lat; lng = geo.lng; }
  }

  // Build update payload — only include fields that were actually submitted
  const updateData: Record<string, unknown> = {};
  if (subjects.length > 0) updateData.subjects = subjects;
  if (classLevels.length > 0) updateData.classLevels = classLevels;
  if (teachingMode) updateData.teachingMode = teachingMode;
  if (teachingRadius != null) updateData.teachingRadius = teachingRadius;
  if (feeMin != null) updateData.feeMin = feeMin;
  if (feeMax != null) updateData.feeMax = feeMax;
  if (city !== undefined) updateData.city = city ?? null;
  if (state !== undefined) updateData.state = state ?? null;
  if (pincode !== undefined) updateData.pincode = pincode ?? null;
  if (address !== undefined) updateData.address = address ?? null;
  if (bio !== undefined) updateData.bio = bio ?? null;
  if (qualification) updateData.qualification = qualification;
  if (experience != null) updateData.experience = experience;
  if (introVideoUrl !== undefined) updateData.introVideoUrl = introVideoUrl || null;
  if (lat != null) updateData.latitude = lat;
  if (lng != null) updateData.longitude = lng;

  if (educationCourse !== undefined) {
    updateData.educationCourse = educationCourse || null;
    if (educationCourse) updateData.qualification = educationCourse;
  }
  if (educationSubjects !== undefined) updateData.educationSubjects = educationSubjects || null;
  if (educationUniversity !== undefined) updateData.educationUniversity = educationUniversity || null;
  if (educationYear !== undefined) updateData.educationYear = educationYear || null;
  if (profession !== undefined) updateData.profession = profession || null;
  if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth || null;
  if (maritalStatus) updateData.maritalStatus = maritalStatus;
  if (gender) updateData.gender = gender;
  if (teachingStartYear != null) {
    updateData.teachingStartYear = teachingStartYear;
    updateData.experience = new Date().getFullYear() - teachingStartYear;
  }

  if (Object.keys(updateData).length > 0) {
    // Recalculate profile score with current + new data
    const merged = {
      subjects: subjects.length > 0 ? subjects : [],
      classLevels: classLevels.length > 0 ? classLevels : [],
      teachingMode: teachingMode ?? "EITHER",
      bio: bio ?? null,
      qualification: qualification ?? null,
      experience: experience ?? null,
      city: city ?? null,
      feeMin: feeMin ?? null,
      feeMax: feeMax ?? null,
      introVideoUrl: introVideoUrl ?? null,
      latitude: lat,
      kycStatus: current?.kycStatus ?? "NOT_SUBMITTED",
      isVerified: current?.isVerified ?? false,
      availability: current?.availability ?? [],
    };
    const profileScore = getProfileScore(merged);
    updateData.profileScore = profileScore;

    await prisma.tutorProfile.update({
      where: { id: auth.context.tutorProfileId },
      data: updateData as Parameters<typeof prisma.tutorProfile.update>[0]["data"],
    });
  }

  revalidatePath("/tutor/profile");
  revalidatePath("/tutor/dashboard");

  return actionSuccess({ updated: true as const, nextStep: nextStep ?? undefined });
}



// ────────────────────────────────────────────────
// Save Tutor Profile
// ────────────────────────────────────────────────

export async function saveTutorProfileAction(
  _prevState: TutorProfileState,
  formData: FormData
): Promise<TutorProfileState> {
  const parsed = tutorProfileSchema.safeParse({
    bio: formString(formData, "bio"),
    qualification: formString(formData, "qualification"),
    experience: formInt(formData, "experience"),
    subjects: formList(formData, "subjects"),
    classLevels: formList(formData, "classLevels"),
    teachingMode: formString(formData, "teachingMode"),
    teachingRadius: formInt(formData, "teachingRadius") ?? 10,
    feeMin: formInt(formData, "feeMin"),
    feeMax: formInt(formData, "feeMax"),
    city: formString(formData, "city"),
    state: formString(formData, "state"),
    pincode: formString(formData, "pincode"),
    address: formString(formData, "address"),
    introVideoUrl: formString(formData, "introVideoUrl"),
  });

  // Explicit lat/lon from map picker — takes priority over geocoding
  const formLat = formFloat(formData, "latitude");
  const formLng = formFloat(formData, "longitude");

  if (!parsed.success) {
    return actionFieldErrors(parsed.error.flatten().fieldErrors);
  }

  const auth = await resolveTutorContext();
  if (!auth.ok) return auth.result;

  const data = {
    bio: parsed.data.bio ?? null,
    qualification: parsed.data.qualification,
    experience: parsed.data.experience,
    subjects: parsed.data.subjects,
    classLevels: parsed.data.classLevels,
    teachingMode: parsed.data.teachingMode,
    teachingRadius: parsed.data.teachingRadius,
    feeMin: parsed.data.feeMin ?? null,
    feeMax: parsed.data.feeMax ?? null,
    city: parsed.data.city ?? null,
    state: parsed.data.state ?? null,
    pincode: parsed.data.pincode ?? null,
    address: parsed.data.address ?? null,
    introVideoUrl: parsed.data.introVideoUrl || null,
  };

  // Recalculate profile completion score & geocode location
  const current = await prisma.tutorProfile.findUnique({
    where: { id: auth.context.tutorProfileId },
    select: {
      latitude: true,
      longitude: true,
      kycStatus: true,
      isVerified: true,
      availability: true,
    },
  });

  // If explicit lat/lng came from the map picker/GPS, use those directly.
  // Otherwise fall back to geocoding from text fields (city/state/pincode).
  let lat = formLat ?? current?.latitude ?? null;
  let lng = formLng ?? current?.longitude ?? null;

  if (
    (lat == null || lng == null) &&
    (parsed.data.city || parsed.data.state || parsed.data.pincode || parsed.data.address)
  ) {
    const geo = await geocodeLocation({
      address: parsed.data.address,
      city: parsed.data.city,
      state: parsed.data.state,
      pincode: parsed.data.pincode,
    });
    if (geo) {
      lat = geo.lat;
      lng = geo.lng;
    }
  }

  const profileScore = getProfileScore({
    ...data,
    latitude: lat,
    kycStatus: current?.kycStatus ?? "NOT_SUBMITTED",
    isVerified: current?.isVerified ?? false,
    availability: current?.availability ?? [],
  });

  await prisma.tutorProfile.update({
    where: { id: auth.context.tutorProfileId },
    data: {
      ...data,
      latitude: lat,
      longitude: lng,
      profileScore,
    },
  });

  revalidatePath("/tutor/profile");
  revalidatePath("/tutor/dashboard");
  revalidatePath(`/tutor/${auth.context.tutorProfileId}`);

  return actionSuccess({ updated: true as const });
}

// ────────────────────────────────────────────────
// Save Availability
// ────────────────────────────────────────────────

export type AvailabilityState = ActionResult<{ updated: true }>;

const DAYS = [0, 1, 2, 3, 4, 5, 6] as const;

export async function saveAvailabilityAction(
  _prevState: AvailabilityState,
  formData: FormData
): Promise<AvailabilityState> {
  const auth = await resolveTutorContext();
  if (!auth.ok) return auth.result;

  // Slots are submitted as day_N_start / day_N_end pairs
  const slots = DAYS.flatMap((day) => {
    const start = formString(formData, `day_${day}_start`);
    const end = formString(formData, `day_${day}_end`);
    if (!start || !end) return [];
    if (start >= end) return [];
    return [{ dayOfWeek: day, startTime: start, endTime: end }];
  });

  await prisma.$transaction([
    prisma.tutorAvailability.deleteMany({
      where: { tutorProfileId: auth.context.tutorProfileId },
    }),
    ...(slots.length > 0
      ? [
          prisma.tutorAvailability.createMany({
            data: slots.map((slot) => ({
              ...slot,
              tutorProfileId: auth.context.tutorProfileId,
            })),
          }),
        ]
      : []),
  ]);

  // Recalculate profile score now that availability changed
  const profile = await prisma.tutorProfile.findUnique({
    where: { id: auth.context.tutorProfileId },
    include: { availability: true },
  });

  if (profile) {
    const profileScore = getProfileScore(profile);
    await prisma.tutorProfile.update({
      where: { id: auth.context.tutorProfileId },
      data: { profileScore },
    });
  }

  revalidatePath("/tutor/profile");

  return actionSuccess({ updated: true as const });
}

// ────────────────────────────────────────────────
// Tutor Onboarding Wizard — Auto-Save Action
// Each step call saves its fields + advances onboardingStep in DB.
// Admin can query onboardingStep to see where tutors dropped off.
// ────────────────────────────────────────────────

export type OnboardingStepResult = {
  success: boolean;
  error?: string;
  step?: number;
};

export async function saveTutorOnboardingAction(
  data: {
    step: number;
    locality?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    latitude?: number | null;
    longitude?: number | null;
    gender?: string;
    teachingStartYear?: number;
    subjects?: string[];
    classLevels?: string[];
    teachingMode?: string;
    teachingRadius?: number;
    educationCourse?: string;
    educationSubjects?: string;
    educationUniversity?: string;
    educationYear?: string;
    interestedIn?: string[];
    profession?: string;
    dateOfBirth?: string;
    referralSource?: string;
    maritalStatus?: string;
    bio?: string;
    photoUrl?: string;
  }
): Promise<OnboardingStepResult> {
  const ctx = await resolveTutorContext();
  if (!ctx.ok) return { success: false, error: "Not authenticated" };

  const { tutorProfileId, userId } = ctx.context;
  const { step, ...fields } = data;

  try {
    const updateData: Record<string, unknown> = { onboardingStep: step };

    if (fields.city !== undefined) updateData.city = fields.city || null;
    if (fields.state !== undefined) updateData.state = fields.state || null;
    if (fields.pincode !== undefined) updateData.pincode = fields.pincode || null;
    if (fields.address !== undefined) updateData.address = fields.address || null;
    if (fields.latitude != null) updateData.latitude = fields.latitude;
    if (fields.longitude != null) updateData.longitude = fields.longitude;

    if (fields.gender) updateData.gender = fields.gender;
    if (fields.teachingStartYear != null) {
      updateData.teachingStartYear = fields.teachingStartYear;
      updateData.experience = new Date().getFullYear() - fields.teachingStartYear;
    }

    if (fields.subjects && fields.subjects.length > 0) updateData.subjects = fields.subjects;
    if (fields.classLevels && fields.classLevels.length > 0) updateData.classLevels = fields.classLevels;
    if (fields.teachingMode) updateData.teachingMode = fields.teachingMode;
    if (fields.teachingRadius != null) updateData.teachingRadius = fields.teachingRadius;

    if (fields.educationCourse !== undefined) updateData.educationCourse = fields.educationCourse || null;
    if (fields.educationSubjects !== undefined) updateData.educationSubjects = fields.educationSubjects || null;
    if (fields.educationUniversity !== undefined) updateData.educationUniversity = fields.educationUniversity || null;
    if (fields.educationYear !== undefined) updateData.educationYear = fields.educationYear || null;
    if (fields.educationCourse) updateData.qualification = fields.educationCourse;

    if (fields.interestedIn) updateData.interestedIn = fields.interestedIn;
    if (fields.profession !== undefined) updateData.profession = fields.profession || null;
    if (fields.dateOfBirth !== undefined) updateData.dateOfBirth = fields.dateOfBirth || null;
    if (fields.referralSource !== undefined) updateData.referralSource = fields.referralSource || null;
    if (fields.maritalStatus) updateData.maritalStatus = fields.maritalStatus;

    if (fields.bio !== undefined) updateData.bio = fields.bio || null;

    await prisma.tutorProfile.update({ where: { id: tutorProfileId }, data: updateData });

    if (step === 7 && fields.photoUrl) {
      await prisma.user.update({ where: { id: userId }, data: { image: fields.photoUrl } });
    }

    revalidatePath("/tutor/onboarding");
    revalidatePath("/tutor/profile");
    return { success: true, step };
  } catch (err) {
    console.error("[saveTutorOnboardingAction] error:", err);
    return { success: false, error: "Failed to save. Please try again." };
  }
}
