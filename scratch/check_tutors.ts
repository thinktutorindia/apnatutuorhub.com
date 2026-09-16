import { prisma } from "../lib/prisma";

async function main() {
  const phones = ["8802111100", "9599689139"];
  
  for (const p of phones) {
    console.log(`\n================ Checking ${p} ================`);
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: p },
          { phone: `+91${p}` },
          { phone: `91${p}` },
          { phone: { contains: p } }
        ]
      },
      include: {
        tutorProfile: true
      }
    });

    if (!user) {
      console.log(`No user found matching phone ${p}`);
      // Check if tutorProfile has anything
    } else {
      console.log(`User found:`, {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      });
      console.log(`TutorProfile:`, user.tutorProfile ? {
        id: user.tutorProfile.id,
        city: user.tutorProfile.city,
        address: user.tutorProfile.address,
        latitude: user.tutorProfile.latitude,
        longitude: user.tutorProfile.longitude,
        subjects: user.tutorProfile.subjects,
        classLevels: user.tutorProfile.classLevels,
        teachingRadius: user.tutorProfile.teachingRadius,
        teachingMode: user.tutorProfile.teachingMode
      } : "No tutor profile");
    }
  }

  // Count leads in DB
  const leadCount = await prisma.lead.count();
  console.log(`\nTotal leads in DB: ${leadCount}`);

  // Count active leads
  const activeLeadCount = await prisma.lead.count({ where: { status: "ACTIVE" } });
  console.log(`Active leads in DB: ${activeLeadCount}`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
