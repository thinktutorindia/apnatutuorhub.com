import { TRUEMYTUTOR_TREE } from "@/components/tutor/onboarding/steps/Step3Subjects";
import { SUBJECT_TAXONOMY } from "@/lib/validations";

// Common synonyms and abbreviations dictionary
export const SUBJECT_SYNONYMS: Record<string, string[]> = {
  mathematics: [
    "math",
    "maths",
    "mathematic",
    "mathmatics",
    "maths for class x",
    "maths for class ix",
    "maths for class xi",
    "maths for class xii",
    "maths for class viii",
    "maths for class vii",
    "maths for class vi",
    "maths for class v",
    "maths for class iv",
    "maths for class iii",
    "science & maths",
    "elementary maths",
    "basic maths",
    "high school math",
    "vedic maths",
    "mental maths",
    "maths for iitjee",
    "applied mathematics",
    "business maths",
    "quantitative aptitude maths",
    "algebra",
    "calculus",
    "geometry",
    "trigonometry",
    "statistics",
    "ganit",
  ],
  physics: [
    "phy",
    "physic",
    "physics for neet",
    "physics for iitjee",
    "physics for class xii",
    "physics for class xi",
    "physics for class x",
    "physics for class ix",
    "bhautiki",
  ],
  chemistry: [
    "chem",
    "chemist",
    "chemistry for neet",
    "chemistry for iitjee",
    "chemistry for class xii",
    "chemistry for class xi",
    "chemistry for class x",
    "chemistry for class ix",
    "organic chemistry",
    "inorganic chemistry",
    "physical chemistry",
    "rasayan",
  ],
  biology: [
    "bio",
    "biology for neet",
    "biology for class xii",
    "biology for class xi",
    "biology for class x",
    "biology for class ix",
    "botany",
    "zoology",
    "biotechnology",
    "life science",
    "jeev vigyan",
  ],
  english: [
    "eng",
    "spoken english",
    "english grammar",
    "english literature",
    "communicative english",
    "ielts",
    "toefl",
  ],
  hindi: [
    "hin",
    "hindi grammar",
    "hindi literature",
    "vyakaran",
  ],
  accountancy: [
    "accounts",
    "account",
    "accounting",
    "financial accounting",
    "book keeping",
    "commerce",
  ],
  economics: [
    "eco",
    "microeconomics",
    "macroeconomics",
    "indian economics",
    "statistics for economics",
    "arthshastra",
  ],
  "computer science": [
    "cs",
    "comp",
    "computer",
    "coding",
    "programming",
    "python",
    "java",
    "c++",
    "web development",
    "information technology",
    "informatics practices",
    "ai",
    "machine learning",
  ],
  "social studies": [
    "sst",
    "social science",
    "history",
    "geography",
    "civics",
    "political science",
    "polity",
    "social",
  ],
  science: [
    "general science",
    "science for class x",
    "science for class ix",
    "science for class viii",
    "science for class vii",
    "science for class vi",
    "science & maths",
    "evs",
    "environmental science",
    "vigyan",
  ],
  "all subjects": [
    "all subjects",
    "all subjects (kg to 10th)",
    "class 10 all subjects",
    "class 9 all subjects",
    "nursery to fifth",
    "1 to 8",
    "class 1 to 10",
  ],
  "business studies": [
    "bst",
    "business",
    "business management",
    "commerce",
  ],
  sanskrit: [
    "sans",
    "sanskrit grammar",
  ],
  french: [
    "fr",
    "french language",
    "spoken french",
  ],
  german: [
    "de",
    "german language",
    "deutsch",
  ],
  spanish: [
    "es",
    "spanish language",
    "espanol",
    "spoken spanish",
  ],
  japanese: [
    "ja",
    "japanese language",
    "nihongo",
    "spoken japanese",
  ],
  arabic: [
    "ar",
    "arabic language",
    "spoken arabic",
  ],
  chinese: [
    "mandarin",
    "chinese language",
    "mandarin chinese",
  ],
  russian: [
    "ru",
    "russian language",
    "spoken russian",
  ],
  italian: [
    "it",
    "italian language",
    "spoken italian",
  ],
  korean: [
    "ko",
    "korean language",
    "hangul",
    "spoken korean",
  ],
  urdu: [
    "ur",
    "urdu language",
    "spoken urdu",
  ],
  punjabi: [
    "pa",
    "punjabi language",
    "gurmukhi",
    "spoken punjabi",
  ],
  bengali: [
    "bn",
    "bangla",
    "bengali language",
    "spoken bengali",
  ],
  marathi: [
    "mr",
    "marathi language",
    "spoken marathi",
  ],
  gujarati: [
    "gu",
    "gujarati language",
    "spoken gujarati",
  ],
  tamil: [
    "ta",
    "tamil language",
    "spoken tamil",
  ],
  telugu: [
    "te",
    "telugu language",
    "spoken telugu",
  ],
  kannada: [
    "kn",
    "kannada language",
    "spoken kannada",
  ],
  malayalam: [
    "ml",
    "malayalam language",
    "spoken malayalam",
  ],
  "spoken english": [
    "english speaking",
    "communication skills",
    "english fluency",
    "personality development",
    "conversational english",
  ],
};

// Flatten all subjects from the taxonomies for rapid fuzzy search
export function getAllTaxonomySubjects(): Array<{ name: string; category: string }> {
  const map = new Map<string, string>();

  // From SUBJECT_TAXONOMY
  SUBJECT_TAXONOMY.forEach((group) => {
    group.subjects.forEach((s) => {
      if (!map.has(s)) map.set(s, group.group);
    });
  });

  // From TRUEMYTUTOR_TREE
  TRUEMYTUTOR_TREE.forEach((node) => {
    if (node.subjects) {
      node.subjects.forEach((s) => {
        if (!map.has(s)) map.set(s, node.name);
      });
    }
    if (node.subcategories) {
      node.subcategories.forEach((sub) => {
        sub.subjects.forEach((s) => {
          if (!map.has(s)) map.set(s, `${node.name} > ${sub.name}`);
        });
      });
    }
  });

  return Array.from(map.entries()).map(([name, category]) => ({ name, category }));
}

// Levenshtein distance for fuzzy typo correction
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1).toLowerCase() === a.charAt(j - 1).toLowerCase()) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

export type SubjectSuggestion = {
  name: string;
  category: string;
  matchType: "exact" | "prefix" | "synonym" | "fuzzy";
  score: number;
};

/**
 * Smart search for subjects with typo tolerance, prefix matching, and synonym expansion.
 */
export function searchSmartSubjects(query: string, limit = 8): SubjectSuggestion[] {
  const cleanQ = query.trim().toLowerCase();
  if (!cleanQ) return [];

  const allSubjects = getAllTaxonomySubjects();
  const results: SubjectSuggestion[] = [];
  const seen = new Set<string>();

  // 1. Check direct synonym dictionary match
  for (const [canonical, aliases] of Object.entries(SUBJECT_SYNONYMS)) {
    if (
      cleanQ === canonical ||
      aliases.some((alias) => alias === cleanQ || cleanQ.startsWith(alias) || alias.startsWith(cleanQ))
    ) {
      // Find matching items that correspond to this canonical subject
      const matchingItems = allSubjects.filter(
        (s) =>
          s.name.toLowerCase() === canonical ||
          s.name.toLowerCase().includes(canonical) ||
          aliases.some((a) => s.name.toLowerCase().includes(a))
      );

      matchingItems.slice(0, 4).forEach((item) => {
        if (!seen.has(item.name)) {
          seen.add(item.name);
          results.push({
            name: item.name,
            category: item.category,
            matchType: "synonym",
            score: 95,
          });
        }
      });
    }
  }

  // 2. Exact and prefix substring matching
  for (const item of allSubjects) {
    if (seen.has(item.name)) continue;
    const lower = item.name.toLowerCase();

    if (lower === cleanQ) {
      seen.add(item.name);
      results.push({ name: item.name, category: item.category, matchType: "exact", score: 100 });
    } else if (lower.startsWith(cleanQ)) {
      seen.add(item.name);
      results.push({ name: item.name, category: item.category, matchType: "prefix", score: 85 });
    } else if (lower.includes(cleanQ)) {
      seen.add(item.name);
      results.push({ name: item.name, category: item.category, matchType: "prefix", score: 70 });
    }
  }

  // 3. Fuzzy typo matching (if we still have room)
  if (results.length < limit && cleanQ.length >= 3) {
    for (const item of allSubjects) {
      if (seen.has(item.name)) continue;
      const lower = item.name.toLowerCase();
      const dist = levenshteinDistance(cleanQ, lower.slice(0, cleanQ.length + 2));

      // Allow up to 2 typos for medium length words
      const maxDistance = cleanQ.length <= 4 ? 1 : 2;
      if (dist <= maxDistance) {
        seen.add(item.name);
        results.push({ name: item.name, category: item.category, matchType: "fuzzy", score: 50 - dist });
      }
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

/**
 * Expand a user search subject into all possible related aliases & tutor profile tags
 * so search never fails due to minor naming variations.
 */
export function expandSubjectAliases(subject: string): string[] {
  const clean = subject.trim().toLowerCase();
  const aliases = new Set<string>([subject.trim()]);

  for (const [canonical, syns] of Object.entries(SUBJECT_SYNONYMS)) {
    if (clean === canonical || clean.includes(canonical) || syns.some((s) => clean === s || clean.includes(s))) {
      aliases.add(canonical);
      // Capitalize canonical
      aliases.add(canonical.charAt(0).toUpperCase() + canonical.slice(1));
      syns.forEach((syn) => {
        aliases.add(syn);
        aliases.add(syn.charAt(0).toUpperCase() + syn.slice(1));
        // Title Case each word (e.g. "Maths for Class X", "Science & Maths")
        aliases.add(syn.replace(/\b[a-z]/g, (c) => c.toUpperCase()));
        aliases.add(
          syn
            .split(" ")
            .map((w) => (w.length <= 2 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
            .join(" ")
        );
      });
    }
  }

  return Array.from(aliases);
}

/**
 * Expands a search or filter class level into all corresponding database class level tags
 * (e.g. "Class 9-10" -> ["Class 9-10", "Class 9", "Class 10", "Class 1 to 10", "General"])
 */
export function expandClassLevel(cls?: string): string[] {
  if (!cls) return [];
  const clean = cls.trim();
  if (!clean) return [];

  const set = new Set<string>([clean, "General"]);

  // Class 1-5 / Primary
  if (/1\s*[-–to]+\s*5|primary|nursery|kg/i.test(clean)) {
    [
      "Class 1", "Class 2", "Class 3", "Class 4", "Class 5",
      "Nursery", "LKG", "UKG", "Nursery / KG", "Nursery to Fifth",
      "1 to 8", "Class 1 to 10", "Class 1-5",
    ].forEach((c) => set.add(c));
  }

  // Class 6-8 / Middle
  if (/6\s*[-–to]+\s*8|middle/i.test(clean)) {
    [
      "Class 6", "Class 7", "Class 8",
      "1 to 8", "Class 1 to 10", "Class 6-8",
    ].forEach((c) => set.add(c));
  }

  // Class 9-10 / Secondary
  if (/9\s*[-–to]+\s*10|secondary/i.test(clean) && !/1[12]/i.test(clean)) {
    [
      "Class 9", "Class 10", "Class 1 to 10", "Class 9-10",
    ].forEach((c) => set.add(c));
  }

  // Class 11-12 / Senior
  if (/11\s*[-–to]+\s*12|senior/i.test(clean)) {
    [
      "Class 11", "Class 12", "Class 11-12",
    ].forEach((c) => set.add(c));
  }

  // Single class e.g. "Class 10", "Class 9", "Class 1"
  const singleMatch = clean.match(/Class\s*(\d{1,2})\b/i);
  if (singleMatch) {
    const num = parseInt(singleMatch[1], 10);
    set.add(`Class ${num}`);
    if (num <= 5) {
      ["Nursery to Fifth", "1 to 8", "Class 1 to 10", "Class 1-5"].forEach((c) => set.add(c));
    } else if (num <= 8) {
      ["1 to 8", "Class 1 to 10", "Class 6-8"].forEach((c) => set.add(c));
    } else if (num <= 10) {
      ["Class 1 to 10", "Class 9-10"].forEach((c) => set.add(c));
    } else if (num <= 12) {
      ["Class 11-12"].forEach((c) => set.add(c));
    }
  }

  // College / Degree / CA / Commerce
  if (/college|degree|b\.\s*tech|b\.\s*sc|b\.\s*com|graduation/i.test(clean)) {
    ["College / Degree", "CA / Commerce", "Competitive Exams", "College"].forEach((c) => set.add(c));
  }

  // NEET / IIT-JEE / Competitive
  if (/neet|jee|iit|competitive/i.test(clean)) {
    ["NEET", "IIT-JEE", "Competitive Exams"].forEach((c) => set.add(c));
  }

  return Array.from(set);
}

export type ClassLevelInfo = {
  label: string;
  sub: string;
  category: "Primary" | "Middle" | "High" | "Senior" | "Competitive" | "College";
};

export const ALL_STRUCTURED_CLASSES: ClassLevelInfo[] = [
  { label: "Class 10", sub: "Board Exams", category: "High" },
  { label: "Class 12", sub: "Board & Entrance", category: "Senior" },
  { label: "Class 9", sub: "Secondary Foundation", category: "High" },
  { label: "Class 11", sub: "Senior Secondary", category: "Senior" },
  { label: "Class 8", sub: "Middle School", category: "Middle" },
  { label: "Class 7", sub: "Middle School", category: "Middle" },
  { label: "Class 6", sub: "Middle School", category: "Middle" },
  { label: "Class 5", sub: "Primary School", category: "Primary" },
  { label: "Class 4", sub: "Primary School", category: "Primary" },
  { label: "Class 3", sub: "Primary School", category: "Primary" },
  { label: "Class 2", sub: "Primary School", category: "Primary" },
  { label: "Class 1", sub: "Primary School", category: "Primary" },
  { label: "Nursery / KG", sub: "Pre-primary & Kindergarten", category: "Primary" },
  { label: "Beginner / Spoken", sub: "Conversational & Fluency", category: "College" },
  { label: "College / Degree", sub: "B.Sc, B.Com, BA, B.Tech, etc.", category: "College" },
  { label: "IIT-JEE", sub: "Mains & Advanced", category: "Competitive" },
  { label: "NEET", sub: "Medical Entrance", category: "Competitive" },
];

/**
 * Returns tailored, relevant class options based on the chosen subject.
 * E.g., for Psychology/Accountancy/Sociology, shows Senior Secondary & College first.
 * For NEET/JEE, shows Entrance & Class 11-12 first.
 * For Nursery/Abacus, shows Primary first.
 * For Languages, shows all school grades (Class 1 to 12) + Spoken / Conversational.
 */
export function getRelevantClassesForSubject(subject: string): {
  recommendedClasses: ClassLevelInfo[];
  otherClasses: ClassLevelInfo[];
  suggestedNotice?: string;
} {
  const s = subject.trim().toLowerCase();

  // 0. Languages (School 1st/2nd/3rd Language, Foreign, Regional & Spoken)
  const isLanguage = [
    "english",
    "hindi",
    "sanskrit",
    "french",
    "german",
    "spanish",
    "japanese",
    "mandarin",
    "chinese",
    "arabic",
    "russian",
    "italian",
    "korean",
    "urdu",
    "punjabi",
    "bengali",
    "marathi",
    "gujarati",
    "tamil",
    "telugu",
    "kannada",
    "malayalam",
    "odia",
    "assamese",
    "spoken",
    "ielts",
    "toefl",
    "pte",
    "language",
    "linguistic",
    "phonics",
    "foreign",
    "vyakaran",
    "grammar",
  ].some((kw) => s.includes(kw));

  if (isLanguage) {
    const isSpokenOnly = s.includes("spoken") || s.includes("fluency") || s.includes("ielts") || s.includes("toefl") || s.includes("speaking");
    const recommended = isSpokenOnly
      ? ALL_STRUCTURED_CLASSES.filter(
          (c) => c.label.includes("Spoken") || c.category === "College" || c.category === "Senior" || c.category === "High"
        )
      : ALL_STRUCTURED_CLASSES.filter(
          (c) => c.category === "High" || c.category === "Middle" || c.category === "Primary" || c.category === "Senior" || c.label.includes("Spoken")
        );
    const other = ALL_STRUCTURED_CLASSES.filter(
      (c) => !recommended.some((r) => r.label === c.label)
    );
    return {
      recommendedClasses: recommended,
      otherClasses: other,
      suggestedNotice: `${subject} is available across all classes (Class 1 to 12) as 1st, 2nd, or 3rd language, plus spoken & conversational fluency.`,
    };
  }

  // 1. Senior Secondary & Higher Ed Only subjects
  const isSeniorOnly = [
    "psychology",
    "sociology",
    "accountancy",
    "accounts",
    "business studies",
    "political science",
    "statistics",
    "biotechnology",
    "applied mathematics",
    "organic chemistry",
    "physical chemistry",
  ].some((kw) => s.includes(kw));

  if (isSeniorOnly) {
    const recommended = ALL_STRUCTURED_CLASSES.filter(
      (c) => c.category === "Senior" || c.category === "College"
    );
    const other = ALL_STRUCTURED_CLASSES.filter(
      (c) => c.category !== "Senior" && c.category !== "College"
    );
    return {
      recommendedClasses: recommended,
      otherClasses: other,
      suggestedNotice: `${subject} is typically taught in Class 11, 12, or College level.`,
    };
  }

  // 2. Competitive Exam subjects
  const isCompetitive = [
    "iit",
    "jee",
    "neet",
    "entrance",
    "cuet",
    "nda",
    "clat",
  ].some((kw) => s.includes(kw));

  if (isCompetitive) {
    const recommended = ALL_STRUCTURED_CLASSES.filter(
      (c) => c.category === "Competitive" || c.category === "Senior"
    );
    const other = ALL_STRUCTURED_CLASSES.filter(
      (c) => c.category !== "Competitive" && c.category !== "Senior"
    );
    return {
      recommendedClasses: recommended,
      otherClasses: other,
      suggestedNotice: `${subject} is an entrance exam curriculum.`,
    };
  }

  // 3. Early Childhood & Primary subjects
  const isPrimaryOnly = [
    "nursery",
    "kg",
    "kindergarten",
    "abacus",
    "phonics",
    "drawing",
    "handwriting",
  ].some((kw) => s.includes(kw));

  if (isPrimaryOnly) {
    const recommended = ALL_STRUCTURED_CLASSES.filter((c) => c.category === "Primary");
    const other = ALL_STRUCTURED_CLASSES.filter((c) => c.category !== "Primary");
    return {
      recommendedClasses: recommended,
      otherClasses: other,
      suggestedNotice: `${subject} is for early childhood and primary students.`,
    };
  }

  // 4. Middle & High School (e.g. Social Studies, General Science)
  const isMiddleHigh = [
    "social studies",
    "sst",
    "social science",
    "general science",
    "history",
    "geography",
    "civics",
    "evs",
  ].some((kw) => s.includes(kw));

  if (isMiddleHigh) {
    const recommended = ALL_STRUCTURED_CLASSES.filter(
      (c) => c.category === "High" || c.category === "Middle"
    );
    const other = ALL_STRUCTURED_CLASSES.filter(
      (c) => c.category !== "High" && c.category !== "Middle"
    );
    return {
      recommendedClasses: recommended,
      otherClasses: other,
    };
  }

  // Default: Common subjects (Maths, Science, English, Physics, Chem, Bio, Coding)
  const recommended = ALL_STRUCTURED_CLASSES.filter(
    (c) => c.category === "Senior" || c.category === "High" || c.category === "Middle"
  );
  const other = ALL_STRUCTURED_CLASSES.filter(
    (c) => c.category === "Primary" || c.category === "Competitive" || c.category === "College"
  );

  return {
    recommendedClasses: recommended,
    otherClasses: other,
  };
}

/**
 * Intelligently separates and extracts both class level and subject name
 * from user search strings like:
 * - "Class 10 Maths" -> { subject: "Maths", classLevel: "Class 10" }
 * - "Class 1-5 All Subjects" -> { subject: "All Subjects", classLevel: "Class 1-5" }
 * - "Class 9-10 Science & Math" -> { subject: "Science & Maths", classLevel: "Class 9-10" }
 * - "Class 10" -> { subject: "All Subjects", classLevel: "Class 10" }
 * - "Mathematics" -> { subject: "Mathematics", classLevel: "" }
 * - "NEET Biology" -> { subject: "Biology", classLevel: "NEET" }
 */
export function parseClassAndSubject(input: string): { subject: string; classLevel: string } {
  const raw = (input || "").trim();
  if (!raw) return { subject: "", classLevel: "" };

  let classLevel = "";
  let subject = raw;

  // 1. Check for combined class ranges e.g. "Class 1-5", "Class 1–5", "Class 9-10", "Class 11-12", "Class 6-8", "1 to 5"
  const rangeMatch =
    raw.match(/Class\s*(\d{1,2}\s*[-–—to]+\s*\d{1,2})/i) ||
    raw.match(/\b(\d{1,2}\s*[-–—to]+\s*\d{1,2})\s*(?:std|class|grade)?\b/i);
  if (rangeMatch) {
    const cleanRange = rangeMatch[1]
      .replace(/[–—]/g, "-")
      .replace(/\s*to\s*/i, "-")
      .replace(/\s+/g, "");
    classLevel = `Class ${cleanRange}`;
    subject = raw.replace(rangeMatch[0], "").trim();
  }

  // 2. Check for single class e.g. "Class 10", "Class 9", "Class 12"
  if (!classLevel) {
    const singleClassMatch = raw.match(/Class\s*(\d{1,2})\b/i);
    if (singleClassMatch) {
      classLevel = `Class ${Number(singleClassMatch[1])}`;
      subject = raw.replace(singleClassMatch[0], "").trim();
    }
  }

  // 3. Check Roman numerals e.g. "Class X", "Class XII", "Class VI"
  if (!classLevel) {
    const romanMatch = raw.match(/Class\s*(XII|XI|VIII|VII|VI|IV|IX|III|II|X|V|I)\b/i);
    if (romanMatch) {
      const ROMAN_MAP: Record<string, string> = {
        I: "Class 1",
        II: "Class 2",
        III: "Class 3",
        IV: "Class 4",
        V: "Class 5",
        VI: "Class 6",
        VII: "Class 7",
        VIII: "Class 8",
        IX: "Class 9",
        X: "Class 10",
        XI: "Class 11",
        XII: "Class 12",
      };
      classLevel = ROMAN_MAP[romanMatch[1].toUpperCase()] || "";
      subject = raw.replace(romanMatch[0], "").trim();
    }
  }

  // 4. Check ordinal numbers e.g. "10th", "12th", "9th Standard", "6th grade"
  if (!classLevel) {
    const ordinalMatch = raw.match(/\b(\d{1,2})(?:st|nd|rd|th)\s*(?:grade|class|std|standard)?\b/i);
    if (ordinalMatch) {
      const n = Number(ordinalMatch[1]);
      if (n >= 1 && n <= 12) {
        classLevel = `Class ${n}`;
        subject = raw.replace(ordinalMatch[0], "").trim();
      }
    }
  }

  // 5. Check competitive entrance and special stages
  if (/\bneet\b/i.test(raw)) {
    classLevel = "NEET";
    const subClean = raw.replace(/\bneet\b/gi, "").trim();
    subject = subClean || "NEET";
  } else if (/\b(iit[- ]?jee|jee)\b/i.test(raw)) {
    classLevel = "IIT-JEE";
    const subClean = raw.replace(/\b(iit[- ]?jee|jee)\b/gi, "").trim();
    subject = subClean || "IIT-JEE";
  } else if (/\bcuet\b/i.test(raw)) {
    classLevel = "College";
    const subClean = raw.replace(/\bcuet\b/gi, "").trim();
    subject = subClean || "CUET";
  } else if (/\bnda\b/i.test(raw)) {
    classLevel = "Competitive";
    const subClean = raw.replace(/\bnda\b/gi, "").trim();
    subject = subClean || "NDA";
  } else if (/\bclat\b/i.test(raw)) {
    classLevel = "College";
    const subClean = raw.replace(/\bclat\b/gi, "").trim();
    subject = subClean || "CLAT";
  } else if (/\bspoken\s*english\b/i.test(raw)) {
    if (!classLevel) classLevel = "Beginner / Spoken";
    subject = "Spoken English";
  } else if (/\b(nursery|kindergarten|\bkg\b)/i.test(raw)) {
    if (!classLevel) classLevel = "Nursery / KG";
  }

  // Handle stream combos (PCM, PCB, Commerce)
  if (/\bpcm\b/i.test(raw)) {
    if (!classLevel) classLevel = "Class 11-12";
    subject = "Mathematics";
  } else if (/\bpcb\b/i.test(raw)) {
    if (!classLevel) classLevel = "Class 11-12";
    subject = "Biology";
  } else if (/\bcommerce\b/i.test(raw) && !subject) {
    if (!classLevel) classLevel = "Class 11-12";
    subject = "Accountancy";
  }

  // Clean remaining subject noise
  subject = subject
    .replace(/^for\s+/i, "")
    .replace(/\s+for$/i, "")
    .replace(/^(in|at|of|upto)\s+/i, "")
    .replace(/\b(tuition|classes|coaching|board prep|boards)\b/gi, "")
    .replace(/[–—()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // If user entered only a class (e.g. "Class 10" or "Class 1-5"), default subject to "All Subjects"
  if (!subject && classLevel) {
    subject = "All Subjects";
  } else if (!subject) {
    subject = raw;
  }

  return { subject, classLevel };
}

export {
  TAXONOMY_NEED_TABS,
  type TaxonomyNeedItem,
  type TaxonomyNeedGroup,
  type TaxonomyNeedTab,
  type TaxonomyNeedTabId,
} from "@/lib/subject-taxonomy";


