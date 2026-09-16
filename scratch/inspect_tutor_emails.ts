import { prisma } from '../lib/prisma';

async function main() {
  const tutors = await prisma.user.findMany({
    where: { role: 'TUTOR' },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      isActive: true,
      tutorProfile: {
        select: {
          id: true,
          city: true,
          state: true,
          teachingMode: true,
          subjects: true,
          classLevels: true,
          latitude: true,
          longitude: true,
        }
      }
    }
  });

  console.log('Total TUTOR Users:', tutors.length);

  const testEmails = tutors.filter(t => t.email.includes('@apnatutorhub.com') || t.email.includes('@athmail.test') || t.email.includes('example.com') || t.email.includes('test.com'));
  const genuineEmails = tutors.filter(t => !testEmails.includes(t));

  console.log('Test/Internal emails:', testEmails.length);
  console.log('Genuine/Real tutor emails:', genuineEmails.length);

  // Domains of genuine emails
  const domains: Record<string, number> = {};
  for (const t of genuineEmails) {
    const domain = t.email.split('@')[1]?.toLowerCase() || 'unknown';
    domains[domain] = (domains[domain] || 0) + 1;
  }
  console.log('Genuine email domain counts:', JSON.stringify(domains, null, 2));

  // Teaching modes of genuine tutors
  const modes: Record<string, number> = {};
  for (const t of genuineEmails) {
    const mode = t.tutorProfile?.teachingMode || 'NO_PROFILE';
    modes[mode] = (modes[mode] || 0) + 1;
  }
  console.log('Genuine tutors teachingMode:', modes);
}

main().catch(console.error).finally(() => prisma.$disconnect());
