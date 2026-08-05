"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { resolveTutorContext } from "@/lib/tutor-context";
import {
  actionFieldErrors,
  actionSuccess,
  type ActionResult,
} from "@/lib/action-result";
import { formInt, formList, formString } from "@/lib/form-data";
import { tutorProfileSchema } from "@/lib/validations";
import { getProfileScore } from "@/lib/profile-score";
import { geocodeLocation } from "@/lib/geocoding";

export type TutorProfileState = ActionResult<{ updated: true }>;

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
    introVideoUrl: formString(formData, "introVideoUrl"),
  });

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

  // Geocode if city/state provided
  let lat = current?.latitude ?? null;
  let lng = current?.longitude ?? null;

  if (parsed.data.city || parsed.data.state) {
    const geo = await geocodeLocation({
      city: parsed.data.city,
      state: parsed.data.state,
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
