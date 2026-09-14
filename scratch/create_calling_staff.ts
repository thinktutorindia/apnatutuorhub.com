import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  console.log("Creating 2 Calling Staff accounts with User Directory & Staff CRM access only...");

  const staffData = [
    {
      name: "Calling Staff 1",
      email: "caller1@apnatutorhub.com",
      phone: "+91 9800000001",
      plainPassword: "Caller@Edu2026!1",
      subAdminRole: "SUPPORT",
      customPermissions: ["users", "staff-leads"],
    },
    {
      name: "Calling Staff 2",
      email: "caller2@apnatutorhub.com",
      phone: "+91 9800000002",
      plainPassword: "Caller@Edu2026!2",
      subAdminRole: "SUPPORT",
      customPermissions: ["users", "staff-leads"],
    },
  ];

  for (const s of staffData) {
    const passwordHash = await bcrypt.hash(s.plainPassword, 10);

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email: s.email }, { phone: s.phone }],
      },
    });

    if (existing) {
      const updated = await prisma.user.update({
        where: { id: existing.id },
        data: {
          name: s.name,
          email: s.email,
          phone: s.phone,
          passwordHash,
          role: "SUB_ADMIN",
          subAdminRole: s.subAdminRole,
          customPermissions: s.customPermissions,
          isActive: true,
        },
      });
      console.log(`[UPDATED] ${s.name} (${s.email}) - ID: ${updated.id}`);
    } else {
      const created = await prisma.user.create({
        data: {
          name: s.name,
          email: s.email,
          phone: s.phone,
          passwordHash,
          role: "SUB_ADMIN",
          subAdminRole: s.subAdminRole,
          customPermissions: s.customPermissions,
          isActive: true,
        },
      });
      console.log(`[CREATED] ${s.name} (${s.email}) - ID: ${created.id}`);
    }
  }

  console.log("All 2 calling staff accounts have been set up successfully!");
}

main()
  .catch((err) => {
    console.error("Error creating staff:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
