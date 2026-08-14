import { prisma } from "../lib/prisma";

async function main() {
  const accounts = await prisma.account.findMany({
    where: { userId: "cmslksy4z0004k304jhlg3yu9" },
  });
  console.log("=== ACCOUNTS FOR VARSHA (SUB_ADMIN) ===");
  console.log(JSON.stringify(accounts, null, 2));
}

main().finally(() => prisma.$disconnect());
