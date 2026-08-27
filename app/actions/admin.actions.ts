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
import { haversineDistanceKm } from "@/lib/haversine";
import { dispatchLeadMatching } from "@/lib/matching-dispatcher";
import { maskPhoneNumber } from "@/lib/mask-utils";
import { hasSubjectOverlap, coversClassLevel } from "@/lib/matching-engine";
import { processReferralRewardOnKyc } from "@/app/actions/referral.actions";
import { getNextInquiryNumber, getInquiryDisplayCode } from "@/lib/lead-utils";

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
  const session = await auth();
  if (!session?.user) return { error: "Unauthenticated" as const, session: null };
  if (session.user.role !== "SUPER_ADMIN") {
    return { error: "Forbidden: Super Admin only" as const, session: null };
  }
  return { error: null, session };
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
  name?: string;
  email?: string;
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

  // 10-Digit Mobile Number Validation & Normalization
  let phoneToStore: string | null = null;
  if (input.phone && input.phone.trim()) {
    let cleanPhone = input.phone.trim().replace(/\D/g, "");
    if (cleanPhone.startsWith("91") && cleanPhone.length === 12) {
      cleanPhone = cleanPhone.slice(2);
    } else if (cleanPhone.startsWith("0") && cleanPhone.length === 11) {
      cleanPhone = cleanPhone.slice(1);
    }

    if (cleanPhone.length !== 10) {
      return actionError("Mobile number must be exactly 10 digits (e.g. 9876543210).");
    }

    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      return actionError("Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.");
    }

    const existingPhone = await prisma.user.findUnique({
      where: { phone: cleanPhone },
      select: { id: true, name: true, email: true, phone: true, role: true, subAdminRole: true },
    });
    if (existingPhone) {
      return actionError(
        `User with mobile number "${cleanPhone}" already exists as a ${existingPhone.role} (${existingPhone.name || existingPhone.email}). User ID: ${existingPhone.id}`
      );
    }

    phoneToStore = cleanPhone;
  }

  // Auto-generate sequential fallback email if not provided
  if (!emailClean) {
    if (phoneToStore) {
      const phoneCandidate = `user${phoneToStore}@apnatutorhub.com`;
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
    select: { id: true, name: true, email: true, phone: true, role: true, subAdminRole: true },
  });

  if (existing) {
    return actionError(
      `User with email "${emailClean}" already exists as a ${existing.role} (${existing.name || existing.email}). User ID: ${existing.id}`
    );
  }

  const rawPassword = input.password?.trim() || "12345678";
  const passwordHash = await bcrypt.hash(rawPassword, 10);

  const rawName = input.name?.trim() || "";
  const roleLabel = input.role === "TUTOR" ? "Tutor" : input.role === "PARENT" ? "Parent" : "User";
  const finalName = rawName || (phoneToStore ? `${roleLabel} (${phoneToStore.slice(-4)})` : roleLabel);

  const newUser = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: finalName,
        email: emailClean,
        phone: phoneToStore,
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
            name: input.studentName?.trim() || `${finalName}'s Child`,
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
        details: `Created ${input.role} account for ${user.email} (${finalName})`,
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
    // Process referral reward for referrer and referee
    try {
      await processReferralRewardOnKyc(profile.userId);
    } catch (err) {
      console.error("[approveKycAction] Referral reward processing error:", err);
    }

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

export type AdminUpdateLeadInput = {
  leadId: string;
  subjects: string[];
  classLevel: string;
  board?: string;
  mode: "ONLINE" | "OFFLINE" | "EITHER" | "COACHING";
  budgetMin?: number;
  budgetMax?: number;
  city?: string;
  area?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  timingPreference?: string;
  tutorGenderPref?: string;
  languagePref?: string;
  notes?: string;
  coinCost?: number;
  maxTutors?: number;
  radiusKm?: number;
  status?: "ACTIVE" | "MATCHING" | "APPLICATIONS_RECEIVED" | "BOOKED" | "COMPLETED" | "EXPIRED" | "CLOSED";
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  resolutionReason?: string;
};

export async function adminUpdateLeadAction(
  input: AdminUpdateLeadInput
): Promise<ActionResult<{ updated: true }>> {
  const { error, session } = await requirePermission("leads:manage");
  if (error) return actionError(error);

  if (!input.leadId) {
    return actionError("Lead ID is required.");
  }
  if (!input.subjects || input.subjects.length === 0) {
    return actionError("Please select at least one subject.");
  }
  if (!input.classLevel) {
    return actionError("Please specify a class level.");
  }

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.lead.findUnique({
        where: { id: input.leadId },
        include: { parentProfile: { include: { user: true } } },
      });

      if (!existing) {
        throw new Error("Lead requirement not found.");
      }

      // Track precise field diffs to document what was corrected or changed
      const changes: Array<{
        field: string;
        label: string;
        oldValue: any;
        newValue: any;
      }> = [];

      if (input.classLevel && input.classLevel !== existing.classLevel) {
        changes.push({ field: "classLevel", label: "Class Level", oldValue: existing.classLevel, newValue: input.classLevel });
      }

      const oldSubs = [...existing.subjects].sort().join(", ");
      const newSubs = [...input.subjects].sort().join(", ");
      if (oldSubs !== newSubs) {
        changes.push({ field: "subjects", label: "Subjects", oldValue: existing.subjects, newValue: input.subjects });
      }

      if (input.board !== undefined && (input.board || null) !== existing.board) {
        changes.push({ field: "board", label: "School Board", oldValue: existing.board || "None", newValue: input.board || "None" });
      }

      if (input.mode && input.mode !== existing.mode) {
        changes.push({ field: "mode", label: "Teaching Mode", oldValue: existing.mode, newValue: input.mode });
      }

      if (input.budgetMin !== undefined && (input.budgetMin || null) !== existing.budgetMin) {
        changes.push({ field: "budgetMin", label: "Min Budget", oldValue: existing.budgetMin, newValue: input.budgetMin });
      }

      if (input.budgetMax !== undefined && (input.budgetMax || null) !== existing.budgetMax) {
        changes.push({ field: "budgetMax", label: "Max Budget", oldValue: existing.budgetMax, newValue: input.budgetMax });
      }

      if (input.city !== undefined && (input.city || null) !== existing.city) {
        changes.push({ field: "city", label: "City", oldValue: existing.city || "None", newValue: input.city || "None" });
      }

      if (input.area !== undefined && (input.area || null) !== existing.area) {
        changes.push({ field: "area", label: "Area / Locality", oldValue: existing.area || "None", newValue: input.area || "None" });
      }

      if (input.pincode !== undefined && (input.pincode || null) !== existing.pincode) {
        changes.push({ field: "pincode", label: "Pincode", oldValue: existing.pincode || "None", newValue: input.pincode || "None" });
      }

      if (input.status && input.status !== existing.status) {
        changes.push({ field: "status", label: "Lead Status", oldValue: existing.status, newValue: input.status });
      }

      if (input.notes !== undefined && (input.notes || null) !== existing.notes) {
        changes.push({ field: "notes", label: "Notes", oldValue: existing.notes || "None", newValue: input.notes || "None" });
      }

      const existingParentName = existing.parentProfile?.user?.name || null;
      if (input.parentName !== undefined && input.parentName.trim() !== (existingParentName || "")) {
        changes.push({ field: "parentName", label: "Parent Name", oldValue: existingParentName || "None", newValue: input.parentName.trim() });
      }

      const existingParentPhone = existing.parentProfile?.user?.phone || null;
      if (input.parentPhone !== undefined && (input.parentPhone.trim() || null) !== existingParentPhone) {
        changes.push({ field: "parentPhone", label: "Parent Phone", oldValue: existingParentPhone || "None", newValue: input.parentPhone.trim() || "None" });
      }

      // Update parent contact info if provided
      if (existing.parentProfile?.user) {
        const userUpdates: any = {};
        if (input.parentName !== undefined && input.parentName.trim()) {
          userUpdates.name = input.parentName.trim();
        }
        if (input.parentPhone !== undefined) {
          userUpdates.phone = input.parentPhone.trim() || null;
        }
        if (input.parentEmail !== undefined && input.parentEmail.trim()) {
          userUpdates.email = input.parentEmail.trim().toLowerCase();
        }
        if (Object.keys(userUpdates).length > 0) {
          await tx.user.update({
            where: { id: existing.parentProfile.user.id },
            data: userUpdates,
          });
        }
      }

      // Update parent profile location if changed
      if (existing.parentProfileId && (input.city !== undefined || input.pincode !== undefined || input.latitude !== undefined || input.longitude !== undefined)) {
        const profileUpdates: any = {};
        if (input.city !== undefined) profileUpdates.city = input.city || null;
        if (input.pincode !== undefined) profileUpdates.pincode = input.pincode || null;
        if (input.latitude !== undefined) profileUpdates.latitude = input.latitude || null;
        if (input.longitude !== undefined) profileUpdates.longitude = input.longitude || null;
        if (Object.keys(profileUpdates).length > 0) {
          await tx.parentProfile.update({
            where: { id: existing.parentProfileId },
            data: profileUpdates,
          });
        }
      }

      // Update the Lead record
      await tx.lead.update({
        where: { id: input.leadId },
        data: {
          subjects: input.subjects,
          classLevel: input.classLevel,
          board: input.board ?? null,
          mode: input.mode,
          budgetMin: input.budgetMin ?? null,
          budgetMax: input.budgetMax ?? null,
          city: input.city ?? null,
          area: input.area ?? null,
          pincode: input.pincode ?? null,
          latitude: input.latitude !== undefined ? input.latitude : existing.latitude,
          longitude: input.longitude !== undefined ? input.longitude : existing.longitude,
          timingPreference: input.timingPreference ?? null,
          tutorGenderPref: input.tutorGenderPref ?? null,
          languagePref: input.languagePref ?? null,
          notes: input.notes ?? null,
          coinCost: input.coinCost !== undefined ? input.coinCost : existing.coinCost,
          maxTutors: input.maxTutors !== undefined ? input.maxTutors : existing.maxTutors,
          radiusKm: input.radiusKm !== undefined ? input.radiusKm : existing.radiusKm,
          status: input.status ?? existing.status,
        },
      });

      const editorName = session!.user.name || session!.user.email || "Staff Admin";
      const editorRole = session!.user.role === "SUB_ADMIN" && session!.user.subAdminRole
        ? `${session!.user.subAdminRole} Sub-Admin`
        : session!.user.role === "SUPER_ADMIN"
          ? "Super Admin"
          : session!.user.role;

      const changeSummary = changes.length > 0
        ? changes.map((c) => `${c.label}: "${Array.isArray(c.oldValue) ? c.oldValue.join(", ") : c.oldValue}" ➔ "${Array.isArray(c.newValue) ? c.newValue.join(", ") : c.newValue}"`).join("; ")
        : `Updated lead details (${input.classLevel} - ${input.subjects.join(", ")})`;

      await tx.auditLog.create({
        data: {
          adminId: session!.user.id,
          action: "LEAD_UPDATE",
          entityType: "Lead",
          entityId: input.leadId,
          details: JSON.stringify({
            summary: changeSummary,
            editorName,
            editorRole,
            resolutionReason: input.resolutionReason?.trim() || null,
            changesCount: changes.length,
            changes,
          }),
        },
      });
    });

    revalidatePath("/admin/leads");
    return actionSuccess({ updated: true });
  } catch (err: any) {
    return actionError(err.message || "Failed to update lead requirement");
  }
}

export type LeadAuditHistoryItem = {
  id: string;
  action: string;
  adminId: string;
  adminName: string;
  adminRole: string;
  createdAt: string;
  summary: string;
  resolutionReason?: string | null;
  changes?: Array<{
    field: string;
    label: string;
    oldValue: any;
    newValue: any;
  }>;
  initialData?: any;
};

export async function getLeadHistoryAction(
  leadId: string
): Promise<ActionResult<{ history: LeadAuditHistoryItem[] }>> {
  const { error } = await requirePermission("audit:read");
  if (error) return actionError(error);

  const logs = await prisma.auditLog.findMany({
    where: {
      entityType: "Lead",
      entityId: leadId,
    },
    orderBy: { createdAt: "asc" },
  });

  const adminIds = Array.from(new Set(logs.map((l) => l.adminId).filter(Boolean)));
  const adminUsers = await prisma.user.findMany({
    where: { id: { in: adminIds } },
    select: { id: true, name: true, email: true, role: true, subAdminRole: true },
  });
  const adminMap = new Map(adminUsers.map((u) => [u.id, u]));

  const history: LeadAuditHistoryItem[] = logs.map((log) => {
    const admin = adminMap.get(log.adminId);
    const adminName = admin?.name || admin?.email || "Staff Admin";
    const adminRole = admin?.role === "SUB_ADMIN" && admin?.subAdminRole
      ? `${admin.subAdminRole} Sub-Admin`
      : admin?.role === "SUPER_ADMIN"
        ? "Super Admin"
        : admin?.role || "Staff";

    let parsedDetails: any = null;
    if (log.details) {
      try {
        parsedDetails = JSON.parse(log.details);
      } catch {
        parsedDetails = null;
      }
    }

    return {
      id: log.id,
      action: log.action,
      adminId: log.adminId,
      adminName: parsedDetails?.editorName || parsedDetails?.creatorName || adminName,
      adminRole: parsedDetails?.editorRole || parsedDetails?.creatorRole || adminRole,
      createdAt: log.createdAt.toISOString(),
      summary: parsedDetails?.summary || log.details || "Updated lead record",
      resolutionReason: parsedDetails?.resolutionReason || null,
      changes: parsedDetails?.changes || undefined,
      initialData: parsedDetails?.initialData || undefined,
    };
  });

  return actionSuccess({ history });
}

// ── Lead Creation & Direct Tutor Dispatch ─────────────────────────────────────
// Requires: leads:manage (SUPER_ADMIN + OPERATIONS sub-admin)

export type AdminCreateLeadInput = {
  parentProfileId?: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  studentName?: string;
  subjects: string[];
  classLevel: string;
  board?: string;
  mode: "ONLINE" | "OFFLINE" | "EITHER" | "COACHING";
  budgetMin?: number;
  budgetMax?: number;
  city?: string;
  area?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  timingPreference?: string;
  tutorGenderPref?: string;
  languagePref?: string;
  notes?: string;
  coinCost?: number;
  maxTutors?: number;
  radiusKm?: number;
  notifyMatchingTutors?: boolean;
};

export async function adminCreateLeadAction(
  input: AdminCreateLeadInput
): Promise<ActionResult<{ leadId: string }>> {
  const { error, session } = await requirePermission("leads:manage");
  if (error) return actionError(error);

  if (!input.subjects || input.subjects.length === 0) {
    return actionError("Please select at least one subject.");
  }
  if (!input.classLevel) {
    return actionError("Please specify a class level.");
  }

  // 1. Resolve Parent Profile ID
  let targetParentProfileId = input.parentProfileId;

  if (!targetParentProfileId) {
    const cleanPhone = input.parentPhone ? input.parentPhone.trim() : null;
    const cleanEmail = input.parentEmail ? input.parentEmail.trim().toLowerCase() : null;
    const cleanName = input.parentName ? input.parentName.trim() : "";

    let existingUser = null;
    if (cleanEmail) {
      existingUser = await prisma.user.findUnique({
        where: { email: cleanEmail },
        include: { parentProfile: true },
      });
    } else if (cleanPhone) {
      existingUser = await prisma.user.findFirst({
        where: { phone: cleanPhone },
        include: { parentProfile: true },
      });
    }

    if (existingUser?.parentProfile) {
      targetParentProfileId = existingUser.parentProfile.id;
    } else if (existingUser && !existingUser.parentProfile) {
      const newParent = await prisma.parentProfile.create({
        data: {
          userId: existingUser.id,
          city: input.city ?? null,
          pincode: input.pincode ?? null,
          latitude: input.latitude ?? null,
          longitude: input.longitude ?? null,
        },
      });
      targetParentProfileId = newParent.id;
    } else {
      // Auto-create parent user with default 12345678 credentials
      const finalEmail =
        cleanEmail ||
        (cleanPhone
          ? `parent${cleanPhone.replace(/\D/g, "")}@apnatutorhub.com`
          : `parent${Date.now().toString().slice(-6)}@apnatutorhub.com`);
      const finalName =
        cleanName ||
        (cleanPhone ? `Parent (${cleanPhone.slice(-4)})` : "Parent User");
      const defaultPasswordHash = await bcrypt.hash("12345678", 10);

      const newUser = await prisma.user.create({
        data: {
          name: finalName,
          email: finalEmail,
          phone: cleanPhone,
          passwordHash: defaultPasswordHash,
          role: "PARENT",
          isActive: true,
          emailVerified: new Date(),
          parentProfile: {
            create: {
              city: input.city ?? null,
              pincode: input.pincode ?? null,
              latitude: input.latitude ?? null,
              longitude: input.longitude ?? null,
            },
          },
        },
        include: { parentProfile: true },
      });
      targetParentProfileId = newUser.parentProfile!.id;
    }
  }

  // 2. Create Student Profile if studentName is given
  let studentProfileId: string | null = null;
  if (input.studentName?.trim()) {
    const student = await prisma.studentProfile.create({
      data: {
        parentProfileId: targetParentProfileId,
        name: input.studentName.trim(),
        classLevel: input.classLevel,
        board: input.board ?? null,
        subjects: input.subjects,
      },
    });
    studentProfileId = student.id;
  }

  // 3. Create Lead Record with Sequential Inquiry Number
  const nextInquiryNumber = await getNextInquiryNumber(prisma);

  const newLead = await prisma.lead.create({
    data: {
      inquiryNumber: nextInquiryNumber,
      parentProfileId: targetParentProfileId,
      studentProfileId,
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
      coinCost: input.coinCost && input.coinCost > 0 ? input.coinCost : 10,
      maxTutors: input.maxTutors && input.maxTutors > 0 ? input.maxTutors : 5,
      radiusKm: input.radiusKm && input.radiusKm > 0 ? input.radiusKm : 10,
    },
  });

  // 4. Audit Log
  const creatorName = session!.user.name || session!.user.email || "Staff Admin";
  const creatorRole = session!.user.role === "SUB_ADMIN" && session!.user.subAdminRole
    ? `${session!.user.subAdminRole} Sub-Admin`
    : session!.user.role === "SUPER_ADMIN"
      ? "Super Admin"
      : session!.user.role;

  await prisma.auditLog.create({
    data: {
      adminId: session!.user.id,
      action: "ADMIN_CREATE_LEAD",
      entityType: "Lead",
      entityId: newLead.id,
      details: JSON.stringify({
        summary: `Created lead for ${input.classLevel} (${input.subjects.join(", ")}) in ${input.city || "unspecified location"}`,
        creatorName,
        creatorRole,
        initialData: {
          classLevel: input.classLevel,
          subjects: input.subjects,
          board: input.board || null,
          mode: input.mode,
          budgetMin: input.budgetMin || null,
          budgetMax: input.budgetMax || null,
          city: input.city || null,
          area: input.area || null,
          pincode: input.pincode || null,
          parentName: input.parentName || null,
          parentPhone: input.parentPhone || null,
          notes: input.notes || null,
        },
      }),
    },
  });

  // 5. Match Dispatcher Trigger (if enabled)
  if (input.notifyMatchingTutors !== false) {
    try {
      await dispatchLeadMatching(newLead.id);
    } catch (err) {
      console.error("[adminCreateLeadAction] Error dispatching matching:", err);
    }
  }

  revalidatePath("/admin/leads");
  return actionSuccess({ leadId: newLead.id });
}

export type MatchedTutorSummary = {
  tutorProfileId: string;
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  image: string | null;
  city: string | null;
  area: string | null;
  subjects: string[];
  classLevels: string[];
  averageRating: number;
  totalReviews: number;
  kycStatus: string;
  walletBalance: number;
  distanceKm: number | null;
  alreadyPurchased: boolean;
  matchScore: number;
  hasNotificationSent?: boolean;
  lastNotifiedAt?: string | null;
  notificationStatus?: string | null;
};

export type TargetedTutorNotificationDetail = {
  notificationId?: string;
  userId: string;
  tutorProfileId?: string;
  name: string;
  email: string;
  phone: string | null;
  image: string | null;
  city: string | null;
  area: string | null;
  subjects: string[];
  classLevels: string[];
  averageRating: number;
  totalReviews: number;
  kycStatus: string;
  walletBalance: number;
  distanceKm: number | null;
  // Notification details
  channel: string;
  notificationStatus: string;
  title: string;
  message: string;
  sentAt: string;
  deliveredAt?: string | null;
  isRead: boolean;
  // Purchase & Proposal Status
  isUnlocked: boolean;
  coinsSpent?: number;
  unlockedAt?: string | null;
  proposalNote?: string | null;
  feeQuote?: number | null;
  isShortlisted: boolean;
  isHired: boolean;
  isRejected: boolean;
};

export async function adminGetLeadNotificationDetailsAction(
  leadId: string
): Promise<ActionResult<{ lead: any; targetedTutors: TargetedTutorNotificationDetail[]; totalNotified: number }>> {
  const { error, session } = await requirePermission("leads:manage");
  if (error) return actionError(error);

  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      parentProfile: {
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
        },
      },
      purchases: {
        include: {
          tutorProfile: {
            include: {
              user: { select: { id: true, name: true, email: true, phone: true, image: true } },
              wallet: { select: { balance: true } },
            },
          },
        },
      },
    },
  });

  if (!lead) return actionError("Lead not found.");

  // Fetch all notifications associated with this lead
  const notifications = await prisma.notification.findMany({
    where: {
      OR: [
        { metadata: { path: ["referenceId"], equals: leadId } },
        { actionUrl: { contains: leadId } },
      ],
    },
    include: {
      user: {
        include: {
          tutorProfile: {
            include: {
              wallet: { select: { balance: true } },
            },
          },
        },
      },
      deliveries: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const purchaseMap = new Map(
    lead.purchases.map((p) => [p.tutorProfileId, p])
  );

  const tutorDetailsMap = new Map<string, TargetedTutorNotificationDetail>();

  // Process notifications
  for (const notif of notifications) {
    const user = notif.user;
    const tp = user.tutorProfile;
    const purchase = tp ? purchaseMap.get(tp.id) : undefined;

    let distanceKm: number | null = null;
    if (lead.mode !== "ONLINE" && lead.latitude && lead.longitude && tp?.latitude && tp?.longitude) {
      distanceKm =
        Math.round(
          haversineDistanceKm(lead.latitude, lead.longitude, tp.latitude, tp.longitude) * 10
        ) / 10;
    }

    tutorDetailsMap.set(user.id, {
      notificationId: notif.id,
      userId: user.id,
      tutorProfileId: tp?.id,
      name: user.name || "Tutor",
      email: user.email,
      phone: isSuperAdmin ? user.phone : maskPhoneNumber(user.phone),
      image: user.image,
      city: tp?.city || null,
      area: tp?.address || null,
      subjects: tp?.subjects || [],
      classLevels: tp?.classLevels || [],
      averageRating: tp?.averageRating ?? 5.0,
      totalReviews: tp?.totalReviews ?? 0,
      kycStatus: tp?.kycStatus || "NOT_SUBMITTED",
      walletBalance: tp?.wallet?.balance ?? 0,
      distanceKm,
      channel: notif.channel,
      notificationStatus: notif.status,
      title: notif.title,
      message: notif.message,
      sentAt: notif.createdAt.toISOString(),
      deliveredAt: notif.deliveredAt ? notif.deliveredAt.toISOString() : null,
      isRead: notif.isRead,
      isUnlocked: !!purchase,
      coinsSpent: purchase?.coinsSpent,
      unlockedAt: purchase ? purchase.createdAt.toISOString() : null,
      proposalNote: purchase?.proposalNote,
      feeQuote: purchase?.feeQuote,
      isShortlisted: purchase?.isShortlisted ?? false,
      isHired: purchase?.isHired ?? false,
      isRejected: purchase?.isRejected ?? false,
    });
  }

  // Also include any tutors who purchased the lead but might not have had a matching notification
  for (const purchase of lead.purchases) {
    const user = purchase.tutorProfile.user;
    const tp = purchase.tutorProfile;
    if (!tutorDetailsMap.has(user.id)) {
      let distanceKm: number | null = null;
      if (lead.mode !== "ONLINE" && lead.latitude && lead.longitude && tp?.latitude && tp?.longitude) {
        distanceKm =
          Math.round(
            haversineDistanceKm(lead.latitude, lead.longitude, tp.latitude, tp.longitude) * 10
          ) / 10;
      }

      tutorDetailsMap.set(user.id, {
        userId: user.id,
        tutorProfileId: tp.id,
        name: user.name || "Tutor",
        email: user.email,
        phone: isSuperAdmin ? user.phone : maskPhoneNumber(user.phone),
        image: user.image,
        city: tp.city,
        area: tp.address,
        subjects: tp.subjects,
        classLevels: tp.classLevels,
        averageRating: tp.averageRating,
        totalReviews: tp.totalReviews,
        kycStatus: tp.kycStatus,
        walletBalance: tp.wallet?.balance ?? 0,
        distanceKm,
        channel: "WEB",
        notificationStatus: "UNLOCKED",
        title: "Lead Unlocked",
        message: "Tutor unlocked lead directly",
        sentAt: purchase.createdAt.toISOString(),
        isRead: true,
        isUnlocked: true,
        coinsSpent: purchase.coinsSpent,
        unlockedAt: purchase.createdAt.toISOString(),
        proposalNote: purchase.proposalNote,
        feeQuote: purchase.feeQuote,
        isShortlisted: purchase.isShortlisted,
        isHired: purchase.isHired,
        isRejected: purchase.isRejected,
      });
    }
  }

  const targetedTutors = Array.from(tutorDetailsMap.values());

  const formattedLead = {
    ...lead,
    parentProfile: lead.parentProfile
      ? {
          ...lead.parentProfile,
          user: lead.parentProfile.user
            ? {
                ...lead.parentProfile.user,
                phone: isSuperAdmin
                  ? lead.parentProfile.user.phone
                  : maskPhoneNumber(lead.parentProfile.user.phone),
              }
            : null,
        }
      : null,
  };

  return actionSuccess({
    lead: formattedLead,
    targetedTutors,
    totalNotified: targetedTutors.length,
  });
}

export async function adminGetMatchingTutorsForLeadAction(
  leadId: string,
  search?: string
): Promise<ActionResult<{ lead: any; tutors: MatchedTutorSummary[] }>> {
  const { error, session } = await requirePermission("leads:manage");
  if (error) return actionError(error);

  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";

  const [lead, leadNotifications] = await Promise.all([
    prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        parentProfile: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
          },
        },
        purchases: { select: { tutorProfileId: true } },
      },
    }),
    prisma.notification.findMany({
      where: {
        OR: [
          { metadata: { path: ["referenceId"], equals: leadId } },
          { actionUrl: { contains: leadId } },
        ],
      },
      select: {
        userId: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!lead) return actionError("Lead not found.");

  const purchasedTutorSet = new Set(lead.purchases.map((p) => p.tutorProfileId));
  const notificationMap = new Map<string, { status: string; sentAt: string }>();
  for (const n of leadNotifications) {
    if (!notificationMap.has(n.userId)) {
      notificationMap.set(n.userId, { status: n.status, sentAt: n.createdAt.toISOString() });
    }
  }

  const tutors = await prisma.tutorProfile.findMany({
    where: {
      user: {
        isActive: true,
        ...(search?.trim()
          ? {
              OR: [
                { name: { contains: search.trim(), mode: "insensitive" } },
                { email: { contains: search.trim(), mode: "insensitive" } },
                { phone: { contains: search.trim(), mode: "insensitive" } },
              ],
            }
          : {}),
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          image: true,
        },
      },
      wallet: { select: { balance: true } },
    },
    take: 300,
  });

  const isOnlineLead = lead.mode === "ONLINE";
  const leadSubjLower = lead.subjects.map((s) => s.toLowerCase());
  const leadClassLower = lead.classLevel.toLowerCase();

  const ranked: MatchedTutorSummary[] = tutors.map((tp) => {
    let subjectMatchCount = 0;
    for (const s of tp.subjects) {
      if (hasSubjectOverlap([s], lead.subjects)) {
        subjectMatchCount++;
      }
    }
    const hasAnySubjectMatch = hasSubjectOverlap(tp.subjects, lead.subjects);
    if (hasAnySubjectMatch && subjectMatchCount === 0) subjectMatchCount = 1;

    const classMatch = coversClassLevel(tp.classLevels, lead.classLevel);

    let distanceKm: number | null = null;
    if (!isOnlineLead && lead.latitude && lead.longitude && tp.latitude && tp.longitude) {
      distanceKm =
        Math.round(
          haversineDistanceKm(
            lead.latitude,
            lead.longitude,
            tp.latitude,
            tp.longitude
          ) * 10
        ) / 10;
    }

    let score = 0;
    if (subjectMatchCount > 0) score += subjectMatchCount * 30;
    if (classMatch) score += 25;
    
    if (isOnlineLead) {
      score += 30;
    } else if (distanceKm !== null && distanceKm <= (lead.radiusKm || 10)) {
      score += Math.max(0, 30 - Math.round(distanceKm * 2));
    } else if (tp.city && lead.city && tp.city.trim().toLowerCase() === lead.city.trim().toLowerCase()) {
      score += 20;
    }

    if (tp.kycStatus === "APPROVED") score += 10;
    if (tp.averageRating >= 4.0) score += 5;

    const notifInfo = notificationMap.get(tp.user.id);

    return {
      tutorProfileId: tp.id,
      userId: tp.user.id,
      name: tp.user.name || "Tutor",
      email: tp.user.email,
      phone: isSuperAdmin ? tp.user.phone : maskPhoneNumber(tp.user.phone),
      image: tp.user.image,
      city: tp.city,
      area: tp.address,
      subjects: tp.subjects,
      classLevels: tp.classLevels,
      averageRating: tp.averageRating,
      totalReviews: tp.totalReviews,
      kycStatus: tp.kycStatus,
      walletBalance: tp.wallet?.balance ?? 0,
      distanceKm,
      alreadyPurchased: purchasedTutorSet.has(tp.id),
      matchScore: score,
      hasNotificationSent: !!notifInfo,
      lastNotifiedAt: notifInfo?.sentAt ?? null,
      notificationStatus: notifInfo?.status ?? null,
    };
  });

  ranked.sort((a, b) => {
    if (a.alreadyPurchased !== b.alreadyPurchased) return a.alreadyPurchased ? 1 : -1;
    return b.matchScore - a.matchScore;
  });

  // Mask parent phone for staff view
  const formattedLead = {
    ...lead,
    parentProfile: lead.parentProfile
      ? {
          ...lead.parentProfile,
          user: lead.parentProfile.user
            ? {
                ...lead.parentProfile.user,
                phone: isSuperAdmin
                  ? lead.parentProfile.user.phone
                  : maskPhoneNumber(lead.parentProfile.user.phone),
              }
            : null,
        }
      : null,
  };

  return actionSuccess({ lead: formattedLead, tutors: ranked });
}

export async function adminSendLeadNotificationAction(
  leadId: string,
  tutorUserIds: string[],
  customMessage?: string
): Promise<ActionResult<{ sentCount: number }>> {
  const { error, session } = await requirePermission("leads:manage");
  if (error) return actionError(error);

  if (!tutorUserIds || tutorUserIds.length === 0) {
    return actionError("No tutors selected.");
  }

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: {
      id: true,
      subjects: true,
      classLevel: true,
      city: true,
      area: true,
      coinCost: true,
    },
  });

  if (!lead) return actionError("Lead not found.");

  const subjectLabel = lead.subjects.slice(0, 2).join(", ");
  const locationLabel =
    [lead.area, lead.city].filter(Boolean).join(", ") || "your area";

  let sentCount = 0;
  for (const userId of tutorUserIds) {
    const notifMsg =
      customMessage ||
      `New verified requirement for ${lead.classLevel} (${subjectLabel}) in ${locationLabel}. Unlock with ${lead.coinCost} coins now!`;

    await createNotification({
      userId,
      type: "LEAD_MATCHED",
      priority: "HIGH",
      channel: "WEB",
      title: "🎯 New Student Tuition Enquiry!",
      message: notifMsg,
      actionUrl: "/tutor/leads",
      referenceId: lead.id,
      forceSend: true,
      sendEmail: true,
    });
    sentCount++;
  }

  await prisma.auditLog.create({
    data: {
      adminId: session!.user.id,
      action: "ADMIN_DISPATCH_LEAD_NOTIFS",
      entityType: "Lead",
      entityId: lead.id,
      details: `Sent lead notification to ${sentCount} tutor(s)`,
    },
  });

  return actionSuccess({ sentCount });
}

export async function adminAssignLeadDirectlyAction(
  leadId: string,
  tutorProfileId: string
): Promise<ActionResult<{ purchaseId: string }>> {
  const { error, session } = await requirePermission("leads:manage");
  if (error) return actionError(error);

  const [lead, tutor] = await Promise.all([
    prisma.lead.findUnique({
      where: { id: leadId },
      include: { parentProfile: { include: { user: true } } },
    }),
    prisma.tutorProfile.findUnique({
      where: { id: tutorProfileId },
      include: { user: true },
    }),
  ]);

  if (!lead) return actionError("Lead not found.");
  if (!tutor) return actionError("Tutor profile not found.");

  const existingPurchase = await prisma.leadPurchase.findUnique({
    where: { leadId_tutorProfileId: { leadId, tutorProfileId } },
  });

  if (existingPurchase) {
    return actionError("This tutor has already unlocked this lead.");
  }

  const purchase = await prisma.$transaction(async (tx) => {
    const p = await tx.leadPurchase.create({
      data: {
        leadId,
        tutorProfileId,
        coinsSpent: 0, // Admin granted complimentary unlock
      },
    });

    const updatedLead = await tx.lead.update({
      where: { id: leadId },
      data: {
        purchaseCount: { increment: 1 },
      },
    });

    if (updatedLead.purchaseCount >= updatedLead.maxTutors) {
      await tx.lead.update({
        where: { id: leadId },
        data: { status: "APPLICATIONS_RECEIVED" },
      });
    }

    await tx.auditLog.create({
      data: {
        adminId: session!.user.id,
        action: "ADMIN_DIRECT_LEAD_ALLOCATION",
        entityType: "LeadPurchase",
        entityId: p.id,
        details: `Directly allocated lead ${leadId} to tutor ${tutor.user.name || tutor.user.email} (0 coins charged)`,
      },
    });

    return p;
  });

  // Notify tutor
  await createNotification({
    userId: tutor.userId,
    type: "LEAD_UNLOCKED",
    priority: "HIGH",
    title: "🎁 Lead Unlocked by Admin!",
    message: `Admin has assigned you a verified ${lead.classLevel} (${lead.subjects.join(", ")}) lead for free! Check parent contact info in Unlocked Leads.`,
    actionUrl: "/tutor/leads",
    referenceId: lead.id,
  });

  revalidatePath("/admin/leads");
  return actionSuccess({ purchaseId: purchase.id });
}

export async function adminAssignLeadWithCoinsDeductionAction(
  leadId: string,
  tutorProfileId: string
): Promise<ActionResult<{ purchaseId: string }>> {
  const { error, session } = await requirePermission("leads:manage");
  if (error) return actionError(error);

  const [lead, tutor] = await Promise.all([
    prisma.lead.findUnique({
      where: { id: leadId },
      include: { parentProfile: { include: { user: true } } },
    }),
    prisma.tutorProfile.findUnique({
      where: { id: tutorProfileId },
      include: { user: true, wallet: true },
    }),
  ]);

  if (!lead) return actionError("Lead not found.");
  if (!tutor) return actionError("Tutor profile not found.");

  const existingPurchase = await prisma.leadPurchase.findUnique({
    where: { leadId_tutorProfileId: { leadId, tutorProfileId } },
  });

  if (existingPurchase) {
    return actionError("This tutor has already unlocked this lead.");
  }

  const wallet = tutor.wallet;
  if (!wallet || wallet.balance < lead.coinCost) {
    return actionError(
      `Insufficient coins. Tutor has ${wallet?.balance ?? 0} coins, but this lead requires ${lead.coinCost} coins. Please top-up their wallet first or assign for free.`
    );
  }

  const purchase = await prisma.$transaction(async (tx) => {
    // 1. Deduct coins from wallet
    const updatedWallet = await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: { decrement: lead.coinCost },
        totalSpent: { increment: lead.coinCost },
      },
    });

    // 2. Record wallet transaction
    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: "DEDUCTION",
        amount: lead.coinCost,
        balanceAfter: updatedWallet.balance,
        description: `Lead unlock (${lead.classLevel} - ${lead.subjects.slice(0, 2).join(", ")})`,
        referenceId: leadId,
      },
    });

    // 3. Record purchase
    const p = await tx.leadPurchase.create({
      data: {
        leadId,
        tutorProfileId,
        coinsSpent: lead.coinCost,
      },
    });

    // 4. Update lead purchase count
    const updatedLead = await tx.lead.update({
      where: { id: leadId },
      data: {
        purchaseCount: { increment: 1 },
      },
    });

    if (updatedLead.purchaseCount >= updatedLead.maxTutors) {
      await tx.lead.update({
        where: { id: leadId },
        data: { status: "APPLICATIONS_RECEIVED" },
      });
    }

    await tx.auditLog.create({
      data: {
        adminId: session!.user.id,
        action: "ADMIN_PAID_LEAD_ALLOCATION",
        entityType: "LeadPurchase",
        entityId: p.id,
        details: `Assigned lead ${leadId} to tutor ${tutor.user.name || tutor.user.email} (${lead.coinCost} coins deducted)`,
      },
    });

    return p;
  });

  // Notify tutor
  await createNotification({
    userId: tutor.userId,
    type: "LEAD_UNLOCKED",
    priority: "HIGH",
    title: "🎯 Lead Unlocked & Ready!",
    message: `Admin has unlocked a ${lead.classLevel} (${lead.subjects.join(", ")}) lead for your account. You can now contact the parent directly!`,
    actionUrl: "/tutor/leads",
    referenceId: lead.id,
  });

  revalidatePath("/admin/leads");
  return actionSuccess({ purchaseId: purchase.id });
}

export async function adminQuickCreditCoinsAction(
  tutorProfileId: string,
  amount: number,
  note?: string
): Promise<ActionResult<{ newBalance: number }>> {
  const { error, session } = await requirePermission("wallets:manage");
  if (error) return actionError(error);

  if (!amount || amount <= 0) return actionError("Amount must be greater than 0.");

  const tutor = await prisma.tutorProfile.findUnique({
    where: { id: tutorProfileId },
    include: { wallet: true, user: true },
  });

  if (!tutor) return actionError("Tutor profile not found.");

  let wallet = tutor.wallet;
  if (!wallet) {
    wallet = await prisma.wallet.create({
      data: { tutorProfileId, balance: 0 },
    });
  }

  const updatedWallet = await prisma.$transaction(async (tx) => {
    const w = await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: { increment: amount },
        totalPurchased: { increment: amount },
      },
    });

    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: "ADMIN_CREDIT",
        amount,
        balanceAfter: w.balance,
        description: note || `Admin quick credit: +${amount} coins`,
      },
    });

    await tx.auditLog.create({
      data: {
        adminId: session!.user.id,
        action: "ADMIN_QUICK_COIN_CREDIT",
        entityType: "Wallet",
        entityId: w.id,
        details: `Credited ${amount} coins to ${tutor.user.name || tutor.user.email}`,
      },
    });

    return w;
  });

  await createNotification({
    userId: tutor.userId,
    type: "WALLET_CREDITED",
    priority: "HIGH",
    title: "💰 Coins Added to Wallet!",
    message: `Admin has credited ${amount} coins to your wallet. Current balance: ${updatedWallet.balance} coins.`,
    actionUrl: "/tutor/wallet",
  });

  revalidatePath("/admin/leads");
  revalidatePath("/admin/wallets");
  return actionSuccess({ newBalance: updatedWallet.balance });
}

export async function adminBatchAssignLeadFreeAction(
  leadId: string,
  tutorProfileIds: string[]
): Promise<ActionResult<{ assignedCount: number }>> {
  const { error, session } = await requirePermission("leads:manage");
  if (error) return actionError(error);

  if (!tutorProfileIds || tutorProfileIds.length === 0) {
    return actionError("No tutors selected.");
  }

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { id: true, classLevel: true, subjects: true, maxTutors: true, purchaseCount: true },
  });
  if (!lead) return actionError("Lead not found.");

  let assignedCount = 0;
  for (const tutorProfileId of tutorProfileIds) {
    const existing = await prisma.leadPurchase.findUnique({
      where: { leadId_tutorProfileId: { leadId, tutorProfileId } },
    });
    if (existing) continue;

    const tutor = await prisma.tutorProfile.findUnique({
      where: { id: tutorProfileId },
      select: { userId: true },
    });
    if (!tutor) continue;

    await prisma.$transaction(async (tx) => {
      const p = await tx.leadPurchase.create({
        data: {
          leadId,
          tutorProfileId,
          coinsSpent: 0,
        },
      });

      await tx.lead.update({
        where: { id: leadId },
        data: { purchaseCount: { increment: 1 } },
      });

      await tx.auditLog.create({
        data: {
          adminId: session!.user.id,
          action: "ADMIN_BATCH_FREE_ALLOCATION",
          entityType: "LeadPurchase",
          entityId: p.id,
          details: `Batch allocated lead ${leadId} to tutor ${tutorProfileId} (0 coins)`,
        },
      });
    });

    await createNotification({
      userId: tutor.userId,
      type: "LEAD_UNLOCKED",
      priority: "HIGH",
      title: "🎁 Complimentary Lead Granted!",
      message: `Admin has assigned you a verified ${lead.classLevel} (${lead.subjects.join(", ")}) lead for free!`,
      actionUrl: "/tutor/leads",
      referenceId: lead.id,
    });

    assignedCount++;
  }

  revalidatePath("/admin/leads");
  return actionSuccess({ assignedCount });
}

export async function adminSearchParentsForLeadAction(
  query: string
): Promise<
  ActionResult<{
    parents: {
      id: string;
      name: string;
      email: string;
      phone: string | null;
      city: string | null;
    }[];
  }>
> {
  const { error } = await requirePermission("leads:manage");
  if (error) return actionError(error);

  const clean = query.trim();
  const parents = await prisma.parentProfile.findMany({
    where: clean
      ? {
          user: {
            OR: [
              { name: { contains: clean, mode: "insensitive" } },
              { email: { contains: clean, mode: "insensitive" } },
              { phone: { contains: clean, mode: "insensitive" } },
            ],
          },
        }
      : undefined,
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
    },
    take: 20,
    orderBy: { createdAt: "desc" },
  });

  return actionSuccess({
    parents: parents.map((p) => ({
      id: p.id,
      name: p.user.name || "Parent User",
      email: p.user.email,
      phone: p.user.phone,
      city: p.city,
    })),
  });
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

  // Security guard: Only the main Super Admin has privileges to permanently delete users
  if (session!.user.role !== "SUPER_ADMIN") {
    return actionError("Permission Denied: Only the Super Admin can permanently delete user accounts.");
  }

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
  if (subjectsRaw !== undefined && subjectsRaw !== null) {
    try {
      subjects = JSON.parse(subjectsRaw);
    } catch {
      subjects = subjectsRaw.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }

  let classLevels: string[] | undefined = undefined;
  if (classLevelsRaw !== undefined && classLevelsRaw !== null) {
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
          ...(subjects !== undefined ? { subjects } : {}),
          ...(classLevels !== undefined ? { classLevels } : {}),
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
  revalidatePath(`/admin/users/${userId}/edit`);
  return actionSuccess({ updated: true });
}

export async function adminUpdateTutorSubjectsAndClassesAction(
  userId: string,
  subjects: string[],
  classLevels: string[]
): Promise<ActionResult<{ updated: true; subjects: string[]; classLevels: string[] }>> {
  const { error, session } = await requirePermission("users:manage");
  if (error) return actionError(error);

  if (!userId) {
    return actionError("User ID is required.");
  }

  const cleanSubjects = Array.from(new Set(subjects.map((s) => s.trim()).filter(Boolean)));
  const cleanClassLevels = Array.from(new Set(classLevels.map((c) => c.trim()).filter(Boolean)));

  await prisma.$transaction(async (tx) => {
    await tx.tutorProfile.upsert({
      where: { userId },
      create: {
        userId,
        subjects: cleanSubjects,
        classLevels: cleanClassLevels,
      },
      update: {
        subjects: cleanSubjects,
        classLevels: cleanClassLevels,
      },
    });

    await tx.auditLog.create({
      data: {
        adminId: session!.user.id,
        action: "EDIT_USER_SUBJECTS",
        entityType: "User",
        entityId: userId,
        details: `Updated subjects (${cleanSubjects.length}) & class levels (${cleanClassLevels.length})`,
      },
    });
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}/edit`);
  return actionSuccess({ updated: true, subjects: cleanSubjects, classLevels: cleanClassLevels });
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

  const isSuperAdmin = session.user.role === "SUPER_ADMIN";

  const users = rawUsers.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: isSuperAdmin ? u.phone : maskPhoneNumber(u.phone),
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

  if (data.actionType === "ENABLE_TOPUP" || data.actionType === "DISABLE_TOPUP") {
    if (!can(session.user, "wallets:manage")) {
      return actionError("You do not have permission to change top-up access.");
    }
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
    if (!can(session.user, "wallets:manage")) {
      return actionError("You do not have permission to grant coins.");
    }
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
