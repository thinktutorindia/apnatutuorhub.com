import { prisma } from "../lib/prisma";

async function clean() {
  await prisma.whatsappSession.deleteMany({
    where: { phone: { in: ["919999000000", "simulator_user"] } }
  });
  console.log("Cleaned.");
}

clean().finally(() => prisma.$disconnect());
