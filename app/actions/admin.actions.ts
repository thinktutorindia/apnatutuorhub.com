"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { can, type Permission } from "@/lib/rbac";
import {
  actionError,
  actionSuccess,
  type ActionResult,
} from "@/lib/action-result";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { createNotification } from "@/lib/notification-engine";
import { inferClassLevelFromSubjects } from "@/lib/validations";

// ── Permission Guard Factory ───────────────────────────────────────────────────
// Each admin action requires only its specific permission, enabling sub-admins
// (e.g. VERIFICATION for kyc:review, FINANCE for wallets:manage) to operate.

async function requirePermission(permission: Permission) {
  const session = await auth();
  if (!session?.user) return { error: "Unauthenticated" as const, session: null };
  if (!can(session.user, permission)) {
    return { error: "Forbidden" as const, session: null };
  }
  return { error: null, session };
}

// Keep a super-admin-only guard for truly privileged operations (sub-admin management, etc.)
async function requireSuperAdmin() {
  return requirePermission("settings:manage");
}

const PRIVILEGED_ROLES = new Set(["SUPER_ADMIN", "SUB_ADMIN"]);

/**
 * Security guard against privilege escalation: only a SUPER_ADMIN may create,
 * assign or modify SUPER_ADMIN / SUB_ADMIN accounts. Sub-admins holding
 * `users:manage` (e.g. SUPPORT) can manage PARENT/TUTOR users but must never be
 * able to mint or take over admin accounts.
 */
function isSuperAdmin(session: { user?: { role?: string | null } } | null): boolean {
  return session?.user?.role === "SUPER_ADMIN";
}



// ── User Management ────────────────────────────────────────────────────────────

export async function suspendUserAction(
  userId: string
): Promise<ActionResult<{ updated: true }>> {
  const { error, session } = await requirePermission("users:suspend");
  if (error) return actionError(error);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { isActive: false } });
    // Delete all active sessions to force immediate logout
    await tx.session.deleteMany({ where: { userId } });
    await tx.auditLog.create({
      data: {
        adminId: session!.user.id,
        action: "SUSPEND_USER",
        entityType: "User",
        entityId: userId,
      },
    });
  });

  await createNotification({
    userId,
    type: "USER_SUSPENDED",
    priority: "CRITICAL",
    title: "⛔ Account Suspended",
    message: "Your account has been suspended by an administrator. Please contact support if you believe this was an error.",
    actionUrl: "/login",
  });

  revalidatePath("/admin/users");
  return actionSuccess({ updated: true });
}

export async function reactivateUserAction(
  userId: string
): Promise<ActionResult<{ updated: true }>> {
  const { error, session } = await requirePermission("users:suspend");
  if (error) return actionError(error);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { isActive: true } });
    await tx.auditLog.create({
      data: {
        adminId: session!.user.id,
        action: "REACTIVATE_USER",
        entityType: "User",
        entityId: userId,
      },
    });
  });

  await createNotification({
    userId,
    type: "USER_REACTIVATED",
    priority: "HIGH",
    title: "✅ Account Reactivated!",
    message: "Your ApnaTutorHub account has been reactivated. You can now access your dashboard and services.",
    actionUrl: "/login",
  });

  revalidatePath("/admin/users");
  return actionSuccess({ updated: true });
}

import type { SubAdminRole, TeachingMode, KycStatus } from "@prisma/client";

export type CreateUserInput = {
  name: string;
  email: string;
  phone?: string;
  password?: string;
  role: "PARENT" | "TUTOR" | "SUB_ADMIN" | "SUPER_ADMIN";
  subAdminRole?: SubAdminRole;
  // Shared Location Data
  city?: string;
  state?: string;
  pincode?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  // Tutor Specific
  subjects?: string[];
  classLevels?: string[];
  teachingMode?: TeachingMode;
  experience?: number;
  qualification?: string;
  feeMin?: number;
  feeMax?: number;
  gender?: string;
  bio?: string;
  isVerified?: boolean;
  kycStatus?: KycStatus;
  // Parent Specific
  studentName?: string;
  classLevel?: string;
  board?: string;
  notes?: string;
};

export async function adminCreateUserAction(
  input: CreateUserInput
): Promise<ActionResult<{ userId: string; email: string; temporaryPassword?: string }>> {
  const { error, session } = await requirePermission("users:manage");
  if (error) return actionError(error);

  if (PRIVILEGED_ROLES.has(input.role) && !isSuperAdmin(session)) {
    return actionError("Forbidden: only a Super Admin can create admin accounts.");
  }

  let emailClean = input.email ? input.email.trim().toLowerCase() : "";

  // Auto-generate sequential fallback email if not provided
  if (!emailClean) {
    const cleanPhone = input.phone ? input.phone.replace(/\D/g, "") : "";
    if (cleanPhone && cleanPhone.length >= 10) {
      const phoneCandidate = `user${cleanPhone}@apnatutorhub.com`;
      const exists = await prisma.user.findUnique({ where: { email: phoneCandidate } });
      if (!exists) {
        emailClean = phoneCandidate;
      }
    }

    if (!emailClean) {
      const totalUsers = await prisma.user.count();
      let num = totalUsers + 1;
      let candidate = `user${num}@apnatutorhub.com`;
      while (await prisma.user.findUnique({ where: { email: candidate } })) {
        num++;
        candidate = `user${num}@apnatutorhub.com`;
      }
      emailClean = candidate;
    }
  }

  const existing = await prisma.user.findUnique({
    where: { email: emailClean },
  });

  if (existing) {
    return actionError(`User with email "${emailClean}" already exists.`);
  }

  const rawPassword = input.password?.trim() || "12345678";
  const passwordHash = await bcrypt.hash(rawPassword, 10);

  const newUser = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: input.name.trim(),
        email: emailClean,
        phone: input.phone?.trim() || null,
        passwordHash,
        role: input.role,
        subAdminRole: input.role === "SUB_ADMIN" ? (input.subAdminRole ?? "SUPPORT") : null,
        isActive: true,
        emailVerified: new Date(),
      },
    });

    if (input.role === "PARENT") {
      const parent = await tx.parentProfile.create({
        data: {
          userId: user.id,
          city: input.city?.trim() || null,
          state: input.state?.trim() || null,
          pincode: input.pincode?.trim() || null,
          address: input.address?.trim() || null,
          latitude: input.latitude ?? null,
          longitude: input.longitude ?? null,
        },
      });

      const studentSubjects = input.subjects && input.subjects.length > 0 ? input.subjects : [];
      if (
        input.studentName ||
        input.classLevel ||
        studentSubjects.length > 0 ||
        input.board ||
        input.notes
      ) {
        const finalClassLevel =
          input.classLevel?.trim() ||
          inferClassLevelFromSubjects(studentSubjects) ||
          "General";

        await tx.studentProfile.create({
          data: {
            parentProfileId: parent.id,
            name: input.studentName?.trim() || "Child",
            classLevel: finalClassLevel,
            board: input.board?.trim() || null,
            subjects: studentSubjects,
            notes: input.notes?.trim() || null,
          },
        });
      }
    } else if (input.role === "TUTOR") {
      const tutorSubjects = input.subjects && input.subjects.length > 0 ? input.subjects : [];
      const tutorClassLevels =
        input.classLevels && input.classLevels.length > 0 ? input.classLevels : [];

      const tutor = await tx.tutorProfile.create({
        data: {
          userId: user.id,
          city: input.city?.trim() || null,
          state: input.state?.trim() || null,
          pincode: input.pincode?.trim() || null,
          address: input.address?.trim() || null,
          latitude: input.latitude ?? null,
          longitude: input.longitude ?? null,
          subjects: tutorSubjects,
          classLevels: tutorClassLevels,
          teachingMode: input.teachingMode ?? "EITHER",
          experience: input.experience ?? null,
          qualification: input.qualification?.trim() || null,
          feeMin: input.feeMin ?? null,
          feeMax: input.feeMax ?? null,
          gender: input.gender?.trim() || null,
          bio: input.bio?.trim() || null,
          isVerified: input.isVerified !== undefined ? input.isVerified : true,
          kycStatus: input.kycStatus ?? "APPROVED",
          onboardingStep: 7, // Marks onboarding complete so tutor is instantly usable
        },
      });

      await tx.wallet.create({
        data: {
          tutorProfileId: tutor.id,
          balance: 0,
          totalPurchased: 0,
          totalSpent: 0,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        adminId: session!.user.id,
        action: "CREATE_USER",
        entityType: "User",
        entityId: user.id,
        details: `Created ${input.role} account for ${user.email} (${input.name.trim()})`,
      },
    });

    return user;
  });

    revalidatePath("/admin/users");
  return actionSuccess({
    userId: newUser.id,
    email: newUser.email,
    temporaryPassword: input.password ? undefined : rawPassword,
  });
}

export async function adminGetNextAutoEmailAction(
  role: string = "USER",
  phone?: string
): Promise<ActionResult<{ email: string }>> {
  try {
    const { error } = await requirePermission("users:manage");
    if (error) return actionError(error);

    const cleanPhone = phone ? phone.replace(/\D/g, "") : "";
    if (cleanPhone && cleanPhone.length >= 10) {
      const candidate = `${role.toLowerCase()}${cleanPhone}@apnatutorhub.com`;
      const exists = await prisma.user.findUnique({ where: { email: candidate } });
      if (!exists) return actionSuccess({ email: candidate });
    }

    const totalUsers = await prisma.user.count();
    let num = totalUsers + 1;
    let candidate = `${role.toLowerCase()}${num}@apnatutorhub.com`;

    while (await prisma.user.findUnique({ where: { email: candidate } })) {
      num++;
      candidate = `${role.toLowerCase()}${num}@apnatutorhub.com`;
    }

    return actionSuccess({ email: candidate });
  } catch (err: any) {
    return actionError(err.message ?? "Failed to generate email.");
  }
}

// ── KYC Management ─────────────────────────────────────────────────────────────
// Requires: kyc:review (SUPER_ADMIN + VERIFICATION sub-admin)

export async function approveKycAction(
  tutorProfileId: string
): Promise<ActionResult<{ updated: true }>> {
  const { error, session } = await requirePermission("kyc:review");
  if (error) return actionError(error);

  const profile = await prisma.tutorProfile.findUnique({
    where: { id: tutorProfileId },
    select: { userId: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.tutorProfile.update({
      where: { id: tutorProfileId },
      data: { kycStatus: "APPROVED", isVerified: true, kycRejectionNote: null },
    });
    await tx.auditLog.create({
      data: {
        adminId: session!.user.id,
        action: "KYC_APPROVE",
        entityType: "TutorProfile",
        entityId: tutorProfileId,
      },
    });
  });

  if (profile?.userId) {
    await createNotification({
      userId: profile.userId,
      type: "KYC_APPROVED",
      priority: "HIGH",
      title: "🎉 KYC Verification Approved!",
      message: "Congratulations! Your identity documents have been verified by an administrator. Your tutor profile is now live for parents.",
      actionUrl: "/tutor/profile",
    });
  }

  revalidatePath("/admin/kyc");
  return actionSuccess({ updated: true });
}

const rejectKycSchema = z.object({
  tutorProfileId: z.string().min(1),
  rejectionNote: z.string().min(5, "Please provide a rejection reason"),
});

export async function rejectKycAction(
  formData: FormData
): Promise<ActionResult<{ updated: true }>> {
  const { error, session } = await requirePermission("kyc:review");
  if (error) return actionError(error);

  const parsed = rejectKycSchema.safeParse({
    tutorProfileId: formData.get("tutorProfileId"),
    rejectionNote: formData.get("rejectionNote"),
  });
  if (!parsed.success) return actionError("Invalid input");

  const { tutorProfileId, rejectionNote } = parsed.data;

  const profile = await prisma.tutorProfile.findUnique({
    where: { id: tutorProfileId },
    select: { userId: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.tutorProfile.update({
      where: { id: tutorProfileId },
      data: {
        kycStatus: "REJECTED",
        isVerified: false,
        kycRejectionNote: rejectionNote,
      },
    });
    await tx.auditLog.create({
      data: {
        adminId: session!.user.id,
        action: "KYC_REJECT",
        entityType: "TutorProfile",
        entityId: tutorProfileId,
        details: rejectionNote,
      },
    });
  });

  if (profile?.userId) {
    await createNotification({
      userId: profile.userId,
      type: "KYC_REJECTED",
      priority: "HIGH",
      title: "⚠️ KYC Verification Update Required",
      message: `Your document submission requires revision: "${rejectionNote}". Please upload updated documents.`,
      actionUrl: "/tutor/profile",
    });
  }

  revalidatePath("/admin/kyc");
  return actionSuccess({ updated: true });
}

// ── Lead Management ────────────────────────────────────────────────────────────
// Requires: leads:manage (SUPER_ADMIN + OPERATIONS sub-admin)

export async function forceCloseLeadAction(
  leadId: string
): Promise<ActionResult<{ updated: true }>> {
  const { error, session } = await requirePermission("leads:manage");
  if (error) return actionError(error);

  await prisma.$transaction(async (tx) => {
    await tx.lead.update({ where: { id: leadId }, data: { status: "CLOSED" } });
    await tx.auditLog.create({
      data: {
        adminId: session!.user.id,
        action: "LEAD_FORCE_CLOSE",
        entityType: "Lead",
        entityId: leadId,
      },
    });
  });

  revalidatePath("/admin/leads");
  return actionSuccess({ updated: true });
}

export async function forceExpireLeadAction(
  leadId: string
): Promise<ActionResult<{ updated: true }>> {
  const { error, session } = await requirePermission("leads:manage");
  if (error) return actionError(error);

  await prisma.$transaction(async (tx) => {
    await tx.lead.update({ where: { id: leadId }, data: { status: "EXPIRED" } });
    await tx.auditLog.create({
      data: {
        adminId: session!.user.id,
        action: "LEAD_FORCE_EXPIRE",
        entityType: "Lead",
        entityId: leadId,
      },
    });
  });

  revalidatePath("/admin/leads");
  return actionSuccess({ updated: true });
}

export async function forceRadiusExpandAction(
  leadId: string
): Promise<ActionResult<{ updated: true }>> {
  const { error, session } = await requirePermission("leads:manage");
  if (error) return actionError(error);

  await prisma.$transaction(async (tx) => {
    const lead = await tx.lead.findUniqueOrThrow({ where: { id: leadId } });
    await tx.lead.update({
      where: { id: leadId },
      data: { radiusKm: lead.radiusKm + 5 },
    });
    await tx.auditLog.create({
      data: {
        adminId: session!.user.id,
        action: "LEAD_FORCE_RADIUS_EXPAND",
        entityType: "Lead",
        entityId: leadId,
        details: `Radius expanded to ${lead.radiusKm + 5} km`,
      },
    });
  });

  revalidatePath("/admin/leads");
  return actionSuccess({ updated: true });
}

// ── Wallet Management ──────────────────────────────────────────────────────────
// Requires: wallets:manage (SUPER_ADMIN + FINANCE sub-admin)

const adminWalletSchema = z.object({
  tutorProfileId: z.string().min(1),
  amount: z.coerce.number().int().min(1).max(10000),
  description: z.string().optional(),
});

export async function adminCreditCoinsAction(
  formData: FormData
): Promise<ActionResult<{ updated: true }>> {
  const { error, session } = await requirePermission("wallets:manage");
  if (error) return actionError(error);

  const parsed = adminWalletSchema.safeParse({
    tutorProfileId: formData.get("tutorProfileId"),
    amount: formData.get("amount"),
    description: formData.get("description"),
  });
  if (!parsed.success) return actionError("Invalid input");

  const { tutorProfileId, amount, description } = parsed.data;

  const profile = await prisma.tutorProfile.findUnique({
    where: { id: tutorProfileId },
    select: { userId: true },
  });

  await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUniqueOrThrow({
      where: { tutorProfileId },
    });
    const newBalance = wallet.balance + amount;
    await tx.wallet.update({
      where: { tutorProfileId },
      data: { balance: newBalance, totalPurchased: { increment: amount } },
    });
    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: "ADMIN_CREDIT",
        amount,
        balanceAfter: newBalance,
        description: description || "Admin credit",
      },
    });
    await tx.auditLog.create({
      data: {
        adminId: session!.user.id,
        action: "WALLET_ADMIN_CREDIT",
        entityType: "Wallet",
        entityId: wallet.id,
        details: `Credited ${amount} coins. ${description || ""}`,
      },
    });
  });

  if (profile?.userId) {
    await createNotification({
      userId: profile.userId,
      type: "WALLET_CREDITED",
      priority: "HIGH",
      title: "💰 Coins Credited to Wallet",
      message: `An administrator credited ${amount} coins to your wallet balance.`,
      actionUrl: "/tutor/wallet",
    });
  }

  revalidatePath("/admin/wallets");
  return actionSuccess({ updated: true });
}

export async function adminDebitCoinsAction(
  formData: FormData
): Promise<ActionResult<{ updated: true }>> {
  const { error, session } = await requirePermission("wallets:manage");
  if (error) return actionError(error);

  const parsed = adminWalletSchema.safeParse({
    tutorProfileId: formData.get("tutorProfileId"),
    amount: formData.get("amount"),
    description: formData.get("description"),
  });
  if (!parsed.success) return actionError("Invalid input");

  const { tutorProfileId, amount, description } = parsed.data;

  await prisma.$transaction(async (tx) => {
    const updated = await tx.wallet.updateMany({
      where: { tutorProfileId, balance: { gte: amount } },
      data: { balance: { decrement: amount }, totalSpent: { increment: amount } },
    });
    if (updated.count === 0) throw new Error("INSUFFICIENT_BALANCE");
    const wallet = await tx.wallet.findUniqueOrThrow({
      where: { tutorProfileId },
      select: { id: true, balance: true },
    });
    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: "ADMIN_DEBIT",
        amount,
        balanceAfter: wallet.balance,
        description: description || "Admin debit",
      },
    });
    await tx.auditLog.create({
      data: {
        adminId: session!.user.id,
        action: "WALLET_ADMIN_DEBIT",
        entityType: "Wallet",
        entityId: wallet.id,
        details: `Debited ${amount} coins. ${description || ""}`,
      },
    });
  });

  revalidatePath("/admin/wallets");
  return actionSuccess({ updated: true });
}

// ── Platform Settings ──────────────────────────────────────────────────────────
// Requires: settings:manage (SUPER_ADMIN + MARKETING sub-admin)

const updateSettingSchema = z.object({
  key: z.string().min(1),
  value: z.coerce.number().finite().min(0),
});

export async function updatePlatformSettingAction(
  formData: FormData
): Promise<ActionResult<{ updated: true }>> {
  // settings:manage is intentionally the strictest — includes MARKETING but NOT FINANCE/VERIFICATION
  const { error, session } = await requirePermission("settings:manage");
  if (error) return actionError(error);

  const parsed = updateSettingSchema.safeParse({
    key: formData.get("key"),
    value: formData.get("value"),
  });
  if (!parsed.success) return actionError("Invalid input");

  const { key, value } = parsed.data;

  await prisma.$transaction(async (tx) => {
    await tx.platformSetting.upsert({
      where: { key },
      create: { key, value: String(value) },
      update: { value: String(value) },
    });
    await tx.auditLog.create({
      data: {
        adminId: session!.user.id,
        action: "SETTING_UPDATE",
        entityType: "PlatformSetting",
        entityId: key,
        details: `${key} → ${value}`,
      },
    });
  });

  revalidatePath("/admin/settings");
  return actionSuccess({ updated: true });
}

// ── Admin Dashboard Stats (accessible to all admin roles) ──────────────────────

export async function getAdminDashboardStats() {
  // All authenticated admin roles can view dashboard stats.
  // Sub-admins need their own department overview to operate effectively.
  const session = await auth();
  if (!session?.user) return null;
  if (!session.user.role || !["SUPER_ADMIN", "SUB_ADMIN"].includes(session.user.role)) {
    return null;
  }

  const [
    totalUsers,
    totalParents,
    totalTutors,
    activeLeads,
    totalLeads,
    pendingKyc,
    totalBookings,
    walletAgg,
    pendingRefunds,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "PARENT" } }),
    prisma.user.count({ where: { role: "TUTOR" } }),
    prisma.lead.count({ where: { status: { in: ["ACTIVE", "MATCHING", "APPLICATIONS_RECEIVED"] } } }),
    prisma.lead.count(),
    prisma.tutorProfile.count({ where: { kycStatus: "PENDING" } }),
    prisma.booking.count(),
    prisma.wallet.aggregate({ _sum: { balance: true, totalPurchased: true } }),
    prisma.walletTransaction.count({
      where: { type: "REFUND", description: "REFUND_REQUEST_PENDING" },
    }),
  ]);

  const totalCoinsCirculating = walletAgg._sum.balance ?? 0;
  const totalCoinsSold = walletAgg._sum.totalPurchased ?? 0;

  return {
    totalUsers,
    totalParents,
    totalTutors,
    activeLeads,
    totalLeads,
    pendingKyc,
    totalBookings,
    totalCoinsCirculating,
    totalCoinsSold,
    pendingRefunds,
  };
}

// ── Refund Management ────────────────────────────────────────────────────────────
// Requires: wallets:manage (SUPER_ADMIN + FINANCE sub-admin)

export async function approveRefundAction(
  walletTransactionId: string
): Promise<ActionResult<{ updated: true }>> {
  const { error, session } = await requirePermission("wallets:manage");
  if (error) return actionError(error);

  const txRecord = await prisma.walletTransaction.findUnique({
    where: { id: walletTransactionId },
    select: {
      id: true,
      type: true,
      description: true,
      amount: true,
      referenceId: true,
      walletId: true,
      wallet: {
        select: {
          tutorProfileId: true,
          balance: true,
          tutorProfile: { select: { userId: true } },
        },
      },
    },
  });

  if (!txRecord || txRecord.type !== "REFUND" || txRecord.description !== "REFUND_REQUEST_PENDING") {
    return actionError("Refund request not found or already processed.");
  }

  // Notification.userId references User.id — NOT TutorProfile.id.
  const tutorUserId = txRecord.wallet.tutorProfile?.userId;

  await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUniqueOrThrow({
      where: { id: txRecord.walletId },
    });
    const newBalance = wallet.balance + txRecord.amount;

    // Credit the coins back to the tutor
    await tx.wallet.update({
      where: { id: txRecord.walletId },
      data: { balance: newBalance },
    });

    // Update the existing REFUND transaction to mark it approved
    await tx.walletTransaction.update({
      where: { id: walletTransactionId },
      data: {
        balanceAfter: newBalance,
        description: `REFUND_APPROVED — ${txRecord.amount} coins refunded`,
      },
    });

    // Notify the tutor
    if (tutorUserId) {
      await tx.notification.create({
        data: {
          userId: tutorUserId,
          title: "✅ Refund Approved!",
          message: `Your refund of ${txRecord.amount} coins has been approved and credited to your wallet.`,
          actionUrl: "/tutor/wallet",
        },
      });
    }

    await tx.auditLog.create({
      data: {
        adminId: session!.user.id,
        action: "REFUND_APPROVED",
        entityType: "WalletTransaction",
        entityId: walletTransactionId,
        details: `Approved refund of ${txRecord.amount} coins for wallet ${txRecord.walletId}`,
      },
    });
  });

  revalidatePath("/admin/wallets");
  return actionSuccess({ updated: true });
}

export async function rejectRefundAction(
  walletTransactionId: string,
  reason?: string
): Promise<ActionResult<{ updated: true }>> {
  const { error, session } = await requirePermission("wallets:manage");
  if (error) return actionError(error);

  const txRecord = await prisma.walletTransaction.findUnique({
    where: { id: walletTransactionId },
    select: {
      id: true,
      type: true,
      description: true,
      amount: true,
      walletId: true,
      wallet: { select: { tutorProfile: { select: { userId: true } } } },
    },
  });

  if (!txRecord || txRecord.type !== "REFUND" || txRecord.description !== "REFUND_REQUEST_PENDING") {
    return actionError("Refund request not found or already processed.");
  }

  // Notification.userId references User.id — NOT TutorProfile.id.
  const tutorUserId = txRecord.wallet.tutorProfile?.userId;

  await prisma.$transaction(async (tx) => {
    // Mark refund as rejected (no coins credited)
    await tx.walletTransaction.update({
      where: { id: walletTransactionId },
      data: {
        description: `REFUND_REJECTED — ${reason || "No reason provided"}`,
      },
    });

    // Notify the tutor
    if (tutorUserId) {
      await tx.notification.create({
        data: {
          userId: tutorUserId,
          title: "❌ Refund Request Rejected",
          message: reason
            ? `Your refund request was rejected: ${reason}`
            : "Your refund request was reviewed and could not be approved. Contact support for details.",
          actionUrl: "/tutor/wallet",
        },
      });
    }

    await tx.auditLog.create({
      data: {
        adminId: session!.user.id,
        action: "REFUND_REJECTED",
        entityType: "WalletTransaction",
        entityId: walletTransactionId,
        details: reason || "No reason provided",
      },
    });
  });

  revalidatePath("/admin/wallets");
  return actionSuccess({ updated: true });
}

// ── Extended Admin CRUD Actions ──────────────────────────────────────────────────

export async function adminDeleteUserAction(
  userId: string
): Promise<ActionResult<{ deleted: true }>> {
  const { error, session } = await requirePermission("users:manage");
  if (error) return actionError(error);

  if (session!.user.id === userId) {
    return actionError("You cannot delete your own admin account.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.account.deleteMany({ where: { userId } });
    await tx.session.deleteMany({ where: { userId } });
    await tx.notification.deleteMany({ where: { userId } });
    await tx.userActivity.deleteMany({ where: { userId } });
    await tx.couponUsage.deleteMany({ where: { userId } });
    await tx.referral.deleteMany({
      where: { OR: [{ referrerId: userId }, { refereeId: userId }] },
    });

    const tutor = await tx.tutorProfile.findUnique({ where: { userId } });
    if (tutor) {
      await tx.walletTransaction.deleteMany({ where: { wallet: { tutorProfileId: tutor.id } } });
      await tx.wallet.deleteMany({ where: { tutorProfileId: tutor.id } });
      await tx.tutorAvailability.deleteMany({ where: { tutorProfileId: tutor.id } });
      await tx.tutorProfile.delete({ where: { id: tutor.id } });
    }

    const parent = await tx.parentProfile.findUnique({ where: { userId } });
    if (parent) {
      await tx.studentProfile.deleteMany({ where: { parentProfileId: parent.id } });
      await tx.parentProfile.delete({ where: { id: parent.id } });
    }

    await tx.user.delete({ where: { id: userId } });

    await tx.auditLog.create({
      data: {
        adminId: session!.user.id,
        action: "DELETE_USER",
        entityType: "User",
        entityId: userId,
        details: `Permanently deleted user ${userId}`,
      },
    });
  });

  revalidatePath("/admin/users");
  return actionSuccess({ deleted: true });
}

export async function adminDeleteLeadAction(
  leadId: string
): Promise<ActionResult<{ deleted: true }>> {
  const { error, session } = await requirePermission("leads:manage");
  if (error) return actionError(error);

  await prisma.$transaction(async (tx) => {
    await tx.lead.delete({ where: { id: leadId } });
    await tx.auditLog.create({
      data: {
        adminId: session!.user.id,
        action: "DELETE_LEAD",
        entityType: "Lead",
        entityId: leadId,
        details: `Permanently deleted lead ${leadId}`,
      },
    });
  });

  revalidatePath("/admin/leads");
  return actionSuccess({ deleted: true });
}

export async function adminCancelBookingAction(
  bookingId: string,
  reason?: string
): Promise<ActionResult<{ updated: true }>> {
  const { error, session } = await requirePermission("leads:manage");
  if (error) return actionError(error);

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: "CANCELLED",
        cancelledBy: `admin:${session!.user.id}`,
        cancelReason: reason || "Admin administrative override",
      },
    });
    await tx.auditLog.create({
      data: {
        adminId: session!.user.id,
        action: "CANCEL_BOOKING",
        entityType: "Booking",
        entityId: bookingId,
        details: reason || "Force cancelled by admin",
      },
    });
  });

  revalidatePath("/admin/bookings");
  return actionSuccess({ updated: true });
}

export async function adminDeleteBookingAction(
  bookingId: string
): Promise<ActionResult<{ deleted: true }>> {
  const { error, session } = await requirePermission("leads:manage");
  if (error) return actionError(error);

  await prisma.$transaction(async (tx) => {
    await tx.booking.delete({ where: { id: bookingId } });
    await tx.auditLog.create({
      data: {
        adminId: session!.user.id,
        action: "DELETE_BOOKING",
        entityType: "Booking",
        entityId: bookingId,
        details: `Permanently deleted booking ${bookingId}`,
      },
    });
  });

  revalidatePath("/admin/bookings");
  return actionSuccess({ deleted: true });
}

export async function adminDeleteReviewAction(
  reviewId: string
): Promise<ActionResult<{ deleted: true }>> {
  const { error, session } = await requirePermission("users:manage");
  if (error) return actionError(error);

  await prisma.$transaction(async (tx) => {
    const rev = await tx.review.findUnique({
      where: { id: reviewId },
      select: { tutorProfileId: true },
    });

    await tx.review.delete({ where: { id: reviewId } });

    if (rev) {
      const agg = await tx.review.aggregate({
        where: { tutorProfileId: rev.tutorProfileId, reviewerRole: "PARENT" },
        _avg: { overallRating: true },
        _count: { id: true },
      });
      await tx.tutorProfile.update({
        where: { id: rev.tutorProfileId },
        data: {
          averageRating: agg._avg.overallRating ?? 0,
          totalReviews: agg._count.id,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        adminId: session!.user.id,
        action: "DELETE_REVIEW",
        entityType: "Review",
        entityId: reviewId,
        details: `Deleted review ${reviewId} and updated tutor rating`,
      },
    });
  });

  revalidatePath("/admin/reviews");
  return actionSuccess({ deleted: true });
}

// ── Additional Comprehensive Admin CRUD Actions ──────────────────────────────────

export async function adminEditUserAction(
  formData: FormData
): Promise<ActionResult<{ updated: true }>> {
  const { error, session } = await requirePermission("users:manage");
  if (error) return actionError(error);

  const userId = formData.get("userId")?.toString();
  const name = formData.get("name")?.toString().trim();
  const email = formData.get("email")?.toString().trim().toLowerCase();
  const phone = formData.get("phone")?.toString().trim() || null;
  const role = formData.get("role")?.toString() as "PARENT" | "TUTOR" | "SUPER_ADMIN" | "SUB_ADMIN";
  const subAdminRole = formData.get("subAdminRole")?.toString() as any;

  if (!userId || !name || !email) {
    return actionError("User ID, name, and email are required.");
  }

  // Prevent privilege escalation: assigning an admin role, or editing an account
  // that is already an admin, requires SUPER_ADMIN.
  const targetBefore = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (
    (PRIVILEGED_ROLES.has(role) || (targetBefore && PRIVILEGED_ROLES.has(targetBefore.role))) &&
    !isSuperAdmin(session)
  ) {
    return actionError("Forbidden: only a Super Admin can modify admin accounts or roles.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        name,
        email,
        phone,
        role,
        subAdminRole: role === "SUB_ADMIN" ? subAdminRole : null,
      },
    });

    await tx.auditLog.create({
      data: {
        adminId: session!.user.id,
        action: "EDIT_USER",
        entityType: "User",
        entityId: userId,
        details: `Updated details for user ${email}`,
      },
    });
  });

  revalidatePath("/admin/users");
  return actionSuccess({ updated: true });
}

export async function adminResetUserPasswordAction(
  userId: string,
  newPassword?: string
): Promise<ActionResult<{ updated: true; tempPassword?: string }>> {
  const { error, session } = await requirePermission("users:manage");
  if (error) return actionError(error);

  // Prevent account takeover: a non-super-admin must not be able to reset the
  // password of a SUPER_ADMIN / SUB_ADMIN account.
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (targetUser && PRIVILEGED_ROLES.has(targetUser.role) && !isSuperAdmin(session)) {
    return actionError("Forbidden: only a Super Admin can reset an admin's password.");
  }

  const pwdToSet = newPassword || `EduPass${Math.floor(100000 + Math.random() * 900000)}!`;
  const passwordHash = await bcrypt.hash(pwdToSet, 10);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    await tx.auditLog.create({
      data: {
        adminId: session!.user.id,
        action: "RESET_USER_PASSWORD",
        entityType: "User",
        entityId: userId,
        details: `Admin reset password for user ${userId}`,
      },
    });
  });

  revalidatePath("/admin/users");
  return actionSuccess({ updated: true, tempPassword: pwdToSet });
}

export async function adminEditLeadAction(
  formData: FormData
): Promise<ActionResult<{ updated: true }>> {
  const { error, session } = await requirePermission("leads:manage");
  if (error) return actionError(error);

  const leadId = formData.get("leadId")?.toString();
  const subjectsRaw = formData.get("subjects")?.toString();
  const classLevel = formData.get("classLevel")?.toString();
  const mode = (formData.get("mode")?.toString() as any) ?? "ONLINE";
  const budgetMin = Number(formData.get("budgetMin")) || null;
  const budgetMax = Number(formData.get("budgetMax")) || null;
  const city = formData.get("city")?.toString().trim() || null;
  const maxTutors = Number(formData.get("maxTutors")) || 3;
  const status = formData.get("status")?.toString() as any;

  if (!leadId || !subjectsRaw || !classLevel) {
    return actionError("Lead ID, subjects, and class level are required.");
  }

  const subjects = subjectsRaw.split(",").map((s) => s.trim()).filter(Boolean);

  await prisma.$transaction(async (tx) => {
    await tx.lead.update({
      where: { id: leadId },
      data: {
        subjects,
        classLevel,
        mode,
        budgetMin,
        budgetMax,
        city,
        maxTutors,
        status,
      },
    });

    await tx.auditLog.create({
      data: {
        adminId: session!.user.id,
        action: "EDIT_LEAD",
        entityType: "Lead",
        entityId: leadId,
        details: `Admin updated lead parameters for ${leadId}`,
      },
    });
  });

  revalidatePath("/admin/leads");
  return actionSuccess({ updated: true });
}

export async function adminUpdateFullUserAction(
  formData: FormData
): Promise<ActionResult<{ updated: true }>> {
  const { error, session } = await requirePermission("users:manage");
  if (error) return actionError(error);

  const userId = formData.get("userId")?.toString();
  const name = formData.get("name")?.toString().trim();
  const email = formData.get("email")?.toString().trim().toLowerCase();
  const phone = formData.get("phone")?.toString().trim() || null;
  const role = formData.get("role")?.toString() as any;
  const subAdminRole = formData.get("subAdminRole")?.toString() as any;
  const isActive = formData.get("isActive") === "true";

  // Profile & Document specific fields
  const city = formData.get("city")?.toString().trim() || null;
  const state = formData.get("state")?.toString().trim() || null;
  const pincode = formData.get("pincode")?.toString().trim() || null;
  const address = formData.get("address")?.toString().trim() || null;
  const latRaw = formData.get("latitude")?.toString().trim();
  const lngRaw = formData.get("longitude")?.toString().trim();
  const latitude = latRaw && !isNaN(parseFloat(latRaw)) ? parseFloat(latRaw) : null;
  const longitude = lngRaw && !isNaN(parseFloat(lngRaw)) ? parseFloat(lngRaw) : null;

  const kycStatus = formData.get("kycStatus")?.toString() as any;
  const kycRejectionNote = formData.get("kycRejectionNote")?.toString().trim() || null;
  const kycIdProofUrl = formData.get("kycIdProofUrl")?.toString().trim() || null;
  const kycAddressUrl = formData.get("kycAddressUrl")?.toString().trim() || null;
  const kycSelfieUrl = formData.get("kycSelfieUrl")?.toString().trim() || null;
  const introVideoUrl = formData.get("introVideoUrl")?.toString().trim() || null;

  // Onboarding & Profile Detail Fields
  const onboardingStepRaw = formData.get("onboardingStep");
  const onboardingStep = onboardingStepRaw !== null && onboardingStepRaw !== "" ? Number(onboardingStepRaw) : 7;
  const gender = formData.get("gender")?.toString().trim() || null;
  const dateOfBirth = formData.get("dateOfBirth")?.toString().trim() || null;
  const maritalStatus = formData.get("maritalStatus")?.toString().trim() || null;
  const profession = formData.get("profession")?.toString().trim() || null;

  const qualification = formData.get("qualification")?.toString().trim() || null;
  const educationCourse = formData.get("educationCourse")?.toString().trim() || null;
  const educationSubjects = formData.get("educationSubjects")?.toString().trim() || null;
  const educationUniversity = formData.get("educationUniversity")?.toString().trim() || null;
  const educationYear = formData.get("educationYear")?.toString().trim() || null;
  const teachingStartYearRaw = formData.get("teachingStartYear");
  const teachingStartYear = teachingStartYearRaw ? Number(teachingStartYearRaw) : null;

  const teachingMode = (formData.get("teachingMode")?.toString().trim() as any) || "EITHER";
  const teachingRadiusRaw = formData.get("teachingRadius");
  const teachingRadius = teachingRadiusRaw ? Number(teachingRadiusRaw) : 10;

  const interestedInRaw = formData.get("interestedIn")?.toString();
  let interestedIn: string[] | undefined = undefined;
  if (interestedInRaw) {
    try {
      interestedIn = JSON.parse(interestedInRaw);
    } catch {
      interestedIn = interestedInRaw.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }

  const isVerifiedForm = formData.get("isVerified");
  const isVerified = isVerifiedForm !== null ? isVerifiedForm === "true" : kycStatus === "APPROVED";
  const isFeatured = formData.get("isFeatured") === "true";
  const subscriptionPlan = (formData.get("subscriptionPlan")?.toString().trim() as any) || "NONE";

  const subjectsRaw = formData.get("subjects")?.toString();
  const classLevelsRaw = formData.get("classLevels")?.toString();
  let subjects: string[] | undefined = undefined;
  if (subjectsRaw) {
    try {
      subjects = JSON.parse(subjectsRaw);
    } catch {
      subjects = subjectsRaw.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }

  let classLevels: string[] | undefined = undefined;
  if (classLevelsRaw) {
    try {
      classLevels = JSON.parse(classLevelsRaw);
    } catch {
      classLevels = classLevelsRaw.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }

  const experience = formData.get("experience") ? Number(formData.get("experience")) : null;
  const feeMin = formData.get("feeMin") ? Number(formData.get("feeMin")) : null;
  const feeMax = formData.get("feeMax") ? Number(formData.get("feeMax")) : null;
  const hourlyRate = formData.get("hourlyRate") ? Number(formData.get("hourlyRate")) : null;
  const bio = formData.get("bio")?.toString().trim() || null;

  const coinBalanceRaw = formData.get("coinBalance");
  const coinBalance = coinBalanceRaw !== null && coinBalanceRaw !== "" ? Number(coinBalanceRaw) : null;

  if (!userId || !name || !email) {
    return actionError("User ID, name, and email are required.");
  }

  // Prevent privilege escalation via the full-edit form.
  const fullTargetBefore = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (
    (PRIVILEGED_ROLES.has(role) ||
      (fullTargetBefore && PRIVILEGED_ROLES.has(fullTargetBefore.role))) &&
    !isSuperAdmin(session)
  ) {
    return actionError("Forbidden: only a Super Admin can modify admin accounts or roles.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        name,
        email,
        phone,
        role,
        subAdminRole: role === "SUB_ADMIN" ? subAdminRole : null,
        isActive,
      },
    });

    if (role === "PARENT") {
      await tx.parentProfile.upsert({
        where: { userId },
        create: { userId, city, state, pincode, address, latitude, longitude },
        update: { city, state, pincode, address, latitude, longitude },
      });
    } else if (role === "TUTOR") {
      const tp = await tx.tutorProfile.upsert({
        where: { userId },
        create: {
          userId,
          city,
          state,
          pincode,
          address,
          latitude,
          longitude,
          onboardingStep,
          gender,
          dateOfBirth,
          maritalStatus,
          profession,
          qualification,
          educationCourse,
          educationSubjects,
          educationUniversity,
          educationYear,
          teachingStartYear,
          interestedIn: interestedIn || [],
          teachingMode,
          teachingRadius,
          isVerified,
          isFeatured,
          subscriptionPlan,
          kycStatus: kycStatus || "NOT_SUBMITTED",
          kycRejectionNote,
          kycIdProofUrl,
          kycAddressUrl,
          kycSelfieUrl,
          introVideoUrl,
          subjects: subjects || [],
          classLevels: classLevels || [],
          experience,
          feeMin: feeMin ?? hourlyRate,
          feeMax: feeMax ?? hourlyRate,
          bio,
        },
        update: {
          city,
          state,
          pincode,
          ...(address ? { address } : {}),
          ...(latitude !== null ? { latitude } : {}),
          ...(longitude !== null ? { longitude } : {}),
          onboardingStep,
          gender,
          dateOfBirth,
          maritalStatus,
          profession,
          qualification,
          educationCourse,
          educationSubjects,
          educationUniversity,
          educationYear,
          teachingStartYear,
          ...(interestedIn ? { interestedIn } : {}),
          teachingMode,
          teachingRadius,
          isVerified,
          isFeatured,
          subscriptionPlan,
          ...(kycStatus ? { kycStatus } : {}),
          kycRejectionNote,
          kycIdProofUrl,
          kycAddressUrl,
          kycSelfieUrl,
          introVideoUrl,
          ...(subjects ? { subjects } : {}),
          ...(classLevels ? { classLevels } : {}),
          ...(experience !== null ? { experience } : {}),
          feeMin: feeMin ?? hourlyRate,
          feeMax: feeMax ?? hourlyRate,
          ...(bio !== null ? { bio } : {}),
        },
      });

      if (coinBalance !== null && !isNaN(coinBalance)) {
        await tx.wallet.upsert({
          where: { tutorProfileId: tp.id },
          create: { tutorProfileId: tp.id, balance: coinBalance },
          update: { balance: coinBalance },
        });
      }
    }

    await tx.auditLog.create({
      data: {
        adminId: session!.user.id,
        action: "EDIT_USER_FULL",
        entityType: "User",
        entityId: userId,
        details: `Updated full profile details for ${email}`,
      },
    });
  });

  // If the role was changed, invalidate all active sessions for this user so the
  // new role takes effect immediately (not after JWT expiry).
  if (fullTargetBefore && fullTargetBefore.role !== role) {
    await prisma.session.deleteMany({ where: { userId } });
  }

  revalidatePath("/admin/users");
  return actionSuccess({ updated: true });
}

export async function adminUpsertStudentProfileAction(
  parentUserId: string,
  input: {
    studentId?: string;
    name?: string;
    classLevel?: string;
    board?: string;
    subjects?: string[];
    notes?: string;
    image?: string | null;
  }
): Promise<ActionResult<{ studentId: string }>> {
  const { error } = await requirePermission("users:manage");
  if (error) return actionError(error);

  let parent = await prisma.parentProfile.findUnique({
    where: { userId: parentUserId },
  });

  if (!parent) {
    parent = await prisma.parentProfile.create({
      data: { userId: parentUserId },
    });
  }

  const finalClassLevel =
    input.classLevel?.trim() ||
    inferClassLevelFromSubjects(input.subjects || []) ||
    "General";

  const data = {
    name: input.name?.trim() || "Child",
    classLevel: finalClassLevel,
    board: input.board?.trim() || null,
    subjects: input.subjects || [],
    notes: input.notes?.trim() || null,
    image: input.image ?? null,
  };

  let student: { id: string };
  if (input.studentId) {
    student = await prisma.studentProfile.update({
      where: { id: input.studentId },
      data,
      select: { id: true },
    });
  } else {
    student = await prisma.studentProfile.create({
      data: {
        ...data,
        parentProfileId: parent.id,
      },
      select: { id: true },
    });
  }

  revalidatePath(`/admin/users/${parentUserId}/edit`);
  return actionSuccess({ studentId: student.id });
}

export async function adminDeleteStudentProfileAction(
  studentId: string,
  parentUserId: string
): Promise<ActionResult<{ deleted: true }>> {
  const { error } = await requirePermission("users:manage");
  if (error) return actionError(error);

  await prisma.studentProfile.delete({
    where: { id: studentId },
  });

  revalidatePath(`/admin/users/${parentUserId}/edit`);
  return actionSuccess({ deleted: true });
}

export async function adminCreateCouponAction(
  formData: FormData
): Promise<ActionResult<{ coupon: { id: string } }>> {
  const { error, session } = await requirePermission("settings:manage");
  if (error) return actionError(error);

  const code = formData.get("code")?.toString().trim().toUpperCase();
  const discountType = (formData.get("discountType")?.toString() ?? "PERCENTAGE") as "PERCENTAGE" | "FLAT";
  const discountAmount = Number(formData.get("discountAmount") ?? formData.get("discountValue")) || 0;
  const minOrderInr = Number(formData.get("minOrderInr") ?? formData.get("minCoins")) || null;
  const usageLimit = Number(formData.get("usageLimit") ?? formData.get("maxUses")) || null;
  const expiresAtRaw = formData.get("expiresAt")?.toString();

  if (!code || discountAmount <= 0) {
    return actionError("Coupon code and a valid discount amount are required.");
  }

  const expiresAt = expiresAtRaw ? new Date(expiresAtRaw) : null;

  const coupon = await prisma.$transaction(async (tx) => {
    const created = await tx.coupon.create({
      data: {
        code,
        discountType,
        discountAmount,
        minOrderInr,
        usageLimit,
        expiresAt,
        isActive: true,
      },
    });

    await tx.auditLog.create({
      data: {
        adminId: session!.user.id,
        action: "CREATE_COUPON",
        entityType: "Coupon",
        entityId: created.id,
        details: `Created coupon code ${code}`,
      },
    });

    return created;
  });

  revalidatePath("/admin/coupons");
  return actionSuccess({ coupon: { id: coupon.id } });
}

export async function adminDeleteCouponAction(
  couponId: string
): Promise<ActionResult<{ deleted: true }>> {
  const { error, session } = await requirePermission("settings:manage");
  if (error) return actionError(error);

  await prisma.$transaction(async (tx) => {
    await tx.coupon.delete({ where: { id: couponId } });
    await tx.auditLog.create({
      data: {
        adminId: session!.user.id,
        action: "DELETE_COUPON",
        entityType: "Coupon",
        entityId: couponId,
        details: `Deleted coupon ${couponId}`,
      },
    });
  });

  revalidatePath("/admin/coupons");
  return actionSuccess({ deleted: true });
}

// ────────────────────────────────────────────────
// Internal Admin Staff Notes & Audit Trail
// ────────────────────────────────────────────────

export async function addAdminUserNoteAction(
  targetUserId: string,
  content: string
): Promise<ActionResult<{ id: string }>> {
  const session = await auth();
  if (!session?.user || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "SUB_ADMIN")) {
    return actionError("Unauthorized: Admin access required.");
  }

  if (!targetUserId || !content.trim()) {
    return actionError("Note content cannot be empty.");
  }

  const note = await (prisma as any).adminNote.create({
    data: {
      targetUserId,
      authorUserId: session.user.id,
      authorName: session.user.name || session.user.email || "Admin Staff",
      content: content.trim(),
    },
  });

  revalidatePath(`/admin/users/${targetUserId}/edit`);
  return actionSuccess({ id: note.id });
}

export async function getAdminUserNotesAction(targetUserId: string) {
  const session = await auth();
  if (!session?.user) return [];

  return (prisma as any).adminNote.findMany({
    where: { targetUserId },
    orderBy: { createdAt: "desc" },
  });
}

// ────────────────────────────────────────────────
// Send / Schedule Custom Notification to User
// ────────────────────────────────────────────────

export async function sendAdminCustomNotificationAction(data: {
  targetUserId: string;
  title: string;
  message: string;
  scheduledAt?: string;
  channel?: "WEB" | "EMAIL" | "SMS" | "WHATSAPP" | "PUSH";
}): Promise<ActionResult<{ id: string }>> {
  const session = await auth();
  if (!session?.user || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "SUB_ADMIN")) {
    return actionError("Unauthorized: Admin access required.");
  }

  if (!data.targetUserId || !data.title.trim() || !data.message.trim()) {
    return actionError("Title and message are required.");
  }

  const schedDate = data.scheduledAt ? new Date(data.scheduledAt) : new Date();

  const notif = await prisma.notification.create({
    data: {
      userId: data.targetUserId,
      title: data.title.trim(),
      message: data.message.trim(),
      type: "ADMIN_ALERT",
      channel: (data.channel as any) || "WEB",
      scheduledAt: schedDate,
      status: data.scheduledAt ? "PENDING" : "SENT",
    },
  });

  revalidatePath(`/admin/users/${data.targetUserId}/edit`);
  revalidatePath("/notifications");
  return actionSuccess({ id: notif.id });
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin Bulk User Governance & Top-Up Control Actions
// ─────────────────────────────────────────────────────────────────────────────

export interface UserGovernanceFilterInput {
  q?: string;
  ageGroup?: "ALL" | "NEW" | "OLD";
  kycStatus?: "ALL" | "VERIFIED" | "UNVERIFIED" | "PENDING";
  plan?: "ALL" | "NONE" | "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
  role?: "ALL" | "TUTOR" | "PARENT";
  topupStatus?: "ALL" | "ENABLED" | "DISABLED";
  page?: number;
  take?: number;
}

export async function adminFetchFilteredUsersForGovernanceAction(
  filters: UserGovernanceFilterInput
): Promise<
  ActionResult<{
    users: Array<{
      id: string;
      name: string | null;
      email: string;
      phone: string | null;
      role: string;
      createdAt: string;
      isVerified: boolean;
      kycStatus: string;
      subscriptionPlan: string;
      canTopup: boolean;
      isOldUser: boolean;
      walletBalance: number;
    }>;
    total: number;
  }>
> {
  const session = await auth();
  if (!session?.user || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "SUB_ADMIN")) {
    return actionError("Unauthorized: Admin access required.");
  }

  const q = filters.q?.trim() ?? "";
  const page = Math.max(1, filters.page ?? 1);
  const take = Math.min(100, Math.max(5, filters.take ?? 20));
  const skip = (page - 1) * take;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const andConditions: any[] = [];

  if (q) {
    andConditions.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  if (filters.role && filters.role !== "ALL") {
    andConditions.push({ role: filters.role });
  }

  if (filters.ageGroup && filters.ageGroup !== "ALL") {
    if (filters.ageGroup === "NEW") {
      andConditions.push({ createdAt: { gte: thirtyDaysAgo } });
    } else if (filters.ageGroup === "OLD") {
      andConditions.push({
        OR: [
          { createdAt: { lt: thirtyDaysAgo } },
          { tutorProfile: { isOldUser: true } },
        ],
      });
    }
  }

  if (filters.kycStatus && filters.kycStatus !== "ALL") {
    if (filters.kycStatus === "VERIFIED") {
      andConditions.push({ tutorProfile: { isVerified: true } });
    } else if (filters.kycStatus === "UNVERIFIED") {
      andConditions.push({ tutorProfile: { isVerified: false } });
    } else if (filters.kycStatus === "PENDING") {
      andConditions.push({ tutorProfile: { kycStatus: "PENDING" } });
    }
  }

  if (filters.plan && filters.plan !== "ALL") {
    andConditions.push({ tutorProfile: { subscriptionPlan: filters.plan } });
  }

  if (filters.topupStatus && filters.topupStatus !== "ALL") {
    if (filters.topupStatus === "ENABLED") {
      andConditions.push({ tutorProfile: { canTopup: true } });
    } else if (filters.topupStatus === "DISABLED") {
      andConditions.push({ tutorProfile: { canTopup: false } });
    }
  }

  const where = andConditions.length > 0 ? { AND: andConditions } : {};

  const [rawUsers, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        tutorProfile: {
          select: {
            isVerified: true,
            kycStatus: true,
            subscriptionPlan: true,
            canTopup: true,
            isOldUser: true,
            wallet: { select: { balance: true } },
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const users = rawUsers.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
    isVerified: u.tutorProfile?.isVerified ?? false,
    kycStatus: u.tutorProfile?.kycStatus ?? "NOT_SUBMITTED",
    subscriptionPlan: u.tutorProfile?.subscriptionPlan ?? "NONE",
    canTopup: u.tutorProfile?.canTopup ?? true,
    isOldUser: u.tutorProfile?.isOldUser ?? false,
    walletBalance: u.tutorProfile?.wallet?.balance ?? 0,
  }));

  return actionSuccess({ users, total });
}

export async function adminBulkUserGovernanceAction(data: {
  userIds: string[];
  actionType: "ENABLE_TOPUP" | "DISABLE_TOPUP" | "MARK_OLD_USER" | "MARK_NEW_USER" | "GRANT_COINS";
  coinsAmount?: number;
  reason?: string;
}): Promise<ActionResult<{ affectedCount: number }>> {
  const session = await auth();
  if (!session?.user || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "SUB_ADMIN")) {
    return actionError("Unauthorized: Admin access required.");
  }

  if (!data.userIds || data.userIds.length === 0) {
    return actionError("No users selected for bulk action.");
  }

  let affectedCount = 0;

  if (data.actionType === "ENABLE_TOPUP") {
    const res = await prisma.tutorProfile.updateMany({
      where: { userId: { in: data.userIds } },
      data: { canTopup: true },
    });
    affectedCount = res.count;
  } else if (data.actionType === "DISABLE_TOPUP") {
    const res = await prisma.tutorProfile.updateMany({
      where: { userId: { in: data.userIds } },
      data: { canTopup: false },
    });
    affectedCount = res.count;
  } else if (data.actionType === "MARK_OLD_USER") {
    const res = await prisma.tutorProfile.updateMany({
      where: { userId: { in: data.userIds } },
      data: { isOldUser: true, canTopup: true },
    });
    affectedCount = res.count;
  } else if (data.actionType === "MARK_NEW_USER") {
    const res = await prisma.tutorProfile.updateMany({
      where: { userId: { in: data.userIds } },
      data: { isOldUser: false, canTopup: false },
    });
    affectedCount = res.count;
  } else if (data.actionType === "GRANT_COINS") {
    const coins = data.coinsAmount ?? 50;
    if (coins <= 0) return actionError("Coins amount must be greater than 0.");

    const tutors = await prisma.tutorProfile.findMany({
      where: { userId: { in: data.userIds } },
      select: { id: true, userId: true, wallet: { select: { id: true, balance: true } } },
    });

    for (const tutor of tutors) {
      if (tutor.wallet) {
        const newBalance = tutor.wallet.balance + coins;
        await prisma.$transaction([
          prisma.wallet.update({
            where: { id: tutor.wallet.id },
            data: { balance: { increment: coins }, totalPurchased: { increment: coins } },
          }),
          prisma.walletTransaction.create({
            data: {
              walletId: tutor.wallet.id,
              type: "ADMIN_CREDIT",
              amount: coins,
              balanceAfter: newBalance,
              description: data.reason || `Bulk Admin Bonus (+${coins} coins)`,
            },
          }),
        ]);
        affectedCount++;
      }
    }
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/wallets");

  return actionSuccess({ affectedCount });
}

export async function adminToggleUserTopupAction(
  userId: string,
  canTopup: boolean
): Promise<ActionResult<{ success: boolean }>> {
  const session = await auth();
  if (!session?.user || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "SUB_ADMIN")) {
    return actionError("Unauthorized: Admin access required.");
  }

  await prisma.tutorProfile.updateMany({
    where: { userId },
    data: { canTopup },
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin/wallets");
  return actionSuccess({ success: true });
}
