/**
 * lib/whatsapp-bot/leads-helper.ts
 *
 * Real-time matching engine for the WhatsApp Chatbot.
 * Fetches verified student leads from PostgreSQL and formats them with
 * clean WhatsApp typography, live links, and Coin / Membership package details.
 */

import { prisma } from "@/lib/prisma";
import { COIN_PACKAGES } from "@/lib/razorpay";
import { coversClassLevel, hasSubjectOverlap, extractGradeNumber } from "@/lib/matching-engine";
import { expandTutorSubjectsAndClasses } from "./auto-register";

export type MatchingLeadCard = {
  inquiryNumber: number | null;
  classLevel: string;
  subjects: string[];
  area: string;
  city: string;
  budget: string;
  mode: string;
};

/**
 * Extract all grade numbers from a class string (e.g. "Class 11", "Class 9-10", "11th")
 */
function extractAllGrades(s?: string | null): Set<number> {
  const grades = new Set<number>();
  if (!s) return grades;
  const rangeMatch = s.match(/(?:class\s*)?(\d{1,2})\s*(?:to|-|and)\s*(\d{1,2})/i);
  if (rangeMatch) {
    const min = Math.min(parseInt(rangeMatch[1], 10), parseInt(rangeMatch[2], 10));
    const max = Math.max(parseInt(rangeMatch[1], 10), parseInt(rangeMatch[2], 10));
    for (let i = min; i <= max; i++) {
      if (i >= 1 && i <= 12) grades.add(i);
    }
  } else {
    const g = extractGradeNumber(s);
    if (g && g >= 1 && g <= 12) grades.add(g);
  }
  return grades;
}

function isClassCompatible(tutorClassStr: string | undefined, leadClassStr: string): boolean {
  if (!tutorClassStr || !leadClassStr) return true;
  if (/all|any|general/i.test(tutorClassStr)) return true;

  const tutorGrades = extractAllGrades(tutorClassStr);
  const leadGrades = extractAllGrades(leadClassStr);

  if (tutorGrades.size > 0 && leadGrades.size > 0) {
    for (const tg of tutorGrades) {
      if (leadGrades.has(tg)) return true;
      // Senior Secondary (Class 11 & 12)
      if (tg === 11 && leadGrades.has(12)) return true;
      if (tg === 12 && leadGrades.has(11)) return true;
      // Secondary (Class 9 & 10)
      if (tg === 9 && leadGrades.has(10)) return true;
      if (tg === 10 && leadGrades.has(9)) return true;
      // Middle School (Class 6, 7, 8)
      if (tg >= 6 && tg <= 8 && [...leadGrades].some((lg) => lg >= 6 && lg <= 8)) return true;
      // Primary (Class 1-5)
      if (tg <= 5 && [...leadGrades].some((lg) => lg <= 5)) return true;
    }
    return false;
  }

  const tc = tutorClassStr.toLowerCase();
  const lc = leadClassStr.toLowerCase();
  if (/jee|iit/i.test(tc) && /jee|iit/i.test(lc)) return true;
  if (/neet|medical/i.test(tc) && /neet|medical/i.test(lc)) return true;

  return coversClassLevel([tutorClassStr], leadClassStr);
}

function isSubjectCompatible(tutorSubs: string[] | undefined, leadSubs: string[]): boolean {
  if (!tutorSubs || tutorSubs.length === 0) return true;
  if (tutorSubs.some((s) => /all\s*subject|all|any|general/i.test(s))) return true;

  const tNorm = tutorSubs.map((s) => s.toLowerCase());
  const lNorm = leadSubs.map((s) => s.toLowerCase());

  for (const t of tNorm) {
    for (const l of lNorm) {
      if (l.includes("all subject") || l.includes("all core")) return true;
      if (/math|algebra|calculus|geometry/i.test(t) && /math|algebra|calculus|geometry/i.test(l)) return true;
      if (/science|physics|chemistry|biology/i.test(t) && /science|physics|chemistry|biology/i.test(l)) return true;
      if (/physic/i.test(t) && /physic/i.test(l)) return true;
      if (/chem/i.test(t) && /chem/i.test(l)) return true;
      if (/bio/i.test(t) && /bio/i.test(l)) return true;
      if (/english/i.test(t) && /english/i.test(l)) return true;
      if (/hindi/i.test(t) && /hindi/i.test(l)) return true;
      if (/social|sst|history|geography|civics/i.test(t) && /social|sst|history|geography|civics/i.test(l)) return true;
      if (/commerce|account|business|economic/i.test(t) && /commerce|account|business|economic/i.test(l)) return true;
      if (/computer|coding|python|cs/i.test(t) && /computer|coding|python|cs/i.test(l)) return true;
      if (t.includes(l) || l.includes(t)) return true;
    }
  }
  return false;
}

/**
 * Find the top 3-4 active leads matching the tutor's area, city, and subjects.
 */
export async function getChatbotMatchingLeads(
  area?: string,
  city?: string,
  classLevel?: string,
  subjects?: string[]
): Promise<MatchingLeadCard[]> {
  try {
    const rawLeads = await prisma.lead.findMany({
      where: {
        status: { in: ["ACTIVE", "MATCHING", "APPLICATIONS_RECEIVED"] },
      },
      orderBy: { createdAt: "desc" },
      select: {
        inquiryNumber: true,
        classLevel: true,
        subjects: true,
        area: true,
        city: true,
        budgetMin: true,
        budgetMax: true,
        mode: true,
      },
    });

    const hasSpecificClass = Boolean(classLevel && !/all|any|general/i.test(classLevel));
    const hasSpecificSubs = Boolean(
      subjects && subjects.length > 0 && !subjects.some((s) => /all|any|combo/i.test(s))
    );

    // Filter candidate leads strictly by class & subject if specified
    let candidatePool = rawLeads.filter((lead) => {
      if (hasSpecificClass && !isClassCompatible(classLevel, lead.classLevel)) {
        return false;
      }
      if (hasSpecificSubs && !isSubjectCompatible(subjects, lead.subjects)) {
        return false;
      }
      return true;
    });

    // If no candidate matches both strictly, fallback to subject match
    if (candidatePool.length === 0 && hasSpecificSubs) {
      candidatePool = rawLeads.filter((lead) => isSubjectCompatible(subjects, lead.subjects));
    }
    if (candidatePool.length === 0) {
      candidatePool = rawLeads;
    }

    const searchArea = (area || "").toLowerCase().trim();
    const isSouthDelhi = /sangam|saket|kalkaji|malviya|hauz|mehrauli|khanpur|nehru|lajpat|south|okhla|badarpur/i.test(searchArea);
    const isWestDelhi = /dwarka|janakpuri|uttam|vikaspuri|tilak|punjabi|paschim|rajouri|west|najafgarh/i.test(searchArea);
    const isNorthDelhi = /rohini|pitampura|model town|shalimar|north|mustafabad|narela|burari/i.test(searchArea);
    const isEastDelhi = /laxmi|mayur|geeta|preet|anand vihar|east|patparganj|nirman/i.test(searchArea);

    const scored = candidatePool.map((lead) => {
      let score = 0;
      const leadArea = (lead.area || "").toLowerCase();
      const leadCity = (lead.city || "").toLowerCase();
      const combo = `${leadArea} ${leadCity}`;

      // 1. Direct locality match
      if (searchArea && (combo.includes(searchArea) || (leadArea && searchArea.includes(leadArea)))) {
        score += 80;
      } else if (isSouthDelhi && /sangam|saket|kalkaji|malviya|anand|lodhi|south|hauz|mehrauli|nehru|khanpur|lajpat|okhla/i.test(combo)) {
        score += 50;
      } else if (isWestDelhi && /dwarka|janakpuri|uttam|vikaspuri|punjabi|west|paschim|rajouri/i.test(combo)) {
        score += 50;
      } else if (isNorthDelhi && /rohini|model town|north|mustafabad|pitampura|shalimar/i.test(combo)) {
        score += 50;
      } else if (isEastDelhi && /geeta|east|mayur|laxmi|preet|anand vihar/i.test(combo)) {
        score += 50;
      } else if (leadCity.includes("delhi")) {
        score += 20;
      }

      // Online leads are universal
      if (lead.mode === "ONLINE" || combo.includes("online")) {
        score += 30;
      }

      // Exact grade match bonus
      if (classLevel && extractGradeNumber(classLevel) === extractGradeNumber(lead.classLevel)) {
        score += 40;
      }

      return { lead, score };
    });

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, 3).map(({ lead }) => {
      let budgetStr = "₹5,000 – ₹8,000 / mo";
      if (lead.budgetMin && lead.budgetMax) {
        if (lead.budgetMax <= 1500) {
          budgetStr = `₹${lead.budgetMin} – ₹${lead.budgetMax} / hr`;
        } else {
          budgetStr = `₹${lead.budgetMin.toLocaleString("en-IN")} – ₹${lead.budgetMax.toLocaleString("en-IN")} / mo`;
        }
      } else if (lead.budgetMax) {
        budgetStr = `Up to ₹${lead.budgetMax.toLocaleString("en-IN")} / mo`;
      }

      return {
        inquiryNumber: lead.inquiryNumber,
        classLevel: lead.classLevel,
        subjects: lead.subjects.slice(0, 3),
        area: lead.area || lead.city || "Delhi NCR",
        city: lead.city || "Delhi",
        budget: budgetStr,
        mode: lead.mode === "ONLINE" ? "Online" : lead.mode === "OFFLINE" ? "Home Visit 🏡" : "Both 🔄",
      };
    });
  } catch (err) {
    console.error("[leads-helper] Error matching leads:", err);
    return [];
  }
}

/** Format phone for display: strip leading 91 if present, show as +91 XXXXX XXXXX */
function formatPhoneDisplay(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  // Remove leading country code 91 if present (normalizeIndiaWhatsApp stores as 91XXXXXXXXXX)
  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  }
  // Format as +91 XXXXX XXXXX
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return `+91 ${digits}`;
}

/**
 * Format a rich, high-converting WhatsApp message for tutors with live leads + plan details.
 */
export function formatTutorLeadsAndPlansMessage(
  name: string,
  area: string,
  leads: MatchingLeadCard[],
  contactInfo?: { email?: string; phone?: string; hasPassword?: boolean }
): string {
  const greeting = name ? `*${name}* ji` : "";
  const locationLabel = area ? `*${area}*` : "aapke area";

  let contactStatus = "";
  if (contactInfo?.email || contactInfo?.phone) {
    const parts: string[] = [];
    if (contactInfo.email) parts.push(`📧 ${contactInfo.email}`);
    if (contactInfo.phone) parts.push(`📱 ${formatPhoneDisplay(contactInfo.phone)}`);
    contactStatus = `\n*Login:* ${parts.join(" | ")}\nhttps://apnatutorhub.com/login`;
  }

  let leadsSection = "";
  if (leads.length > 0) {
    leadsSection = `\n\n📋 *${locationLabel} ke matching leads:*\n\n` +
      leads
        .map(
          (l, idx) =>
            `${idx + 1}. *#${l.inquiryNumber}* — ${l.classLevel} (${l.subjects.join(", ")})\n` +
            `   📍 ${l.area} | ${l.mode} | 💰 ${l.budget}`
        )
        .join("\n\n");
  } else {
    leadsSection = `\n\n600+ active leads hain Delhi NCR mein!`;
  }

  const plansSection = `\n\n──────────────────────────\n` +
    `🔓 *Lead unlock karne ke liye:*\n` +
    `\n🔥 *₹999 Growth Membership* (Up to 6 Leads / 60 Points)\n` +
    `• Fees < ₹3,000/mo: Up to 6 Leads\n` +
    `• Fees ₹3,000–₹5,000/mo: Up to 3 Leads\n` +
    `• Fees > ₹5,000/mo: Up to 2 High-Ticket Leads\n` +
    `• 0% Platform Commission (100% Fees Aapki!)\n` +
    `• Low Competition (Max 3 Tutors per Lead)\n` +
    `• Direct Parent Phone + Full Address\n` +
    `• 30 Days Validity\n` +
    `\n👉 *Abhi plan activate karein:* https://apnatutorhub.com/tutor/plans\n` +
    `👉 *Saari leads dekho:* https://apnatutorhub.com/tutor/leads\n` +
    `\nReply karo *PLANS* ya *LEADS* kabhi bhi!`;

  return `✅ Profile ready ho gayi${greeting ? " " + greeting : ""}!${contactStatus}${leadsSection}${plansSection}`;
}

/**
 * Format the Membership detail message when user asks about plans.
 */
export function formatCoinPlansMessage(): string {
  return `💎 *ApnaTutorHub ₹999 Growth Membership*

🔥 *₹999 Plan* (67% OFF · Was ₹2,999)
• *Up to 6 Verified Student Leads* (60 Points)
  - Fees < ₹3,000/mo: Up to 6 Leads
  - Fees ₹3,000–₹5,000/mo: Up to 3 Leads
  - Fees > ₹5,000/mo: Up to 2 High-Ticket Leads
• *0% Commission* — Keep 100% tuition fees
• *Low Competition* — Max 3 verified tutors per lead
• *Direct Parent Contact* — Phone number + address
• *Valid for 30 Days* across Delhi NCR & Online

👉 *Abhi Plan Activate Karein:*
https://apnatutorhub.com/tutor/plans

👉 *All Available Leads:*
https://apnatutorhub.com/tutor/leads`;
}

/**
 * Format the Parent response with verified tutors & free trial demo class booking.
 */
export function formatParentDemoMessage(
  area: string,
  classLevel?: string,
  subjects?: string[],
  contactInfo?: { phone?: string; email?: string; name?: string }
): string {
  const subjStr = subjects && subjects.length > 0 ? subjects.join(" & ") : "All Subjects";
  const classStr = classLevel || "your child's class";
  const parentName = contactInfo?.name ? ` ${contactInfo.name} ji` : "";

  let contactStatus = "";
  if (contactInfo?.phone || contactInfo?.email) {
    const parts: string[] = [];
    if (contactInfo.phone) parts.push(`📱 ${formatPhoneDisplay(contactInfo.phone)}`);
    if (contactInfo.email) parts.push(`📧 ${contactInfo.email}`);
    contactStatus = `\n✅ *Registered:* ${parts.join(" | ")}\n`;
  }

  return `Namaste${parentName}! 🙏 We have verified home and online tutors ready for *${classStr}* (${subjStr}) in *${area || "your area"}*! 🎓✨${contactStatus}

⭐ *Why 10,000+ Parents Trust ApnaTutorHub:*
• 100% Background & KYC Verified Tutors
• 1-on-1 Personalized Attention at Home
• Regular Progress Tracking & Test Series
• Flexible Timings (Morning / Evening)

🎁 *100% Free 1-on-1 Trial Demo Class:*
Before paying any monthly fee, you get a completely free demo class at your home!

👉 *Book Your Free Demo Class Online:*
https://apnatutorhub.com/book-demo

Or reply here with your preferred timing (e.g. *Evening 5 PM*) to confirm! 📞`;
}
