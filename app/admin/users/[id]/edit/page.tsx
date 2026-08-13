import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generatePresignedViewUrl } from "@/lib/s3";
import { AdminEditUserForm } from "@/components/admin/AdminEditUserForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit User & Documents — Admin" };

async function resolveDocViewUrl(url: string | null): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  try {
    return await generatePresignedViewUrl(url);
  } catch {
    return null;
  }
}

export default async function AdminEditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;

  const [user, rawNotes] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      include: {
        parentProfile: true,
        tutorProfile: { include: { wallet: true } },
      },
    }),
    (prisma as any).adminNote
      ? (prisma as any).adminNote
          .findMany({
            where: { targetUserId: id },
            orderBy: { createdAt: "desc" },
          })
          .catch(() => [])
      : Promise.resolve([]),
  ]);

  if (!user) notFound();

  // Generate presigned view URLs for KYC documents if available
  const [idViewUrl, addressViewUrl, selfieViewUrl, introVideoViewUrl] = await Promise.all([
    resolveDocViewUrl(user.tutorProfile?.kycIdProofUrl ?? null),
    resolveDocViewUrl(user.tutorProfile?.kycAddressUrl ?? null),
    resolveDocViewUrl(user.tutorProfile?.kycSelfieUrl ?? null),
    resolveDocViewUrl(user.tutorProfile?.introVideoUrl ?? null),
  ]);

  const adminNotes = Array.isArray(rawNotes)
    ? rawNotes.map((n: any) => ({
        id: n.id,
        authorName: n.authorName,
        content: n.content,
        createdAt: n.createdAt ? new Date(n.createdAt).toISOString() : new Date().toISOString(),
      }))
    : [];

  return (
    <AdminEditUserForm
      adminNotes={adminNotes}
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        subAdminRole: user.subAdminRole,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
        image: user.image ?? null,
        parentProfile: user.parentProfile
          ? {
              city: user.parentProfile.city,
              pincode: user.parentProfile.pincode,
              address: user.parentProfile.address ?? null,
              latitude: user.parentProfile.latitude ?? null,
              longitude: user.parentProfile.longitude ?? null,
            }
          : null,
        tutorProfile: user.tutorProfile
          ? {
              onboardingStep: user.tutorProfile.onboardingStep,
              gender: user.tutorProfile.gender,
              dateOfBirth: user.tutorProfile.dateOfBirth,
              maritalStatus: user.tutorProfile.maritalStatus,
              profession: user.tutorProfile.profession,
              qualification: user.tutorProfile.qualification,
              educationCourse: user.tutorProfile.educationCourse,
              educationSubjects: user.tutorProfile.educationSubjects,
              educationUniversity: user.tutorProfile.educationUniversity,
              educationYear: user.tutorProfile.educationYear,
              teachingStartYear: user.tutorProfile.teachingStartYear,
              interestedIn: user.tutorProfile.interestedIn,
              teachingMode: user.tutorProfile.teachingMode,
              teachingRadius: user.tutorProfile.teachingRadius,
              isVerified: user.tutorProfile.isVerified,
              isFeatured: user.tutorProfile.isFeatured,
              subscriptionPlan: user.tutorProfile.subscriptionPlan,
              city: user.tutorProfile.city,
              state: user.tutorProfile.state,
              pincode: user.tutorProfile.pincode,
              address: user.tutorProfile.address,
              latitude: user.tutorProfile.latitude,
              longitude: user.tutorProfile.longitude,
              kycStatus: user.tutorProfile.kycStatus,
              kycRejectionNote: user.tutorProfile.kycRejectionNote,
              kycIdProofUrl: user.tutorProfile.kycIdProofUrl,
              kycAddressUrl: user.tutorProfile.kycAddressUrl,
              kycSelfieUrl: user.tutorProfile.kycSelfieUrl,
              introVideoUrl: user.tutorProfile.introVideoUrl,
              subjects: user.tutorProfile.subjects,
              classLevels: user.tutorProfile.classLevels,
              experience: user.tutorProfile.experience,
              feeMin: user.tutorProfile.feeMin,
              feeMax: user.tutorProfile.feeMax,
              bio: user.tutorProfile.bio,
              wallet: user.tutorProfile.wallet
                ? { balance: user.tutorProfile.wallet.balance }
                : null,
            }
          : null,
      }}
      presignedUrls={{
        idViewUrl,
        addressViewUrl,
        selfieViewUrl,
        introVideoViewUrl,
      }}
    />
  );
}
