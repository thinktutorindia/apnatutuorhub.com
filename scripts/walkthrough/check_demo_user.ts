import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  for (const email of [
    "tutor.demo@apnatutorhub.com",
    "parent.demo@apnatutorhub.com",
    "coderrohit2927@gmail.com",
  ]) {
    const u = await prisma.user.findUnique({ where: { email }, select: { email: true, role: true } });
    console.log(email, u ? u.role : "NOT IN DB");
  }
}
main().finally(() => prisma.$disconnect());
