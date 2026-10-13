import { prisma } from "../lib/prisma";
import { normalizeIndiaWhatsApp } from "../lib/aqua-whatsapp";

async function fastSyncAll717() {
  console.log("=== Fast Bulk Sync for All 717 WhatsApp Inbound Contacts ===");

  // 1. Get all unique inbound WhatsApp senders
  const allSenders = await prisma.$queryRaw<Array<{ phone: string; body: string; contactName: string | null }>>`
    SELECT DISTINCT ON (phone) phone, body, "contactName"
    FROM whatsapp_chat_messages
    WHERE direction = 'INBOUND'
    ORDER BY phone, "createdAt" DESC
  `;

  console.log(`Found ${allSenders.length} unique inbound senders in whatsapp_chat_messages`);

  // 2. Ensure default batch exists
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
    });
  }

  // 3. Find existing StaffLead phones
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

  // 4. Find existing User phones
  const existingUsers = await prisma.user.findMany({
    select: { id: true, phone: true },
  });
  const existingUserPhoneSet = new Set<string>();
  existingUsers.forEach((u) => {
    if (u.phone) {
      existingUserPhoneSet.add(u.phone);
      existingUserPhoneSet.add(u.phone.slice(-10));
    }
  });

  let createdLeadCount = 0;
  let updatedLeadCount = 0;
  let createdUserCount = 0;

  const leadsToCreate: any[] = [];
  const leadsToUpdateIds: string[] = [];
  const usersToCreate: any[] = [];

  for (const s of allSenders) {
    const rawPhone = s.phone;
    const normalized = normalizeIndiaWhatsApp(rawPhone) || rawPhone.replace(/\D/g, "");
    if (!normalized || normalized.length < 10) continue;

    const digits10 = normalized.slice(-10);
    const existing = existingPhoneMap.get(normalized) || existingPhoneMap.get(digits10);

    const contactName = s.contactName || `Tutor ${digits10.slice(-4)}`;
    const note = `📱 WhatsApp Chat contact: "${(s.body || "").slice(0, 100)}"`;

    if (!existing) {
      leadsToCreate.push({
        batchId: batch.id,
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
      createdLeadCount++;
    } else if (existing.status !== "INTERESTED" && existing.status !== "CONVERTED") {
      leadsToUpdateIds.push(existing.id);
      updatedLeadCount++;
    }

    if (!existingUserPhoneSet.has(normalized) && !existingUserPhoneSet.has(digits10)) {
      usersToCreate.push({
        phone: digits10,
        name: contactName,
        email: `wa.${digits10}@apnatutorhub.com`,
        role: "TUTOR" as const,
        isActive: true,
        signupSource: "WHATSAPP",
      });
      existingUserPhoneSet.add(normalized);
      existingUserPhoneSet.add(digits10);
      createdUserCount++;
    }
  }

  // Bulk create leads
  if (leadsToCreate.length > 0) {
    console.log(`Bulk inserting ${leadsToCreate.length} new StaffLeads...`);
    await prisma.staffLead.createMany({
      data: leadsToCreate,
      skipDuplicates: true,
    });
  }

  // Bulk update existing leads to INTERESTED
  if (leadsToUpdateIds.length > 0) {
    console.log(`Updating ${leadsToUpdateIds.length} existing StaffLeads to INTERESTED...`);
    await prisma.staffLead.updateMany({
      where: { id: { in: leadsToUpdateIds } },
      data: { status: "INTERESTED", lastContactedAt: new Date() },
    });
  }

  // Create Users & TutorProfiles in chunks of 50
  if (usersToCreate.length > 0) {
    console.log(`Creating ${usersToCreate.length} User + TutorProfile records for campaign targeting...`);
    for (const u of usersToCreate) {
      try {
        await prisma.user.create({
          data: {
            ...u,
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
        });
      } catch {
        // ignore duplicate
      }
    }
  }

  const finalInterested = await prisma.staffLead.count({ where: { status: "INTERESTED" } });
  console.log({
    createdLeadCount,
    updatedLeadCount,
    createdUserCount,
    finalInterestedInDb: finalInterested,
  });
}

fastSyncAll717().catch(console.error).finally(() => prisma.$disconnect());
