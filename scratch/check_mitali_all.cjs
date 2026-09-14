const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const mitaliId = 'cmt6x8nam0001l104lm6oejk1';

  // Audit logs
  const allAudits = await prisma.auditLog.findMany({
    where: { adminId: mitaliId },
  });

  const createdUserIds = allAudits.filter(a => a.action === 'CREATE_USER').map(a => a.entityId).filter(Boolean);
  const editedUserIds = allAudits.filter(a => a.action.startsWith('EDIT_USER')).map(a => a.entityId).filter(Boolean);
  
  const allUserIds = Array.from(new Set([...createdUserIds, ...editedUserIds]));

  console.log('Created User IDs:', createdUserIds.length);
  console.log('Edited User IDs:', editedUserIds.length);
  console.log('Unique User IDs touched by Mitali:', allUserIds.length);

  const users = await prisma.user.findMany({
    where: { id: { in: allUserIds } },
    include: {
      tutorProfile: true,
      parentProfile: { include: { students: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log('Fetched users count:', users.length);
  
  // Also check Mitali's StaffLeads
  const staffLeads = await prisma.staffLead.findMany({
    where: { assignedToId: mitaliId },
    orderBy: { updatedAt: 'desc' },
  });
  console.log('Total StaffLeads for Mitali:', staffLeads.length);
  const convertedLeads = staffLeads.filter(l => l.status === 'CONVERTED' || l.isPromoted);
  console.log('Converted/Promoted StaffLeads:', convertedLeads.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());
