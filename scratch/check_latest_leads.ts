import { prisma } from '../lib/prisma';

async function main() {
  const count = await prisma.lead.count();
  const recentLeads = await prisma.lead.findMany({
    take: 8,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      inquiryNumber: true,
      classLevel: true,
      subjects: true,
      mode: true,
      area: true,
      city: true,
      budgetMin: true,
      budgetMax: true,
      tutorGenderPref: true,
      createdAt: true,
      notes: true
    }
  });
  console.log('Total leads:', count);
  console.log('Recent 8 leads:');
  console.log(JSON.stringify(recentLeads, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
