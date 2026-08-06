import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting DB User Sanitization...");

  const adminEmail = "coderrohit2927@gmail.com";
  const adminPassword = "Rohit@2927";

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  // Upsert target super admin user
  const superAdmin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: "Rohit Sharma",
      passwordHash: passwordHash,
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    },
    create: {
      email: adminEmail,
      name: "Rohit Sharma",
      passwordHash: passwordHash,
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    },
  });

  console.log(`SUPER_ADMIN User set: ${superAdmin.email} (ID: ${superAdmin.id})`);

  // Delete all other users except this super admin user
  const deleteResult = await prisma.user.deleteMany({
    where: {
      id: { not: superAdmin.id },
    },
  });

  console.log(`Successfully deleted ${deleteResult.count} other user(s).`);

  const remainingUsers = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, isActive: true },
  });

  console.log("\nRemaining Users in Database:");
  console.table(remainingUsers);

  console.log(`\n========================================`);
  console.log(`Super Admin Login Credentials:`);
  console.log(`Email:    ${adminEmail}`);
  console.log(`Password: ${adminPassword}`);
  console.log(`========================================\n`);
}

main()
  .catch((e) => {
    console.error("Error sanitizing database users:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
