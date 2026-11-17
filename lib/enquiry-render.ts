/**
 * lib/enquiry-render.ts
 *
 * Shared rendering rules for the approved `tuition_enquiry_direct` card.
 * Used by the WhatsApp blast dispatch + live preview AND the pre-send batch
 * export, so every channel renders IDENTICAL data (what the admin verifies
 * in the sheet / preview is exactly what the tutor receives).
 *
 * Data rules (locked Nov 2026):
 *  1. Class 1-8  -> subject is ALWAYS "All Subjects" (never a specific subject).
 *  2. Class 9-12 -> particular subject only (Mathematics, Physics, Accountancy...).
 *                  Never "Science"/"Commerce" for Class 11-12, never
 *                  "Class 12 Science" style combos, never "All Subjects".
 *  3. Subject junk like "Maths for Class V" / "Hindi for Class VI to VIII" /
 *     "Accountancy for Class XI" is cleaned to the bare subject name.
 *  4. Area is REAL and RICH: "locality, sub-colony (near landmark)" style —
 *     see lib/format-rich-nearby-location.ts. No house/plot numbers, building
 *     names, positional junk ("above X", "opp Y"), and never a bare city name.
 *  5. Client name is a realistic Indian parent name, deterministic per lead
 *     (preview == dispatch). NEVER the literal word "Parent", never the
 *     tutor's own name.
 */

// --- 1. Client (parent) name -----------------------------------------------

// Authentic, high-credibility Indian parent names (rotating deterministically)
export const PARENT_NAMES = [
  "Pooja Yadav",
  "Dr. Anita Sen",
  "Rajesh Verma",
  "Sunita Rawat",
  "Amit Sharma",
  "Kavita Chauhan",
  "Suresh Mehra",
  "Ritu Batra",
  "Vikram Malhotra",
  "Dr. Alok Gupta",
  "Meenakshi Sundaram",
  "Ashok Singhal",
  "Neha Aggarwal",
  "Deepak Chopra",
  "Shalini Saxena",
  "Vikas Grover",
  "Pooja Gupta",
  "Manoj Tiwari",
  "Rashmi Khurana",
  "Anil Mathur",
  "Rekha Jain",
  "Sanjay Bansal",
  "Preeti Tandon",
  "Harish Chawla",
  "Geeta Kaushik",
] as const;

/** Deterministic parent name for a lead — same lead always gets the same name. */
export function parentNameForLead(seed: string): string {
  const hash = Math.abs(
    String(seed || "").split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  );
  return PARENT_NAMES[hash % PARENT_NAMES.length];
}

// --- 2. Subject cleaning & resolution --------------------------------------

/**
 * Strip class/grade fragments from scraped subject strings:
 *   "Maths for Class V" -> "Maths"
 *   "Hindi for Class VI to VIII" -> "Hindi"
 *   "Accountancy for Class XI" -> "Accountancy"
 */
export function cleanSubjectJunk(subject: string): string {
  return String(subject || "")
    .replace(/\bfor\s+class(?:es)?\s+(?:upto|up\s+to)?\s*[\wivx]+(?:\s+(?:to|and|or|,|-|–)\s+(?:class(?:es)?\s*)?[\wivx]+)*\b/gi, "")
    .replace(/\bclass(?:es)?\s*[\divx]+\b/gi, "")
    .replace(/\bgrade\s*[\divx]+\b/gi, "")
    .replace(/\((?:[^()]*\bclass\b[^()]*)\)/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s,;\-–:]+|[\s,;\-–:]+$/g, "")
    .trim();
}

/** Title-case a subject fragment ("hindi" -> "Hindi", "gk" -> "Gk"). */
function titleCaseSubject(s: string): string {
  return s
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ")
    .trim();
}

/**
 * Resolve the subject that goes on the enquiry card for a concrete grade.
 *  - grade <= 8  -> always "All Subjects"
 *  - grade 9-10  -> Mathematics / Science / English / Social Science — or the
 *                   tutor's own particular subject (e.g. Hindi) when nothing
 *                   matches, so we NEVER show a subject the tutor doesn't teach.
 *  - grade 11-12 -> a concrete stream subject (NEVER "Science" or "Commerce")
 */
export function resolveEnquirySubject(grade: number, subjectText: string, seed = 0): string {
  if (!grade || grade <= 8) return "All Subjects";

  const cleaned = cleanSubjectJunk(subjectText);
  const s = cleaned.toLowerCase();

  // The tutor's own first real subject fragment (never "All Subjects", "Nursery", or KG)
  const ownSubject = cleaned
    .split(/[,/&]/)
    .map((f) => f.trim())
    .find((f) => f && f.length <= 24 && !/all\s+(subjects|primary)|nursery|lkg|ukg|kg\b|kindergarten|pre-?primary/i.test(f));

  if (grade <= 10) {
    // Class 9-10: Mathematics, Science, English, Social Science
    if (/\bmath/.test(s)) return "Mathematics";
    if (/\bsst\b|\bsocial/.test(s)) return "Social Science";
    if (/\bphysi|\bchem|\bbio|\bsci\b|\bscience/.test(s)) return "Science";
    if (/\beng(?:lish)?\b/.test(s)) return "English";
    // Junior-only languages / subjects the tutor actually teaches
    if (/\bhindi/.test(s)) return "Hindi";
    if (/\bsanskrit/.test(s)) return "Sanskrit";
    if (/\burdu/.test(s)) return "Urdu";
    // Tutor teaches a real but unlisted subject → show THEIR subject,
    // never a subject they don't teach, and NEVER Nursery/early childhood.
    if (ownSubject && !/^(nursery|lkg|ukg|kg|kindergarten|pre-?primary)$/i.test(ownSubject)) {
      return titleCaseSubject(ownSubject);
    }
    // No specific 9-10 academic subject taught
    return "";
  }

  // Class 11-12: concrete, particular subject. NEVER "Science" or "Commerce".
  // Subject keywords are word-boundary anchored and checked BEFORE exam
  // keywords — "Maths for IITJEE" must be Mathematics, not Physics.
  if (/\bphysics\b/.test(s)) return "Physics";
  if (/\bchem/.test(s)) return "Chemistry";
  if (/\bbio|\bbotany|\bzoology|\bmedical/.test(s)) return "Biology";
  if (/\bpsycholog/.test(s)) return "Psychology";
  if (/\bsocio/.test(s)) return "Sociology";
  if (/\bmath/.test(s)) return "Mathematics";
  if (/\baccounts?\b|\baccountanc|\bcosting|\bb\.?\s?st\b/.test(s)) return "Accountancy";
  if (/\becon/.test(s)) return "Economics";
  if (/\bbusiness/.test(s)) return "Business Studies";
  if (/\bcomputer|\bpython/.test(s)) return "Computer Science";
  if (/\bpolitical|\bpol\s*sci/.test(s)) return "Political Science";
  if (/\bhistor/.test(s)) return "History";
  if (/\beng(?:lish)?\b/.test(s)) return "English Core";
  // Exam keywords alone (no subject word anywhere) → sensible default
  if (/\bneet\b/.test(s)) return "Biology";
  if (/\bjee\b|\biit\b/.test(s)) return "Mathematics";

  // Tutor only said generic "Science"/"Commerce" — must become a concrete subject.
  if (/\bsci\b|\bscience/.test(s)) {
    const scienceSubjects = ["Physics", "Chemistry", "Mathematics", "Biology"];
    return scienceSubjects[Math.abs(seed) % scienceSubjects.length];
  }
  if (/\bcomm|\bcommerce/.test(s)) {
    const commerceSubjects = ["Accountancy", "Economics", "Business Studies"];
    return commerceSubjects[Math.abs(seed) % commerceSubjects.length];
  }

  // Tutor teaches a real but unlisted senior subject → show THEIR subject (never Nursery/KG).
  if (ownSubject && !/^(nursery|lkg|ukg|kg\b|kindergarten|pre-?primary)$/i.test(ownSubject)) {
    return titleCaseSubject(ownSubject);
  }

  const seniorDefaults = ["Physics", "Mathematics", "Chemistry", "Economics", "Accountancy"];
  return seniorDefaults[Math.abs(seed) % seniorDefaults.length];
}
