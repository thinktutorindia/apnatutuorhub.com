import { prisma } from "../lib/prisma";

async function check() {
  const totalInbound = await prisma.whatsappChatMessage.count({ where: { direction: "INBOUND" } });
  const uniqueSenders: any = await prisma.$queryRaw`SELECT COUNT(DISTINCT phone) as cnt FROM whatsapp_chat_messages WHERE direction = 'INBOUND'`;
  const interestedStaffLeads = await prisma.staffLead.count({ where: { status: "INTERESTED" } });
  const totalStaffLeads = await prisma.staffLead.count();
  
  // Check batches
  const batches = await prisma.staffLeadBatch.findMany({
    select: { id: true, name: true, _count: { select: { leads: true } } }
  });

  // Check unique phones in staff_leads
  const uniqueStaffPhones: any = await prisma.$queryRaw`SELECT COUNT(DISTINCT phone) as cnt FROM staff_leads`;

  console.log({
    totalInbound,
    uniqueSenders: uniqueSenders[0]?.cnt,
    interestedStaffLeads,
    totalStaffLeads,
    uniqueStaffPhones: uniqueStaffPhones[0]?.cnt,
    batches
  });

  // Check sample messages
  const sampleInbound = await prisma.whatsAppChatMessage.findMany({
    where: { direction: "INBOUND" },
    select: { phone: true, body: true, contactName: true },
    take: 10,
    orderBy: { createdAt: "desc" }
  });
  console.log("Sample Inbound Messages:", sampleInbound);
}

check().catch(console.error).finally(() => prisma.$disconnect());
