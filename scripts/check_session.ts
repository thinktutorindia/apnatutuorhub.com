import { prisma } from "../lib/prisma";

async function main() {
  for (const phone of ["919311459540", "919311459543"]) {
    const lastIn = await prisma.whatsappChatMessage.findFirst({
      where: { phone, direction: "INBOUND" },
      orderBy: { createdAt: "desc" },
    });
    const lastOut = await prisma.whatsappChatMessage.findFirst({
      where: { phone, direction: "OUTBOUND", step: "INTERESTED_BLAST" },
      orderBy: { createdAt: "desc" },
    });
    console.log(phone, {
      lastInbound: lastIn?.createdAt.toISOString(),
      lastBlast: lastOut?.createdAt.toISOString(),
      blastStatus: lastOut?.status,
      blastType: lastOut?.messageType,
    });
  }
}

main().finally(() => prisma.$disconnect());
