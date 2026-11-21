/**
 * Shared ApnaTutorHub subject normalization rule.
 *
 * USER RULE (final):
 *   · Class 1-8  → subjects = per-class "All Subjects for Class <n>" entries
 *                  (e.g. "All Subjects for Class 1", "All Subjects for Class 6-8")
 *   · Class 9-12 → class-specific subjects ONLY, no generic/bare subject
 *                  (e.g. "Mathematics for Class X", "Accountancy for Class XI",
 *                   "Chemistry for IITJEE", "Physics for NEET")
 *
 * This module is dependency-free (no path-alias imports) so it can be used by
 * both the WhatsApp chatbot (lib/whatsapp-bot) and the maintenance scripts.
 */

const ROMAN: Record<number, string> = {
  1: "I", 2: "II", 3: "III", 4: "IV", 5: "V", 6: "VI",
  7: "VII", 8: "VIII", 9: "IX", 10: "X", 11: "XI", 12: "XII",
};

const ROMAN_TO_NUM: Record<string, number> = {
  i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6,
  vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12,
};

const PRE_PRIMARY_RE = /\b(nursery|pre[-\s]?nursery|lkg|ukg|kg|pre[-\s]?school|playgroup)\b/i;

/** Numeric grades (0 = pre-primary) present in a class-level text. */
export function parseClassGradesFromText(text: string): number[] {
  const out = new Set<number>();
  const s = String(text || "");
  const lower = s.toLowerCase();

  if (PRE_PRIMARY_RE.test(lower)) out.add(0);

  // "Class 1-8", "Class 6 to 8", "Class 11 and 12", "Class 9", "10th"
  const numericRe =
    /\b(?:class(?:es)?\s*)?(\d{1,2})(?:st|nd|rd|th)?(?:\s*(?:-|–|—|to|&|and|\/)\s*(?:class(?:es)?\s*)?(\d{1,2})(?:st|nd|rd|th)?)?\b/g;
  for (const m of lower.matchAll(numericRe)) {
    const a = parseInt(m[1], 10);
    if (!(a >= 1 && a <= 12)) continue;
    const before = lower.slice(Math.max(0, (m.index ?? 0) - 14), m.index ?? 0);
    const upto = /\b(?:upto|till|below|under)\b/.test(before + " " + m[0]);
    const b = m[2] ? parseInt(m[2], 10) : null;
    if (b != null && b >= 1 && b <= 12 && b !== a) {
      for (let g = Math.min(a, b); g <= Math.max(a, b); g++) out.add(g);
    } else if (upto) {
      for (let g = 1; g <= a; g++) out.add(g);
    } else {
      out.add(a);
    }
  }

  // Roman ranges: "VI to VIII", "IX - X", "XI or XII"
  const romanRangeRe =
    /\b(xii|xi|ix|viii|vii|vi|iv|iii|ii|x|v|i)\s*(?:-|–|—|to|&|and|or|\/)\s*(xii|xi|ix|viii|vii|vi|iv|iii|ii|x|v|i)\b/g;
  for (const m of lower.matchAll(romanRangeRe)) {
    const a = ROMAN_TO_NUM[m[1]];
    const b = ROMAN_TO_NUM[m[2]];
    if (a && b) for (let g = Math.min(a, b); g <= Math.max(a, b); g++) out.add(g);
  }

  // Roman numerals: "Class XI", "IX - X", "XII", "upto V"
  const romanRe = /\b(xii|xi|ix|viii|vii|vi|iv|iii|ii|x|v|i)\b/g;
  for (const m of lower.matchAll(romanRe)) {
    const n = ROMAN_TO_NUM[m[1]];
    if (n) out.add(n);
  }

  return [...out].filter((n) => n >= 0 && n <= 12).sort((a, b) => a - b);
}

/**
 * Contiguous runs → labels. "IX, XI, XII" becomes ["IX", "XI-XII"] so callers
 * can emit one canonical, per-span label per subject instead of a comma list
 * that no taxonomy entry can match.
 */
export function formatClassSegments(
  nums: number[],
  style: "roman" | "arabic" = "roman"
): Array<{ label: string; grades: number[] }> {
  const valid = [...new Set(nums)].filter((n) => n >= 1 && n <= 12).sort((a, b) => a - b);
  if (!valid.length) return [];
  const label = (n: number) => (style === "roman" ? ROMAN[n] : String(n));
  const out: Array<{ label: string; grades: number[] }> = [];
  let start = 0;
  for (let i = 1; i <= valid.length; i++) {
    if (i < valid.length && valid[i] === valid[i - 1] + 1) continue;
    const run = valid.slice(start, i);
    out.push({
      label: run.length === 1 ? label(run[0]) : `${label(run[0])}-${label(run[run.length - 1])}`,
      grades: run,
    });
    start = i;
  }
  return out;
}

/** Contiguous numbers → "IX-X"; scattered → "IX, XI". */
export function formatClassSpan(nums: number[], style: "roman" | "arabic" = "roman"): string | null {
  const labels = formatClassSegments(nums, style).map((s) => s.label);
  return labels.length ? labels.join(", ") : null;
}

function titleCase(s: string): string {
  return String(s || "").trim().split(/\s+/).filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

// ── Subject canonicalisation (specific patterns first!) ─────────────────────
const SUBJECT_PATTERNS: Array<[RegExp, string]> = [
  [/account(?:s|ancy)?\b|\bcosting\b/i, "Accountancy"],
  [/\bmaths?\b|mathematics|ganit/i, "Mathematics"],
  [/social\s*(?:science|studies)|\bsst\b/i, "Social Science"],
  [/\bpolitical\s*science\b|\bpol\s*sci\b|\bpolity\b/i, "Political Science"],
  [/business\s*stud/i, "Business Studies"],
  [/\bcomputer\s*science\b|\bcomputers?\b|\bpython\b|\bjava\b|\bcoding\b/i, "Computer Science"],
  [/\bevs\b|environmental/i, "EVS"],
  [/\bscience\b|\bsci\b|vigyan/i, "Science"],
  [/physic/i, "Physics"],
  [/chemistr/i, "Chemistry"],
  [/\bbio(?:logy)?\b|\bbotany\b|\bzoology\b/i, "Biology"],
  [/\benglish\b/i, "English"],
  [/\bhindi\b/i, "Hindi"],
  [/\bsanskrit\b/i, "Sanskrit"],
  [/\burdu\b/i, "Urdu"],
  [/\becon/i, "Economics"],
  [/\bcommerce\b/i, "Commerce"],
  [/\bhistor/i, "History"],
  [/geograph/i, "Geography"],
  [/psycholog/i, "Psychology"],
  [/sociolog/i, "Sociology"],
  [/\bfrench\b/i, "French"],
  [/\bgerman\b/i, "German"],
  [/\bspanish\b/i, "Spanish"],
  [/\bgk\b|general\s*knowledge/i, "Gk"],
];

const QUALIFIER_RE =
  /\b(iit\s*-?\s*jee|iitjee|jee(?:\s*(?:main|advanced))?|neet|medical\s*entrance|engineering\s*entrance|olympiad|ntse|cuet|cat|upsc|civil\s*services|b\.?\s*com[^\s,)]*|graduation|college)\b/i;

const CLASS_WORD_RE = /^(nursery|kg|lkg|ukg|primary|secondary|middle|senior|general|all|pre-primary|preparatory)$/i;

// Subjects that exist only in the junior band (never attached to Class 9-12).
const JUNIOR_ONLY_BASES = new Set(["evs"]);

function qualifierLabel(raw: string): string {
  const q = raw.replace(/\s+/g, " ").trim();
  if (/iit\s*-?\s*jee|iitjee/i.test(q)) return "IITJEE";
  if (/\bjee\b/i.test(q)) return "JEE";
  if (/neet/i.test(q)) return "NEET";
  if (/medical\s*entrance/i.test(q)) return "Medical Entrance";
  if (/engineering\s*entrance/i.test(q)) return "Engineering Entrance";
  if (/b\.?\s*com/i.test(q)) return "B.Com";
  if (/cuet/i.test(q)) return "CUET";
  if (/\bcat\b/i.test(q)) return "CAT";
  if (/upsc|civil\s*services/i.test(q)) return "UPSC";
  return titleCase(q);
}

/** Extract "Class X" / "upto V" / "for 11th and 12th" from a subject entry. */
function parseClassRefFromEntry(entry: string): { nums: number[]; consumed: string } | null {
  // A) with the word "class": "for Class X", "Class upto V", "Class 11-12"
  const withClass =
    /\b(?:for\s+|upto\s+|till\s+)?class(?:es)?\s*(?:upto\s+|till\s+|below\s+)?((?:\d{1,2}|[ivx]{1,4})(?:\s*(?:-|–|—|to|&|and|or|\/|,)\s*(?:\d{1,2}|[ivx]{1,4}))*)/i;
  const cm = entry.match(withClass);
  if (cm) {
    const nums = parseClassGradesFromText(cm[1]);
    const expandUpto = /\b(?:upto|till|below|under)\b/i.test(cm[0]);
    const finalNums = expandUpto && nums.length === 1 ? Array.from({ length: nums[0] }, (_, i) => i + 1) : nums;
    if (finalNums.length) return { nums: finalNums, consumed: cm[0] };
  }

  // B) without "class": "for XI", "for 11th and 12th", "upto V"
  const bare =
    /\b(?:for|upto|till)\s+((?:\d{1,2}(?:st|nd|rd|th)?|[ivx]{1,4})(?:\s*(?:-|–|—|to|&|and|or|\/|,)\s*(?:\d{1,2}(?:st|nd|rd|th)?|[ivx]{1,4}))*)/i;
  const bm = entry.match(bare);
  if (bm) {
    const nums = parseClassGradesFromText(bm[1]);
    const expandUpto = /\b(?:upto|till)\b/i.test(bm[0]);
    const finalNums = expandUpto && nums.length === 1 ? Array.from({ length: nums[0] }, (_, i) => i + 1) : nums;
    if (finalNums.length) return { nums: finalNums, consumed: bm[0] };
  }

  return null;
}

function canonicalBase(raw: string): string | null {
  let base = String(raw || "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b(?:for|upto|till|to|class(?:es)?|grade)\b.*$/i, " ")
    .replace(/[,&+/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!base) return null;
  if (CLASS_WORD_RE.test(base)) return null;

  for (const [re, name] of SUBJECT_PATTERNS) {
    if (re.test(base)) return name;
  }

  if (base.length < 3 || base.length > 30) return null;
  return titleCase(base);
}

interface ParsedEntry {
  base: string;
  nums: number[] | null;
  qualifier: string | null;
  allSubjects: boolean;
}

function parseSubjectEntry(raw: string): ParsedEntry[] {
  let entry = String(raw || "").trim();
  if (!entry) return [];
  entry = entry.replace(/\s+/g, " ");

  const isAll = /all\s*(?:core\s*)?subjects?|all\s*primary|combo|sabhi|har\s*subject/i.test(entry);
  if (isAll) {
    const ref = parseClassRefFromEntry(entry);
    return [{ base: "All Subjects", nums: ref?.nums ?? null, qualifier: null, allSubjects: true }];
  }

  const qm = entry.match(QUALIFIER_RE);
  if (qm) {
    const qLabel = qualifierLabel(qm[0]);
    let before = entry.slice(0, qm.index ?? 0).trim();
    before = before.replace(/\b(?:for|in|of|class|classes)\b\s*$/i, "").trim();
    if (!before) {
      // Standalone exam label (e.g. "CUET") — keep as-is, no class fabrication
      return [{ base: qLabel, nums: null, qualifier: null, allSubjects: false }];
    }
    const ref = parseClassRefFromEntry(before);
    if (ref) before = before.replace(ref.consumed, " ");
    const base = canonicalBase(before);
    return base ? [{ base, nums: ref?.nums ?? null, qualifier: qLabel, allSubjects: false }] : [];
  }

  const ref = parseClassRefFromEntry(entry);
  let work = entry;
  if (ref) work = work.replace(ref.consumed, " ");

  // Split multi-subject entries: "Science & Maths", "History and Civics"
  const pieces = work
    .split(/\s*(?:&|\+|,|\band\b|\baur\b)\s*/i)
    .map((p) => p.trim())
    .filter(Boolean);
  const list = pieces.length ? pieces : [work];

  const out: ParsedEntry[] = [];
  for (const piece of list) {
    const base = canonicalBase(piece);
    if (base) out.push({ base, nums: ref?.nums ?? null, qualifier: null, allSubjects: false });
  }
  return out;
}

/** Junior classes: compact "All Subjects for Class <n>" entries from classLevels. */
function buildJuniorLabels(classLevels: string[], juniorGrades: number[], prePrimary: boolean): string[] {
  const candidates: Array<{ label: string; grades: number[] }> = [];
  for (const raw of classLevels) {
    const t = String(raw || "").trim();
    if (!t) continue;
    const nums = parseClassGradesFromText(t).filter((g) => g >= 1 && g <= 8);
    if (nums.length) {
      for (const seg of formatClassSegments(nums, "arabic")) candidates.push({ label: seg.label, grades: seg.grades });
    }
  }
  if (!candidates.length && juniorGrades.length) {
    for (const seg of formatClassSegments(juniorGrades, "arabic")) candidates.push({ label: seg.label, grades: seg.grades });
  }

  // Prefer the widest ranges, skip classes already covered
  candidates.sort((a, b) => b.grades.length - a.grades.length || a.grades[0] - b.grades[0]);
  const covered = new Set<number>();
  const picked: Array<{ label: string; grades: number[] }> = [];
  for (const c of candidates) {
    const adds = c.grades.filter((g) => !covered.has(g));
    if (!adds.length) continue;
    for (const g of adds) covered.add(g);
    picked.push(c);
  }

  picked.sort((a, b) => a.grades[0] - b.grades[0]);
  // User rule: every class gets its own "All Subjects for Class <n>" entry.
  const labels = [...covered].sort((a, b) => a - b).map((n) => `All Subjects for Class ${n}`);
  if (prePrimary) labels.unshift("All Subjects for Pre-Primary");
  return [...new Set(labels)];
}

/**
 * Normalize a tutor's subjects as per the final rule.
 * Never fabricates a class that is not present in classLevels / subject entries.
 */
export function normalizeSubjectsForClassRule(subjects: string[], classLevels: string[]): string[] {
  const classText = (classLevels || []).join(", ");
  const parsedClassGrades = parseClassGradesFromText(classText);
  const parsedSubjects = (subjects || []).flatMap(parseSubjectEntry);
  // No subjects stated → never invent labels from classLevels alone.
  if (!parsedSubjects.length) return [];

  // Derive grades from subject entries only when classLevels carry no usable
  // number (e.g. classLevels = "General" but subjects = "All Subjects For Class I").
  // When classLevels DO name classes, they are authoritative — a stray
  // "EVS for Class 5" must not add a junior band to a 9-12 tutor.
  const derivedGrades = new Set<number>(parsedClassGrades);
  if (parsedClassGrades.length === 0) {
    for (const p of parsedSubjects) {
      if (p.nums) for (const n of p.nums) derivedGrades.add(n);
    }
  }

  const prePrimary =
    parsedClassGrades.includes(0) ||
    parsedSubjects.some((p) => p.allSubjects && PRE_PRIMARY_RE.test(String(p.base)));
  const juniorGrades = [...derivedGrades].filter((g) => g >= 1 && g <= 8).sort((a, b) => a - b);
  const seniorGrades = [...derivedGrades].filter((g) => g >= 9 && g <= 12).sort((a, b) => a - b);

  // No band information at all → best-effort canonical list (can't invent classes).
  if (!juniorGrades.length && !seniorGrades.length && !prePrimary) {
    const seen = new Set<string>();
    const fallback: string[] = [];
    for (const p of parsedSubjects) {
      const label = p.qualifier ? `${p.base} for ${p.qualifier}` : p.base;
      const key = label.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      fallback.push(label);
    }
    return fallback;
  }

  const out: string[] = [];
  if (juniorGrades.length || prePrimary) {
    out.push(...buildJuniorLabels(classLevels, juniorGrades, prePrimary));
  }

  if (seniorGrades.length) {
    const seniorLabels = seniorGrades.map((n) => ROMAN[n]);
    const explicitBases = new Set<string>();
    const bareEntries: ParsedEntry[] = [];
    const seniorOut: string[] = [];
    const deferredAllLabels: string[] = [];

    for (const p of parsedSubjects) {
      if (p.allSubjects) {
        const target = p.nums && p.nums.length ? p.nums.filter((n) => n > 8) : seniorGrades;
        for (const n of target) {
          if (n <= 10) {
            // Class 9-10: never store a generic label — use core subjects.
            seniorOut.push(`Mathematics for Class ${ROMAN[n]}`);
            seniorOut.push(`Science for Class ${ROMAN[n]}`);
          } else {
            // Class 11-12 has no universal "all subjects"; kept only as a
            // last-resort label when no concrete subject covers that class.
            deferredAllLabels.push(`All Subjects for Class ${ROMAN[n]}`);
          }
        }
        continue;
      }

      if (p.qualifier) {
        seniorOut.push(`${p.base} for ${p.qualifier}`);
        explicitBases.add(p.base.toLowerCase());
        continue;
      }

      if (p.nums && p.nums.length) {
        const seniorNums = p.nums.filter((n) => n > 8);
        // Explicit junior-only subject (e.g. "EVS for Class 5") must never leak into 9-12.
        if (!seniorNums.length) continue;
        for (const n of seniorNums) seniorOut.push(`${p.base} for Class ${ROMAN[n]}`);
        explicitBases.add(p.base.toLowerCase());
        continue;
      }

      bareEntries.push(p);
    }

    for (const p of bareEntries) {
      const key = p.base.toLowerCase();
      if (explicitBases.has(key)) continue;
      if (JUNIOR_ONLY_BASES.has(key)) continue; // EVS etc. never attach to Class 9-12
      if (!seniorLabels.length) seniorOut.push(p.base);
      for (const label of seniorLabels) {
        const gradeNum = ROMAN_TO_NUM[label.toLowerCase()];
        // Class 9-10: Physics, Chemistry, Biology map to Science for Class IX/X
        if ((gradeNum === 9 || gradeNum === 10) && (key === "physics" || key === "chemistry" || key === "biology")) {
          seniorOut.push(`Science for Class ${label}`);
        } else if ((gradeNum === 11 || gradeNum === 12) && key === "social science") {
          // Social Science never attaches to Class 11-12
          continue;
        } else {
          seniorOut.push(`${p.base} for Class ${label}`);
        }
      }
    }

    // Senior "All Subjects" labels are a last resort: drop them whenever the
    // tutor has given at least one concrete Class 9-12 subject.
    if (seniorOut.length) out.push(...seniorOut);
    const coveredClasses = new Set<number>();
    for (const s of seniorOut) for (const n of parseClassGradesFromText(s)) coveredClasses.add(n);
    for (const label of deferredAllLabels) {
      const nums = parseClassGradesFromText(label);
      if (!nums.length || nums.some((n) => !coveredClasses.has(n))) out.push(label);
    }
  }

  return [...new Set(out)];
}

/** True when the label represents the "all subjects" family (any class wording). */
export function isAllSubjectsLabel(subject: string): boolean {
  return /all\s*(?:core\s*)?subjects?|all\s*primary/i.test(String(subject || ""));
}
