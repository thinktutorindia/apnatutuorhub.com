/**
 * lib/gemini-lead-extractor.ts
 *
 * High-performance, multi-format lead extraction engine for Indian tutor & parent CRM leads.
 * Uses optimized in-memory deterministic rule parsing with domain dictionary decoding
 * (Indian location slang, subject short-forms, class levels, enquiry codes, fee budgets).
 *
 * Provides sub-millisecond per-lead parsing speed with zero server timeouts.
 */

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
  confidence: number;       // 0-100 how confident the extraction is
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
  "check email also",
  "phone contact also",
  "if any doubt send me sc",
  "video introduction and a resume on this number",
  "my senior will check and provide you the classes",
  "save our new whatsapp number",
  "we are updating our database",
  "please be advised that due to whatsapp's spam policy",
  "whatsapp on 9582844550",
  "if you are not geting regular updates",
  "whatsapp me your resume on this",
];

const SINGLE_WORD_NOISE = new Set([
  "nerul", "february", "march", "july", "december", "free", "link",
  "registration", "tb", "hudson", "west", "east", "south", "north",
  "okay", "ok", "yes", "no", "done", "...", "p", "a", "par", "dadi",
  "maths", "science", "physics", "chemistry", "biology", "accounts", "eco", "pst", "sst"
]);

export function isJunkMessage(text: string): boolean {
  const lower = text.toLowerCase().trim();
  if (lower === "..." || lower === "okay" || lower === "<media omitted>") return true;
  if (JUNK_PHRASES.some((p) => lower.includes(p))) return true;

  // Single word noise without phone/email
  if (SINGLE_WORD_NOISE.has(lower) && !/[6-9]\d{9}/.test(text) && !text.includes("@")) {
    return true;
  }

  // System notifications without any phone numbers
  if (
    (/joined using a group link|created this group|added studyhelpline|data sending soon/i.test(lower)) &&
    !/[6-9]\d{9}/.test(text)
  ) {
    return true;
  }

  return false;
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
  { pattern: /\b(?:indirapuram|vaishali|vasundhara|kaushambi|mohan\s*nagar|surya\s*nagar|sahibabad)\b/i, canonical: "Ghaziabad, Delhi NCR" },
  { pattern: /\b(?:nodia|noida)(?:\s*(?:sec(?:tor)?\s*(\d+)|extension))?\b/i, canonical: "Noida, UP" },
  { pattern: /\b(?:gurgaon|gurugram)(?:\s*(?:sec(?:tor)?\s*(\d+)|dlf(?:\s*phase\s*\d+)?))?\b/i, canonical: "Gurugram, Haryana" },
  { pattern: /\b(?:faridabad|faridabaad)(?:\s*(?:sec(?:tor)?\s*(\d+)|dabua|tilpat))?\b/i, canonical: "Faridabad, Haryana" },
  { pattern: /\b(?:thane|patlipada|patli\s*para|kasarvadavali|ghodbunder)\b/i, canonical: "Thane, Mumbai NCR" },
  { pattern: /\b(?:navi\s*mumbai|seawoods?|nerul|ghansoli|ulwe)\b/i, canonical: "Navi Mumbai, Maharashtra" },
  { pattern: /\b(?:malad|andheri|borivali|kandivali|versova|dadar|bandra)\b/i, canonical: "Mumbai, Maharashtra" },
  { pattern: /\b(?:model\s*town)\b/i, canonical: "Model Town, North Delhi" },
  { pattern: /\b(?:mukherjee\s*nagar|mukharjee\s*nagar)\b/i, canonical: "Mukherjee Nagar, North Delhi" },
  { pattern: /\b(?:kamla\s*nagar|kamal\s*nagar)\b/i, canonical: "Kamla Nagar, North Delhi" },
  { pattern: /\b(?:shakti\s*nagar)\b/i, canonical: "Shakti Nagar, North Delhi" },
  { pattern: /\b(?:roop\s*nagar)\b/i, canonical: "Roop Nagar, North Delhi" },
  { pattern: /\b(?:derawal\s*nagar|dera\s*wal)\b/i, canonical: "Derawal Nagar, North Delhi" },
  { pattern: /\b(?:patel\s*nagar|west\s*patel\s*nagar|east\s*patel\s*nagar)\b/i, canonical: "Patel Nagar, Central Delhi" },
  { pattern: /\b(?:rajouri\s*garden|rajouri|raja\s*garden)\b/i, canonical: "Rajouri Garden, West Delhi" },
  { pattern: /\b(?:tilak\s*nagar|tilakngr)\b/i, canonical: "Tilak Nagar, West Delhi" },
  { pattern: /\b(?:janakpuri|janak\s*puri)\b/i, canonical: "Janakpuri, West Delhi" },
  { pattern: /\b(?:uttam\s*nagar)\b/i, canonical: "Uttam Nagar, West Delhi" },
  { pattern: /\b(?:vikaspuri|vikash\s*puri)\b/i, canonical: "Vikaspuri, West Delhi" },
  { pattern: /\b(?:paschim\s*vihar|pashim\s*vihar)\b/i, canonical: "Paschim Vihar, West Delhi" },
  { pattern: /\b(?:punjabi\s*bagh|panjabi\s*bagh)\b/i, canonical: "Punjabi Bagh, West Delhi" },
  { pattern: /\b(?:ashok\s*vihar|aashok\s*vihar)\b/i, canonical: "Ashok Vihar, North West Delhi" },
  { pattern: /\b(?:shalimar\s*bagh|salimar\s*bagh)\b/i, canonical: "Shalimar Bagh, North West Delhi" },
  { pattern: /\b(?:rohini)(?:\s*(?:sec(?:tor)?\s*(\d+)))?\b/i, canonical: "Rohini, North West Delhi" },
  { pattern: /\b(?:lajpat\s*nagar|lajapt\s*nagar)\b/i, canonical: "Lajpat Nagar, South Delhi" },
  { pattern: /\b(?:defence\s*colony)\b/i, canonical: "Defence Colony, South Delhi" },
  { pattern: /\b(?:hauz\s*khas|haus\s*khas)\b/i, canonical: "Hauz Khas, South Delhi" },
  { pattern: /\b(?:green\s*park)\b/i, canonical: "Green Park, South Delhi" },
  { pattern: /\b(?:malviya\s*nagar)\b/i, canonical: "Malviya Nagar, South Delhi" },
  { pattern: /\b(?:saket)\b/i, canonical: "Saket, South Delhi" },
  { pattern: /\b(?:vasant\s*kunj|vasant\s*vihar)\b/i, canonical: "Vasant Kunj, South Delhi" },
  { pattern: /\b(?:munirka|munrika)\b/i, canonical: "Munirka, South Delhi" },
  { pattern: /\b(?:kalkaji|kalka\s*ji)\b/i, canonical: "Kalkaji, South Delhi" },
  { pattern: /\b(?:laxmi\s*nagar|laxminagar)\b/i, canonical: "Laxmi Nagar, East Delhi" },
  { pattern: /\b(?:preet\s*vihar|nirman\s*vihar|shakarpur)\b/i, canonical: "Laxmi Nagar / Preet Vihar, East Delhi" },
  { pattern: /\b(?:mayur\s*vihar)(?:\s*(?:phase\s*(\d+)|ext(?:ension)?))?\b/i, canonical: "Mayur Vihar, East Delhi" },
  { pattern: /\b(?:geeta\s*colony|krishna\s*nagar)\b/i, canonical: "Krishna Nagar, East Delhi" },
  { pattern: /\b(?:dilshad\s*garden)\b/i, canonical: "Dilshad Garden, East Delhi" },
  { pattern: /\b(?:yamuna\s*vihar|bhajanpura|maujpur|gokalpuri)\b/i, canonical: "North East Delhi" },
  { pattern: /\b(?:jamia\s*nagar|batla\s*house|jasola|okhla)\b/i, canonical: "Jamia Nagar / Okhla, South East Delhi" },
  { pattern: /\b(?:civil\s*lines)\b/i, canonical: "Civil Lines, North Delhi" },
  { pattern: /\b(?:wazirabad|wazirabaad)\b/i, canonical: "Wazirabad, North Delhi" },
  { pattern: /\b(?:rani\s*bagh|kohat\s*enclave)\b/i, canonical: "Rani Bagh / Kohat Enclave, Delhi" },
  { pattern: /\b(?:delhi\s*cantt|delhi\s*cant)\b/i, canonical: "Delhi Cantt, South West Delhi" },
  { pattern: /\b(?:vipin\s*garden)\b/i, canonical: "Vipin Garden, Dwarka Mor, Delhi" },
  { pattern: /\b(?:vishnu\s*garden)\b/i, canonical: "Vishnu Garden, West Delhi" },
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

function isLocationOrSubjectLine(line: string): boolean {
  const lower = line.toLowerCase().trim();
  const locKeywords = [
    "garden", "enclave", "colony", "nagar", "bagh", "vihar", "sector", "sec",
    "phase", "block", "street", "gali", "marg", "road", "delhi", "noida", "nodia",
    "gurgaon", "gurugram", "ghaziabad", "faridabad", "mumbai", "court", "station",
    "park", "appartment", "apartment", "flats", "floor", "house", "h.no", "plot",
    "opp", "opposite", "near", "village", "extension", "extn", "lane", "bazar", "bzar", "mohalla"
  ];
  if (locKeywords.some((k) => lower.includes(k))) return true;

  const subKeywords = [
    "math", "maths", "science", "physics", "chemistry", "biology", "botany", "zoology",
    "account", "accounts", "eco", "economics", "bst", "sst", "english", "hindi",
    "sanskrit", "french", "german", "spanish", "computer", "arts", "pcm", "pcb", "commerce"
  ];
  if (subKeywords.some((k) => lower === k || lower.startsWith(k + " ") || lower.endsWith(" " + k))) return true;

  return false;
}

// ─── High-Speed Local Lead Extractor ─────────────────────────────────────────

export function extractLeadDataFast(text: string): ParsedLead {
  const trimmed = text.trim();
  const lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);

  // 1. Junk detection
  if (isJunkMessage(trimmed)) {
    return {
      leadType: "OTHER",
      name: null,
      phone: null,
      altPhone: null,
      whatsapp: null,
      email: null,
      location: null,
      pincode: null,
      fullAddress: null,
      subjects: [],
      classes: [],
      board: null,
      qualification: null,
      experienceYears: null,
      gender: null,
      budgetFee: null,
      appliedCodes: [],
      operationalNotes: null,
      isJunk: true,
      confidence: 90,
      rawText: trimmed,
    };
  }

  // 2. Lead Type
  const isParentLead = /\b(?:parents?|parent|student(?:\s*name)?|daughter|son|child|bacha|require(?:\s*female)?\s*(?:home\s*)?tutor|need\s*(?:a\s*)?(?:home\s*)?tutor|tution\s*for\s*my|i\s*want\s*(?:a\s*)?tutor\s*for|request\s*tuition\s*for)\b/i.test(trimmed);
  const leadType: "TUTOR" | "PARENT_LEAD" | "OTHER" = isParentLead ? "PARENT_LEAD" : "TUTOR";

  // 3. Phone Numbers
  const rawDigits = trimmed.match(/(?:(?:\+?91[\s-]?)|\b)[6-9]\d{9}\b|(?:(?:\+?91[\s-]?)|\b)[6-9][\d\s-]{8,15}\b|(?<=[-:=,\s/])[6-9]\d{9}\b/g) ?? [];
  const phoneMatches = rawDigits
    .map((p) => p.replace(/\D/g, "").slice(-10))
    .filter((p) => /^[6-9]\d{9}$/.test(p));
  const uniquePhones = [...new Set(phoneMatches)];

  // 4. Emails
  const emailMatches = [...trimmed.matchAll(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g)].map((m) => m[0].toLowerCase());
  const uniqueEmails = [...new Set(emailMatches)];

  // 5. Name Extraction
  let name: string | null = null;
  const INVALID_NAME_WORDS = [
    "tutor profile", "tutor details", "profile details", "details require",
    "dear tutor", "dear team", "objective", "sincerely", "regards",
    "qualification", "complete address", "educational qualification",
    "special skills", "sarita vihar", "maya puri", "munirka", "roop nagar",
    "delhi", "noida", "gurgaon", "ghaziabad", "bangalore", "mumbai",
    "whatsapp on", "contact no", "home tuition", "home tutor", "required", "classes",
    "about myself", "teacher registration", "my profile", "seeking science",
    "location", "subject", "classes can teach", "good afternoon", "good evening",
    "parents", "paid", "renew", "registration", "hello", "hi", "sir", "madam", "mam"
  ];

  // Strategy A: Explicit Label Match
  const explicitNamePatterns = [
    /(?:(?:1\s*[\.\)]\s*)?(?:Tutor\s*Name|Full\s*Name|Candidate\s*Name|Applicant\s*Name|Student\s*Name|Parent\s*Name|Name\s*(?:as per Aadhar)?|Tutor))[^\n\r:=]*[:=-]\s*([^\n\r,]+)/i,
    /(?:(?:I am|My name is|This is|Myself|Self)\s+([A-Za-z\s.]{2,35}))/i,
    /(?:Code[:.]\s*C\d+[\s\S]*?Name[:.]\s*([A-Za-z\s.]{2,35}))/i,
    /(?:(?:Sir|Ma'am|Team)[,\s\n]+([A-Za-z\s.]{2,35})\s+this\s+side)/i,
    /([A-Za-z\s.]{2,35})\s+this\s+side/i,
  ];

  for (const pat of explicitNamePatterns) {
    const m = trimmed.match(pat);
    if (m && m[1]) {
      let candidate = m[1]
        .replace(/^(as per Aadhar|for Profile|as a Tutor|Sir|Madam|Dr\.|Mr\.|Mrs\.|Ms\.|Shri|Smt)\s*[-:]?\s*/i, "")
        .replace(/\s*(?:s\/o|w\/o|d\/o|age\s*[-:]|Contact|Phone|Mobile|Email|Qual|Class|Sub|Address|Loc|DOB)[\s\S]*$/i, "")
        .replace(/[^\w\s.]/g, "")
        .trim();
      const lower = candidate.toLowerCase();
      if (
        candidate.length >= 2 &&
        candidate.length <= 35 &&
        !isLocationOrSubjectLine(candidate) &&
        !INVALID_NAME_WORDS.some((inv) => lower === inv || lower.startsWith(inv + " "))
      ) {
        name = candidate.split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
        break;
      }
    }
  }

  // Strategy B: First-line or header inspection (e.g. "Praveen Kumar Singh \n Qualification: ...")
  if (!name && lines.length > 0) {
    for (let i = 0; i < Math.min(lines.length, 3); i++) {
      const line = lines[i]
        .replace(/^(?:\[.*?\]|\d{1,2}\/\d{1,2}\/\d{2,4},?\s*\d{1,2}:\d{2}\s*(?:am|pm)?\s*-?)\s*[^:]*:\s*/i, "")
        .trim();

      const words = line.split(/\s+/).filter(Boolean);
      const lower = line.toLowerCase();
      const hasDigits = /\d/.test(line);
      const isExcluded = INVALID_NAME_WORDS.some((inv) => lower.includes(inv)) ||
        isLocationOrSubjectLine(line) ||
        /^(?:hi|hello|dear|applying|subject|classes|contact|phone|email|please|details|parents|required|yes|no|ok|done|cbse|icse|ib|online|offline|grade|fee)/i.test(line);

      if (!hasDigits && !isExcluded && words.length >= 1 && words.length <= 3 && line.length >= 3 && line.length <= 30) {
        name = words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
        break;
      }
    }
  }

  // Strategy C: Infer Name from Email
  if (!name && uniqueEmails.length > 0) {
    name = extractNameFromEmail(uniqueEmails[0]);
  }

  // 6. Pincode
  const pincodeMatch = trimmed.match(/\b([1-9]\d{5})\b/);
  const pincode = pincodeMatch ? pincodeMatch[1] : null;

  // 7. Full Address & Multi-Line Capture
  let fullAddress: string | null = null;
  const addressBlockMatch = trimmed.match(/(?:Complete address|Full address|Current address|Residential address|Permanent address|Address|Add|Addr|H\.No|Flat No|House No|Plot No)[^\n\r:=]*[:=-]\s*([\s\S]+?)(?=\n\s*(?:(?:1?\d\s*[\.\)]\s*)?(?:Contact|Phone|Mobile|Whatapp|WhatsApp|Email|Qualification|Qual|Experience|Exp|Subjects|Classes|Sincerely|Regards|50 percent)|$))/i);

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

  // 8. Location & Locality
  let location: string | null = null;
  const locExplicitMatch = trimmed.match(/(?:Your location|Location|Locality|Area|Pref Area|Preferred Area|Preferred Location|Residing at|Living in|Nearby|Near|Address location)[^\n\r:=]*[:=-]\s*([^\n\r]+)/i);

  if (locExplicitMatch && locExplicitMatch[1]) {
    location = locExplicitMatch[1]
      .replace(/^(with house no\.?|Address pincode|Home tuition only)[\s\S]*$/i, "")
      .trim()
      .split("\n")[0]
      .trim();
  }

  if (!location) {
    for (const { pattern, canonical } of LOCATION_MAPPINGS) {
      if (pattern.test(trimmed)) {
        location = canonical;
        break;
      }
    }
  }

  location = normalizeLocation(location);

  if (fullAddress && !location) {
    const parts = fullAddress.split(",").map((s) => s.trim()).filter(Boolean);
    location = parts.length >= 2 ? parts.slice(-2).join(", ") : parts[0] || null;
  } else if (location && !fullAddress) {
    fullAddress = location;
  }

  // 9. Subjects
  const foundSubjects: string[] = [];
  const subMatchers: Array<{ pattern: RegExp; subjects: string[] }> = [
    { pattern: /\bpcm\b/i, subjects: ["Physics", "Chemistry", "Mathematics"] },
    { pattern: /\bpcb\b/i, subjects: ["Physics", "Chemistry", "Biology"] },
    { pattern: /\b(?:phy|physics)\b/i, subjects: ["Physics"] },
    { pattern: /\b(?:chem|chemistry|chemsitry)\b/i, subjects: ["Chemistry"] },
    { pattern: /\b(?:bio|biology|botany|zoology|anatomy|physiology)\b/i, subjects: ["Biology"] },
    { pattern: /\b(?:math|maths|mat|nathi|mathematics|applied\s*math(?:ematic)?s?)\b/i, subjects: ["Mathematics"] },
    { pattern: /\b(?:acc|account|accounts|accountancy|b\.com|bcom|cost\s*accounting|corporate\s*accounts|taxation|gst|audit)\b/i, subjects: ["Accountancy"] },
    { pattern: /\b(?:eco|economic|economics)\b/i, subjects: ["Economics"] },
    { pattern: /\b(?:bst|b\.st|b\s*studies|business\s*studies)\b/i, subjects: ["Business Studies"] },
    { pattern: /\b(?:sst|ss|social\s*studies|social\s*science)\b/i, subjects: ["Social Science"] },
    { pattern: /\b(?:cs|comp|computer|coding|python|java|c\+\+|html|mysql|sql|auto\s*cad|web\s*designing)\b/i, subjects: ["Computer Science"] },
    { pattern: /\b(?:pol|polsci|political\s*science|polity)\b/i, subjects: ["Political Science"] },
    { pattern: /\b(?:geo|geography)\b/i, subjects: ["Geography"] },
    { pattern: /\b(?:his|history)\b/i, subjects: ["History"] },
    { pattern: /\b(?:psy|psycho|psychology|phsycology)\b/i, subjects: ["Psychology"] },
    { pattern: /\b(?:sociology)\b/i, subjects: ["Sociology"] },
    { pattern: /\b(?:evs)\b/i, subjects: ["EVS"] },
    { pattern: /\b(?:vedic\s*maths?)\b/i, subjects: ["Vedic Mathematics"] },
    { pattern: /\b(?:phonics)\b/i, subjects: ["Phonics"] },
    { pattern: /\b(?:handwriting)\b/i, subjects: ["Handwriting"] },
    { pattern: /\b(?:autism|special\s*edu(?:cator)?|special\s*need)\b/i, subjects: ["Special Education"] },
    { pattern: /\b(?:french)\b/i, subjects: ["French"] },
    { pattern: /\b(?:spanish)\b/i, subjects: ["Spanish"] },
    { pattern: /\b(?:german)\b/i, subjects: ["German"] },
    { pattern: /\b(?:japanese|japanes)\b/i, subjects: ["Japanese"] },
    { pattern: /\b(?:chinese)\b/i, subjects: ["Chinese"] },
    { pattern: /\b(?:sanskrit|sanskriti)\b/i, subjects: ["Sanskrit"] },
    { pattern: /\b(?:punjabi)\b/i, subjects: ["Punjabi"] },
    { pattern: /\b(?:hindi)\b/i, subjects: ["Hindi"] },
    { pattern: /\b(?:marathi)\b/i, subjects: ["Marathi"] },
    { pattern: /\b(?:telugu|telgu)\b/i, subjects: ["Telugu"] },
    { pattern: /\b(?:urdu)\b/i, subjects: ["Urdu"] },
    { pattern: /\b(?:arabic)\b/i, subjects: ["Arabic"] },
    { pattern: /\b(?:english|ielts|toefl|pte|celpip|spoken\s*english)\b/i, subjects: ["English"] },
    { pattern: /\b(?:dance|guitar|vocal\s*music|music|yoga|karate|art\s*and\s*craft|painting|drawing)\b/i, subjects: ["Extracurricular"] },
    { pattern: /\b(?:all\s*subjects?|all\s*sub)\b/i, subjects: ["All Subjects"] },
  ];

  for (const { pattern, subjects } of subMatchers) {
    if (pattern.test(trimmed)) {
      for (const s of subjects) {
        if (!foundSubjects.includes(s)) foundSubjects.push(s);
      }
    }
  }

  // 10. Classes
  const classNumbers: string[] = [];
  const classRanges = [...trimmed.matchAll(/(?:class\s*)?(\d{1,2})\s*(?:st|nd|rd|th)?\s*(?:to|-|–)\s*(?:class\s*)?(\d{1,2})\s*(?:st|nd|rd|th)?/gi)];
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
    const singles = [...trimmed.matchAll(/(?:class\s*)?(\d{1,2})\s*(?:st|nd|rd|th)/gi)];
    for (const m of singles) {
      const n = parseInt(m[1]);
      if (n >= 1 && n <= 12) {
        const c = `Class ${n}`;
        if (!classNumbers.includes(c)) classNumbers.push(c);
      }
    }
  }
  if (/\b(?:nursery|kg|lkg|ukg|prep|pre\s*nursery)\b/i.test(trimmed)) {
    for (const k of ["Nursery", "LKG", "UKG"]) {
      if (!classNumbers.includes(k)) classNumbers.unshift(k);
    }
  }
  if (/\b(?:neet|iit|jee|iitjee|cuet)\b/i.test(trimmed)) {
    if (!classNumbers.includes("Class 11")) classNumbers.push("Class 11");
    if (!classNumbers.includes("Class 12")) classNumbers.push("Class 12");
  }

  // 11. Fee / Budget
  let budgetFee: string | null = null;
  const feeMatch = trimmed.match(/(?:fee|budget|charges|rate)[^\d]*(\d{3,6})(?:\s*(?:per|\/)?\s*(?:month|hr|hour|session))?/i);
  if (feeMatch) {
    budgetFee = `₹${feeMatch[1]}${feeMatch[0].toLowerCase().includes("hr") || feeMatch[0].toLowerCase().includes("hour") ? "/hr" : "/month"}`;
  } else {
    const directKMatch = trimmed.match(/\b(\d{1,2})\s*k\b/i);
    if (directKMatch) {
      budgetFee = `₹${parseInt(directKMatch[1]) * 1000}/month`;
    }
  }

  // 12. Applied Codes (e.g. C102, C114, C-134, D110)
  const codeMatches = [...trimmed.matchAll(/\b[CD]-?(\d{3,4})\b/gi)].map((m) => `C${m[1]}`);
  const appliedCodes = [...new Set(codeMatches)];

  // 13. Operational Notes
  const opNotes: string[] = [];
  if (/\b(?:paid|paid\s*today|payment\s*ki\s*hai)\b/i.test(trimmed)) opNotes.push("Paid Registration");
  if (/\b(?:demo|trial)\b/i.test(trimmed)) {
    const demoSnippet = trimmed.match(/(?:demo|trial)[^\n,.]{0,40}/i)?.[0];
    if (demoSnippet) opNotes.push(demoSnippet.trim());
  }
  if (/\b(?:call\s*back|follow\s*up)\b/i.test(trimmed)) opNotes.push("Follow Up Required");
  if (/\b(?:refund)\b/i.test(trimmed)) opNotes.push("Refund Requested");
  if (appliedCodes.length > 0) opNotes.push(`Applied Codes: ${appliedCodes.join(", ")}`);

  // 14. Qualification
  let qualification: string | null = null;
  const qualMatch = trimmed.match(/(?:qualification|degree|edu)[^\n\r:=]*[:=-]\s*([A-Za-z\s\(\)\.]{3,80})/i);
  if (qualMatch) qualification = qualMatch[1].trim().split("\n")[0].trim();
  if (!qualification) {
    const qualKws = ["B.Ed", "B.Tech", "BTech", "B.Sc", "BSc", "M.Tech", "MBA", "MCA", "M.Sc", "MSc", "MA", "BA", "B.Com", "M.Com", "PhD", "MBBS", "CTET", "JBT", "BAMS", "BHMS", "CA Inter", "CA Final"];
    for (const kw of qualKws) {
      if (new RegExp(`(^|[^a-zA-Z0-9])${escapeRegex(kw)}($|[^a-zA-Z0-9])`, "i").test(trimmed)) {
        qualification = kw;
        break;
      }
    }
  }

  // 15. Experience
  let experienceYears: number | null = null;
  const expMatch = trimmed.match(/(?:experience|exp)[^\d]*(\d+)\s*(?:year|yr)/i);
  if (expMatch) experienceYears = parseInt(expMatch[1]);

  // 16. Gender
  let gender: string | null = null;
  if (/\bFemale\b/i.test(trimmed)) gender = "Female";
  else if (/\bMale\b/i.test(trimmed)) gender = "Male";

  const hasPhone = Boolean(uniquePhones[0]);
  const hasEmail = Boolean(uniqueEmails[0]);
  const hasName = Boolean(name);
  const hasLoc = Boolean(location || fullAddress);

  let dynConfidence = 30;
  if (hasPhone) dynConfidence += 30;
  if (hasEmail) dynConfidence += 15;
  if (hasName) dynConfidence += 15;
  if (hasLoc) dynConfidence += 10;

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
    board: trimmed.includes("CBSE") ? "CBSE" : trimmed.includes("ICSE") ? "ICSE" : trimmed.includes("IB") ? "IB" : null,
    qualification,
    experienceYears,
    gender,
    budgetFee,
    appliedCodes,
    operationalNotes: opNotes.length > 0 ? opNotes.join(" | ") : null,
    isJunk: !hasPhone && !hasEmail && !hasName && !hasLoc,
    confidence: Math.min(dynConfidence, 95),
    rawText: trimmed,
  };
}

// ─── Main Extract Lead Data ──────────────────────────────────────────────────

export async function extractLeadData(rawText: string): Promise<ParsedLead> {
  return extractLeadDataFast(rawText);
}

// ─── Batch Extract with High-Speed In-Memory Execution ───────────────────────

export async function extractLeadsBatch(
  messages: string[],
  onProgress?: (done: number, total: number) => void
): Promise<ParsedLead[]> {
  const results: ParsedLead[] = [];
  const total = messages.length;

  for (let i = 0; i < total; i++) {
    const lead = extractLeadDataFast(messages[i]);
    results.push(lead);
    if (onProgress && (i % 50 === 0 || i === total - 1)) {
      onProgress(i + 1, total);
    }
  }

  return results;
}
