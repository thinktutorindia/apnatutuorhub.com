import { prisma } from '../lib/prisma';

async function checkUser() {
  const u = await prisma.user.findUnique({
    where: { email: 'youhubteam@gmail.com' },
    include: { tutorProfile: true }
  });
  console.log('User found:', u ? {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    tutorProfile: u.tutorProfile
  } : 'NOT FOUND');
}
checkUser().catch(console.error).finally(() => prisma.$disconnect());
