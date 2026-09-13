import { prisma } from "../lib/prisma";

async function main() {
  const lead = await prisma.lead.findFirst({
    where: { inquiryNumber: 31604 },
    include: { parentProfile: { include: { user: true } } },
  });
  console.log("Inquiry Number:", lead?.inquiryNumber);
  console.log("Parent User Phone:", lead?.parentProfile?.user?.phone);
  console.log("Notes in Lead:", lead?.notes);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
