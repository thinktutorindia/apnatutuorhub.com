import { prisma } from '../lib/prisma';

async function main() {
  const tutors = await prisma.user.findMany({
    where: {
      role: 'TUTOR',
      isActive: true,
    },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      tutorProfile: {
        select: {
          city: true,
          state: true,
          teachingMode: true,
          isVerified: true,
        }
      }
    }
  });

  console.log('Total Active Tutors:', tutors.length);

  // Filter valid emails
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  const valid = [];
  const invalid = [];
  const internal = [];

  for (const t of tutors) {
    const email = t.email.trim().toLowerCase();
    if (!emailRegex.test(email)) {
      invalid.push({ id: t.id, name: t.name, email });
    } else if (email.endsWith('@apnatutorhub.com') || email.endsWith('@athmail.test')) {
      internal.push({ id: t.id, name: t.name, email });
    } else {
      valid.push({
        id: t.id,
        name: t.name || 'Tutor',
        email,
        phone: t.phone,
        mode: t.tutorProfile?.teachingMode || 'EITHER',
        city: t.tutorProfile?.city || 'Delhi',
      });
    }
  }

  console.log('Valid external tutor emails:', valid.length);
  console.log('Internal/system test emails:', internal.length);
  console.log('Invalid format emails:', invalid.length);

  if (invalid.length > 0) {
    console.log('Invalid samples:', invalid);
  }

  // Deduplicate by email
  const uniqueMap = new Map();
  for (const t of valid) {
    if (!uniqueMap.has(t.email)) {
      uniqueMap.set(t.email, t);
    }
  }
  const uniqueTutors = Array.from(uniqueMap.values());
  console.log('Unique valid recipient emails:', uniqueTutors.length);

  // Breakdown by mode
  const online = uniqueTutors.filter(t => t.mode === 'ONLINE');
  const offline = uniqueTutors.filter(t => t.mode === 'OFFLINE');
  const either = uniqueTutors.filter(t => t.mode === 'EITHER');
  console.log(`Modes among unique valid: Online=${online.length}, Offline=${offline.length}, Either=${either.length}`);
  console.log(`Local (Offline+Either): ${offline.length + either.length}, Online: ${online.length}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
