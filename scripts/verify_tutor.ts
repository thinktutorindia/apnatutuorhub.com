import { PrismaClient, UserRole, KycStatus, TeachingMode } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "youhubteam@gmail.com";
  console.log(`Setting up 100% KYC Verified Tutor profile for: ${email}...`);

  const passwordHash = await bcrypt.hash("Tutor@123456", 12);

  // 1. Upsert User
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name: "YouHub Team",
      role: UserRole.TUTOR,
      isActive: true,
    },
    create: {
      email,
      name: "YouHub Team",
      passwordHash,
      role: UserRole.TUTOR,
      isActive: true,
    },
  });

  console.log(`User ID: ${user.id}`);

  // 2. Upsert 100% Complete & Approved Tutor Profile
  const tutorProfile = await prisma.tutorProfile.upsert({
    where: { userId: user.id },
    update: {
      bio: "Professional tutor with 5+ years of experience specializing in Mathematics, Physics, Chemistry, and Computer Science. I focus on conceptual clarity, problem-solving techniques, and exam preparation for CBSE, ICSE, and competitive exams.",
      qualification: "M.Sc Mathematics / B.Tech Computer Science",
      experience: 5,
      subjects: ["Mathematics", "Physics", "Chemistry", "Computer Science", "English"],
      classLevels: ["Class 6-8", "Class 9-10", "Class 11-12", "JEE"],
      teachingMode: TeachingMode.EITHER,
      teachingRadius: 15,
      feeMin: 300,
      feeMax: 800,
      city: "New Delhi",
      state: "Delhi",
      pincode: "110080",
      address: "Sangam Vihar, New Delhi",
      latitude: 28.5085,
      longitude: 77.2435,
      introVideoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      profileScore: 100,
      isVerified: true,
      isFeatured: true,
      kycStatus: KycStatus.APPROVED,
      kycIdProofUrl: "https://s3.amazonaws.com/apnatutorhub/id-proof.jpg",
      kycAddressUrl: "https://s3.amazonaws.com/apnatutorhub/address-proof.jpg",
      kycSelfieUrl: "https://s3.amazonaws.com/apnatutorhub/selfie.jpg",
      kycRejectionNote: null,
    },
    create: {
      userId: user.id,
      bio: "Professional tutor with 5+ years of experience specializing in Mathematics, Physics, Chemistry, and Computer Science. I focus on conceptual clarity, problem-solving techniques, and exam preparation for CBSE, ICSE, and competitive exams.",
      qualification: "M.Sc Mathematics / B.Tech Computer Science",
      experience: 5,
      subjects: ["Mathematics", "Physics", "Chemistry", "Computer Science", "English"],
      classLevels: ["Class 6-8", "Class 9-10", "Class 11-12", "JEE"],
      teachingMode: TeachingMode.EITHER,
      teachingRadius: 15,
      feeMin: 300,
      feeMax: 800,
      city: "New Delhi",
      state: "Delhi",
      pincode: "110080",
      address: "Sangam Vihar, New Delhi",
      latitude: 28.5085,
      longitude: 77.2435,
      introVideoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      profileScore: 100,
      isVerified: true,
      isFeatured: true,
      kycStatus: KycStatus.APPROVED,
      kycIdProofUrl: "https://s3.amazonaws.com/apnatutorhub/id-proof.jpg",
      kycAddressUrl: "https://s3.amazonaws.com/apnatutorhub/address-proof.jpg",
      kycSelfieUrl: "https://s3.amazonaws.com/apnatutorhub/selfie.jpg",
    },
  });

  console.log(`Tutor Profile ID: ${tutorProfile.id}`);

  // 3. Upsert Wallet with 100 Coins
  const wallet = await prisma.wallet.upsert({
    where: { tutorProfileId: tutorProfile.id },
    update: { balance: 100, totalPurchased: 100 },
    create: {
      tutorProfileId: tutorProfile.id,
      balance: 100,
      totalPurchased: 100,
    },
  });

  console.log(`Wallet Balance: ${wallet.balance} coins`);
  console.log("\n✅ 100% KYC Approved & Complete Tutor Profile set successfully!");
  console.log(`Email: ${email}`);
}

main()
  .catch((e) => {
    console.error("Error setting tutor KYC:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
