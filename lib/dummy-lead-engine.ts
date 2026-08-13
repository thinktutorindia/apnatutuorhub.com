/**
 * lib/dummy-lead-engine.ts
 * Location-aware dummy lead generator + multi-channel delivery engine.
 * Generates realistic Indian student requirement data based on tutor location.
 */

import { prisma } from "@/lib/prisma";
import { dispatchEmail } from "@/lib/aws-notification";
import { sendWebPush } from "@/lib/web-push";
import { renderDummyLeadEmail } from "@/emails/DummyLeadEmail";

// ─── Indian Locality Data Pool ────────────────────────────────────────────────

const LOCALITY_POOLS: Record<string, string[]> = {
  Delhi: ["Lajpat Nagar", "Dwarka", "Rohini", "Janakpuri", "Karol Bagh", "Saket", "Vasant Kunj", "Pitampura", "Shahdara", "Preet Vihar", "Rajouri Garden", "Uttam Nagar", "Paschim Vihar"],
  Mumbai: ["Andheri", "Bandra", "Borivali", "Thane", "Kurla", "Malad", "Kandivali", "Goregaon", "Powai", "Chembur", "Vile Parle", "Mulund", "Dahisar"],
  Bangalore: ["Koramangala", "Indiranagar", "HSR Layout", "Whitefield", "JP Nagar", "Rajajinagar", "Malleshwaram", "Yelahanka", "Banashankari", "BTM Layout", "Marathahalli", "Electronic City"],
  Hyderabad: ["Madhapur", "Banjara Hills", "Secunderabad", "Kukatpally", "KPHB Colony", "Gachibowli", "Ameerpet", "Kondapur", "Miyapur", "Uppal", "LB Nagar", "Dilsukhnagar"],
  Chennai: ["Anna Nagar", "T Nagar", "Adyar", "Velachery", "Tambaram", "Porur", "Nungambakkam", "Mylapore", "Chromepet", "Perambur", "Guindy", "Ambattur"],
  Pune: ["Kothrud", "Viman Nagar", "Hadapsar", "Aundh", "Baner", "Wakad", "Hinjewadi", "Pimple Saudagar", "Kondhwa", "Sinhagad Road", "Shivajinagar", "Deccan"],
  Kolkata: ["Salt Lake", "Park Street", "Rajarhat", "Howrah", "Dumdum", "Ballygunge", "Behala", "Jadavpur", "Garia", "Tollygunge", "New Town", "Dum Dum"],
  Jaipur: ["Malviya Nagar", "Vaishali Nagar", "Mansarovar", "C-Scheme", "Jagatpura", "Sanganer", "Tonk Road", "Ajmer Road", "Civil Lines", "Bani Park"],
  Lucknow: ["Gomti Nagar", "Hazratganj", "Aliganj", "Indira Nagar", "Alambagh", "Jankipuram", "Rajajipuram", "Mahanagar", "Vikas Nagar", "Chinhat"],
  DEFAULT: ["Sector 15", "Green Park", "Model Town", "Civil Lines", "Shastri Nagar", "Gandhi Nagar", "Nehru Colony", "Rajiv Nagar", "Vikas Colony", "Lal Bahadur Colony"],
};

const STUDENT_NAMES = [
  "Aarav Sharma", "Priya Patel", "Rohit Singh", "Ananya Gupta", "Karan Mehta",
  "Shreya Verma", "Arjun Kumar", "Pooja Yadav", "Vikram Joshi", "Nisha Agarwal",
  "Rahul Mishra", "Deepika Nair", "Amit Pandey", "Sunita Reddy", "Gaurav Saxena",
  "Riya Bhatia", "Sanjay Tiwari", "Kavya Pillai", "Akshat Srivastava", "Meera Iyer",
  "Varun Malhotra", "Sneha Choudhary", "Dev Kapoor", "Tanvi Bajaj", "Nikhil Rawat",
];

const BOARDS = ["CBSE", "ICSE", "State Board", "IB", "IGCSE"];
const CLASS_LEVELS = ["Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12", "Nursery", "KG", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5"];
const DAYS_OPTIONS = ["Monday–Friday", "Monday & Wednesday", "Tuesday & Thursday", "Weekend only", "Saturday & Sunday", "Daily", "3 days/week", "Flexible"];
const TIME_OPTIONS = ["Morning (7–9 AM)", "Afternoon (12–3 PM)", "Evening (5–8 PM)", "Late Evening (7–9 PM)", "Flexible timings"];
const MODES: Array<"ONLINE" | "OFFLINE" | "EITHER"> = ["ONLINE", "OFFLINE", "EITHER"];

// ─── Deterministic Seeded Random (date-based) ─────────────────────────────────

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function dateSeed(): number {
  const d = new Date();
  return parseInt(`${d.getFullYear()}${d.getMonth()}${d.getDate()}`, 10);
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

// ─── DummyLead Type ───────────────────────────────────────────────────────────

export interface DummyLead {
  locality: string;
  city: string;
  studentName: string;
  classLevel: string;
  board: string;
  subjects: string[];
  mode: "ONLINE" | "OFFLINE" | "EITHER";
  budgetMin: number;
  budgetMax: number;
  days: string;
  timing: string;
  isDummy: true;
  generatedAt: string;
}

// ─── Generate a dummy lead for a specific tutor ───────────────────────────────

export function generateDummyLead(opts: {
  tutorCity?: string | null;
  tutorSubjects?: string[];
  tutorClassLevels?: string[];
  budgetMin?: number;
  budgetMax?: number;
  overrideSubjects?: string[];
  userSeed?: number;
}): DummyLead {
  const {
    tutorCity,
    tutorSubjects = [],
    tutorClassLevels = [],
    budgetMin = 800,
    budgetMax = 3000,
    overrideSubjects = [],
    userSeed = 0,
  } = opts;

  // Combine date seed + user seed for per-user daily variation
  const rng = seededRandom(dateSeed() + userSeed);

  // Resolve city
  const city = tutorCity || "Delhi";
  const cityKey = Object.keys(LOCALITY_POOLS).find(
    (k) => city.toLowerCase().includes(k.toLowerCase())
  ) || "DEFAULT";
  const localities = LOCALITY_POOLS[cityKey];

  const locality = pick(localities, rng);

  // Subjects: use override if set, else tutor's own (pick 1–3), else generic
  const subjectPool = overrideSubjects.length > 0
    ? overrideSubjects
    : tutorSubjects.length > 0
    ? tutorSubjects
    : ["Mathematics", "Science", "English"];
  const numSubjects = Math.min(Math.floor(rng() * 2) + 1, subjectPool.length);
  const subjects: string[] = [];
  const poolCopy = [...subjectPool];
  for (let i = 0; i < numSubjects; i++) {
    const idx = Math.floor(rng() * poolCopy.length);
    subjects.push(poolCopy[idx]);
    poolCopy.splice(idx, 1);
  }

  // Class level: pick from tutor's or generic
  const classPool = tutorClassLevels.length > 0 ? tutorClassLevels : CLASS_LEVELS;
  const classLevel = pick(classPool, rng);

  // Budget
  const range = budgetMax - budgetMin;
  const bMin = budgetMin + Math.floor(rng() * range * 0.4);
  const bMax = bMin + 300 + Math.floor(rng() * 700);

  return {
    locality,
    city,
    studentName: pick(STUDENT_NAMES, rng),
    classLevel,
    board: pick(BOARDS, rng),
    subjects,
    mode: pick(MODES, rng),
    budgetMin: bMin,
    budgetMax: Math.min(bMax, budgetMax),
    days: pick(DAYS_OPTIONS, rng),
    timing: pick(TIME_OPTIONS, rng),
    isDummy: true,
    generatedAt: new Date().toISOString(),
  };
}

// ─── Mode label ───────────────────────────────────────────────────────────────

const modeLabel: Record<string, string> = {
  ONLINE: "Online",
  OFFLINE: "In-Person",
  EITHER: "Online / In-Person",
};

// ─── Send dummy lead to a single tutor (all enabled channels) ─────────────────

export async function deliverDummyLeadToTutor(opts: {
  campaignId: string;
  userId: string;
  userName: string | null;
  userEmail: string;
  lead: DummyLead;
  channels: string[];
  budgetMin: number;
  budgetMax: number;
}): Promise<{ sent: number; failed: number }> {
  const { campaignId, userId, userName, userEmail, lead, channels } = opts;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://apnatutorhub.com";
  let sent = 0;
  let failed = 0;

  for (const channel of channels) {
    let status = "FAILED";
    let errorMessage: string | undefined;

    try {
      if (channel === "IN_APP") {
        await prisma.notification.create({
          data: {
            userId,
            type: "NEW_LEAD_MATCH",
            priority: "HIGH",
            title: `📍 New Requirement Near ${lead.locality}`,
            message: `A student in ${lead.locality} needs a ${lead.subjects.join(", ")} tutor for ${lead.classLevel}. Budget: ₹${lead.budgetMin}–₹${lead.budgetMax}/mo.`,
            actionUrl: "/tutor/leads",
            isRead: false,
          },
        });
        status = "SENT";
        sent++;
      } else if (channel === "PUSH") {
        await sendWebPush(userId, {
          title: `📍 Student near ${lead.locality} needs a tutor!`,
          body: `${lead.subjects.join(" & ")} for ${lead.classLevel}. Budget ₹${lead.budgetMin}–₹${lead.budgetMax}/mo. Tap to view!`,
          url: `${appUrl}/tutor/leads`,
          tag: `dummy-lead-${campaignId}`,
        });
        status = "SENT";
        sent++;
      } else if (channel === "EMAIL") {
        const html = renderDummyLeadEmail({
          tutorName: userName || "Tutor",
          locality: lead.locality,
          city: lead.city,
          subjects: lead.subjects,
          classLevel: lead.classLevel,
          board: lead.board,
          mode: modeLabel[lead.mode] || lead.mode,
          budgetMin: lead.budgetMin,
          budgetMax: lead.budgetMax,
          days: lead.days,
          timing: lead.timing,
          studentName: lead.studentName,
          leadUrl: `${appUrl}/tutor/leads`,
        });
        const result = await dispatchEmail(
          userEmail,
          `📍 New Student Requirement Near ${lead.locality} — ApnaTutorHub`,
          html
        );
        if (result.success) {
          status = "SENT";
          sent++;
        } else {
          errorMessage = result.error;
          failed++;
        }
      }
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err);
      failed++;
    }

    // Log every attempt
    await prisma.campaignDeliveryLog.create({
      data: {
        campaignId,
        userId,
        userName: userName || undefined,
        userEmail,
        channel,
        status,
        leadData: lead as any,
        errorMessage,
      },
    });
  }

  return { sent, failed };
}

// ─── Resolve target tutors for a campaign ────────────────────────────────────

export async function resolveCampaignTargets(campaign: {
  targetGroup: string;
  customUserIds: string[];
  excludeUserIds: string[];
}): Promise<Array<{
  id: string;
  name: string | null;
  email: string;
  tutorProfile: {
    city: string | null;
    subjects: string[];
    classLevels: string[];
  } | null;
}>> {
  const now = new Date();
  const excludeSet = new Set(campaign.excludeUserIds);

  let where: Record<string, any> = { role: "TUTOR", isActive: true };

  if (campaign.targetGroup === "NEW_7D") {
    const cutoff = new Date(now); cutoff.setDate(cutoff.getDate() - 7);
    where.createdAt = { gte: cutoff };
  } else if (campaign.targetGroup === "NEW_14D") {
    const cutoff = new Date(now); cutoff.setDate(cutoff.getDate() - 14);
    where.createdAt = { gte: cutoff };
  } else if (campaign.targetGroup === "NEW_30D") {
    const cutoff = new Date(now); cutoff.setDate(cutoff.getDate() - 30);
    where.createdAt = { gte: cutoff };
  } else if (campaign.targetGroup === "VERIFIED") {
    where.tutorProfile = { isVerified: true };
  } else if (campaign.targetGroup === "UNVERIFIED") {
    where.tutorProfile = { isVerified: false };
  } else if (campaign.targetGroup === "SUBSCRIBED") {
    where.tutorProfile = { subscriptionPlan: { not: "NONE" } };
  } else if (campaign.targetGroup === "FREE_TIER") {
    where.tutorProfile = { subscriptionPlan: "NONE" };
  } else if (campaign.targetGroup === "CUSTOM") {
    where.id = { in: campaign.customUserIds };
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      tutorProfile: {
        select: { city: true, subjects: true, classLevels: true },
      },
    },
  });

  return users.filter((u) => !excludeSet.has(u.id));
}

// ─── Run a full campaign pass ────────────────────────────────────────────────

export async function runCampaignPass(campaignId: string): Promise<{
  sent: number;
  failed: number;
  usersProcessed: number;
}> {
  const campaign = await prisma.dummyCampaign.findUnique({
    where: { id: campaignId },
  });
  if (!campaign || campaign.status !== "ACTIVE") {
    return { sent: 0, failed: 0, usersProcessed: 0 };
  }

  // Check date bounds
  const now = new Date();
  if (campaign.startDate && now < campaign.startDate) return { sent: 0, failed: 0, usersProcessed: 0 };
  if (campaign.endDate && now > campaign.endDate) {
    await prisma.dummyCampaign.update({ where: { id: campaignId }, data: { status: "COMPLETED" } });
    return { sent: 0, failed: 0, usersProcessed: 0 };
  }

  // Check total limit
  if (campaign.totalLimit !== null && campaign.totalSent >= campaign.totalLimit) {
    await prisma.dummyCampaign.update({ where: { id: campaignId }, data: { status: "COMPLETED" } });
    return { sent: 0, failed: 0, usersProcessed: 0 };
  }

  const targets = await resolveCampaignTargets({
    targetGroup: campaign.targetGroup,
    customUserIds: campaign.customUserIds,
    excludeUserIds: campaign.excludeUserIds,
  });

  let totalSent = 0;
  let totalFailed = 0;

  for (const user of targets) {
    for (let i = 0; i < campaign.leadsPerDay; i++) {
      const lead = generateDummyLead({
        tutorCity: user.tutorProfile?.city,
        tutorSubjects: user.tutorProfile?.subjects ?? [],
        tutorClassLevels: user.tutorProfile?.classLevels ?? [],
        budgetMin: campaign.budgetMin,
        budgetMax: campaign.budgetMax,
        overrideSubjects: campaign.overrideSubjects,
        userSeed: user.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0) + i * 137,
      });

      const result = await deliverDummyLeadToTutor({
        campaignId,
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        lead,
        channels: campaign.channels,
        budgetMin: campaign.budgetMin,
        budgetMax: campaign.budgetMax,
      });

      totalSent += result.sent;
      totalFailed += result.failed;
    }
  }

  // Update campaign counters
  await prisma.dummyCampaign.update({
    where: { id: campaignId },
    data: {
      totalSent: { increment: totalSent },
      totalFailed: { increment: totalFailed },
      lastRunAt: now,
    },
  });

  return { sent: totalSent, failed: totalFailed, usersProcessed: targets.length };
}
