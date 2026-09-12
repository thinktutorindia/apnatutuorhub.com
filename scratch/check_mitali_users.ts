import { prisma } from '../lib/prisma';

async function main() {
  const mitaliId = 'cmt6x8nam0001l104lm6oejk1';
  const mitaliAudits = await prisma.auditLog.findMany({
    where: { adminId: mitaliId, action: 'CREATE_USER' }
  });
  const userIds = mitaliAudits.map(a => a.entityId).filter(Boolean) as string[];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true, role: true, phone: true }
  });
  const roleCounts: Record<string, number> = {};
  users.forEach(u => roleCounts[u.role] = (roleCounts[u.role] || 0) + 1);
  console.log('Mitali Created Users Count:', users.length);
  console.log('Mitali Created Users Roles:', roleCounts);
}
main().catch(console.error);
