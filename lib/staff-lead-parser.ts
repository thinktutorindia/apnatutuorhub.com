/**
 * lib/staff-lead-parser.ts
 *
 * Universal Multi-Format Lead Ingestion Engine.
 * Supports:
 * 1. JSON (raw array of objects or single objects)
 * 2. CSV / TSV / Excel table copy-pastes
 * 3. WhatsApp chat exports (with/without bracketed timestamps, narrow non-breaking spaces)
 * 4. Multi-profile unstructured message dumps, contact lists & CV snippets
 * 5. Freeform emails, forms, and custom contact lists
 */

import { extractLeadsBatch, extractLeadDataFast, isJunkMessage, type ParsedLead } from "./gemini-lead-extractor";

// ─── WhatsApp Timestamp Pattern (matches standard spaces, non-breaking spaces \u202F \u00A0) ───
const WA_TIMESTAMP_PATTERN = /^(?:\[\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4},?[\s\u202F\u00A0]*\d{1,2}:\d{2}(?::\d{2})?[\s\u202F\u00A0]*(?:am|pm|AM|PM)?\]|\[\d{1,2}:\d{2}(?::\d{2})?[\s\u202F\u00A0]*(?:am|pm|AM|PM)?,?[\s\u202F\u00A0]*\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\]|\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4},?[\s\u202F\u00A0]*\d{1,2}:\d{2}(?::\d{2})?[\s\u202F\u00A0]*(?:am|pm|AM|PM)?[\s\u202F\u00A0]*-[\s\u202F\u00A0]*)/i;

// ─── Cleaners & Normalizers ──────────────────────────────────────────────────
function formatCleanLocation(loc: string | null | undefined): string | null {
  if (!loc) return null;
  let s = String(loc).replace(/^["'`*\s,;]+|["'`*\s,;]+$/g, "").trim();
  if (!s || ["-", "--", "na", "null", "none", "?"].includes(s.toLowerCase())) return null;

  const LOCALITIES: Array<[string, RegExp]> = [
    // South Delhi
    ["Vasant Vihar, South Delhi", /\bvasant\s*vihar\b/i],
    ["Vasant Kunj, South Delhi", /\bvasant\s*kunj\b/i],
    ["Moti Bagh, South Delhi", /\bmoti\s*bagh\b/i],
    ["Nanakpura, South Delhi", /\bnanakpura\b/i],
    ["Saket, South Delhi", /\bsaket\b/i],
    ["Hauz Khas, South Delhi", /\bhauz\s*khas\b/i],
    ["Malviya Nagar, South Delhi", /\bmalviya\s*nagar\b/i],
    ["Greater Kailash, South Delhi", /\b(?:greater\s*kailash|gk\s*[12]|gk)\b/i],
    ["Lajpat Nagar, South Delhi", /\blajpat\s*nagar\b/i],
    ["South Extension, South Delhi", /\bsouth\s*ex(?:tension)?\b/i],
    ["Sarita Vihar, South Delhi", /\bsarita\s*vihar\b/i],
    ["Kalkaji, South Delhi", /\bkalkaji\b/i],
    ["Munirka, South Delhi", /\bmunirka\b/i],
    ["Safdarjung, South Delhi", /\bsafdarjung\b/i],
    ["Chhatarpur, South Delhi", /\bchhatarpur\b/i],
    ["Sainik Farm, South Delhi", /\bsainik\s*farm\b/i],
    ["Nehru Place, South Delhi", /\bnehru\s*place\b/i],
    ["Okhla, South Delhi", /\bokhla\b/i],
    ["Mehrauli, South Delhi", /\bmehrauli\b/i],
    ["Khanpur, South Delhi", /\bkhanpur\b/i],
    ["Jasola, South Delhi", /\bjasola\b/i],

    // South West Delhi
    ["Dwarka, South West Delhi", /\bdwarka\b/i],
    ["Kapashera, South West Delhi", /\bkapashera\b/i],

    // West Delhi
    ["Janakpuri, West Delhi", /\bjanakpuri\b/i],
    ["Uttam Nagar, West Delhi", /\buttam\s*nagar\b/i],
    ["Tilak Nagar, West Delhi", /\btilak\s*nagar\b/i],
    ["Rajouri Garden, West Delhi", /\brajouri\s*garden\b/i],
    ["Punjabi Bagh, West Delhi", /\bpunjabi\s*bagh\b/i],
    ["Paschim Vihar, West Delhi", /\bpaschim\s*vihar\b/i],
    ["Vikaspuri, West Delhi", /\bvikaspuri\b/i],
    ["Patel Nagar, Central Delhi", /\bpatel\s*nagar\b/i],
    ["Kirti Nagar, West Delhi", /\bkirti\s*nagar\b/i],
    ["Tagore Garden, West Delhi", /\btagore\s*garden\b/i],
    ["Subhash Nagar, West Delhi", /\bsubhash\s*nagar\b/i],
    ["Moti Nagar, West Delhi", /\bmoti\s*nagar\b/i],
    ["Naraina, West Delhi", /\bnaraina\b/i],
    ["Hari Nagar, West Delhi", /\bhari\s*nagar\b/i],

    // North West Delhi
    ["Rohini, North West Delhi", /\brohini\b/i],
    ["Pitampura, North West Delhi", /\b(?:pitampura|pritampura)\b/i],
    ["Ashok Vihar, North West Delhi", /\bashok\s*vihar\b/i],
    ["Shalimar Bagh, North West Delhi", /\bshalimar\s*bagh\b/i],
    ["Wazirpur, North West Delhi", /\bwazirpur\b/i],
    ["Keshav Puram, North West Delhi", /\bkeshav\s*puram\b/i],
    ["Rani Bagh, North West Delhi", /\brani\s*bagh\b/i],

    // North Delhi
    ["Model Town, North Delhi", /\bmodel\s*town\b/i],
    ["Mukherjee Nagar, North Delhi", /\b(?:mukherjee|mukhrjee)\s*nagar\b/i],
    ["GTB Nagar, North Delhi", /\bgtb\s*nagar\b/i],
    ["Kamla Nagar, North Delhi", /\bkamla\s*nagar\b/i],
    ["Civil Lines, North Delhi", /\bcivil\s*lines\b/i],
    ["Shastri Nagar, North Delhi", /\bshastri\s*nagar\b/i],
    ["Adarsh Nagar, North Delhi", /\badarsh\s*nagar\b/i],
    ["Vijay Nagar, North Delhi", /\bvijay\s*nagar\b/i],
    ["Sant Nagar, North Delhi", /\bsant\s*nagar\b/i],
    ["Burari, North Delhi", /\bburari\b/i],

    // East Delhi
    ["Mayur Vihar, East Delhi", /\bmayur\s*vihar\b/i],
    ["Laxmi Nagar, East Delhi", /\blaxmi\s*nagar\b/i],
    ["Preet Vihar, East Delhi", /\bpreet\s*vihar\b/i],
    ["Nirman Vihar, East Delhi", /\bnirman\s*vihar\b/i],
    ["Shahdara, East Delhi", /\bshahdara\b/i],
    ["Dilshad Garden, East Delhi", /\bdilshad\s*garden\b/i],
    ["Patparganj, East Delhi", /\bpatparganj\b/i],
    ["Anand Vihar, East Delhi", /\banand\s*vihar\b/i],
    ["Johripur, East Delhi", /\bjohripur\b/i],
    ["Geeta Colony, East Delhi", /\bgeeta\s*colony\b/i],

    // Central & Old Delhi
    ["Connaught Place, Central Delhi", /\b(?:connaught\s*place|cp)\b/i],
    ["Karol Bagh, Central Delhi", /\bkarol\s*bagh\b/i],
    ["Rajinder Nagar, Central Delhi", /\braj(?:inder|endra)\s*nagar\b/i],
    ["Daryaganj, Central Delhi", /\bdaryaganj\b/i],
    ["Chandni Chowk, Central Delhi", /\bchandni\s*chowk\b/i],
    ["Paharganj, Central Delhi", /\bpahar\s*ganj\b/i],
    ["Kashmiri Gate, Old Delhi", /\bkashmiri\s*gate\b/i],

    // Greater Noida
    ["Alpha 2, Greater Noida", /\balpha\s*2\b/i],
    ["Alpha 1, Greater Noida", /\balpha\s*1\b/i],
    ["Beta, Greater Noida", /\bbeta\b/i],
    ["Gamma, Greater Noida", /\bgamma\b/i],
    ["Delta, Greater Noida", /\bdelta\b/i],
    ["Pari Chowk, Greater Noida", /\bpari\s*chowk\b/i],
    ["Knowledge Park, Greater Noida", /\bknowledge\s*park\b/i],
    ["Sector Pi, Greater Noida", /\b(?:sector\s*pi|alstonia)\b/i],
    ["Jalpura, Greater Noida", /\bjalpura\b/i],
    ["Greater Noida, NCR", /\bgreater\s*noida\b/i],

    // Noida
    ["Sector 49, Noida", /\b(?:sector\s*49|barola)\b/i],
    ["Sector 62, Noida", /\bsector\s*62\b/i],
    ["Sector 18, Noida", /\bsector\s*18\b/i],
    ["Sector 15, Noida", /\bsector\s*15\b/i],
    ["Sector 137, Noida", /\bsector\s*137\b/i],
    ["Sector 76, Noida", /\bsector\s*76\b/i],
    ["Sector 50, Noida", /\bsector\s*50\b/i],
    ["Noida, UP", /\bnoida\b/i],

    // Gurgaon
    ["DLF Phase 1, Gurgaon", /\bdlf\s*phase\s*1\b/i],
    ["DLF Phase 2, Gurgaon", /\bdlf\s*phase\s*2\b/i],
    ["DLF Phase 3, Gurgaon", /\bdlf\s*phase\s*3\b/i],
    ["DLF Phase 4, Gurgaon", /\bdlf\s*phase\s*4\b/i],
    ["DLF Phase 5, Gurgaon", /\bdlf\s*phase\s*5\b/i],
    ["Sushant Lok, Gurgaon", /\bsushant\s*lok\b/i],
    ["Sector 82, Gurgaon", /\bsector\s*82\b/i],
    ["Sector 43, Gurgaon", /\bsector\s*43\b/i],
    ["Sector 54, Gurgaon", /\bsector\s*54\b/i],
    ["Sector 56, Gurgaon", /\bsector\s*56\b/i],
    ["Sector 14, Gurgaon", /\bsector\s*14\b/i],
    ["Gurugram, Haryana", /\b(?:gurgaon|gurugram)\b/i],

    // Faridabad
    ["Sector 16, Faridabad", /\bsector\s*16\b/i],
    ["Sector 21, Faridabad", /\bsector\s*21\b/i],
    ["Sector 15, Faridabad", /\bsector\s*15\b/i],
    ["NIT, Faridabad", /\bnit\s*(?:faridabad)?\b/i],
    ["Faridabad, Haryana", /\bfaridabad\b/i],

    // Ghaziabad
    ["Indirapuram, Ghaziabad", /\bindirapuram\b/i],
    ["Vaishali, Ghaziabad", /\bvaishali\b/i],
    ["Vasundhara, Ghaziabad", /\bvasundhara\b/i],
    ["Raj Nagar, Ghaziabad", /\braj\s*nagar\b/i],
    ["Ghaziabad, NCR", /\bghaziabad\b/i],

    // General Zone Fallbacks
    ["South Delhi", /\bsouth\s*delhi\b/i],
    ["North Delhi", /\bnorth\s*delhi\b/i],
    ["East Delhi", /\beast\s*delhi\b/i],
    ["West Delhi", /\bwest\s*delhi\b/i],
    ["Central Delhi", /\bcentral\s*delhi\b/i],
    ["North West Delhi", /\bnorth\s*west(?:\s*delhi)?\b/i],
    ["South West Delhi", /\bsouth\s*west(?:\s*delhi)?\b/i],
    ["North East Delhi", /\bnorth\s*east(?:\s*delhi)?\b/i],
    ["Delhi, NCR", /\bdelhi\b/i],
  ];

  for (const [name, pattern] of LOCALITIES) {
    if (pattern.test(s)) {
      return name;
    }
  }

  s = s.replace(/_/g, " ");
  if (s === s.toLowerCase()) {
    s = s.replace(/\b\w/g, (c) => c.toUpperCase());
  }

  return s.trim() || null;
}

const SYSTEM_SUBJECT_LIST = [
  "Mathematics", "Physics", "Chemistry", "Biology", "Science",
  "English", "Hindi", "Social Studies", "History", "Geography",
  "Political Science", "Sanskrit", "Economics", "Accountancy",
  "Business Studies", "Psychology", "Sociology", "Computer Science",
  "Python", "Java", "Coding", "Web Development", "Spoken English",
  "French", "German", "Spanish", "Art & Drawing", "Music", "Dance",
  "EVS", "Vedic Maths", "Phonics", "Abacus", "All Subjects"
];

function formatCleanName(val: string | null | undefined): string | null {
  if (!val) return null;
  const s = String(val).replace(/^["'`*\s,;]+|["'`*\s,;]+$/g, "").replace(/\s+/g, " ").trim();
  if (!s || ["-", "--", "na", "none", "null", "nil", "tutor", "parent", "student"].includes(s.toLowerCase())) return null;
  if (/^\d+$/.test(s)) return null;
  return s
    .split(" ")
    .map((w) => (w.length > 1 ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w.toUpperCase()))
    .join(" ");
}

function formatCleanQualification(val: string | null | undefined): string | null {
  if (!val) return null;
  const s = String(val).replace(/^["'`*\s,;]+|["'`*\s,;]+$/g, "").replace(/\s+/g, " ").trim();
  if (!s || ["-", "--", "na", "none", "null", "nil", "?", "/"].includes(s.toLowerCase())) return null;

  const sLow = s.toLowerCase();
  if (sLow.includes("b.ed") || sLow.includes("bed")) {
    if (sLow.includes("m.a") || sLow.includes("ma")) return "M.A, B.Ed";
    if (sLow.includes("m.com") || sLow.includes("mcom")) return "M.Com, B.Ed";
    if (sLow.includes("m.sc") || sLow.includes("msc")) return "M.Sc, B.Ed";
    if (sLow.includes("b.a") || sLow.includes("ba")) return "B.A, B.Ed";
    if (sLow.includes("b.sc") || sLow.includes("bsc")) return "B.Sc, B.Ed";
    if (sLow.includes("b.com") || sLow.includes("bcom")) return "B.Com, B.Ed";
    return "B.Ed";
  }
  if (sLow.includes("physiotherapy")) {
    if (sLow.includes("pursuing") || sLow.includes("student")) return "Bachelor of Physiotherapy (Pursuing)";
    return "Bachelor of Physiotherapy";
  }
  if (sLow.includes("bca")) return "BCA";
  if (sLow.includes("mca")) return "MCA";
  if (sLow.includes("b.tech") || sLow.includes("btech")) {
    if (sLow.includes("2nd") || sLow.includes("2 year")) return "B.Tech (2nd Year)";
    if (sLow.includes("3rd") || sLow.includes("3 year")) return "B.Tech (3rd Year)";
    if (sLow.includes("4th") || sLow.includes("final")) return "B.Tech (Final Year)";
    if (sLow.includes("pursuing")) return "B.Tech (Pursuing)";
    return "B.Tech";
  }
  if (sLow.includes("m.tech") || sLow.includes("mtech")) return "M.Tech";
  if (sLow.includes("b.sc") || sLow.includes("bsc")) {
    if (sLow.includes("medical")) return "B.Sc (Medical)";
    if (sLow.includes("non medical")) return "B.Sc (Non-Medical)";
    if (sLow.includes("pursuing")) return "B.Sc (Pursuing)";
    return "B.Sc";
  }
  if (sLow.includes("m.sc") || sLow.includes("msc")) return "M.Sc";
  if (sLow.includes("b.com") || sLow.includes("bcom")) {
    if (sLow.includes("pursuing")) return "B.Com (Pursuing)";
    return "B.Com";
  }
  if (sLow.includes("m.com") || sLow.includes("mcom")) return "M.Com";
  if (sLow.includes("b.a") || sLow.includes("ba")) {
    if (sLow.includes("pursuing")) return "B.A (Pursuing)";
    return "B.A";
  }
  if (sLow.includes("m.a") || sLow.includes("ma")) {
    if (sLow.includes("pol")) return "M.A (Political Science)";
    if (sLow.includes("eng")) return "M.A (English)";
    if (sLow.includes("eco")) return "M.A (Economics)";
    return "M.A";
  }
  if (sLow.includes("12")) {
    if (sLow.includes("science")) return "12th Pass (Science)";
    if (sLow.includes("commerce")) return "12th Pass (Commerce)";
    if (sLow.includes("arts") || sLow.includes("humanities")) return "12th Pass (Arts)";
    return "12th Pass";
  }
  if (sLow.includes("post graduate") || sLow.includes("pg")) return "Post Graduate";
  if (sLow.includes("graduate") || sLow.includes("graduation")) {
    if (sLow.includes("pursuing") || sLow.includes("persuing")) return "Pursuing Graduation";
    return "Graduate";
  }

  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatCleanClasses(raw: string | string[] | undefined | null): string[] {
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : String(raw).split(/[,;/|&]+/);
  const result: string[] = [];

  for (const item of list) {
    const s = String(item).replace(/^["'`*\s,;]+|["'`*\s,;]+$/g, "").trim();
    if (!s || ["-", "--", "na", "none", "null", "nil", "?"].includes(s.toLowerCase())) continue;

    const sLow = s.toLowerCase();
    const mRange = sLow.match(/\b(?:class\s*)?(lkg|ukg|nursery|kg|\d{1,2})(?:st|nd|rd|th)?\s*(?:to|-)\s*(?:class\s*)?(lkg|ukg|nursery|kg|\d{1,2}|prep\w*|comp\w*)(?:st|nd|rd|th)?\b/);
    if (mRange) {
      const c1 = mRange[1].toUpperCase();
      const c2 = mRange[2].toUpperCase();
      const startStr = /^\d+$/.test(c1) ? `Class ${c1}` : c1;
      let endStr = /^\d+$/.test(c2) ? `Class ${c2}` : c2;
      if (c2.includes("PREP") || c2.includes("COMP")) endStr = "Competitive Exams";
      
      if (startStr.startsWith("Class ") && endStr.startsWith("Class ")) {
        result.push(`Class ${c1} to ${c2}`);
      } else {
        result.push(`${startStr} to ${endStr}`);
      }
      continue;
    }

    const mSingle = sLow.match(/\b(?:class\s*)?(\d{1,2})(?:st|nd|rd|th)?\b/);
    if (mSingle) {
      result.push(`Class ${mSingle[1]}`);
      continue;
    }

    if (["lkg", "ukg", "nursery", "kg", "kindergarten"].some((w) => sLow.includes(w))) {
      result.push("Pre-Primary (Nursery-KG)");
      continue;
    }

    if (["prep", "competition", "competitive"].some((w) => sLow.includes(w))) {
      result.push("Competitive Exams");
      continue;
    }

    result.push(s.charAt(0).toUpperCase() + s.slice(1));
  }

  return [...new Set(result)];
}

function formatCleanSubjects(raw: string | string[] | undefined | null, classesList?: string[]): string[] {
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : String(raw).split(/[,;/|&]+/);
  const rawStr = list.join(" ; ").replace(/^["'`*\s,;]+|["'`*\s,;]+$/g, "").trim();
  if (!rawStr || ["-", "--", "na", "null", "none", "nil", "?"].includes(rawStr.toLowerCase())) return [];

  const extracted = new Set<string>();

  const patterns: Array<[string, RegExp]> = [
    ["Mathematics", /\b(?:maths?|mathematic[s]?|mathmatics|algebra|calculus|geometry|trigonometry|ganit)\b/i],
    ["Physics", /\b(?:physics?|phy|bhautiki)\b/i],
    ["Chemistry", /\b(?:chemistry?|chem|rasayan)\b/i],
    ["Biology", /\b(?:biology?|bio|botany|zoology|jeev\s*vigyan)\b/i],
    ["Science", /\b(?:science|sci|general\s*science|vigyan)\b/i],
    ["English", /\b(?:english|eng|spoken\s*english|english\s*grammar|english\s*literature)\b/i],
    ["Hindi", /\b(?:hindi|hin|vyakaran)\b/i],
    ["Social Studies", /\b(?:s\.?s\.?t\.?|social\s*studies|social\s*science|social|civics|polity)\b/i],
    ["History", /\b(?:history|itihas)\b/i],
    ["Geography", /\b(?:geography|bhugol)\b/i],
    ["Political Science", /\b(?:political\s*science|pol\s*sci|pol\.?\s*science)\b/i],
    ["EVS", /\b(?:evs|environmental\s*science|environment)\b/i],
    ["Computer Science", /\b(?:computer\s*science|computer|computers|cs|coding|programming|python|java|c\+\+|web\s*development|it|informatics)\b/i],
    ["Accountancy", /\b(?:accountancy|accounts?|accounting|book\s*keeping)\b/i],
    ["Economics", /\b(?:economics?|eco|arthshastra)\b/i],
    ["Business Studies", /\b(?:business\s*studies|bst|business\s*management|commerce)\b/i],
    ["Sanskrit", /\b(?:sanskrit|sans)\b/i],
    ["French", /\b(?:french)\b/i],
    ["German", /\b(?:german|deutsch)\b/i],
    ["Spanish", /\b(?:spanish)\b/i],
    ["Psychology", /\b(?:psychology|psy)\b/i],
    ["Sociology", /\b(?:sociology|soc)\b/i],
    ["Art & Drawing", /\b(?:art\s*&\s*drawing|art|drawing|painting|sketching)\b/i],
    ["Music", /\b(?:music|guitar|piano|vocal|singing|harmonium)\b/i],
    ["Dance", /\b(?:dance|kathak|bharatanatyam)\b/i],
    ["Vedic Maths", /\b(?:vedic\s*maths?)\b/i],
    ["Phonics", /\b(?:phonics)\b/i],
    ["Abacus", /\b(?:abacus)\b/i],
    ["All Subjects", /\b(?:all\s*subjects?|all\s*sub|all)\b/i],
  ];

  for (const [canonical, pat] of patterns) {
    if (pat.test(rawStr)) {
      extracted.add(canonical);
    }
  }

  if (extracted.size === 0) {
    const parts = rawStr.split(/[,;/|&]+|\band\b/i);
    for (const p of parts) {
      const pClean = p.replace(/^["'`*()\[\]\s]+|["'`*()\[\]\s]+$/g, "").trim();
      if (pClean && !["-", "none", "na", "nil", "all", "sub", "subject", "subjects"].includes(pClean.toLowerCase())) {
        extracted.add(pClean.charAt(0).toUpperCase() + pClean.slice(1));
      }
    }
  }

  // If pure "All Subjects" or empty
  if (extracted.has("All Subjects") || extracted.size === 0) {
    extracted.delete("All Subjects");
    const classText = (classesList || []).join(" ").toLowerCase();
    const hasPrimary = ["lkg", "ukg", "nursery", "kg", "1", "2", "3", "4", "5"].some((w) => classText.includes(w));
    const hasMiddle = ["6", "7", "8"].some((w) => classText.includes(w));
    const hasSecondary = ["9", "10"].some((w) => classText.includes(w));

    if (hasPrimary || !classesList || classesList.length === 0) {
      extracted.add("Mathematics");
      extracted.add("Science");
      extracted.add("English");
      extracted.add("Hindi");
      extracted.add("EVS");
    } else if (hasMiddle || hasSecondary) {
      extracted.add("Mathematics");
      extracted.add("Science");
      extracted.add("English");
      extracted.add("Hindi");
      extracted.add("Social Studies");
    } else {
      extracted.add("Mathematics");
      extracted.add("Science");
      extracted.add("English");
      extracted.add("Social Studies");
    }
  }

  if (extracted.has("Science") && extracted.size > 1 && (extracted.has("Physics") || extracted.has("Chemistry") || extracted.has("Biology"))) {
    extracted.delete("Science");
  }

  const ordered: string[] = [];
  for (const s of SYSTEM_SUBJECT_LIST) {
    if (extracted.has(s)) ordered.push(s);
  }
  for (const s of extracted) {
    if (!ordered.includes(s)) ordered.push(s);
  }

  return ordered;
}

function parseCsvLine(line: string, delimiter: string = ","): string[] {
  if (delimiter !== ",") {
    return line.split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ""));
  }
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(cur.trim().replace(/^["']|["']$/g, ""));
      cur = "";
    } else {
      cur += char;
    }
  }
  result.push(cur.trim().replace(/^["']|["']$/g, ""));
  return result;
}

// ─── 1. JSON Parser ───────────────────────────────────────────────────────────
function tryParseJson(text: string): ParsedLead[] | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith("[") && !trimmed.startsWith("{")) return null;

  try {
    const parsed = JSON.parse(trimmed);
    const items = Array.isArray(parsed) ? parsed : [parsed];
    const results: ParsedLead[] = [];

    for (const item of items) {
      if (typeof item !== "object" || !item) continue;
      const phoneRaw = item.phone || item.mobile || item.whatsapp || item.contact || item.contactNo || item.phone_number;
      const phoneClean = phoneRaw ? String(phoneRaw).replace(/\D/g, "").slice(-10) : null;
      const emailRaw = item.email || item.mail || item.emailAddress || item.email_address;
      const emailClean = emailRaw ? String(emailRaw).trim().toLowerCase() : null;

      if (!phoneClean && !emailClean) continue;

      const classes = formatCleanClasses(item.classes || item.class || item.grade);
      const subjects = formatCleanSubjects(item.subjects || item.subject, classes);
      const locClean = formatCleanLocation(item.location || item.address || item.city);
      const nameClean = formatCleanName(item.name || item.fullName);

      results.push({
        leadType: (item.leadType === "PARENT_LEAD" || item.type === "PARENT" || /parent|student/i.test(item.role || "")) ? "PARENT_LEAD" : "TUTOR",
        rawText: phoneClean ? `${nameClean || 'Lead'} (${phoneClean})` : "",
        name: nameClean,
        phone: phoneClean && /^[6-9]\d{9}$/.test(phoneClean) ? phoneClean : null,
        altPhone: item.altPhone ? String(item.altPhone).replace(/\D/g, "").slice(-10) : null,
        whatsapp: phoneClean && /^[6-9]\d{9}$/.test(phoneClean) ? phoneClean : null,
        email: emailClean && emailClean.includes("@") ? emailClean : null,
        location: locClean,
        pincode: item.pincode ? String(item.pincode).replace(/\D/g, "").slice(0, 6) : null,
        fullAddress: item.fullAddress ? String(item.fullAddress).replace(/^["'*]+|["'*]+$/g, "").trim() : (locClean || null),
        subjects,
        classes,
        board: item.board ? String(item.board).trim() : null,
        qualification: formatCleanQualification(item.qualification),
        experienceYears: typeof item.experienceYears === "number" ? item.experienceYears : (typeof item.experience === "number" ? item.experience : null),
        gender: item.gender ? String(item.gender).trim() : null,
        budgetFee: item.budgetFee ? String(item.budgetFee).trim() : (item.fee ? String(item.fee).trim() : null),
        appliedCodes: Array.isArray(item.codes) ? item.codes : (item.code ? [String(item.code)] : []),
        operationalNotes: item.notes ? String(item.notes).trim() : null,
        confidence: 0.99,
        isJunk: false,
      });
    }

    return results.length > 0 ? results : null;
  } catch {
    return null;
  }
}

// ─── 2. CSV / TSV / Tabular Parser ────────────────────────────────────────────
function tryParseTabular(text: string): ParsedLead[] | null {
  const lines = text.trim().split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return null;

  // Check delimiter (comma or tab or pipe)
  const firstLine = lines[0];
  const delimiter = firstLine.includes("\t") ? "\t" : firstLine.includes(",") ? "," : firstLine.includes("|") ? "|" : null;
  if (!delimiter) return null;

  const headerCols = parseCsvLine(firstLine, delimiter);
  const headers = headerCols.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));
  const nameIdx = headers.findIndex((h) => h.includes("name") || h.includes("tutor") || h.includes("candidate"));
  const phoneIdx = headers.findIndex((h) => h.includes("phone") || h.includes("mobile") || h.includes("contact") || h.includes("whatsapp"));
  const emailIdx = headers.findIndex((h) => h.includes("email") || h.includes("mail"));
  const addrIdx = headers.findIndex((h) => h.includes("fulladdress") || h.includes("completeaddress") || h.includes("address") || h.includes("street"));
  const locIdx = headers.findIndex((h) => h.includes("location") || h.includes("locality") || h.includes("area") || h.includes("city"));
  const pinIdx = headers.findIndex((h) => h.includes("pincode") || h.includes("pin") || h.includes("zip"));
  const subIdx = headers.findIndex((h) => h.includes("subject") || h.includes("skill"));
  const classIdx = headers.findIndex((h) => h.includes("class") || h.includes("grade"));
  const qualIdx = headers.findIndex((h) => h.includes("qual") || h.includes("degree") || h.includes("edu"));
  const expIdx = headers.findIndex((h) => h.includes("exp") || h.includes("year"));
  const genderIdx = headers.findIndex((h) => h.includes("gender") || h.includes("sex"));
  const typeIdx = headers.findIndex((h) => h.includes("leadtype") || h.includes("type") || h.includes("role"));

  if (phoneIdx === -1 && emailIdx === -1) return null;

  const results: ParsedLead[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i], delimiter);
    if (cols.length < 2) continue;

    const phoneRaw = phoneIdx !== -1 ? cols[phoneIdx] : null;
    const phoneClean = phoneRaw ? phoneRaw.replace(/\D/g, "").slice(-10) : null;
    const emailRaw = emailIdx !== -1 ? cols[emailIdx] : null;
    const emailClean = emailRaw && emailRaw.includes("@") ? emailRaw.toLowerCase().trim() : null;

    if (!phoneClean && !emailClean) continue;

    let rawName = nameIdx !== -1 && cols[nameIdx] ? cols[nameIdx] : null;
    let name = formatCleanName(rawName);
    if (!name && emailClean) {
      const user = emailClean.split("@")[0].replace(/\d+/g, "").replace(/(?:tutor|mail|git)[._-]?/gi, "");
      const parts = user.split(/[._-]+/).filter((p) => p.length >= 2);
      if (parts.length > 0) {
        name = parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
      }
    }

    const rawLoc = locIdx !== -1 && cols[locIdx] ? cols[locIdx] : null;
    const rawAddr = addrIdx !== -1 && cols[addrIdx] ? cols[addrIdx] : null;
    const location = formatCleanLocation(rawLoc || rawAddr);
    const fullAddress = rawAddr ? rawAddr.replace(/^["'*]+|["'*]+$/g, "").trim() : (location || null);
    const pincodeRaw = pinIdx !== -1 && cols[pinIdx] ? cols[pinIdx].replace(/\D/g, "").slice(0, 6) : null;

    const classes = classIdx !== -1 && cols[classIdx] ? formatCleanClasses(cols[classIdx]) : [];
    const subjects = subIdx !== -1 && cols[subIdx] ? formatCleanSubjects(cols[subIdx], classes) : [];
    const expRaw = expIdx !== -1 && cols[expIdx] ? parseInt(cols[expIdx].replace(/\D/g, ""), 10) : null;
    const genderRaw = genderIdx !== -1 && cols[genderIdx] ? (cols[genderIdx].toLowerCase().startsWith("f") ? "Female" : cols[genderIdx].toLowerCase().startsWith("m") ? "Male" : null) : null;
    const leadTypeRaw = typeIdx !== -1 && cols[typeIdx] ? cols[typeIdx].toUpperCase() : "TUTOR";
    const leadType = /PARENT/i.test(leadTypeRaw) ? "PARENT_LEAD" : "TUTOR";
    const qualification = qualIdx !== -1 && cols[qualIdx] ? formatCleanQualification(cols[qualIdx]) : null;

    results.push({
      leadType,
      rawText: phoneClean ? `${name || 'Lead'} (${phoneClean})` : "",
      name: name || null,
      phone: phoneClean && /^[6-9]\d{9}$/.test(phoneClean) ? phoneClean : null,
      altPhone: null,
      whatsapp: phoneClean && /^[6-9]\d{9}$/.test(phoneClean) ? phoneClean : null,
      email: emailClean,
      location: location || null,
      pincode: pincodeRaw && pincodeRaw.length === 6 ? pincodeRaw : null,
      fullAddress: fullAddress || null,
      subjects,
      classes,
      board: null,
      qualification,
      experienceYears: !isNaN(Number(expRaw)) && Number(expRaw) > 0 ? Number(expRaw) : null,
      gender: genderRaw,
      budgetFee: null,
      appliedCodes: [],
      operationalNotes: null,
      confidence: 0.95,
      isJunk: false,
    });
  }

  return results.length > 0 ? results : null;
}

// ─── 3. Universal Multi-Profile Freeform & WhatsApp Segmenter ─────────────────
export function splitWhatsAppDump(raw: string): string[] {
  const text = raw.trim();
  if (!text) return [];

  const normalized = text.replace(/\r\n/g, "\n");
  const rawSegments: string[] = [];

  // Check if text has WhatsApp timestamps
  const lines = normalized.split("\n");
  let hasTimestamps = false;
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    if (WA_TIMESTAMP_PATTERN.test(lines[i])) {
      hasTimestamps = true;
      break;
    }
  }

  if (hasTimestamps) {
    let currentSegment: string[] = [];

    for (const line of lines) {
      if (WA_TIMESTAMP_PATTERN.test(line)) {
        if (currentSegment.length > 0) {
          const combined = currentSegment.join("\n").trim();
          if (combined) rawSegments.push(combined);
        }
        // Extract content after timestamp and sender header (e.g. "26/08/26, 2:02 pm - +91 85069 51507: ...")
        const contentAfterHeader = line
          .replace(WA_TIMESTAMP_PATTERN, "")
          .replace(/^[^:]*:\s*/i, "")
          .trim();
        currentSegment = contentAfterHeader ? [contentAfterHeader] : [];
      } else {
        currentSegment.push(line);
      }
    }
    if (currentSegment.length > 0) {
      const combined = currentSegment.join("\n").trim();
      if (combined) rawSegments.push(combined);
    }
  } else {
    // Non-timestamped freeform dump
    const majorSplits = normalized.split(/\n\s*\n\s*\n+|(?<=\n)\s*(?=(?:Tutor Profile|Tutor Details|PROFILE DETAILS|Details Require|Dear (?:Team|Tutor|Tutor Coordinator)|Please provide the following|My profile\s*-|\b\d+\.\s*Full Name|\+\d{1,2}\s*[6-9]\d{4}\s*\n))/i);
    for (const block of majorSplits) {
      const t = block.trim();
      if (t.length > 0) rawSegments.push(t);
    }
  }

  // Smart message stitching:
  // If consecutive messages are fragmented (e.g. Message 1: "9717661509", Message 2: "Dipika"), stitch them!
  const stitchedSegments: string[] = [];
  let i = 0;
  while (i < rawSegments.length) {
    const current = rawSegments[i].trim();
    if (!current) {
      i++;
      continue;
    }

    // Normalize: strip all spaces/hyphens from current to detect phone numbers with internal spaces
    const currentDigitsOnly = current.replace(/[\s-]/g, "");
    const hasCurrentPhone = /(?:\+?91)?[6-9]\d{9}/.test(currentDigitsOnly);
    const hasCurrentEmail = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/.test(current);

    // PRIORITY Case: Current segment is mostly just a phone number (possibly with +91 and spaces),
    // and next segment has NO phone number (e.g. Next: "Dipika" or "Shukurpur parents")
    // This MUST run before the no-phone→phone case below, to prevent the context fragment from being
    // greedily stitched forward to a different phone number.
    if (hasCurrentPhone && i + 1 < rawSegments.length) {
      const next = rawSegments[i + 1].trim();
      const hasNextPhone = /(?:\+?91)?[6-9]\d{9}/.test(next.replace(/[\s-]/g, ""));
      const hasNextEmail = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/.test(next);
      
      // Check if current is primarily a phone number: strip phone patterns and see what's left
      const afterPhoneStrip = current
        .replace(/(?:\+?91[\s-]?)?[6-9][\d\s-]{8,14}/g, "")
        .replace(/[+\-\s]/g, "")
        .trim();
      const isPhoneOnly = afterPhoneStrip.length < 5; // very little non-phone content

      if (isPhoneOnly && !hasNextPhone && !hasNextEmail && next.length < 150 && !isJunkMessage(next)) {
        stitchedSegments.push(current + "\n" + next);
        i += 2;
        continue;
      }
    }

    // Fallback Case: Current segment has NO phone & NO email, but next segment DOES have a phone
    // (e.g. Current: "Shahdara \n 25 k", Next: "9958838132")
    if (!hasCurrentPhone && !hasCurrentEmail && i + 1 < rawSegments.length) {
      const next = rawSegments[i + 1].trim();
      const hasNextPhone = /(?:\+?91)?[6-9]\d{9}/.test(next.replace(/[\s-]/g, ""));
      if (hasNextPhone && current.length < 120 && !isJunkMessage(current)) {
        stitchedSegments.push(current + "\n" + next);
        i += 2;
        continue;
      }
    }

    stitchedSegments.push(current);
    i++;
  }

  // Post-process segments:
  // If a segment contains a list of multiple phone numbers or multiple profile codes, split it into individual sub-leads!
  const finalSegments: string[] = [];

  for (const seg of stitchedSegments) {
    const trimmedSeg = seg.trim();
    if (!trimmedSeg) continue;

    // Check if this segment contains multiple standalone phone numbers (like 8587022506\n9999218333...)
    const segLines = trimmedSeg.split("\n").map((l) => l.trim()).filter(Boolean);
    const phoneLines = segLines.filter((l) => /^(?:\+?91[\s-]?)?[6-9]\d{9}$/.test(l.replace(/\s+/g, "")));

    // If most lines in this segment are individual phone numbers (a contact list)
    if (phoneLines.length >= 2 && phoneLines.length >= segLines.length * 0.6) {
      for (const pl of segLines) {
        if (pl.length > 5) finalSegments.push(pl);
      }
      continue;
    }

    // Check if segment has multiple Code blocks (e.g. Code: C102 ... Code: C103 ...)
    const codeCount = (trimmedSeg.match(/\bCode[:.]\s*C\d+/gi) || []).length;
    if (codeCount > 1) {
      const codeSplits = trimmedSeg.split(/(?=\bCode[:.]\s*C\d+)/i);
      for (const cs of codeSplits) {
        const tcs = cs.trim();
        if (tcs.length > 5) finalSegments.push(tcs);
      }
      continue;
    }

    finalSegments.push(trimmedSeg);
  }

  return finalSegments;
}

// ─── Deduplicate Leads in the Same Batch ──────────────────────────────────────
function deduplicateLeads(leads: ParsedLead[]): ParsedLead[] {
  const seenPhones = new Set<string>();
  const seenEmails = new Set<string>();
  const uniqueLeads: ParsedLead[] = [];

  for (const lead of leads) {
    const phone = lead.phone?.trim();
    const email = lead.email?.trim().toLowerCase();

    // If it has neither phone nor email, keep it only if it has a name and location
    if (!phone && !email) {
      if (lead.name && lead.location) {
        uniqueLeads.push(lead);
      }
      continue;
    }

    const isDuplicatePhone = phone ? seenPhones.has(phone) : false;
    const isDuplicateEmail = email ? seenEmails.has(email) : false;

    if (isDuplicatePhone || isDuplicateEmail) {
      continue;
    }

    if (phone) seenPhones.add(phone);
    if (email) seenEmails.add(email);
    uniqueLeads.push(lead);
  }

  return uniqueLeads;
}

// ─── Public Batch Parser API ──────────────────────────────────────────────────
export interface BatchParseResult {
  leads: ParsedLead[];
  junkCount: number;
  totalMessages: number;
  totalLeadsCount?: number;
  totalPhonesCount?: number;
  totalEmailsCount?: number;
  totalDuplicatesCount?: number;
  totalReadyCount?: number;
  isPreviewCapped?: boolean;
}

export async function parseWhatsAppDump(
  rawText: string,
  onProgress?: (done: number, total: number) => void
): Promise<BatchParseResult> {
  // Check 1: JSON format
  const jsonResult = tryParseJson(rawText);
  if (jsonResult && jsonResult.length > 0) {
    const deduped = deduplicateLeads(jsonResult);
    return {
      leads: deduped,
      junkCount: 0,
      totalMessages: jsonResult.length,
    };
  }

  // Check 2: CSV / Tabular / Excel format
  const tabularResult = tryParseTabular(rawText);
  if (tabularResult && tabularResult.length > 0) {
    const deduped = deduplicateLeads(tabularResult);
    return {
      leads: deduped,
      junkCount: 0,
      totalMessages: tabularResult.length,
    };
  }

  // Check 3: Universal Freeform / WhatsApp Chat parser
  const messages = splitWhatsAppDump(rawText);
  const totalMessages = messages.length;

  const allParsed = await extractLeadsBatch(messages, onProgress);
  const validLeads = allParsed.filter((l) => !l.isJunk && (l.phone || l.email || l.name));
  const junkCount = allParsed.length - validLeads.length;
  const deduped = deduplicateLeads(validLeads);

  return {
    leads: deduped,
    junkCount,
    totalMessages,
  };
}
