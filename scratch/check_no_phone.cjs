const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkNoPhone() {
  const mitaliId = 'cmt6x8nam0001l104lm6oejk1';
  const audits = await prisma.auditLog.findMany({ where: { adminId: mitaliId, action: 'CREATE_USER' } });
  const ids = audits.map(a => a.entityId);
  const users = await prisma.user.findMany({
    where: { id: { in: ids }, OR: [{ phone: null }, { phone: '' }] },
    include: { tutorProfile: true }
  });
  console.log('Users without phone in user.phone:', users.length);
  for (const u of users) {
    // Check if phone is in email or staff leads
    const matchLead = await prisma.staffLead.findFirst({
      where: {
        OR: [
          { email: u.email },
          { name: { contains: u.name || 'xyz', mode: 'insensitive' } },
        ],
      },
    });
    console.log(u.name, '| email:', u.email, '| lead phone found:', matchLead?.phone || 'none');
  }
}
checkNoPhone().catch(console.error).finally(() => prisma.$disconnect());
