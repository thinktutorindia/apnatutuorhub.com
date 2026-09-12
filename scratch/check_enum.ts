import { prisma } from '../lib/prisma';

async function run() {
  const res: any = await prisma.$queryRawUnsafe(
    "SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE typname = 'SubscriptionPlan';"
  );
  console.log('SubscriptionPlan enum values:', res.map((r: any) => r.enumlabel));
}

run().catch(console.error).finally(() => prisma.$disconnect());
