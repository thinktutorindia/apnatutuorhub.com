import { prisma } from "../lib/prisma";

async function main() {
  const batchLeads = await prisma.lead.findMany({
    where: {
      OR: [
        { notes: { contains: "Contact:" } },
        { notes: { contains: "[Batch:" } },
        { notes: { contains: "[Source:" } },
        { notes: { contains: "+91" } },
      ],
    },
    select: {
      id: true,
      inquiryNumber: true,
      notes: true,
    },
    take: 10,
  });

  const totalCount = await prisma.lead.count({
    where: {
      OR: [
        { notes: { contains: "Contact:" } },
        { notes: { contains: "[Batch:" } },
        { notes: { contains: "[Source:" } },
        { notes: { contains: "+91" } },
      ],
    },
  });

  console.log("Total leads with phone/batch info in notes:", totalCount);
  for (const l of batchLeads) {
    console.log(`- Lead ${l.inquiryNumber}: "${l.notes}"`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
