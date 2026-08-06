"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveParentContext } from "@/lib/parent-context";
import {
  actionError,
  actionFieldErrors,
  actionSuccess,
  type ActionResult,
} from "@/lib/action-result";
import { formList, formString } from "@/lib/form-data";
import { parentProfileSchema, studentProfileSchema } from "@/lib/validations";

import { geocodeLocation } from "@/lib/geocoding";

export type ParentProfileState = ActionResult<{ updated: true }>;
export type StudentProfileState = ActionResult<{ studentId: string }>;

// ────────────────────────────────────────────────
// Parent Profile
// ────────────────────────────────────────────────

export async function updateParentProfileAction(
  _prevState: ParentProfileState,
  formData: FormData
): Promise<ParentProfileState> {
  const parsed = parentProfileSchema.safeParse({
    name: formString(formData, "name"),
    phone: formString(formData, "phone"),
    city: formString(formData, "city"),
    state: formString(formData, "state"),
    pincode: formString(formData, "pincode"),
    address: formString(formData, "address"),
  });

  if (!parsed.success) {
    return actionFieldErrors(parsed.error.flatten().fieldErrors);
  }

  const auth = await resolveParentContext();
  if (!auth.ok) return auth.result;

  const { name, phone, city, state, pincode, address } = parsed.data;

  // Optional manual GPS coordinates from form
  const rawLat = formString(formData, "latitude");
  const rawLng = formString(formData, "longitude");
  let lat = rawLat ? parseFloat(rawLat) : null;
  let lng = rawLng ? parseFloat(rawLng) : null;

  // Fallback to auto-geocoding if no manual GPS pinned
  if (!lat || !lng) {
    const geo = await geocodeLocation({ address, city, state, pincode });
    if (geo) {
      lat = geo.lat;
      lng = geo.lng;
    }
  }

  try {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: auth.context.userId },
        data: { name, phone: phone ?? null },
      }),
      prisma.parentProfile.update({
        where: { id: auth.context.parentProfileId },
        data: {
          city,
          state,
          pincode,
          address: address ?? null,
          ...(lat !== null ? { latitude: lat } : {}),
          ...(lng !== null ? { longitude: lng } : {}),
        },
      }),
    ]);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return actionFieldErrors({
        phone: ["This phone number is already linked to another account"],
      });
    }
    throw error;
  }

  revalidatePath("/parent/profile");
  revalidatePath("/parent/dashboard");

  return actionSuccess({ updated: true as const });
}

// ────────────────────────────────────────────────
// Student Profiles
// ────────────────────────────────────────────────

export async function upsertStudentProfileAction(
  _prevState: StudentProfileState,
  formData: FormData
): Promise<StudentProfileState> {
  const parsed = studentProfileSchema.safeParse({
    name: formString(formData, "name"),
    classLevel: formString(formData, "classLevel"),
    board: formString(formData, "board"),
    subjects: formList(formData, "subjects"),
    notes: formString(formData, "notes"),
  });

  if (!parsed.success) {
    return actionFieldErrors(parsed.error.flatten().fieldErrors);
  }

  const auth = await resolveParentContext();
  if (!auth.ok) return auth.result;

  const studentId = formString(formData, "studentId");
  const data = {
    name: parsed.data.name,
    classLevel: parsed.data.classLevel,
    board: parsed.data.board ?? null,
    subjects: parsed.data.subjects,
    notes: parsed.data.notes ?? null,
  };

  let saved: { id: string };

  if (studentId) {
    const owned = await prisma.studentProfile.findFirst({
      where: { id: studentId, parentProfileId: auth.context.parentProfileId },
      select: { id: true },
    });

    if (!owned) {
      return actionError("That student profile does not belong to your account.");
    }

    saved = await prisma.studentProfile.update({
      where: { id: owned.id },
      data,
      select: { id: true },
    });
  } else {
    const studentCount = await prisma.studentProfile.count({
      where: { parentProfileId: auth.context.parentProfileId },
    });

    if (studentCount >= 10) {
      return actionError("You can add up to 10 student profiles.");
    }

    saved = await prisma.studentProfile.create({
      data: { ...data, parentProfileId: auth.context.parentProfileId },
      select: { id: true },
    });
  }

  revalidatePath("/parent/profile");
  revalidatePath("/parent/post-requirement");

  return actionSuccess({ studentId: saved.id });
}

export async function deleteStudentProfileAction(
  _prevState: StudentProfileState,
  formData: FormData
): Promise<StudentProfileState> {
  const studentId = formString(formData, "studentId");

  if (!studentId) {
    return actionError("Select a student profile to remove.");
  }

  const auth = await resolveParentContext();
  if (!auth.ok) return auth.result;

  const owned = await prisma.studentProfile.findFirst({
    where: { id: studentId, parentProfileId: auth.context.parentProfileId },
    select: { id: true },
  });

  if (!owned) {
    return actionError("That student profile does not belong to your account.");
  }

  await prisma.studentProfile.delete({ where: { id: owned.id } });

  revalidatePath("/parent/profile");
  revalidatePath("/parent/post-requirement");

  return actionSuccess({ studentId: owned.id });
}
