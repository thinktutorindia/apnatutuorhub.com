const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const mitaliId = 'cmt6x8nam0001l104lm6oejk1';

  // 1. Audit logs by Mitali
  const audits = await prisma.auditLog.findMany({
    where: { adminId: mitaliId },
  });
  console.log('Total audit logs for Mitali:', audits.length);
  const actionCounts = {};
  audits.forEach(a => (actionCounts[a.action] = (actionCounts[a.action] || 0) + 1));
  console.log('Actions:', actionCounts);

  // 2. Users created by Mitali via CREATE_USER audit logs
  const userAudits = audits.filter(a => a.action === 'CREATE_USER');
  const userIds = userAudits.map(a => a.entityId).filter(Boolean);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    include: { tutorProfile: true, parentProfile: true },
  });
  console.log('Users created by Mitali (found in User table):', users.length);
  const roles = {};
  users.forEach(u => (roles[u.role] = (roles[u.role] || 0) + 1));
  console.log('User roles breakdown:', roles);

  // 3. StaffLeads assigned to Mitali
  const staffLeads = await prisma.staffLead.findMany({
    where: { assignedToId: mitaliId },
  });
  console.log('StaffLeads assigned to Mitali:', staffLeads.length);
  const leadStatuses = {};
  staffLeads.forEach(l => (leadStatuses[l.status] = (leadStatuses[l.status] || 0) + 1));
  console.log('StaffLead statuses:', leadStatuses);

  // 4. Any other records or leads created by Mitali
  const otherLeads = await prisma.lead.findMany({
    where: {
      OR: [
        { postedById: mitaliId },
        { staffNotes: { contains: 'Mitali', mode: 'insensitive' } },
      ],
    },
  });
  console.log('Primary leads posted by or mentioning Mitali:', otherLeads.length);

  // Let's print out the first 5 created users as sample
  console.log('\n--- Sample Users Created by Mitali ---');
  users.slice(0, 5).forEach((u, i) => {
    console.log(`${i + 1}. [${u.role}] Name: ${u.name}, Phone: ${u.phone}, Email: ${u.email}, City/Area: ${u.tutorProfile?.city || u.parentProfile?.city || ''} - ${u.tutorProfile?.area || ''}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
