/**
 * lib/whatsapp-bot/subject-rules.ts
 *
 * Common-sense educational domain knowledge and validation for ApnaTutorHub chatbot.
 * Enforces realistic subject-grade boundaries across Indian school curricula (CBSE / ICSE / State Boards).
 * Prevents illogical combinations (e.g. Physics for Class 5, Accounts for Class 4, French for KG, etc.)
 * both in quick-reply suggestions and user input validation.
 */

import { INDIAN_CITY_COORDINATES } from "@/lib/geocoding";
import { GEO_LOCALITIES } from "@/lib/dummy-lead-engine";
import {
  ALL_CANONICAL_SUBJECTS,
  normalizeTaxonomySubject,
  searchTaxonomySubjects,
} from "@/lib/subject-taxonomy";

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
  suggestedReplies?: string[];
  switchedSubject?: string[];
  switchedClass?: string;
}

// ── Universal Indian Locality & City Database ──────────────────────────────────
export const KNOWN_INDIAN_CITIES: Record<string, string> = {
  delhi: "Delhi",
  "new delhi": "Delhi",
  noida: "Noida",
  "greater noida": "Greater Noida",
  gurgaon: "Gurgaon",
  gurugram: "Gurgaon",
  ghaziabad: "Ghaziabad",
  faridabad: "Faridabad",
  mumbai: "Mumbai",
  "navi mumbai": "Navi Mumbai",
  thane: "Thane",
  kalyan: "Mumbai",
  bangalore: "Bangalore",
  bengaluru: "Bangalore",
  pune: "Pune",
  hyderabad: "Hyderabad",
  secunderabad: "Hyderabad",
  chennai: "Chennai",
  kolkata: "Kolkata",
  howrah: "Kolkata",
  jaipur: "Jaipur",
  jodhpur: "Jaipur",
  kota: "Kota",
  lucknow: "Lucknow",
  kanpur: "Kanpur",
  varanasi: "Varanasi",
  agra: "Agra",
  prayagraj: "Prayagraj",
  meerut: "Meerut",
  chandigarh: "Chandigarh",
  mohali: "Chandigarh",
  panchkula: "Chandigarh",
  ludhiana: "Ludhiana",
  amritsar: "Amritsar",
  ahmedabad: "Ahmedabad",
  surat: "Surat",
  vadodara: "Vadodara",
  rajkot: "Rajkot",
  indore: "Indore",
  bhopal: "Bhopal",
  patna: "Patna",
  ranchi: "Ranchi",
  dehradun: "Dehradun",
  nagpur: "Nagpur",
  nashik: "Nashik",
  bhubaneswar: "Bhubaneswar",
  cuttack: "Bhubaneswar",
  raipur: "Raipur",
  guwahati: "Guwahati",
  kochi: "Kochi",
  coimbatore: "Coimbatore",
  visakhapatnam: "Visakhapatnam",
  vijayawada: "Vijayawada",
};

const NON_LOCALITY_WORDS = new Set([
  "hi", "hello", "hey", "namaste", "halo", "salaam", "pranam",
  "ok", "okay", "ha", "haan", "theek", "thik", "yes", "no", "nahi", "done", "skip",
  "hai", "hain", "ho", "hoon", "tha", "thi", "the", "ka", "ki", "ke", "ko", "se", "me", "mein", "par", "pe", "aur", "ya", "to", "bhi", "kuch", "ji",
  "kya", "kyun", "kaise", "kab", "kahan", "kitna", "kitne", "fees", "rate", "charge",
  "price", "cost", "payment", "free", "demo", "lead", "leads", "rules", "rule",
  "bhai", "yaar", "sir", "madam", "acha", "achha", "batayein", "bolo", "bol",
  "call", "help", "support", "please", "tutor", "teacher", "student", "parent",
  "bachcha", "child", "sirji", "mam", "padhana", "chahiye", "padhna", "sikhna",
  "contact", "number", "phone", "pass", "password", "email", "registration",
  "koi", "batao", "bhejo", "karo", "dekh", "update", "cancel", "stop", "menu", "start",
  "mere", "paas", "pass", "job", "kr", "kro", "lo", "mai", "main", "mera", "meri", "aap", "aapka", "aapki", "tum", "tumhara", "tumhari", "hum", "humara",
  "mujhe", "mujhko", "bola", "boli", "raha", "rahi", "rahe", "pagal", "salary", "paisa", "paise", "de", "do", "dena", "lena", "provide", "karta", "karti", "karte",
  "who", "what", "where", "how", "why", "when", "can", "could", "will", "would", "is", "am", "are", "have", "has", "give", "send", "tell", "teach", "work", "looking", "interested",
  "my", "home", "ghar", "house", "makaan", "anywhere", "kahin", "everywhere", "any", "all", "sab", "sabhi", "pure", "poore", "poora", "city", "state", "desh", "india"
]);

export const PLACE_INDICATORS = /\b(nagar|vihar|colony|enclave|sector|sec\b|phase|block|road|street|marg|bazaar|bazar|market|park|heights|apartments|extension|ext\b|pur\b|pura\b|ganj\b|gaon\b|halli\b|pet\b|peth\b|wadi\b|layout|kunj|chowk|cantt|tola|basti|para|palli|guda|hills|estate|town|society|complex|cross|main|line|lines|gali|mohalla|mandir|metro)\b/i;

const PROMINENT_LOCALITIES: Array<{ name: string; city: string }> = [
  { name: "mukundpur", city: "Delhi" },
  { name: "karawal nagar", city: "Delhi" },
  { name: "jahangirpuri", city: "Delhi" },
  { name: "yamuna vihar", city: "Delhi" },
  { name: "bhajanpura", city: "Delhi" },
  { name: "mukherjee nagar", city: "Delhi" },
  { name: "karol bagh", city: "Delhi" },
  { name: "rohini", city: "Delhi" },
  { name: "dwarka", city: "Delhi" },
  { name: "janakpuri", city: "Delhi" },
  { name: "uttam nagar", city: "Delhi" },
  { name: "vikaspuri", city: "Delhi" },
  { name: "paschim vihar", city: "Delhi" },
  { name: "pitampura", city: "Delhi" },
  { name: "shalimar bagh", city: "Delhi" },
  { name: "model town", city: "Delhi" },
  { name: "ashok vihar", city: "Delhi" },
  { name: "sangam vihar", city: "Delhi" },
  { name: "saket", city: "Delhi" },
  { name: "hauz khas", city: "Delhi" },
  { name: "malviya nagar", city: "Delhi" },
  { name: "greater kailash", city: "Delhi" },
  { name: "kalkaji", city: "Delhi" },
  { name: "nehru place", city: "Delhi" },
  { name: "lajpat nagar", city: "Delhi" },
  { name: "vasant kunj", city: "Delhi" },
  { name: "vasant vihar", city: "Delhi" },
  { name: "laxmi nagar", city: "Delhi" },
  { name: "mayur vihar", city: "Delhi" },
  { name: "shahdara", city: "Delhi" },
  { name: "burari", city: "Delhi" },
  { name: "sant nagar", city: "Delhi" },
  { name: "patel nagar", city: "Delhi" },
  { name: "rajouri garden", city: "Delhi" },
  { name: "tilak nagar", city: "Delhi" },
  { name: "najafgarh", city: "Delhi" },
  { name: "narela", city: "Delhi" },
  { name: "bawana", city: "Delhi" },
  { name: "badarpur", city: "Delhi" },
  { name: "sarita vihar", city: "Delhi" },
  { name: "okhla", city: "Delhi" },
  { name: "jasola", city: "Delhi" },
  { name: "indirapuram", city: "Ghaziabad" },
  { name: "vaishali", city: "Ghaziabad" },
  { name: "kaushambi", city: "Ghaziabad" },
  { name: "bandra west", city: "Mumbai" },
  { name: "bandra", city: "Mumbai" },
  { name: "andheri west", city: "Mumbai" },
  { name: "andheri east", city: "Mumbai" },
  { name: "andheri", city: "Mumbai" },
  { name: "borivali", city: "Mumbai" },
  { name: "dadar", city: "Mumbai" },
  { name: "powai", city: "Mumbai" },
  { name: "juhu", city: "Mumbai" },
  { name: "whitefield", city: "Bangalore" },
  { name: "koramangala", city: "Bangalore" },
  { name: "indiranagar", city: "Bangalore" },
  { name: "hsr layout", city: "Bangalore" },
  { name: "jayanagar", city: "Bangalore" },
  { name: "kothrud", city: "Pune" },
  { name: "wakad", city: "Pune" },
  { name: "hinjewadi", city: "Pune" },
  { name: "baner", city: "Pune" },
  { name: "viman nagar", city: "Pune" },
  { name: "jubilee hills", city: "Hyderabad" },
  { name: "banjara hills", city: "Hyderabad" },
  { name: "gachibowli", city: "Hyderabad" },
  { name: "madhapur", city: "Hyderabad" },
  { name: "gomti nagar", city: "Lucknow" },
  { name: "aliganj", city: "Lucknow" },
  { name: "hazratganj", city: "Lucknow" },
  { name: "indira nagar", city: "Lucknow" },
  { name: "mansarovar", city: "Jaipur" },
  { name: "vaishali nagar", city: "Jaipur" },
  { name: "salt lake", city: "Kolkata" },
  { name: "new town", city: "Kolkata" },
  { name: "park street", city: "Kolkata" },
  { name: "boring road", city: "Patna" },
  { name: "kankarbagh", city: "Patna" },
  { name: "sector 17", city: "Chandigarh" },
  { name: "civil lines", city: "Delhi" },
  { name: "connaught place", city: "Delhi" }
];

/**
 * Universally validates and sanitizes any user-entered locality or area across India.
 * Distinguishes genuine locations from conversational noise, questions, or fees queries.
 */
export function validateAndCleanLocality(
  raw: unknown,
  defaultCity = "Delhi"
): { isValid: boolean; area: string; city: string; errorPrompt?: string } {
  if (!raw || typeof raw !== "string") {
    return { isValid: false, area: "", city: defaultCity, errorPrompt: `📍 Aapna teaching area batayein — jaise *Rohini Delhi*, *Dwarka*, *Bandra Mumbai*, ya *Sector 62 Noida*.` };
  }

  let clean = raw.trim();

  // Strip conversational wrappers (Hinglish + English)
  clean = clean.replace(/^(mai|main|hum|me|i\s*am\s*from|i\s*live\s*in|living\s*in|my\s*(?:new\s+)?(?:area|location|locality)\s+is|mera\s+(?:area|location|locality)|meri\s+(?:location|jagah)|near|nearby|opposite|opp|area|location|locality)[:\s-]+/i, "");
  clean = clean.replace(/\s+(se\s+hu|se\s+hoon|se|mein|me|rehta\s+hu|rehta\s+hoon|area|locality)\b.*$/i, "");
  clean = clean.replace(/^[,.-]+|[,.-]+$/g, "").trim();

  // Foreign / International Locations -> Route to Online Classes
  const FOREIGN_PLACES = /\b(dubai|uae|sharjah|abu\s*dhabi|london|uk|united\s*kingdom|usa|united\s*states|america|canada|toronto|vancouver|australia|sydney|melbourne|singapore|germany|qatar|doha|kuwait|oman|muscat|saudi|riyadh|jeddah|abroad|overseas|foreign)\b/i;
  if (FOREIGN_PLACES.test(clean)) {
    return {
      isValid: true,
      area: "International (Online)",
      city: "Online",
    };
  }

  // 6-digit Indian Pincode recognition
  const pincodeMatch = clean.match(/\b([1-8]\d{5})\b/);
  if (pincodeMatch) {
    const pin = pincodeMatch[1];
    const isDummyPin = /^(123456|111111|222222|333333|444444|555555|666666|777777|888888)$/.test(pin);
    if (!isDummyPin) {
      const prefix2 = pin.slice(0, 2);
      const prefix3 = pin.slice(0, 3);
      let pinCity = defaultCity;

    if (prefix2 === "11") pinCity = "Delhi";
    else if (prefix3.startsWith("121")) pinCity = "Faridabad";
    else if (prefix3.startsWith("122")) pinCity = "Gurgaon";
    else if (prefix3.startsWith("201")) pinCity = "Noida";
    else if (prefix2 === "40") pinCity = "Mumbai";
    else if (prefix3.startsWith("411")) pinCity = "Pune";
    else if (prefix3.startsWith("560")) pinCity = "Bangalore";
    else if (prefix3.startsWith("700")) pinCity = "Kolkata";
    else if (prefix3.startsWith("500")) pinCity = "Hyderabad";
    else if (prefix3.startsWith("600")) pinCity = "Chennai";
    else if (prefix3.startsWith("302")) pinCity = "Jaipur";
    else if (prefix3.startsWith("226")) pinCity = "Lucknow";
    else if (prefix3.startsWith("800")) pinCity = "Patna";
    else if (prefix3.startsWith("380")) pinCity = "Ahmedabad";
    else if (prefix3.startsWith("160")) pinCity = "Chandigarh";

      return {
        isValid: true,
        area: `Pincode ${pin}`,
        city: pinCity,
      };
    }
  }

  // 1. Check known GEO_LOCALITIES database FIRST (e.g. Whitefield -> Bangalore, Kothrud -> Pune, Rohini -> Delhi)
  for (const loc of GEO_LOCALITIES) {
    const pureName = loc.name.split(" (")[0];
    const rx = new RegExp(`\\b${pureName}\\b`, "i");
    if (rx.test(clean)) {
      return {
        isValid: true,
        area: pureName,
        city: loc.city || defaultCity,
      };
    }
  }

  // 2. Check if a known city is explicitly mentioned (e.g. "Bandra West, Mumbai", "Sector 62 Noida", "Salt Lake Sector 5, Kolkata")
  const sortedCities = Object.keys(KNOWN_INDIAN_CITIES).sort((a, b) => b.length - a.length);
  for (const cKey of sortedCities) {
    const rx = new RegExp(`\\b${cKey}\\b`, "i");
    if (rx.test(clean)) {
      const detectedCity = KNOWN_INDIAN_CITIES[cKey];
      const remainingArea = clean.replace(rx, "").replace(/^[,.\s-]+|[,.\s-]+$/g, "").trim();

      const remWords = remainingArea.toLowerCase().split(/[\s,.-]+/).filter(Boolean);
      const isFillerOnly = remWords.length === 0 || remWords.every((w) => NON_LOCALITY_WORDS.has(w));
      const hasPlaceKeyword = PLACE_INDICATORS.test(remainingArea);
      const hasStopWord = remWords.some((w) => NON_LOCALITY_WORDS.has(w));

      if (remainingArea.length >= 2 && !isFillerOnly && (!hasStopWord || hasPlaceKeyword)) {
        const capArea = remainingArea
          .split(/\s+/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(" ");
        return {
          isValid: true,
          area: capArea,
          city: detectedCity,
        };
      }

      // If user only gave the city name (e.g. "Delhi", "Mumbai") or filler like "Delhi mein kahin bhi",
      // we must prompt for their specific area in that city!
      return {
        isValid: false,
        area: "",
        city: detectedCity,
        errorPrompt: `📍 Sirf *${detectedCity}* mila — aapka specific mohalla ya area bhi batayein.\n\nJaise: *Rohini ${detectedCity}*, *Dwarka ${detectedCity}*, *Sector 15 ${detectedCity}*`,
      };
    }
  }

  // 3. Check PROMINENT_LOCALITIES (when city wasn't explicitly named e.g. "Mukundpur", "Kothrud", "Bandra")
  for (const loc of PROMINENT_LOCALITIES) {
    const rx = new RegExp(`\\b${loc.name}\\b`, "i");
    if (rx.test(clean)) {
      const cap = loc.name.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
      return {
        isValid: true,
        area: cap,
        city: loc.city || defaultCity,
      };
    }
  }

  // 4. Check against INDIAN_CITY_COORDINATES
  for (const [key] of Object.entries(INDIAN_CITY_COORDINATES)) {
    const rx = new RegExp(`\\b${key}\\b`, "i");
    if (rx.test(clean)) {
      const capArea = key.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
      return {
        isValid: true,
        area: capArea,
        city: defaultCity,
      };
    }
  }

  // Negative checks: questions, queries, numbers, gibberish (when no known locality was identified)
  if (clean.length < 2 || /^\d+$/.test(clean) || /\?|^(kya|kyun|kaise|kitna|kitne|fees|free)\b/i.test(clean)) {
    return {
      isValid: false, area: "", city: defaultCity,
      errorPrompt: `📍 Yeh area samajh nahi aaya. Apna *mohalla ya locality* likhein — jaise:\n• *Rohini, Delhi*\n• *Bandra, Mumbai*\n• *Sector 62, Noida*`,
    };
  }

  // Tokenize words
  const words = clean.toLowerCase().split(/[\s,.-]+/).filter(Boolean);
  if (words.length === 0) {
    return {
      isValid: false, area: "", city: defaultCity,
      errorPrompt: `📍 Area detect nahi hua. Apna *locality aur city* likhein — jaise:\n• *Rohini Delhi*\n• *Bandra Mumbai*\n• *Sector 62 Noida*`,
    };
  }

  // 4. General place validation across India
  const hasPlaceKeyword = PLACE_INDICATORS.test(clean);
  const hasStopWord = words.some((w) => NON_LOCALITY_WORDS.has(w));

  // Reject sentences or conversational text containing stop words when no explicit place keyword exists
  if (hasStopWord && !hasPlaceKeyword) {
    return {
      isValid: false, area: "", city: defaultCity,
      errorPrompt: `📍 Yeh ek sentence lag raha hai, area nahi. Sirf apna *mohalla / locality* type karein — jaise *Dwarka*, *Rohini*, ya *Andheri West*.`,
    };
  }

  // Reject multi-word phrases (> 3 words) without explicit place keywords
  if (words.length > 3 && !hasPlaceKeyword) {
    return {
      isValid: false, area: "", city: defaultCity,
      errorPrompt: `📍 Bahut saare words hain — sirf apna *locality aur city* likhein.\nUdaharan: *Vasant Kunj Delhi*, *Koramangala Bangalore*, *Hazratganj Lucknow*.`,
    };
  }

  // If it has a place keyword but also contains conversational intent words (job, salary, call, etc.), reject as a sentence
  if (words.some((w) => ["job", "salary", "pagal", "call", "chahiye", "padhana", "padhna", "free", "demo", "lead", "leads", "contact", "pass", "kr", "lo", "mera", "meri", "hum"].includes(w))) {
    return {
      isValid: false, area: "", city: defaultCity,
      errorPrompt: `📍 Yeh area nahi lag raha. Sirf apna *mohalla aur city* batayein.\nJaise: *Janakpuri Delhi*, *Bandra Mumbai*, *Sector 15 Noida*.`,
    };
  }

  // Proper name validation without place keyword (e.g. "Saket", "Bandra", "Civil Lines")
  // Reject gibberish: must have vowels and no consonant jam (e.g. "asdfghjk")
  const hasVowels = /[aeiouy]/i.test(clean);
  const hasConsonantJam = /[^aeiouy\s]{5,}/i.test(clean);
  const isGibberish = !hasVowels || hasConsonantJam;

  const isValidProperName = !isGibberish && words.length >= 1 && words.length <= 3 && !hasStopWord && /^[a-zA-Z\s'-]+$/.test(clean) && clean.length >= 3 && clean.length <= 30;

  if (hasPlaceKeyword || isValidProperName) {
    const formatted = clean
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
    return {
      isValid: true,
      area: formatted,
      city: defaultCity,
    };
  }

  return {
    isValid: false, area: "", city: defaultCity,
    errorPrompt: `📍 Yeh area pehchana nahi gaya. Apna sahi *locality aur city* likhein — jaise:\n• *Rohini, Delhi*\n• *Bandra, Mumbai*\n• *Salt Lake, Kolkata*\n• *Sector 62, Noida*`,
  };
}

/**
 * Validates and aligns raw subject input to canonical platform taxonomy.
 * Enforces critical educational rules:
 * - Class 1 to 8: strictly NO Physics, Chemistry, Biology! Normalizes to "Science" and "All Subjects (Class 1-8)".
 * - Rejects non-academic or unsupported subjects (cooking, driving, dance, etc.).
 * - Ensures 100% overlap with platform matching engine so lead notifications are dispatched.
 */
const CANONICAL_SET = new Set(ALL_CANONICAL_SUBJECTS);

const ROMAN_MAP: Record<number, string> = {
  1: "I", 2: "II", 3: "III", 4: "IV", 5: "V", 6: "VI",
  7: "VII", 8: "VIII", 9: "IX", 10: "X", 11: "XI", 12: "XII",
};

const COMBO_SUBJECTS_BY_GRADE: Record<number, string> = {
  1: "All Subjects For Class I",
  2: "All Subjects For Class II",
  3: "All Subjects For Class III",
  4: "All Subjects For Class IV",
  5: "All Subjects For Class V",
  6: "All Subjects For Class VI",
  7: "All Subjects For Class VII",
  8: "All Subjects For Class VIII",
  9: "All Subjects For Class IX",
  10: "All Subjects For Class X",
};

/**
 * Validates and aligns raw subject input to official platform taxonomy (lib/subject-taxonomy.ts).
 * Only accepts inputs that successfully match canonical subjects.
 * Rejects non-matching or arbitrary inputs so that tutor-lead notifications are 100% dispatchable.
 */
export function validateAndAlignSubjects(
  rawInput: unknown,
  classLevel?: string
): { isValid: boolean; subjects: string[]; humanLabel: string; errorPrompt?: string } {
  if (!rawInput) {
    return {
      isValid: false,
      subjects: [],
      humanLabel: "",
      errorPrompt: `📚 Kaunse subjects padhate hain? Sirf subject naam likhein, jaise:\n• *Maths, Science*\n• *Physics, Chemistry*\n• *All Subjects*\n• *English, Hindi*`,
    };
  }

  // Capture raw text for use in error messages
  const rawInputStr = Array.isArray(rawInput) ? rawInput.join(", ") : String(rawInput);
  const displayInput = rawInputStr.trim().slice(0, 30) + (rawInputStr.trim().length > 30 ? "..." : "");

  const rawList: string[] = Array.isArray(rawInput)
    ? rawInput.flatMap((s) => String(s).split(/[,&+\/\n]|(?:\band\b)|(?:\baur\b)/i))
    : String(rawInput).split(/[,&+\/\n]|(?:\band\b)|(?:\baur\b)/i);

  const cleanTokens = rawList.map((t) => t.trim()).filter((t) => t.length > 0);
  if (cleanTokens.length === 0) {
    return {
      isValid: false,
      subjects: [],
      humanLabel: "",
      errorPrompt: `📚 Koi subject nahi mila. Sirf subject naam likhein, jaise:\n• *Maths, Science*\n• *Physics, Chemistry*\n• *All Subjects*`,
    };
  }

  const grade = parseGrade(classLevel);
  const isPrimary = (grade !== null && grade <= 5) || /primary|kg|nursery|1\s*[-–to]\s*5/i.test(classLevel || "");
  const isMiddle = (grade !== null && grade >= 6 && grade <= 8) || /middle|6\s*[-–to]\s*8/i.test(classLevel || "");
  const isBelow9 = (grade !== null && grade <= 8) || isPrimary || isMiddle || /1\s*[-–to]\s*8|upto\s*8|till\s*8/i.test(classLevel || "");
  const isBelow11 = (grade !== null && grade <= 10) || isBelow9 || /9\s*[-–to]\s*10|secondary/i.test(classLevel || "");

  const matchedSubjects = new Set<string>();
  let hasUnsupportedHobby = false;

  for (const token of cleanTokens) {
    const t = token.toLowerCase();

    // Ignore pure conversational greetings or non-subject filler
    if (/^(hi|hello|hey|namaste|sir|madam|ji|ok|okay|yes|haan|theek|thik|batao|karo|plz|please|call|number)$/i.test(t)) {
      continue;
    }

    // Ignore pure class level tokens (e.g. "Class 10", "Class 9-10", "10th", "Class X", "All Classes")
    if (
      /^(?:class|grade|std|standard)\s*(?:\d{1,2}|[ivx]+)(?:\s*(?:to|-|and|&)\s*(?:class|grade|std|standard)?\s*(?:\d{1,2}|[ivx]+))?$/i.test(t) ||
      /^\b(\d{1,2}(?:st|nd|rd|th)?|\b[ivx]+\b)(?:\s*(?:to|-|and|&)\s*(?:\d{1,2}(?:st|nd|rd|th)?|\b[ivx]+\b))?$/i.test(t) ||
      /^(all classes|all grades|primary|middle|senior|secondary|nursery|kg|lkg|ukg)$/i.test(t)
    ) {
      continue;
    }

    // Ignore pure locality / place tokens (e.g. "Dwarka Delhi", "Rohini", "Delhi NCR")
    if (
      !/math|science|english|hindi|sanskrit|social|sst|physics|chemistry|biology|account|commerce|computer|coding/i.test(t) &&
      (validateAndCleanLocality(t).isValid || /vihar|nagar|road|enclave|colony|delhi|noida|gurgaon|sector|pur\b|ext\b|saket|dwarka|rohini/i.test(t))
    ) {
      continue;
    }

    // Reject non-academic hobbies, lifestyle or unsupported activities (cooking, driving, dance, gym, makeup, etc.)
    if (/\b(cooking|cookery|driving|driver|car\s*driving|gym|gymnasium|fitness|workout|bridal|makeup|groom\s*training|bride\s*training|nanny|babysitter|cricket|swimming|crypto|bitcoin|trading|dance|dancing|kathak|bharatanatyam|guitar|drums|piano|saxophone|harmonium|singing|opera|jazz|vocal\s*music|magic|skating)\b/i.test(t)) {
      hasUnsupportedHobby = true;
      continue;
    }

    // 1. Stream Combos: PCMB, PCM, PCB
    if (/\b(pcmb)\b/i.test(t)) {
      if (isBelow9) {
        matchedSubjects.add("Science");
        matchedSubjects.add("Mathematics");
        matchedSubjects.add("Maths");
        matchedSubjects.add("All Subjects");
        matchedSubjects.add("All Subjects (Class 1-8)");
      } else {
        matchedSubjects.add("Physics");
        matchedSubjects.add("Chemistry");
        matchedSubjects.add("Mathematics");
        matchedSubjects.add("Maths");
        matchedSubjects.add("Biology");
      }
      continue;
    }
    if (/\b(pcm)\b/i.test(t)) {
      if (isBelow9) {
        matchedSubjects.add("Science");
        matchedSubjects.add("Mathematics");
        matchedSubjects.add("Maths");
        matchedSubjects.add("All Subjects");
        matchedSubjects.add("All Subjects (Class 1-8)");
      } else {
        matchedSubjects.add("Physics");
        matchedSubjects.add("Chemistry");
        matchedSubjects.add("Mathematics");
        matchedSubjects.add("Maths");
      }
      continue;
    }
    if (/\b(pcb)\b/i.test(t)) {
      if (isBelow9) {
        matchedSubjects.add("Science");
        matchedSubjects.add("All Subjects");
        matchedSubjects.add("All Subjects (Class 1-8)");
      } else {
        matchedSubjects.add("Physics");
        matchedSubjects.add("Chemistry");
        matchedSubjects.add("Biology");
      }
      continue;
    }

    // 2. Streams: Commerce, Humanities / Arts
    if (/\b(commerce|commerce\s*stream)\b/i.test(t)) {
      if (!isBelow11) {
        matchedSubjects.add("Accountancy");
        matchedSubjects.add("Accounts");
        matchedSubjects.add("Business Studies");
        matchedSubjects.add("Economics");
        matchedSubjects.add("Commerce");
      }
      continue;
    }
    if (/\b(humanities|arts\s*stream)\b/i.test(t)) {
      matchedSubjects.add("Social Studies");
      matchedSubjects.add("Social Science");
      matchedSubjects.add("Economics");
      matchedSubjects.add("History");
      matchedSubjects.add("Geography");
      matchedSubjects.add("Political Science");
      continue;
    }

    // 3. All Subjects / Combo / General
    if (/all\s*subjects?|combo|sabhi|har\s*subject|general/i.test(t)) {
      matchedSubjects.add("All Subjects");
      if (isBelow9) matchedSubjects.add("All Subjects (Class 1-8)");
      if (isPrimary) matchedSubjects.add("All Subjects (Class 1-5)");
      if (isMiddle) matchedSubjects.add("All Subjects (Class 6-8)");
      if (grade && COMBO_SUBJECTS_BY_GRADE[grade]) {
        matchedSubjects.add(COMBO_SUBJECTS_BY_GRADE[grade]);
      }
      continue;
    }

    // 4. Mathematics (with Hindi Ganit and abbreviations)
    if (/\b(maths?|mathematics|algebra|calculus|geometry|trig|quant|arithmetic|mths?|ganit)\b/i.test(t)) {
      matchedSubjects.add("Mathematics");
      matchedSubjects.add("Maths");
      if (grade && grade >= 3 && grade <= 12 && ROMAN_MAP[grade]) {
        matchedSubjects.add(`Maths for Class ${ROMAN_MAP[grade]}`);
      }
      continue;
    }

    // 5. Science & Maths duo
    if (/science\s*(&|and|\+)\s*math|math\s*(&|and|\+)\s*science/i.test(t)) {
      matchedSubjects.add("Science & Maths");
      matchedSubjects.add("Mathematics");
      matchedSubjects.add("Maths");
      matchedSubjects.add("Science");
      continue;
    }

    // 6. Science / EVS (with Hindi Vigyan)
    if (
      /\b(science|general\s*science|sci|evs|environmental|scince|vigyan)\b/i.test(t) &&
      !/computer|comp\b|political|pol\b|social|data\s*science/i.test(t)
    ) {
      matchedSubjects.add("Science");
      matchedSubjects.add("General Science");
      if (isPrimary) {
        matchedSubjects.add("Science upto Class V");
        matchedSubjects.add("EVS");
      } else if (grade && grade <= 10 && ROMAN_MAP[grade]) {
        matchedSubjects.add(`Science for Class ${ROMAN_MAP[grade]}`);
      }
      continue;
    }

    // 7. English & Spoken English
    if (/\b(spoken\s*english|english\s*speaking|speaking)\b/i.test(t)) {
      matchedSubjects.add("Spoken English");
      matchedSubjects.add("English");
      continue;
    }
    if (/\b(english|grammar|literature|comprehension|eng|engish|angrezi)\b/i.test(t)) {
      matchedSubjects.add("English");
      if (isPrimary) matchedSubjects.add("English upto V");
      else if (grade && grade <= 8) matchedSubjects.add("English for VI to VIII");
      else if (grade && grade <= 10) matchedSubjects.add("English for IX - X");
      else if (grade && grade <= 12) matchedSubjects.add("English for XI - XII");
      continue;
    }

    // 8. Hindi & Sanskrit
    if (/\b(hindi|vyakaran)\b/i.test(t)) {
      matchedSubjects.add("Hindi");
      if (isPrimary) matchedSubjects.add("Hindi for Class upto V");
      else if (grade && grade <= 8) matchedSubjects.add("Hindi for Class VI to VIII");
      else if (grade && grade <= 10) matchedSubjects.add("Hindi for Class IX or X");
      else if (grade && grade <= 12) matchedSubjects.add("Hindi for Class XI or XII");
      continue;
    }
    if (/\b(sanskrit)\b/i.test(t)) {
      matchedSubjects.add("Sanskrit");
      continue;
    }

    // 9. Social Studies / SST / History / Geography / Civics / Pol Science
    if (/\b(social\s*studies|sst|social\s*science|samajik\s*vigyan|gk|general\s*knowledge)\b/i.test(t)) {
      matchedSubjects.add("Social Studies");
      matchedSubjects.add("Social Science");
      if (grade && grade >= 6 && grade <= 10 && ROMAN_MAP[grade]) {
        matchedSubjects.add(`Social Studies for Class ${ROMAN_MAP[grade]}`);
      }
      continue;
    }
    if (/\b(history|itihas)\b/i.test(t)) {
      matchedSubjects.add("History");
      matchedSubjects.add("Social Studies");
      continue;
    }
    if (/\b(geography|bhugol)\b/i.test(t)) {
      matchedSubjects.add("Geography");
      matchedSubjects.add("Social Studies");
      continue;
    }
    if (/\b(political\s*science|pol\s*science|civics|polity)\b/i.test(t)) {
      matchedSubjects.add("Political Science");
      matchedSubjects.add("Civics");
      continue;
    }
    if (/\b(psychology)\b/i.test(t)) { matchedSubjects.add("Psychology"); continue; }
    if (/\b(sociology)\b/i.test(t)) { matchedSubjects.add("Sociology"); continue; }
    if (/\b(philosophy)\b/i.test(t)) { matchedSubjects.add("Philosophy"); continue; }

    // 10. Computer Science / Coding / IT / Python
    if (/\b(computer\s*science|computer|cs|coding|python|java|c\+\+|programming|it\b|ai\b|robotics)\b/i.test(t)) {
      matchedSubjects.add("Computer Science");
      matchedSubjects.add("Computer");
      if (/python/i.test(t)) matchedSubjects.add("Python");
      if (/coding|programming/i.test(t)) matchedSubjects.add("Coding");
      if (/it\b|information/i.test(t)) matchedSubjects.add("Information Technology");
      continue;
    }

    // 11. Senior Sciences: Physics, Chemistry, Biology (Class 1-8 restriction strictly enforced!)
    if (/\b(physics|phy|phyics|bhautiki)\b/i.test(t)) {
      if (isBelow9) {
        matchedSubjects.add("Science");
        matchedSubjects.add("All Subjects (Class 1-8)");
      } else if (isBelow11) {
        matchedSubjects.add("Science");
        if (grade && ROMAN_MAP[grade]) matchedSubjects.add(`Physics For Class ${ROMAN_MAP[grade]}`);
      } else {
        matchedSubjects.add("Physics");
        if (grade && ROMAN_MAP[grade]) matchedSubjects.add(`Physics For Class ${ROMAN_MAP[grade]}`);
      }
      continue;
    }

    if (/\b(chemistry|chem|chemstry|rasayan)\b/i.test(t)) {
      if (isBelow9) {
        matchedSubjects.add("Science");
        matchedSubjects.add("All Subjects (Class 1-8)");
      } else if (isBelow11) {
        matchedSubjects.add("Science");
        if (grade && ROMAN_MAP[grade]) matchedSubjects.add(`Chemistry For Class ${ROMAN_MAP[grade]}`);
      } else {
        matchedSubjects.add("Chemistry");
        if (grade && ROMAN_MAP[grade]) matchedSubjects.add(`Chemistry For Class ${ROMAN_MAP[grade]}`);
      }
      continue;
    }

    if (/\b(biology|botany|zoology|bio|jeev\s*vigyan)\b/i.test(t)) {
      if (isBelow9) {
        matchedSubjects.add("Science");
        matchedSubjects.add("All Subjects (Class 1-8)");
      } else if (isBelow11) {
        matchedSubjects.add("Science");
        if (grade && ROMAN_MAP[grade]) matchedSubjects.add(`Biology for Class ${ROMAN_MAP[grade]}`);
      } else {
        matchedSubjects.add("Biology");
        if (grade && ROMAN_MAP[grade]) matchedSubjects.add(`Biology for Class ${ROMAN_MAP[grade]}`);
      }
      continue;
    }

    // 12. Commerce & Management (Class 11+)
    if (/\b(accounts?|accountancy|acc|bahi\s*khata)\b/i.test(t)) {
      if (!isBelow11) {
        matchedSubjects.add("Accountancy");
        matchedSubjects.add("Accounts");
      }
      continue;
    }
    if (/\b(business\s*studies|bst)\b/i.test(t)) {
      if (!isBelow11) matchedSubjects.add("Business Studies");
      continue;
    }
    if (/\b(economics?|micro|macro|eco|arthashastra)\b/i.test(t)) {
      if (!isBelow9) matchedSubjects.add("Economics");
      continue;
    }

    // 13. Regional Indian Languages
    if (/\b(punjabi)\b/i.test(t)) { matchedSubjects.add("Punjabi"); matchedSubjects.add("Punjabi Language"); continue; }
    if (/\b(urdu)\b/i.test(t)) { matchedSubjects.add("Urdu"); matchedSubjects.add("Urdu Language"); continue; }
    if (/\b(marathi)\b/i.test(t)) { matchedSubjects.add("Marathi"); matchedSubjects.add("Marathi Language"); continue; }
    if (/\b(bengali|bangla)\b/i.test(t)) { matchedSubjects.add("Bengali"); matchedSubjects.add("Bengali Language"); continue; }
    if (/\b(gujarati)\b/i.test(t)) { matchedSubjects.add("Gujarati"); matchedSubjects.add("Gujarati Language"); continue; }
    if (/\b(tamil)\b/i.test(t)) { matchedSubjects.add("Tamil"); matchedSubjects.add("Tamil Langauge"); continue; }
    if (/\b(telugu)\b/i.test(t)) { matchedSubjects.add("Telugu"); matchedSubjects.add("Telugu Language"); continue; }
    if (/\b(kannada)\b/i.test(t)) { matchedSubjects.add("Kannada"); matchedSubjects.add("Kannada Language"); continue; }
    if (/\b(malayalam)\b/i.test(t)) { matchedSubjects.add("Malayalam"); matchedSubjects.add("Malayalam Language"); continue; }
    if (/\b(odia)\b/i.test(t)) { matchedSubjects.add("Odia"); matchedSubjects.add("Odia language"); continue; }

    // 14. International / Foreign Languages
    if (/\b(french)\b/i.test(t)) { matchedSubjects.add("French Language"); continue; }
    if (/\b(german)\b/i.test(t)) { matchedSubjects.add("German Language"); continue; }
    if (/\b(spanish)\b/i.test(t)) { matchedSubjects.add("Spanish Language"); continue; }
    if (/\b(japanese)\b/i.test(t)) { matchedSubjects.add("Japanese Language"); continue; }
    if (/\b(chinese|mandarin)\b/i.test(t)) { matchedSubjects.add("Chinese Language (Mandarin)"); continue; }
    if (/\b(russian)\b/i.test(t)) { matchedSubjects.add("Russian Language"); continue; }
    if (/\b(arabic)\b/i.test(t)) { matchedSubjects.add("Arabic Language"); continue; }
    if (/\b(italian)\b/i.test(t)) { matchedSubjects.add("Italian Language"); continue; }

    // 15. Specialized Skills / Early Education
    if (/\b(abacus)\b/i.test(t)) { matchedSubjects.add("Abacus"); continue; }
    if (/\b(vedic\s*maths?)\b/i.test(t)) { matchedSubjects.add("Vedic Maths"); continue; }
    if (/\b(phonics|jolly\s*phonics)\b/i.test(t)) { matchedSubjects.add("Jolly Phonics"); matchedSubjects.add("Phonetics"); continue; }
    if (/\b(nursery|playgroup|kindergarten|kg)\b/i.test(t)) {
      matchedSubjects.add("Nursery");
      matchedSubjects.add("All Subjects For KG (Kindergarten)");
      matchedSubjects.add("All Subjects for Preparatory");
      continue;
    }
    if (/\b(drawing|painting|sketching|art|fine\s*arts)\b/i.test(t)) { matchedSubjects.add("Drawing"); matchedSubjects.add("Painting"); continue; }
    if (/\b(yoga)\b/i.test(t)) { matchedSubjects.add("Yoga"); continue; }
    if (/\b(chess)\b/i.test(t)) { matchedSubjects.add("Chess"); continue; }

    // 16. Competitive Exams
    if (/\b(iit|jee|iit-jee)\b/i.test(t)) {
      matchedSubjects.add("Maths for IITJEE");
      matchedSubjects.add("Physics for IITJEE");
      matchedSubjects.add("Chemistry for IITJEE");
      continue;
    }
    if (/\b(neet|medical\s*entrance)\b/i.test(t)) {
      matchedSubjects.add("Biology for NEET");
      matchedSubjects.add("Physics for NEET");
      matchedSubjects.add("Chemistry for NEET");
      continue;
    }
    if (/\b(cuet)\b/i.test(t)) { matchedSubjects.add("CUET"); continue; }
    if (/\b(cat)\b/i.test(t)) { matchedSubjects.add("Maths for CAT"); continue; }
    if (/\b(upsc|civil\s*services)\b/i.test(t)) { matchedSubjects.add("Civil Services"); continue; }

    // 17. Taxonomy Direct Search Fallback:
    // Try exact or normalized search against ALL_CANONICAL_SUBJECTS
    const norm = normalizeTaxonomySubject(token);
    if (norm && CANONICAL_SET.has(norm)) {
      matchedSubjects.add(norm);
      continue;
    }

    const exactMatch = ALL_CANONICAL_SUBJECTS.find((s) => s.toLowerCase() === t);
    if (exactMatch) {
      matchedSubjects.add(exactMatch);
      continue;
    }

    // Try multi-token search from taxonomy
    const searchHits = searchTaxonomySubjects(token, classLevel);
    if (searchHits.length > 0) {
      matchedSubjects.add(searchHits[0].subject);
      continue;
    }
  }

  // Tutors teaching till 8th grade must always have All Subjects & All Subjects (Class 1-8) in taxonomy
  if (isBelow9 && matchedSubjects.size > 0) {
    matchedSubjects.add("All Subjects");
    matchedSubjects.add("All Subjects (Class 1-8)");
  }

  // Strict Validation: Every single subject accepted MUST exist in the canonical platform taxonomy!
  const strictlyCanonical = Array.from(matchedSubjects).filter((s) => CANONICAL_SET.has(s));

  if (strictlyCanonical.length === 0) {
    if (hasUnsupportedHobby) {
      // Extract which hobby was typed for a personalised reply
      const hobbyMatch = rawInputStr.match(/\b(cooking|cookery|driving|cricket|swimming|dance|dancing|gym|fitness|yoga(?!\s*class)|guitar|drums|piano|singing|chess|skating|makeup|nanny)\b/i);
      const hobbyWord = hobbyMatch ? hobbyMatch[0].charAt(0).toUpperCase() + hobbyMatch[0].slice(1).toLowerCase() : "yeh subject";
      return {
        isValid: false,
        subjects: [],
        humanLabel: "",
        errorPrompt: `⚠️ *${hobbyWord}* ke liye hum tutors nahi dete. \n\nApnaTutorHub par sirf *school aur college ke academic subjects* ke verified tutors available hain.\n\nIn mein se koi batayein:\n• *Maths, Science*\n• *English, Hindi*\n• *Physics, Chemistry, Biology*\n• *All Subjects (Class 1-8)*`,
      };
    }
    return {
      isValid: false,
      subjects: [],
      humanLabel: "",
      errorPrompt: `📚 "*${displayInput}*" — yeh subject pehchana nahi gaya.\n\nIn mein se koi likhein:\n• *Maths, Science*\n• *Physics, Chemistry*\n• *English, Hindi*\n• *Commerce (Accounts, BST)*\n• *All Subjects*`,
    };
  }

  const humanLabel = strictlyCanonical
    .filter((s) => !/all subjects \(class 1-8\)/i.test(s) && !/for class [ivx]+/i.test(s))
    .slice(0, 3)
    .join(", ") || strictlyCanonical[0];

  return {
    isValid: true,
    subjects: strictlyCanonical,
    humanLabel,
  };
}

/**
 * Returns sensible quick-reply suggestions and prompt for a given subject.
 * Guarantees that users are never prompted with invalid grades (e.g. Class 1-8 for Physics).
 */
export function getSubjectClassSuggestions(subject: string): { prompt: string; quickReplies: string[] } {
  const s = subject.toLowerCase();

  // Senior Sciences
  if (/physic|chem|bio|neet|jee/i.test(s)) {
    const name = /chem/i.test(s) ? "Chemistry" : /bio/i.test(s) ? "Biology" : "Physics";
    return {
      prompt: `${name} kaunsi classes ko padhate ho? 📚`,
      quickReplies: ["Class 11-12", "Class 9-10 (Science)", "JEE / NEET", "College / B.Sc"],
    };
  }

  // Commerce & Management
  if (/account|b\.?com|commerce|business\s*studies|bst|ca\s*foundation|cma|cs/i.test(s)) {
    return {
      prompt: `Commerce / Accounts kaunsi classes ko padhate ho? 📚`,
      quickReplies: ["Class 11-12", "B.Com / College", "CA Foundation", "CUET"],
    };
  }

  // Humanities / Arts Senior Electives
  if (/political\s*science|pol\s*science|sociology|psychology|legal\s*studies/i.test(s)) {
    return {
      prompt: `${subject} kaunsi classes ko padhate ho? 📚`,
      quickReplies: ["Class 11-12", "BA / College", "CUET", "Class 9-10 (SST)"],
    };
  }

  // Foreign Languages
  if (/french|german|spanish|japanese|russian|chinese|arabic|foreign\s*language/i.test(s)) {
    return {
      prompt: `${subject} kaunsi classes ya level ko padhate ho? 🌍`,
      quickReplies: ["Class 6-8 (School)", "Class 9-10 (Board)", "Class 11-12", "Spoken / All Levels"],
    };
  }

  // Sanskrit
  if (/sanskrit/i.test(s)) {
    return {
      prompt: `Sanskrit kaunsi classes ko padhate ho? 📚`,
      quickReplies: ["Class 6-8", "Class 9-10", "Class 11-12"],
    };
  }

  // All Subjects / Combo
  if (/all\s*subjects?|combo/i.test(s)) {
    return {
      prompt: `All subjects kaunsi classes tak padhate ho? 📚`,
      quickReplies: ["Class 1-5 (Primary)", "Class 6-8 (Middle)", "Class 1-8 (Combo)", "Class 9-10"],
    };
  }

  // Mathematics
  if (/math/i.test(s)) {
    return {
      prompt: `Maths kaunsi classes ko padhate ho? 📚`,
      quickReplies: ["Class 1-8 (Foundation)", "Class 9-10", "Class 11-12", "JEE / Advanced"],
    };
  }

  // Computer Science & Coding
  if (/computer|coding|python|java|c\+\+|programming/i.test(s)) {
    return {
      prompt: `Coding / CS kaunsi classes ko padhate ho? 💻`,
      quickReplies: ["Class 11-12 (CS/IP)", "Class 9-10 (IT/AI)", "Kids Coding (Class 4-8)", "Python / Web Dev"],
    };
  }

  // Languages: English & Hindi
  if (/english|hindi/i.test(s)) {
    return {
      prompt: `${subject} kaunsi classes ko padhate ho? 📚`,
      quickReplies: ["Class 1-5 (Primary)", "Class 6-8 (Middle)", "Class 9-10", "Class 11-12"],
    };
  }

  return {
    prompt: `${subject} kaunsi classes ko padhate ho? 📚`,
    quickReplies: ["Class 1-8", "Class 9-10", "Class 11-12", "All Classes"],
  };
}

const WORD_GRADES: Record<string, number> = {
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
  fifth: 5,
  sixth: 6,
  seventh: 7,
  eighth: 8,
  ninth: 9,
  tenth: 10,
  eleventh: 11,
  twelfth: 12,
};

export function parseGrade(s?: string | null): number | null {
  if (!s) return null;
  const lower = s.trim().toLowerCase();

  // 1. Check word numbers (e.g. "third class", "fifth")
  for (const [w, g] of Object.entries(WORD_GRADES)) {
    if (new RegExp(`\\b${w}\\b`, "i").test(lower)) return g;
  }

  // 2. Check Roman numerals (e.g. "Class III", "VI")
  const romanMatch = lower.match(/\b(xii|xi|viii|vii|vi|iv|ix|iii|ii|x|v|i)\b/i);
  if (romanMatch) {
    const ROMANS: Record<string, number> = {
      i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12,
    };
    const val = ROMANS[romanMatch[1].toLowerCase()];
    if (val) return val;
  }

  // 3. Check digits with optional ordinals: "3rd", "3", "3rd class", "class 3", "10th"
  const digitMatch = lower.match(/(\b1[0-2]|\b[1-9])(?:\s*(?:st|nd|rd|th))?(?!\d)/i);
  if (digitMatch) {
    return parseInt(digitMatch[1], 10);
  }

  return null;
}

/**
 * Validates if the selected class makes educational common sense for the given subjects.
 * If invalid, explains why and provides smart alternative buttons to resolve the ambiguity.
 */
export function validateSubjectClassCompatibility(
  subjects: string[],
  classInput: string,
  userType: "TUTOR" | "PARENT" = "TUTOR"
): ValidationResult {
  const cleanCls = classInput.trim();
  const lowerCls = cleanCls.toLowerCase();

  // Guard: Reject non-academic / unsupported subjects
  const nonAcademic = subjects.filter((s) => /cooking|driving|dance|cricket|makeup|gym|crypto/i.test(s));
  if (nonAcademic.length > 0 && subjects.length === nonAcademic.length) {
    return {
      isValid: false,
      reason: "Hum sirf academic & school subjects ke liye home tuition provide karte hain (Maths, Science, English, Commerce, etc.)! 📚",
      suggestedReplies: ["All Subjects (Class 1-8)", "Maths & Science", "Physics / Chem (11-12)", "Commerce (11-12)"],
    };
  }

  // If user clicked a disambiguation button like "Class 1-5 (All Subjects)"
  if (/all\s*subjects?/i.test(lowerCls)) {
    return {
      isValid: true,
      switchedSubject: ["All Subjects", "All Subjects (Class 1-8)"],
      switchedClass: cleanCls.replace(/\(all\s*subjects?\)/i, "").trim() || "Class 1-5",
    };
  }

  // If user clicked "Class 9-10 (Science)" when previously on Physics
  if (/science/i.test(lowerCls)) {
    return {
      isValid: true,
      switchedSubject: ["Science"],
      switchedClass: cleanCls.replace(/\(science\)/i, "").trim() || "Class 9-10",
    };
  }

  // Robust grade extraction supporting 3rd, 3rd class, third, Class 3, etc.
  const grade = parseGrade(lowerCls);
  const isPrimary = (grade !== null && grade <= 5) || /primary|kg|nursery|pre|1\s*[-–to]\s*5/i.test(lowerCls);
  const isMiddle = (grade !== null && grade >= 6 && grade <= 8) || /middle|6\s*[-–to]\s*8/i.test(lowerCls);
  const isBelow9 = (grade !== null && grade < 9) || isPrimary || isMiddle || /1\s*[-–to]\s*8|upto\s*8th|till\s*8th/i.test(lowerCls);
  const isBelow11 = (grade !== null && grade < 11) || isBelow9 || /9\s*[-–to]\s*10/i.test(lowerCls);

  // ── 1. Senior Sciences (Physics, Chemistry, Biology) ────────────────────────
  const isPhysics = subjects.some((s) => /physic/i.test(s));
  const isChemistry = subjects.some((s) => /chem/i.test(s));
  const isBiology = subjects.some((s) => /bio/i.test(s));
  const isSeniorScience = isPhysics || isChemistry || isBiology;

  if (isSeniorScience && isBelow9) {
    const sciName = isChemistry ? "Chemistry" : isBiology ? "Biology" : "Physics";
    const gradeLabel = grade ? `Class ${grade}` : "Class 1-8";

    if (userType === "PARENT") {
      return {
        isValid: false,
        reason: `School curriculum mein ${gradeLabel} ke liye ${sciName} alag se nahi hoti, wahan 'General Science' aur 'All Subjects' hota hai! 📚\n\nBachche ke liye kya chahiye?`,
        suggestedReplies: [`${gradeLabel} All Subjects`, `${gradeLabel} Science`, "Class 9-10 (Science)"],
      };
    }

    return {
      isValid: false,
      reason: `School curriculum mein ${sciName} Class 9 se 12th (aur JEE/NEET) mein hoti hai! 📚 Class 1–5 mein 'All Subjects', 'Maths' ya 'General Science' hota hai.\n\nKya aap Class 9 ya usse upar padhana chahte hain, ya ${gradeLabel} ke liye subjects select karna chahte hain?`,
      suggestedReplies: [
        "Class 9-10 (Science)",
        `Class 11-12 (${sciName})`,
        `${gradeLabel} (All Subjects)`,
        `${gradeLabel} (Maths & Science)`,
      ],
    };
  }

  // ── 2. Commerce & Accounts ──────────────────────────────────────────────────
  const isCommerce = subjects.some((s) => /account|business\s*studies|bst|commerce|cma|ca\s*foundation/i.test(s));
  if (isCommerce && isBelow11) {
    if (userType === "PARENT") {
      return {
        isValid: false,
        reason: `Accounts aur Commerce subjects Class 11-12 aur College mein shuru hote hain! 📚 Kaunsi class ke liye tutor chahiye?`,
        suggestedReplies: ["Class 11-12 Commerce", "B.Com / College", "Class 9-10 Maths/Sci"],
      };
    }

    return {
      isValid: false,
      reason: `Accounts aur Commerce school mein Class 11-12 aur College level par hota hai! 📚 Class 1-10 mein yeh subject nahi hota.\n\nKaunsi class ko padhate hain?`,
      suggestedReplies: ["Class 11-12", "B.Com / College", "CA Foundation", "Class 1-10 All Subjects"],
    };
  }

  // ── 3. Humanities Senior Electives ──────────────────────────────────────────
  const isHumanitiesSenior = subjects.some((s) => /political\s*science|pol\s*science|sociology|psychology|legal\s*studies/i.test(s));
  if (isHumanitiesSenior && isBelow11) {
    const subName = subjects.find((s) => /political|sociology|psychology|legal/i.test(s)) || "Humanities";
    return {
      isValid: false,
      reason: `${subName} Class 11-12 aur College level par alag subject hota hai! 📚 Class 6-10 ke liye 'Social Science (SST)' hota hai.\n\nKaunsi class padhate hain?`,
      suggestedReplies: ["Class 11-12", "Class 9-10 (SST)", "Class 6-8 (SST)", "BA / College"],
    };
  }

  // ── 4. Foreign Languages ────────────────────────────────────────────────────
  const isForeignLang = subjects.some((s) => /french|german|spanish|japanese|russian|chinese|arabic/i.test(s));
  if (isForeignLang && isPrimary && (grade !== null && grade <= 4)) {
    return {
      isValid: false,
      reason: `Foreign languages school mein generally Class 5-6 onwards shuru hoti hain! 🌍 Kaunse level ke liye padhate hain?`,
      suggestedReplies: ["Class 6-8 (School)", "Class 9-10 (Board)", "Class 11-12", "Spoken / All Levels"],
    };
  }

  // ── 5. Sanskrit ─────────────────────────────────────────────────────────────
  const isSanskrit = subjects.some((s) => /sanskrit/i.test(s));
  if (isSanskrit && isPrimary && (grade !== null && grade <= 4)) {
    return {
      isValid: false,
      reason: `Sanskrit schools mein Class 5-6 se shuru hoti hai! 📚 Kaunsi class ko padhate hain?`,
      suggestedReplies: ["Class 6-8", "Class 9-10", "Class 11-12"],
    };
  }

  // ── 6. "All Subjects" for Senior Secondary ──────────────────────────────────
  const hasAllSubjects = subjects.some((s) => /all\s*subjects?|combo/i.test(s));
  const isSeniorSecondary = grade === 11 || grade === 12 || /11|12|senior/i.test(lowerCls);
  if (hasAllSubjects && isSeniorSecondary) {
    const specificSubjects = subjects.filter((s) => !/all\s*subjects?|combo/i.test(s));
    if (specificSubjects.length > 0) {
      // Auto-strip "All Subjects" because they teach specific subject(s) in Class 11/12
      return {
        isValid: true,
        switchedSubject: specificSubjects,
      };
    }
    return {
      isValid: false,
      reason: `Class 11-12 mein 'All Subjects' nahi hota (Science, Commerce, Arts streams hoti hain)! 📚 Kaunsi stream ya specific subject padhate hain?`,
      suggestedReplies: [
        "Science (PCM / PCB)",
        "Commerce (Accounts/BST)",
        "Humanities / Arts",
        "Class 1-10 All Subjects",
      ],
    };
  }

  return { isValid: true };
}
