/**
 * lib/whatsapp-bot/strict-rules.ts
 *
 * Single Source of Truth firewall for WhatsApp chatbot data validation and normalization.
 *
 * Non-negotiable platform rules enforced before ANY session update or database write:
 * 1. English-only responses (inputs in any style/Hinglish/typos are understood cleanly).
 * 2. Emails: strictly real valid <local>@<domain>.<tld> emails only (Gmail, Yahoo, Outlook,
 *    or legitimate custom domains). Never placeholder, typo domains, or random text.
 * 3. Education taxonomy (strict grade-band segregation):
 *    - Pre-Primary (Nursery/KG) & Class 1-8: STRICTLY "All Subjects for Class <n>" (and
 *      "All Subjects for Pre-Primary") only. Zero individual subject pollution.
 *    - Class 9-10: Specific school subjects + class only (Mathematics, Science, Social Science,
 *      English, Hindi, Sanskrit, Computer Science, French, German, Spanish).
 *      Physics/Chemistry/Biology fold strictly into "Science for Class IX/X".
 *      History/Geography/Civics/Political Science/Economics fold into "Social Science for Class IX/X".
 *      No Accountancy/Commerce, no "All Subjects", no random text.
 *    - Class 11-12 (+ JEE/NEET/CUET): Specific stream subjects + class only
 *      (Physics, Chemistry, Biology, Mathematics, Accountancy, Business Studies, Economics,
 *      Computer Science, History, Political Science, Geography, Psychology, Sociology, English, Hindi, etc.).
 *      No "All Subjects", no generic "Science"/"Social Science"/"EVS", no random text.
 * 4. Multi-clause support: Handles inputs like "Biology 10 - 12. 1-5 all sub." accurately per band.
 */

const ROMAN: Record<number, string> = {
  1: "I",
  2: "II",
  3: "III",
  4: "IV",
  5: "V",
  6: "VI",
  7: "VII",
  8: "VIII",
  9: "IX",
  10: "X",
  11: "XI",
  12: "XII",
};

const ROMAN_TO_NUM: Record<string, number> = {
  i: 1,
  ii: 2,
  iii: 3,
  iv: 4,
  v: 5,
  vi: 6,
  vii: 7,
  viii: 8,
  ix: 9,
  x: 10,
  xi: 11,
  xii: 12,
};

const WORD_TO_GRADE: Record<string, number> = {
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

// ── 1. Strict Email Validation ────────────────────────────────────────────────

const BLOCKED_EMAIL_DOMAINS = new Set([
  "apnatutorhub.com",
  "apnatutorhub.internal",
  "example.com",
  "test.com",
  "placeholder.com",
  "mailinator.com",
  "tempmail.com",
  "yopmail.com",
  "guerrillamail.com",
  "fake.com",
  "none.com",
  "na.com",
  "email.com",
  "domain.com",
  "xyz.xyz",
]);

const TYPO_DOMAIN_LABELS = /^(gmai|gmal|gamil|gmaill|gmial|gnail|gimail|gmsil|gmaol|gmaul|gmaiil|yaho|yahooo|yhoo|yahho|yaoo|hotmial|hotmai|hotmal|hotamil|hotmsil|outlok|outllook|oulook|outloook|redifmail|rediffmai)$/i;
const TYPO_TLDS = /^(gom|con|cpm|coom|comm|cm|vom|gmai|ocm|xom|inm|cmo)$/i;

export function isPlaceholderEmail(email?: string | null): boolean {
  if (!email || typeof email !== "string") return true;
  const e = email.trim().toLowerCase();
  if (!e) return true;
  if (e.startsWith("wa.") || e.startsWith("wa_")) return true;
  const atIdx = e.indexOf("@");
  if (atIdx === -1) return true;
  const domain = e.slice(atIdx + 1);
  return BLOCKED_EMAIL_DOMAINS.has(domain);
}

export function validateStrictEmail(
  raw: unknown
): { ok: true; email: string } | { ok: false; reason: string } {
  if (typeof raw !== "string") {
    return { ok: false, reason: "Please enter a valid email address (for example, name@gmail.com)." };
  }
  const clean = raw
    .trim()
    .replace(/^[<("'`]+|[>)"'`,;:!?]+$/g, "")
    .replace(/\.+$/, "")
    .toLowerCase();

  if (!clean || clean.length < 6 || clean.length > 120 || /\s/.test(clean)) {
    return { ok: false, reason: "That does not look like a valid email address. Please enter a real email like yourname@gmail.com." };
  }

  const parts = clean.split("@");
  if (parts.length !== 2) {
    return { ok: false, reason: "Please include a valid domain after @ (for example, yourname@gmail.com)." };
  }

  const [local, domain] = parts;
  if (
    !local ||
    local.length < 2 ||
    local.length > 64 ||
    local.startsWith(".") ||
    local.endsWith(".") ||
    local.includes("..") ||
    !/^[a-z0-9._%+-]+$/.test(local)
  ) {
    return { ok: false, reason: "The email username before @ looks invalid. Please enter a real email like yourname@gmail.com." };
  }

  if (
    !domain ||
    domain.length < 4 ||
    domain.length > 100 ||
    !domain.includes(".") ||
    domain.startsWith(".") ||
    domain.endsWith(".") ||
    domain.includes("..") ||
    !/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(domain)
  ) {
    return { ok: false, reason: "Please enter a valid email domain (such as @gmail.com, @yahoo.com, @outlook.com, or your own domain)." };
  }

  if (BLOCKED_EMAIL_DOMAINS.has(domain)) {
    return { ok: false, reason: "Please enter your personal or work email address (for example, yourname@gmail.com)." };
  }

  const domainSegs = domain.split(".");
  const mainLabel = domainSegs[0];
  const tld = domainSegs[domainSegs.length - 1];

  if (mainLabel.length < 2 && mainLabel !== "x") {
    return { ok: false, reason: "Please enter a complete email domain (such as @gmail.com or @yahoo.com)." };
  }
  if (TYPO_DOMAIN_LABELS.test(mainLabel)) {
    return { ok: false, reason: `Your email domain "*${domain}*" looks misspelled. Please check and enter a valid email like yourname@gmail.com.` };
  }
  if (!/^[a-z]{2,12}$/.test(tld) || TYPO_TLDS.test(tld)) {
    return { ok: false, reason: `Your email ending "*.${tld}*" looks misspelled (did you mean .com or .in?). Please enter a valid email.` };
  }

  return { ok: true, email: clean };
}

export function isStrictValidEmail(raw: unknown): boolean {
  return validateStrictEmail(raw).ok;
}

export function extractStrictEmail(text: string): string | null {
  if (!text || typeof text !== "string") return null;
  const candidates = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,12}/g);
  if (!candidates) return null;
  for (const c of candidates) {
    const res = validateStrictEmail(c);
    if (res.ok) return res.email;
  }
  return null;
}

// ── 2. Strict Class Extraction ────────────────────────────────────────────────

const PRE_PRIMARY_RE = /\b(nursery|pre[-\s]?nursery|lkg|ukg|kg|pre[-\s]?primary|pre[-\s]?school|playgroup|kindergarten)\b/i;

const ADDRESS_PREFIX_RE = /\b(sector|sec|phase|block|pocket|plot|flat|house|h\.?\s*no|lane|street|road|gali|pin|pincode|floor|room)[\s-]*$/i;

const NON_CLASS_UNIT_RE = /^\s*(?:days?|hours?|hrs?|km|mins?|minutes?|years?|yrs?|months?|pm|am|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december|rs|inr|rupees?|k|lakh|lakhs)\b/i;

export type ExtractedClassSet = {
  prePrimary: boolean;
  grades: number[]; // sorted unique 1..12
  exams: Array<"JEE" | "NEET" | "CUET">;
  labels: string[]; // Canonical classLevels for DB
};

export function formatCanonicalClassLabels(info: {
  prePrimary: boolean;
  grades: number[];
  exams: Array<"JEE" | "NEET" | "CUET">;
}): string[] {
  const out: string[] = [];
  if (info.prePrimary) out.push("Pre-Primary (Nursery/KG)");
  const uniq = [...new Set(info.grades)].filter((g) => g >= 1 && g <= 12).sort((a, b) => a - b);
  for (const g of uniq) out.push(`Class ${g}`);
  for (const ex of [...new Set(info.exams)]) out.push(ex);
  return out;
}

export function extractStrictClasses(rawText: string): ExtractedClassSet {
  const grades = new Set<number>();
  const exams = new Set<"JEE" | "NEET" | "CUET">();
  let prePrimary = false;

  const s = String(rawText || "").trim();
  if (!s) return { prePrimary: false, grades: [], exams: [], labels: [] };

  // Strip sector numbers & 6-digit pincodes before scanning numbers
  const scrubbed = s
    .replace(/\b(?:sector|sec|phase|block|pocket|plot|flat|house|pin|pincode)[\s-]*\d{1,6}[a-z]?\b/gi, " ")
    .replace(/\b\d{6,}\b/g, " ")
    .replace(/₹\s*[\d,]+/g, " ");

  const lower = scrubbed.toLowerCase();

  if (PRE_PRIMARY_RE.test(lower)) prePrimary = true;
  if (/\b(?:iit[\s-]*)?jee\b/i.test(lower)) exams.add("JEE");
  if (/\bneet\b/i.test(lower)) exams.add("NEET");
  if (/\bcuet\b/i.test(lower)) exams.add("CUET");

  // Pre-Primary to Class N range (e.g. "Nursery to class 3", "KG to 5th")
  const preToGradeRe = new RegExp(
    `(?:${PRE_PRIMARY_RE.source})\\s*(?:to|-|–|—|till|upto)\\s*(?:class(?:es)?|grade|std)?\\s*(1[0-2]|[1-9])(?:st|nd|rd|th)?\\b`,
    "gi"
  );
  for (const m of lower.matchAll(preToGradeRe)) {
    prePrimary = true;
    const end = parseInt(m[2], 10);
    if (end >= 1 && end <= 12) {
      for (let g = 1; g <= end; g++) grades.add(g);
    }
  }

  // Band keywords without numbers (never trigger "Pre-Primary" as 1-5 "Primary")
  const bandCheckLower = lower.replace(/\bpre[-\s]?primary\b/gi, " ");
  if (/\bprimary\b/i.test(bandCheckLower) && grades.size === 0 && !/\bclass\s*(?:[6-9]|1[0-2])\b/i.test(lower)) {
    for (let g = 1; g <= 5; g++) grades.add(g);
  }
  if (/\bmiddle\s*(?:school|classes)?\b/i.test(lower)) {
    for (let g = 6; g <= 8; g++) grades.add(g);
  }
  if (/\bhigh\s*school\b|\bsecondary\s*(?:board|exam)?\b/i.test(lower) && !/\bsenior\b/i.test(lower)) {
    grades.add(9);
    grades.add(10);
  }
  if (/\bsenior\s*secondary\b|\bhigher\s*secondary\b|\+\s*2\b/i.test(lower)) {
    grades.add(11);
    grades.add(12);
  }

  // Numeric ranges: "1-5", "1 to 8", "10 - 12", "Class 6 to Class 8", "9th and 10th", "11 & 12"
  const numRangeRe =
    /\b(?:class(?:es)?|grade|std|standard)?\s*(1[0-2]|[1-9])(?:st|nd|rd|th)?\s*(?:to|-|–|—|and|&|\/|,)\s*(?:class(?:es)?|grade|std|standard)?\s*(1[0-2]|[1-9])(?:st|nd|rd|th)?\b/gi;
  for (const m of lower.matchAll(numRangeRe)) {
    const startIdx = m.index ?? 0;
    const tail = lower.slice(startIdx + m[0].length);
    const prefix = lower.slice(Math.max(0, startIdx - 14), startIdx);
    if (ADDRESS_PREFIX_RE.test(prefix) || NON_CLASS_UNIT_RE.test(tail)) continue;
    const a = parseInt(m[1], 10);
    const b = parseInt(m[2], 10);
    if (a >= 1 && a <= 12 && b >= 1 && b <= 12) {
      const connector = m[0].replace(/^.*?(?:\d{1,2})(?:st|nd|rd|th)?/, "");
      const isContinuous = /(?:\bto\b|-|–|—)/i.test(connector);
      if (isContinuous && Math.abs(b - a) >= 1) {
        for (let g = Math.min(a, b); g <= Math.max(a, b); g++) grades.add(g);
      } else {
        grades.add(a);
        grades.add(b);
      }
    }
  }

  // Upto / till N: "till 8th", "upto class 5", "8 tak"
  const uptoRe = /(?:upto|up\s*to|till|below)\s*(?:class(?:es)?|grade|std)?\s*(1[0-2]|[1-9])(?:st|nd|rd|th)?\b|\b(?:class(?:es)?\s*)?(1[0-2]|[1-9])(?:st|nd|rd|th)?\s*tak\b/gi;
  for (const m of lower.matchAll(uptoRe)) {
    const n = parseInt(m[1] || m[2], 10);
    if (n >= 1 && n <= 12) {
      for (let g = 1; g <= n; g++) grades.add(g);
    }
  }

  // Roman ranges: "IX-X", "XI to XII", "XIth and XIIth"
  const romanRangeRe = /\b(xii|xi|x|ix|viii|vii|vi|v|iv|iii|ii|i)(?:th|st|nd|rd)?\s*(?:to|-|–|—|and|&|\/)\s*(?:class(?:es)?|grade|std)?\s*(xii|xi|x|ix|viii|vii|vi|v|iv|iii|ii|i)(?:th|st|nd|rd)?\b/gi;
  for (const m of lower.matchAll(romanRangeRe)) {
    const a = ROMAN_TO_NUM[m[1]];
    const b = ROMAN_TO_NUM[m[2]];
    if (a && b) {
      for (let g = Math.min(a, b); g <= Math.max(a, b); g++) grades.add(g);
    }
  }

  // Word ordinals: "fifth class", "tenth"
  for (const [word, g] of Object.entries(WORD_TO_GRADE)) {
    if (new RegExp(`\\b${word}\\b`, "i").test(lower)) grades.add(g);
  }

  // Explicit single classes / ordinals / Roman numerals after class keyword
  const explicitSingleRe =
    /\b(?:class|classes|grade|std|standard)\s*(1[0-2]|[1-9])(?:st|nd|rd|th)?\b|\b(1[0-2]|[1-9])(?:st|nd|rd|th)\s*(?:class|grade|std|standard)?\b|\b(?:class\s*)(xii|xi|ix|viii|vii|vi|iv|iii|ii|x|v|i)(?:th|st|nd|rd)?\b/gi;
  for (const m of lower.matchAll(explicitSingleRe)) {
    const startIdx = m.index ?? 0;
    const tail = lower.slice(startIdx + m[0].length);
    const prefix = lower.slice(Math.max(0, startIdx - 14), startIdx);
    if (ADDRESS_PREFIX_RE.test(prefix) || NON_CLASS_UNIT_RE.test(tail)) continue;
    if (m[1]) grades.add(parseInt(m[1], 10));
    else if (m[2]) grades.add(parseInt(m[2], 10));
    else if (m[3] && ROMAN_TO_NUM[m[3]]) grades.add(ROMAN_TO_NUM[m[3]]);
  }

  // Bare class list when message is almost purely numeric/class numbers (e.g. "9, 10, 11", "10", "5")
  // Never treat bare "1" or "2" as Class 1 / Class 2 (ambiguous with Tutor/Parent/Yes/No menu replies).
  if (grades.size === 0 && !prePrimary) {
    const bareTokens = lower
      .replace(/\b(class|grade|std|for|and|&|,)\b/gi, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (
      bareTokens.length > 0 &&
      bareTokens.length <= 4 &&
      bareTokens.every((tok) => /^(?:1[0-2]|[1-9])$/.test(tok)) &&
      !(bareTokens.length === 1 && (bareTokens[0] === "1" || bareTokens[0] === "2"))
    ) {
      for (const tok of bareTokens) grades.add(parseInt(tok, 10));
    }
  }

  // Standalone Roman numerals & ordinals (e.g. "XI", "XIIth", "IXth", "Xth" — never bare "I" / "V" / "X")
  const bareRomanRe = /\b(xii|xi|ix|viii|vii|vi|iv|iii|ii)(?:th|st|nd|rd)?\b|\b(x|v)(?:th)\b/gi;
  for (const m of lower.matchAll(bareRomanRe)) {
    const token = (m[1] || m[2] || "").toLowerCase();
    const g = ROMAN_TO_NUM[token];
    if (g) grades.add(g);
  }

  const gradeList = [...grades].filter((g) => g >= 1 && g <= 12).sort((a, b) => a - b);
  const examList = [...exams];
  return {
    prePrimary,
    grades: gradeList,
    exams: examList,
    labels: formatCanonicalClassLabels({ prePrimary, grades: gradeList, exams: examList }),
  };
}

// ── 3. Strict Subject Whitelist & Band Enforcement ────────────────────────────

export type CanonicalBaseSubject =
  | "All Subjects"
  | "Mathematics"
  | "Science"
  | "Social Science"
  | "English"
  | "Hindi"
  | "Sanskrit"
  | "Computer Science"
  | "Physics"
  | "Chemistry"
  | "Biology"
  | "Accountancy"
  | "Business Studies"
  | "Economics"
  | "History"
  | "Political Science"
  | "Geography"
  | "Psychology"
  | "Sociology"
  | "Philosophy"
  | "Legal Studies"
  | "Physical Education"
  | "French"
  | "German"
  | "Spanish";

const BASE_SUBJECT_MATCHERS: Array<{ re: RegExp; base: CanonicalBaseSubject }> = [
  { re: /\ball\s*(?:core\s*)?sub(?:ject)?s?\b|\bsabhi\b|\bhar\s*sub/i, base: "All Subjects" },
  { re: /\bpcm\b|\bpcb\b|\bpcmb\b/i, base: "Physics" }, // handled cleanly by combo expansion below
  { re: /\b(?:accountancy|accounts?|acc\b|bahi\s*khata)\b/i, base: "Accountancy" },
  { re: /\b(?:business\s*studies|bst)\b/i, base: "Business Studies" },
  { re: /\beconomics?\b|\becon?\b/i, base: "Economics" },
  { re: /\b(?:maths?|mathematics|mathmatics|algebra|calculus|geometry|trigonometry|ganit)\b/i, base: "Mathematics" },
  { re: /\b(?:social\s*(?:science|studies)|sst|samajik\s*vigyan)\b/i, base: "Social Science" },
  { re: /\b(?:political\s*science|pol\s*sci|polity|civics)\b/i, base: "Political Science" },
  { re: /\bhistory|itihas\b/i, base: "History" },
  { re: /\bgeography|bhugol\b/i, base: "Geography" },
  { re: /\bpsychology\b/i, base: "Psychology" },
  { re: /\bsociology\b/i, base: "Sociology" },
  { re: /\bphilosophy\b/i, base: "Philosophy" },
  { re: /\blegal\s*studies\b/i, base: "Legal Studies" },
  { re: /\b(?:physical\s*education|pe\b|phe\b)\b/i, base: "Physical Education" },
  { re: /\b(?:computer\s*science|computer|comp\s*sci|informatics\s*practices|\bip\b|coding|python|java|c\+\+|programming|\bit\b|\bcs\b)\b/i, base: "Computer Science" },
  { re: /\b(?:physics|phy|phyics|bhautiki)\b/i, base: "Physics" },
  { re: /\b(?:chemistry|chem|chemstry|rasayan)\b/i, base: "Chemistry" },
  { re: /\b(?:biology|bio|botany|zoology|jeev\s*vigyan)\b/i, base: "Biology" },
  { re: /\b(?:general\s*science|science|sci|scince|vigyan|evs|environmental)\b/i, base: "Science" },
  { re: /\b(?:english|eng|spoken\s*english|angrezi)\b/i, base: "English" },
  { re: /\bhindi|vyakaran\b/i, base: "Hindi" },
  { re: /\bsanskrit\b/i, base: "Sanskrit" },
  { re: /\bfrench\b/i, base: "French" },
  { re: /\bgerman\b/i, base: "German" },
  { re: /\bspanish\b/i, base: "Spanish" },
];

const CLASS_9_10_ALLOWED = new Set<CanonicalBaseSubject>([
  "Mathematics",
  "Science",
  "Social Science",
  "English",
  "Hindi",
  "Sanskrit",
  "Computer Science",
  "French",
  "German",
  "Spanish",
]);

const CLASS_11_12_ALLOWED = new Set<CanonicalBaseSubject>([
  "Physics",
  "Chemistry",
  "Biology",
  "Mathematics",
  "Accountancy",
  "Business Studies",
  "Economics",
  "Computer Science",
  "English",
  "Hindi",
  "Sanskrit",
  "History",
  "Political Science",
  "Geography",
  "Psychology",
  "Sociology",
  "Philosophy",
  "Legal Studies",
  "Physical Education",
  "French",
  "German",
  "Spanish",
]);

const SENIOR_ONLY_SUBJECTS = new Set<CanonicalBaseSubject>([
  "Physics",
  "Chemistry",
  "Biology",
  "Accountancy",
  "Business Studies",
  "History",
  "Political Science",
  "Geography",
  "Psychology",
  "Sociology",
  "Philosophy",
  "Legal Studies",
  "Physical Education",
]);

/** Language-preference phrases where "English" / "Hindi" means spoken medium, NOT teaching subject. */
export function isLanguagePreferenceContext(raw: string): boolean {
  const t = raw.trim().toLowerCase();
  if (!t) return false;
  if (
    /\b(?:thodi|little|some|only|fluent|comfortable|speak|speaking|know|prefer|preferred)\b.*\b(?:english|hindi)\b/i.test(t) ||
    /\b(?:hindi|english)\s+medium\b/i.test(t) ||
    /\b(?:in|choose|language|bhasha)\s*(?:is|:)?\s*(?:english|hindi)\b/i.test(t)
  ) {
    // Only exempt if they did NOT explicitly say "teach English" / "English subject" / name classes for it
    if (!/\b(?:teach|subject|tutor|tuition)\b.*\b(?:english|hindi)\b|\b(?:english|hindi)\b.*\b(?:class|1[0-2]|[3-9])\b/i.test(t)) {
      return true;
    }
  }
  return false;
}

export function extractBaseSubjectsFromText(text: string): CanonicalBaseSubject[] {
  const s = String(text || "").trim();
  if (!s) return [];

  // Strip stored suffixes like "for Class IX", "(Class 1-8)", etc.
  const work = s
    .replace(/\((?:class[^)]*|kindergarten)\)/gi, " ")
    .replace(/\b(?:for|upto|up\s*to)\s+class(?:es)?\s+(?:[ivx0-9\s,&-]+|preparatory|kg)\b/gi, " ")
    .trim();

  if (isLanguagePreferenceContext(work)) return [];

  const found = new Set<CanonicalBaseSubject>();

  // Combos first
  if (/\bpcmb\b/i.test(work)) {
    found.add("Physics");
    found.add("Chemistry");
    found.add("Mathematics");
    found.add("Biology");
  } else {
    if (/\bpcm\b/i.test(work)) {
      found.add("Physics");
      found.add("Chemistry");
      found.add("Mathematics");
    }
    if (/\bpcb\b/i.test(work)) {
      found.add("Physics");
      found.add("Chemistry");
      found.add("Biology");
    }
  }
  if (/\bcommerce\b/i.test(work) && !/\b(?:don'?t|do\s+not|nahi|not)\s+(?:teach\s+)?commerce\b/i.test(work)) {
    found.add("Accountancy");
    found.add("Business Studies");
    found.add("Economics");
  }
  if (/\bhumanities\b|\barts\s+stream\b/i.test(work)) {
    found.add("History");
    found.add("Political Science");
    found.add("Geography");
    found.add("Economics");
  }

  for (const { re, base } of BASE_SUBJECT_MATCHERS) {
    if (base === "Physics" && /\bpcm?b?\b/i.test(work) && !/\bphysic/i.test(work)) continue;
    if (re.test(work)) {
      // Guard: avoid extracting "Computer Science" AND "Science" from "Computer Science"
      if (base === "Science" && /\b(?:computer|social|political|home)\s+science\b/i.test(work)) {
        const withoutCompoundSci = work.replace(/\b(?:computer|social|political|home)\s+science\b/gi, " ");
        if (!re.test(withoutCompoundSci)) continue;
      }
      found.add(base);
    }
  }

  // Note: When explicit specific subjects (e.g. Biology, Maths) AND "All Subjects" appear in the SAME single clause,
  // keep both so multi-band rules filter appropriately per grade.
  return [...found];
}

function mapSubjectForGrade(base: CanonicalBaseSubject, grade: number): string | null {
  if (grade <= 8) return `All Subjects for Class ${grade}`;

  if (grade === 9 || grade === 10) {
    const rom = ROMAN[grade];
    if (base === "All Subjects") return null; // Never store All Subjects on Class 9-10
    if (base === "Physics" || base === "Chemistry" || base === "Biology" || base === "Science") {
      return `Science for Class ${rom}`;
    }
    if (
      base === "History" ||
      base === "Political Science" ||
      base === "Geography" ||
      base === "Economics" ||
      base === "Social Science"
    ) {
      return `Social Science for Class ${rom}`;
    }
    if (CLASS_9_10_ALLOWED.has(base)) {
      return `${base} for Class ${rom}`;
    }
    // Accountancy / Business Studies / Psychology / Sociology etc. are NOT Class 9-10 school subjects
    return null;
  }

  // Class 11 or 12
  const rom = ROMAN[grade];
  if (!rom) return null;
  if (base === "All Subjects" || base === "Science" || base === "Social Science") return null;
  if (CLASS_11_12_ALLOWED.has(base)) {
    return `${base} for Class ${rom}`;
  }
  return null;
}

export type StrictEducationResult = {
  ok: boolean;
  classLevels: string[];
  subjects: string[]; // Canonical DB subjects (with classes) OR base subjects if no class known yet
  pendingBaseSubjects: CanonicalBaseSubject[]; // Non-empty only when user named subjects but zero classes yet
  needsSpecificSubjectsFor9to12: boolean;
  incompatibleSeniorOnlyForJunior: boolean;
  errorPrompt?: string;
};

/**
 * Parses and validates education details strictly.
 * Supports multi-clause natural messages like "Biology 10 - 12. 1-5 all sub."
 * so Class 1-5 gets All Subjects, Class 10 gets Science, Class 11-12 gets Biology.
 */
export function enforceStrictEducation(input: {
  rawMessage?: string;
  subjectsInput?: string[] | string | null;
  classesInput?: string[] | string | null;
}): StrictEducationResult {
  const classOutPrePrimary = { value: false };
  const gradesSet = new Set<number>();
  const examsSet = new Set<"JEE" | "NEET" | "CUET">();
  const dbSubjects = new Set<string>();
  let needsSpecificSubjectsFor9to12 = false;
  let seniorOnlyAttemptedForJuniorOnly = false;

  const rawText = String(input.rawMessage || "").trim();
  const extraSubsText = Array.isArray(input.subjectsInput)
    ? input.subjectsInput.join(", ")
    : String(input.subjectsInput || "");
  const extraClsText = Array.isArray(input.classesInput)
    ? input.classesInput.join(", ")
    : String(input.classesInput || "");

  // Step A: Clause-by-clause parsing on rawMessage if it contains multiple clauses
  // Split on sentence boundaries (period/newline/semicolon) ONLY when numbers/classes aren't split mid-decimal.
  const clauses = rawText
    ? rawText
        .split(/(?:\n|;|(?<=[a-z0-9])\.(?:\s+|$)|,\s*(?=[a-z]+\s+(?:class\s*)?(?:\d|nursery|kg))|(?<=\d)\s+and\s+(?=[a-z]+\s+(?:class\s*)?\d+\s*[-–to]))/i)
        .map((c) => c.trim())
        .filter(Boolean)
    : [];

  let anyClauseHadBoth = false;
  if (clauses.length > 1) {
    // Check if distinct clauses carry distinct grade bands (e.g. "Biology 10 - 12." and "1-5 all sub.")
    const parsedClauses = clauses.map((c) => ({
      text: c,
      cls: extractStrictClasses(c),
      subs: extractBaseSubjectsFromText(c),
    }));
    const clausesWithCls = parsedClauses.filter((p) => p.cls.labels.length > 0);
    if (clausesWithCls.length >= 2) {
      anyClauseHadBoth = true;
      for (const pc of parsedClauses) {
        if (pc.cls.prePrimary) {
          classOutPrePrimary.value = true;
          dbSubjects.add("All Subjects for Pre-Primary");
        }
        for (const g of pc.cls.grades) gradesSet.add(g);
        for (const ex of pc.cls.exams) examsSet.add(ex);

        const subsForClause =
          pc.subs.length > 0
            ? pc.subs
            : extractBaseSubjectsFromText(extraSubsText);

        for (const g of pc.cls.grades) {
          if (g <= 8) {
            if (subsForClause.length === 0 || subsForClause.includes("All Subjects") || !subsForClause.every((b) => SENIOR_ONLY_SUBJECTS.has(b))) {
              dbSubjects.add(`All Subjects for Class ${g}`);
            } else {
              seniorOnlyAttemptedForJuniorOnly = true;
            }
          } else {
            const concrete = subsForClause.filter((b) => b !== "All Subjects");
            if (subsForClause.includes("All Subjects") && concrete.length === 0) {
              needsSpecificSubjectsFor9to12 = true;
            }
            for (const b of concrete) {
              const mapped = mapSubjectForGrade(b, g);
              if (mapped) dbSubjects.add(mapped);
            }
          }
        }
      }
    }
  }

  // Step B: Unified parsing when single clause or explicit stored arrays
  if (!anyClauseHadBoth) {
    const combinedCls = extractStrictClasses(`${rawText} ${extraClsText}`);
    const combinedSubs = extractBaseSubjectsFromText(`${rawText} ${extraSubsText}`);

    if (combinedCls.prePrimary) classOutPrePrimary.value = true;
    for (const g of combinedCls.grades) gradesSet.add(g);
    for (const ex of combinedCls.exams) examsSet.add(ex);

    if (gradesSet.size === 0 && !classOutPrePrimary.value && examsSet.size === 0) {
      // Classes not known yet — return validated base subjects (if any) without fabricating classes!
      return {
        ok: combinedSubs.length > 0,
        classLevels: [],
        subjects: [],
        pendingBaseSubjects: combinedSubs,
        needsSpecificSubjectsFor9to12: false,
        incompatibleSeniorOnlyForJunior: false,
      };
    }

    if (classOutPrePrimary.value) {
      dbSubjects.add("All Subjects for Pre-Primary");
    }

    const gradeArr = [...gradesSet].sort((a, b) => a - b);
    const hasSeniorGrades = gradeArr.some((g) => g >= 9) || examsSet.size > 0;
    const onlyJuniorGrades = gradeArr.length > 0 && gradeArr.every((g) => g <= 8);

    // Detect impossible combo like "Physics for Class 5" (junior only + senior-only subjects)
    if (
      onlyJuniorGrades &&
      combinedSubs.length > 0 &&
      combinedSubs.every((b) => SENIOR_ONLY_SUBJECTS.has(b))
    ) {
      seniorOnlyAttemptedForJuniorOnly = true;
      const offending = combinedSubs[0];
      return {
        ok: false,
        classLevels: [],
        subjects: [],
        pendingBaseSubjects: combinedSubs,
        needsSpecificSubjectsFor9to12: false,
        incompatibleSeniorOnlyForJunior: true,
        errorPrompt: `In school curricula, *${offending}* is taught from Class 9 to 12 (or as Science in Class 9–10). Classes 1–8 follow *All Subjects*.\n\nWhich classes and subjects would you like to save — Classes 1–8 (*All Subjects*), Class 9–10 (*Science*), or Class 11–12 (*${offending}*)?`,
      };
    }

    for (const g of gradeArr) {
      if (g <= 8) {
        // Strict rule: Classes 1-8 ALWAYS get "All Subjects for Class <n>" ONLY!
        if (combinedSubs.length === 0 || !combinedSubs.every((b) => SENIOR_ONLY_SUBJECTS.has(b))) {
          dbSubjects.add(`All Subjects for Class ${g}`);
        }
      } else {
        const concrete = combinedSubs.filter((b) => b !== "All Subjects");
        if (combinedSubs.includes("All Subjects") && concrete.length === 0) {
          needsSpecificSubjectsFor9to12 = true;
        }
        for (const b of concrete) {
          const mapped = mapSubjectForGrade(b, g);
          if (mapped) dbSubjects.add(mapped);
        }
        if (g >= 11 && combinedSubs.includes("Science") && concrete.every((b) => b === "Science" || b === "Mathematics")) {
          needsSpecificSubjectsFor9to12 = true;
        }
      }
    }

    // JEE / NEET exam mappings
    for (const ex of examsSet) {
      if (ex === "JEE") {
        const examSubs = combinedSubs.filter((b) => b === "Physics" || b === "Chemistry" || b === "Mathematics");
        for (const b of examSubs.length ? examSubs : (["Physics", "Chemistry", "Mathematics"] as CanonicalBaseSubject[])) {
          dbSubjects.add(`${b === "Mathematics" ? "Maths" : b} for IITJEE`);
        }
      } else if (ex === "NEET") {
        const examSubs = combinedSubs.filter((b) => b === "Physics" || b === "Chemistry" || b === "Biology");
        for (const b of examSubs.length ? examSubs : (["Physics", "Chemistry", "Biology"] as CanonicalBaseSubject[])) {
          dbSubjects.add(`${b} for NEET`);
        }
      } else if (ex === "CUET") {
        for (const b of combinedSubs.filter((x) => x !== "All Subjects")) {
          dbSubjects.add(`${b} for CUET`);
        }
      }
    }

    if (hasSeniorGrades && dbSubjects.size === 0) {
      needsSpecificSubjectsFor9to12 = true;
    }
  }

  const finalClassLevels = formatCanonicalClassLabels({
    prePrimary: classOutPrePrimary.value,
    grades: [...gradesSet],
    exams: [...examsSet],
  });
  const finalSubjects = [...dbSubjects];

  if (needsSpecificSubjectsFor9to12 && finalSubjects.length === 0) {
    const has1112 = [...gradesSet].some((g) => g >= 11);
    return {
      ok: false,
      classLevels: finalClassLevels,
      subjects: [],
      pendingBaseSubjects: [],
      needsSpecificSubjectsFor9to12: true,
      incompatibleSeniorOnlyForJunior: false,
      errorPrompt: has1112
        ? `For Class 11–12, please specify exact stream subjects (e.g., *Physics, Chemistry, Mathematics, Biology, Accountancy, Business Studies, Economics*) rather than "All Subjects".`
        : `For Class 9–10, please share specific school subjects (e.g., *Mathematics, Science, Social Science, English, Hindi, Computer Science*) — "All Subjects" is only for Classes 1–8.`,
    };
  }

  return {
    ok: finalClassLevels.length > 0 && finalSubjects.length > 0 && !seniorOnlyAttemptedForJuniorOnly,
    classLevels: finalClassLevels,
    subjects: finalSubjects,
    pendingBaseSubjects: [],
    needsSpecificSubjectsFor9to12,
    incompatibleSeniorOnlyForJunior: seniorOnlyAttemptedForJuniorOnly,
  };
}

/**
 * Unbypassable DB firewall: guarantees zero random text, zero Class 1-8 named subjects,
 * zero Class 9-10 Physics/Chemistry/Biology sub-branches, and zero Class 9-12 "All Subjects"
 * can ever reach TutorProfile or Lead in PostgreSQL.
 */
export function sanitizeEducationForDb(
  rawSubjects: unknown,
  rawClassLevels: unknown
): { classLevels: string[]; subjects: string[] } {
  const subsArr = Array.isArray(rawSubjects)
    ? rawSubjects.map((s) => String(s || "").trim()).filter(Boolean)
    : [];
  const clsArr = Array.isArray(rawClassLevels)
    ? rawClassLevels.map((c) => String(c || "").trim()).filter(Boolean)
    : [];

  // Separate already-attributed "<Subject> for <Grade>" entries from unattributed base subjects
  // so multi-band arrays never Cartesian cross-pollinate across bands.
  const attributedEntries = subsArr.filter((s) => /\bfor\s+(?:class|pre-primary|jee|neet|cuet)\b/i.test(s));
  const bareEntries = subsArr.filter((s) => !/\bfor\s+(?:class|pre-primary|jee|neet|cuet)\b/i.test(s));

  const outSubjects = new Set<string>();
  const outClassPrePrimary = { value: false };
  const outGrades = new Set<number>();
  const outExams = new Set<"JEE" | "NEET" | "CUET">();

  const initialCls = extractStrictClasses(clsArr.join(", "));
  if (initialCls.prePrimary) outClassPrePrimary.value = true;
  for (const g of initialCls.grades) outGrades.add(g);
  for (const ex of initialCls.exams) outExams.add(ex);

  for (const entry of attributedEntries) {
    const cls = extractStrictClasses(entry);
    const bases = extractBaseSubjectsFromText(entry);
    if (cls.prePrimary) {
      outClassPrePrimary.value = true;
      if (bases.length === 0 || !bases.every((b) => SENIOR_ONLY_SUBJECTS.has(b))) {
        outSubjects.add("All Subjects for Pre-Primary");
      }
    }
    for (const g of cls.grades) {
      outGrades.add(g);
      if (g <= 8) {
        if (bases.length === 0 || bases.includes("All Subjects") || !bases.every((b) => SENIOR_ONLY_SUBJECTS.has(b))) {
          outSubjects.add(`All Subjects for Class ${g}`);
        }
      } else {
        for (const b of bases) {
          const mapped = mapSubjectForGrade(b, g);
          if (mapped) outSubjects.add(mapped);
        }
      }
    }
    for (const ex of cls.exams) {
      outExams.add(ex);
      for (const b of bases) {
        if (b !== "All Subjects") {
          outSubjects.add(`${b} for ${ex}`);
        }
      }
    }
  }

  // Ensure every junior grade already present gets "All Subjects for Class N"
  if (outClassPrePrimary.value) outSubjects.add("All Subjects for Pre-Primary");
  for (const g of outGrades) {
    if (g <= 8) outSubjects.add(`All Subjects for Class ${g}`);
  }

  if (bareEntries.length > 0 && (clsArr.length > 0 || outGrades.size > 0 || outClassPrePrimary.value || outExams.size > 0)) {
    const baseClsLabels = formatCanonicalClassLabels({
      prePrimary: outClassPrePrimary.value,
      grades: [...outGrades],
      exams: [...outExams],
    });
    const enforced = enforceStrictEducation({
      subjectsInput: bareEntries,
      classesInput: baseClsLabels.length > 0 ? baseClsLabels : clsArr,
    });
    for (const s of enforced.subjects) outSubjects.add(s);
    const parsedCls = extractStrictClasses(enforced.classLevels.join(", "));
    if (parsedCls.prePrimary) outClassPrePrimary.value = true;
    for (const g of parsedCls.grades) outGrades.add(g);
    for (const ex of parsedCls.exams) outExams.add(ex);
  } else if (attributedEntries.length === 0) {
    const enforced = enforceStrictEducation({
      subjectsInput: subsArr,
      classesInput: clsArr,
    });
    if (enforced.classLevels.length > 0 && enforced.subjects.length > 0) {
      return {
        classLevels: enforced.classLevels,
        subjects: enforced.subjects,
      };
    }
  }

  const finalClasses = formatCanonicalClassLabels({
    prePrimary: outClassPrePrimary.value,
    grades: [...outGrades],
    exams: [...outExams],
  });
  return {
    classLevels: finalClasses,
    subjects: [...outSubjects],
  };
}
