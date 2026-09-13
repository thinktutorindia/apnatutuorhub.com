import { prisma } from "../lib/prisma";

async function main() {
  const lead = await prisma.lead.findFirst({
    where: {
      parentProfile: {
        user: { phone: { contains: "98914" } },
      },
    },
    include: { parentProfile: { include: { user: true } } },
  });

  console.log("Inquiry Number:", lead?.inquiryNumber);
  console.log("Lead Notes in DB:", lead?.notes);
  console.log("Parent User Phone (secure in profile):", lead?.parentProfile?.user?.phone);

  const anyLeaking = await prisma.lead.count({
    where: {
      OR: [
        { notes: { contains: "Contact:" } },
        { notes: { contains: "[Batch:" } },
        { notes: { contains: "[Source:" } },
        { notes: { contains: "RefId:" } },
      ],
    },
  });

  console.log("Total leads in DB with leaking contact/batch text:", anyLeaking);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
