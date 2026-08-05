import { prisma } from "../lib/prisma";

async function main() {
  const email = "learnhaveli@gmail.com";

  const user = await prisma.user.findUnique({
    where: { email },
    include: { tutorProfile: true },
  });

  if (!user) {
    console.error(`User with email ${email} not found.`);
    return;
  }

  console.log(`Found user: ${user.name} (${user.id}), role: ${user.role}`);

  if (!user.tutorProfile) {
    console.log("No tutor profile found. Creating tutor profile...");
    const profile = await prisma.tutorProfile.create({
      data: {
        userId: user.id,
        isVerified: true,
        kycStatus: "APPROVED",
        kycIdProofUrl: "https://example.com/kyc/id-proof.pdf",
        kycAddressUrl: "https://example.com/kyc/address-proof.pdf",
        kycSelfieUrl: "https://example.com/kyc/selfie.jpg",
        bio: "Verified Senior Educator & Tutor",
        subjects: ["Mathematics", "Physics", "Chemistry"],
        classLevels: ["Class 9-10", "Class 11-12"],
        city: "Delhi",
        state: "Delhi",
      },
    });
    console.log("Tutor profile created & verified:", profile.id);
  } else {
    const updated = await prisma.tutorProfile.update({
      where: { userId: user.id },
      data: {
        isVerified: true,
        kycStatus: "APPROVED",
        kycIdProofUrl: user.tutorProfile.kycIdProofUrl ?? "https://example.com/kyc/id-proof.pdf",
        kycAddressUrl: user.tutorProfile.kycAddressUrl ?? "https://example.com/kyc/address-proof.pdf",
        kycSelfieUrl: user.tutorProfile.kycSelfieUrl ?? "https://example.com/kyc/selfie.jpg",
      },
    });
    console.log(`Successfully updated KYC for ${email} (Profile ID: ${updated.id}) to APPROVED and isVerified: true`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
