import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
import { prisma } from '../lib/prisma';

async function backfill() {
  const admin = (await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } })) || (await prisma.user.findFirst());
  if (!admin) return;

  const logs = [
    {
      adminId: admin.id,
      action: 'SEND_TEST_WHATSAPP',
      entityType: 'WhatsApp',
      details: 'Sent WhatsApp template (information2) to 919311459543 (id wamid.HBgMOTE5MzExNDU5NTQzFQIAERgSRkJGODYyMTAyMDFCMUU4NzBFAA==)',
      createdAt: new Date('2026-09-14T23:58:32+05:30'),
    },
    {
      adminId: admin.id,
      action: 'SEND_TEST_WHATSAPP',
      entityType: 'WhatsApp',
      details: 'Sent WhatsApp template (information2) to 919311459543 (id wamid.HBgMOTE5MzExNDU5NTQzFQIAERgSRDdGMzQyQkM4QTYzODFENjAzAA==)',
      createdAt: new Date('2026-09-14T23:44:15+05:30'),
    },
    {
      adminId: admin.id,
      action: 'SEND_TEST_WHATSAPP',
      entityType: 'WhatsApp',
      details: 'Sent WhatsApp template (information2) to 919311459543 (id wamid.HBgMOTE5MzExNDU5NTQzFQIAERgSMDM0NDc0MjU0MTQ4NTU4QzIyAA==)',
      createdAt: new Date('2026-09-14T23:33:06+05:30'),
    },
  ];

  for (const log of logs) {
    const exists = await prisma.auditLog.findFirst({ where: { details: log.details } });
    if (!exists) {
      await prisma.auditLog.create({ data: log });
    }
  }

  console.log('WhatsApp audit logs logged in database.');
}

backfill().catch(console.error).finally(() => prisma.$disconnect());
