import { prisma } from "../lib/prisma";

async function main() {
  const allSenders = await prisma.$queryRaw<Array<{ phone: string; body: string; contactName: string | null }>>`
    SELECT DISTINCT ON (phone) phone, body, "contactName"
    FROM whatsapp_chat_messages
    WHERE direction = 'INBOUND'
    ORDER BY phone, "createdAt" DESC
  `;

  console.log("Total unique inbound senders in whatsapp_chat_messages:", allSenders.length);

  // Check how many have StaffLead already
  const phones = allSenders.map(s => s.phone);
  const existingStaff = await prisma.staffLead.findMany({
    where: {
      OR: [
        { phone: { in: phones } },
        { whatsapp: { in: phones } },
      ]
    },
    select: { phone: true, whatsapp: true, status: true }
  });

  console.log("Existing in staff_leads:", existingStaff.length);
  const statusCounts: Record<string, number> = {};
  existingStaff.forEach(s => {
    statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
  });
  console.log("Status counts:", statusCounts);
}

main().catch(console.error).finally(() => prisma.$disconnect());
