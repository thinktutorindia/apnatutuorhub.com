/**
 * lib/whatsapp-bot/leads-helper.ts
 *
 * Real-time matching engine for the WhatsApp Chatbot.
 * Fetches verified student leads from PostgreSQL and formats them with
 * clean WhatsApp typography, live links, and Coin / Membership package details.
 */

import { prisma } from "@/lib/prisma";
import { COIN_PACKAGES } from "@/lib/razorpay";
import { coversClassLevel, hasSubjectOverlap } from "@/lib/matching-engine";
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
      take: 100,
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

    const expanded = expandTutorSubjectsAndClasses({
      rawSubjects: subjects,
      rawClassLevel: classLevel,
    });
    const tutorClasses = expanded.classLevels;
    const tutorSubs = expanded.subjects;

    const hasSpecificClass = Boolean(classLevel && !/all|any|general/i.test(classLevel));
    const hasSpecificSubs = Boolean(
      subjects && subjects.length > 0 && !subjects.some((s) => /all|any|combo/i.test(s))
    );

    // Filter candidate leads strictly by class & subject if specified
    const filteredLeads = rawLeads.filter((lead) => {
      if (hasSpecificClass && !coversClassLevel(tutorClasses, lead.classLevel)) {
        return false;
      }
      if (hasSpecificSubs && !hasSubjectOverlap(tutorSubs, lead.subjects)) {
        return false;
      }
      return true;
    });

    const candidatePool = filteredLeads.length > 0 ? filteredLeads : rawLeads;

    const searchArea = (area || "").toLowerCase().trim();
    const isSouthDelhi = /sangam|saket|kalkaji|malviya|hauz|mehrauli|khanpur|nehru|lajpat|south|okhla/i.test(searchArea);
    const isWestDelhi = /dwarka|janakpuri|uttam|vikaspuri|tilak|punjabi|paschim|rajouri|west/i.test(searchArea);
    const isNorthDelhi = /rohini|pitampura|model town|shalimar|north|mustafabad/i.test(searchArea);
    const isEastDelhi = /laxmi|mayur|geeta|preet|anand vihar|east/i.test(searchArea);

    const scored = candidatePool.map((lead) => {
      let score = 0;
      const leadArea = (lead.area || "").toLowerCase();
      const leadCity = (lead.city || "").toLowerCase();
      const combo = `${leadArea} ${leadCity}`;

      // 1. Direct locality match
      if (searchArea && combo.includes(searchArea)) {
        score += 60;
      } else if (isSouthDelhi && /saket|kalkaji|malviya|anand|lodhi|south|hauz|mehrauli|nehru/i.test(combo)) {
        score += 35;
      } else if (isWestDelhi && /dwarka|janakpuri|uttam|vikaspuri|punjabi|west/i.test(combo)) {
        score += 35;
      } else if (isNorthDelhi && /rohini|model town|north|mustafabad/i.test(combo)) {
        score += 35;
      } else if (isEastDelhi && /geeta|east|mayur/i.test(combo)) {
        score += 35;
      } else if (leadCity.includes("delhi")) {
        score += 15;
      }

      // 2. Class match
      if (coversClassLevel(tutorClasses, lead.classLevel)) {
        score += 30;
      }

      // 3. Subject match
      if (hasSubjectOverlap(tutorSubs, lead.subjects)) {
        score += 30;
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

/**
 * Format a rich, high-converting WhatsApp message for tutors with live leads + coin packages.
 */
export function formatTutorLeadsAndPlansMessage(
  name: string,
  area: string,
  leads: MatchingLeadCard[],
  contactInfo?: { email?: string; phone?: string }
): string {
  const greeting = name ? `Namaste *${name}* ji! 🎉` : `Namaste! 🎉`;
  const locationLabel = area ? `in & around *${area}*` : "near your area";

  let contactStatus = "";
  if (contactInfo?.email || contactInfo?.phone) {
    const parts: string[] = [];
    if (contactInfo.phone) parts.push(`📱 +91 ${contactInfo.phone}`);
    if (contactInfo.email) parts.push(`📧 ${contactInfo.email}`);
    contactStatus = `\n✅ *Registered Contact:* ${parts.join(" | ")}\n`;
  }

  let leadsSection = "";
  if (leads.length > 0) {
    leadsSection = `🔥 *Verified Student Leads Available ${locationLabel} (<10 km):*\n\n` +
      leads
        .map(
          (l, idx) =>
            `${idx + 1}️⃣ *Lead #${l.inquiryNumber}* — *${l.classLevel}* (${l.subjects.join(", ")})\n` +
            `   📍 ${l.area} (${l.mode})\n` +
            `   💰 *${l.budget}*`
        )
        .join("\n\n");
  } else {
    leadsSection = `🔥 *Verified Student Leads:* We have over 600+ active tuition requirements across Delhi NCR!`;
  }

  const emailPrompt = !contactInfo?.email
    ? `\n\n💡 *Tip:* Send your *Email ID* anytime (e.g. rohit@gmail.com) to receive direct email alerts whenever a new student lead is posted in ${area || "your area"}!`
    : "";

  const plansSection = `\n\n──────────────────────────\n` +
    `💎 *Unlock Parent Contact Details & Apply:*` +
    `\nTutors keep 100% of their fees from parents. Unlock direct parent numbers with our Coin Packs:` +
    `\n• *Starter Pack:* 50 Coins — ₹500 (1–2 Leads)` +
    `\n• *Pro Pack (Popular 🔥):* 140 Coins — ₹1,000 (3–5 Leads)` +
    `\n• *Elite Pack (Best Value 💎):* 380 Coins — ₹2,200 (10+ Leads)` +
    `\n\n👉 *View All Matching Leads:*` +
    `\nhttps://apnatutorhub.com/tutor/leads` +
    `\n\n👉 *Recharge Coins / Buy Plan:*` +
    `\nhttps://apnatutorhub.com/tutor/wallet` +
    emailPrompt +
    `\n\nReply with *PLANS* or *LEADS* anytime to explore! 🚀`;

  return `${greeting} Your tutor profile is registered and ready! ✨${contactStatus}\n\n${leadsSection}${plansSection}`;
}

/**
 * Format the Coin Packages detail message when user asks about plans.
 */
export function formatCoinPlansMessage(): string {
  return `⚡ *ApnaTutorHub Tutor Coin Packages* 🪙

Unlock verified parent contact details instantly (keep 100% of the tuition fee directly from parents!):

🥉 *Starter Pack* — *₹500*
• 50 Coins (Unlock 1–2 Leads)
• Direct parent phone number & exact location
• Standard lead alerts

🥈 *Pro Pack (Most Popular)* — *₹1,000* 🔥
• 140 Coins (120 + 20 Bonus Coins!)
• Unlock 3–5 Leads
• Priority SMS & WhatsApp Lead Alerts

🥇 *Elite Pack (Best Value)* — *₹2,200* 💎
• 380 Coins (300 + 80 Bonus Coins!)
• Unlock 10+ Leads
• Dedicated Relationship Manager Support
• Featured Tutor Badge ⭐

──────────────────────────
👉 *Click to Recharge Your Wallet Now:*
https://apnatutorhub.com/tutor/wallet

👉 *Browse All Active Leads:*
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
    if (contactInfo.phone) parts.push(`📱 +91 ${contactInfo.phone}`);
    if (contactInfo.email) parts.push(`📧 ${contactInfo.email}`);
    contactStatus = `\n✅ *Request Registered for:* ${parts.join(" | ")}\n`;
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
