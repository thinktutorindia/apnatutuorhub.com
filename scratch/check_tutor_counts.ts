import { prisma } from '../lib/prisma';

async function main() {
  const totalTutors = await prisma.user.count({ where: { role: 'TUTOR' } });
  const totalProfiles = await prisma.tutorProfile.count();
  console.log('Total TUTOR Users:', totalTutors);
  console.log('Total TutorProfiles:', totalProfiles);

  const byMode = await prisma.tutorProfile.groupBy({
    by: ['teachingMode'],
    _count: { id: true }
  });
  console.log('TutorProfiles by teachingMode:', JSON.stringify(byMode, null, 2));

  const tutorsWithEmail = await prisma.user.findMany({
    where: {
      role: 'TUTOR',
      email: { not: '' }
    },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      tutorProfile: {
        select: {
          teachingMode: true,
          city: true,
          isVerified: true,
          marketingNotifsEnabled: true,
        }
      }
    }
  });

  console.log('Total Tutors with Email:', tutorsWithEmail.length);

  const onlineTutors = tutorsWithEmail.filter(t => t.tutorProfile?.teachingMode === 'ONLINE');
  const offlineTutors = tutorsWithEmail.filter(t => t.tutorProfile?.teachingMode === 'OFFLINE');
  const eitherTutors = tutorsWithEmail.filter(t => t.tutorProfile?.teachingMode === 'EITHER');
  const noProfile = tutorsWithEmail.filter(t => !t.tutorProfile);

  console.log(`ONLINE: ${onlineTutors.length}`);
  console.log(`OFFLINE: ${offlineTutors.length}`);
  console.log(`EITHER: ${eitherTutors.length}`);
  console.log(`No profile: ${noProfile.length}`);
  console.log(`Offline + Either (Local): ${offlineTutors.length + eitherTutors.length}`);
  console.log(`Local + Online total: ${offlineTutors.length + eitherTutors.length + onlineTutors.length + noProfile.length}`);

  // Let's also check StaffLead table or other tables if tutors are in there
  const staffLeadsCount = await prisma.staffLead.count();
  console.log('Total StaffLeads:', staffLeadsCount);
}

main().catch(console.error).finally(() => prisma.$disconnect());
