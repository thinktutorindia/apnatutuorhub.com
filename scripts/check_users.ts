import { prisma } from "../lib/prisma";

async function main() {
  const usersByRole = await prisma.user.groupBy({
    by: ["role", "isActive"],
    _count: { id: true }
  });
  console.log("Users in DB by role:", usersByRole);
  
  const totalUsers = await prisma.user.count();
  console.log("Total users in DB:", totalUsers);

  const sampleUsers = await prisma.user.findMany({
    take: 10,
    select: { id: true, name: true, email: true, phone: true, role: true, isActive: true }
  });
  console.log("Sample Users:", sampleUsers);
}

main().catch(console.error).finally(() => prisma.$disconnect());
