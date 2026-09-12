import { prisma } from '../lib/prisma';

async function check() {
  const tutors = await prisma.tutorProfile.findMany({
    where: {
      OR: [
        { user: { email: 'zhaniesupport@gmail.com' } },
        { user: { email: 'youhubteam@gmail.com' } },
        { updatedAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } }
      ]
    },
    include: { user: true }
  });

  console.log('Tutors found / recently updated:', tutors.length);
  for (const t of tutors) {
    console.log('\n=======================================');
    console.log('Email:', t.user.email);
    console.log('Name:', t.user.name);
    console.log('City:', t.city);
    console.log('Address:', t.address);
    console.log('Pincode:', t.pincode);
    console.log('Latitude:', t.latitude, 'Longitude:', t.longitude);
    console.log('Radius:', t.teachingRadius);
    console.log('Subjects:', t.subjects);
    console.log('ClassLevels:', t.classLevels);
    console.log('Mode:', t.teachingMode);
    console.log('UpdatedAt:', t.updatedAt.toISOString());
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
