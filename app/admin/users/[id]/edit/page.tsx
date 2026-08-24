import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveDocViewUrl } from "@/lib/s3";
import { AdminEditUserForm } from "@/components/admin/AdminEditUserForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit User & Documents — Admin" };

export default async function AdminEditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "SUB_ADMIN") {
    redirect("/admin");
  }

  const resolvedParams = await params;
  const id = resolvedParams?.id;
  if (!id) notFound();

  let user: any = null;
  try {
    user = await prisma.user.findUnique({
      where: { id },
      include: {
        parentProfile: {
          include: {
            students: {
              orderBy: { createdAt: "asc" },
            },
          },
        },
        tutorProfile: { include: { wallet: true } },
      },
    });
  } catch (err) {
    console.error("[AdminEditUserPage] DB Fetch Error:", err);
  }

  if (!user) notFound();

  // Safely resolve presigned view URLs for KYC documents & profile image
  let idViewUrl: string | null = null;
  let addressViewUrl: string | null = null;
  let selfieViewUrl: string | null = null;
  let introVideoViewUrl: string | null = null;
  let userImageViewUrl: string | null = null;

  try {
    const urls = await Promise.allSettled([
      resolveDocViewUrl(user.tutorProfile?.kycIdProofUrl ?? null),
      resolveDocViewUrl(user.tutorProfile?.kycAddressUrl ?? null),
      resolveDocViewUrl(user.tutorProfile?.kycSelfieUrl ?? null),
      resolveDocViewUrl(user.tutorProfile?.introVideoUrl ?? null),
      resolveDocViewUrl(user.image ?? null),
    ]);

    idViewUrl = urls[0].status === "fulfilled" ? urls[0].value : null;
    addressViewUrl = urls[1].status === "fulfilled" ? urls[1].value : null;
    selfieViewUrl = urls[2].status === "fulfilled" ? urls[2].value : null;
    introVideoViewUrl = urls[3].status === "fulfilled" ? urls[3].value : null;
    userImageViewUrl = urls[4].status === "fulfilled" ? urls[4].value : user.image;
  } catch (err) {
    console.warn("[AdminEditUserPage] View URL resolution error:", err);
    userImageViewUrl = user.image ?? null;
  }

  let adminNotes: any[] = [];
  try {
    if ((prisma as any).adminNote) {
      const rawNotes = await (prisma as any).adminNote.findMany({
        where: { targetUserId: id },
        orderBy: { createdAt: "desc" },
      });
      adminNotes = (rawNotes || []).map((n: any) => ({
        id: n.id,
        authorName: n.authorName || "Staff Member",
        content: n.content || "",
        createdAt: n.createdAt ? new Date(n.createdAt).toISOString() : new Date().toISOString(),
      }));
    }
  } catch (err) {
    console.warn("[AdminEditUserPage] Admin notes load warning:", err);
  }

  const isSuperAdmin = session.user.role === "SUPER_ADMIN";

  return (
    <AdminEditUserForm
      adminNotes={adminNotes}
      isSuperAdmin={isSuperAdmin}
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        subAdminRole: user.subAdminRole,
        isActive: user.isActive,
        createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : new Date().toISOString(),
        image: userImageViewUrl || user.image,
        parentProfile: user.parentProfile
          ? {
              city: user.parentProfile.city ?? null,
              state: user.parentProfile.state ?? null,
              pincode: user.parentProfile.pincode ?? null,
              address: user.parentProfile.address ?? null,
              latitude: user.parentProfile.latitude ?? null,
              longitude: user.parentProfile.longitude ?? null,
              students: (user.parentProfile.students || []).map((s: any) => ({
                id: s.id,
                name: s.name || "Child",
                classLevel: s.classLevel || "General",
                board: s.board || null,
                subjects: s.subjects || [],
                notes: s.notes || null,
                image: s.image || null,
              })),
            }
          : null,
        tutorProfile: user.tutorProfile
          ? {
              id: user.tutorProfile.id,
              onboardingStep: typeof user.tutorProfile.onboardingStep === "number" ? user.tutorProfile.onboardingStep : 7,
              gender: user.tutorProfile.gender ?? null,
              dateOfBirth: user.tutorProfile.dateOfBirth ?? null,
              maritalStatus: user.tutorProfile.maritalStatus ?? null,
              profession: user.tutorProfile.profession ?? null,
              qualification: user.tutorProfile.qualification ?? null,
              educationCourse: user.tutorProfile.educationCourse ?? null,
              educationSubjects: user.tutorProfile.educationSubjects ?? null,
              educationUniversity: user.tutorProfile.educationUniversity ?? null,
              educationYear: user.tutorProfile.educationYear ?? null,
              teachingStartYear: user.tutorProfile.teachingStartYear ?? null,
              interestedIn: user.tutorProfile.interestedIn || [],
              teachingMode: user.tutorProfile.teachingMode ?? "EITHER",
              teachingRadius: user.tutorProfile.teachingRadius ?? 10,
              isVerified: Boolean(user.tutorProfile.isVerified),
              isFeatured: Boolean(user.tutorProfile.isFeatured),
              subscriptionPlan: user.tutorProfile.subscriptionPlan ?? "NONE",
              city: user.tutorProfile.city ?? null,
              state: user.tutorProfile.state ?? null,
              pincode: user.tutorProfile.pincode ?? null,
              address: user.tutorProfile.address ?? null,
              latitude: user.tutorProfile.latitude ?? null,
              longitude: user.tutorProfile.longitude ?? null,
              kycStatus: user.tutorProfile.kycStatus ?? "NOT_SUBMITTED",
              kycRejectionNote: user.tutorProfile.kycRejectionNote ?? null,
              kycIdProofUrl: user.tutorProfile.kycIdProofUrl ?? null,
              kycAddressUrl: user.tutorProfile.kycAddressUrl ?? null,
              kycSelfieUrl: user.tutorProfile.kycSelfieUrl ?? null,
              introVideoUrl: user.tutorProfile.introVideoUrl ?? null,
              subjects: user.tutorProfile.subjects || [],
              classLevels: user.tutorProfile.classLevels || [],
              experience: user.tutorProfile.experience ?? null,
              feeMin: user.tutorProfile.feeMin ?? null,
              feeMax: user.tutorProfile.feeMax ?? null,
              bio: user.tutorProfile.bio ?? null,
              wallet: user.tutorProfile.wallet
                ? { balance: user.tutorProfile.wallet.balance ?? 0 }
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
