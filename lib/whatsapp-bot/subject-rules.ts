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
  "koi", "batao", "bhejo", "karo", "dekh", "update", "cancel", "stop", "menu", "start"
]);

const PLACE_INDICATORS = /\b(nagar|vihar|colony|enclave|sector|sec\b|phase|block|road|street|marg|bazaar|bazar|market|park|heights|apartments|extension|ext\b|pur\b|pura\b|ganj\b|gaon\b|halli\b|pet\b|peth\b|wadi\b|layout|kunj|chowk|cantt|tola|basti|para|palli|guda|hills|estate|town|society|complex|cross|main|line|lines|gali|mohalla|mandir|metro)\b/i;

const PROMINENT_LOCALITIES: Array<{ name: string; city: string }> = [
  { name: "mukundpur", city: "Delhi" },
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
  { name: "new town", city: "Kolkata" }
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
    return { isValid: false, area: "", city: defaultCity, errorPrompt: "Kripya apna area / locality batayein 📍" };
  }

  let clean = raw.trim();

  // Strip conversational wrappers (Hinglish + English)
  clean = clean.replace(/^(mai|main|hum|me|i\s*am\s*from|i\s*live\s*in|living\s*in|my\s*area\s*is|near|nearby|opposite|opp|area|location|locality)[:\s-]+/i, "");
  clean = clean.replace(/\s+(se\s+hu|se\s+hoon|se|mein|me|rehta\s+hu|rehta\s+hoon|area|locality)\b.*$/i, "");
  clean = clean.replace(/^[,.-]+|[,.-]+$/g, "").trim();

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
      if (remainingArea.length >= 2) {
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
      return {
        isValid: true,
        area: detectedCity,
        city: detectedCity,
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
    return { isValid: false, area: "", city: defaultCity, errorPrompt: "Kripya apna sahi area aur city batayein (jaise: Rohini Delhi, Bandra Mumbai, ya Sector 62 Noida) 📍" };
  }

  // Check if string contains purely non-locality filler words
  const words = clean.toLowerCase().split(/[\s,.-]+/).filter(Boolean);
  if (words.length === 0 || words.every((w) => NON_LOCALITY_WORDS.has(w))) {
    return { isValid: false, area: "", city: defaultCity, errorPrompt: "Kripya apna sahi area aur city batayein (jaise: Rohini Delhi, Bandra Mumbai, ya Sector 62 Noida) 📍" };
  }

  // 4. General place validation across India (any locality keyword or clean proper name)
  const hasPlaceKeyword = PLACE_INDICATORS.test(clean);
  const isValidProperName = clean.length >= 3 && clean.length <= 40 && !NON_LOCALITY_WORDS.has(clean.toLowerCase());

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

  return { isValid: false, area: "", city: defaultCity, errorPrompt: "Kripya apna sahi area aur city batayein (jaise: Rohini Delhi, Bandra Mumbai, ya Sector 62 Noida) 📍" };
}

/**
 * Validates and aligns raw subject input to canonical platform taxonomy.
 * Enforces critical educational rules:
 * - Class 1 to 8: strictly NO Physics, Chemistry, Biology! Normalizes to "Science" and "All Subjects (Class 1-8)".
 * - Rejects non-academic or unsupported subjects (cooking, driving, dance, etc.).
 * - Ensures 100% overlap with platform matching engine so lead notifications are dispatched.
 */
export function validateAndAlignSubjects(
  rawInput: unknown,
  classLevel?: string
): { isValid: boolean; subjects: string[]; humanLabel: string; errorPrompt?: string } {
  if (!rawInput) {
    return { isValid: false, subjects: [], humanLabel: "", errorPrompt: "Kaunse subjects padhate hain? (jaise: Maths, Science, All Subjects) 📚" };
  }

  const rawList: string[] = Array.isArray(rawInput)
    ? rawInput.flatMap((s) => String(s).split(/[,&+/\n]|(?:\band\b)|(?:\baur\b)/i))
    : String(rawInput).split(/[,&+/\n]|(?:\band\b)|(?:\baur\b)/i);

  const cleanTokens = rawList.map((t) => t.trim()).filter((t) => t.length > 0);
  if (cleanTokens.length === 0) {
    return { isValid: false, subjects: [], humanLabel: "", errorPrompt: "Kaunse subjects padhate hain? (jaise: Maths, Science, All Subjects) 📚" };
  }

  const grade = parseGrade(classLevel);
  const isPrimary = (grade !== null && grade <= 5) || /primary|kg|nursery|1\s*[-–to]\s*5/i.test(classLevel || "");
  const isMiddle = (grade !== null && grade >= 6 && grade <= 8) || /middle|6\s*[-–to]\s*8/i.test(classLevel || "");
  const isBelow9 = (grade !== null && grade <= 8) || isPrimary || isMiddle || /1\s*[-–to]\s*8|upto\s*8|till\s*8/i.test(classLevel || "");
  const isBelow11 = (grade !== null && grade <= 10) || isBelow9 || /9\s*[-–to]\s*10|secondary/i.test(classLevel || "");

  const matchedSubjects = new Set<string>();

  for (const token of cleanTokens) {
    const t = token.toLowerCase();

    // All Subjects / Combo
    if (/all\s*subjects?|combo|sabhi|har\s*subject|general/i.test(t)) {
      matchedSubjects.add("All Subjects");
      if (isBelow9) matchedSubjects.add("All Subjects (Class 1-8)");
      continue;
    }

    // Mathematics
    if (/\b(maths?|mathematics|algebra|calculus|geometry|trig|quant|arithmetic)\b/i.test(t)) {
      matchedSubjects.add("Mathematics");
      continue;
    }

    // Science / EVS
    if (/\b(science|general\s*science|sci|evs|environmental)\b/i.test(t)) {
      matchedSubjects.add("Science");
      continue;
    }

    // English
    if (/\b(english|grammar|literature|comprehension)\b/i.test(t)) {
      matchedSubjects.add("English");
      continue;
    }

    // Hindi
    if (/\b(hindi|vyakaran)\b/i.test(t)) {
      matchedSubjects.add("Hindi");
      continue;
    }

    // Social Studies / SST
    if (/\b(social\s*studies|sst|social\s*science|history|geography|civics)\b/i.test(t)) {
      matchedSubjects.add("Social Studies");
      continue;
    }

    // Sanskrit
    if (/\b(sanskrit)\b/i.test(t)) {
      matchedSubjects.add("Sanskrit");
      continue;
    }

    // Computer Science / Coding
    if (/\b(computer\s*science|computer|cs|coding|python|java|c\+\+|programming|it\b|ai\b)\b/i.test(t)) {
      matchedSubjects.add("Computer Science");
      continue;
    }

    // Senior Sciences: Physics, Chemistry, Biology
    // CRITICAL USER DIRECTIVE: For Class 1 to 8, strictly NO Physics/Chem/Bio!
    if (/\b(physics)\b/i.test(t)) {
      if (isBelow9) {
        matchedSubjects.add("Science");
        matchedSubjects.add("All Subjects (Class 1-8)");
      } else if (isBelow11) {
        matchedSubjects.add("Science");
      } else {
        matchedSubjects.add("Physics");
      }
      continue;
    }

    if (/\b(chemistry)\b/i.test(t)) {
      if (isBelow9) {
        matchedSubjects.add("Science");
        matchedSubjects.add("All Subjects (Class 1-8)");
      } else if (isBelow11) {
        matchedSubjects.add("Science");
      } else {
        matchedSubjects.add("Chemistry");
      }
      continue;
    }

    if (/\b(biology|botany|zoology)\b/i.test(t)) {
      if (isBelow9) {
        matchedSubjects.add("Science");
        matchedSubjects.add("All Subjects (Class 1-8)");
      } else if (isBelow11) {
        matchedSubjects.add("Science");
      } else {
        matchedSubjects.add("Biology");
      }
      continue;
    }

    // Commerce & Management (Class 11+)
    if (/\b(accounts?|accountancy)\b/i.test(t)) {
      if (!isBelow11) matchedSubjects.add("Accountancy");
      continue;
    }
    if (/\b(business\s*studies|bst)\b/i.test(t)) {
      if (!isBelow11) matchedSubjects.add("Business Studies");
      continue;
    }
    if (/\b(economics?|micro|macro)\b/i.test(t)) {
      if (!isBelow9) matchedSubjects.add("Economics");
      continue;
    }
  }

  // Tutors teaching till 8th grade must always have All Subjects & All Subjects (Class 1-8) in taxonomy
  if (isBelow9 && matchedSubjects.size > 0) {
    matchedSubjects.add("All Subjects");
    matchedSubjects.add("All Subjects (Class 1-8)");
  }

  if (matchedSubjects.size === 0) {
    return {
      isValid: false,
      subjects: [],
      humanLabel: "",
      errorPrompt: "Kripya valid school subjects batayein (jaise: Maths, Science, English, Hindi, All Subjects) 📚",
    };
  }

  const subjects = Array.from(matchedSubjects);
  const humanLabel = subjects
    .filter((s) => !/all subjects \(class 1-8\)/i.test(s))
    .slice(0, 3)
    .join(", ");

  return {
    isValid: true,
    subjects,
    humanLabel: humanLabel || subjects[0],
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
  const isAllSubjects = subjects.every((s) => /all\s*subjects?|combo/i.test(s));
  if (isAllSubjects && (grade === 11 || grade === 12 || /11\s*[-–to]\s*12|senior\s*secondary/i.test(lowerCls))) {
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
