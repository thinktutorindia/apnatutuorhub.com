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



// ── User Management ────────────────────────────────────────────────────────────

export async function suspendUserAction(
  userId: string
): Promise<ActionResult<{ updated: true }>> {
  const { error, session } = await requireSuperAdmin();
  if (error) return actionError(error);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { isActive: false } });
    await tx.auditLog.create({
      data: {
        adminId: session!.user.id,
        action: "SUSPEND_USER",
        entityType: "User",
        entityId: userId,
      },
    });
  });

  revalidatePath("/admin/users");
  return actionSuccess({ updated: true });
}

export async function reactivateUserAction(
  userId: string
): Promise<ActionResult<{ updated: true }>> {
  const { error, session } = await requireSuperAdmin();
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

  revalidatePath("/admin/users");
  return actionSuccess({ updated: true });
}

// ── KYC Management ─────────────────────────────────────────────────────────────
// Requires: kyc:review (SUPER_ADMIN + VERIFICATION sub-admin)

export async function approveKycAction(
  tutorProfileId: string
): Promise<ActionResult<{ updated: true }>> {
  const { error, session } = await requirePermission("kyc:review");
  if (error) return actionError(error);

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
    const wallet = await tx.wallet.findUniqueOrThrow({
      where: { tutorProfileId },
    });
    if (wallet.balance < amount) throw new Error("Insufficient balance");
    const newBalance = wallet.balance - amount;
    await tx.wallet.update({
      where: { tutorProfileId },
      data: { balance: newBalance, totalSpent: { increment: amount } },
    });
    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: "ADMIN_DEBIT",
        amount,
        balanceAfter: newBalance,
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

// ── Notifications broadcast helper (used by dashboard) ─────────────────────────

export async function getAdminDashboardStats() {
  const { error } = await requireSuperAdmin();
  if (error) return null;

  const [
    totalUsers,
    totalParents,
    totalTutors,
    activeLeads,
    totalLeads,
    pendingKyc,
    totalBookings,
    walletAgg,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "PARENT" } }),
    prisma.user.count({ where: { role: "TUTOR" } }),
    prisma.lead.count({ where: { status: { in: ["ACTIVE", "MATCHING", "APPLICATIONS_RECEIVED"] } } }),
    prisma.lead.count(),
    prisma.tutorProfile.count({ where: { kycStatus: "PENDING" } }),
    prisma.booking.count(),
    prisma.wallet.aggregate({ _sum: { balance: true, totalPurchased: true } }),
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
  };
}
