import { prisma } from "../lib/prisma";

async function main() {
  console.log("Setting isOldUser = true and canTopup = true for all existing tutors in database...");

  const result = await prisma.tutorProfile.updateMany({
    data: {
      isOldUser: true,
      canTopup: true,
    },
  });

  console.log(`✓ Updated ${result.count} existing tutors to isOldUser=true and canTopup=true!`);
}

main().finally(() => prisma.$disconnect());
