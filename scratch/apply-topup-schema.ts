import { prisma } from "../lib/prisma";

async function main() {
  console.log("Applying schema migration: adding canTopup and isOldUser to tutor_profiles table...");

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "tutor_profiles" 
    ADD COLUMN IF NOT EXISTS "canTopup" BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS "isOldUser" BOOLEAN NOT NULL DEFAULT false;
  `);

  console.log("✓ Migration executed successfully!");
}

main().finally(() => prisma.$disconnect());
