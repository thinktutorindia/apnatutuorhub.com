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
    "maths for class xii",
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
    "physics for class x",
    "bhautiki",
  ],
  chemistry: [
    "chem",
    "chemist",
    "chemistry for neet",
    "chemistry for iitjee",
    "chemistry for class xii",
    "organic chemistry",
    "inorganic chemistry",
    "physical chemistry",
    "rasayan",
  ],
  biology: [
    "bio",
    "biology for neet",
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
    "science & maths",
    "evs",
    "environmental science",
    "vigyan",
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
      });
    }
  }

  return Array.from(aliases);
}

export type ClassLevelInfo = {
  label: string;
  sub: string;
  category: "Primary" | "Middle" | "High" | "Senior" | "Competitive" | "College";
};

export const ALL_STRUCTURED_CLASSES: ClassLevelInfo[] = [
  { label: "Class 11", sub: "Senior Secondary", category: "Senior" },
  { label: "Class 12", sub: "Board & Entrance", category: "Senior" },
  { label: "College / Degree", sub: "B.Sc, B.Com, BA, B.Tech, etc.", category: "College" },
  { label: "IIT-JEE", sub: "Mains & Advanced", category: "Competitive" },
  { label: "NEET", sub: "Medical Entrance", category: "Competitive" },
  { label: "Class 10", sub: "Board Exams", category: "High" },
  { label: "Class 9", sub: "Secondary Foundation", category: "High" },
  { label: "Class 8", sub: "Middle School", category: "Middle" },
  { label: "Class 7", sub: "Middle School", category: "Middle" },
  { label: "Class 6", sub: "Middle School", category: "Middle" },
  { label: "Class 5", sub: "Primary School", category: "Primary" },
  { label: "Class 4", sub: "Primary School", category: "Primary" },
  { label: "Class 3", sub: "Primary School", category: "Primary" },
  { label: "Class 2", sub: "Primary School", category: "Primary" },
  { label: "Class 1", sub: "Primary School", category: "Primary" },
  { label: "Nursery / KG", sub: "Pre-primary & Kindergarten", category: "Primary" },
];

/**
 * Returns tailored, relevant class options based on the chosen subject.
 * E.g., for Psychology/Accountancy/Sociology, shows Senior Secondary & College first.
 * For NEET/JEE, shows Entrance & Class 11-12 first.
 * For Nursery/Abacus, shows Primary first.
 */
export function getRelevantClassesForSubject(subject: string): {
  recommendedClasses: ClassLevelInfo[];
  otherClasses: ClassLevelInfo[];
  suggestedNotice?: string;
} {
  const s = subject.trim().toLowerCase();

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

  // 4. Middle & High School (e.g. Social Studies, General Science, Sanskrit)
  const isMiddleHigh = [
    "social studies",
    "sst",
    "social science",
    "general science",
    "sanskrit",
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

