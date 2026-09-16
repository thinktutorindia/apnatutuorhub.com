import { prisma } from "../lib/prisma";

async function clean() {
  await prisma.whatsappSession.deleteMany({ where: { phone: "919999999999" } });
  console.log("Cleaned test session.");
}

clean().finally(() => prisma.$disconnect());
