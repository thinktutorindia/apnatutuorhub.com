import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { prisma } from '../lib/prisma';

async function main() {
  const tutor1 = await prisma.user.findFirst({
    where: {
      OR: [
        { phone: '8802111100' },
        { phone: '918802111100' },
        { phone: { contains: '8802111100' } },
      ],
    },
    include: { tutorProfile: true },
  });

  const tutor2 = await prisma.user.findFirst({
    where: {
      OR: [
        { phone: '9599689139' },
        { phone: '919599689139' },
        { phone: { contains: '9599689139' } },
      ],
    },
    include: { tutorProfile: true },
  });

  console.log('=== TUTOR 1 (8802111100) ===');
  if (tutor1) {
    console.log({
      id: tutor1.id,
      name: tutor1.name,
      phone: tutor1.phone,
      email: tutor1.email,
      role: tutor1.role,
      city: tutor1.tutorProfile?.city,
      address: tutor1.tutorProfile?.address,
      lat: tutor1.tutorProfile?.latitude,
      lng: tutor1.tutorProfile?.longitude,
      classLevels: tutor1.tutorProfile?.classLevels,
      subjects: tutor1.tutorProfile?.subjects,
    });
  } else {
    console.log('Tutor 8802111100 not found in User table.');
  }

  console.log('\n=== TUTOR 2 (9599689139) ===');
  if (tutor2) {
    console.log({
      id: tutor2.id,
      name: tutor2.name,
      phone: tutor2.phone,
      email: tutor2.email,
      role: tutor2.role,
      city: tutor2.tutorProfile?.city,
      address: tutor2.tutorProfile?.address,
      lat: tutor2.tutorProfile?.latitude,
      lng: tutor2.tutorProfile?.longitude,
      classLevels: tutor2.tutorProfile?.classLevels,
      subjects: tutor2.tutorProfile?.subjects,
    });
  } else {
    console.log('Tutor 9599689139 not found.');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
