import { prisma } from "../lib/prisma";

async function main() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { phone: { contains: "9311459" } },
        { name: { contains: "Rohit", mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, phone: true, role: true },
    take: 20,
  });
  console.log("users", users);

  const staff = await prisma.staffLead.findMany({
    where: {
      OR: [
        { phone: { contains: "9311459" } },
        { whatsapp: { contains: "9311459" } },
        { name: { contains: "Rohit", mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, phone: true, whatsapp: true, status: true },
    take: 20,
  });
  console.log("staff", staff);
}

main().finally(() => prisma.$disconnect());
