import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Adding pincode and address columns to tutor_profiles table...");

  await prisma.$executeRawUnsafe(
    `ALTER TABLE "tutor_profiles" ADD COLUMN IF NOT EXISTS "pincode" TEXT, ADD COLUMN IF NOT EXISTS "address" TEXT;`
  );

  console.log("Successfully added pincode and address columns to tutor_profiles table!");
}

main()
  .catch((e) => {
    console.error("Error altering table:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
