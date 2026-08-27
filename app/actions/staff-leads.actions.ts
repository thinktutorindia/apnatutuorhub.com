"use server";

/**
 * app/actions/staff-leads.actions.ts
 *
 * Server actions for the Staff CRM Lead Management System.
 * Data is kept in a STAGING area (staff_leads table) completely separate
 * from main TutorProfile data. Promotion is an explicit one-click action.
 */

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { actionError, actionSuccess, type ActionResult } from "@/lib/action-result";
import { parseWhatsAppDump, type BatchParseResult } from "@/lib/staff-lead-parser";
import { extractLeadData } from "@/lib/gemini-lead-extractor";
import type { StaffLeadStatus, CallOutcome } from "@prisma/client";
import bcrypt from "bcryptjs";

// ─── Auth helpers ─────────────────────────────────────────────────────────────

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return { error: "Unauthenticated", session: null };
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "SUB_ADMIN") {
    return { error: "Forbidden", session: null };
  }
  return { error: null, session };
}

async function requireCrmOps() {
  const result = await requireAdmin();
  if (result.error || !result.session) return result;
  if (result.session.user.role === "SUPER_ADMIN") return result;
  if (result.session.user.role === "SUB_ADMIN" && result.session.user.subAdminRole === "OPERATIONS") {
    return result;
  }
  return { error: "Forbidden: CRM operations access required", session: null };
}

async function requireAssignedOrCrmOps(leadId: string) {
  const result = await requireAdmin();
  if (result.error || !result.session) return { ...result, lead: null };

  const lead = await prisma.staffLead.findUnique({ where: { id: leadId } });
  if (!lead) return { error: "Lead not found", session: result.session, lead: null };

  if (result.session.user.role === "SUPER_ADMIN") {
    return { error: null, session: result.session, lead };
  }
  if (result.session.user.subAdminRole === "OPERATIONS") {
    return { error: null, session: result.session, lead };
  }
  if (lead.assignedToId === result.session.user.id) {
    return { error: null, session: result.session, lead };
  }
  return { error: "Forbidden: this lead is not assigned to you", session: result.session, lead: null };
}

async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user) return { error: "Unauthenticated", session: null };
  if (session.user.role !== "SUPER_ADMIN") {
    return { error: "Super Admin only", session: null };
  }
  return { error: null, session };
}

// ─── 1. Parse & Preview (with Database Duplicate Detection) ──────────────────

export async function parseLeadBatchPreviewAction(
  rawText: string
): Promise<ActionResult<BatchParseResult>> {
  const { error } = await requireCrmOps();
  if (error) return actionError(error);

  if (!rawText?.trim()) return actionError("Please paste some data");

  try {
    const result = await parseWhatsAppDump(rawText);

    // Extract all phones and emails to check against database
    const phones = result.leads.map((l) => l.phone).filter((p): p is string => Boolean(p));
    const emails = result.leads.map((l) => l.email?.toLowerCase()).filter((e): e is string => Boolean(e));

    const [existingStaffLeads, existingUsers] = await Promise.all([
      prisma.staffLead.findMany({
        where: {
          OR: [
            ...(phones.length ? [{ phone: { in: phones } }] : []),
            ...(emails.length ? [{ email: { in: emails, mode: "insensitive" as const } }] : []),
          ],
        },
        select: { phone: true, email: true, name: true, status: true },
      }),
      prisma.user.findMany({
        where: {
          OR: [
            ...(phones.length ? [{ phone: { in: phones } }] : []),
            ...(emails.length ? [{ email: { in: emails, mode: "insensitive" as const } }] : []),
          ],
        },
        select: { phone: true, email: true, name: true, role: true },
      }),
    ]);

    // Create lookup sets
    const staffPhoneMap = new Map(existingStaffLeads.filter((s) => s.phone).map((s) => [s.phone!, s]));
    const staffEmailMap = new Map(existingStaffLeads.filter((s) => s.email).map((s) => [s.email!.toLowerCase(), s]));
    const userPhoneMap = new Map(existingUsers.filter((u) => u.phone).map((u) => [u.phone!, u]));
    const userEmailMap = new Map(existingUsers.filter((u) => u.email).map((u) => [u.email!.toLowerCase(), u]));

    // Annotate leads with duplicate info
    const enrichedLeads = result.leads.map((lead) => {
      const phone = lead.phone ?? "";
      const email = lead.email?.toLowerCase() ?? "";

      // Check User table first
      if (phone && userPhoneMap.has(phone)) {
        const u = userPhoneMap.get(phone)!;
        return {
          ...lead,
          isDuplicate: true,
          duplicateSource: "USER" as const,
          duplicateDetail: `Already registered as ${u.role} (${u.name ?? u.email})`,
        };
      }
      if (email && userEmailMap.has(email)) {
        const u = userEmailMap.get(email)!;
        return {
          ...lead,
          isDuplicate: true,
          duplicateSource: "USER" as const,
          duplicateDetail: `Already registered as ${u.role} (${u.name ?? u.email})`,
        };
      }

      // Check Staff Leads table
      if (phone && staffPhoneMap.has(phone)) {
        const s = staffPhoneMap.get(phone)!;
        return {
          ...lead,
          isDuplicate: true,
          duplicateSource: "STAFF_LEAD" as const,
          duplicateDetail: `Already in CRM as ${s.name ?? "Lead"} (${s.status})`,
        };
      }
      if (email && staffEmailMap.has(email)) {
        const s = staffEmailMap.get(email)!;
        return {
          ...lead,
          isDuplicate: true,
          duplicateSource: "STAFF_LEAD" as const,
          duplicateDetail: `Already in CRM as ${s.name ?? "Lead"} (${s.status})`,
        };
      }

      return {
        ...lead,
        isDuplicate: false,
        duplicateSource: null,
        duplicateDetail: null,
      };
    });

    return actionSuccess({
      ...result,
      leads: enrichedLeads,
    });
  } catch (err) {
    console.error("[parseLeadBatchPreviewAction]", err);
    return actionError("Parsing failed. Please try again.");
  }
}

// ─── 2. Confirm & Save Batch to DB (Strict Server De-duplication) ────────────

export type StaffLeadInput = {
  rawText?: string;
  name?: string;
  phone?: string;
  altPhone?: string;
  whatsapp?: string;
  email?: string;
  location?: string;
  pincode?: string;
  fullAddress?: string;
  subjects?: string[];
  classes?: string[];
  board?: string;
  qualification?: string;
  experienceYears?: number;
  gender?: string;
};

export async function confirmBatchUploadAction(
  batchName: string,
  rawText: string,
  leads: StaffLeadInput[]
): Promise<ActionResult<{ batchId: string; saved: number; skippedDuplicates: number }>> {
  const { error, session } = await requireCrmOps();
  if (error || !session) return actionError(error ?? "Unauthenticated");

  try {
    // 1. In-memory deduplication of the submitted list
    const seenPhones = new Set<string>();
    const seenEmails = new Set<string>();
    const memoryDeduped: StaffLeadInput[] = [];

    for (const lead of leads) {
      const phone = lead.phone?.trim();
      const email = lead.email?.trim().toLowerCase();

      if ((phone && seenPhones.has(phone)) || (email && seenEmails.has(email))) {
        continue; // Skip duplicate inside the batch
      }

      if (phone) seenPhones.add(phone);
      if (email) seenEmails.add(email);
      memoryDeduped.push(lead);
    }

    // 2. Query DB to find existing phones and emails in staff_leads and users
    const allPhones = memoryDeduped.map((l) => l.phone?.trim()).filter((p): p is string => Boolean(p));
    const allEmails = memoryDeduped.map((l) => l.email?.trim().toLowerCase()).filter((e): e is string => Boolean(e));

    const [existingStaffLeads, existingUsers] = await Promise.all([
      prisma.staffLead.findMany({
        where: {
          OR: [
            ...(allPhones.length ? [{ phone: { in: allPhones } }] : []),
            ...(allEmails.length ? [{ email: { in: allEmails, mode: "insensitive" as const } }] : []),
          ],
        },
        select: { phone: true, email: true },
      }),
      prisma.user.findMany({
        where: {
          OR: [
            ...(allPhones.length ? [{ phone: { in: allPhones } }] : []),
            ...(allEmails.length ? [{ email: { in: allEmails, mode: "insensitive" as const } }] : []),
          ],
        },
        select: { phone: true, email: true },
      }),
    ]);

    const dbPhones = new Set<string>([
      ...existingStaffLeads.map((s) => s.phone).filter((p): p is string => Boolean(p)),
      ...existingUsers.map((u) => u.phone).filter((p): p is string => Boolean(p)),
    ]);

    const dbEmails = new Set<string>([
      ...existingStaffLeads.map((s) => s.email?.toLowerCase()).filter((e): e is string => Boolean(e)),
      ...existingUsers.map((u) => u.email?.toLowerCase()).filter((e): e is string => Boolean(e)),
    ]);

    // 3. Filter out any lead that already exists in DB
    const finalToSave = memoryDeduped.filter((lead) => {
      const phone = lead.phone?.trim();
      const email = lead.email?.trim().toLowerCase();
      if (phone && dbPhones.has(phone)) return false;
      if (email && dbEmails.has(email)) return false;
      return true;
    });

    const skippedDuplicates = leads.length - finalToSave.length;

    if (finalToSave.length === 0) {
      return actionError(`All ${leads.length} leads were skipped because their phone number or email already exists in the system.`);
    }

    const batch = await prisma.staffLeadBatch.create({
      data: {
        name: batchName.trim() || `Batch ${new Date().toLocaleDateString("en-IN")}`,
        rawText,
        totalParsed: finalToSave.length,
        totalJunk: skippedDuplicates,
        createdById: session.user.id,
        leads: {
          create: finalToSave.map((l) => ({
            rawText: l.rawText,
            name: l.name || null,
            phone: l.phone?.trim() || null,
            altPhone: l.altPhone?.trim() || null,
            whatsapp: l.whatsapp?.trim() || null,
            email: l.email?.trim() || null,
            location: l.location || null,
            pincode: l.pincode || null,
            fullAddress: l.fullAddress || null,
            subjects: l.subjects ?? [],
            classes: l.classes ?? [],
            board: l.board || null,
            qualification: l.qualification || null,
            experienceYears: l.experienceYears ?? null,
            gender: l.gender || null,
            createdById: session.user.id,
          })),
        },
      },
    });

    revalidatePath("/admin/staff-leads");
    return actionSuccess({
      batchId: batch.id,
      saved: finalToSave.length,
      skippedDuplicates,
    });
  } catch (err) {
    console.error("[confirmBatchUploadAction]", err);
    return actionError("Failed to save batch. Please try again.");
  }
}

// ─── 3. Update a single lead's fields ────────────────────────────────────────

export async function updateStaffLeadAction(
  leadId: string,
  data: {
    name?: string | null;
    phone?: string | null;
    altPhone?: string | null;
    whatsapp?: string | null;
    email?: string | null;
    location?: string | null;
    fullAddress?: string | null;
    pincode?: string | null;
    qualification?: string | null;
    experienceYears?: number | null;
    gender?: string | null;
    board?: string | null;
    subjects?: string[];
    classes?: string[];
    status?: StaffLeadStatus;
    staffNotes?: string | null;
    nextFollowUpAt?: Date | string | null;
    priority?: number;
  }
): Promise<ActionResult<{ lead: any }>> {
  const { error, session } = await requireAssignedOrCrmOps(leadId);
  if (error || !session) return actionError(error ?? "Unauthenticated");

  const updated = await prisma.staffLead.update({
    where: { id: leadId },
    data: {
      ...(data.name !== undefined && { name: data.name?.trim() || null }),
      ...(data.phone !== undefined && { phone: data.phone?.trim() || null }),
      ...(data.altPhone !== undefined && { altPhone: data.altPhone?.trim() || null }),
      ...(data.whatsapp !== undefined && { whatsapp: data.whatsapp?.trim() || null }),
      ...(data.email !== undefined && { email: data.email?.trim().toLowerCase() || null }),
      ...(data.location !== undefined && { location: data.location?.trim() || null }),
      ...(data.fullAddress !== undefined && { fullAddress: data.fullAddress?.trim() || null }),
      ...(data.pincode !== undefined && { pincode: data.pincode?.trim() || null }),
      ...(data.qualification !== undefined && { qualification: data.qualification?.trim() || null }),
      ...(data.experienceYears !== undefined && { experienceYears: data.experienceYears }),
      ...(data.gender !== undefined && { gender: data.gender?.trim() || null }),
      ...(data.board !== undefined && { board: data.board?.trim() || null }),
      ...(data.subjects !== undefined && { subjects: data.subjects }),
      ...(data.classes !== undefined && { classes: data.classes }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.staffNotes !== undefined && { staffNotes: data.staffNotes?.trim() || null }),
      ...(data.priority !== undefined && { priority: data.priority }),
      ...(data.nextFollowUpAt !== undefined && {
        nextFollowUpAt: data.nextFollowUpAt ? new Date(data.nextFollowUpAt) : null,
      }),
    },
  });

  revalidatePath("/admin/staff-leads");
  revalidatePath("/admin/staff-leads/my-leads");
  return actionSuccess({ lead: updated });
}

// ─── 4. Log a call outcome ────────────────────────────────────────────────────

export async function logCallAction(
  leadId: string,
  outcome: CallOutcome,
  notes: string,
  nextFollowUpAt?: string | null
): Promise<ActionResult<{ logged: true }>> {
  const { error, session } = await requireAssignedOrCrmOps(leadId);
  if (error || !session) return actionError(error ?? "Unauthenticated");
  const statusMap: Record<CallOutcome, StaffLeadStatus> = {
    ANSWERED: "CONTACTED",
    NO_ANSWER: "NO_ANSWER",
    BUSY: "NO_ANSWER",
    WRONG_NUMBER: "REJECTED",
    CALLBACK_REQUESTED: "FOLLOW_UP",
    CONVERTED: "CONVERTED",
    NOT_INTERESTED: "NOT_INTERESTED",
  };

  await prisma.$transaction([
    prisma.staffLeadCallLog.create({
      data: {
        leadId,
        calledById: session.user.id,
        outcome,
        notes: notes || null,
        calledAt: new Date(),
      },
    }),
    prisma.staffLead.update({
      where: { id: leadId },
      data: {
        status: statusMap[outcome],
        lastContactedAt: new Date(),
        nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt) : null,
      },
    }),
  ]);

  revalidatePath("/admin/staff-leads");
  return actionSuccess({ logged: true });
}

// ─── 5. Assign leads to a staff member ───────────────────────────────────────

export async function assignLeadsAction(
  staffUserId: string,
  leadIds: string[]
): Promise<ActionResult<{ assigned: number }>> {
  const { error } = await requireSuperAdmin();
  if (error) return actionError(error);

  const now = new Date();

  await prisma.staffLead.updateMany({
    where: { id: { in: leadIds } },
    data: {
      assignedToId: staffUserId,
      assignedAt: now,
      status: "ASSIGNED",
    },
  });

  revalidatePath("/admin/staff-leads");
  return actionSuccess({ assigned: leadIds.length });
}

// ─── 6. Auto-rotate yesterday's NO_ANSWER leads ──────────────────────────────

export async function autoRotateLeadsAction(): Promise<ActionResult<{ rotated: number }>> {
  const { error } = await requireSuperAdmin();
  if (error) return actionError(error);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  const endOfYesterday = new Date();
  endOfYesterday.setDate(endOfYesterday.getDate() - 1);
  endOfYesterday.setHours(23, 59, 59, 999);

  // Find all staff members who can receive leads (SUPER_ADMIN or SUB_ADMIN)
  const staffList = await prisma.user.findMany({
    where: { role: { in: ["SUPER_ADMIN", "SUB_ADMIN"] }, isActive: true },
    select: { id: true },
  });

  if (staffList.length === 0) return actionSuccess({ rotated: 0 });

  // Get yesterday's NO_ANSWER leads
  const noAnswerLeads = await prisma.staffLead.findMany({
    where: {
      status: "NO_ANSWER",
      assignedAt: { gte: yesterday, lte: endOfYesterday },
    },
    select: { id: true, assignedToId: true },
  });

  if (noAnswerLeads.length === 0) return actionSuccess({ rotated: 0 });

  // Round-robin assign to different staff
  let staffIdx = 0;
  for (const lead of noAnswerLeads) {
    // Skip to next staff member (not the same as yesterday's)
    const originalStaff = lead.assignedToId;
    let attempts = 0;
    while (staffList[staffIdx % staffList.length].id === originalStaff && attempts < staffList.length) {
      staffIdx++;
      attempts++;
    }
    const newStaff = staffList[staffIdx % staffList.length];
    await prisma.staffLead.update({
      where: { id: lead.id },
      data: {
        assignedToId: newStaff.id,
        assignedAt: new Date(),
        status: "ASSIGNED",
      },
    });
    staffIdx++;
  }

  revalidatePath("/admin/staff-leads");
  return actionSuccess({ rotated: noAnswerLeads.length });
}

// ─── 7. Promote lead to real TutorProfile (one-click) ────────────────────────

export async function promoteLeadToProfileAction(
  leadId: string
): Promise<ActionResult<{ userId: string; tutorProfileId: string; isNewUser: boolean; temporaryPassword?: string }>> {
  const { error, session, lead } = await requireAssignedOrCrmOps(leadId);
  if (error || !session?.user || !lead) return actionError(error ?? "Unauthorized");
  if (lead.isPromoted && lead.promotedTutorProfileId) {
    return actionSuccess({
      tutorProfileId: lead.promotedTutorProfileId,
      userId: "",
      isNewUser: false,
    });
  }

  const phone = lead.phone?.trim() || null;
  const email = lead.email?.trim().toLowerCase() || (phone ? `tutor_${phone}@apnatutorhub.com` : null);

  if (!email && !phone) {
    return actionError("Lead must have at least a phone number or email address to create a primary Tutor account.");
  }

  // 1. Check if user already exists
  let user = await prisma.user.findFirst({
    where: {
      OR: [
        ...(email ? [{ email: { equals: email, mode: "insensitive" as const } }] : []),
        ...(phone ? [{ phone }] : []),
      ],
    },
    include: { tutorProfile: true },
  });

  let isNewUser = false;
  let temporaryPassword: string | undefined;

  if (!user) {
    temporaryPassword = "Apnatutor@123";
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    user = await prisma.user.create({
      data: {
        name: lead.name || "Tutor",
        email: email!,
        phone: phone,
        role: "TUTOR",
        passwordHash,
        emailVerified: new Date(),
        isActive: true,
      },
      include: { tutorProfile: true },
    });
    isNewUser = true;
  } else if (user.role !== "TUTOR" && user.role !== "SUPER_ADMIN" && user.role !== "SUB_ADMIN") {
    await prisma.user.update({
      where: { id: user.id },
      data: { role: "TUTOR" },
    });
  }

  // 2. Create or update TutorProfile
  let tutorProfile = user.tutorProfile;
  if (!tutorProfile) {
    tutorProfile = await prisma.tutorProfile.create({
      data: {
        userId: user.id,
        qualification: lead.qualification || "Graduate",
        experience: lead.experienceYears || 1,
        subjects: lead.subjects.length > 0 ? lead.subjects : ["All Subjects"],
        classLevels: lead.classes.length > 0 ? lead.classes : ["Class 1 to 10"],
        city: lead.location || "Delhi",
        address: lead.fullAddress || lead.location || null,
        pincode: lead.pincode || null,
        gender: lead.gender === "Female" ? "FEMALE" : "MALE",
        teachingMode: "EITHER",
        isVerified: false,
        kycStatus: "PENDING",
        subscriptionPlan: "NONE",
        wallet: {
          create: {
            balance: 50,
          },
        },
      },
    });
  }

  // 3. Mark StaffLead as CONVERTED & PROMOTED
  await prisma.staffLead.update({
    where: { id: lead.id },
    data: {
      status: "CONVERTED",
      isPromoted: true,
      promotedTutorProfileId: tutorProfile.id,
    },
  });

  // 4. Log call / activity
  await prisma.staffLeadCallLog.create({
    data: {
      leadId: lead.id,
      calledById: session.user.id,
      outcome: "CONVERTED",
      notes: "Promoted to Primary Tutor Profile by Staff Member",
    },
  });

  revalidatePath("/admin/staff-leads");
  revalidatePath("/admin/staff-leads/my-leads");
  revalidatePath("/admin/users");

  return actionSuccess({
    tutorProfileId: tutorProfile.id,
    userId: user.id,
    isNewUser,
    ...(temporaryPassword ? { temporaryPassword } : {}),
  });
}

// ─── 8. Get all leads (admin overview) ───────────────────────────────────────

export async function getStaffLeadsAction(opts?: {
  status?: StaffLeadStatus;
  assignedToId?: string;
  batchId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<ActionResult<{
  leads: Array<{
    id: string; name: string | null; phone: string | null; email: string | null;
    location: string | null; subjects: string[]; classes: string[]; status: StaffLeadStatus;
    assignedToId: string | null; assignedTo: { name: string | null } | null;
    isPromoted: boolean; createdAt: Date; lastContactedAt: Date | null;
    nextFollowUpAt: Date | null; _count: { callLogs: number };
  }>;
  total: number;
}>> {
  const { error } = await requireCrmOps();
  if (error) return actionError(error);

  const page = opts?.page ?? 1;
  const pageSize = opts?.pageSize ?? 50;

  const where: Record<string, unknown> = {};
  if (opts?.status) where.status = opts.status;
  if (opts?.assignedToId) where.assignedToId = opts.assignedToId;
  if (opts?.batchId) where.batchId = opts.batchId;
  if (opts?.search) {
    where.OR = [
      { name: { contains: opts.search, mode: "insensitive" } },
      { phone: { contains: opts.search } },
      { email: { contains: opts.search, mode: "insensitive" } },
      { location: { contains: opts.search, mode: "insensitive" } },
    ];
  }

  const [leads, total] = await Promise.all([
    prisma.staffLead.findMany({
      where,
      select: {
        id: true, name: true, phone: true, email: true, location: true,
        subjects: true, classes: true, status: true, assignedToId: true,
        assignedTo: { select: { name: true } },
        isPromoted: true, createdAt: true, lastContactedAt: true,
        nextFollowUpAt: true, _count: { select: { callLogs: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.staffLead.count({ where }),
  ]);

  return actionSuccess({ leads: leads as any, total });
}

// ─── 9. Get my assigned leads (staff view) ────────────────────────────────────

export async function getMyStaffLeadsAction(): Promise<ActionResult<{
  leads: Array<{
    id: string;
    name: string | null;
    phone: string | null;
    altPhone: string | null;
    whatsapp: string | null;
    email: string | null;
    location: string | null;
    fullAddress: string | null;
    pincode: string | null;
    qualification: string | null;
    experienceYears: number | null;
    gender: string | null;
    board: string | null;
    subjects: string[];
    classes: string[];
    status: StaffLeadStatus;
    lastContactedAt: Date | null;
    nextFollowUpAt: Date | null;
    staffNotes: string | null;
    priority: number;
    isPromoted: boolean;
    promotedTutorProfileId: string | null;
    rawText: string | null;
    createdAt: Date;
    _count: { callLogs: number };
  }>;
}>> {
  const { error, session } = await requireAdmin();
  if (error || !session?.user) return actionError(error ?? "Unauthorized");

  const leads = await prisma.staffLead.findMany({
    where: {
      assignedToId: session.user.id,
    },
    select: {
      id: true,
      name: true,
      phone: true,
      altPhone: true,
      whatsapp: true,
      email: true,
      location: true,
      fullAddress: true,
      pincode: true,
      qualification: true,
      experienceYears: true,
      gender: true,
      board: true,
      subjects: true,
      classes: true,
      status: true,
      lastContactedAt: true,
      nextFollowUpAt: true,
      staffNotes: true,
      priority: true,
      isPromoted: true,
      promotedTutorProfileId: true,
      rawText: true,
      createdAt: true,
      _count: { select: { callLogs: true } },
    },
    orderBy: [{ nextFollowUpAt: "asc" }, { createdAt: "desc" }],
  });

  return actionSuccess({ leads: leads as any });
}

// ─── 10. Get a single lead with call logs ────────────────────────────────────

export async function getStaffLeadDetailAction(
  id: string
): Promise<ActionResult<{
  lead: {
    id: string; rawText: string | null; name: string | null; phone: string | null;
    altPhone: string | null; whatsapp: string | null; email: string | null;
    location: string | null; pincode: string | null; fullAddress: string | null;
    subjects: string[]; classes: string[]; board: string | null;
    qualification: string | null; experienceYears: number | null; gender: string | null;
    status: StaffLeadStatus; staffNotes: string | null; isPromoted: boolean;
    promotedTutorProfileId: string | null; nextFollowUpAt: Date | null;
    createdAt: Date; assignedTo: { name: string | null; email: string } | null;
    callLogs: Array<{
      id: string; outcome: CallOutcome; notes: string | null; calledAt: Date;
      calledBy: { name: string | null };
    }>;
  };
}>> {
  const assigned = await requireAssignedOrCrmOps(id);
  if (assigned.error || !assigned.session) return actionError(assigned.error ?? "Unauthenticated");

  const detail = await prisma.staffLead.findUnique({
    where: { id },
    include: {
      assignedTo: { select: { name: true, email: true } },
      callLogs: {
        include: { calledBy: { select: { name: true } } },
        orderBy: { calledAt: "desc" },
      },
    },
  });

  if (!detail) return actionError("Lead not found");
  return actionSuccess({ lead: detail as any });
}

// ─── 11. Get batches list ─────────────────────────────────────────────────────

export async function getStaffLeadBatchesAction(): Promise<ActionResult<{
  batches: Array<{
    id: string; name: string; totalParsed: number; createdAt: Date;
    _count: { leads: number };
  }>;
}>> {
  const { error } = await requireCrmOps();
  if (error) return actionError(error);

  const batches = await prisma.staffLeadBatch.findMany({
    select: { id: true, name: true, totalParsed: true, createdAt: true, _count: { select: { leads: true } } },
    orderBy: { createdAt: "desc" },
  });

  return actionSuccess({ batches: batches as any });
}

// ─── 12. Get staff members for assignment ────────────────────────────────────

export async function getStaffMembersAction(): Promise<ActionResult<{
  staff: Array<{
    id: string; name: string | null; email: string; subAdminRole: string | null;
    _count_leads: number;
  }>;
}>> {
  const { error } = await requireSuperAdmin();
  if (error) return actionError(error);

  const staff = await prisma.user.findMany({
    where: { role: { in: ["SUPER_ADMIN", "SUB_ADMIN"] }, isActive: true },
    select: { id: true, name: true, email: true, subAdminRole: true },
  });

  // Count their active leads
  const counts = await Promise.all(
    staff.map((s) =>
      prisma.staffLead.count({
        where: { assignedToId: s.id, status: { notIn: ["CONVERTED", "NOT_INTERESTED", "REJECTED", "DUPLICATE"] } },
      })
    )
  );

  return actionSuccess({
    staff: staff.map((s, i) => ({ ...s, _count_leads: counts[i] })) as any,
  });
}

// ─── 13. Get overview stats ───────────────────────────────────────────────────

export async function getStaffLeadStatsAction(): Promise<ActionResult<{
  total: number; newLeads: number; assigned: number; contacted: number;
  interested: number; converted: number; notInterested: number; noAnswer: number; followUp: number;
}>> {
  const { error } = await requireCrmOps();
  if (error) return actionError(error);

  const [total, newLeads, assigned, contacted, interested, converted, notInterested, noAnswer, followUp] = await Promise.all([
    prisma.staffLead.count(),
    prisma.staffLead.count({ where: { status: "NEW" } }),
    prisma.staffLead.count({ where: { status: "ASSIGNED" } }),
    prisma.staffLead.count({ where: { status: "CONTACTED" } }),
    prisma.staffLead.count({ where: { status: "INTERESTED" } }),
    prisma.staffLead.count({ where: { status: "CONVERTED" } }),
    prisma.staffLead.count({ where: { status: "NOT_INTERESTED" } }),
    prisma.staffLead.count({ where: { status: "NO_ANSWER" } }),
    prisma.staffLead.count({ where: { status: "FOLLOW_UP" } }),
  ]);

  return actionSuccess({ total, newLeads, assigned, contacted, interested, converted, notInterested, noAnswer, followUp });
}

// ─── 14. Re-parse a single lead with AI ──────────────────────────────────────

export async function reParseLeadWithAIAction(
  leadId: string
): Promise<ActionResult<{ updated: true }>> {
  const { error } = await requireAssignedOrCrmOps(leadId);
  if (error) return actionError(error);

  const lead = await prisma.staffLead.findUnique({ where: { id: leadId }, select: { rawText: true } });
  if (!lead?.rawText) return actionError("No raw text to re-parse");

  try {
    const parsed = await extractLeadData(lead.rawText);
    await prisma.staffLead.update({
      where: { id: leadId },
      data: {
        name: parsed.name ?? undefined,
        phone: parsed.phone ?? undefined,
        altPhone: parsed.altPhone ?? undefined,
        whatsapp: parsed.whatsapp ?? undefined,
        email: parsed.email ?? undefined,
        location: parsed.location ?? undefined,
        pincode: parsed.pincode ?? undefined,
        fullAddress: parsed.fullAddress ?? undefined,
        subjects: parsed.subjects,
        classes: parsed.classes,
        board: parsed.board ?? undefined,
        qualification: parsed.qualification ?? undefined,
        experienceYears: parsed.experienceYears ?? undefined,
        gender: parsed.gender ?? undefined,
      },
    });
    revalidatePath("/admin/staff-leads");
    return actionSuccess({ updated: true });
  } catch (err) {
    return actionError("Re-parse failed");
  }
}

// ─── 15. Smart Auto-Distribute Unassigned Leads ───────────────────────────────

export async function smartAutoDistributeAction(opts?: {
  limitPerStaff?: number;
}): Promise<ActionResult<{ distributed: number; staffCount: number }>> {
  const { error } = await requireSuperAdmin();
  if (error) return actionError(error);

  const limit = opts?.limitPerStaff ?? 20;

  // Active staff members
  const staff = await prisma.user.findMany({
    where: { role: { in: ["SUPER_ADMIN", "SUB_ADMIN"] }, isActive: true },
    select: { id: true, name: true },
  });

  if (staff.length === 0) return actionError("No active staff members found to distribute leads.");

  // Get NEW unassigned leads
  const unassignedLeads = await prisma.staffLead.findMany({
    where: { status: "NEW", assignedToId: null },
    take: staff.length * limit,
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (unassignedLeads.length === 0) {
    return actionSuccess({ distributed: 0, staffCount: staff.length });
  }

  let distributed = 0;
  const now = new Date();

  // Round-robin distribution
  for (let i = 0; i < unassignedLeads.length; i++) {
    const targetStaff = staff[i % staff.length];
    await prisma.staffLead.update({
      where: { id: unassignedLeads[i].id },
      data: {
        assignedToId: targetStaff.id,
        assignedAt: now,
        status: "ASSIGNED",
      },
    });
    distributed++;
  }

  revalidatePath("/admin/staff-leads");
  return actionSuccess({ distributed, staffCount: staff.length });
}

// ─── 16. Delete Batch & Associated Unpromoted Leads ───────────────────────────

export async function deleteLeadBatchAction(
  batchId: string
): Promise<ActionResult<{ deletedLeads: number }>> {
  const { error } = await requireSuperAdmin();
  if (error) return actionError(error);

  // Delete all unpromoted leads belonging to this batch
  const { count } = await prisma.staffLead.deleteMany({
    where: { batchId, isPromoted: false },
  });

  // Delete the batch record
  await prisma.staffLeadBatch.delete({
    where: { id: batchId },
  }).catch(() => null);

  revalidatePath("/admin/staff-leads");
  return actionSuccess({ deletedLeads: count });
}

// ─── 17. Bulk Reassign Leads ──────────────────────────────────────────────────

export async function bulkReassignLeadsAction(
  leadIds: string[],
  newStaffId: string
): Promise<ActionResult<{ reassigned: number }>> {
  const { error } = await requireSuperAdmin();
  if (error) return actionError(error);

  if (!leadIds.length || !newStaffId) return actionError("Invalid parameters");

  await prisma.staffLead.updateMany({
    where: { id: { in: leadIds } },
    data: {
      assignedToId: newStaffId,
      assignedAt: new Date(),
      status: "ASSIGNED",
    },
  });

  revalidatePath("/admin/staff-leads");
  return actionSuccess({ reassigned: leadIds.length });
}

// ─── 18. All-in-One Management Center Deep Data ───────────────────────────────

export async function getStaffCrmManagementHubDataAction(): Promise<ActionResult<{
  staffStats: Array<{
    id: string;
    name: string | null;
    email: string;
    role: string;
    subAdminRole: string | null;
    activeLeads: number;
    callsToday: number;
    callsTotal: number;
    converted: number;
    noAnswer: number;
    followUpsDue: number;
  }>;
  batchStats: Array<{
    id: string;
    name: string;
    totalParsed: number;
    createdAt: Date;
    totalLeads: number;
    convertedLeads: number;
    conversionRate: number;
  }>;
  statusBreakdown: Record<string, number>;
  unassignedCount: number;
  dueFollowUpsCount: number;
}>> {
  const { error } = await requireCrmOps();
  if (error) return actionError(error);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. Get staff list
  const staff = await prisma.user.findMany({
    where: { role: { in: ["SUPER_ADMIN", "SUB_ADMIN"] }, isActive: true },
    select: { id: true, name: true, email: true, role: true, subAdminRole: true },
  });

  // 2. Aggregate metrics per staff
  const staffStats = await Promise.all(
    staff.map(async (s) => {
      const [activeLeads, callsToday, callsTotal, converted, noAnswer, followUpsDue] = await Promise.all([
        prisma.staffLead.count({
          where: { assignedToId: s.id, status: { notIn: ["CONVERTED", "NOT_INTERESTED", "REJECTED", "DUPLICATE"] } },
        }),
        prisma.staffLeadCallLog.count({
          where: { calledById: s.id, calledAt: { gte: today } },
        }),
        prisma.staffLeadCallLog.count({
          where: { calledById: s.id },
        }),
        prisma.staffLead.count({
          where: { assignedToId: s.id, status: "CONVERTED" },
        }),
        prisma.staffLead.count({
          where: { assignedToId: s.id, status: "NO_ANSWER" },
        }),
        prisma.staffLead.count({
          where: { assignedToId: s.id, nextFollowUpAt: { lte: new Date() }, status: "FOLLOW_UP" },
        }),
      ]);

      return {
        id: s.id,
        name: s.name,
        email: s.email,
        role: s.role,
        subAdminRole: s.subAdminRole,
        activeLeads,
        callsToday,
        callsTotal,
        converted,
        noAnswer,
        followUpsDue,
      };
    })
  );

  // 3. Batches performance
  const batches = await prisma.staffLeadBatch.findMany({
    include: {
      leads: { select: { status: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 15,
  });

  const batchStats = batches.map((b) => {
    const totalLeads = b.leads.length;
    const convertedLeads = b.leads.filter((l) => l.status === "CONVERTED").length;
    const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;
    return {
      id: b.id,
      name: b.name,
      totalParsed: b.totalParsed,
      createdAt: b.createdAt,
      totalLeads,
      convertedLeads,
      conversionRate,
    };
  });

  // 4. Status breakdown
  const statusCounts = await prisma.staffLead.groupBy({
    by: ["status"],
    _count: { id: true },
  });

  const statusBreakdown: Record<string, number> = {};
  statusCounts.forEach((s) => {
    statusBreakdown[s.status] = s._count.id;
  });

  const [unassignedCount, dueFollowUpsCount] = await Promise.all([
    prisma.staffLead.count({ where: { status: "NEW", assignedToId: null } }),
    prisma.staffLead.count({ where: { nextFollowUpAt: { lte: new Date() }, status: "FOLLOW_UP" } }),
  ]);

  return actionSuccess({
    staffStats,
    batchStats,
    statusBreakdown,
    unassignedCount,
    dueFollowUpsCount,
  });
}

// ─── 19. Bulk Promote Multiple Leads to Primary Tutor Profiles ────────────────

export async function bulkPromoteLeadsToProfilesAction(leadIds: string[]): Promise<ActionResult<{
  promotedCount: number;
  errors: string[];
}>> {
  const { error, session } = await requireAdmin();
  if (error || !session?.user) return actionError(error ?? "Unauthorized");

  if (!leadIds || leadIds.length === 0) {
    return actionError("No leads selected for promotion.");
  }

  let promotedCount = 0;
  const errors: string[] = [];

  for (const id of leadIds) {
    const res = await promoteLeadToProfileAction(id);
    if (res.success) {
      promotedCount++;
    } else {
      errors.push(`Lead ${id}: ${res.error}`);
    }
  }

  revalidatePath("/admin/staff-leads");
  revalidatePath("/admin/staff-leads/my-leads");
  revalidatePath("/admin/users");

  return actionSuccess({ promotedCount, errors });
}

// ─── 20. Get Call Logs History for a Lead ─────────────────────────────────────

export async function getLeadCallLogsAction(leadId: string): Promise<ActionResult<{
  callLogs: Array<{
    id: string;
    outcome: CallOutcome;
    notes: string | null;
    calledAt: Date;
    calledBy: { name: string | null; email: string };
  }>;
}>> {
  const { error } = await requireAssignedOrCrmOps(leadId);
  if (error) return actionError(error);

  const logs = await prisma.staffLeadCallLog.findMany({
    where: { leadId },
    include: {
      calledBy: { select: { name: true, email: true } },
    },
    orderBy: { calledAt: "desc" },
  });

  return actionSuccess({ callLogs: logs as any });
}

// ─── 22. Bulk Update Lead Status ──────────────────────────────────────────────

export async function bulkUpdateLeadStatusAction(
  leadIds: string[],
  status: StaffLeadStatus
): Promise<ActionResult<{ updated: number }>> {
  const { error } = await requireAdmin();
  if (error) return actionError(error);

  await prisma.staffLead.updateMany({
    where: { id: { in: leadIds } },
    data: { status },
  });

  revalidatePath("/admin/staff-leads");
  revalidatePath("/admin/staff-leads/my-leads");
  return actionSuccess({ updated: leadIds.length });
}

// ─── 23. Get Staff Daily & Historical Activity Feed ───────────────────────────

export async function getStaffLeadActivityFeedAction(opts?: {
  period?: "today" | "yesterday" | "week" | "month" | "all";
  staffId?: string;
  outcome?: string;
  limit?: number;
}): Promise<ActionResult<{
  isSuperAdmin: boolean;
  logs: Array<{
    id: string;
    outcome: CallOutcome;
    notes: string | null;
    calledAt: Date;
    calledBy: { id: string; name: string | null; email: string; subAdminRole: string | null };
    lead: {
      id: string;
      name: string | null;
      phone: string | null;
      location: string | null;
      subjects: string[];
      status: StaffLeadStatus;
      isPromoted: boolean;
    };
  }>;
  summary: {
    totalCalls: number;
    answered: number;
    callbacks: number;
    interested: number;
    converted: number;
    noAnswer: number;
  };
  staffSummary: Array<{
    id: string;
    name: string | null;
    email: string;
    subAdminRole: string | null;
    totalCalls: number;
    converted: number;
    answered: number;
    lastActive: Date | null;
  }>;
  allStaff: Array<{ id: string; name: string | null; email: string }>;
}>> {
  const { error, session } = await requireAdmin();
  if (error || !session?.user) return actionError(error ?? "Unauthorized");

  const isSuperAdmin = session.user.role === "SUPER_ADMIN";
  const period = opts?.period ?? "today";
  const limit = opts?.limit ?? 150;

  const now = new Date();
  let startDate: Date | undefined;
  let endDate: Date | undefined;

  if (period === "today") {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  } else if (period === "yesterday") {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
  } else if (period === "week") {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (period === "month") {
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  const where: any = {};
  if (startDate || endDate) {
    where.calledAt = {
      ...(startDate && { gte: startDate }),
      ...(endDate && { lte: endDate }),
    };
  }

  // Strictly scope to own user ID if NOT Super Admin
  if (!isSuperAdmin) {
    where.calledById = session.user.id;
  } else if (opts?.staffId && opts.staffId !== "all") {
    where.calledById = opts.staffId;
  }

  if (opts?.outcome && opts.outcome !== "all") {
    where.outcome = opts.outcome as CallOutcome;
  }

  const [logs, rawStaffUsers] = await Promise.all([
    prisma.staffLeadCallLog.findMany({
      where,
      include: {
        calledBy: { select: { id: true, name: true, email: true, subAdminRole: true } },
        lead: {
          select: {
            id: true,
            name: true,
            phone: true,
            location: true,
            subjects: true,
            status: true,
            isPromoted: true,
          },
        },
      },
      orderBy: { calledAt: "desc" },
      take: limit,
    }),
    isSuperAdmin
      ? prisma.user.findMany({
          where: { role: { in: ["SUPER_ADMIN", "SUB_ADMIN"] }, isActive: true },
          select: { id: true, name: true, email: true, subAdminRole: true },
        })
      : prisma.user.findMany({
          where: { id: session.user.id },
          select: { id: true, name: true, email: true, subAdminRole: true },
        }),
  ]);

  const allStaffUsers = rawStaffUsers;

  let totalCalls = logs.length;
  let answered = 0;
  let callbacks = 0;
  let interested = 0;
  let converted = 0;
  let noAnswer = 0;

  const staffMap = new Map<string, { totalCalls: number; converted: number; answered: number; lastActive: Date | null }>();

  logs.forEach((log) => {
    if (log.outcome === "ANSWERED") answered++;
    else if (log.outcome === "CALLBACK_REQUESTED") callbacks++;
    else if (log.outcome === "CONVERTED") converted++;
    else if (log.outcome === "NO_ANSWER" || log.outcome === "BUSY") noAnswer++;

    if (log.lead.status === "INTERESTED") interested++;

    const s = staffMap.get(log.calledById) || { totalCalls: 0, converted: 0, answered: 0, lastActive: null };
    s.totalCalls++;
    if (log.outcome === "CONVERTED" || log.lead.isPromoted) s.converted++;
    if (log.outcome === "ANSWERED") s.answered++;
    if (!s.lastActive || log.calledAt > s.lastActive) s.lastActive = log.calledAt;
    staffMap.set(log.calledById, s);
  });

  const staffSummary = allStaffUsers.map((user) => {
    const stats = staffMap.get(user.id) || { totalCalls: 0, converted: 0, answered: 0, lastActive: null };
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      subAdminRole: user.subAdminRole,
      ...stats,
    };
  }).sort((a, b) => b.totalCalls - a.totalCalls);

  return actionSuccess({
    isSuperAdmin,
    logs: logs as any,
    summary: { totalCalls, answered, callbacks, interested, converted, noAnswer },
    staffSummary,
    allStaff: allStaffUsers.map((u) => ({ id: u.id, name: u.name, email: u.email })),
  });
}

// ─── 24. Get Daily, Weekly & Historical CRM Work Reports ─────────────────────

export async function getStaffDailyWorkReportsAction(opts?: {
  startDate?: string;
  endDate?: string;
  staffId?: string;
}): Promise<ActionResult<{
  dailyBreakdown: Array<{
    dateKey: string;
    displayDate: string;
    totalCalls: number;
    answered: number;
    interested: number;
    callbacks: number;
    converted: number;
    noAnswer: number;
    activeStaffCount: number;
    staffDetails: Array<{
      staffId: string;
      staffName: string;
      subAdminRole: string | null;
      calls: number;
      answered: number;
      converted: number;
    }>;
  }>;
  staffWeeklyMatrix: Array<{
    staffId: string;
    staffName: string;
    email: string;
    subAdminRole: string | null;
    totalCalls: number;
    answered: number;
    converted: number;
    callbacks: number;
    noAnswer: number;
    activeDays: number;
    avgCallsPerDay: number;
    currentAssigned: number;
    followUpsDue: number;
  }>;
  periodSummary: {
    totalCalls: number;
    totalAnswered: number;
    totalConverted: number;
    totalCallbacks: number;
    totalNoAnswer: number;
    answerRate: number;
    conversionRate: number;
  };
  staffList: Array<{ id: string; name: string | null; email: string }>;
}>> {
  const { error, session } = await requireCrmOps();
  if (error || !session?.user) return actionError(error ?? "Unauthorized");

  const isSuperAdmin = session.user.role === "SUPER_ADMIN";

  const now = new Date();
  const start = opts?.startDate ? new Date(opts.startDate) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const end = opts?.endDate ? new Date(opts.endDate) : now;

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  const where: any = {
    calledAt: {
      gte: start,
      lte: end,
    },
  };

  if (!isSuperAdmin) {
    where.calledById = session.user.id;
  } else if (opts?.staffId && opts.staffId !== "all") {
    where.calledById = opts.staffId;
  }

  const [callLogs, allStaffUsers, staffLeadCounts] = await Promise.all([
    prisma.staffLeadCallLog.findMany({
      where,
      include: {
        calledBy: { select: { id: true, name: true, email: true, subAdminRole: true } },
        lead: {
          select: {
            id: true,
            name: true,
            phone: true,
            status: true,
            isPromoted: true,
          },
        },
      },
      orderBy: { calledAt: "desc" },
    }),
    isSuperAdmin
      ? prisma.user.findMany({
          where: { role: { in: ["SUPER_ADMIN", "SUB_ADMIN"] }, isActive: true },
          select: { id: true, name: true, email: true, subAdminRole: true },
        })
      : prisma.user.findMany({
          where: { id: session.user.id },
          select: { id: true, name: true, email: true, subAdminRole: true },
        }),
    prisma.staffLead.groupBy({
      by: ["assignedToId", "status"],
      _count: { id: true },
    }),
  ]);

  const dayMap = new Map<string, {
    dateKey: string;
    displayDate: string;
    totalCalls: number;
    answered: number;
    interested: number;
    callbacks: number;
    converted: number;
    noAnswer: number;
    staffMap: Map<string, { staffId: string; staffName: string; subAdminRole: string | null; calls: number; answered: number; converted: number }>;
  }>();

  const staffMatrixMap = new Map<string, {
    staffId: string;
    staffName: string;
    email: string;
    subAdminRole: string | null;
    totalCalls: number;
    answered: number;
    converted: number;
    callbacks: number;
    noAnswer: number;
    activeDaysSet: Set<string>;
  }>();

  allStaffUsers.forEach((u) => {
    staffMatrixMap.set(u.id, {
      staffId: u.id,
      staffName: u.name || u.email.split("@")[0],
      email: u.email,
      subAdminRole: u.subAdminRole,
      totalCalls: 0,
      answered: 0,
      converted: 0,
      callbacks: 0,
      noAnswer: 0,
      activeDaysSet: new Set(),
    });
  });

  let totalCalls = 0;
  let totalAnswered = 0;
  let totalConverted = 0;
  let totalCallbacks = 0;
  let totalNoAnswer = 0;

  callLogs.forEach((log) => {
    totalCalls++;
    const d = new Date(log.calledAt);
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const displayDate = d.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    let day = dayMap.get(dateKey);
    if (!day) {
      day = {
        dateKey,
        displayDate,
        totalCalls: 0,
        answered: 0,
        interested: 0,
        callbacks: 0,
        converted: 0,
        noAnswer: 0,
        staffMap: new Map(),
      };
      dayMap.set(dateKey, day);
    }

    day.totalCalls++;
    if (log.outcome === "ANSWERED") {
      day.answered++;
      totalAnswered++;
    } else if (log.outcome === "CALLBACK_REQUESTED") {
      day.callbacks++;
      totalCallbacks++;
    } else if (log.outcome === "CONVERTED") {
      day.converted++;
      totalConverted++;
    } else if (log.outcome === "NO_ANSWER" || log.outcome === "BUSY") {
      day.noAnswer++;
      totalNoAnswer++;
    }

    if (log.lead.status === "INTERESTED") {
      day.interested++;
    }

    const staffId = log.calledById;
    const staffName = log.calledBy.name || log.calledBy.email.split("@")[0];
    let staffInDay = day.staffMap.get(staffId);
    if (!staffInDay) {
      staffInDay = {
        staffId,
        staffName,
        subAdminRole: log.calledBy.subAdminRole,
        calls: 0,
        answered: 0,
        converted: 0,
      };
      day.staffMap.set(staffId, staffInDay);
    }
    staffInDay.calls++;
    if (log.outcome === "ANSWERED") staffInDay.answered++;
    if (log.outcome === "CONVERTED" || log.lead.isPromoted) staffInDay.converted++;

    let sm = staffMatrixMap.get(staffId);
    if (!sm) {
      sm = {
        staffId,
        staffName,
        email: log.calledBy.email,
        subAdminRole: log.calledBy.subAdminRole,
        totalCalls: 0,
        answered: 0,
        converted: 0,
        callbacks: 0,
        noAnswer: 0,
        activeDaysSet: new Set(),
      };
      staffMatrixMap.set(staffId, sm);
    }
    sm.totalCalls++;
    sm.activeDaysSet.add(dateKey);
    if (log.outcome === "ANSWERED") sm.answered++;
    if (log.outcome === "CONVERTED" || log.lead.isPromoted) sm.converted++;
    if (log.outcome === "CALLBACK_REQUESTED") sm.callbacks++;
    if (log.outcome === "NO_ANSWER" || log.outcome === "BUSY") sm.noAnswer++;
  });

  const staffAssignedMap = new Map<string, { currentAssigned: number; followUpsDue: number }>();
  staffLeadCounts.forEach((s) => {
    if (!s.assignedToId) return;
    const current = staffAssignedMap.get(s.assignedToId) || { currentAssigned: 0, followUpsDue: 0 };
    current.currentAssigned += s._count.id;
    if (s.status === "FOLLOW_UP") current.followUpsDue += s._count.id;
    staffAssignedMap.set(s.assignedToId, current);
  });

  const dailyBreakdown = Array.from(dayMap.values())
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey))
    .map((d) => ({
      dateKey: d.dateKey,
      displayDate: d.displayDate,
      totalCalls: d.totalCalls,
      answered: d.answered,
      interested: d.interested,
      callbacks: d.callbacks,
      converted: d.converted,
      noAnswer: d.noAnswer,
      activeStaffCount: d.staffMap.size,
      staffDetails: Array.from(d.staffMap.values()).sort((a, b) => b.calls - a.calls),
    }));

  const staffWeeklyMatrix = Array.from(staffMatrixMap.values())
    .map((sm) => {
      const activeDays = sm.activeDaysSet.size;
      const assigned = staffAssignedMap.get(sm.staffId) || { currentAssigned: 0, followUpsDue: 0 };
      return {
        staffId: sm.staffId,
        staffName: sm.staffName,
        email: sm.email,
        subAdminRole: sm.subAdminRole,
        totalCalls: sm.totalCalls,
        answered: sm.answered,
        converted: sm.converted,
        callbacks: sm.callbacks,
        noAnswer: sm.noAnswer,
        activeDays,
        avgCallsPerDay: activeDays > 0 ? Math.round(sm.totalCalls / activeDays) : 0,
        currentAssigned: assigned.currentAssigned,
        followUpsDue: assigned.followUpsDue,
      };
    })
    .sort((a, b) => b.totalCalls - a.totalCalls);

  const answerRate = totalCalls > 0 ? Math.round((totalAnswered / totalCalls) * 100) : 0;
  const conversionRate = totalCalls > 0 ? Math.round((totalConverted / totalCalls) * 100) : 0;

  return actionSuccess({
    dailyBreakdown,
    staffWeeklyMatrix,
    periodSummary: {
      totalCalls,
      totalAnswered,
      totalConverted,
      totalCallbacks,
      totalNoAnswer,
      answerRate,
      conversionRate,
    },
    staffList: allStaffUsers.map((u) => ({ id: u.id, name: u.name, email: u.email })),
  });
}





