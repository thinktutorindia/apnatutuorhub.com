/**
 * lib/whatsapp-bot/user-profile-context.ts
 *
 * Retrieves the comprehensive registered user profile and context from the database
 * for a WhatsApp user so that the conversational AI agent (Priya) and the state machine
 * always have full situational awareness of previous registrations, credentials,
 * subjects, classes, locations, teaching mode, and wallet balance.
 */

import { prisma } from "@/lib/prisma";
import { buildIndiaUserLookupOr } from "@/lib/india-phone";
import { getTutorCoinBalanceByPhone } from "./leads-helper";

export type UserProfileContext = {
  isRegistered: boolean;
  userId?: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: "TUTOR" | "PARENT" | null;
  area?: string | null;
  city?: string | null;
  subjects?: string[];
  classLevels?: string[];
  teachingMode?: "ONLINE" | "OFFLINE" | "EITHER" | "COACHING" | null;
  coins?: number | null;
  subscriptionPlan?: string | null;
  recentLeads?: Array<{
    title: string;
    classLevel?: string | null;
    subjects: string[];
    area?: string | null;
    status: string;
  }>;
};

/**
 * Lookup registered user context by phone across all Indian phone number variants.
 */
export async function getStoredUserProfile(phone: string): Promise<UserProfileContext | null> {
  if (!phone) return null;

  try {
    // Use identical primary-user resolution as findPrimaryUserForWhatsApp / syncUserCredentialsInDb:
    // oldest account first, preferring rows with a TutorProfile so WhatsApp & Admin DB stay in sync.
    const users = await prisma.user.findMany({
      where: {
        OR: buildIndiaUserLookupOr(phone) as never,
      },
      orderBy: { createdAt: "asc" },
      include: {
        tutorProfile: true,
        parentProfile: {
          include: {
            leads: {
              take: 3,
              orderBy: { createdAt: "desc" },
              select: {
                inquiryNumber: true,
                classLevel: true,
                subjects: true,
                area: true,
                city: true,
                status: true,
              },
            },
          },
        },
      },
    });

    const withTutor = users.filter((u) => Boolean(u.tutorProfile));
    const user = (withTutor.length > 0 ? withTutor : users)[0];

    if (!user) {
      return { isRegistered: false };
    }

    const tutorProfile = user.tutorProfile;
    const parentProfile = user.parentProfile;
    const isTutor = user.role === "TUTOR" || Boolean(tutorProfile);
    const isParent = !isTutor && (user.role === "PARENT" || Boolean(parentProfile));
    const role: "TUTOR" | "PARENT" | null = isTutor ? "TUTOR" : isParent ? "PARENT" : null;

    let coins: number | null = null;
    if (isTutor) {
      try {
        const coinRes = await getTutorCoinBalanceByPhone(phone);
        coins = coinRes && coinRes.found ? coinRes.balance : null;
      } catch {
        coins = null;
      }
    }

    return {
      isRegistered: true,
      userId: user.id,
      name: user.name || null,
      email: user.email || null,
      phone: user.phone || phone,
      role,
      area: tutorProfile?.address || parentProfile?.address || null,
      city: tutorProfile?.city || parentProfile?.city || null,
      subjects: tutorProfile?.subjects || [],
      classLevels: tutorProfile?.classLevels || [],
      teachingMode: (tutorProfile?.teachingMode as any) || (isTutor ? "EITHER" : null),
      coins,
      subscriptionPlan: tutorProfile?.subscriptionPlan ? String(tutorProfile.subscriptionPlan) : null,
      recentLeads: parentProfile?.leads.map((l) => ({
        title: l.inquiryNumber ? `Enquiry #${l.inquiryNumber}` : `${l.classLevel} Tuition`,
        classLevel: l.classLevel || null,
        subjects: l.subjects || [],
        area: [l.area, l.city].filter(Boolean).join(", ") || null,
        status: String(l.status),
      })) || [],
    };
  } catch (err) {
    console.warn("[user-profile-context] Failed to lookup user profile:", err);
    return { isRegistered: false };
  }
}
