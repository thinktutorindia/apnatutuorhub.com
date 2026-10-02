import { PrismaClient, UserRole, KycStatus, TeachingMode, LeadStatus, WalletTransactionType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding test accounts for ApnaTutorHub video walkthroughs...");

  const defaultPassword = "Rohit@2927";
  const passwordHash = await bcrypt.hash(defaultPassword, 12);

  // 1. Verify / Update Admin Account
  const adminEmail = "coderrohit2927@gmail.com";
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash: passwordHash,
      role: UserRole.SUPER_ADMIN,
      isActive: true,
      name: "Rohit Sharma",
    },
    create: {
      email: adminEmail,
      name: "Rohit Sharma",
      passwordHash: passwordHash,
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    },
  });
  console.log(`[Admin] Verified: ${admin.email} (ID: ${admin.id}, Role: ${admin.role})`);

  // 2. Parent Test Account
  const parentEmail = "parent.demo@apnatutorhub.com";
  const parentPhone = "9876543210";
  const parent = await prisma.user.upsert({
    where: { email: parentEmail },
    update: {
      name: "Rajesh Sharma (Demo Parent)",
      passwordHash: passwordHash,
      phone: parentPhone,
      role: UserRole.PARENT,
      isActive: true,
    },
    create: {
      email: parentEmail,
      name: "Rajesh Sharma (Demo Parent)",
      passwordHash: passwordHash,
      phone: parentPhone,
      role: UserRole.PARENT,
      isActive: true,
    },
  });

  const parentProfile = await prisma.parentProfile.upsert({
    where: { userId: parent.id },
    update: {
      city: "Delhi",
      state: "Delhi",
      pincode: "110085",
      address: "Sector 13, Rohini, New Delhi",
    },
    create: {
      userId: parent.id,
      city: "Delhi",
      state: "Delhi",
      pincode: "110085",
      address: "Sector 13, Rohini, New Delhi",
    },
  });

  // Ensure a student profile exists for this parent
  let student = await prisma.studentProfile.findFirst({
    where: { parentProfileId: parentProfile.id },
  });
  if (!student) {
    student = await prisma.studentProfile.create({
      data: {
        parentProfileId: parentProfile.id,
        name: "Aarav Sharma",
        classLevel: "Class 10",
        board: "CBSE",
        subjects: ["Mathematics", "Science"],
        notes: "Needs conceptual clarity in Class 10 Math and Science.",
      },
    });
  }

  // Ensure an active demo lead posted by parent
  let parentLead = await prisma.lead.findFirst({
    where: { parentProfileId: parentProfile.id, status: LeadStatus.ACTIVE },
  });
  if (!parentLead) {
    const randomInquiry = Math.floor(100000 + Math.random() * 900000);
    parentLead = await prisma.lead.create({
      data: {
        inquiryNumber: randomInquiry,
        parentProfileId: parentProfile.id,
        studentProfileId: student.id,
        subjects: ["Mathematics", "Science"],
        classLevel: "Class 10",
        board: "CBSE",
        mode: TeachingMode.OFFLINE,
        budgetMin: 500,
        budgetMax: 700,
        city: "Delhi",
        area: "Rohini Sector 13",
        pincode: "110085",
        timingPreference: "4:00 PM - 6:00 PM (3 days/week)",
        tutorGenderPref: "ANY",
        languagePref: "English, Hindi",
        notes: "Need an experienced tutor for Class 10 CBSE Board exams preparation.",
        status: LeadStatus.ACTIVE,
        coinCost: 20,
        maxTutors: 4,
        purchaseCount: 0,
        radiusKm: 10,
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days later
      },
    });
  }
  console.log(`[Parent] Setup done: ${parent.email} | Student: ${student.name} | Lead: #${parentLead.inquiryNumber}`);

  // 3. Tutor Test Account (Verified with Coins for testing unlocks & search)
  const tutorEmail = "tutor.demo@apnatutorhub.com";
  const tutorPhone = "9876543211";
  const tutor = await prisma.user.upsert({
    where: { email: tutorEmail },
    update: {
      name: "Vikram Singh (Demo Tutor)",
      passwordHash: passwordHash,
      phone: tutorPhone,
      role: UserRole.TUTOR,
      isActive: true,
    },
    create: {
      email: tutorEmail,
      name: "Vikram Singh (Demo Tutor)",
      passwordHash: passwordHash,
      phone: tutorPhone,
      role: UserRole.TUTOR,
      isActive: true,
    },
  });

  const tutorProfile = await prisma.tutorProfile.upsert({
    where: { userId: tutor.id },
    update: {
      bio: "M.Sc. Mathematics with 7+ years of experience helping CBSE & ICSE students excel in board exams.",
      qualification: "M.Sc. Mathematics, B.Ed",
      experience: 7,
      subjects: ["Mathematics", "Physics"],
      classLevels: ["Class 9", "Class 10", "Class 11", "Class 12"],
      teachingMode: TeachingMode.EITHER,
      teachingRadius: 15,
      feeMin: 500,
      feeMax: 800,
      city: "Delhi",
      state: "Delhi",
      pincode: "110085",
      address: "Rohini, Delhi",
      averageRating: 4.9,
      totalReviews: 18,
      isVerified: true,
      kycStatus: KycStatus.APPROVED,
      onboardingStep: 7,
      canTopup: true,
    },
    create: {
      userId: tutor.id,
      bio: "M.Sc. Mathematics with 7+ years of experience helping CBSE & ICSE students excel in board exams.",
      qualification: "M.Sc. Mathematics, B.Ed",
      experience: 7,
      subjects: ["Mathematics", "Physics"],
      classLevels: ["Class 9", "Class 10", "Class 11", "Class 12"],
      teachingMode: TeachingMode.EITHER,
      teachingRadius: 15,
      feeMin: 500,
      feeMax: 800,
      city: "Delhi",
      state: "Delhi",
      pincode: "110085",
      address: "Rohini, Delhi",
      averageRating: 4.9,
      totalReviews: 18,
      isVerified: true,
      kycStatus: KycStatus.APPROVED,
      onboardingStep: 7,
      canTopup: true,
    },
  });

  // Ensure Wallet has 120 coins for testing lead unlocks
  const wallet = await prisma.wallet.upsert({
    where: { tutorProfileId: tutorProfile.id },
    update: {
      balance: 120,
      totalPurchased: 120,
    },
    create: {
      tutorProfileId: tutorProfile.id,
      balance: 120,
      totalPurchased: 120,
      totalSpent: 0,
    },
  });

  // Create initial wallet transaction record if none exists
  const existingTx = await prisma.walletTransaction.findFirst({
    where: { walletId: wallet.id },
  });
  if (!existingTx) {
    await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: WalletTransactionType.BONUS,
        amount: 120,
        balanceAfter: 120,
        description: "Welcome bonus test credits for walkthrough videos",
        referenceId: "WELCOME_DEMO_CREDITS",
      },
    });
  }
  console.log(`[Tutor Verified] Setup done: ${tutor.email} | Wallet Balance: ${wallet.balance} coins`);

  // 4. Tutor Test Account (Pending KYC for Admin Verification walkthrough)
  const pendingTutorEmail = "tutor.kyc@apnatutorhub.com";
  const pendingTutorPhone = "9876543212";
  const pendingTutor = await prisma.user.upsert({
    where: { email: pendingTutorEmail },
    update: {
      name: "Pooja Verma (Pending KYC Demo)",
      passwordHash: passwordHash,
      phone: pendingTutorPhone,
      role: UserRole.TUTOR,
      isActive: true,
    },
    create: {
      email: pendingTutorEmail,
      name: "Pooja Verma (Pending KYC Demo)",
      passwordHash: passwordHash,
      phone: pendingTutorPhone,
      role: UserRole.TUTOR,
      isActive: true,
    },
  });

  await prisma.tutorProfile.upsert({
    where: { userId: pendingTutor.id },
    update: {
      bio: "B.Tech Computer Science graduate passionate about teaching Class 6-10 Mathematics & Science.",
      qualification: "B.Tech Computer Science",
      experience: 3,
      subjects: ["Mathematics", "Science"],
      classLevels: ["Class 6", "Class 7", "Class 8", "Class 9", "Class 10"],
      teachingMode: TeachingMode.ONLINE,
      feeMin: 400,
      feeMax: 600,
      city: "Delhi",
      state: "Delhi",
      pincode: "110034",
      address: "Pitampura, New Delhi",
      isVerified: false,
      kycStatus: KycStatus.PENDING,
      kycIdProofUrl: "https://apnatutorhub.com/sample_aadhaar.pdf",
      kycAddressUrl: "https://apnatutorhub.com/sample_degree.pdf",
      onboardingStep: 6,
    },
    create: {
      userId: pendingTutor.id,
      bio: "B.Tech Computer Science graduate passionate about teaching Class 6-10 Mathematics & Science.",
      qualification: "B.Tech Computer Science",
      experience: 3,
      subjects: ["Mathematics", "Science"],
      classLevels: ["Class 6", "Class 7", "Class 8", "Class 9", "Class 10"],
      teachingMode: TeachingMode.ONLINE,
      feeMin: 400,
      feeMax: 600,
      city: "Delhi",
      state: "Delhi",
      pincode: "110034",
      address: "Pitampura, New Delhi",
      isVerified: false,
      kycStatus: KycStatus.PENDING,
      kycIdProofUrl: "https://apnatutorhub.com/sample_aadhaar.pdf",
      kycAddressUrl: "https://apnatutorhub.com/sample_degree.pdf",
      onboardingStep: 6,
    },
  });
  console.log(`[Tutor Pending KYC] Setup done: ${pendingTutor.email} (Status: PENDING)`);

  console.log("\n========================================================");
  console.log("All Test Accounts Ready for Video Walkthrough Recordings!");
  console.log("========================================================");
}

main()
  .catch((e) => {
    console.error("Error creating test accounts:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
