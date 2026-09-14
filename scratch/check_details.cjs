const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDetails() {
  const mitaliId = 'cmt6x8nam0001l104lm6oejk1';
  const audits = await prisma.auditLog.findMany({ where: { adminId: mitaliId, action: 'CREATE_USER' } });
  console.log('Sample audit details:');
  for (const a of audits.slice(0, 8)) {
    console.log(a.entityId, JSON.stringify(a.details));
  }
}
checkDetails().catch(console.error).finally(() => prisma.$disconnect());
