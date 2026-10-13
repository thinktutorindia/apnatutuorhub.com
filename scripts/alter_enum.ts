import { prisma } from "../lib/prisma";

async function main() {
  try {
    await prisma.$executeRawUnsafe(`ALTER TYPE "DummyTargetGroup" ADD VALUE IF NOT EXISTS 'WHATSAPP_INTERESTED'`);
    console.log("SUCCESS: Added WHATSAPP_INTERESTED to DummyTargetGroup enum in Postgres!");
  } catch (e: any) {
    console.log("Info/Error:", e?.message || e);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
