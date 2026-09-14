import { prisma } from '../lib/prisma';

async function main() {
  // Check distribution of coinCost values
  const leads = await prisma.lead.findMany({
    where: { status: { in: ['ACTIVE', 'MATCHING', 'APPLICATIONS_RECEIVED'] } },
    select: {
      id: true,
      inquiryNumber: true,
      classLevel: true,
      budgetMin: true,
      budgetMax: true,
      coinCost: true,
      maxTutors: true,
    },
    take: 50,
    orderBy: { createdAt: 'desc' },
  });

  const grouped: Record<number, { count: number; examples: string[] }> = {};
  for (const l of leads) {
    const c = l.coinCost;
    if (!grouped[c]) grouped[c] = { count: 0, examples: [] };
    grouped[c].count++;
    if (grouped[c].examples.length < 2) {
      grouped[c].examples.push(`#${l.inquiryNumber} ${l.classLevel} budget:${l.budgetMin}-${l.budgetMax} maxTutors:${l.maxTutors}`);
    }
  }

  console.log('\n=== coinCost distribution (last 50 active leads) ===');
  for (const [cost, data] of Object.entries(grouped).sort((a,b) => Number(a[0]) - Number(b[0]))) {
    console.log(`  coinCost=${cost}: ${data.count} leads`);
    data.examples.forEach(e => console.log(`    → ${e}`));
  }

  // Also check maxTutors distribution
  const maxTutorsGroups: Record<number, number> = {};
  for (const l of leads) {
    maxTutorsGroups[l.maxTutors] = (maxTutorsGroups[l.maxTutors] || 0) + 1;
  }
  console.log('\n=== maxTutors distribution ===');
  for (const [mt, cnt] of Object.entries(maxTutorsGroups)) {
    console.log(`  maxTutors=${mt}: ${cnt} leads`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
