import { prisma } from '../lib/prisma';

async function main() {
  const disabled = await prisma.tutorProfile.count({
    where: { marketingNotifsEnabled: false }
  });
  console.log('Tutors with marketingNotifsEnabled = false:', disabled);
}

main().catch(console.error).finally(() => prisma.$disconnect());
