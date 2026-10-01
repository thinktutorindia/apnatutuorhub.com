/**
 * lib/whatsapp-bot/leads-helper.ts
 *
 * Real-time matching engine for the WhatsApp Chatbot.
 * Fetches verified student leads from PostgreSQL and formats them with
 * clean WhatsApp typography, live links, and Coin / Membership package details.
 */

import { prisma } from "@/lib/prisma";
import { extractPublicLocality, formatLeadBudget, isTill8thClass, leadSubjectsForClass } from "@/lib/lead-utils";
import { getLeadPointCost } from "@/lib/subscription-plans";
import { coversClassLevel, hasSubjectOverlap, extractGradeNumber, isGenderCompatible } from "@/lib/matching-engine";
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
/**
 * Extract all grade numbers from a class string (e.g. "Class 11", "Class 9-10", "11th", "till 8th", "upto 8th", "8 tak")
 */
export function extractAllGrades(s?: string | null): Set<number> {
  const grades = new Set<number>();
  if (!s) return grades;
  const str = s.toLowerCase();

  // 1. Match ranges like "1 to 8", "1-8", "class 1-8", "class 1 to 8", "9-10", "11-12"
  const rangeMatches = [...str.matchAll(/(?:class\s*)?(\d{1,2})\s*(?:to|-|–|—)\s*(\d{1,2})/gi)];
  for (const rm of rangeMatches) {
    const min = Math.min(parseInt(rm[1], 10), parseInt(rm[2], 10));
    const max = Math.max(parseInt(rm[1], 10), parseInt(rm[2], 10));
    for (let i = min; i <= max; i++) {
      if (i >= 1 && i <= 12) grades.add(i);
    }
  }

  // 2. Match "till 8th", "upto 8th", "below 8", "under 8", "8 tak", "8th tak", "class 8 tak"
  const uptoMatches = [
    ...str.matchAll(/(?:upto|till|below|under)\s*(?:class\s*)?(\d{1,2})(?:st|nd|rd|th)?/gi),
    ...str.matchAll(/(?:class\s*)?(\d{1,2})(?:st|nd|rd|th)?\s*tak\b/gi),
  ];
  for (const um of uptoMatches) {
    const max = parseInt(um[1], 10);
    if (max >= 1 && max <= 12) {
      for (let i = 1; i <= max; i++) {
        grades.add(i);
      }
    }
  }

  // 3. Match bucket keywords
  if (/primary|pre-primary|nursery|kg\b/i.test(str)) {
    for (let i = 1; i <= 5; i++) grades.add(i);
  }
  if (/middle\s*(?:school|classes)?/i.test(str)) {
    for (let i = 6; i <= 8; i++) grades.add(i);
  }
  if (/secondary\s*(?:school)?/i.test(str) && !/senior/i.test(str)) {
    grades.add(9);
    grades.add(10);
  }
  if (/senior\s*secondary/i.test(str)) {
    grades.add(11);
    grades.add(12);
  }

  // 4. Roman ranges e.g. "XI - XII", "VI to VIII", "I - V"
  const romanRangeMatches = [
    ...str.matchAll(/(?:class\s*)?([ivx]+)\s*(?:to|-|–|—|and|&)\s*(?:class\s*)?([ivx]+)/gi),
  ];
  const ROMAN_VALS: Record<string, number> = {
    i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12,
  };
  for (const rm of romanRangeMatches) {
    const start = ROMAN_VALS[rm[1]];
    const end = ROMAN_VALS[rm[2]];
    if (start && end) {
      const min = Math.min(start, end);
      const max = Math.max(start, end);
      for (let i = min; i <= max; i++) {
        if (i >= 1 && i <= 12) grades.add(i);
      }
    }
  }

  // 5. Discrete Roman numerals e.g. "XI", "XII", "X", "IX", "VIII"
  const romanDiscrete = [...str.matchAll(/\b(xii|xi|x|ix|viii|vii|vi|v|iv|iii|ii|i)\b/gi)];
  for (const rm of romanDiscrete) {
    const val = ROMAN_VALS[rm[1]];
    if (val) grades.add(val);
  }

  // 6. Discrete grade numbers e.g. "Class 5th, Class 9th", "11th", "10"
  const discreteMatches = [...str.matchAll(/\b([1-9]|1[0-2])(?:st|nd|rd|th)?\b/gi)];
  for (const dm of discreteMatches) {
    const num = parseInt(dm[1], 10);
    if (num >= 1 && num <= 12) grades.add(num);
  }

  return grades;
}

export type AcademicStream = "HUMANITIES" | "COMMERCE" | "SCIENCE" | "NONE";

/**
 * Detects senior stream specialization from class labels and subjects.
 */
export function detectStream(
  classStr?: string | null,
  subs?: string[] | null
): AcademicStream {
  const combined = `${classStr || ""} ${(subs || []).join(" ")}`.toLowerCase();

  // Humanities / Arts:
  if (
    /humanit|arts?\b|history|political\s*sci|pol\s*sci|geograph|psycholog|sociolog|philosophy|civics/i.test(
      combined
    )
  ) {
    return "HUMANITIES";
  }

  // Commerce:
  if (
    /commerce|account|accountancy|business\s*stud|bst\b|b\.com|ca\s*foundation/i.test(
      combined
    )
  ) {
    return "COMMERCE";
  }

  // Pure Science (Physics, Chemistry, Biology, Medical, Non-Medical):
  if (
    /jee|neet|medical|physic|chem|bio\b|biolog|botany|zoology|pcm\b|pcb\b/i.test(
      combined
    )
  ) {
    return "SCIENCE";
  }

  return "NONE";
}

export function isClassCompatible(tutorClassStr: string | undefined, leadClassStr: string): boolean {
  if (!tutorClassStr || !leadClassStr) return true;
  if (/all|any|general/i.test(tutorClassStr)) return true;

  const tutorGrades = extractAllGrades(tutorClassStr);
  const leadGrades = extractAllGrades(leadClassStr);

  if (tutorGrades.size > 0 && leadGrades.size > 0) {
    // If tutor is ONLY primary (grades <= 5), cannot match leads that require secondary/senior (Class 6+)
    const isTutorPurePrimary = [...tutorGrades].every((tg) => tg <= 5);
    const leadHasSeniorOrSecondary = [...leadGrades].some((lg) => lg >= 6);
    if (isTutorPurePrimary && leadHasSeniorOrSecondary) {
      return false;
    }

    // If tutor is ONLY senior (grades >= 11), cannot match leads that are purely below senior (Class <= 10)
    const isTutorPureSenior = [...tutorGrades].every((tg) => tg >= 11);
    const isLeadPureBelowSenior = [...leadGrades].every((lg) => lg <= 10);
    if (isTutorPureSenior && isLeadPureBelowSenior) {
      return false;
    }

    // If tutor is purely Class 1-8 (max grade <= 8), cannot match senior leads (Class 9-12)
    const isTutorPureBelow9 = [...tutorGrades].every((tg) => tg <= 8);
    const isLeadPureSenior = [...leadGrades].every((lg) => lg >= 9);
    if (isTutorPureBelow9 && isLeadPureSenior) {
      return false;
    }

    for (const tg of tutorGrades) {
      // Exact grade match
      if (leadGrades.has(tg)) return true;

      // Senior Secondary (Class 11 & 12 only match 11 & 12)
      if (tg === 11 && leadGrades.has(12)) return true;
      if (tg === 12 && leadGrades.has(11)) return true;

      // Secondary (Class 9 & 10 only match 9 & 10)
      if (tg === 9 && leadGrades.has(10)) return true;
      if (tg === 10 && leadGrades.has(9)) return true;

      // Middle School (Class 6, 7, 8 only match 6, 7, 8 if tutor teaches a range e.g. Class 1-8 or 6-8)
      if (tutorGrades.size > 1 && tg >= 6 && tg <= 8 && [...leadGrades].some((lg) => lg >= 6 && lg <= 8)) return true;

      // Primary range (if tutor specifically teaches a range like Class 1-5 or Class 1-8)
      if (tutorGrades.size > 1 && tg <= 5 && [...leadGrades].some((lg) => lg <= 5)) return true;
    }
    return false;
  }

  const tc = tutorClassStr.toLowerCase();
  const lc = leadClassStr.toLowerCase();
  if (/jee|iit/i.test(tc) && /jee|iit/i.test(lc)) return true;
  if (/neet|medical/i.test(tc) && /neet|medical/i.test(lc)) return true;

  return coversClassLevel([tutorClassStr], leadClassStr);
}

export function isSubjectCompatible(
  tutorSubs: string[] | undefined,
  leadSubs: string[],
  tutorClass?: string,
  leadClass?: string
): boolean {
  if (!tutorSubs || tutorSubs.length === 0) return true;
  const isTutorAllSubjects = tutorSubs.some((s) => /all\s*subject|all|any|general|combo/i.test(s));

  const tNorm = tutorSubs.map((s) => s.toLowerCase().trim());
  const lNorm = leadSubs.map((s) => s.toLowerCase().trim());

  const tutorGrades = extractAllGrades(tutorClass);
  const leadGrades = extractAllGrades(leadClass);

  const isSeniorLead =
    leadGrades.has(11) || leadGrades.has(12) || /11|12|jee|neet|college|b\.com|ba\b|senior/i.test(leadClass || "");
  const isSeniorTutor =
    tutorGrades.has(11) || tutorGrades.has(12) || /11|12|jee|neet|college|b\.com|ba\b|senior/i.test(tutorClass || "");

  const leadStream = detectStream(leadClass, leadSubs);
  const tutorStream = detectStream(tutorClass, tutorSubs);
  const leadIsAllCore = lNorm.some((l) => /all\s*core|all\s*subject/i.test(l));

  // ── STRICT SENIOR STREAM SEGREGATION (Class 11-12) ──
  // In senior secondary, streams are strictly segregated:
  // Science, Commerce, and Humanities are completely separate academic disciplines.
  if (isSeniorLead || isSeniorTutor) {
    // 1. Humanities / Arts Leads:
    if (leadStream === "HUMANITIES") {
      // Only tutors with Humanities subjects can match!
      // A pure Maths or Science or Commerce tutor MUST NEVER match Humanities leads.
      if (tutorStream !== "HUMANITIES") {
        return false;
      }
      if (leadIsAllCore) {
        return true;
      }
    }

    // 2. Commerce Leads:
    if (leadStream === "COMMERCE") {
      // Pure Science (Physics/Chem/Bio) or pure Humanities tutor must NEVER match Commerce leads.
      if (tutorStream === "HUMANITIES" || tutorStream === "SCIENCE") {
        return false;
      }
      // If tutor teaches Maths, only match if the Commerce lead specifically mentions Maths/Applied Maths.
      const tutorHasMath = tNorm.some((t) => /math|algebra|calculus/i.test(t));
      const leadWantsMath = lNorm.some((l) => /math|algebra|calculus/i.test(l));
      const tutorHasCommerce = tNorm.some((t) => /commerce|account|business|bst|economic/i.test(t));
      if (!tutorHasCommerce && tutorHasMath && !leadWantsMath) {
        return false;
      }
      if (tutorHasCommerce && leadIsAllCore) {
        return true;
      }
    }

    // 3. Science Leads:
    if (leadStream === "SCIENCE") {
      // Pure Humanities or pure Commerce tutor must NEVER match Science leads.
      if (tutorStream === "HUMANITIES" || tutorStream === "COMMERCE") {
        return false;
      }
      // Medical / Biology only leads must not match pure Maths tutor without Biology
      const leadIsPureBio = lNorm.some((l) => /bio|botany|zoology|neet/i.test(l)) && !lNorm.some((l) => /math/i.test(l));
      const tutorIsPureMath = tNorm.every((t) => /math/i.test(t));
      if (leadIsPureBio && tutorIsPureMath) {
        return false;
      }
      if (tutorStream === "SCIENCE" && leadIsAllCore) {
        return true;
      }
    }

    // 4. In Class 11-12, "All Core Subjects" / "All Subjects" does NOT exist across streams.
    // If a senior lead says "All Core Subjects" without explicit stream:
    // A single-subject specialist (like Maths only or Physics only) does NOT match unless that specific subject is mentioned.
    if (leadIsAllCore && !isTutorAllSubjects) {
      const hasSpecificSubMatch = tNorm.some((t) =>
        lNorm.some((l) => !/all\s*core|all\s*subject/i.test(l) && (l.includes(t) || t.includes(l)))
      );
      if (!hasSpecificSubMatch) {
        return false;
      }
    }
  }

  // ── CLASS 1 TO 8 COMPATIBILITY (User Rule) ──
  // "and for 1 to 8 any kind of subject choose them for all subjects for particluar class
  //  if they told till 8 all subject then we will shows like all 8 tk classes ki leads etc"
  const isPureBelow9Lead = leadGrades.size > 0 && [...leadGrades].every((g) => g <= 8);

  if (isPureBelow9Lead) {
    // If tutor teaches "All Subjects" or "till 8 all subjects", they match all Class 1-8 leads!
    if (isTutorAllSubjects) {
      return true;
    }

    // If the lead asks for "All Subjects" or "All Core Subjects":
    // For Class 1-8, any academic school subject tutor (Maths, Science, English, Hindi, SST, EVS)
    // for that class matches it!
    const leadIsAllSubjects = lNorm.some((l) => /all\s*subject|all\s*core|combo|general/i.test(l));
    if (leadIsAllSubjects) {
      const tutorHasAcademicSub = tNorm.some((t) =>
        /math|science|evs|english|hindi|social|sst|history|geography|physics|chem|bio/i.test(t)
      );
      if (tutorHasAcademicSub) {
        return true;
      }
    }
  }

  // If tutor teaches "All Subjects", and it's not a senior stream clash, they match
  if (isTutorAllSubjects) {
    return true;
  }

  // ── GENERAL SUBJECT MATCHING ──
  for (const t of tNorm) {
    for (const l of lNorm) {
      // Exact or substring match
      if (t === l) return true;

      // In non-senior classes (Class 1-10), lead asking for "All Subjects" matches core academic tutors
      if ((l.includes("all subject") || l.includes("all core")) && !isSeniorLead) {
        if (/math|science|english|hindi|social|sst|evs/i.test(t)) {
          return true;
        }
      }

      // Maths stem
      if (/math|algebra|calculus|geometry/i.test(t) && /math|algebra|calculus|geometry/i.test(l)) return true;

      // Science stem
      if (/science/i.test(t) && /science|physics|chemistry|biology|evs/i.test(l)) return true;
      if (/science/i.test(l) && /science|physics|chemistry|biology|evs/i.test(t)) return true;

      // Physics / Chemistry / Biology
      if (/physic/i.test(t) && /physic/i.test(l)) return true;
      if (/chem/i.test(t) && /chem/i.test(l)) return true;
      if (/bio\b|biolog/i.test(t) && /bio\b|biolog/i.test(l)) return true;

      // English
      if (/english/i.test(t) && /english/i.test(l)) return true;

      // Hindi
      if (/hindi/i.test(t) && /hindi/i.test(l)) return true;

      // Social Studies / SST / History / Geography / Civics / Pol Science
      if (
        /social|sst\b|history|geography|civics|pol\s*sci/i.test(t) &&
        /social|sst\b|history|geography|civics|pol\s*sci/i.test(l)
      ) return true;

      // Commerce / Accounts / Business Studies / Economics
      if (
        /commerce|account|business|bst\b/i.test(t) &&
        /commerce|account|business|bst\b/i.test(l)
      ) return true;
      if (/economic/i.test(t) && /economic/i.test(l)) return true;

      // Computer / Coding / Python / IP / CS
      if (
        /computer|coding|python|\bcs\b|\bip\b|informatics|programming/i.test(t) &&
        /computer|coding|python|\bcs\b|\bip\b|informatics|programming/i.test(l)
      ) return true;

      // Languages
      if (/french/i.test(t) && /french/i.test(l)) return true;
      if (/german/i.test(t) && /german/i.test(l)) return true;
      if (/spanish/i.test(t) && /spanish/i.test(l)) return true;
      if (/sanskrit/i.test(t) && /sanskrit/i.test(l)) return true;
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
  subjects?: string[],
  tutorGender?: string | null
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
        tutorGenderPref: true,
      },
    });

    const hasSpecificClass = Boolean(classLevel && !/all|any|general/i.test(classLevel));

    // Hard Constraint Filtering: class compatibility + subject compatibility + gender compatibility
    const candidatePool = rawLeads.filter((lead) => {
      if (hasSpecificClass && !isClassCompatible(classLevel, lead.classLevel)) {
        return false;
      }
      if (!isSubjectCompatible(subjects, lead.subjects, classLevel, lead.classLevel)) {
        return false;
      }
      if (tutorGender && !isGenderCompatible(tutorGender, lead.tutorGenderPref)) {
        return false;
      }
      return true;
    });

    // Zero-match deterministic integrity: If no leads match the tutor's hard constraints,
    // NEVER fall back to stripping the class filter. Return empty array so the bot can inform the tutor honestly.
    if (candidatePool.length === 0) {
      return [];
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

      // Exact subject match bonus
      if (subjects && subjects.length > 0) {
        const leadSubsLower = lead.subjects.map((s) => s.toLowerCase());
        const hasExactSub = subjects.some((s) => leadSubsLower.includes(s.toLowerCase()));
        if (hasExactSub) {
          score += 40;
        }
      }

      return { lead, score };
    });

    scored.sort((a, b) => b.score - a.score);

    // Deduplicate leads: ensure we don't display duplicate inquiries from the same student/area
    const seenSignatures = new Set<string>();
    const deduplicated: Array<{ lead: (typeof rawLeads)[number]; score: number }> = [];

    for (const item of scored) {
      const cleanArea = (item.lead.area || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const cleanClass = (item.lead.classLevel || "").toLowerCase();
      const cleanSubs = item.lead.subjects.slice().sort().join("_").toLowerCase();
      const sig = `${cleanArea}_${cleanClass}_${cleanSubs}_${item.lead.budgetMin ?? 0}`;
      if (seenSignatures.has(sig)) continue;
      seenSignatures.add(sig);
      deduplicated.push(item);
      if (deduplicated.length >= 3) break;
    }

    return deduplicated.map(({ lead }) => {
      return {
        inquiryNumber: lead.inquiryNumber,
        classLevel: lead.classLevel,
        subjects: leadSubjectsForClass(lead.classLevel, lead.subjects).slice(0, 3),
        area: extractPublicLocality(lead.area, lead.city) || lead.city || "Delhi",
        city: lead.city || "Delhi",
        budget: formatLeadBudget(lead, "full"),
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
    leadsSection = `\n\n📋 *Matching Leads Alert:*\nAbhi ${locationLabel} mein aapki selected class aur subjects ke liye koi open requirement pending nahi hai.\nJaise hi parent nayi requirement post karenge, aapko sabse pehle instant WhatsApp alert aayega! 🔔\n\nDelhi NCR aur Online ke sabhi 600+ leads explore karne ke liye website login karein: https://apnatutorhub.com/tutor/leads`;
  }

  const plansSection = `\n\n──────────────────────────\n` +
    `🔓 *Lead unlock karne ke liye:*\n` +
    `\n🔥 *₹999 Growth Membership* (60 Points · ~5% of one month's fee)\n` +
    `• Class 1–8: 10 coins · up to 6 leads\n` +
    `• Class 9–10: 20 coins · up to 3 leads\n` +
    `• Class 11–12 / JEE / NEET: 30 coins · up to 2 leads\n` +
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
• Coin cost is about *5% of one month's fee*
  - Class 1–8: *10 coins* · up to 6 leads
  - Class 9–10: *20 coins* · up to 3 leads
  - Class 11–12 / JEE / NEET: *30 coins* · up to 2 leads
• *0% Commission* — Keep 100% tuition fees
• *Low Competition* — Max 3 tutors per lead
• *Direct Parent Contact* — Phone number + address
• *Valid for 30 Days* across Delhi NCR & Online

👉 *Abhi Plan Activate Karein:*
https://apnatutorhub.com/tutor/plans

👉 *All Available Leads:*
https://apnatutorhub.com/tutor/leads`;
}

export function formatCoinBalanceMessage(balance: number): string {
  if (balance > 0) {
    return `Aapke wallet mein *${balance} coins* hain. 🪙\n\nInhi coins se student leads unlock ho jayengi. Naya coin pack lene ki zaroorat nahi hai.\n\n👉 *Leads unlock karein:* https://apnatutorhub.com/tutor/leads\n👉 *Wallet:* https://apnatutorhub.com/tutor/wallet`;
  }
  return `Aapke wallet mein abhi *0 coins* hain.\n\n${formatCoinPlansMessage()}`;
}

export async function getTutorCoinBalanceByPhone(phone?: string | null): Promise<{
  found: boolean;
  balance: number;
}> {
  if (!phone) return { found: false, balance: 0 };
  const digits = phone.replace(/\D/g, "");
  const phone10 = digits.slice(-10);
  if (phone10.length < 10) return { found: false, balance: 0 };
  const variants = Array.from(new Set([
    phone10,
    `91${phone10}`,
    `+91${phone10}`,
    digits,
    `+${digits}`,
  ]));
  const user = await prisma.user.findFirst({
    where: {
      OR: variants.map((p) => ({ phone: p })),
      tutorProfile: { isNot: null },
    },
    select: {
      tutorProfile: {
        select: { wallet: { select: { balance: true } } },
      },
    },
  });
  if (!user?.tutorProfile) return { found: false, balance: 0 };
  return { found: true, balance: user.tutorProfile.wallet?.balance ?? 0 };
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

/**
 * Format a single lead requirement card when a tutor searches/asks about an inquiry number
 * like #32042, ATH-32042, or clicks "Unlock Lead #32042".
 */
export async function formatSingleLeadInquiry(
  inquiryNumber: number,
  tutorPhone?: string
): Promise<{ reply: string; quickReplies: string[] }> {
  const lead = await prisma.lead.findFirst({
    where: { inquiryNumber },
    include: {
      parentProfile: {
        include: {
          user: {
            select: { name: true },
          },
        },
      },
    },
  });

  if (!lead) {
    return {
      reply: `❌ Requirement *#${inquiryNumber}* nahi mili ya expire ho chuki hai.\n\nDelhi NCR ki active tuition requirements dekhne ke liye reply karein *LEADS* ya dashboard check karein:\n👉 https://apnatutorhub.com/tutor/leads`,
      quickReplies: ["View All Leads 📋", "💎 Membership Plans", "Help / Support 📞"],
    };
  }

  // Check tutor profile & gender compatibility
  let tutorGender: string | null = null;
  if (tutorPhone) {
    const raw = tutorPhone.replace(/\D/g, "");
    const phone10 = raw.slice(-10);
    const tutorUser = await prisma.user.findFirst({
      where: {
        OR: [{ phone: raw }, { phone: phone10 }, { phone: `91${phone10}` }],
        tutorProfile: { isNot: null },
      },
      include: { tutorProfile: true },
    });
    if (tutorUser?.tutorProfile?.gender) {
      tutorGender = tutorUser.tutorProfile.gender.toUpperCase();
    }
  }

  const displaySubjects = leadSubjectsForClass(lead.classLevel, lead.subjects);
  const subjStr = displaySubjects.length > 0 ? displaySubjects.join(", ") : "All Core Subjects";
  const modeStr = isTill8thClass(lead.classLevel) || lead.mode === "OFFLINE"
    ? "Home Visit 🏡"
    : lead.mode === "ONLINE"
      ? "Online Class 💻"
      : "Home Visit / Online";
  const budgetStr = formatLeadBudget(lead, "full");

  const locStr = extractPublicLocality([lead.area, lead.city].filter(Boolean).join(", "), lead.city) || lead.city || "Delhi";

  let genderNote = "";
  if (lead.tutorGenderPref && lead.tutorGenderPref !== "ANY") {
    const pref = lead.tutorGenderPref.toUpperCase();
    if (pref === "FEMALE") {
      genderNote = `\n⚠️ *Tutor Preference:* Female Tutor Only 👩`;
      if (tutorGender === "MALE") {
        genderNote += `\n*(Note: Parent ne female teacher prefer ki hai. Agar aap male tutor hain to similar requirement #32043 check karein.)*`;
      }
    } else if (pref === "MALE") {
      genderNote = `\n⚠️ *Tutor Preference:* Male Tutor Only 👨`;
    }
  }

  const isClosed = lead.status !== "ACTIVE" && lead.status !== "MATCHING" && lead.status !== "APPLICATIONS_RECEIVED";
  const coinCost = getLeadPointCost(lead.classLevel, lead.budgetMin, lead.budgetMax);
  const tutorBalance = tutorPhone ? await getTutorCoinBalanceByPhone(tutorPhone) : { found: false, balance: 0 };

  let statusWarning = "";
  if (isClosed) {
    statusWarning = `\n\n⚠️ *Status:* Yeh lead close ho chuki hai (${lead.status}).`;
  }

  const unlockGuide = tutorBalance.found && tutorBalance.balance > 0
    ? `Aapke wallet mein *${tutorBalance.balance} coins* hain. Is lead ke liye *${coinCost} coins* lagte hain — naya pack lene ki zaroorat nahi.\n` +
      `👉 https://apnatutorhub.com/tutor/leads?inquiry=${lead.inquiryNumber}`
    : `💎 *Unlock Karne Ke Tarike:*\n` +
      `1. Website par link open karein aur Unlock par click karein.\n` +
      `2. Is lead ki cost *${coinCost} coins* hai (~5% of one month's fee).\n` +
      `3. ₹999 Growth Membership (30 days, 0% commission) se bhi unlock hota hai.\n\n` +
      `👉 *Membership Plans:*\nhttps://apnatutorhub.com/tutor/plans`;

  const message =
    `📋 *Student Requirement #${lead.inquiryNumber}*\n\n` +
    `📚 *Class:* ${lead.classLevel || "Standard"}\n` +
    `📖 *Subjects:* ${subjStr}\n` +
    `📍 *Location:* ${locStr}\n` +
    `🏠 *Teaching Mode:* ${modeStr}\n` +
    `💰 *Budget / Fees:* ${budgetStr}` +
    `${genderNote}` +
    `${statusWarning}\n\n` +
    `──────────────────────────\n` +
    `${unlockGuide}`;

  return {
    reply: message,
    quickReplies: [
      `🔥 Unlock Lead #${lead.inquiryNumber}`,
      "View All Leads 📋",
      "💎 Membership Plans",
    ],
  };
}

