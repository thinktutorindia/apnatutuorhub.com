/**
 * scripts/import_master_leads.ts
 *
 * Fast batch importer for the consolidated 26,457 master leads into Staff CRM (staff_leads).
 * Usage: npx tsx scripts/import_master_leads.ts
 */

import { prisma } from "../lib/prisma";
import fs from "fs";
import path from "path";

async function main() {
  const jsonPath = path.join(process.cwd(), "datauploadrawdata", "MASTER_CONSOLIDATED_ALL_LEADS.json");
  if (!fs.existsSync(jsonPath)) {
    console.error("File not found:", jsonPath);
    process.exit(1);
  }

  console.log("Reading consolidated master leads...");
  const rawContent = fs.readFileSync(jsonPath, "utf-8");
  const leads: Array<any> = JSON.parse(rawContent);

  console.log(`Loaded ${leads.length} master leads.`);

  // Find super admin or system user
  const admin = await prisma.user.findFirst({
    where: { role: "SUPER_ADMIN" },
    select: { id: true, name: true, email: true },
  });

  if (!admin) {
    console.error("No SUPER_ADMIN user found in database. Please ensure an admin exists.");
    process.exit(1);
  }

  console.log(`Using Super Admin: ${admin.name ?? admin.email} (${admin.id})`);

  // Create or reuse batch
  const batchName = `Master Consolidated Import (${leads.length} leads) - ${new Date().toLocaleDateString()}`;
  const batch = await prisma.staffLeadBatch.create({
    data: {
      name: batchName,
      rawText: `Master import of ${leads.length} consolidated leads from datauploadrawdata`,
      totalParsed: leads.length,
      createdById: admin.id,
    },
  });

  console.log(`Created Staff Lead Batch ID: ${batch.id}`);

  // Fetch existing phones in DB to prevent duplicates
  console.log("Checking existing phone numbers in database...");
  const existingStaff = await prisma.staffLead.findMany({
    where: { phone: { not: null } },
    select: { phone: true },
  });
  const existingUsers = await prisma.user.findMany({
    where: { phone: { not: null } },
    select: { phone: true },
  });

  const existingPhoneSet = new Set<string>();
  existingStaff.forEach((s) => s.phone && existingPhoneSet.add(s.phone));
  existingUsers.forEach((u) => u.phone && existingPhoneSet.add(u.phone));

  console.log(`Found ${existingPhoneSet.size} existing phone numbers in database.`);

  const toInsert: any[] = [];
  let duplicateCount = 0;

  for (const lead of leads) {
    const phone = lead.phone ? String(lead.phone).trim() : null;
    if (phone && existingPhoneSet.has(phone)) {
      duplicateCount++;
      continue;
    }
    if (phone) {
      existingPhoneSet.add(phone);
    }

    toInsert.push({
      batchId: batch.id,
      name: lead.name || null,
      phone: phone,
      altPhone: lead.altPhone ? String(lead.altPhone).trim() : null,
      whatsapp: phone,
      email: lead.email ? String(lead.email).toLowerCase().trim() : null,
      location: lead.location || null,
      pincode: lead.pincode || null,
      fullAddress: lead.fullAddress || null,
      subjects: Array.isArray(lead.subjects) ? lead.subjects : [],
      classes: Array.isArray(lead.classes) ? lead.classes : [],
      qualification: lead.qualification || null,
      experienceYears: typeof lead.experienceYears === "number" ? lead.experienceYears : null,
      gender: lead.gender || null,
      staffNotes: [lead.sourceCategory, lead.notes].filter(Boolean).join(" | "),
      status: "NEW",
      createdById: admin.id,
      rawText: JSON.stringify({
        sourceFile: lead.sourceFile,
        sourceCategory: lead.sourceCategory,
        notes: lead.notes,
      }),
    });
  }

  console.log(`\nReady to insert ${toInsert.length} new leads (${duplicateCount} existing duplicates skipped).`);

  // Insert in chunks of 1000
  const CHUNK_SIZE = 1000;
  let inserted = 0;

  for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
    const chunk = toInsert.slice(i, i + CHUNK_SIZE);
    await prisma.staffLead.createMany({
      data: chunk,
      skipDuplicates: true,
    });
    inserted += chunk.length;
    process.stdout.write(`\rProgress: ${inserted} / ${toInsert.length} leads inserted...`);
  }

  // Create batch progress tracking
  await prisma.staffLeadBatchProgress.upsert({
    where: { batchId: batch.id },
    create: {
      batchId: batch.id,
      totalLeads: inserted,
      leadsNew: inserted,
      leadsContacted: 0,
      leadsFollowUp: 0,
      leadsConverted: 0,
      leadsRejected: 0,
      leadsDone: 0,
    },
    update: {
      totalLeads: inserted,
      leadsNew: inserted,
    },
  });

  console.log(`\n\n🎉 SUCCESS! Inserted ${inserted} leads into Staff CRM under batch: "${batchName}"`);
  console.log(`Batch ID: ${batch.id}`);
}

main()
  .catch((err) => {
    console.error("Import error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
