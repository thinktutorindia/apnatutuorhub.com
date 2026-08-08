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
      wallet: { select: { tutorProfileId: true, balance: true } },
    },
  });

  if (!txRecord || txRecord.type !== "REFUND" || txRecord.description !== "REFUND_REQUEST_PENDING") {
    return actionError("Refund request not found or already processed.");
  }

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
    await tx.notification.create({
      data: {
        userId: wallet.tutorProfileId,
        title: "✅ Refund Approved!",
        message: `Your refund of ${txRecord.amount} coins has been approved and credited to your wallet.`,
        actionUrl: "/tutor/wallet",
      },
    });

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
      wallet: { select: { tutorProfileId: true } },
    },
  });

  if (!txRecord || txRecord.type !== "REFUND" || txRecord.description !== "REFUND_REQUEST_PENDING") {
    return actionError("Refund request not found or already processed.");
  }

  await prisma.$transaction(async (tx) => {
    // Mark refund as rejected (no coins credited)
    await tx.walletTransaction.update({
      where: { id: walletTransactionId },
      data: {
        description: `REFUND_REJECTED — ${reason || "No reason provided"}`,
      },
    });

    // Notify the tutor
    await tx.notification.create({
      data: {
        userId: txRecord.wallet.tutorProfileId,
        title: "❌ Refund Request Rejected",
        message: reason
          ? `Your refund request was rejected: ${reason}`
          : "Your refund request was reviewed and could not be approved. Contact support for details.",
        actionUrl: "/tutor/wallet",
      },
    });

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

export async function adminCreateUserAction(
  formData: FormData
): Promise<ActionResult<{ user: { id: string } }>> {
  const { error, session } = await requirePermission("users:manage");
  if (error) return actionError(error);

  const name = formData.get("name")?.toString().trim();
  const email = formData.get("email")?.toString().trim().toLowerCase();
  const password = formData.get("password")?.toString();
  const role = (formData.get("role")?.toString() ?? "PARENT") as "PARENT" | "TUTOR" | "SUPER_ADMIN" | "SUB_ADMIN";
  const subAdminRole = formData.get("subAdminRole")?.toString() as any;

  if (!name || !email || !password) {
    return actionError("Name, email, and password are required.");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return actionError("A user with this email address already exists.");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
        subAdminRole: role === "SUB_ADMIN" ? subAdminRole : null,
      },
    });

    if (role === "PARENT") {
      await tx.parentProfile.create({ data: { userId: newUser.id } });
    } else if (role === "TUTOR") {
      const tp = await tx.tutorProfile.create({ data: { userId: newUser.id } });
      await tx.wallet.create({ data: { tutorProfileId: tp.id } });
    }

    await tx.auditLog.create({
      data: {
        adminId: session!.user.id,
        action: "CREATE_USER",
        entityType: "User",
        entityId: newUser.id,
        details: `Created new user ${email} with role ${role}`,
      },
    });

    return newUser;
  });

  revalidatePath("/admin/users");
  return actionSuccess({ user: { id: user.id } });
}

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
  const kycStatus = formData.get("kycStatus")?.toString() as any;
  const kycIdProofUrl = formData.get("kycIdProofUrl")?.toString().trim() || null;
  const kycAddressUrl = formData.get("kycAddressUrl")?.toString().trim() || null;
  const kycSelfieUrl = formData.get("kycSelfieUrl")?.toString().trim() || null;
  const introVideoUrl = formData.get("introVideoUrl")?.toString().trim() || null;

  const subjectsRaw = formData.get("subjects")?.toString();
  const classLevelsRaw = formData.get("classLevels")?.toString();
  const experience = formData.get("experience") ? Number(formData.get("experience")) : null;
  const hourlyRate = formData.get("hourlyRate") ? Number(formData.get("hourlyRate")) : null;
  const bio = formData.get("bio")?.toString().trim() || null;

  const coinBalanceRaw = formData.get("coinBalance");
  const coinBalance = coinBalanceRaw !== null && coinBalanceRaw !== "" ? Number(coinBalanceRaw) : null;

  if (!userId || !name || !email) {
    return actionError("User ID, name, and email are required.");
  }

  const subjects = subjectsRaw ? subjectsRaw.split(",").map((s) => s.trim()).filter(Boolean) : undefined;
  const classLevels = classLevelsRaw ? classLevelsRaw.split(",").map((s) => s.trim()).filter(Boolean) : undefined;

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
        create: { userId, city, pincode },
        update: { city, pincode },
      });
    } else if (role === "TUTOR") {
      const tp = await tx.tutorProfile.upsert({
        where: { userId },
        create: {
          userId,
          city,
          state,
          pincode,
          kycStatus: kycStatus || "NOT_SUBMITTED",
          kycIdProofUrl,
          kycAddressUrl,
          kycSelfieUrl,
          introVideoUrl,
          subjects: subjects || [],
          classLevels: classLevels || [],
          experience,
          feeMin: hourlyRate,
          feeMax: hourlyRate,
          bio,
        },
        update: {
          city,
          state,
          pincode,
          ...(kycStatus ? { kycStatus } : {}),
          kycIdProofUrl,
          kycAddressUrl,
          kycSelfieUrl,
          introVideoUrl,
          ...(subjects ? { subjects } : {}),
          ...(classLevels ? { classLevels } : {}),
          ...(experience !== null ? { experience } : {}),
          ...(hourlyRate !== null ? { feeMin: hourlyRate, feeMax: hourlyRate } : {}),
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

  revalidatePath("/admin/users");
  return actionSuccess({ updated: true });
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
