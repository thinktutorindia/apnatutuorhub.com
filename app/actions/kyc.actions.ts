"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { resolveTutorContext } from "@/lib/tutor-context";
import {
  actionError,
  actionFieldErrors,
  actionSuccess,
  type ActionResult,
} from "@/lib/action-result";
import { formString } from "@/lib/form-data";
import { z } from "zod";

export type KycState = ActionResult<{ status: "PENDING" }>;

const kycSchema = z.object({
  kycIdProofUrl: z
    .string({ required_error: "Government ID proof is required" })
    .min(1, "Government ID proof is required")
    .max(500),
  kycAddressUrl: z
    .string({ required_error: "Address proof is required" })
    .min(1, "Address proof is required")
    .max(500),
  kycSelfieUrl: z
    .string({ required_error: "Live selfie is required" })
    .min(1, "Live selfie is required")
    .max(500),
});

// ────────────────────────────────────────────────
// Submit KYC
// ────────────────────────────────────────────────

export async function submitKYCAction(
  _prevState: KycState,
  formData: FormData
): Promise<KycState> {
  const parsed = kycSchema.safeParse({
    kycIdProofUrl: formString(formData, "kycIdProofUrl"),
    kycAddressUrl: formString(formData, "kycAddressUrl"),
    kycSelfieUrl: formString(formData, "kycSelfieUrl"),
  });

  if (!parsed.success) {
    return actionFieldErrors(parsed.error.flatten().fieldErrors);
  }

  const auth = await resolveTutorContext();
  if (!auth.ok) return auth.result;

  const existing = await prisma.tutorProfile.findUnique({
    where: { id: auth.context.tutorProfileId },
    select: { kycStatus: true },
  });

  // Once KYC is APPROVED it cannot be re-submitted
  if (existing?.kycStatus === "APPROVED") {
    return actionError(
      "Your KYC is already approved. Contact support if you need to update your documents."
    );
  }

  await prisma.tutorProfile.update({
    where: { id: auth.context.tutorProfileId },
    data: {
      kycIdProofUrl: parsed.data.kycIdProofUrl,
      kycAddressUrl: parsed.data.kycAddressUrl,
      kycSelfieUrl: parsed.data.kycSelfieUrl,
      kycStatus: "PENDING",
      kycRejectionNote: null,
    },
  });

  revalidatePath("/tutor/profile");
  revalidatePath("/tutor/dashboard");

  return actionSuccess({ status: "PENDING" as const });
}
