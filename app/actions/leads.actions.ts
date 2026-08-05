"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveParentContext } from "@/lib/parent-context";
import { resolveTutorContext } from "@/lib/tutor-context";
import { resolveLeadCommercials } from "@/lib/lead-pricing";
import { dispatchLeadMatching } from "@/lib/matching-dispatcher";
import {
  actionError,
  actionFieldErrors,
  actionSuccess,
  type ActionResult,
} from "@/lib/action-result";
import { formFloat, formInt, formList, formString } from "@/lib/form-data";
import { createLeadSchema, updateLockedLeadSchema } from "@/lib/validations";
import { captureEvent, Events } from "@/lib/posthog";
import { logActivity, ActivityEvent } from "@/lib/activity-logger";
import { createNotification } from "@/lib/notification-engine";
import { geocodeLocation } from "@/lib/geocoding";

export type RequirementState = ActionResult<{ leadId: string; coinCost?: number }>;

// ── Lead Purchase types ───────────────────────────────────────────────────────

export type ParentContact = {
  name: string | null;
  email: string;
  phone: string | null;
  area: string | null;
  city: string | null;
  pincode: string | null;
};

export type PurchaseLeadState = ActionResult<{
  purchaseId: string;
  parentContact: ParentContact;
}>;

export type ApplicationState = ActionResult<{ updated: true }>;
export type ApplicantActionState = ActionResult<{ updated: true }>;

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

  // Auto-geocode lead location if lat/lng not provided directly
  let lat = input.latitude ?? null;
  let lng = input.longitude ?? null;

  if ((!lat || !lng) && (input.city || input.pincode || input.area)) {
    const geo = await geocodeLocation({
      address: input.area,
      city: input.city,
      pincode: input.pincode,
    });
    if (geo) {
      lat = geo.lat;
      lng = geo.lng;
    }
  }

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
        latitude: lat,
        longitude: lng,
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
        latitude: lat,
        longitude: lng,
      },
    });

    return created;
  });

  after(() => dispatchLeadMatching(lead.id));

  revalidatePath("/parent/dashboard");
  revalidatePath("/parent/my-leads");

  captureEvent(auth.context.userId, Events.LEAD_POSTED, {
    leadId: lead.id,
    coinCost: lead.coinCost,
    subjects: input.subjects,
    classLevel: input.classLevel,
    mode: input.mode,
    city: input.city,
  });

  // Phase 13: Activity logging
  after(() =>
    logActivity({
      userId: auth.context.userId,
      event: ActivityEvent.LEAD_CREATED,
      metadata: { leadId: lead.id, coinCost: lead.coinCost, subjects: input.subjects, classLevel: input.classLevel },
    })
  );

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

    after(() => dispatchLeadMatching(lead.id));
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

// ────────────────────────────────────────────────
// Purchase Lead (Tutor unlocks parent contact)
// ────────────────────────────────────────────────

export async function purchaseLeadAction(
  leadId: string
): Promise<PurchaseLeadState> {
  const authCtx = await resolveTutorContext();
  if (!authCtx.ok) return authCtx.result;

  const tutorProfileId = authCtx.context.tutorProfileId;

  const [lead, wallet, tutorKyc] = await Promise.all([
    prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        status: true,
        classLevel: true,
        subjects: true,
        coinCost: true,
        maxTutors: true,
        purchaseCount: true,
        area: true,
        city: true,
        pincode: true,
        parentProfile: {
          select: {
            user: { select: { id: true, name: true, email: true, phone: true } },
          },
        },
      },
    }),
    prisma.wallet.findUnique({
      where: { tutorProfileId },
      select: { id: true, balance: true },
    }),
    prisma.tutorProfile.findUnique({
      where: { id: tutorProfileId },
      select: { kycStatus: true },
    }),
  ]);

  if (!lead) return actionError("This lead no longer exists.");

  if (["CLOSED", "EXPIRED", "COMPLETED"].includes(lead.status)) {
    return actionError("This lead is no longer accepting applications.");
  }

  if (lead.purchaseCount >= lead.maxTutors) {
    return actionError(
      "This lead has reached its maximum number of tutors."
    );
  }

  if (tutorKyc?.kycStatus !== "APPROVED") {
    return actionError(
      "Your KYC must be approved before you can unlock leads."
    );
  }

  const walletBalance = wallet?.balance ?? 0;
  if (walletBalance < lead.coinCost) {
    return actionError(
      `Insufficient coins. You have ${walletBalance} coins but this lead costs ${lead.coinCost}. Please top up your wallet.`
    );
  }

  const alreadyPurchased = await prisma.leadPurchase.findFirst({
    where: { leadId, tutorProfileId },
    select: { id: true },
  });
  if (alreadyPurchased) return actionError("You have already unlocked this lead.");

  // ── Enterprise Upgrade: Move balance guard INSIDE the transaction ─────────
  // Previously, the wallet balance was checked BEFORE the transaction began.
  // Under concurrent requests (double-click / race), both checks could pass
  // before the first decrement committed, causing negative wallet balances.
  // Now the check and decrement happen atomically within the same transaction.

  // Atomic 7-step transaction with in-transaction balance guard
  const result = await prisma.$transaction(async (tx) => {
    // Re-fetch wallet inside transaction for accurate balance
    const lockedWallet = await tx.wallet.findUnique({
      where: { tutorProfileId },
      select: { id: true, balance: true },
    });

    if (!lockedWallet || lockedWallet.balance < lead.coinCost) {
      throw new Error(
        `Insufficient coins. You have ${lockedWallet?.balance ?? 0} coins but this lead costs ${lead.coinCost}.`
      );
    }

    const updatedWallet = await tx.wallet.update({
      where: { tutorProfileId },
      data: {
        balance: { decrement: lead.coinCost },
        totalSpent: { increment: lead.coinCost },
      },
    });

    await tx.walletTransaction.create({
      data: {
        walletId: updatedWallet.id,
        type: "DEDUCTION",
        amount: lead.coinCost,
        balanceAfter: updatedWallet.balance,
        description: `Lead unlock — ${lead.city ?? "location"}`,
        referenceId: leadId,
      },
    });

    const purchase = await tx.leadPurchase.create({
      data: { leadId, tutorProfileId, coinsSpent: lead.coinCost },
    });

    const newPurchaseCount = lead.purchaseCount + 1;
    const newStatus =
      newPurchaseCount >= lead.maxTutors
        ? "APPLICATIONS_RECEIVED"
        : lead.status === "ACTIVE"
          ? "MATCHING"
          : lead.status;

    await tx.lead.update({
      where: { id: leadId },
      data: {
        purchaseCount: { increment: 1 },
        ...(newStatus !== lead.status ? { status: newStatus } : {}),
      },
    });

    return purchase;
  }).catch((err: Error) => {
    // Surface in-transaction balance errors as ActionResult errors
    if (err.message.startsWith("Insufficient coins")) {
      return null;
    }
    throw err;
  });

  if (!result) {
    return actionError(
      `Insufficient coins. This lead costs ${lead.coinCost} coins. Please top up your wallet.`
    );
  }

  revalidatePath("/tutor/leads");
  revalidatePath("/tutor/wallet");
  revalidatePath("/tutor/dashboard");

  captureEvent(authCtx.context.userId, Events.LEAD_UNLOCKED, {
    leadId,
    purchaseId: result.id,
    coinsSpent: lead.coinCost,
    city: lead.city,
  });

  // Phase 13: Activity logging
  after(() =>
    logActivity({
      userId: authCtx.context.userId,
      event: ActivityEvent.LEAD_PURCHASED,
      metadata: { leadId, purchaseId: result.id, coinsSpent: lead.coinCost },
    })
  );

  // Phase 1: Dispatch notifications to Parent & Tutor
  after(() => {
    // Notify Parent that a tutor unlocked their requirement
    void createNotification({
      userId: lead.parentProfile.user.id,
      type: "LEAD_UNLOCKED",
      title: "🎯 A Tutor Unlocked Your Requirement!",
      message: `A verified tutor unlocked your requirement for ${lead.classLevel} ${lead.subjects.join(", ")}. Check your applicants list to chat with them!`,
      actionUrl: `/parent/my-leads/${leadId}/applicants`,
    });

    // Notify Tutor confirmation
    void createNotification({
      userId: authCtx.context.userId,
      type: "LEAD_PURCHASED",
      title: "✅ Parent Contact Unlocked!",
      message: `You unlocked parent contact details for ${lead.classLevel} ${lead.subjects.join(", ")}.`,
      actionUrl: `/tutor/leads`,
    });
  });

  return actionSuccess({
    purchaseId: result.id,
    parentContact: {
      name: lead.parentProfile.user.name,
      email: lead.parentProfile.user.email,
      phone: lead.parentProfile.user.phone,
      area: lead.area,
      city: lead.city,
      pincode: lead.pincode,
    },
  });
}

// ────────────────────────────────────────────────
// Submit Application (proposal + fee quote)
// ────────────────────────────────────────────────

export async function submitApplicationAction(
  _prevState: ApplicationState,
  formData: FormData
): Promise<ApplicationState> {
  const authCtx = await resolveTutorContext();
  if (!authCtx.ok) return authCtx.result;

  const purchaseId = formData.get("purchaseId") as string | null;
  const proposalNote = (formData.get("proposalNote") as string | null)?.trim();
  const feeQuoteStr = formData.get("feeQuote") as string | null;
  const feeQuote = feeQuoteStr ? parseInt(feeQuoteStr, 10) : null;

  if (!purchaseId) return actionError("Invalid application reference.");

  const purchase = await prisma.leadPurchase.findFirst({
    where: { id: purchaseId, tutorProfileId: authCtx.context.tutorProfileId },
    select: { id: true },
  });

  if (!purchase) return actionError("Application not found or access denied.");

  await prisma.leadPurchase.update({
    where: { id: purchaseId },
    data: {
      proposalNote: proposalNote ?? null,
      ...(feeQuote && Number.isFinite(feeQuote) ? { feeQuote } : {}),
    },
  });

  revalidatePath("/tutor/leads");
  return actionSuccess({ updated: true as const });
}

// ────────────────────────────────────────────────
// Shortlist / Reject Applicant (Parent actions)
// ────────────────────────────────────────────────

export async function shortlistApplicantAction(
  purchaseId: string
): Promise<ApplicantActionState> {
  const auth = await resolveParentContext();
  if (!auth.ok) return auth.result;

  const purchase = await prisma.leadPurchase.findFirst({
    where: {
      id: purchaseId,
      lead: { parentProfileId: auth.context.parentProfileId },
    },
    select: {
      id: true,
      isShortlisted: true,
      tutorProfile: { select: { userId: true } },
      lead: { select: { classLevel: true, subjects: true } },
    },
  });

  if (!purchase) return actionError("Applicant not found.");

  const newShortlistState = !purchase.isShortlisted;

  await prisma.leadPurchase.update({
    where: { id: purchaseId },
    data: { isShortlisted: newShortlistState, isRejected: false },
  });

  if (newShortlistState) {
    await prisma.notification.create({
      data: {
        userId: purchase.tutorProfile.userId,
        title: "⭐ You were Shortlisted!",
        message: `A parent shortlisted your application for ${purchase.lead.classLevel} ${purchase.lead.subjects.join(", ")}.`,
        actionUrl: "/tutor/leads",
      },
    });
  }

  revalidatePath(`/parent/my-leads`);
  revalidatePath("/tutor/leads");
  revalidatePath("/tutor/dashboard");

  return actionSuccess({ updated: true as const });
}

export async function rejectApplicantAction(
  purchaseId: string
): Promise<ApplicantActionState> {
  const auth = await resolveParentContext();
  if (!auth.ok) return auth.result;

  const purchase = await prisma.leadPurchase.findFirst({
    where: {
      id: purchaseId,
      lead: { parentProfileId: auth.context.parentProfileId },
    },
    select: { id: true },
  });

  if (!purchase) return actionError("Applicant not found.");

  await prisma.leadPurchase.update({
    where: { id: purchaseId },
    data: { isRejected: true, isShortlisted: false },
  });

  revalidatePath(`/parent/my-leads`);
  revalidatePath("/tutor/leads");
  revalidatePath("/tutor/dashboard");

  return actionSuccess({ updated: true as const });
}
