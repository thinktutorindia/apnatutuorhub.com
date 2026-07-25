import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { actionError, type ActionResult } from "@/lib/action-result";

export type TutorContext = {
  userId: string;
  tutorProfileId: string;
};

export type TutorContextResult =
  | { ok: true; context: TutorContext }
  | { ok: false; result: ActionResult<never> };

export async function resolveTutorContext(): Promise<TutorContextResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      ok: false,
      result: actionError("Your session has expired. Please log in again."),
    };
  }

  if (!can({ role: session.user.role }, "kyc:upload")) {
    return {
      ok: false,
      result: actionError("Only tutor accounts can manage KYC and profiles."),
    };
  }

  const tutorProfile = await prisma.tutorProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!tutorProfile) {
    return {
      ok: false,
      result: actionError("We could not find your tutor profile."),
    };
  }

  return {
    ok: true,
    context: { userId: session.user.id, tutorProfileId: tutorProfile.id },
  };
}
