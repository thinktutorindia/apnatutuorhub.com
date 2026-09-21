/**
 * lib/feed-matching.ts
 *
 * Pure, client-safe matching logic for the tutor lead feed.
 * Zero database or server-only imports — safe for React client components.
 */

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
      if (/1\s*-\s*5|1\s*to\s*5/i.test(tc) && leadGrade >= 1 && leadGrade <= 5) return true;
      if (/6\s*-\s*8|6\s*to\s*8/i.test(tc) && leadGrade >= 6 && leadGrade <= 8) return true;
      if (/9\s*-\s*10|9\s*to\s*10/i.test(tc) && leadGrade >= 9 && leadGrade <= 10) return true;
      if (/11\s*-\s*12|11\s*to\s*12/i.test(tc) && leadGrade >= 11 && leadGrade <= 12) return true;
      if (/1\s*-\s*8|1\s*to\s*8/i.test(tc) && leadGrade >= 1 && leadGrade <= 8) return true;
      if (/6\s*-\s*10|6\s*to\s*10/i.test(tc) && leadGrade >= 6 && leadGrade <= 10) return true;
      if (/1\s*-\s*10|1\s*to\s*10/i.test(tc) && leadGrade >= 1 && leadGrade <= 10) return true;
      if (/1\s*-\s*12|1\s*to\s*12/i.test(tc) && leadGrade >= 1 && leadGrade <= 12) return true;
    }

    if (
      (leadClassLevel.toLowerCase().includes("spoken") || leadClassLevel.toLowerCase().includes("beginner")) &&
      (tc.toLowerCase().includes("spoken") || tc.toLowerCase().includes("beginner") || tc.toLowerCase().includes("college") || tc.toLowerCase().includes("11") || tc.toLowerCase().includes("12"))
    ) {
      return true;
    }

    if (
      tc.toLowerCase().includes(leadClassLevel.toLowerCase()) ||
      leadClassLevel.toLowerCase().includes(tc.toLowerCase())
    ) {
      return true;
    }
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
 * 2. Subjects: must have keyword / taxonomy overlap, or class level overlap
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
    const subOverlap = hasSubjectOverlap(tutorSubjects, lead.subjects);
    
    // Check if class level matches
    const classOverlap = tutorClassLevels.length > 0 && !tutorClassLevels.every(c => c.toLowerCase() === "general")
      ? coversClassLevel(tutorClassLevels, lead.classLevel)
      : false;

    // Check if tutor subject names contain class references e.g. "Maths for Class XI"
    const tsStr = tutorSubjects.join(" ").toLowerCase();
    const lc = (lead.classLevel || "").toLowerCase();
    let classInSubjectMatch = false;
    if ((tsStr.includes("11") || tsStr.includes("xi")) && (lc.includes("11") || lc.includes("xi"))) {
      classInSubjectMatch = true;
    }
    if ((tsStr.includes("12") || tsStr.includes("xii")) && (lc.includes("12") || lc.includes("xii"))) {
      classInSubjectMatch = true;
    }

    // Also if lead is "All Core Subjects" or "All Subjects", match if class aligns
    const isLeadAllSubjects = lead.subjects.some(s => {
      const sl = s.toLowerCase();
      return sl.includes("all core") || sl.includes("all subject") || sl === "general";
    });

    if (isLeadAllSubjects) {
      if (classOverlap || classInSubjectMatch) return true;
    }

    if (!subOverlap && !classOverlap && !classInSubjectMatch) {
      return false;
    }
  }

  return true;
}
