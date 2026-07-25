"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveParentContext } from "@/lib/parent-context";
import { resolveLeadCommercials } from "@/lib/lead-pricing";
import { enqueueLeadMatching } from "@/lib/queue";
import {
  actionError,
  actionFieldErrors,
  actionSuccess,
  type ActionResult,
} from "@/lib/action-result";
import { formFloat, formInt, formList, formString } from "@/lib/form-data";
import { createLeadSchema, updateLockedLeadSchema } from "@/lib/validations";

export type RequirementState = ActionResult<{ leadId: string; coinCost?: number }>;

const MAX_OPEN_REQUIREMENTS = 10;

const OPEN_STATUSES = [
  "ACTIVE",
  "MATCHING",
  "APPLICATIONS_RECEIVED",
] as const;

const EDITABLE_STATUSES = new Set(["ACTIVE", "MATCHING", "APPLICATIONS_RECEIVED"]);

function readLeadForm(formData: FormData) {
  return {
    subjects: formList(formData, "subjects"),
    classLevel: formString(formData, "classLevel"),
    board: formString(formData, "board"),
    mode: formString(formData, "mode"),
    budgetMin: formInt(formData, "budgetMin"),
    budgetMax: formInt(formData, "budgetMax"),
    latitude: formFloat(formData, "latitude"),
    longitude: formFloat(formData, "longitude"),
    city: formString(formData, "city"),
    area: formString(formData, "area"),
    pincode: formString(formData, "pincode"),
    timingPreference: formString(formData, "timingPreference"),
    tutorGenderPref: formString(formData, "tutorGenderPref"),
    languagePref: formString(formData, "languagePref"),
    notes: formString(formData, "notes"),
    studentProfileId: formString(formData, "studentProfileId"),
  };
}

function readPreferencesForm(formData: FormData) {
  return {
    timingPreference: formString(formData, "timingPreference"),
    tutorGenderPref: formString(formData, "tutorGenderPref"),
    languagePref: formString(formData, "languagePref"),
    notes: formString(formData, "notes"),
  };
}

// ────────────────────────────────────────────────
// Create Requirement
// ────────────────────────────────────────────────

export async function createRequirementAction(
  _prevState: RequirementState,
  formData: FormData
): Promise<RequirementState> {
  const parsed = createLeadSchema.safeParse(readLeadForm(formData));

  if (!parsed.success) {
    return actionFieldErrors(parsed.error.flatten().fieldErrors);
  }

  const auth = await resolveParentContext();
  if (!auth.ok) return auth.result;

  const input = parsed.data;

  if (input.studentProfileId) {
    const ownsStudent = await prisma.studentProfile.findFirst({
      where: {
        id: input.studentProfileId,
        parentProfileId: auth.context.parentProfileId,
      },
      select: { id: true },
    });

    if (!ownsStudent) {
      return actionFieldErrors({
        studentProfileId: ["Select a student profile from your account"],
      });
    }
  }

  const openRequirements = await prisma.lead.count({
    where: {
      parentProfileId: auth.context.parentProfileId,
      status: { in: [...OPEN_STATUSES] },
    },
  });

  if (openRequirements >= MAX_OPEN_REQUIREMENTS) {
    return actionError(
      `You already have ${MAX_OPEN_REQUIREMENTS} open requirements. Close one before posting another.`
    );
  }

  const commercials = await resolveLeadCommercials(input.classLevel);

  const lead = await prisma.$transaction(async (tx) => {
    const created = await tx.lead.create({
      data: {
        parentProfileId: auth.context.parentProfileId,
        studentProfileId: input.studentProfileId ?? null,
        subjects: input.subjects,
        classLevel: input.classLevel,
        board: input.board ?? null,
        mode: input.mode,
        budgetMin: input.budgetMin ?? null,
        budgetMax: input.budgetMax ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        city: input.city ?? null,
        area: input.area ?? null,
        pincode: input.pincode ?? null,
        timingPreference: input.timingPreference ?? null,
        tutorGenderPref: input.tutorGenderPref ?? null,
        languagePref: input.languagePref ?? null,
        notes: input.notes ?? null,
        status: "ACTIVE",
        coinCost: commercials.coinCost,
        maxTutors: commercials.maxTutors,
        expiresAt: commercials.expiresAt,
      },
      select: { id: true, coinCost: true },
    });

    // First requirement doubles as onboarding: seed the parent's saved location.
    await tx.parentProfile.updateMany({
      where: { id: auth.context.parentProfileId, city: null },
      data: {
        city: input.city ?? null,
        pincode: input.pincode ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
      },
    });

    return created;
  });

  after(() => enqueueLeadMatching({ leadId: lead.id }));

  revalidatePath("/parent/dashboard");
  revalidatePath("/parent/my-leads");

  return actionSuccess({ leadId: lead.id, coinCost: lead.coinCost });
}

// ────────────────────────────────────────────────
// Update Requirement (with core-field lock)
// ────────────────────────────────────────────────

export async function updateRequirementAction(
  _prevState: RequirementState,
  formData: FormData
): Promise<RequirementState> {
  const leadId = formString(formData, "leadId");

  if (!leadId) {
    return actionError("We could not tell which requirement to update.");
  }

  const auth = await resolveParentContext();
  if (!auth.ok) return auth.result;

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, parentProfileId: auth.context.parentProfileId },
    select: { id: true, status: true, purchaseCount: true, classLevel: true },
  });

  if (!lead) {
    return actionError("That requirement does not belong to your account.");
  }

  if (!EDITABLE_STATUSES.has(lead.status)) {
    return actionError(
      `This requirement is ${lead.status.toLowerCase().replace(/_/g, " ")} and can no longer be edited.`
    );
  }

  // Business rule (docs/Phases.md §6.2): core fields lock permanently once a
  // tutor has paid coins for this lead. Only soft preferences stay editable.
  if (lead.purchaseCount > 0) {
    const parsed = updateLockedLeadSchema.safeParse(readPreferencesForm(formData));

    if (!parsed.success) {
      return actionFieldErrors(parsed.error.flatten().fieldErrors);
    }

    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        timingPreference: parsed.data.timingPreference ?? null,
        tutorGenderPref: parsed.data.tutorGenderPref ?? null,
        languagePref: parsed.data.languagePref ?? null,
        notes: parsed.data.notes ?? null,
      },
    });
  } else {
    const parsed = createLeadSchema.safeParse(readLeadForm(formData));

    if (!parsed.success) {
      return actionFieldErrors(parsed.error.flatten().fieldErrors);
    }

    const input = parsed.data;

    if (input.studentProfileId) {
      const ownsStudent = await prisma.studentProfile.findFirst({
        where: {
          id: input.studentProfileId,
          parentProfileId: auth.context.parentProfileId,
        },
        select: { id: true },
      });

      if (!ownsStudent) {
        return actionFieldErrors({
          studentProfileId: ["Select a student profile from your account"],
        });
      }
    }

    // Re-price only when the class tier changed; the 48h expiry window is not extended.
    const commercials =
      input.classLevel === lead.classLevel
        ? null
        : await resolveLeadCommercials(input.classLevel);

    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        studentProfileId: input.studentProfileId ?? null,
        subjects: input.subjects,
        classLevel: input.classLevel,
        board: input.board ?? null,
        mode: input.mode,
        budgetMin: input.budgetMin ?? null,
        budgetMax: input.budgetMax ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        city: input.city ?? null,
        area: input.area ?? null,
        pincode: input.pincode ?? null,
        timingPreference: input.timingPreference ?? null,
        tutorGenderPref: input.tutorGenderPref ?? null,
        languagePref: input.languagePref ?? null,
        notes: input.notes ?? null,
        ...(commercials ? { coinCost: commercials.coinCost } : {}),
      },
    });

    after(() => enqueueLeadMatching({ leadId: lead.id }));
  }

  revalidatePath("/parent/dashboard");
  revalidatePath("/parent/my-leads");
  revalidatePath(`/parent/my-leads/${lead.id}/edit`);

  return actionSuccess({ leadId: lead.id });
}

// ────────────────────────────────────────────────
// Close Requirement
// ────────────────────────────────────────────────

export async function closeRequirementAction(
  _prevState: RequirementState,
  formData: FormData
): Promise<RequirementState> {
  const leadId = formString(formData, "leadId");

  if (!leadId) {
    return actionError("We could not tell which requirement to close.");
  }

  const auth = await resolveParentContext();
  if (!auth.ok) return auth.result;

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, parentProfileId: auth.context.parentProfileId },
    select: { id: true, status: true },
  });

  if (!lead) {
    return actionError("That requirement does not belong to your account.");
  }

  if (lead.status === "CLOSED" || lead.status === "COMPLETED") {
    return actionError("This requirement is already closed.");
  }

  await prisma.lead.update({
    where: { id: lead.id },
    data: { status: "CLOSED" },
  });

  revalidatePath("/parent/dashboard");
  revalidatePath("/parent/my-leads");

  return actionSuccess({ leadId: lead.id });
}
