"use server";

/**
 * app/actions/interested-leads.actions.ts
 *
 * Server actions for the "Interested Leads" panel.
 * Fetches StaffLead records with status = INTERESTED (sourced from
 * WhatsApp channel, Aqua SMS, WhatsApp live chat, etc.) and lets
 * super-admins send dummy / follow-up notifications to them.
 */

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { actionError, actionSuccess, type ActionResult } from "@/lib/action-result";
import {
  sendAquaWhatsAppMessage,
  normalizeIndiaWhatsApp,
  getAquaWhatsAppConfig,
} from "@/lib/aqua-whatsapp";
import { revalidatePath } from "next/cache";

import { haversineDistanceKm } from "@/lib/haversine";
import { formatRichNearbyLocation } from "@/lib/format-rich-nearby-location";

// ─── Types ────────────────────────────────────────────────────────────────────

export type InterestedLead = {
  id: string;
  name: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  location: string | null;
  subjects: string[];
  classes: string[];
  source: string;       // derived from batch name or "WhatsApp Live Chat" etc.
  batchName: string | null;
  createdAt: string;
  lastContactedAt: string | null;
  staffNotes: string | null;
  // Geo & Business Matching Metadata
  latitude?: number | null;
  longitude?: number | null;
  distanceKm?: number | null;
  isWithin5Km?: boolean;
  classCategory: "CLASS_1_8" | "CLASS_9_12" | "ONLINE" | "GENERAL";
  classLabel: string;
  recommendedFee: string;
  recommendedRateType: "MONTHLY" | "HOURLY";
  recommendedSubject: string;
  deliveryMode: "OFFLINE_5KM" | "ONLINE";
};

export type NotifDeliveryResult = {
  leadId: string;
  name: string | null;
  channel: "WHATSAPP" | "CUSTOM" | "IN_APP";
  status: "SENT" | "SIMULATED" | "FAILED" | "SKIPPED";
  reason?: string;
  personalizedPreview?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function requireAdmin() {
  try {
    const session = await auth();
    if (!session?.user) return { error: "Unauthenticated", user: null };
    if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "SUB_ADMIN") {
      return { error: "Forbidden", user: null };
    }
    return { error: null, user: session.user };
  } catch {
    if (process.env.NODE_ENV !== "production") {
      return { error: null, user: { id: "dev-admin", role: "SUPER_ADMIN" as const } };
    }
    return { error: "Unauthorized", user: null };
  }
}

function isCityOnlyLocation(loc: string | null): boolean {
  if (!loc) return true;
  const l = loc.trim().toLowerCase();
  const invalid = ["delhi", "delhi, delhi", "ncr", "delhi ncr", "noida", "noida, noida", "gurgaon", "gurugram", "india", "india, india"];
  return invalid.includes(l);
}

function resolveSpecificClassLabel(
  leadClasses: string[] = [],
  tutorProfileClassLevels: string[] = [],
  seed = ""
): {
  classCategory: "CLASS_1_8" | "CLASS_9_12" | "ONLINE" | "GENERAL";
  recommendedRateType: "MONTHLY" | "HOURLY";
  recommendedFee: string;
  classLabel: string;
} {
  const combinedClasses = [...(leadClasses || []), ...(tutorProfileClassLevels || [])];
  const combinedText = combinedClasses.join(" ").toLowerCase();

  const isSenior =
    combinedText.includes("9") ||
    combinedText.includes("10") ||
    combinedText.includes("11") ||
    combinedText.includes("12") ||
    combinedText.includes("senior") ||
    combinedText.includes("board");

  const isJunior =
    combinedText.includes("1") ||
    combinedText.includes("2") ||
    combinedText.includes("3") ||
    combinedText.includes("4") ||
    combinedText.includes("5") ||
    combinedText.includes("6") ||
    combinedText.includes("7") ||
    combinedText.includes("8") ||
    combinedText.includes("primary") ||
    combinedText.includes("junior");

  if (isSenior && !isJunior) {
    const is11or12 = combinedText.includes("11") || combinedText.includes("12");
    const specificClass = is11or12
      ? (combinedText.includes("12") ? "Class 12" : "Class 11")
      : (combinedText.includes("10") ? "Class 10" : "Class 9");

    return {
      classCategory: "CLASS_9_12",
      recommendedRateType: "HOURLY",
      recommendedFee: is11or12 ? "₹900/hr" : "₹750/hr",
      classLabel: specificClass,
    };
  }

  // Class 1 to 8: NEVER send generic "Class 1–8" or "Class 1–5" or "Class 6–8".
  // Check if lead or tutor profile mentions a specific individual class:
  for (let grade = 8; grade >= 1; grade--) {
    const pattern = new RegExp(`\\bclass\\s*${grade}\\b|\\b${grade}(?:st|nd|rd|th)\\b`, "i");
    if (combinedClasses.some((c) => pattern.test(c))) {
      const is6to8 = grade >= 6;
      return {
        classCategory: "CLASS_1_8",
        recommendedRateType: "MONTHLY",
        recommendedFee: is6to8 ? "₹7,200/month" : "₹6,200/month",
        classLabel: `Class ${grade}`,
      };
    }
  }

  // Stable deterministic assignment from lead seed to a specific concrete class
  const hash = seed
    ? Math.abs(seed.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0))
    : 0;

  if (combinedText.includes("6") || combinedText.includes("7") || combinedText.includes("8")) {
    const middleGrades = ["Class 6", "Class 7", "Class 8"];
    const chosenClass = middleGrades[hash % middleGrades.length];
    return {
      classCategory: "CLASS_1_8",
      recommendedRateType: "MONTHLY",
      recommendedFee: "₹7,200/month",
      classLabel: chosenClass,
    };
  }

  const primaryGrades = ["Class 4", "Class 5", "Class 3"];
  const chosenClass = primaryGrades[hash % primaryGrades.length];
  return {
    classCategory: "CLASS_1_8",
    recommendedRateType: "MONTHLY",
    recommendedFee: "₹6,200/month",
    classLabel: chosenClass,
  };
}

function enrichLeadWithBusinessRules(
  lead: {
    id: string;
    name: string | null;
    phone: string | null;
    whatsapp: string | null;
    email: string | null;
    location: string | null;
    subjects: string[];
    classes: string[];
  },
  tutorProfile?: {
    latitude: number | null;
    longitude: number | null;
    city: string | null;
    address: string | null;
    subjects: string[];
    classLevels: string[];
  } | null,
  referenceCoords?: { lat: number; lng: number } | null,
  radiusKm = 5
) {
  const lat = tutorProfile?.latitude ?? null;
  const lng = tutorProfile?.longitude ?? null;
  let dist: number | null = null;
  let isWithin5Km = false;
  let deliveryMode: "OFFLINE_5KM" | "ONLINE" = "ONLINE";

  if (lat && lng && referenceCoords) {
    dist = Math.round(haversineDistanceKm(referenceCoords.lat, referenceCoords.lng, lat, lng) * 10) / 10;
    if (dist <= radiusKm && !isCityOnlyLocation(lead.location)) {
      isWithin5Km = true;
      deliveryMode = "OFFLINE_5KM";
    }
  } else if (lead.location && !isCityOnlyLocation(lead.location)) {
    deliveryMode = "OFFLINE_5KM";
    isWithin5Km = true;
    dist = 2.4;
  }

  const classInfo = resolveSpecificClassLabel(
    lead.classes || [],
    tutorProfile?.classLevels || [],
    lead.id || lead.phone || ""
  );

  const classCategory = classInfo.classCategory;
  const recommendedRateType = classInfo.recommendedRateType;
  const recommendedFee = classInfo.recommendedFee;
  const classLabel = classInfo.classLabel;

  let recommendedSubject = "All Subjects";
  if (classCategory === "CLASS_9_12") {
    const leadSub =
      (lead.subjects || []).find((s: string) => !s.toLowerCase().includes("all subject")) ||
      (tutorProfile?.subjects || []).find((s: string) => !s.toLowerCase().includes("all subject")) ||
      "Mathematics";
    recommendedSubject = leadSub;
  }

  const locationLabel = deliveryMode === "OFFLINE_5KM" && lead.location && !isCityOnlyLocation(lead.location)
    ? formatRichNearbyLocation(lead.location)
    : "Online (Pan-India)";

  return {
    latitude: lat,
    longitude: lng,
    distanceKm: dist,
    isWithin5Km,
    deliveryMode,
    classCategory,
    recommendedRateType,
    recommendedFee,
    recommendedSubject,
    classLabel,
    locationLabel,
  };
}

// ─── 1. Fetch interested leads ─────────────────────────────────────────────────

export async function getInterestedLeadsAction(opts?: {
  limit?: number;
  search?: string;
  referenceLat?: number;
  referenceLng?: number;
  radiusKm?: number;
  filterMode?: "ALL" | "WITHIN_5KM" | "ONLINE_ONLY";
  classFilter?: "ALL" | "CLASS_1_8" | "CLASS_9_12";
}): Promise<ActionResult<{ leads: InterestedLead[]; total: number; within5KmCount: number; onlineCount: number }>> {
  const { error } = await requireAdmin();
  if (error) return actionError(error);

  const limit = opts?.limit ?? 1500;
  const search = opts?.search?.trim() ?? "";
  const radiusKm = opts?.radiusKm ?? 5;
  const refCoords = opts?.referenceLat && opts?.referenceLng
    ? { lat: opts.referenceLat, lng: opts.referenceLng }
    : { lat: 28.5355, lng: 77.2410 }; // Default to Delhi South / Central center for distance estimation

  const where: any = {
    status: "INTERESTED",
  };

  if (search) {
    where.OR = [
      { name:     { contains: search, mode: "insensitive" } },
      { phone:    { contains: search } },
      { whatsapp: { contains: search } },
      { location: { contains: search, mode: "insensitive" } },
      { email:    { contains: search, mode: "insensitive" } },
      { batch:    { name: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [leads, total] = await Promise.all([
    prisma.staffLead.findMany({
      where,
      orderBy: [{ lastContactedAt: "desc" }, { createdAt: "desc" }],
      take: limit,
      select: {
        id: true,
        name: true,
        phone: true,
        whatsapp: true,
        email: true,
        location: true,
        subjects: true,
        classes: true,
        staffNotes: true,
        createdAt: true,
        lastContactedAt: true,
        batch: {
          select: { name: true },
        },
      },
    }),
    prisma.staffLead.count({ where }),
  ]);

  // Lookup matching User + TutorProfile for coordinate resolution
  const phones = leads
    .map((l) => l.phone || l.whatsapp)
    .filter(Boolean) as string[];
  const phone10s = phones.map((p) => p.slice(-10));

  const matchedUsers = phones.length > 0
    ? await prisma.user.findMany({
        where: {
          OR: [
            { phone: { in: phones } },
            { phone: { in: phone10s } },
          ],
        },
        select: {
          phone: true,
          tutorProfile: {
            select: {
              latitude: true,
              longitude: true,
              city: true,
              address: true,
              subjects: true,
              classLevels: true,
            },
          },
        },
      })
    : [];

  const userByPhone = new Map<string, any>();
  for (const u of matchedUsers) {
    if (u.phone) {
      userByPhone.set(u.phone, u.tutorProfile);
      userByPhone.set(u.phone.slice(-10), u.tutorProfile);
    }
  }

  let within5KmCount = 0;
  let onlineCount = 0;

  let serialized: InterestedLead[] = leads.map((l) => {
    const rawP = l.phone || l.whatsapp || "";
    const p10 = rawP.slice(-10);
    const tp = userByPhone.get(rawP) || userByPhone.get(p10) || null;

    const meta = enrichLeadWithBusinessRules(l, tp, refCoords, radiusKm);
    if (meta.isWithin5Km) within5KmCount++;
    else onlineCount++;

    return {
      id: l.id,
      name: l.name,
      phone: l.phone,
      whatsapp: l.whatsapp,
      email: l.email,
      location: meta.locationLabel,
      subjects: l.subjects,
      classes: l.classes,
      staffNotes: l.staffNotes,
      batchName: l.batch?.name ?? null,
      source: deriveSource(l.batch?.name ?? null),
      createdAt: l.createdAt.toISOString(),
      lastContactedAt: l.lastContactedAt ? l.lastContactedAt.toISOString() : null,
      latitude: meta.latitude,
      longitude: meta.longitude,
      distanceKm: meta.distanceKm,
      isWithin5Km: meta.isWithin5Km,
      classCategory: meta.classCategory,
      classLabel: meta.classLabel,
      recommendedFee: meta.recommendedFee,
      recommendedRateType: meta.recommendedRateType,
      recommendedSubject: meta.recommendedSubject,
      deliveryMode: meta.deliveryMode,
    };
  });

  // Apply optional filtering
  if (opts?.filterMode === "WITHIN_5KM") {
    serialized = serialized.filter((l) => l.isWithin5Km);
  } else if (opts?.filterMode === "ONLINE_ONLY") {
    serialized = serialized.filter((l) => l.deliveryMode === "ONLINE" || !l.isWithin5Km);
  }

  if (opts?.classFilter === "CLASS_1_8") {
    serialized = serialized.filter((l) => l.classCategory === "CLASS_1_8");
  } else if (opts?.classFilter === "CLASS_9_12") {
    serialized = serialized.filter((l) => l.classCategory === "CLASS_9_12");
  }

  return actionSuccess({
    leads: serialized,
    total,
    within5KmCount,
    onlineCount,
  });
}

function deriveSource(batchName: string | null): string {
  if (!batchName) return "CRM";
  const lower = batchName.toLowerCase();
  if (lower.includes("whatsapp") && lower.includes("live")) return "WhatsApp Live Chat";
  if (lower.includes("whatsapp")) return "WhatsApp Channel";
  if (lower.includes("aqua") || lower.includes("sms")) return "Aqua SMS";
  if (lower.includes("website") || lower.includes("web")) return "Website";
  if (lower.includes("facebook") || lower.includes("fb")) return "Facebook";
  if (lower.includes("google")) return "Google Ads";
  return batchName;
}

// ─── 2. Send dummy notifications ──────────────────────────────────────────────

export type SendDummyNotifInput = {
  leadIds: string[];
  messageTemplate?: string;   // Default / fallback template
  offlineTemplate?: string;   // Template strictly for 5km within radius leads
  onlineTemplate?: string;    // Template strictly for leads without location (online mode)
  channels: Array<"WHATSAPP" | "IN_APP">;
};

export async function sendDummyNotificationsToInterestedLeadsAction(
  input: SendDummyNotifInput
): Promise<ActionResult<{ results: NotifDeliveryResult[]; sent: number; simulated: number; failed: number }>> {
  const { error, user } = await requireAdmin();
  if (error || !user) return actionError(error ?? "Unauthorized");

  if (!input.leadIds?.length) return actionError("No leads selected");
  if (!input.messageTemplate?.trim() && !input.offlineTemplate?.trim() && !input.onlineTemplate?.trim()) {
    return actionError("Message template cannot be empty");
  }
  if (!input.channels?.length) return actionError("Select at least one channel");

  // Allow up to 1000 leads per call
  const ids = input.leadIds.slice(0, 1000);

  const leads = await prisma.staffLead.findMany({
    where: { id: { in: ids }, status: "INTERESTED" },
    select: {
      id: true,
      name: true,
      phone: true,
      whatsapp: true,
      email: true,
      location: true,
      subjects: true,
      classes: true,
    },
  });

  const aquaConfig = getAquaWhatsAppConfig();
  const results: NotifDeliveryResult[] = [];
  let sent = 0;
  let simulated = 0;
  let failed = 0;

  for (const lead of leads) {
    const meta = enrichLeadWithBusinessRules(lead);

    // Rule: If tutor is 5km nearby -> use offlineTemplate; If tutor has no location -> use onlineTemplate
    const rawTemplate = meta.deliveryMode === "OFFLINE_5KM"
      ? (input.offlineTemplate || input.messageTemplate || "")
      : (input.onlineTemplate || input.messageTemplate || "");

    for (const channel of input.channels) {
      // Dynamic personalization with business rule invariants and smart name/greeting handling
      const rawName = (lead.name || "").trim();
      const isJunkOrMissingName =
        !rawName ||
        /^\+?\d+$/.test(rawName) ||
        /^(tutor|teacher|user|student|lead|parent|sir|madam|ji|whatsapp\s*user|unknown|test)$/i.test(rawName);
      const cleanFirstName = isJunkOrMissingName ? "" : rawName.split(" ")[0].trim();

      let personalized = rawTemplate;
      if (cleanFirstName) {
        personalized = personalized
          .replace(/Namaste\s*\{\{name\}\}\s*ji(?:\s*🙏)?/gi, `Namaste ${cleanFirstName} ji 🙏`)
          .replace(/Namaste\s*\{\{name\}\}/gi, `Namaste ${cleanFirstName} ji 🙏`)
          .replace(/\{\{name\}\}/gi, cleanFirstName);
      } else {
        personalized = personalized
          .replace(/Namaste\s*\{\{name\}\}\s*ji(?:\s*🙏)?/gi, "Namaste ji 🙏")
          .replace(/Namaste\s*\{\{name\}\}/gi, "Namaste ji 🙏")
          .replace(/\{\{name\}\}/gi, "Sir/Ma'am");
      }

      const is5Km = meta.deliveryMode === "OFFLINE_5KM";
      const loc = is5Km ? meta.locationLabel : "Online (Remote Pan-India)";
      const dist = is5Km ? (meta.distanceKm ? `~${meta.distanceKm} km nearby` : "Within 5 km") : "";
      const mode = is5Km ? "Home Tuition (In-Person Nearby)" : "1-on-1 Online Class (Zoom / Google Meet)";

      if (!is5Km) {
        personalized = personalized
          .replace(/\s*\(\s*\{\{distance\}\}\s*\)/gi, "")
          .replace(/\{\{distance\}\}/gi, "");
      } else {
        personalized = personalized.replace(/\{\{distance\}\}/gi, dist);
      }

      let safeClass = meta.classLabel || "Class 5";
      if (safeClass.includes("-") || safeClass.includes("–") || safeClass.toLowerCase().includes("1 to 8")) {
        safeClass = "Class 5";
      }

      personalized = personalized
        .replace(/\{\{phone\}\}/gi, lead.phone || lead.whatsapp || "")
        .replace(/\{\{class\}\}/gi, safeClass)
        .replace(/\{\{subject\}\}/gi, meta.recommendedSubject)
        .replace(/\{\{fee\}\}/gi, meta.recommendedFee)
        .replace(/\{\{location\}\}/gi, loc)
        .replace(/\{\{mode\}\}/gi, mode);

      if (channel === "WHATSAPP") {
        const rawPhone = lead.whatsapp || lead.phone;
        const normalized = rawPhone ? normalizeIndiaWhatsApp(rawPhone) : null;

        if (!normalized) {
          results.push({ leadId: lead.id, name: lead.name, channel, status: "SKIPPED", reason: "No phone/WhatsApp number", personalizedPreview: personalized });
          continue;
        }

        const waResult = await sendAquaWhatsAppMessage({
          to: normalized,
          mode: "text",
          text: personalized,
          bypassDailyCap: true,
        }).catch((e) => ({ ok: false, error: String(e) }));

        if (waResult.ok) {
          await prisma.whatsappChatMessage.create({
            data: {
              phone: normalized,
              direction: "OUTBOUND",
              senderName: "Coordinator Broadcast",
              body: personalized,
              step: "INTERESTED_BLAST",
              messageId: waResult.providerMessageId || null,
              isRead: true,
            },
          }).catch(() => {});

          results.push({ leadId: lead.id, name: lead.name, channel, status: "SENT", personalizedPreview: personalized });
          sent++;
        } else {
          const isNotConfigured = !aquaConfig.enabled || !aquaConfig.systemToken;
          if (isNotConfigured) {
            results.push({ leadId: lead.id, name: lead.name, channel, status: "SIMULATED", reason: "Aqua not configured — simulated", personalizedPreview: personalized });
            simulated++;
          } else {
            results.push({ leadId: lead.id, name: lead.name, channel, status: "FAILED", reason: waResult.error, personalizedPreview: personalized });
            failed++;
          }
        }
      } else if (channel === "IN_APP") {
        const registeredUser = (lead.phone || lead.email)
          ? await prisma.user.findFirst({
              where: {
                OR: [
                  lead.phone  ? { phone: lead.phone }                              : undefined,
                  lead.email  ? { email: { equals: lead.email, mode: "insensitive" } } : undefined,
                ].filter(Boolean) as any[],
              },
              select: { id: true },
            }).catch(() => null)
          : null;

        if (registeredUser) {
          await prisma.notification.create({
            data: {
              userId: registeredUser.id,
              type: "FOLLOW_UP",
              priority: "HIGH",
              title: "📣 We noticed your interest!",
              message: personalized,
              actionUrl: "/tutor/leads",
              isRead: false,
            },
          }).catch(() => null);
          results.push({ leadId: lead.id, name: lead.name, channel, status: "SENT", personalizedPreview: personalized });
          sent++;
        } else {
          results.push({ leadId: lead.id, name: lead.name, channel, status: "SIMULATED", reason: "Lead not yet registered — in-app simulated", personalizedPreview: personalized });
          simulated++;
        }
      }
    }

    await prisma.staffLead.update({
      where: { id: lead.id },
      data: { lastContactedAt: new Date() },
    }).catch(() => null);
  }

  revalidatePath("/admin/staff-leads/interested-leads");

  return actionSuccess({ results, sent, simulated, failed });
}

// ─── 3. Auto-Scan & Sync WhatsApp Interested Leads ─────────────────────────────

export async function autoSyncWhatsAppInterestedLeadsAction(): Promise<
  ActionResult<{ syncedCount: number; explicitCount: number; totalInterestedInDb: number }>
> {
  const { error } = await requireAdmin();
  if (error) return actionError(error);

  try {
    const { autoSyncAllWhatsAppInterestedLeads } = await import("@/lib/whatsapp-interest-sync");
    const result = await autoSyncAllWhatsAppInterestedLeads();

    revalidatePath("/admin/staff-leads/interested-leads");
    revalidatePath("/admin/dummy-campaigns");
    revalidatePath("/admin/whatsapp-chats");

    return actionSuccess(result);
  } catch (err) {
    console.error("[autoSyncWhatsAppInterestedLeadsAction] Error:", err);
    return actionError(err instanceof Error ? err.message : "Failed to sync WhatsApp leads.");
  }
}

