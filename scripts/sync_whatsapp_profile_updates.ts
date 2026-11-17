/**
 * Sync tutor profile gaps from WhatsApp chats + chatbot sessions.
 *
 * 1. Reads WhatsappSession.data (bot-collected area/city/subjects/classes)
 *    and every INBOUND WhatsappChatMessage per tutor phone.
 * 2. Parses location / subjects / classes from the free text.
 * 3. UPDATES TutorProfile ONLY where the directory field is missing or junk
 *    (never overwrites a proper existing value). Every change is logged.
 * 4. Exports:
 *      exports/wa_sync_updates_applied.csv   — what was filled from WhatsApp
 *      exports/need_location_from_tutors.csv — tutors with NO/generic location
 *                                              (grouped by city) → ask-location blast
 *      exports/need_subjects_classes.csv     — tutors with location but no
 *                                              subjects/classes → ask-details blast
 *
 * Run:      npx tsx --env-file=.env scripts/sync_whatsapp_profile_updates.ts
 * Dry-run:  npx tsx --env-file=.env scripts/sync_whatsapp_profile_updates.ts --dry
 */
import { PrismaClient } from "@prisma/client";
import { extractAllGrades, isJunkLocality } from "../lib/whatsapp-bot/leads-helper";
import { INDIAN_CITY_COORDINATES } from "../lib/geocoding";
import { stripAddressJunk } from "../lib/format-rich-nearby-location";

const prisma = new PrismaClient();
const DRY = process.argv.includes("--dry");

const NCR_CITY_RE =
  /\b(new delhi|delhi|noida|greater noida|gurgaon|gurugram|ghaziabad|faridabad|loni)\b/i;

function isTestOrDemoTutor(name: string, email: string): boolean {
  const n = (name || "").toLowerCase();
  const e = (email || "").toLowerCase();
  if (/demo|dummy|pending kyc|sample/.test(n)) return true;
  if (/^test|\.test@|@test\.|test@apnatutorhub/.test(e)) return true;
  if (/\b(test|demo|dummy)\b/.test(e.split("@")[0] || "")) return true;
  return false;
}

function isJunkLocalityText(loc: string, tutorName?: string): boolean {
  const l = (loc || "").toLowerCase().trim();
  if (!l || l.length < 3) return true;
  if (/^(noted|sorry|nhi|nahi|nothing|none|pending|mention it|not mentioned|na|no|yes|ok|okay|hk|thik|theek)\b/.test(l)) return true;
  if (/location at|current location|my location|coordinates/.test(l)) return true;
  if (/\d{1,3}\.\d{3,}.*\d{1,3}\.\d{3,}/.test(l)) return true;
  if (/^(north|south|east|west)\s*(,|\band\b|\.)?\s*(and)?\s*,?\s*\.?$/.test(l)) return true;
  if (/\b(mathematics|maths|physics|chemistry|science|biology|iit|jee|neet|online)\b/.test(l)) return true;
  if (/\b\d+\s*km\b|from\s+border|anything\s+else|^outside$/.test(l)) return true;
  if (/\balpha\b|\bbeta\b/.test(l)) return true;
  if (tutorName && l === tutorName.toLowerCase().trim()) return true;
  return false;
}

function cleanDisplayPhone(phone: string | null | undefined): string {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

function titleCase(s: string): string {
  return String(s || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function cityGroup(city: string | null | undefined): string {
  const l = (city || "").toLowerCase().trim();
  if (!l || /^\d+$/.test(l)) return "Unknown";
  // resolve FIRST — bare "delhi" is junk per isJunkLocality but is a valid city
  const resolved = resolveCityName(findCityInText(l));
  if (resolved) return resolved === "Gurgaon" ? "Gurugram" : resolved;
  if (l.length < 3 || isJunkLocality(l) || isJunkLocalityText(l)) return "Unknown";
  return titleCase(l);
}

function isNcr(city: string | null | undefined): boolean {
  return NCR_CITY_RE.test((city || "").toLowerCase());
}

/** City detection: reuse the 100+ Indian city/locality key table (longest key first). */
const CITY_KEYS = Object.keys(INDIAN_CITY_COORDINATES).sort((a, b) => b.length - a.length);
function findCityInText(text: string): string | null {
  const clean = text.toLowerCase().replace(/[,–-]/g, " ");
  for (const key of CITY_KEYS) {
    if (clean.includes(key)) return key;
  }
  return null;
}

// ── City resolution: a city is a CITY, never a locality ─────────────────────
const MAIN_CITY_SET = new Set([
  "delhi", "new delhi", "noida", "greater noida", "gurgaon", "gurugram",
  "ghaziabad", "faridabad", "loni", "mumbai", "kolkata", "patna", "lucknow",
  "indore", "kanpur", "jaipur", "meerut", "rohtak", "bathinda", "modinagar",
  "aligarh", "gorakhpur", "varanasi", "bareilly", "bhopal", "nagpur", "pune",
  "hyderabad", "chennai", "bengaluru", "bangalore", "ahmedabad", "surat",
  "dehradun", "agra", "prayagraj", "hisar", "panipat", "karnal", "ambala",
]);
// table keys that look like localities but belong to another NCR city
const NON_DELHI_NCR_LOCALITIES: Record<string, string> = {
  vaishali: "Ghaziabad",
  vasundhara: "Ghaziabad",
  indirapuram: "Ghaziabad",
  kaushambi: "Ghaziabad",
  ballabhgarh: "Faridabad",
};

/** Turn a matched table key / city text into a proper CITY name. */
function resolveCityName(key: string | null | undefined): string | null {
  if (!key) return null;
  const k = key.toLowerCase().trim();
  if (NON_DELHI_NCR_LOCALITIES[k]) return NON_DELHI_NCR_LOCALITIES[k];
  if (MAIN_CITY_SET.has(k)) return titleCase(k === "gurgaon" ? "Gurugram" : k);
  const coords = INDIAN_CITY_COORDINATES[k];
  // any other table key inside the NCR bounding box is a Delhi locality
  if (coords && coords.lat > 28.35 && coords.lat < 28.92 && coords.lng > 76.9 && coords.lng < 77.6) {
    return "Delhi";
  }
  return titleCase(k);
}

// ── Subject keyword map ──────────────────────────────────────────────────────
const SUBJECT_PATTERNS: [RegExp, string][] = [
  [/account(?:s|ancy)?\b|\bcosting\b/, "Accountancy"],
  [/\bmaths?\b|mathematics/, "Mathematics"],
  [/\bscience\b|\bsci\b/, "Science"],
  [/physic/, "Physics"],
  [/chemistr/, "Chemistry"],
  [/\bbio/, "Biology"],
  [/\benglish\b/, "English"],
  [/\bhindi\b/, "Hindi"],
  [/\bsanskrit\b/, "Sanskrit"],
  [/\burdu\b/, "Urdu"],
  [/\becon/, "Economics"],
  [/business\s*stud/, "Business Studies"],
  [/\bcommerce\b/, "Commerce"],
  [/\bcomputer\b|\bpython\b|\bjava\b|\bcoding\b/, "Computer Science"],
  [/\bsst\b|social\s*stud|social\s*science/, "Social Science"],
  [/\bhistor/, "History"],
  [/geograph/, "Geography"],
  [/politic(?:al)?\s*science|\bpol\s*sci|\bpolity\b/, "Political Science"],
  [/psycholog/, "Psychology"],
  [/sociolog/, "Sociology"],
  [/\bfrench\b/, "French"],
  [/\bgk\b|general\s*knowledge/, "Gk"],
  [/\bevs\b|environmental\s*stud/, "EVS"],
];

function extractSubjectsFromText(text: string): Set<string> {
  const found = new Set<string>();
  const lower = text.toLowerCase();
  for (const [re, name] of SUBJECT_PATTERNS) {
    if (re.test(lower)) found.add(name);
  }
  return found;
}

/** Grades → directory-style classLevels ("Class 6-8", "Class 11"). */
function gradesToClassLevels(grades: Set<number>): string[] {
  const sorted = [...grades].filter((g) => g >= 1 && g <= 12).sort((a, b) => a - b);
  const out: string[] = [];
  let start = sorted[0], prev = sorted[0];
  for (let i = 1; i <= sorted.length; i++) {
    const g = sorted[i];
    if (g === prev + 1) { prev = g; continue; }
    out.push(start === prev ? `Class ${start}` : `Class ${start}-${prev}`);
    start = g; prev = g;
  }
  return out;
}

// ── Inbound free-text parser ────────────────────────────────────────────────
const LOCALITY_TOKEN_RE =
  /\b(sector|blk\.?|block|pocket|phase|nagar|vihar|colony|enclave|ext|extension|extn|puram|puri|bagh|garden|market|chowk|kunj|marg|road|street|park|place|dwarka|rohini|pitampura|paschim|punjabi|rajouri|karol|patel|laxmi|lakshmi|mayur|preet|anand|dilshad|shahdara|vasundhara|indirapuram|vaishali|kaushambi|model\s+town|gtb|mukherjee|civil\s+lines|burari|saket|hauz\s+khas|malviya|greater\s+kailash|lajpat|kalkaji|nehru\s+place|okhla|badarpur|sarita|jasola|alaknanda|chittaranjan|sangam|tughlakabad|sainik\s+farm|chhatarpur|mahipalpur|palam|najafgarh|nangloi|narela|jnu|munirka|khanpur|govindpuri|jasola|niti|kondli|trilok|puri|baljit|karkardooma|krishna\s+nagar|gandhi\s+nagar|shakarpur|geeta\s+colony|kalyan\s+vas|ahinsa\s+khand|raj\s+nagar|navin|shastri| motivated|uttam|tilak|moti|kirti| Subhash|ashok|pushp|bindapur|matiala|dabri|uttam|jwala|heri|mahavir|om\s+vihar|peera\s+garhi|sultanpuri|kirari|nithari|salania|harola|sector)\b/i;

const GRADE_PATTERN_RE =
  /(?:\bclass(?:es)?\b|\b(?:upto|till|below|under)\s*\d|\d{1,2}(?:st|nd|rd|th)\b|\b[ivx]+\s*(?:to|-|–|—|and|&)\s*[ivx]+\b|\d{1,2}\s*(?:to|-|&|and)\s*\d{1,2}|\bnursery\b|\bkg\b|\bprimary\b|\bsecondary\b|\bsenior\b)/i;

const CHAT_NOISE_RE =
  /reply\s+stop|apnatutorhub\.com|1️⃣|2️⃣|3️⃣|unlock|membership|vip\s+plan|contact\s+080|template|hello!?\s*👋|please\s+(?:check|share)\s+the\s+following/i;

interface ParsedChat {
  location: string | null;
  city: string | null;
  subjects: string[];
  grades: Set<number>;
}

function parseInboundBodies(bodies: string[]): ParsedChat {
  const segs: string[] = [];
  for (const b of bodies) {
    for (const s of String(b).split(/\n|\||•/)) {
      const t = s.trim();
      if (t) segs.push(t);
    }
  }

  const labeledLocs: string[] = [];
  const pureLocs: string[] = [];
  const tokenLocs: string[] = [];
  const subjectSegs: string[] = [];
  const grades = new Set<number>();

  for (const seg of segs) {
    const lower = seg.toLowerCase();
    if (CHAT_NOISE_RE.test(lower)) continue;
    if (/^(hello|hi|hey|ok|okay|yes|no|thanks|thank you|stop|start|bye)\b/.test(lower) && seg.length < 30) continue;

    // Labeled location: "My location is Vikaspuri", "Update my location Karol bagh",
    // "Location South Delhi, Saket", "📍sector-54, ... ballabhgarh, faridabad, haryana."
    const labeled = seg.match(
      /^(?:📍\s*)?(?:my\s+)?(?:updated?\s+)?(?:my\s+)?(?:location|locality|area|address|residence)\s*(?:is|:|-|–)?\s*(.+)$/i
    );
    if (labeled) {
      const cand = labeled[1].trim();
      if (cand.length >= 3 && cand.length <= 90 && !isJunkLocalityText(cand)) labeledLocs.push(cand);
    }

    // Subject / class detection on every segment
    const subjectsInSeg = extractSubjectsFromText(seg);
    const gradesInSeg = extractAllGrades(seg);
    const hasGradePattern = GRADE_PATTERN_RE.test(lower);
    if (gradesInSeg.size > 0 || (hasGradePattern && /class/i.test(lower))) {
      for (const g of gradesInSeg) grades.add(g);
    }
    if (subjectsInSeg.size > 0) subjectSegs.push(seg);

    // Pure location segment: locality token or city word, no subject/class noise
    const cityHit = findCityInText(seg);
    if (labeledLocs.length === 0 && cityHit === null && !LOCALITY_TOKEN_RE.test(lower)) continue;
    if (LOCALITY_TOKEN_RE.test(lower) || cityHit) {
      const hasSubjectNoise = subjectsInSeg.size > 0;
      const hasGradeNoise = gradesInSeg.size > 0;
      if (!hasSubjectNoise && !hasGradeNoise && seg.length <= 90) {
        pureLocs.push(seg);
      } else {
        // "Math, 9th to 12th, gurugram, dwarka" → extract just the city/locality words
        const words = lower.replace(/[^a-z0-9\s,]/g, " ").split(/[\s,]+/).filter(Boolean);
        const picked: string[] = [];
        let i = 0;
        const flat = lower;
        for (const key of CITY_KEYS) {
          if (flat.includes(key)) picked.push(key);
        }
        const locTok = seg.match(new RegExp(`([a-z0-9\\-\\s]*${LOCALITY_TOKEN_RE.source}[a-z0-9\\-\\s]*)`, "i"));
        if (locTok && locTok[1] && locTok[1].trim().split(/\s+/).length <= 4) tokenLocs.push(locTok[1].trim());
        void words; void i;
      }
    }
  }

  // Best location candidate: labeled > pure > token > city word
  let location: string | null = null;
  let city: string | null = null;
  const firstLabeled = labeledLocs[0];
  const firstPure = pureLocs[0];
  const rawLoc = firstLabeled || firstPure || tokenLocs[0] || null;
  if (rawLoc) {
    location = stripAddressJunk(rawLoc);
    if (location) {
      location = titleCase(location);
      city = findCityInText(location);
    }
  }
  if (!city && segs.length) {
    for (const seg of [...labeledLocs, ...pureLocs]) {
      const c = findCityInText(seg);
      if (c) { city = titleCase(c); break; }
    }
  }

  // Subjects: collect keywords across subject-ish segments
  const subjectSet = new Set<string>();
  for (const seg of subjectSegs) {
    for (const s of extractSubjectsFromText(seg)) subjectSet.add(s);
  }

  return { location, city, subjects: [...subjectSet], grades };
}

/** Structured bot-session data → ParsedChat */
function parseSessionData(data: Record<string, unknown>): ParsedChat {
  const locationRaw = (data.area as string) || (data.location as string) || null;
  let location: string | null = null;
  if (locationRaw && !isJunkLocality(locationRaw) && !isJunkLocalityText(locationRaw)) {
    location = titleCase(stripAddressJunk(locationRaw)) || null;
  }
  const cityRaw = (data.city as string) || null;
  const city = cityRaw && !isJunkLocality(cityRaw) && !isJunkLocalityText(cityRaw) ? titleCase(cityRaw) : null;

  const subjectArr = Array.isArray(data.subjects) ? (data.subjects as string[]) : [];
  const subjectSet = new Set<string>();
  const CLASS_WORD_RE = /^(nursery|kg|lkg|ukg|primary|secondary|middle|senior|general|all)$/i;
  for (const s of subjectArr) {
    if (!s || /all\s+subjects/i.test(s)) continue;
    const mapped = extractSubjectsFromText(s);
    if (mapped.size > 0) {
      for (const x of mapped) subjectSet.add(x);
      continue;
    }
    // Non-keyword subject name (e.g. "French", "German Language") — strip
    // "for Class X" / "for IITJEE" tails and class-bucket words.
    const t = s.trim().replace(/\s+for\s+.*$/i, "").trim();
    if (t && t.length <= 24 && !CLASS_WORD_RE.test(t) && !/all\s+subjects/i.test(t)) {
      subjectSet.add(titleCase(t));
    }
  }

  const grades = new Set<number>();
  const classRaw = Array.isArray(data.classLevels)
    ? (data.classLevels as string[]).join(", ")
    : (data.classLevel as string) || "";
  for (const g of extractAllGrades(classRaw)) grades.add(g);

  return { location, city, subjects: [...subjectSet], grades };
}

function profileLocationUsable(prof: { address: string | null; city: string | null }): {
  usable: boolean; quality: "specific" | "generic-city" | "none";
} {
  const addr = (prof.address || "").trim();
  const city = (prof.city || "").trim();
  const addrOk = addr && !isJunkLocality(addr) && !isJunkLocalityText(addr) && !/^pincode\b/i.test(addr);
  if (addrOk) return { usable: true, quality: "specific" };
  if (city && !isJunkLocality(city) && !isJunkLocalityText(city)) return { usable: true, quality: "generic-city" };
  return { usable: false, quality: "none" };
}

function profileSubjectsReal(subjects: string[]): boolean {
  return subjects.some((s) => s && !/all\s+(subjects|primary)/i.test(s));
}

async function main() {
  console.log(`=== WhatsApp → Directory profile sync ${DRY ? "(DRY RUN)" : ""} ===`);

  const tutors = await prisma.user.findMany({
    where: { role: "TUTOR", isActive: true },
    select: {
      id: true, name: true, email: true, phone: true,
      tutorProfile: {
        select: { id: true, address: true, city: true, subjects: true, classLevels: true },
      },
    },
  });

  // phone → tutor map (10-digit)
  const byPhone = new Map<string, (typeof tutors)[number]>();
  const seenPhoneOwner = new Map<string, string>(); // dedupe: first tutor keeps the phone
  for (const t of tutors) {
    const digits = cleanDisplayPhone(t.phone);
    if (digits.length !== 10) continue;
    if (seenPhoneOwner.has(digits)) continue;
    seenPhoneOwner.set(digits, t.id);
    byPhone.set(digits, t);
  }

  const sessions = await prisma.whatsappSession.findMany({
    select: { phone: true, userType: true, data: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });

  const chats = await prisma.whatsappChatMessage.findMany({
    where: { direction: "INBOUND" },
    select: { phone: true, body: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  const chatByPhone = new Map<string, string[]>();
  for (const c of chats) {
    const digits = cleanDisplayPhone(c.phone);
    if (digits.length !== 10) continue;
    const list = chatByPhone.get(digits) || [];
    list.push(c.body);
    chatByPhone.set(digits, list);
  }

  let updatedLocation = 0, updatedSubjects = 0, updatedClasses = 0, updatedCity = 0;
  const applied: string[][] = [];
  const needLocation: string[][] = [];
  const needSubjects: string[][] = [];
  let noPhoneCount = 0;

  for (const t of tutors) {
    const prof = t.tutorProfile;
    if (!prof) continue;
    if (isTestOrDemoTutor(t.name || "", t.email || "")) continue;

    const digits = cleanDisplayPhone(t.phone);
    if (digits.length !== 10 || byPhone.get(digits)?.id !== t.id) { noPhoneCount++; continue; }

    // Merge structured session data + free-text chat
    let parsed: ParsedChat = { location: null, city: null, subjects: [], grades: new Set() };
    const sess = sessions.find((s) => cleanDisplayPhone(s.phone) === digits && s.userType === "TUTOR");
    if (sess) {
      const p = parseSessionData((sess.data || {}) as Record<string, unknown>);
      parsed = p;
    }
    const chatParsed = parseInboundBodies(chatByPhone.get(digits) || []);
    const location = parsed.location || chatParsed.location;
    const city = resolveCityName(parsed.city) || resolveCityName(chatParsed.city) ||
      (location ? resolveCityName(findCityInText(location)) : null);
    const subjects = parsed.subjects.length ? parsed.subjects : chatParsed.subjects;
    const grades = parsed.grades.size ? parsed.grades : chatParsed.grades;

    const changes: string[] = [];
    const patch: { address?: string; city?: string; subjects?: string[]; classLevels?: string[] } = {};

    const locState = profileLocationUsable(prof);
    if (location && !locState.usable) {
      patch.address = location;
      changes.push(`address: "${prof.address || ""}" → "${location}"`);
      updatedLocation++;
      if (city && !(prof.city || "").trim().length) {
        patch.city = cityGroup(city);
        changes.push(`city: "" → "${patch.city}"`);
        updatedCity++;
      }
    } else if (location && locState.quality === "generic-city" && !(prof.city || "").trim().length) {
      // only city exists; at least store the area in address
      patch.address = location;
      changes.push(`address: "${prof.address || ""}" → "${location}"`);
      updatedLocation++;
    }

    if (city && (prof.city || "").trim() && isJunkLocality(prof.city || "")) {
      patch.city = cityGroup(city);
      if (patch.city.toLowerCase() !== (prof.city || "").toLowerCase()) {
        changes.push(`city: "${prof.city}" → "${patch.city}"`);
        updatedCity++;
      } else {
        delete patch.city;
      }
    }

    if (subjects.length && !profileSubjectsReal(prof.subjects || [])) {
      patch.subjects = subjects;
      changes.push(`subjects: [${(prof.subjects || []).join(", ")}] → [${subjects.join(", ")}]`);
      updatedSubjects++;
    }

    if (grades.size > 0 && (prof.classLevels || []).length === 0) {
      patch.classLevels = gradesToClassLevels(grades);
      changes.push(`classLevels: [] → [${patch.classLevels.join(", ")}]`);
      updatedClasses++;
    }

    if (changes.length) {
      applied.push([t.id, t.name || "", digits, changes.join(" | "), sess ? "session+chat" : "chat"]);
      if (!DRY) {
        await prisma.tutorProfile.update({ where: { id: prof.id }, data: patch });
      }
    }

    // ── Post-sync classification for the two ask-blast files ──
    const finalLoc = patch.address ?? prof.address ?? "";
    const finalCity = patch.city ?? prof.city ?? "";
    const finalSubjects = patch.subjects ?? prof.subjects ?? [];
    const finalClasses = patch.classLevels ?? prof.classLevels ?? [];

    const locUsable = profileLocationUsable({ address: finalLoc, city: finalCity });
    const subjReal = profileSubjectsReal(finalSubjects);
    const classesReal = extractAllGrades(finalClasses.join(", ")).size > 0;

    if (!locUsable.usable) {
      needLocation.push([
        cityGroup(finalCity), isNcr(finalCity) ? "NCR" : "Non-NCR",
        t.name || "", digits, subjReal ? "yes" : "no", classesReal ? "yes" : "no",
        locUsable.quality === "generic-city" ? "generic-city-only" : "missing",
      ]);
    } else if (!subjReal || !classesReal) {
      needSubjects.push([
        t.name || "", digits, cityGroup(finalCity), finalLoc,
        subjReal ? "no" : "yes", classesReal ? "no" : "yes",
        (finalSubjects || []).join("; "), finalClasses.join(", "),
      ]);
    }
  }

  const esc = (v: string) => `"${String(v || "").replace(/"/g, '""')}"`;
  const { writeFileSync } = await import("fs");

  writeFileSync(
    "exports/wa_sync_updates_applied.csv",
    "\uFEFF" + [
      "userId,name,phone,changes,source",
      ...applied.map((r) => r.map(esc).join(",")),
    ].join("\n"),
    "utf8"
  );

  writeFileSync(
    "exports/need_location_from_tutors.csv",
    "\uFEFF" + [
      "cityGroup,ncrFlag,name,phone,hasSubjects,hasClasses,locationStatus,suggestedMessage",
      ...needLocation.map((r) =>
        [...r, r[6] === "missing"
          ? "Hi #NAME, ApnaTutorHub here. Please share your exact area/locality (e.g. Sector 50, Noida / Vikaspuri, Delhi) so we can send you nearby tuition enquiries."
          : "Hi #NAME, ApnaTutorHub here. Please share your exact area/locality (e.g. Sector 50, Noida / Vikaspuri, Delhi) so we can send you nearby tuition enquiries."
        ].map(esc).join(",")
      ),
    ].join("\n"),
    "utf8"
  );

  writeFileSync(
    "exports/need_subjects_classes.csv",
    "\uFEFF" + [
      "name,phone,city,locality,missingSubjects,missingClasses,currentSubjects,currentClasses,suggestedMessage",
      ...needSubjects.map((r) =>
        [...r, "Hi #NAME, ApnaTutorHub here. Please share the SUBJECTS and CLASSES (e.g. Maths & Science, Class 6-10) you teach so we can match you with the right tuition enquiries."
        ].map(esc).join(",")
      ),
    ].join("\n"),
    "utf8"
  );

  console.log(`\nTutors scanned:                       ${tutors.length}`);
  console.log(`Skipped (no usable unique phone):     ${noPhoneCount}`);
  console.log(`Profile updates ${DRY ? "would apply" : "applied"}:            ${applied.length}`);
  console.log(`  address updated:                    ${updatedLocation}`);
  console.log(`  city updated:                       ${updatedCity}`);
  console.log(`  subjects updated:                   ${updatedSubjects}`);
  console.log(`  classLevels updated:                ${updatedClasses}`);
  console.log(`\nFiles:`);
  console.log(`  exports/wa_sync_updates_applied.csv   (${applied.length} rows)`);
  console.log(`  exports/need_location_from_tutors.csv (${needLocation.length} rows)`);
  console.log(`  exports/need_subjects_classes.csv     (${needSubjects.length} rows)`);

  // city-group distribution of the location-ask list
  const grp = new Map<string, number>();
  for (const r of needLocation) grp.set(`${r[0]} (${r[1]})`, (grp.get(`${r[0]} (${r[1]})`) || 0) + 1);
  console.log("\n--- need_location by city group ---");
  [...grp.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)
    .forEach(([g, n]) => console.log(`${String(n).padStart(5)}  ${g}`));

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
