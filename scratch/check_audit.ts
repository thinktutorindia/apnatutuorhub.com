import { prisma } from '../lib/prisma';

async function checkAudit() {
  const logs = await prisma.auditLog.findMany({
    where: {
      OR: [
        { entityId: 'cmszo3qwg0006jm04padysd7x' },
        { entityId: 'cmsko7rbb000b15mgc9s0nkq4' },
        { details: { contains: 'zhaniesupport' } },
        { details: { contains: 'youhubteam' } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  console.log(`Found ${logs.length} audit logs:`);
  for (const l of logs) {
    console.log(`[${l.createdAt.toISOString()}] ${l.action} (${l.entityType} ${l.entityId}): ${l.details}`);
  }
}

checkAudit().catch(console.error).finally(() => prisma.$disconnect());
