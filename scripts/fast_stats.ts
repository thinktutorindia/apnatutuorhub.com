import { prisma } from "../lib/prisma";

async function main() {
  const allTutors = await prisma.user.count({ where: { role: "TUTOR", isActive: true } });
  console.log("Total Active Tutors in database:", allTutors);

  // Check how many of the 717 inbound WhatsApp senders match existing Users
  const inboundPhones = await prisma.$queryRaw<Array<{ phone: string }>>`
    SELECT DISTINCT phone FROM whatsapp_chat_messages WHERE direction = 'INBOUND'
  `;
  
  const phoneList = inboundPhones.map(p => p.phone);
  const phone10List = inboundPhones.map(p => p.phone.slice(-10));

  const matchedUsers = await prisma.user.findMany({
    where: {
      OR: [
        { phone: { in: phoneList } },
        { phone: { in: phone10List } }
      ]
    },
    select: { id: true, name: true, phone: true, role: true }
  });

  console.log("Inbound WhatsApp contacts matching User table:", matchedUsers.length);
  const tutors = matchedUsers.filter(u => u.role === "TUTOR");
  const parents = matchedUsers.filter(u => u.role === "PARENT");
  console.log("  - Tutors:", tutors.length);
  console.log("  - Parents:", parents.length);

  // Check how many match staff_leads
  const matchedStaffLeads = await prisma.staffLead.findMany({
    where: {
      OR: [
        { phone: { in: phoneList } },
        { phone: { in: phone10List } },
        { whatsapp: { in: phoneList } },
        { whatsapp: { in: phone10List } }
      ]
    },
    select: { id: true, name: true, status: true }
  });
  console.log("Inbound WhatsApp contacts matching StaffLead table:", matchedStaffLeads.length);
  const staffStatusMap: Record<string, number> = {};
  matchedStaffLeads.forEach(s => {
    staffStatusMap[s.status] = (staffStatusMap[s.status] || 0) + 1;
  });
  console.log("StaffLead Status breakdown for WhatsApp contacts:", staffStatusMap);
}

main().catch(console.error).finally(() => prisma.$disconnect());
