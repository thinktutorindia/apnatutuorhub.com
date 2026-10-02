import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
async function main() {
  const email = "tutor.demo@apnatutorhub.com";
  const u = await prisma.user.findUnique({ where: { email } });
  if (!u?.passwordHash) {
    console.log("no hash");
    return;
  }
  const ok = await bcrypt.compare("Rohit@2927", u.passwordHash);
  console.log("password matches Rohit@2927:", ok);
}
main().finally(() => prisma.$disconnect());
