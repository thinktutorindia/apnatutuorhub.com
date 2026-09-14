const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkConvertedLeads() {
  const mitaliId = 'cmt6x8nam0001l104lm6oejk1';
  const leads = await prisma.staffLead.findMany({
    where: { assignedToId: mitaliId, OR: [{ status: 'CONVERTED' }, { isPromoted: true }] },
    orderBy: { updatedAt: 'desc' },
  });
  console.log('Total Converted/Promoted StaffLeads:', leads.length);
  leads.slice(0, 5).forEach((l, i) => {
    console.log(`${i+1}. Name: ${l.name} | Phone: ${l.phone} | Type: ${l.leadType} | Status: ${l.status} | Loc: ${l.location} | Sub: ${(l.subjects||[]).join(', ')}`);
  });
}
checkConvertedLeads().catch(console.error).finally(() => prisma.$disconnect());
