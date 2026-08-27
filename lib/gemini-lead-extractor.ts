/**
 * lib/gemini-lead-extractor.ts
 *
 * Uses Google Gemini AI with automatic multi-model fallback (gemini-3.5-flash-lite,
 * gemini-3.1-flash-lite-preview, gemini-flash-latest, etc.) to extract structured
 * tutor & parent lead data from messy WhatsApp messages, CV blobs, and chat dumps.
 *
 * Fully equipped with Indian location slang decoding (Ghz -> Ghaziabad, MKT -> Majnu Ka Tilla, etc.),
 * subject short-form decoding (PCM, PCB, Acc, BST, Eco, etc.), parent vs. tutor classification,
 * fee/budget extraction, and lead enquiry code tracking.
 */

import { GoogleGenAI } from "@google/genai";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ParsedLead {
  leadType: "TUTOR" | "PARENT_LEAD" | "OTHER";
  name: string | null;
  phone: string | null;
  altPhone: string | null;
  whatsapp: string | null;
  email: string | null;
  location: string | null;
  pincode: string | null;
  fullAddress: string | null;
  subjects: string[];
  classes: string[];
  board: string | null;
  qualification: string | null;
  experienceYears: number | null;
  gender: string | null;
  budgetFee: string | null;
  appliedCodes: string[];
  operationalNotes: string | null;
  isJunk: boolean;          // true = skip this message (boilerplate / system message)
  confidence: number;       // 0-100 how confident the AI is in this extraction
  rawText: string;          // original snippet
  isDuplicate?: boolean;
  duplicateSource?: "STAFF_LEAD" | "USER" | "IN_BATCH" | null;
  duplicateDetail?: string | null;
}

// ─── Junk phrases to detect ───────────────────────────────────────────────────

const JUNK_PHRASES = [
  "50 percent of the first month will take",
  "50% of the first month will take",
  "send me your adhar card also separately",
  "send me your aadhar card also separately",
  "please copy paste this form in text area below",
  "messages and calls are end-to-end encrypted",
  "joined using a group link",
  "anyone in this group can invite",
  "you created this group",
  "urgently required actors /model",
  "urgently required actors / model",
  "female face required for advitisment shoot",
  "porter.in/customerapplinks",
  "download now and get 20% off",
  "single room available in rakkar",
  "rent 6k per month not negotiable",
  "data sending soon",
  "data competed",
  "mumbai sara sara mail kr diya hai",
];

function isJunkMessage(text: string): boolean {
  const lower = text.toLowerCase().trim();
  if (lower === "..." || lower === "okay" || lower === "<media omitted>") return true;
  return JUNK_PHRASES.some((p) => lower.includes(p));
}

// ─── Location Slang Dictionary ───────────────────────────────────────────────

const LOCATION_MAPPINGS: Array<{ pattern: RegExp; canonical: string }> = [
  { pattern: /\b(?:ghz|gyz|gaz|gzy|gaziabad|ghaziyabaad|gaziyabad)\b/i, canonical: "Ghaziabad, Delhi NCR" },
  { pattern: /\b(?:mkt|majnu\s*ka\s*tilla)\b/i, canonical: "Majnu Ka Tilla, North Delhi" },
  { pattern: /\b(?:orn|old\s*rajinder\s*nagar|old\s*rajendra\s*nagar)\b/i, canonical: "Old Rajinder Nagar, Delhi" },
  { pattern: /\b(?:cp|canaught|canaught\s*place|connaught\s*place)\b/i, canonical: "Connaught Place, Delhi" },
  { pattern: /\b(?:gtb|gtb\s*ngr|gtb\s*nagar|guru\s*teg\s*bahadur\s*nagar)\b/i, canonical: "GTB Nagar, North Delhi" },
  { pattern: /\b(?:nfc|new\s*friends\s*colony)\b/i, canonical: "New Friends Colony, South Delhi" },
  { pattern: /\b(?:gk|gk-?1|gk-?2|greater\s*kailash)\b/i, canonical: "Greater Kailash, South Delhi" },
  { pattern: /\b(?:rp\s*bagh|rana\s*pratap\s*bagh)\b/i, canonical: "Rana Pratap Bagh, North Delhi" },
  { pattern: /\b(?:ina|ina\s*colony)\b/i, canonical: "INA Colony, South Delhi" },
  { pattern: /\b(?:ip\s*ext(?:ension)?|patparganj|padparjanj)\b/i, canonical: "IP Extension, Patparganj, East Delhi" },
  { pattern: /\b(?:dwarka\s*mo[dr]|dwaraka\s*mo[dr])\b/i, canonical: "Dwarka Mor, Delhi" },
  { pattern: /\b(?:dwarka|dwaraka|dawarka)(?:\s*(?:sec(?:tor)?\s*(\d+)))?\b/i, canonical: "Dwarka, South West Delhi" },
  { pattern: /\b(?:pritam\s*pura|preetampura|pitam\s*pura|pitampura)\b/i, canonical: "Pitampura, North West Delhi" },
  { pattern: /\b(?:karanpura|karampura)\b/i, canonical: "Karampura, West Delhi" },
  { pattern: /\b(?:nagloi|nangloi)\b/i, canonical: "Nangloi, West Delhi" },
  { pattern: /\b(?:najafgarh|najfgadh)\b/i, canonical: "Najafgarh, West Delhi" },
  { pattern: /\b(?:pahadganj|pahar\s*gunj|paharganj)\b/i, canonical: "Paharganj, Central Delhi" },
  { pattern: /\b(?:malkagaj|malka\s*ganj|malk\s*ganj)\b/i, canonical: "Malka Ganj, North Delhi" },
  { pattern: /\b(?:shadhara|shahadra|shahdara)\b/i, canonical: "Shahdara, East Delhi" },
  { pattern: /\b(?:gugrawala(?:\s*town)?|gujrawala(?:\s*town)?)\b/i, canonical: "Gujranwala Town, North Delhi" },
  { pattern: /\b(?:daryaganj|dariya\s*ganj)\b/i, canonical: "Daryaganj, Central Delhi" },
  { pattern: /\b(?:keshav\s*puram|keshavpuram)\b/i, canonical: "Keshav Puram, North West Delhi" },
  { pattern: /\b(?:shastri\s*nagar|shastri\s*park)\b/i, canonical: "Shastri Nagar, Delhi" },
  { pattern: /\b(?:chattarpur|chatarpur|chattrpur)\b/i, canonical: "Chhatarpur, South Delhi" },
  { pattern: /\b(?:sarita\s*vihar|sarira\s*vihar)\b/i, canonical: "Sarita Vihar, South Delhi" },
  { pattern: /\b(?:burari|burai|sant\s*nagar\s*burari|sant\s*nagar)\b/i, canonical: "Sant Nagar, Burari, North Delhi" },
  { pattern: /\b(?:indirapuram|vaishali|vasundhara|kaushambi|mohan\s*nagar)\b/i, canonical: "Ghaziabad, Delhi NCR" },
  { pattern: /\b(?:nodia|noida)(?:\s*(?:sec(?:tor)?\s*(\d+)))?\b/i, canonical: "Noida, UP" },
  { pattern: /\b(?:gurgaon|gurugram)(?:\s*(?:sec(?:tor)?\s*(\d+)|dlf(?:\s*phase\s*\d+)?))?\b/i, canonical: "Gurugram, Haryana" },
  { pattern: /\b(?:faridabad|faridabaad)(?:\s*(?:sec(?:tor)?\s*(\d+)|dabua|tilpat))?\b/i, canonical: "Faridabad, Haryana" },
  { pattern: /\b(?:thane|patlipada|patli\s*para|kasarvadavali|ghodbunder)\b/i, canonical: "Thane, Mumbai NCR" },
  { pattern: /\b(?:navi\s*mumbai|seawoods?|nerul|ghansoli|ulwe)\b/i, canonical: "Navi Mumbai, Maharashtra" },
  { pattern: /\b(?:malad|andheri|borivali|kandivali|versova)\b/i, canonical: "Mumbai, Maharashtra" },
];

function normalizeLocation(raw: string | null): string | null {
  if (!raw) return null;
  const clean = raw.trim();
  for (const { pattern, canonical } of LOCATION_MAPPINGS) {
    if (pattern.test(clean)) {
      return clean.length > canonical.length ? clean : canonical;
    }
  }
  return clean;
}

// ─── Helpers: Email Name Extraction ──────────────────────────────────────────

function extractNameFromEmail(email: string): string | null {
  if (!email || !email.includes("@")) return null;
  const user = email.split("@")[0].toLowerCase();
  const cleaned = user.replace(/\d+/g, "").replace(/(?:tutor|teacher|home|tuition|mail|git|test|official|dr|mr|mrs|ms)[._-]?/gi, "");
  const parts = cleaned.split(/[._-]+/).filter((p) => p.length >= 2);
  if (parts.length === 0) return null;
  return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
}

function escapeRegex(s: string): string {
  return s.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
}

// ─── Regex Fallback Extractor ────────────────────────────────────────────────

function regexExtract(text: string): Omit<ParsedLead, "rawText" | "confidence" | "isJunk"> {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // 1. Determine Lead Type (Parent Lead vs Tutor Profile)
  const isParentLead = /\b(?:parents?|student(?:\s*name)?|daughter|son|child|bacha|require(?:\s*female)?\s*(?:home\s*)?tutor|need\s*(?:a\s*)?(?:home\s*)?tutor|tution\s*for\s*my)\b/i.test(text);
  const leadType: "TUTOR" | "PARENT_LEAD" | "OTHER" = isParentLead ? "PARENT_LEAD" : "TUTOR";

  // 2. Phones (10-digit Indian numbers across various formats)
  const rawDigits = text.match(/(?:(?:\+?91[\s-]?)|\b)[6-9]\d{9}\b|(?:(?:\+?91[\s-]?)|\b)[6-9][\d\s-]{8,15}\b|(?<=[-:=,\s])[6-9]\d{9}\b/g) ?? [];
  const phoneMatches = rawDigits
    .map((p) => p.replace(/\D/g, "").slice(-10))
    .filter((p) => /^[6-9]\d{9}$/.test(p));
  const uniquePhones = [...new Set(phoneMatches)];

  // 3. Emails
  const emailMatches = [...text.matchAll(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g)].map((m) => m[0].toLowerCase());
  const uniqueEmails = [...new Set(emailMatches)];

  // 4. Name
  let name: string | null = null;
  const INVALID_NAME_WORDS = [
    "tutor profile", "tutor details", "profile details", "details require",
    "dear tutor", "dear team", "objective", "sincerely", "regards",
    "qualification", "complete address", "educational qualification",
    "special skills", "sarita vihar", "maya puri", "munirka", "roop nagar",
    "delhi", "noida", "gurgaon", "ghaziabad", "bangalore", "mumbai",
    "whatsapp on", "contact no", "home tuition", "home tutor", "required", "classes"
  ];

  // Pattern A: Explicit label (e.g. "Name: ...", "1. Name = ...", "Student name: ...", "Parent name: ...")
  const explicitNamePatterns = [
    /(?:(?:1\s*[\.\)]\s*)?(?:Tutor\s*Name|Full\s*Name|Candidate\s*Name|Applicant\s*Name|Student\s*Name|Parent\s*Name|Name|Tutor))[^\n\r:=]*[:=-]\s*([^\n\r,]+)/i,
    /(?:(?:I am|My name is|This is)\s+([A-Za-z\s.]{2,35}))/i,
    /(?:Sincerely|Regards|Thanks|Warm Regards)[,\s\n]+([A-Za-z\s.]{2,35})/i,
    /Code:\s*C\d+[\s\S]*?Name:\s*([A-Za-z\s.]{2,35})/i,
  ];

  for (const pat of explicitNamePatterns) {
    const m = text.match(pat);
    if (m && m[1]) {
      let candidate = m[1]
        .replace(/^(as per Aadhar|for Profile|as a Tutor|Sir|Madam|Dr\.|Mr\.|Mrs\.|Ms\.)\s*[-:]?\s*/i, "")
        .replace(/\s*(?:Contact|Phone|Mobile|Email|Qual|Class|Sub|Address|Loc)[\s\S]*$/i, "")
        .replace(/[^\w\s.]/g, "")
        .trim();
      const lower = candidate.toLowerCase();
      if (candidate.length >= 2 && !INVALID_NAME_WORDS.some((inv) => lower.includes(inv))) {
        name = candidate.split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
        break;
      }
    }
  }

  // Pattern B: First line heuristic if no name found yet
  if (!name && lines.length > 0) {
    const firstLine = lines[0]
      .replace(/^(?:\[.*?\]|\d{1,2}\/\d{1,2}\/\d{2,4},?\s*\d{1,2}:\d{2}\s*(?:am|pm)?\s*-?)\s*[^:]*:\s*/i, "")
      .trim();

    const words = firstLine.split(/\s+/).filter(Boolean);
    const lowerFirst = firstLine.toLowerCase();
    const hasDigits = /\d/.test(firstLine);
    const isExcluded = INVALID_NAME_WORDS.some((inv) => lowerFirst.includes(inv)) ||
      /^(?:hi|hello|dear|applying|subject|classes|contact|phone|email|please|details|parents|required)/i.test(firstLine);

    if (!hasDigits && !isExcluded && words.length >= 1 && words.length <= 4 && firstLine.length <= 35) {
      name = words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
    }
  }

  // Pattern C: Infer from Email if still missing
  if (!name && uniqueEmails.length > 0) {
    name = extractNameFromEmail(uniqueEmails[0]);
  }

  // 5. Pincode
  const pincodeMatch = text.match(/\b([1-9]\d{5})\b/);
  const pincode = pincodeMatch ? pincodeMatch[1] : null;

  // 6. Full Address & Multi-Line Capture
  let fullAddress: string | null = null;
  const addressBlockMatch = text.match(/(?:Complete address|Full address|Current address|Residential address|Permanent address|Address|Add|Addr|H\.No|Flat No|House No)[^\n\r:=]*[:=-]\s*([\s\S]+?)(?=\n\s*(?:(?:1?\d\s*[\.\)]\s*)?(?:Contact|Phone|Mobile|Whatapp|WhatsApp|Email|Qualification|Qual|Experience|Exp|Subjects|Classes|Sincerely|Regards|50 percent)|$))/i);

  if (addressBlockMatch && addressBlockMatch[1]) {
    const rawBlock = addressBlockMatch[1].trim();
    fullAddress = rawBlock
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .join(", ")
      .replace(/\s*,\s*,+/g, ", ")
      .trim();
  }

  // 7. Location & Locality
  let location: string | null = null;
  const locExplicitMatch = text.match(/(?:Your location|Location|Locality|Area|Pref Area|Preferred Area|Preferred Location|Residing at|Living in|Nearby|Near|Address location)[^\n\r:=]*[:=-]\s*([^\n\r]+)/i);

  if (locExplicitMatch && locExplicitMatch[1]) {
    location = locExplicitMatch[1]
      .replace(/^(with house no\.?|Address pincode|Home tuition only)[\s\S]*$/i, "")
      .trim()
      .split("\n")[0]
      .trim();
  }

  if (!location) {
    for (const { pattern, canonical } of LOCATION_MAPPINGS) {
      if (pattern.test(text)) {
        location = canonical;
        break;
      }
    }
  }

  location = normalizeLocation(location);

  // Synchronize Location & Full Address
  if (fullAddress && !location) {
    const parts = fullAddress.split(",").map((s) => s.trim()).filter(Boolean);
    location = parts.length >= 2 ? parts.slice(-2).join(", ") : parts[0] || null;
  } else if (location && !fullAddress) {
    fullAddress = location;
  }

  // 8. Subjects (with short-form decoding)
  const foundSubjects: string[] = [];
  const subMatchers: Array<{ pattern: RegExp; subjects: string[] }> = [
    { pattern: /\bpcm\b/i, subjects: ["Physics", "Chemistry", "Mathematics"] },
    { pattern: /\bpcb\b/i, subjects: ["Physics", "Chemistry", "Biology"] },
    { pattern: /\b(?:phy|physics)\b/i, subjects: ["Physics"] },
    { pattern: /\b(?:chem|chemistry|chemsitry)\b/i, subjects: ["Chemistry"] },
    { pattern: /\b(?:bio|biology|botany|zoology)\b/i, subjects: ["Biology"] },
    { pattern: /\b(?:math|maths|mat|nathi|mathematics)\b/i, subjects: ["Mathematics"] },
    { pattern: /\b(?:acc|account|accounts|accountancy|b\.com|bcom)\b/i, subjects: ["Accountancy"] },
    { pattern: /\b(?:eco|economic|economics)\b/i, subjects: ["Economics"] },
    { pattern: /\b(?:bst|b\.st|b\s*studies|business\s*studies)\b/i, subjects: ["Business Studies"] },
    { pattern: /\b(?:sst|ss|social\s*studies|social\s*science)\b/i, subjects: ["Social Science"] },
    { pattern: /\b(?:cs|comp|computer|coding|python|java|c\+\+|html)\b/i, subjects: ["Computer Science"] },
    { pattern: /\b(?:pol|polsci|political\s*science)\b/i, subjects: ["Political Science"] },
    { pattern: /\b(?:geo|geography)\b/i, subjects: ["Geography"] },
    { pattern: /\b(?:his|history)\b/i, subjects: ["History"] },
    { pattern: /\b(?:psy|psycho|psychology|phsycology)\b/i, subjects: ["Psychology"] },
    { pattern: /\b(?:evs)\b/i, subjects: ["EVS"] },
    { pattern: /\b(?:vedic\s*maths?)\b/i, subjects: ["Vedic Mathematics"] },
    { pattern: /\b(?:phonics)\b/i, subjects: ["Phonics"] },
    { pattern: /\b(?:handwriting)\b/i, subjects: ["Handwriting"] },
    { pattern: /\b(?:autism|special\s*edu(?:cator)?)\b/i, subjects: ["Special Education"] },
    { pattern: /\b(?:french)\b/i, subjects: ["French"] },
    { pattern: /\b(?:spanish)\b/i, subjects: ["Spanish"] },
    { pattern: /\b(?:german)\b/i, subjects: ["German"] },
    { pattern: /\b(?:japanese)\b/i, subjects: ["Japanese"] },
    { pattern: /\b(?:chinese)\b/i, subjects: ["Chinese"] },
    { pattern: /\b(?:sanskrit|sanskriti)\b/i, subjects: ["Sanskrit"] },
    { pattern: /\b(?:punjabi)\b/i, subjects: ["Punjabi"] },
    { pattern: /\b(?:hindi)\b/i, subjects: ["Hindi"] },
    { pattern: /\b(?:marathi)\b/i, subjects: ["Marathi"] },
    { pattern: /\b(?:telugu|telgu)\b/i, subjects: ["Telugu"] },
    { pattern: /\b(?:urdu)\b/i, subjects: ["Urdu"] },
    { pattern: /\b(?:english|ielts|toefl|spoken\s*english)\b/i, subjects: ["English"] },
    { pattern: /\b(?:dance|guitar|vocal\s*music|music|yoga)\b/i, subjects: ["Extracurricular"] },
    { pattern: /\b(?:all\s*subjects?|all\s*sub)\b/i, subjects: ["All Subjects"] },
  ];

  for (const { pattern, subjects } of subMatchers) {
    if (pattern.test(text)) {
      for (const s of subjects) {
        if (!foundSubjects.includes(s)) foundSubjects.push(s);
      }
    }
  }

  // 9. Classes
  const classNumbers: string[] = [];
  const classRanges = [...text.matchAll(/(?:class\s*)?(\d{1,2})\s*(?:st|nd|rd|th)?\s*(?:to|-|–)\s*(?:class\s*)?(\d{1,2})\s*(?:st|nd|rd|th)?/gi)];
  for (const m of classRanges) {
    const s = parseInt(m[1]), e = parseInt(m[2]);
    if (s >= 1 && e <= 12 && s <= e) {
      for (let i = s; i <= e; i++) {
        const c = `Class ${i}`;
        if (!classNumbers.includes(c)) classNumbers.push(c);
      }
    }
  }
  if (classNumbers.length === 0) {
    const singles = [...text.matchAll(/(?:class\s*)?(\d{1,2})\s*(?:st|nd|rd|th)/gi)];
    for (const m of singles) {
      const n = parseInt(m[1]);
      if (n >= 1 && n <= 12) {
        const c = `Class ${n}`;
        if (!classNumbers.includes(c)) classNumbers.push(c);
      }
    }
  }
  if (/\b(?:nursery|kg|lkg|ukg|prep)\b/i.test(text)) {
    for (const k of ["Nursery", "LKG", "UKG"]) {
      if (!classNumbers.includes(k)) classNumbers.unshift(k);
    }
  }
  if (/\b(?:neet|iit|jee|iitjee|cuet)\b/i.test(text)) {
    if (!classNumbers.includes("Class 11")) classNumbers.push("Class 11");
    if (!classNumbers.includes("Class 12")) classNumbers.push("Class 12");
  }

  // 10. Fee / Budget
  let budgetFee: string | null = null;
  const feeMatch = text.match(/(?:fee|budget|charges|rate)[^\d]*(\d{3,6})(?:\s*(?:per|\/)?\s*(?:month|hr|hour|session))?/i);
  if (feeMatch) {
    budgetFee = `₹${feeMatch[1]}${feeMatch[0].toLowerCase().includes("hr") || feeMatch[0].toLowerCase().includes("hour") ? "/hr" : "/month"}`;
  }

  // 11. Applied Enquiry Codes (e.g. C102, C114, C134)
  const codeMatches = [...text.matchAll(/\bC-?(\d{3,4})\b/gi)].map((m) => `C${m[1]}`);
  const appliedCodes = [...new Set(codeMatches)];

  // 12. Operational Notes
  const opNotes: string[] = [];
  if (/\b(?:paid|paid\s*today|payment\s*ki\s*hai)\b/i.test(text)) opNotes.push("Paid Registration");
  if (/\b(?:demo|trial)\b/i.test(text)) {
    const demoSnippet = text.match(/(?:demo|trial)[^\n,.]{0,40}/i)?.[0];
    if (demoSnippet) opNotes.push(demoSnippet.trim());
  }
  if (/\b(?:call\s*back|follow\s*up)\b/i.test(text)) opNotes.push("Follow Up Required");
  if (/\b(?:refund)\b/i.test(text)) opNotes.push("Refund Requested");
  if (appliedCodes.length > 0) opNotes.push(`Applied Codes: ${appliedCodes.join(", ")}`);

  // 13. Qualification
  let qualification: string | null = null;
  const qualMatch = text.match(/(?:qualification|degree|edu)[^\n\r:=]*[:=-]\s*([A-Za-z\s\(\)\.]{3,80})/i);
  if (qualMatch) qualification = qualMatch[1].trim().split("\n")[0].trim();
  if (!qualification) {
    const qualKws = ["B.Ed", "B.Tech", "BTech", "B.Sc", "BSc", "M.Tech", "MBA", "MCA", "M.Sc", "MSc", "MA", "BA", "B.Com", "M.Com", "PhD", "MBBS", "CTET", "JBT", "BAMS", "BHMS", "CA Inter", "CA Final"];
    for (const kw of qualKws) {
      if (new RegExp(`(^|[^a-zA-Z0-9])${escapeRegex(kw)}($|[^a-zA-Z0-9])`, "i").test(text)) {
        qualification = kw;
        break;
      }
    }
  }

  // 14. Experience
  let experienceYears: number | null = null;
  const expMatch = text.match(/(?:experience|exp)[^\d]*(\d+)\s*(?:year|yr)/i);
  if (expMatch) experienceYears = parseInt(expMatch[1]);

  // 15. Gender
  let gender: string | null = null;
  if (/\bFemale\b/i.test(text)) gender = "Female";
  else if (/\bMale\b/i.test(text)) gender = "Male";

  return {
    leadType,
    name,
    phone: uniquePhones[0] ?? null,
    altPhone: uniquePhones[1] ?? null,
    whatsapp: uniquePhones[0] ?? null,
    email: uniqueEmails[0] ?? null,
    location,
    pincode,
    fullAddress,
    subjects: foundSubjects,
    classes: classNumbers,
    board: text.includes("CBSE") ? "CBSE" : text.includes("ICSE") ? "ICSE" : text.includes("IB") ? "IB" : null,
    qualification,
    experienceYears,
    gender,
    budgetFee,
    appliedCodes,
    operationalNotes: opNotes.length > 0 ? opNotes.join(" | ") : null,
  };
}

// ─── Gemini AI Extractor (Multi-Model Resilience & Rich Domain Training) ────

const GEMINI_SYSTEM_PROMPT = `You are an expert AI data extraction assistant specialized in Indian home tuition CRM lead processing.
You will extract structured tutor profiles AND parent tuition requirements from messy WhatsApp messages, CRM dumps, and chat logs.

CRITICAL FIELD CONTRACT:
Return ONLY a valid JSON object with these exact keys:
{
  "leadType": "TUTOR" or "PARENT_LEAD" or "OTHER",
  "name": string or null (Person name, student name, or tutor name. NEVER return "null" as string),
  "phone": string or null (10-digit Indian mobile number, leading digit 6-9, no +91),
  "altPhone": string or null (10-digit alternate mobile number if present),
  "whatsapp": string or null (10-digit WhatsApp number),
  "email": string or null (lowercase email),
  "location": string or null (canonical neighborhood/colony/area + city),
  "pincode": string or null (6-digit PIN code),
  "fullAddress": string or null (complete house/flat no, street, locality, landmark, city, state),
  "subjects": string[] (standardized subjects: Mathematics, Physics, Chemistry, Biology, Science, English, Hindi, Social Science, Accountancy, Economics, Business Studies, Computer Science, Sanskrit, French, German, Spanish, Marathi, Punjabi, Urdu, Special Education, Vedic Mathematics, Extracurricular),
  "classes": string[] (standardized as "Nursery", "LKG", "UKG", "Class 1", ... "Class 12", "IIT-JEE", "NEET", "Graduation"),
  "board": string or null ("CBSE", "ICSE", "IB", "State Board"),
  "qualification": string or null (B.Ed, B.Tech, M.Sc, M.A, B.Sc, B.Com, MBA, MBBS, Ph.D, CA Inter, etc.),
  "experienceYears": number or null,
  "gender": "Male" or "Female" or null,
  "budgetFee": string or null (e.g. "₹5,000/month", "₹600/hr"),
  "appliedCodes": string[] (e.g. ["C102", "C114"]),
  "operationalNotes": string or null (e.g. "Paid registration", "Demo Saturday 5pm", "Follow up after exams"),
  "isJunk": boolean (true ONLY if pure spam, group link notifications, or contains zero contact/lead info),
  "confidence": number (0-100)
}

RULES & DICTIONARY:
1. LEAD TYPE CLASSIFICATION:
   - "PARENT_LEAD" if the message is looking for a tutor for their child (keywords: "Parents", "Student name:", "Need tutor for class...", "Fee 5000", "Require female teacher for 5th class").
   - "TUTOR" if an educator is offering their teaching services or submitting profile details.

2. LOCATION SLANG RESOLUTION:
   - ghz / gyz / gaz / gzy -> "Ghaziabad, Delhi NCR"
   - mkt -> "Majnu Ka Tilla, North Delhi"
   - orn -> "Old Rajinder Nagar, Delhi"
   - cp / canaught -> "Connaught Place, Delhi"
   - gtb / gtb ngr -> "GTB Nagar, North Delhi"
   - nfc -> "New Friends Colony, South Delhi"
   - gk / gk1 / gk-1 / greater kailash -> "Greater Kailash, South Delhi"
   - rp bagh / rana pratap bagh -> "Rana Pratap Bagh, North Delhi"
   - ina -> "INA Colony, South Delhi"
   - ip ext / patparganj -> "IP Extension, Patparganj, East Delhi"
   - dwarka mod / dwarka mor -> "Dwarka Mor, Delhi"
   - pritam pura / preetampura -> "Pitampura, North West Delhi"
   - thane / patlipada / kasarvadavali -> "Thane, Mumbai NCR"
   - seawood / nerul / ghansoli / ulwe -> "Navi Mumbai, Maharashtra"
   - noida 62, 78, 93, 121, etc. -> "Noida Sector [X], UP"
   - gurugram / gurgaon sec 5, 21, 31, 50, 69, etc. -> "Gurugram Sector [X], Haryana"

3. SUBJECT SHORT-FORMS:
   - pcm -> ["Physics", "Chemistry", "Mathematics"]
   - pcb -> ["Physics", "Chemistry", "Biology"]
   - phy -> "Physics", chem -> "Chemistry", bio -> "Biology"
   - acc / accounts / b.com -> "Accountancy"
   - eco / economic -> "Economics"
   - bst / b studies -> "Business Studies"
   - sst / social science -> "Social Science"
   - cs / ip / computer -> "Computer Science"

4. NEVER LEAVE LOCATION OR ADDRESS NULL if any locality text exists! If full address is present, extract locality for "location". If only location is present, copy to "fullAddress".`;

const GEMINI_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite-preview",
  "gemini-3.1-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-flash-latest",
  "gemini-3.5-flash",
  "gemini-pro-latest",
];

async function geminiExtract(text: string): Promise<Omit<ParsedLead, "rawText">> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) throw new Error("No GEMINI_API_KEY or GOOGLE_API_KEY configured");

  let lastError: Error | null = null;

  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: `${GEMINI_SYSTEM_PROMPT}\n\nExtract from this message:\n---\n${text}\n---` }],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        lastError = new Error(`Gemini ${model} returned ${response.status}: ${errText}`);
        continue;
      }

      const data = await response.json();
      const rawRes = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      const jsonMatch = rawRes.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        lastError = new Error(`No JSON in ${model} response`);
        continue;
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return formatParsedJson(parsed, text);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  // SDK Fallback
  try {
    const ai = new GoogleGenAI({ apiKey });
    for (const model of GEMINI_MODELS) {
      try {
        const sdkRes = await ai.models.generateContent({
          model,
          contents: [
            {
              role: "user",
              parts: [{ text: `${GEMINI_SYSTEM_PROMPT}\n\nExtract from this message:\n---\n${text}\n---` }],
            },
          ],
          config: { temperature: 0.1, responseMimeType: "application/json" },
        });
        const raw = sdkRes.text ?? "";
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return formatParsedJson(parsed, text);
        }
      } catch {
        continue;
      }
    }
  } catch (sdkErr) {
    lastError = sdkErr instanceof Error ? sdkErr : new Error(String(sdkErr));
  }

  throw lastError ?? new Error("All Gemini models failed");
}

function formatParsedJson(parsed: Record<string, any>, rawText: string): Omit<ParsedLead, "rawText"> {
  let name = parsed.name ? String(parsed.name).trim() : null;
  if (name && (name.toLowerCase() === "null" || name.toLowerCase() === "undefined")) name = null;

  let email = parsed.email ? String(parsed.email).trim().toLowerCase() : null;
  if (!email || !email.includes("@")) email = null;

  if (!name && email) {
    name = extractNameFromEmail(email);
  }

  let location = parsed.location ? String(parsed.location).trim() : null;
  let fullAddress = parsed.fullAddress ? String(parsed.fullAddress).trim() : null;

  if (location && (location.toLowerCase() === "null" || location.toLowerCase() === "undefined")) location = null;
  if (fullAddress && (fullAddress.toLowerCase() === "null" || fullAddress.toLowerCase() === "undefined")) fullAddress = null;

  location = normalizeLocation(location);

  if (fullAddress && !location) {
    const parts = fullAddress.split(",").map((s) => s.trim()).filter(Boolean);
    location = parts.length >= 2 ? parts.slice(-2).join(", ") : parts[0] || null;
  } else if (location && !fullAddress) {
    fullAddress = location;
  }

  let pincode = parsed.pincode ? String(parsed.pincode).replace(/\D/g, "").slice(0, 6) : null;
  if (!pincode) {
    const pinMatch = rawText.match(/\b([1-9]\d{5})\b/);
    if (pinMatch) pincode = pinMatch[1];
  }

  const isParent = parsed.leadType === "PARENT_LEAD" || /\b(?:parents?|student|child|daughter|son|kid|require.*tutor)\b/i.test(rawText);
  const leadType: "TUTOR" | "PARENT_LEAD" | "OTHER" = isParent ? "PARENT_LEAD" : (parsed.leadType === "OTHER" ? "OTHER" : "TUTOR");

  return {
    leadType,
    name,
    phone: parsed.phone ? String(parsed.phone).replace(/\D/g, "").slice(-10) : null,
    altPhone: parsed.altPhone ? String(parsed.altPhone).replace(/\D/g, "").slice(-10) : null,
    whatsapp: parsed.whatsapp ? String(parsed.whatsapp).replace(/\D/g, "").slice(-10) : (parsed.phone ? String(parsed.phone).replace(/\D/g, "").slice(-10) : null),
    email,
    location,
    pincode: pincode && pincode.length === 6 ? pincode : null,
    fullAddress,
    subjects: Array.isArray(parsed.subjects) ? parsed.subjects : [],
    classes: Array.isArray(parsed.classes) ? parsed.classes : [],
    board: parsed.board ?? null,
    qualification: parsed.qualification ?? null,
    experienceYears: parsed.experienceYears ? Number(parsed.experienceYears) : null,
    gender: parsed.gender ?? null,
    budgetFee: parsed.budgetFee ?? null,
    appliedCodes: Array.isArray(parsed.appliedCodes) ? parsed.appliedCodes : [],
    operationalNotes: parsed.operationalNotes ?? null,
    isJunk: parsed.isJunk === true,
    confidence: Number(parsed.confidence ?? 90),
  };
}

// ─── Main: AI with Regex Fallback ────────────────────────────────────────────

export async function extractLeadData(rawText: string): Promise<ParsedLead> {
  const text = rawText.trim();

  // Quick junk check before hitting the API
  if (isJunkMessage(text) && text.length < 400) {
    return {
      ...regexExtract(text),
      isJunk: true,
      confidence: 95,
      rawText: text,
    };
  }

  try {
    const result = await geminiExtract(text);
    return { ...result, rawText: text };
  } catch (err) {
    console.warn("[gemini-lead-extractor] AI extraction failed, using enhanced regex fallback:", err instanceof Error ? err.message : err);
    const regexResult = regexExtract(text);
    const hasPhone = Boolean(regexResult.phone);
    const hasEmail = Boolean(regexResult.email);
    const hasName = Boolean(regexResult.name);
    const hasLoc = Boolean(regexResult.location || regexResult.fullAddress);

    let dynConfidence = 30;
    if (hasPhone) dynConfidence += 30;
    if (hasEmail) dynConfidence += 15;
    if (hasName) dynConfidence += 15;
    if (hasLoc) dynConfidence += 10;

    return {
      ...regexResult,
      isJunk: !hasPhone && !hasEmail && !hasName && !hasLoc,
      confidence: Math.min(dynConfidence, 95),
      rawText: text,
    };
  }
}

// ─── Batch Extract with Concurrency Limit ────────────────────────────────────

export async function extractLeadsBatch(
  messages: string[],
  onProgress?: (done: number, total: number) => void
): Promise<ParsedLead[]> {
  const results: ParsedLead[] = [];
  const CONCURRENCY = 4; // parallel AI calls

  for (let i = 0; i < messages.length; i += CONCURRENCY) {
    const chunk = messages.slice(i, i + CONCURRENCY);
    const chunkResults = await Promise.all(chunk.map((msg) => extractLeadData(msg)));
    results.push(...chunkResults);
    onProgress?.(Math.min(i + CONCURRENCY, messages.length), messages.length);
  }

  return results;
}

