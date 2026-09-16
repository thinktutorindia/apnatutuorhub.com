import { prisma } from "../lib/prisma";

async function main() {
  const rihan = await prisma.user.findFirst({
    where: { phone: { contains: "9599689139" } },
    include: { tutorProfile: true }
  });
  console.log("Rihan user:", rihan);

  const lalit = await prisma.user.findFirst({
    where: { phone: { contains: "8802111100" } },
    include: { tutorProfile: true }
  });
  console.log("Lalit user:", lalit);
}

main().catch(console.error).finally(() => prisma.$disconnect());
