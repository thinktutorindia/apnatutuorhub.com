import { prisma } from "../lib/prisma";

async function main() {
  console.log("Setting isOldUser = false and canTopup = false for ALL tutors in database...");

  const result = await prisma.tutorProfile.updateMany({
    data: {
      isOldUser: false,
      canTopup: false,
    },
  });

  console.log(`✓ Successfully updated ${result.count} tutors to isOldUser=false and canTopup=false!`);
}

main().finally(() => prisma.$disconnect());
