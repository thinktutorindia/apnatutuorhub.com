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
