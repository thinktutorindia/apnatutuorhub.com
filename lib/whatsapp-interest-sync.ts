/**
 * lib/whatsapp-interest-sync.ts
 *
 * Automatic and on-demand detection and tagging of WhatsApp interested leads.
 * Connects WhatsApp inbound chat replies with StaffLead (status = INTERESTED)
 * and ensures they can be targeted directly in Dummy Lead Campaigns.
 */

import { prisma } from "@/lib/prisma";
import { normalizeIndiaWhatsApp } from "@/lib/aqua-whatsapp";

const POSITIVE_INTEREST_PATTERNS = [
  /\binterested\b/i,
  /\byes\b/i,
  /\bha\b/i,
  /\bhaa\b/i,
  /\bhaan\b/i,
  /\bchahiye\b/i,
  /\bdemo\b/i,
  /\btutor\b/i,
  /\bneed\b/i,
  /\bclass\b/i,
  /\bjoin\b/i,
  /\bstart\b/i,
  /\bsir\b/i,
  /\bfee\b/i,
  /\bfees\b/i,
  /\bsubject\b/i,
  /\bsubjects\b/i,
  /\bready\b/i,
  /\bcontact\b/i,
  /\bcall\b/i,
  /\bdetails\b/i,
  /\bavailable\b/i,
];

const EXPLICIT_OPT_OUT_PATTERNS = [
  /\bnot interested\b/i,
  /\bno need\b/i,
  /\bstop\b/i,
  /\bdon't message\b/i,
  /\bdont message\b/i,
  /\bunsubscribe\b/i,
  /\bwrong number\b/i,
  /^no$/i,
  /^nahi$/i,
  /^nahin$/i,
];

/**
 * Checks if message body expresses positive interest
 */
export function isPositiveInterest(text: string): boolean {
  if (!text || typeof text !== "string") return false;
  const trimmed = text.trim();
  if (!trimmed) return false;

  // Check explicit opt-outs first
  for (const pattern of EXPLICIT_OPT_OUT_PATTERNS) {
    if (pattern.test(trimmed)) return false;
  }

  // Quick single-word affirmations
  const lower = trimmed.toLowerCase();
  if (lower === "ok" || lower === "okay" || lower === "1" || lower === "yes" || lower === "ha") {
    return true;
  }

  // Pattern check
  for (const pattern of POSITIVE_INTEREST_PATTERNS) {
    if (pattern.test(trimmed)) return true;
  }

  // If text contains an email address, usually sharing contact info
  if (trimmed.includes("@") && trimmed.includes(".")) {
    return true;
  }

  return false;
}

/**
 * Automatically tag a WhatsApp contact as an INTERESTED lead in the CRM
 * and ensure a corresponding User record exists for Dummy Campaign targeting.
 */
export async function autoTagWhatsAppInterest(opts: {
  phone: string;
  text: string;
  contactName?: string | null;
}) {
  const { phone, text, contactName } = opts;
  const normalized = normalizeIndiaWhatsApp(phone) || phone.replace(/\D/g, "");
  if (!normalized) return { success: false, error: "Invalid phone" };

  try {
    // 1. Check if StaffLead exists for this phone
    const existingLead = await prisma.staffLead.findFirst({
      where: {
        OR: [
          { phone: normalized },
          { whatsapp: normalized },
        ],
      },
      select: { id: true, status: true, name: true },
    });

    // Find default batch
    let batch = await prisma.staffLeadBatch.findFirst({
      where: { name: { contains: "WhatsApp", mode: "insensitive" } },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    const systemUser = await prisma.user.findFirst({
      where: { role: "SUPER_ADMIN" },
      select: { id: true },
    });
    const defaultCreatedById = systemUser?.id ?? "system";

    if (!batch && defaultCreatedById) {
      batch = await prisma.staffLeadBatch.create({
        data: {
          name: "WhatsApp Live Chat Leads",
          rawText: "WhatsApp Inbound Interest Leads",
          totalParsed: 0,
          totalJunk: 0,
          createdById: defaultCreatedById,
        },
        select: { id: true },
      }).catch(() => null);
    }

    const snippet = text.slice(0, 250);
    const staffNote = `📱 Auto-detected WhatsApp reply: "${snippet}"`;

    if (existingLead) {
      // Don't overwrite if already converted or rejected
      const protectedStatuses = ["CONVERTED", "REJECTED", "DUPLICATE"];
      if (!protectedStatuses.includes(existingLead.status)) {
        await prisma.staffLead.update({
          where: { id: existingLead.id },
          data: {
            status: "INTERESTED",
            whatsapp: normalized,
            staffNotes: staffNote,
            lastContactedAt: new Date(),
            ...(contactName && !existingLead.name ? { name: contactName } : {}),
          },
        });
      }
    } else {
      await prisma.staffLead.create({
        data: {
          batchId: batch?.id,
          name: contactName ?? null,
          phone: normalized,
          whatsapp: normalized,
          status: "INTERESTED",
          staffNotes: staffNote,
          createdById: defaultCreatedById,
          lastContactedAt: new Date(),
        },
      });
    }

    // 2. Ensure User account exists so Dummy Campaigns can target this tutor directly
    await ensureTutorUserForPhone(normalized, contactName);

    return { success: true };
  } catch (err) {
    console.warn("[autoTagWhatsAppInterest] Error:", err);
    return { success: false, error: String(err) };
  }
}

/**
 * Ensures a User record with role TUTOR exists for the phone, with a TutorProfile,
 * so Dummy Lead Campaigns can target them seamlessly.
 */
export async function ensureTutorUserForPhone(phone: string, name?: string | null) {
  const digits10 = phone.slice(-10);
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { phone },
        { phone: digits10 },
        { phone: `+91${digits10}` },
      ],
    },
    include: { tutorProfile: true },
  });

  if (existingUser) {
    // If user already exists but doesn't have a tutorProfile, create one
    if (!existingUser.tutorProfile) {
      await prisma.tutorProfile.create({
        data: {
          userId: existingUser.id,
          city: "Delhi",
          address: "Delhi NCR",
          subjects: ["All Subjects", "Mathematics", "Science"],
          classLevels: ["Class 1–5", "Class 6–8", "Class 9–10"],
          isVerified: false,
          marketingNotifsEnabled: true,
        },
      }).catch(() => null);
    }
    return existingUser;
  }

  // Create lightweight User + TutorProfile for this interested WhatsApp contact
  const placeholderEmail = `wa.${digits10}@apnatutorhub.com`;
  const displayName = name || `Tutor ${digits10.slice(-4)}`;

  const newUser = await prisma.user.create({
    data: {
      name: displayName,
      email: placeholderEmail,
      phone: digits10,
      role: "TUTOR",
      isActive: true,
      signupSource: "WHATSAPP",
      tutorProfile: {
        create: {
          city: "Delhi",
          address: "Delhi NCR",
          subjects: ["All Subjects", "Mathematics", "Science"],
          classLevels: ["Class 1–5", "Class 6–8", "Class 9–10"],
          isVerified: false,
          marketingNotifsEnabled: true,
        },
      },
    },
    include: { tutorProfile: true },
  }).catch((err) => {
    // In case email collision
    console.warn(`[ensureTutorUserForPhone] Note for ${phone}:`, err?.message || err);
    return null;
  });

  return newUser;
}

/**
 * Scan all historical inbound WhatsApp messages and sync all 717 contacts.
 */
export async function autoSyncAllWhatsAppInterestedLeads() {
  const replies = await prisma.$queryRaw<Array<{ phone: string; body: string; contactName: string | null }>>`
    SELECT DISTINCT ON (phone) phone, body, "contactName"
    FROM whatsapp_chat_messages
    WHERE direction = 'INBOUND'
    ORDER BY phone, "createdAt" DESC
  `;

  // Default batch
  let batch = await prisma.staffLeadBatch.findFirst({
    where: { name: { contains: "WhatsApp", mode: "insensitive" } },
    select: { id: true },
  });

  const admin = await prisma.user.findFirst({
    where: { role: "SUPER_ADMIN" },
    select: { id: true },
  });
  const adminId = admin?.id || "system";

  if (!batch) {
    batch = await prisma.staffLeadBatch.create({
      data: {
        name: "WhatsApp Live Chat Leads",
        rawText: "WhatsApp Inbound Interest Leads",
        totalParsed: 0,
        totalJunk: 0,
        createdById: adminId,
      },
      select: { id: true },
    }).catch(() => null);
  }

  // Pre-fetch existing StaffLead phones
  const existingLeads = await prisma.staffLead.findMany({
    select: { id: true, phone: true, whatsapp: true, status: true },
  });
  const existingPhoneMap = new Map<string, { id: string; status: string }>();
  existingLeads.forEach((l) => {
    if (l.phone) {
      existingPhoneMap.set(l.phone, { id: l.id, status: l.status });
      existingPhoneMap.set(l.phone.slice(-10), { id: l.id, status: l.status });
    }
    if (l.whatsapp) {
      existingPhoneMap.set(l.whatsapp, { id: l.id, status: l.status });
      existingPhoneMap.set(l.whatsapp.slice(-10), { id: l.id, status: l.status });
    }
  });

  let syncedCount = 0;
  let explicitCount = 0;
  const leadsToCreate: any[] = [];
  const leadsToUpdateIds: string[] = [];

  for (const r of replies) {
    const rawPhone = r.phone;
    const normalized = normalizeIndiaWhatsApp(rawPhone) || rawPhone.replace(/\D/g, "");
    if (!normalized || normalized.length < 10) continue;

    const digits10 = normalized.slice(-10);
    const existing = existingPhoneMap.get(normalized) || existingPhoneMap.get(digits10);
    const contactName = r.contactName || `Tutor ${digits10.slice(-4)}`;
    const note = `📱 WhatsApp Chat reply: "${(r.body || "").slice(0, 100)}"`;

    if (!existing) {
      leadsToCreate.push({
        batchId: batch?.id,
        name: contactName,
        phone: normalized,
        whatsapp: normalized,
        status: "INTERESTED" as const,
        staffNotes: note,
        createdById: adminId,
        lastContactedAt: new Date(),
        subjects: ["All Subjects", "Mathematics", "Science"],
        classes: ["Class 1–8", "Class 9–10"],
      });
      existingPhoneMap.set(normalized, { id: "new", status: "INTERESTED" });
      existingPhoneMap.set(digits10, { id: "new", status: "INTERESTED" });
      syncedCount++;
    } else if (existing.status !== "INTERESTED" && existing.status !== "CONVERTED") {
      leadsToUpdateIds.push(existing.id);
      syncedCount++;
    }

    if ((r.body || "").toLowerCase().includes("interested")) {
      explicitCount++;
    }
  }

  if (leadsToCreate.length > 0) {
    await prisma.staffLead.createMany({
      data: leadsToCreate,
      skipDuplicates: true,
    });
  }

  if (leadsToUpdateIds.length > 0) {
    await prisma.staffLead.updateMany({
      where: { id: { in: leadsToUpdateIds } },
      data: { status: "INTERESTED", lastContactedAt: new Date() },
    });
  }

  const totalInDb = await prisma.staffLead.count({
    where: { status: "INTERESTED" },
  });

  return {
    syncedCount,
    explicitCount,
    totalInterestedInDb: totalInDb,
  };
}
