import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { prisma } from '../lib/prisma';
import { processMessage } from '../lib/whatsapp-bot/engine';
import { getOrCreateSession, resetSession } from '../lib/whatsapp-bot/session';

async function verifyAutoRegistration() {
  console.log('=== VERIFYING WHATSAPP BOT AUTO-REGISTRATION ===');

  const testPhone = '919950006342';
  const rawInputPhone = '9950006342';
  const testEmail = 'johijo@denipl.com';

  // 1. Clean up any existing test user first
  console.log('\n1. Cleaning up previous test data if any...');
  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { email: testEmail },
        { phone: testPhone },
        { phone: rawInputPhone },
      ],
    },
    include: { tutorProfile: true },
  });

  if (existing) {
    if (existing.tutorProfile) {
      await prisma.wallet.deleteMany({ where: { tutorProfileId: existing.tutorProfile.id } });
      await prisma.tutorProfile.delete({ where: { id: existing.tutorProfile.id } });
    }
    await prisma.user.delete({ where: { id: existing.id } });
    console.log('Deleted existing test user.');
  }

  // 2. Reset chatbot session
  await resetSession(testPhone);
  const session = await getOrCreateSession(testPhone);
  console.log('Session reset to WELCOME:', session.step);

  // 3. Process the exact tutor message from the screenshot
  console.log('\n2. Simulating Tutor message to chatbot engine...');
  const message = `My name is Rohit, phone ${rawInputPhone}, email ${testEmail}. I teach All Subjects for Class 8 in Sangam Vihar, Delhi.`;

  const result = await processMessage(session, message, { useAi: true });
  console.log('Bot Response nextStep:', result.nextStep);
  console.log('Bot Response userType:', result.userType);
  console.log('Extracted Data:', result.updatedData);

  // 4. Check if User was automatically created in the database
  console.log('\n3. Checking PostgreSQL database for User...');
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { phone: { contains: rawInputPhone } },
        { email: testEmail },
      ],
    },
    include: {
      tutorProfile: {
        include: {
          wallet: true,
        },
      },
    },
  });

  if (!user) {
    console.error('❌ FAILED: User was NOT found in database!');
    process.exit(1);
  }

  console.log('✅ User successfully created in database:');
  console.log({
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    tutorProfileId: user.tutorProfile?.id,
    city: user.tutorProfile?.city,
    address: user.tutorProfile?.address,
    subjects: user.tutorProfile?.subjects,
    classLevels: user.tutorProfile?.classLevels,
    walletBalance: user.tutorProfile?.wallet?.balance,
  });

  // 5. Test Admin User Directory query
  console.log('\n4. Testing query used by /admin/users?q=' + rawInputPhone + '...');
  const adminSearchResult = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: rawInputPhone, mode: 'insensitive' } },
        { name: { contains: rawInputPhone, mode: 'insensitive' } },
        { phone: { contains: rawInputPhone, mode: 'insensitive' } },
      ],
    },
  });

  console.log(`Found ${adminSearchResult.length} matching user(s) in Admin search:`);
  console.log(adminSearchResult.map(u => ({ id: u.id, name: u.name, phone: u.phone, email: u.email })));

  if (adminSearchResult.length > 0) {
    console.log('\n🎉 SUCCESS! Admin search will now instantly find this tutor!');
  } else {
    console.error('❌ Admin search query did not match phone!');
  }
}

verifyAutoRegistration()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
