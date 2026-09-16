import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { prisma } from '../lib/prisma';
import { processMessage } from '../lib/whatsapp-bot/engine';
import { getOrCreateSession, resetSession } from '../lib/whatsapp-bot/session';

async function verifyParentRegistration() {
  console.log('=== VERIFYING PARENT AUTO-REGISTRATION ===');

  const testPhone = '919876500001';
  const rawInputPhone = '9876500001';
  const testEmail = 'parent_test@gmail.com';

  // 1. Clean up previous test data if any
  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { email: testEmail },
        { phone: testPhone },
        { phone: rawInputPhone },
      ],
    },
    include: {
      parentProfile: {
        include: {
          leads: true,
          students: true,
        },
      },
    },
  });

  if (existing) {
    if (existing.parentProfile) {
      for (const l of existing.parentProfile.leads) {
        await prisma.lead.delete({ where: { id: l.id } });
      }
      for (const s of existing.parentProfile.students) {
        await prisma.studentProfile.delete({ where: { id: s.id } });
      }
      await prisma.parentProfile.delete({ where: { id: existing.parentProfile.id } });
    }
    await prisma.user.delete({ where: { id: existing.id } });
    console.log('Cleaned up previous test parent.');
  }

  // 2. Reset session & simulate parent message
  await resetSession(testPhone);
  const session = await getOrCreateSession(testPhone);

  const message = `Need home tutor for my child Aarav in Class 10 for Maths & Science in Dwarka Sector 6, Delhi. Budget 8000. Phone ${rawInputPhone}, email ${testEmail}`;
  const result = await processMessage(session, message, { useAi: true });
  console.log('Parent Bot Response nextStep:', result.nextStep);
  console.log('Parent Bot Response userType:', result.userType);

  // 3. Check Database
  const parentUser = await prisma.user.findFirst({
    where: {
      OR: [
        { phone: { contains: rawInputPhone } },
        { email: testEmail },
      ],
    },
    include: {
      parentProfile: {
        include: {
          students: true,
          leads: true,
        },
      },
    },
  });

  if (!parentUser) {
    console.error('❌ FAILED: Parent user was not created in database!');
    process.exit(1);
  }

  console.log('✅ Parent user created in database:');
  console.log({
    id: parentUser.id,
    name: parentUser.name,
    phone: parentUser.phone,
    email: parentUser.email,
    role: parentUser.role,
    students: parentUser.parentProfile?.students.map(s => ({ name: s.name, classLevel: s.classLevel })),
    leads: parentUser.parentProfile?.leads.map(l => ({ inquiryNumber: l.inquiryNumber, area: l.area, classLevel: l.classLevel, budgetMax: l.budgetMax })),
  });
  console.log('🎉 Parent auto-registration works perfectly!');
}

verifyParentRegistration()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
