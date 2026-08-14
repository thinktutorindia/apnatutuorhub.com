import { prisma } from "../lib/prisma";

async function verify() {
  const subAdminUser = await prisma.user.findUnique({
    where: { id: "cmslksy4z0004k304jhlg3yu9" },
    include: {
      accounts: true,
      userActivities: true,
    },
  });
  console.log("=== SUB_ADMIN USER INTEGRITY CHECK ===");
  console.log({
    id: subAdminUser?.id,
    name: subAdminUser?.name,
    email: subAdminUser?.email,
    role: subAdminUser?.role,
    subAdminRole: subAdminUser?.subAdminRole,
    phone: subAdminUser?.phone,
    accountsCount: subAdminUser?.accounts.length,
    activitiesCount: subAdminUser?.userActivities.length,
  });
}

verify().finally(() => prisma.$disconnect());
