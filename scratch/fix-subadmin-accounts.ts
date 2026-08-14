import { prisma } from "../lib/prisma";

async function fixAccounts() {
  const subAdminUserId = "cmslksy4z0004k304jhlg3yu9"; // varshuverma77@gmail.com

  // Delete the mislinked accounts that do NOT belong to varshuverma77@gmail.com
  const deleted = await prisma.account.deleteMany({
    where: {
      userId: subAdminUserId,
      providerAccountId: {
        in: [
          "110225428369173666294", // rajoriyavarshu@gmail.com
          "102683792274066584489", // varsharani0598@gmail.com
          "115312128434251603220", // varsharajoriya31@gmail.com
        ],
      },
    },
  });

  console.log(`Successfully removed ${deleted.count} mislinked Google OAuth accounts from Sub-Admin user!`);

  // Verify remaining accounts for sub-admin user
  const remaining = await prisma.account.findMany({
    where: { userId: subAdminUserId },
    select: { providerAccountId: true },
  });
  console.log("Remaining accounts for Sub-Admin user:", remaining);
}

fixAccounts()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
