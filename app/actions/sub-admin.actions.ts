"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import {
  actionError,
  actionSuccess,
  type ActionResult,
} from "@/lib/action-result";
import { z } from "zod";
import bcrypt from "bcryptjs";

// ── RBAC Helper ────────────────────────────────────────────────────────────────

async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user) return { error: "Unauthenticated" as const, session: null };
  if (!can(session.user, "settings:manage") || session.user.role !== "SUPER_ADMIN") {
    return { error: "Forbidden: Super Admin only" as const, session: null };
  }
  return { error: null, session };
}

// ── Create Sub-Admin Account ───────────────────────────────────────────────────

// ── Create Sub-Admin Account ───────────────────────────────────────────────────

const createSubAdminSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional().refine((val) => !val || (val.length >= 10 && val.length <= 15), {
    message: "Phone number must be between 10 and 15 digits if provided",
  }),
  password: z.string().min(6, "Password must be at least 6 characters"),
  subAdminRole: z.enum([
    "SUPPORT",
    "VERIFICATION",
    "FINANCE",
    "OPERATIONS",
    "MARKETING",
  ]),
});

export async function createSubAdminAction(
  formData: FormData
): Promise<ActionResult<{ userId: string }>> {
  const { error, session } = await requireSuperAdmin();
  if (error) return actionError(error);

  const rawPhone = (formData.get("phone") as string)?.trim();
  const phoneVal = rawPhone && rawPhone.length > 0 ? rawPhone : undefined;

  const rawPermissions = formData.get("customPermissions") as string;
  let customPermissions: string[] = [];
  if (rawPermissions) {
    try {
      customPermissions = JSON.parse(rawPermissions);
    } catch {
      customPermissions = [];
    }
  }

  const parsed = createSubAdminSchema.safeParse({
    name: formData.get("name"),
    email: (formData.get("email") as string)?.toLowerCase().trim(),
    phone: phoneVal,
    password: formData.get("password"),
    subAdminRole: formData.get("subAdminRole"),
  });

  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message || "Invalid input");
  }

  const { name, email, phone, password, subAdminRole } = parsed.data;

  // Check for existing user by email or phone
  const existingUser = await prisma.user.findFirst({
    where: phone ? { OR: [{ email }, { phone }] } : { email },
  });
  if (existingUser) {
    return actionError("A user with this email or phone already exists");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const newUser = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name,
        email,
        phone: phone || null,
        passwordHash,
        role: "SUB_ADMIN",
        subAdminRole,
        customPermissions,
        isActive: true,
      },
    });

    await tx.auditLog.create({
      data: {
        adminId: session!.user.id,
        action: "CREATE_SUB_ADMIN",
        entityType: "User",
        entityId: user.id,
        details: `Created ${subAdminRole} sub-admin account for ${email} with ${customPermissions.length} granted features`,
      },
    });

    return user;
  });

  revalidatePath("/admin/sub-admins");
  revalidatePath("/admin/users");
  return actionSuccess({ userId: newUser.id });
}

// ── Update Sub-Admin Role & Permissions ────────────────────────────────────────

export async function updateSubAdminPermissionsAction(
  userId: string,
  customPermissions: string[],
  subAdminRole?: string
): Promise<ActionResult<{ updated: true }>> {
  const { error, session } = await requireSuperAdmin();
  if (error) return actionError(error);

  const updateData: { customPermissions: string[]; subAdminRole?: "SUPPORT" | "VERIFICATION" | "FINANCE" | "OPERATIONS" | "MARKETING" } = {
    customPermissions,
  };

  if (subAdminRole) {
    const validRoles = ["SUPPORT", "VERIFICATION", "FINANCE", "OPERATIONS", "MARKETING"];
    if (validRoles.includes(subAdminRole)) {
      updateData.subAdminRole = subAdminRole as any;
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId, role: "SUB_ADMIN" },
      data: updateData,
    });

    await tx.auditLog.create({
      data: {
        adminId: session!.user.id,
        action: "UPDATE_SUB_ADMIN_PERMISSIONS",
        entityType: "User",
        entityId: userId,
        details: `Updated sub-admin permissions (${customPermissions.length} features granted)`,
      },
    });
  });

  revalidatePath("/admin/sub-admins");
  return actionSuccess({ updated: true });
}

export async function updateSubAdminRoleAction(
  userId: string,
  subAdminRole: string
): Promise<ActionResult<{ updated: true }>> {
  const { error, session } = await requireSuperAdmin();
  if (error) return actionError(error);

  const validRoles = ["SUPPORT", "VERIFICATION", "FINANCE", "OPERATIONS", "MARKETING"];
  if (!validRoles.includes(subAdminRole)) {
    return actionError("Invalid sub-admin role");
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { subAdminRole: subAdminRole as "SUPPORT" | "VERIFICATION" | "FINANCE" | "OPERATIONS" | "MARKETING" },
    });

    await tx.auditLog.create({
      data: {
        adminId: session!.user.id,
        action: "UPDATE_SUB_ADMIN_ROLE",
        entityType: "User",
        entityId: userId,
        details: `Sub-admin role updated to ${subAdminRole}`,
      },
    });
  });

  revalidatePath("/admin/sub-admins");
  return actionSuccess({ updated: true });
}

// ── Suspend Sub-Admin ─────────────────────────────────────────────────────────

export async function suspendSubAdminAction(
  userId: string
): Promise<ActionResult<{ updated: true }>> {
  const { error, session } = await requireSuperAdmin();
  if (error) return actionError(error);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId, role: "SUB_ADMIN" },
      data: { isActive: false },
    });

    await tx.auditLog.create({
      data: {
        adminId: session!.user.id,
        action: "SUSPEND_SUB_ADMIN",
        entityType: "User",
        entityId: userId,
        details: `Sub-admin account suspended`,
      },
    });
  });

  revalidatePath("/admin/sub-admins");
  return actionSuccess({ updated: true });
}

// ── Reactivate Sub-Admin ──────────────────────────────────────────────────────

export async function reactivateSubAdminAction(
  userId: string
): Promise<ActionResult<{ updated: true }>> {
  const { error, session } = await requireSuperAdmin();
  if (error) return actionError(error);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId, role: "SUB_ADMIN" },
      data: { isActive: true },
    });

    await tx.auditLog.create({
      data: {
        adminId: session!.user.id,
        action: "REACTIVATE_SUB_ADMIN",
        entityType: "User",
        entityId: userId,
        details: `Sub-admin account reactivated`,
      },
    });
  });

  revalidatePath("/admin/sub-admins");
  return actionSuccess({ updated: true });
}

// ── Delete Sub-Admin ──────────────────────────────────────────────────────────

export async function deleteSubAdminAction(
  userId: string
): Promise<ActionResult<{ deleted: true }>> {
  const { error, session } = await requireSuperAdmin();
  if (error) return actionError(error);

  // Prevent deleting self
  if (session!.user.id === userId) {
    return actionError("You cannot delete your own account");
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.delete({ where: { id: userId, role: "SUB_ADMIN" } });
    await tx.auditLog.create({
      data: {
        adminId: session!.user.id,
        action: "DELETE_SUB_ADMIN",
        entityType: "User",
        entityId: userId,
        details: `Sub-admin account permanently deleted`,
      },
    });
  });

  revalidatePath("/admin/sub-admins");
  return actionSuccess({ deleted: true });
}

// ── List Sub-Admins ───────────────────────────────────────────────────────────

export async function getSubAdminsAction() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return actionError("Forbidden");
  }

  const subAdmins = await prisma.user.findMany({
    where: { role: "SUB_ADMIN" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      subAdminRole: true,
      customPermissions: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return actionSuccess(subAdmins);
}
