/**
 * ONE taxonomy and range parser for classes + subjects.
 *
 * Output is always one entry per class:
 *   1–8  : "All Subjects for Class <n>"            (Arabic numerals)
 *   9–10 : "<Subject> for Class IX | X"           (Roman numerals)
 *   11–12: "<Subject> for Class XI | XII"         (Roman numerals)
 *
 * Fee/budget never influences the result. Mixed input is split by class band.
 * Pure module: no DB, no network, no sends.
 */

export type ClassBand = "PRE_PRIMARY" | "JUNIOR" | "SECONDARY" | "SENIOR";

export type TaxonomyResult = {
  ok: boolean;
  entries: string[];
  bands: ClassBand[];
  notes: string[];
  prompt?: string;
};

const ROMAN: Record<number, string> = {
  1: "I", 2: "II", 3: "III", 4: "IV", 5: "V", 6: "VI", 7: "VII", 8: "VIII",
  9: "IX", 10: "X", 11: "XI", 12: "XII",
};
const ROMAN_TO_NUM: Record<string, number> = Object.fromEntries(
  Object.entries(ROMAN).map(([n, r]) => [r, Number(n)])
);

const PRE_PRIMARY_RE = /\b(?:nursery|kg|pre[- ]?primary|prep)\b/i;

/** Alias → canonical subject. Physics/Chem/Bio fold to Science for 9–10 only. */
const SUBJECT_ALIASES: Array<[RegExp, string]> = [
  [/\b(?:all\s*(?:core\s*)?sub(?:ject)?s?|sabhi|har\s*sub)\b/i, "ALL_SUBJECTS"],
  [/\b(?:maths?|mathematics|ganit)\b/i, "Mathematics"],
  [/\b(?:physics)\b/i, "Physics"],
  [/\b(?:chemistry)\b/i, "Chemistry"],
  [/\b(?:biology|bio)\b/i, "Biology"],
  [/\b(?:science|sci)\b/i, "Science"],
  [/\b(?:english|angrezi)\b/i, "English"],
  [/\b(?:social\s*science|social studies|sst|history|geography|civics|political science|economics)\b/i, "Social Science"],
  [/\b(?:accountancy|accounts?)\b/i, "Accountancy"],
  [/\b(?:computer\s*science|computing|coding)\b/i, "Computer Science"],
  [/\b(?:hindi)\b/i, "Hindi"],
  [/\b(?:sanskrit)\b/i, "Sanskrit"],
  [/\b(?:french)\b/i, "French"],
  [/\b(?:german)\b/i, "German"],
  [/\b(?:spanish)\b/i, "Spanish"],
];

export function bandOf(grade: number): ClassBand {
  if (grade === 0) return "PRE_PRIMARY";
  if (grade >= 1 && grade <= 8) return "JUNIOR";
  if (grade === 9 || grade === 10) return "SECONDARY";
  return "SENIOR";
}

/** Extract grades 0–12 from free text. 6-digit pincodes/sector numbers are ignored. */
export function extractGrades(input: string): number[] {
  const t = ` ${(input ?? "").replace(/[_\r\n\t]+/g, " ").trim()} `;
  const grades = new Set<number>();

  if (PRE_PRIMARY_RE.test(t)) grades.add(0);

  // Ranges: "1 to 8", "1-8", "9 se 12", "nursery to 5"
  const rangeRe = /\b(?:(\d{1,2})|(nursery|kg))\s*(?:to|se|tak|-|–|—)\s*(\d{1,2})\b/gi;
  for (const m of t.matchAll(rangeRe)) {
    const from = m[2] ? 0 : Number(m[1]);
    const to = Number(m[3]);
    if (Number.isFinite(from) && Number.isFinite(to) && from <= to && to <= 12 && !(from === 0 && to === 0)) {
      for (let g = from; g <= to; g += 1) grades.add(g);
    }
  }

  // Plus separated classes: "1+2"
  const plusRe = /\b(1[0-2]|[1-9])\s*\+\s*(1[0-2]|[1-9])\b/g;
  for (const m of t.matchAll(plusRe)) {
    grades.add(Number(m[1]));
    grades.add(Number(m[2]));
  }

  // Explicit "class 9", "grade XI"
  for (const m of t.matchAll(/\b(?:class|grade|cl)\s*(\d{1,2}|IX|X|XI|XII|I|II|III|IV|V|VI|VII|VIII)\b/gi)) {
    const raw = m[1].toUpperCase();
    const g = /^\d+$/.test(raw) ? Number(raw) : ROMAN_TO_NUM[raw];
    if (g != null && g >= 1 && g <= 12) grades.add(g);
  }

  // Standalone numerals 1–12 (skip 6-digit pincodes and anything glued to digits)
  for (const m of t.matchAll(/(?<!\d)(1[0-2]|[1-9])(?!\d)/g)) grades.add(Number(m[1]));

  // Standalone Roman numerals only when the word "class"/"grade" is in the text.
  if (/\b(?:class|grade)\b/i.test(t)) {
    for (const m of t.matchAll(/\b(IX|X|XI|XII|VIII|VII|VI|IV|III|II|V|I)\b/g)) {
      const g = ROMAN_TO_NUM[m[1].toUpperCase()];
      if (g != null && g >= 1 && g <= 12) grades.add(g);
    }
  }

  return [...grades].sort((a, b) => a - b);
}

export function extractSubjects(input: string): string[] {
  const t = (input ?? "").trim();
  const found = new Set<string>();
  for (const [re, canonical] of SUBJECT_ALIASES) {
    if (re.test(t)) found.add(canonical);
  }
  // "Social Science" matching also sets Science via the science alias — clean that up.
  if (found.has("Social Science") && /\bsocial\s*(?:science|studies)\b/i.test(t) && !/\b(?:physics|chemistry|biology|science)\b/i.test(t.replace(/social\s*(?:science|studies)/gi, ""))) {
    found.delete("Science");
  }
  return [...found];
}

function label(grade: number): string {
  if (grade === 0) return "Pre-Primary";
  return bandOf(grade) === "JUNIOR" ? String(grade) : ROMAN[grade];
}

/** One formatter so numeral style is a one-line change. */
export function formatEntry(subject: string, grade: number): string {
  if (grade === 0) return `${subject} for Pre-Primary`;
  return `${subject} for Class ${label(grade)}`;
}

const SENIOR_ALLOWED = new Set([
  "Mathematics", "Physics", "Chemistry", "Biology", "English", "Hindi", "Sanskrit",
  "Social Science", "Accountancy", "Economics", "Computer Science", "French", "German", "Spanish",
]);
const SECONDARY_ALLOWED = new Set(["Mathematics", "Science", "English", "Social Science"]);

export function parseClassesAndSubjects(input: string): TaxonomyResult {
  const raw = (input ?? "").trim();
  const notes: string[] = [];
  if (!raw) {
    return { ok: false, entries: [], bands: [], notes, prompt: "Please share the class and subjects." };
  }

  const grades = extractGrades(raw);
  if (grades.length === 0) {
    return { ok: false, entries: [], bands: [], notes, prompt: "Please share the class (for example: Class 5, 9 to 12)." };
  }

  let subjects = extractSubjects(raw);
  const bands = [...new Set(grades.map(bandOf))];
  const entries: string[] = [];

  for (const grade of grades) {
    const band = bandOf(grade);
    if (band === "PRE_PRIMARY" || band === "JUNIOR") {
      entries.push(formatEntry("All Subjects", grade));
      if (subjects.some((s) => s !== "ALL_SUBJECTS")) {
        notes.push(`Classes 1-8 are listed as All Subjects for Class ${grade}.`);
      }
      continue;
    }

    if (band === "SECONDARY") {
      const explicit = subjects.filter((s) => s !== "ALL_SUBJECTS");
      const usable = explicit
        .map((s) => (["Physics", "Chemistry", "Biology", "Science"].includes(s) ? "Science" : s))
        .filter((s) => SECONDARY_ALLOWED.has(s));
      if (usable.length === 0) {
        return {
          ok: false, entries: [], bands, notes,
          prompt: "For Class 9-10 please specify school subjects: Mathematics, Science, English or Social Science.",
        };
      }
      for (const s of usable) entries.push(formatEntry(s, grade));
      continue;
    }

    // SENIOR 11–12
    const explicit = subjects.filter((s) => s !== "ALL_SUBJECTS");
    if (explicit.length === 0 || explicit.includes("Science")) {
      return {
        ok: false, entries: [], bands, notes,
        prompt: "For Class 11-12 please name a specific subject (for example Physics, Chemistry, Mathematics, Biology).",
      };
    }
    const senior = explicit.filter((s) => SENIOR_ALLOWED.has(s));
    if (senior.length === 0) {
      return {
        ok: false, entries: [], bands, notes,
        prompt: "For Class 11-12 please name a specific subject (for example Physics, Chemistry, Mathematics, Biology).",
      };
    }
    for (const s of senior) entries.push(formatEntry(s, grade));
  }

  return { ok: true, entries, bands, notes };
}

/** Same data, deduped and sorted junior-first. */
export function normaliseEntries(result: TaxonomyResult): string[] {
  return [...new Set(result.entries)].sort((a, b) => {
    const ga = extractGrades(a)[0] ?? 0;
    const gb = extractGrades(b)[0] ?? 0;
    return ga - gb || a.localeCompare(b);
  });
}
