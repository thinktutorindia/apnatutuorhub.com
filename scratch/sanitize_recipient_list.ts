import { prisma } from '../lib/prisma';

async function main() {
  const tutors = await prisma.user.findMany({
    where: { role: 'TUTOR', isActive: true },
    select: { id: true, name: true, email: true }
  });

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  const clean: { id: string; name: string; email: string }[] = [];
  const rejected: { id: string; name: string; email: string; reason: string }[] = [];

  const typoDomains: Record<string, string> = {
    'gamil.com': 'gmail.com',
    'gmil.com': 'gmail.com',
    'gimale.com': 'gmail.com',
    'gmwil.com': 'gmail.com',
    'gmailo.com': 'gmail.com',
    'gmail.co': 'gmail.com',
  };

  for (const t of tutors) {
    let email = t.email.trim().toLowerCase();

    // Check internal
    if (email.endsWith('@apnatutorhub.com') || email.endsWith('@athmail.test') || email.includes('example.com') || email.includes('test.com')) {
      rejected.push({ id: t.id, name: t.name || '', email, reason: 'Internal/test account' });
      continue;
    }

    if (!emailRegex.test(email)) {
      rejected.push({ id: t.id, name: t.name || '', email, reason: 'Invalid regex syntax' });
      continue;
    }

    // Fix obvious common typos if applicable or inspect
    const [localPart, domain] = email.split('@');
    if (domain === 'gmail.comdelh' || domain === 'ail.com') {
      rejected.push({ id: t.id, name: t.name || '', email, reason: `Suspicious/broken domain: ${domain}` });
      continue;
    }

    if (typoDomains[domain]) {
      const fixed = `${localPart}@${typoDomains[domain]}`;
      console.log(`Auto-correcting typo: ${email} -> ${fixed}`);
      email = fixed;
    }

    clean.push({ id: t.id, name: t.name || 'Tutor', email });
  }

  // Deduplicate by clean email
  const uniqueMap = new Map<string, { id: string; name: string; email: string }>();
  for (const c of clean) {
    if (!uniqueMap.has(c.email)) {
      uniqueMap.set(c.email, c);
    }
  }

  const finalRecipients = Array.from(uniqueMap.values());

  console.log('\n--- AUDIT RESULTS ---');
  console.log(`Total Active Tutors: ${tutors.length}`);
  console.log(`Rejected Count: ${rejected.length}`);
  console.log(`Clean Unique Deliverable Recipients: ${finalRecipients.length}`);
  console.log('\nRejected List:');
  console.log(JSON.stringify(rejected, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
