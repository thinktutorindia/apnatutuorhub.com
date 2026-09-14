import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { prisma } from '../lib/prisma';
import { getLeadPointCost } from '../lib/subscription-plans';

/**
 * Fixes all active leads:
 * 1. Sets coinCost according to the ₹999 Growth Plan fee-based formula
 *    - Budget < ₹3,000/mo  → 10 points (up to 6 leads per plan)
 *    - Budget ₹3k–₹5k/mo   → 20 points (up to 3 leads per plan)
 *    - Budget > ₹5k/mo     → 30 points (up to 2 leads per plan)
 * 2. Sets maxTutors = 3 (Growth Plan standard: Low Competition)
 */

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  console.log(`\n=== Fix Lead coinCost + maxTutors (DRY_RUN=${DRY_RUN}) ===\n`);

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
  });

  console.log(`Total active leads: ${leads.length}`);

  const updates: { id: string; oldCoin: number; newCoin: number; oldMax: number; newMax: number; label: string }[] = [];

  for (const lead of leads) {
    const correctCoin = getLeadPointCost(lead.classLevel, lead.budgetMin, lead.budgetMax);
    const correctMax = 3; // Growth Plan = max 3 tutors per lead

    if (lead.coinCost !== correctCoin || lead.maxTutors !== correctMax) {
      updates.push({
        id: lead.id,
        oldCoin: lead.coinCost,
        newCoin: correctCoin,
        oldMax: lead.maxTutors,
        newMax: correctMax,
        label: `#${lead.inquiryNumber} ${lead.classLevel} budget:${lead.budgetMin ?? '?'}-${lead.budgetMax ?? '?'}`,
      });
    }
  }

  console.log(`\nLeads needing update: ${updates.length}`);

  // Summary by new coin cost
  const summary: Record<number, number> = {};
  for (const u of updates) {
    summary[u.newCoin] = (summary[u.newCoin] || 0) + 1;
  }
  console.log('\nBreakdown by new coinCost:');
  for (const [cost, count] of Object.entries(summary).sort((a,b) => Number(a[0]) - Number(b[0]))) {
    const label = Number(cost) === 10
      ? '< ₹3,000/mo (up to 6 leads in plan)'
      : Number(cost) === 20
      ? '₹3k–₹5k/mo (up to 3 leads in plan)'
      : '> ₹5k/mo (up to 2 leads in plan)';
    console.log(`  coinCost=${cost} [${label}]: ${count} leads`);
  }

  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN — no changes written. Remove --dry-run to apply.\n');
    // Show first 10
    console.log('Sample updates:');
    updates.slice(0, 10).forEach(u => {
      console.log(`  ${u.label}`);
      console.log(`    coinCost: ${u.oldCoin} → ${u.newCoin}   maxTutors: ${u.oldMax} → ${u.newMax}`);
    });
    return;
  }

  // Batch update in chunks of 50
  const CHUNK = 50;
  let done = 0;
  for (let i = 0; i < updates.length; i += CHUNK) {
    const chunk = updates.slice(i, i + CHUNK);
    await prisma.$transaction(
      chunk.map(u =>
        prisma.lead.update({
          where: { id: u.id },
          data: { coinCost: u.newCoin, maxTutors: u.newMax },
        })
      )
    );
    done += chunk.length;
    process.stdout.write(`\r  Updated ${done}/${updates.length} leads...`);
  }

  console.log(`\n\n✅ Done. ${updates.length} leads updated.`);
  console.log(`   - All active leads now have maxTutors = 3 (Growth Plan standard)`);
  console.log(`   - coinCost set by fee bracket: 10 / 20 / 30 points\n`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
