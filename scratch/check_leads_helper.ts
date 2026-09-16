import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });
import { prisma } from "../lib/prisma";

async function check() {
  const count = await prisma.lead.count({
    where: { status: { in: ['ACTIVE', 'MATCHING', 'APPLICATIONS_RECEIVED'] } }
  });
  console.log(`Total active leads in DB: ${count}`);

  const delhiLeads = await prisma.lead.findMany({
    where: {
      status: { in: ['ACTIVE', 'MATCHING', 'APPLICATIONS_RECEIVED'] },
    },
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: {
      inquiryNumber: true,
      classLevel: true,
      subjects: true,
      area: true,
      city: true,
      budgetMin: true,
      budgetMax: true,
      mode: true,
    }
  });
  console.log('Recent 5 leads:', delhiLeads);
}

check().catch(console.error);
