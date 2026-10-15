import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TutorPlansPageClient } from "@/components/tutor/TutorPlansPageClient";

export const metadata = {
  title: "Tutor Membership Plans | ApnaTutorHub",
  description: "Unlock verified home and online tuition leads with our ₹2,999 Silver Membership (10 Leads · 90 Days · 0% Platform Commission).",
};

export default async function TutorPlansPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const tutorProfile = await prisma.tutorProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      subscriptionPlan: true,
      subscriptionExpiresAt: true,
      leadsUsedThisMonth: true,
    },
  });

  if (!tutorProfile) {
    redirect("/select-role");
  }

  return (
    <TutorPlansPageClient
      currentPlan={tutorProfile.subscriptionPlan}
      expiresAt={tutorProfile.subscriptionExpiresAt?.toISOString() ?? null}
      leadsUsedThisMonth={tutorProfile.leadsUsedThisMonth}
    />
  );
}
