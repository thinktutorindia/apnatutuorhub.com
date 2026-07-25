import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { actionError, type ActionResult } from "@/lib/action-result";

export type ParentContext = {
  userId: string;
  parentProfileId: string;
};

export type ParentContextResult =
  | { ok: true; context: ParentContext }
  | { ok: false; result: ActionResult<never> };

/**
 * Steps 2 & 3 of the Server Action lifecycle (docs/Phases.md §3): session check
 * and RBAC authorization, plus the parent profile every parent mutation scopes to.
 */
export async function resolveParentContext(): Promise<ParentContextResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      ok: false,
      result: actionError("Your session has expired. Please log in again."),
    };
  }

  if (!can({ role: session.user.role }, "requirement:write")) {
    return {
      ok: false,
      result: actionError("Only parent accounts can manage tuition requirements."),
    };
  }

  const parentProfile = await prisma.parentProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!parentProfile) {
    return {
      ok: false,
      result: actionError("We could not find your parent profile."),
    };
  }

  return {
    ok: true,
    context: { userId: session.user.id, parentProfileId: parentProfile.id },
  };
}
