import { prisma } from "../lib/prisma";

async function clean() {
  await prisma.whatsappSession.deleteMany({
    where: { phone: { in: ["919311459543", "919999000000", "simulator_user"] } }
  });
  console.log("Simulator test sessions cleaned.");
}

clean().finally(() => prisma.$disconnect());
