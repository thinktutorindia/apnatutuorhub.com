import { prisma } from "../lib/prisma";

async function checkBatches() {
  const batches = await prisma.staffLeadBatch.findMany({
    select: { id: true, name: true, totalParsed: true, createdAt: true }
  });
  console.log("Existing Batches:", JSON.stringify(batches, null, 2));
  
  const sampleLeads = await prisma.staffLead.findMany({
    take: 5,
    select: { name: true, phone: true, location: true, subjects: true, status: true, isPromoted: true }
  });
  console.log("Sample existing staff leads:", JSON.stringify(sampleLeads, null, 2));

  await prisma.$disconnect();
}

checkBatches();
