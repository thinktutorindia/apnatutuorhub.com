import { prisma } from "../lib/prisma";

async function verify() {
  const lalit = await prisma.user.findFirst({
    where: { phone: { contains: "8802111100" } },
    include: { tutorProfile: true, notifications: { take: 2, orderBy: { createdAt: "desc" } } }
  });

  const rihan = await prisma.user.findFirst({
    where: { phone: { contains: "9599689139" } },
    include: { tutorProfile: true, notifications: { take: 2, orderBy: { createdAt: "desc" } } }
  });

  console.log("=== LALIT VERIFICATION ===");
  console.log("Name:", lalit?.name, "| Phone:", lalit?.phone, "| Email:", lalit?.email);
  console.log("Tutor Profile:", {
    subjects: lalit?.tutorProfile?.subjects,
    classLevels: lalit?.tutorProfile?.classLevels,
    city: lalit?.tutorProfile?.city,
    address: lalit?.tutorProfile?.address,
    lat: lalit?.tutorProfile?.latitude,
    lng: lalit?.tutorProfile?.longitude,
    teachingRadius: lalit?.tutorProfile?.teachingRadius
  });
  console.log("Latest Notification:", lalit?.notifications[0]);

  console.log("\n=== RIHAN VERIFICATION ===");
  console.log("Name:", rihan?.name, "| Phone:", rihan?.phone, "| Email:", rihan?.email);
  console.log("Tutor Profile:", {
    subjects: rihan?.tutorProfile?.subjects,
    classLevels: rihan?.tutorProfile?.classLevels,
    city: rihan?.tutorProfile?.city,
    state: rihan?.tutorProfile?.state,
    address: rihan?.tutorProfile?.address,
    lat: rihan?.tutorProfile?.latitude,
    lng: rihan?.tutorProfile?.longitude,
    teachingRadius: rihan?.tutorProfile?.teachingRadius
  });
  console.log("Latest Notification:", rihan?.notifications[0]);
}

verify().finally(() => prisma.$disconnect());
