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

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      parentProfile: true,
      tutorProfile: { include: { wallet: true } },
    },
  });

  if (!user) notFound();

  // Generate presigned view URLs for KYC documents if available
  const [idViewUrl, addressViewUrl, selfieViewUrl, introVideoViewUrl] = await Promise.all([
    resolveDocViewUrl(user.tutorProfile?.kycIdProofUrl ?? null),
    resolveDocViewUrl(user.tutorProfile?.kycAddressUrl ?? null),
    resolveDocViewUrl(user.tutorProfile?.kycSelfieUrl ?? null),
    resolveDocViewUrl(user.tutorProfile?.introVideoUrl ?? null),
  ]);

  return (
    <AdminEditUserForm
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        subAdminRole: user.subAdminRole,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
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
