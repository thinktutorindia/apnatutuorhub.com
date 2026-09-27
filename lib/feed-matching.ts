/**
 * lib/feed-matching.ts
 *
 * Pure, client-safe matching logic for the tutor lead feed.
 * Zero database or server-only imports — safe for React client components.
 */

import { parseGradeNumbers } from "@/lib/subject-taxonomy";
import { expandToIndividualClasses } from "@/lib/dummy-campaign-types";

export function cleanSubjectName(raw: string): string {
  if (!raw) return "";
  let clean = raw.trim();
  clean = clean.replace(/\bmaths\b/i, "Mathematics");
  clean = clean.replace(
    /\s*(?:for|-|\(|\/|–|—|,)?\s*(?:class|grade|std|standard)\s*(?:[0-9]{1,2}|[ivx]+)(?:\s*(?:to|-|–|&|and)\s*(?:class|grade|std|standard)?\s*(?:[0-9]{1,2}|[ivx]+))?\s*(?:st|nd|rd|th)?\s*\)?/gi,
    ""
  );
  clean = clean.replace(/\s+(?:[0-9]{1,2}|[ivx]+)\s*(?:st|nd|rd|th)?\s*(?:grade|class|std)?$/i, "");
  clean = clean.replace(/\s*\([^)]*(?:class|grade|std|standard|[0-9]{1,2}|[ivx]+)[^)]*\)/gi, "");
  clean = clean.replace(/^[-–—:,/]+|[-–—:,/]+$/g, "").trim();
  return clean || raw.trim();
}

const ROMAN_NUMERALS: Record<string, number> = {
  I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10, XI: 11, XII: 12,
};

export function extractGradeNumber(s: string): number | null {
  if (!s) return null;
  const trimmed = s.trim();

  // Check Roman numerals: "Class VI", "VI", "Class 6"
  const romanMatch = trimmed.match(/\b(XII|XI|VIII|VII|VI|IV|IX|III|II|X|V|I)\b/i);
  if (romanMatch) {
    const r = romanMatch[1].toUpperCase();
    if (ROMAN_NUMERALS[r]) return ROMAN_NUMERALS[r];
  }

  // Check digits: "6th", "Class 6", "6 Std", "Grade 6", "6th Std"
  const digitMatch = trimmed.match(/\b([1-9]|1[0-2])\b/);
  if (digitMatch) {
    return parseInt(digitMatch[1], 10);
  }

  return null;
}

export function normalizeClassLevel(raw: string): string {
  const s = raw.trim();
  if (/jee|iit/i.test(s)) return "JEE";
  if (/neet|medical/i.test(s)) return "NEET";
  if (/coding|computer|python|programming/i.test(s)) return "Coding";
  if (/ca|commerce/i.test(s)) return "CA";
  if (/art|music|dance|drawing/i.test(s)) return "Arts";
  if (/language|french|german|spoken|sanskrit/i.test(s)) return "Languages";

  const grade = extractGradeNumber(s);
  if (grade !== null) {
    if (grade <= 5) return "Class 1-5";
    if (grade <= 8) return "Class 6-8";
    if (grade <= 10) return "Class 9-10";
    if (grade <= 12) return "Class 11-12";
  }

  if (/class\s*1\s*-\s*5|1\s*to\s*5/i.test(s)) return "Class 1-5";
  if (/class\s*6\s*-\s*8|6\s*to\s*8/i.test(s)) return "Class 6-8";
  if (/class\s*9\s*-\s*10|9\s*to\s*10/i.test(s)) return "Class 9-10";
  if (/class\s*11\s*-\s*12|11\s*to\s*12/i.test(s)) return "Class 11-12";

  return s;
}

export function hasSubjectOverlap(tutorSubjects: string[], leadSubjects: string[]): boolean {
  if (!tutorSubjects.length || !leadSubjects.length) return false;

  const cleanedLeadSubjects = leadSubjects.map(cleanSubjectName);
  const leadSet = new Set(cleanedLeadSubjects.map((s) => s.toLowerCase()));

  for (const rawTs of tutorSubjects) {
    const ts = cleanSubjectName(rawTs).toLowerCase();
    if (!ts) continue;

    if (leadSet.has(ts)) return true;

    // "All Subjects" or "All Core Subjects" tutor matches any core school subjects
    if (ts.includes("all subject") || ts.includes("all core") || ts.includes("all primary") || ts.includes("combo")) return true;

    for (const rawLs of leadSubjects) {
      const ls = cleanSubjectName(rawLs).toLowerCase();
      if (!ls) continue;

      if (ls.includes("all subject") || ls.includes("all core") || ls.includes("all primary") || ls.includes("combo")) return true;
      if (ts.includes(ls) || ls.includes(ts)) return true;

      // Maths stem
      if (
        (ls.includes("math") || ls.includes("algebra") || ls.includes("calculus") || ls.includes("geometry")) &&
        (ts.includes("math") || ts.includes("algebra") || ts.includes("calculus") || ts.includes("geometry"))
      ) return true;

      // Science stem
      if (
        (ls.includes("science") || ls.includes("evs") || ls.includes("general science")) &&
        (ts.includes("science") || ts.includes("evs") || ts.includes("general science"))
      ) return true;

      // Physics / Chemistry / Biology
      if (ls.includes("physic") && ts.includes("physic")) return true;
      if (ls.includes("chem") && ts.includes("chem")) return true;
      if (ls.includes("bio") && ts.includes("bio")) return true;

      // Social Science / SST
      if (
        (ls.includes("social") || ls.includes("sst") || ls.includes("history") || ls.includes("geography") || ls.includes("civics")) &&
        (ts.includes("social") || ts.includes("sst") || ts.includes("history") || ts.includes("geography") || ts.includes("civics"))
      ) return true;

      // English & Spoken English
      if (ls.includes("english") && ts.includes("english")) return true;

      // Hindi
      if (ls.includes("hindi") && ts.includes("hindi")) return true;

      // Languages
      const langKeywords = [
        "sanskrit", "french", "german", "spanish", "punjabi", "bengali", "urdu",
        "marathi", "gujarati", "tamil", "telugu", "kannada", "malayalam", "arabic",
        "japanese", "chinese", "mandarin", "russian", "italian", "korean", "odia", "assamese"
      ];
      for (const lk of langKeywords) {
        if (ls.includes(lk) && ts.includes(lk)) return true;
      }

      // Commerce / Accounts
      if (
        (ls.includes("account") || ls.includes("commerce") || ls.includes("business") || ls.includes("bst")) &&
        (ts.includes("account") || ts.includes("commerce") || ts.includes("business") || ts.includes("bst"))
      ) return true;

      // Economics
      if (ls.includes("economic") && ts.includes("economic")) return true;

      // Computer / Coding
      if (
        (ls.includes("code") || ls.includes("programm") || ls.includes("computer") || ls.includes("python") || ls.includes("java") || ls.includes("it")) &&
        (ts.includes("code") || ts.includes("programm") || ts.includes("computer") || ts.includes("python") || ts.includes("java") || ts.includes("it"))
      ) return true;
    }
  }

  return false;
}

export function coversClassLevel(tutorClassLevels: string[], leadClassLevel: string): boolean {
  if (!tutorClassLevels.length || !leadClassLevel) return false;

  if (tutorClassLevels.includes(leadClassLevel)) return true;

  const leadGrade = extractGradeNumber(leadClassLevel);
  const normLead = normalizeClassLevel(leadClassLevel);

  for (const tc of tutorClassLevels) {
    if (tc.trim() === leadClassLevel.trim()) return true;

    const normTc = normalizeClassLevel(tc);
    if (normTc === normLead) return true;

    // Check individual grade match (e.g. 6 === 6)
    const tutorGrade = extractGradeNumber(tc);
    if (leadGrade !== null && tutorGrade !== null && leadGrade === tutorGrade) return true;

    // Check if tutor class range covers lead grade
    if (leadGrade !== null) {
      // 1. Numeric ranges: e.g. "Class 1-5", "Class 11-12", "1 to 8", "9-10", "11–12"
      const rangeMatches = tc.matchAll(
        /(?:class\s*)?(\d{1,2})\s*(?:st|nd|rd|th)?\s*(?:to|-|–|—)\s*(?:class\s*)?(\d{1,2})\s*(?:st|nd|rd|th)?/gi
      );
      for (const rm of rangeMatches) {
        const start = parseInt(rm[1], 10);
        const end = parseInt(rm[2], 10);
        const min = Math.min(start, end);
        const max = Math.max(start, end);
        if (leadGrade >= min && leadGrade <= max) return true;
      }

      // 2. Roman ranges: e.g. "Class XI-XII", "Class IX-X", "Class I-V", "Class VI-VIII"
      const romanRangeMatches = tc.matchAll(
        /(?:class\s*)?([ivx]+)\s*(?:to|-|–|—)\s*(?:class\s*)?([ivx]+)/gi
      );
      for (const rrm of romanRangeMatches) {
        const start = ROMAN_NUMERALS[rrm[1].toUpperCase()];
        const end = ROMAN_NUMERALS[rrm[2].toUpperCase()];
        if (start && end) {
          const min = Math.min(start, end);
          const max = Math.max(start, end);
          if (leadGrade >= min && leadGrade <= max) return true;
        }
      }
    }

    if (
      (leadClassLevel.toLowerCase().includes("spoken") || leadClassLevel.toLowerCase().includes("beginner")) &&
      (tc.toLowerCase().includes("spoken") || tc.toLowerCase().includes("beginner") || tc.toLowerCase().includes("college") || tc.toLowerCase().includes("11") || tc.toLowerCase().includes("12"))
    ) {
      return true;
    }

    if (
      (leadGrade === null || tutorGrade === null) &&
      (tc.toLowerCase().includes(leadClassLevel.toLowerCase()) ||
      leadClassLevel.toLowerCase().includes(tc.toLowerCase()))
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Evaluates whether a tutor is qualified to teach the requested subjects at the requested class level.
 * Prevents cross-subject class leaks: e.g. a tutor who teaches Physics for Class XII and Maths for Class X
 * must NOT be matched for Class 10 Physics!
 * Standalone subjects (e.g. "Maths", "Science") inherit the tutor's class levels.
 * Class-bound subjects (e.g. "Maths for Class X") strictly require the lead grade to match the subject grade.
 */
export function isSubjectAndClassMatched(
  tutorSubjects: string[],
  tutorClassLevels: string[],
  leadSubjects: string[],
  leadClassLevel: string
): boolean {
  if (!tutorSubjects.length || !leadSubjects.length) return false;

  // Resolve effective lead class level: if leadClassLevel is empty, infer from lead subjects
  let effectiveLeadClass = leadClassLevel;
  if (!effectiveLeadClass) {
    for (const ls of leadSubjects) {
      const g = parseGradeNumbers(ls);
      if (g.length > 0) {
        effectiveLeadClass = `Class ${g[0]}`;
        break;
      }
    }
  }

  const effectiveTutorClasses =
    tutorClassLevels && tutorClassLevels.length > 0
      ? tutorClassLevels
      : expandToIndividualClasses(tutorSubjects);

  if (effectiveLeadClass && !coversClassLevel(effectiveTutorClasses, effectiveLeadClass)) {
    return false;
  }

  const leadGrade = effectiveLeadClass ? extractGradeNumber(effectiveLeadClass) : null;

  // Senior Stream Segregation (Class 11-12)
  if (leadGrade !== null && leadGrade >= 11) {
    const combinedLead = `${effectiveLeadClass || ""} ${leadSubjects.join(" ")}`.toLowerCase();
    const isHumanitiesLead = /humanit|arts?\b|history|political\s*sci|pol\s*sci|geograph|psycholog|sociolog/i.test(combinedLead);
    const isCommerceLead = /commerce|account|business|bst\b/i.test(combinedLead);
    const isScienceLead = /jee|neet|medical|physic|chem|bio\b|biolog/i.test(combinedLead);

    const combinedTutor = tutorSubjects.join(" ").toLowerCase();
    const tutorHasHumanities = /humanit|arts?\b|history|political\s*sci|pol\s*sci|geograph|psycholog|sociolog/i.test(combinedTutor);
    const tutorHasCommerce = /commerce|account|business|bst\b/i.test(combinedTutor);
    const tutorHasScience = /jee|neet|medical|physic|chem|bio\b|biolog/i.test(combinedTutor);
    const tutorHasMath = /math|calculus|algebra/i.test(combinedTutor);

    if (isHumanitiesLead && !tutorHasHumanities) return false;
    if (isCommerceLead && !tutorHasCommerce && !(tutorHasMath && combinedLead.includes("math"))) return false;
    if (isScienceLead && (tutorHasHumanities || tutorHasCommerce) && !tutorHasScience && !tutorHasMath) return false;
  }

  // Check each tutor subject: at least ONE must match a lead subject AND be valid for this class level
  for (const rawTs of tutorSubjects) {
    if (!hasSubjectOverlap([rawTs], leadSubjects)) continue;

    // Check if the tutor subject is class-bound (e.g. "Maths for Class X" -> [10])
    const subjectGrades = parseGradeNumbers(rawTs);
    if (subjectGrades.length > 0 && leadGrade !== null) {
      if (!subjectGrades.includes(leadGrade)) {
        // This specific tutor subject is for a different grade!
        continue;
      }
    }

    // Found a valid subject for this class level
    return true;
  }

  return false;
}

export interface MatchFilterParams {
  lead: {
    distanceKm: number | null;
    mode: string;
    subjects: string[];
    classLevel: string;
    tutorGenderPref?: string | null;
  };
  tutorSubjects?: string[];
  tutorClassLevels?: string[];
  teachingRadius?: number;
  hasTutorLocation?: boolean;
  tutorGender?: string | null;
}

/**
 * Determines whether a given lead matches a tutor's profile constraints:
 * 1. Radius: offline leads must be within teachingRadius km (if tutor location exists)
 * 2. Subjects & Class: must have qualified subject overlap at the lead's class level
 * 3. Gender: if parent has specific preference, must align
 */
export function isLeadMatchedToTutor({
  lead,
  tutorSubjects = [],
  tutorClassLevels = [],
  teachingRadius = 10,
  hasTutorLocation = false,
  tutorGender = null,
}: MatchFilterParams): boolean {
  // 1. Distance check
  if (hasTutorLocation && lead.mode !== "ONLINE") {
    if (lead.distanceKm !== null && lead.distanceKm > (teachingRadius || 10)) {
      return false;
    }
  }

  // 2. Gender check
  if (lead.tutorGenderPref && tutorGender) {
    const pref = lead.tutorGenderPref.toUpperCase().trim();
    if (pref !== "ANY" && !pref.includes("ANY") && pref !== "") {
      const tg = tutorGender.toUpperCase().trim();
      if (pref.includes("FEMALE") && tg !== "FEMALE") return false;
      if (pref.includes("MALE") && tg !== "MALE") return false;
    }
  }

  // 3. Subject / Class match
  if (tutorSubjects && tutorSubjects.length > 0) {
    if (!isSubjectAndClassMatched(tutorSubjects, tutorClassLevels, lead.subjects, lead.classLevel)) {
      return false;
    }
  }

  return true;
}
