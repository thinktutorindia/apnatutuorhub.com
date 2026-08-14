import { prisma } from "../lib/prisma";

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      subAdminRole: true,
      accounts: {
        select: {
          provider: true,
          providerAccountId: true,
        },
      },
    },
  });
  console.log("=== USER DATABASE RECORD DUMP ===");
  console.log(JSON.stringify(users, null, 2));
}

main().finally(() => prisma.$disconnect());
