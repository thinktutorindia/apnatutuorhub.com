import { prisma } from "../lib/prisma";

async function checkDb() {
  try {
    const userCount = await prisma.user.count();
    const tutorCount = await prisma.tutorProfile.count();
    const parentCount = await prisma.parentProfile.count();
    const leadCount = await prisma.lead.count();
    const staffLeadCount = await prisma.staffLead.count();
    const staffBatchCount = await prisma.staffLeadBatch.count();

    console.log("DATABASE COUNTS:");
    console.log(`- Users: ${userCount}`);
    console.log(`- Tutor Profiles: ${tutorCount}`);
    console.log(`- Parent Profiles: ${parentCount}`);
    console.log(`- Public Leads: ${leadCount}`);
    console.log(`- Staff Leads (Staging): ${staffLeadCount}`);
    console.log(`- Staff Batches: ${staffBatchCount}`);
  } catch (err) {
    console.error("Database check error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

checkDb();
