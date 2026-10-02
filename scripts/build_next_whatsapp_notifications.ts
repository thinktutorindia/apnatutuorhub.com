/**
 * Next WhatsApp batch after the 4,000 geo notifications already sent.
 * Reads the 26k consolidated file, keeps tutor rows with a location and subjects,
 * skips phones already in public/broadcast-preview.html, and writes the message
 * each remaining tutor would receive. Does not send anything.
 *
 *   npx tsx scripts/build_next_whatsapp_notifications.ts
 */
import * as fs from "fs";
import * as readline from "readline";
import { GEO_LOCALITIES } from "../lib/dummy-lead-engine";
import { resolveLocationCoordinates } from "../lib/geocoding";
import { haversineDistanceKm } from "../lib/haversine";
import { extractPublicLocality } from "../lib/lead-utils";

const SOURCE = "datauploadrawdata/MASTER_CONSOLIDATED_ALL_LEADS.csv";
const ALREADY_SENT = "public/broadcast-preview.html";
const OUT = "datauploadrawdata/next_whatsapp_notifications.csv";
const BATCH = 4000;
const INQUIRY_START = 42001;

const TIMINGS = [
  "Evening (4:30 PM to 6:30 PM)",
  "Evening (5:00 PM to 7:00 PM)",
  "Evening (5:30 PM to 7:30 PM)",
  "Late Afternoon (3:30 PM to 5:30 PM)",
  "Evening (6:00 PM to 8:00 PM)",
  "Weekend (10:00 AM to 1:00 PM)",
];

const CLIENT_NAMES = [
  "Mrs. Sharma",
  "Mr. Rajesh Verma",
  "Pooja Gupta",
  "Dr. Anita Sen",
  "Vikram Malhotra",
  "Suresh Mehra",
  "Sunita Rawat",
  "Ashok Singhal",
  "Ritu Batra",
  "Kavita Chauhan",
];

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10 && /^[6-9]/.test(digits)) return `91${digits}`;
  if (digits.length === 12 && /^91[6-9]\d{9}$/.test(digits)) return digits;
  if (digits.length === 11 && digits.startsWith("0") && /^[6-9]/.test(digits.slice(1))) {
    return `91${digits.slice(1)}`;
  }
  return null;
}

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function loadAlreadySentPhones(): Set<string> {
  const sent = new Set<string>();
  if (!fs.existsSync(ALREADY_SENT)) return sent;
  const html = fs.readFileSync(ALREADY_SENT, "utf8");
  for (const match of html.matchAll(/"rawPhone":"(\d+)"/g)) {
    const norm = normalizePhone(match[1]);
    if (norm) sent.add(norm);
  }
  for (const match of html.matchAll(/"phone":"\+?(\d+)"/g)) {
    const norm = normalizePhone(match[1]);
    if (norm) sent.add(norm);
  }
  return sent;
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => {
      if (/^[A-Z0-9]{2,4}$/.test(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ");
}

const LANDMARK = /\b(near|opp\.?|opposite|behind|beside|mandir|temple|sweet|sweets|metro|cinema|chowk|market|road|gali|house|flat|plot|block|tower|apartment|school|hospital|gurudwara|masjid|church|mall|outer ring)\b/i;
const CITY_ONLY = /^(delhi|new delhi|south delhi|north delhi|east delhi|west delhi|central delhi|noida|greater noida|noida extension|gurugram|gurgaon|ghaziabad|faridabad|old faridabad|mumbai|bangalore|bengaluru|hyderabad|pune|kolkata|chennai|jaipur|lucknow|india|ncr|delhi ncr|up|uttar pradesh|haryana|u\.?p\.?)$/i;

/** Colonies and sectors around city centroids that the shared list does not cover. */
const EXTRA_LOCALITIES: { name: string; city: string; lat: number; lng: number }[] = [
  { name: "Connaught Place", city: "Delhi", lat: 28.6315, lng: 77.2167 },
  { name: "Karol Bagh", city: "Delhi", lat: 28.6514, lng: 77.1907 },
  { name: "Paharganj", city: "Delhi", lat: 28.6415, lng: 77.216 },
  { name: "Jhandewalan", city: "Delhi", lat: 28.6441, lng: 77.2 },
  { name: "Rajendra Nagar", city: "Delhi", lat: 28.64, lng: 77.185 },
  { name: "Daryaganj", city: "Delhi", lat: 28.646, lng: 77.24 },
  { name: "Sector 93", city: "Noida", lat: 28.516, lng: 77.391 },
  { name: "Sector 104", city: "Noida", lat: 28.5412, lng: 77.365 },
  { name: "Sector 105", city: "Noida", lat: 28.53, lng: 77.366 },
  { name: "Sector 108", city: "Noida", lat: 28.5305, lng: 77.375 },
  { name: "Sector 137", city: "Noida", lat: 28.5084, lng: 77.41 },
  { name: "Sector 45", city: "Noida", lat: 28.5535, lng: 77.3485 },
  { name: "Sector 41", city: "Noida", lat: 28.563, lng: 77.36 },
  { name: "Alpha 1", city: "Greater Noida", lat: 28.478, lng: 77.515 },
  { name: "Beta 1", city: "Greater Noida", lat: 28.495, lng: 77.51 },
  { name: "Delta 1", city: "Greater Noida", lat: 28.462, lng: 77.512 },
  { name: "Knowledge Park", city: "Greater Noida", lat: 28.47, lng: 77.49 },
  { name: "Sector 14", city: "Gurugram", lat: 28.471, lng: 77.044 },
  { name: "Sector 4", city: "Gurugram", lat: 28.469, lng: 77.019 },
  { name: "Sector 7", city: "Gurugram", lat: 28.463, lng: 77.015 },
  { name: "Sector 10", city: "Gurugram", lat: 28.45, lng: 77.033 },
  { name: "Sector 31", city: "Gurugram", lat: 28.448, lng: 77.05 },
  { name: "Laxman Vihar", city: "Gurugram", lat: 28.474, lng: 77.012 },
  { name: "New Colony", city: "Gurugram", lat: 28.47, lng: 77.022 },
  { name: "Sector 15", city: "Faridabad", lat: 28.3955, lng: 77.314 },
  { name: "Sector 16", city: "Faridabad", lat: 28.401, lng: 77.308 },
  { name: "Sector 21B", city: "Faridabad", lat: 28.422, lng: 77.306 },
  { name: "Green Field", city: "Faridabad", lat: 28.418, lng: 77.325 },
  { name: "NIT Faridabad", city: "Faridabad", lat: 28.39, lng: 77.315 },
  { name: "Sector 9", city: "Faridabad", lat: 28.378, lng: 77.318 },
  { name: "Raj Nagar", city: "Ghaziabad", lat: 28.686, lng: 77.444 },
  { name: "Kavi Nagar", city: "Ghaziabad", lat: 28.67, lng: 77.43 },
  { name: "Shastri Nagar", city: "Ghaziabad", lat: 28.662, lng: 77.44 },
  { name: "Nehru Nagar", city: "Ghaziabad", lat: 28.655, lng: 77.44 },
  { name: "Govindpuram", city: "Ghaziabad", lat: 28.7, lng: 77.48 },
  { name: "Sector 49", city: "Gurugram", lat: 28.408, lng: 77.045 },
  { name: "Sector 50", city: "Gurugram", lat: 28.413, lng: 77.06 },
  { name: "Badshahpur", city: "Gurugram", lat: 28.392, lng: 77.048 },
  { name: "Defence Colony", city: "Delhi", lat: 28.573, lng: 77.229 },
  { name: "South Extension", city: "Delhi", lat: 28.5687, lng: 77.2207 },
  { name: "Andrews Ganj", city: "Delhi", lat: 28.566, lng: 77.227 },
  { name: "Green Park", city: "Delhi", lat: 28.559, lng: 77.206 },
  { name: "Safdarjung Enclave", city: "Delhi", lat: 28.564, lng: 77.19 },
];

function isCityOnly(value: string): boolean {
  const parts = value.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return true;
  return parts.every((part) => CITY_ONLY.test(part));
}

/** Colony or sector only. Drops "near mandir", chowk, market, and a bare city. */
function displayLocality(rawName: string, city: string): string | null {
  const hadLandmark = LANDMARK.test(rawName);
  let s = rawName.split("(")[0].replace(/\s+/g, " ").trim();
  s = s.replace(/\b(near|opp\.?|opposite|behind|beside)\b.*$/i, "").trim();
  const bits = s.split(",").map((p) => p.trim()).filter(Boolean);
  const colonyRe = /\b(vihar|nagar|enclave|colony|kunj|sector|pur|bagh|ganj|park|layout|phase|place|sarai|extension)\b/i;
  const colonyBit = bits.find((p) => colonyRe.test(p));
  s = (colonyBit || bits.find((p) => !LANDMARK.test(p)) || "").trim();
  s = s
    .replace(/\b(east|west|north|south)?\s*metro\b/gi, " ")
    .replace(/\b(main\s+)?(market|road|chowk|mall(\s+area)?|outer\s+ring|hospital(\s+area)?)\b/gi, " ")
    .replace(/\b(dda\s+flats|[a-z]-block|sector\s+[a-d])\b/gi, " ")
    .replace(/\s+/g, " ")
    .replace(/[,.\-]+$/g, "")
    .trim();
  if (hadLandmark && !colonyRe.test(s)) return null;
  if (!s || s.length < 4 || s.length > 36 || LANDMARK.test(s) || CITY_ONLY.test(s) || isCityOnly(s)) return null;
  if (/[?]|\d{6}/.test(s)) return null;
  const cityLabel = titleCase(city);
  if (/^(up|uttar pradesh|haryana|ncr|india)$/i.test(cityLabel)) return null;
  if (s.toLowerCase().includes(city.toLowerCase())) return titleCase(s);
  return `${titleCase(s)}, ${cityLabel}`;
}

function gradesTaught(raw: string): number[] {
  const grades = new Set<number>();
  const text = raw.toLowerCase();
  if (/nursery|lkg|ukg|\bkg\b|pre-?primary|primary/.test(text)) {
    for (let g = 1; g <= 5; g++) grades.add(g);
  }
  if (/\bmiddle\b/.test(text)) {
    for (let g = 6; g <= 8; g++) grades.add(g);
  }
  const rangeRe = /(\d{1,2})\s*(?:st|nd|rd|th)?\s*(?:to|-|–|—)\s*(?:class\s*)?(\d{1,2})/gi;
  let range: RegExpExecArray | null;
  while ((range = rangeRe.exec(raw))) {
    let a = parseInt(range[1], 10);
    let b = parseInt(range[2], 10);
    if (a > b) [a, b] = [b, a];
    if (a >= 1 && b <= 12) {
      for (let g = a; g <= b; g++) grades.add(g);
    }
  }
  for (const match of raw.matchAll(/\b(?:class\s*)?(\d{1,2})(?:st|nd|rd|th)?\b/gi)) {
    const n = parseInt(match[1], 10);
    if (n >= 1 && n <= 12) grades.add(n);
  }
  return [...grades].sort((a, b) => a - b);
}

type Canon =
  | "maths" | "science" | "physics" | "chemistry" | "biology"
  | "english" | "hindi" | "sst" | "accounts" | "economics" | "computer" | "all";

function canonSubjects(raw: string): Canon[] {
  const text = raw.toLowerCase();
  const found = new Set<Canon>();
  if (/all subject|all core|every subject/.test(text)) found.add("all");
  if (/math|maths|mathematic/.test(text)) found.add("maths");
  if (/physic/.test(text)) found.add("physics");
  if (/chem/.test(text)) found.add("chemistry");
  if (/bio/.test(text)) found.add("biology");
  if (/\bscience\b|\bevs\b/.test(text)) found.add("science");
  if (/english/.test(text)) found.add("english");
  if (/hindi/.test(text)) found.add("hindi");
  if (/social|s\.?s\.?t|history|geography|civics/.test(text)) found.add("sst");
  if (/account/.test(text)) found.add("accounts");
  if (/econom/.test(text)) found.add("economics");
  if (/computer|coding|program/.test(text)) found.add("computer");
  return [...found];
}

function buildClassAndSubjects(rawClasses: string, rawSubjects: string, seed: number): {
  classLevel: string;
  subjects: string[];
  monthly: boolean;
} | null {
  const grades = gradesTaught(rawClasses);
  const subs = canonSubjects(rawSubjects);
  const has = (key: Canon) => subs.includes(key);
  const senior = grades.filter((g) => g >= 11);
  const board = grades.filter((g) => g === 9 || g === 10);
  const junior = grades.filter((g) => g >= 1 && g <= 8);
  const seniorScience = (["physics", "chemistry", "biology"] as Canon[]).filter(has);
  const teachesSeniorOnly = junior.length === 0 && (senior.length > 0 || board.length > 0 || seniorScience.length > 0 || has("accounts"));

  if (seniorScience.length > 0 && (senior.length > 0 || teachesSeniorOnly)) {
    const grade = senior.length ? senior[seed % senior.length] : 11;
    const labels = seniorScience.map((key) =>
      key === "physics" ? "Physics" : key === "chemistry" ? "Chemistry" : "Biology"
    );
    if (has("maths") && labels.length < 2) labels.push("Mathematics");
    return { classLevel: `Class ${grade}`, subjects: labels.slice(0, 2), monthly: false };
  }

  if ((has("accounts") || has("economics")) && junior.length === 0) {
    const grade = senior.length ? senior[seed % senior.length] : 11;
    const labels: string[] = [];
    if (has("accounts")) labels.push("Accountancy");
    if (has("economics")) labels.push("Economics");
    if (has("maths") && labels.length < 2) labels.push("Mathematics");
    return { classLevel: `Class ${grade}`, subjects: labels.slice(0, 2), monthly: false };
  }

  if (junior.length === 0 && board.length > 0) {
    const grade = board[seed % board.length];
    if (has("sst") && !has("maths") && !has("science")) {
      return { classLevel: `Class ${grade}`, subjects: ["Social Science"], monthly: false };
    }
    if ((has("english") || has("hindi") || has("computer")) && !has("maths") && !has("science") && !has("all")) {
      const labels: string[] = [];
      if (has("english")) labels.push("English");
      if (has("hindi")) labels.push("Hindi");
      if (has("computer")) labels.push("Computer");
      return { classLevel: `Class ${grade}`, subjects: labels.slice(0, 2), monthly: false };
    }
    return { classLevel: `Class ${grade}`, subjects: ["Mathematics", "Science"], monthly: false };
  }

  if (junior.length > 0 || has("all") || !teachesSeniorOnly) {
    const pool = junior.length > 0 ? junior : [4, 5, 6, 7, 8];
    return { classLevel: `Class ${pool[seed % pool.length]}`, subjects: ["All Subjects"], monthly: true };
  }

  if (has("physics") || has("chemistry") || has("biology")) {
    return {
      classLevel: seed % 2 === 0 ? "Class 11" : "Class 12",
      subjects: seniorScience.length ? seniorScience.slice(0, 2).map((key) =>
        key === "physics" ? "Physics" : key === "chemistry" ? "Chemistry" : "Biology"
      ) : ["Physics"],
      monthly: false,
    };
  }

  if (has("maths") || has("science")) {
    return { classLevel: seed % 2 === 0 ? "Class 9" : "Class 10", subjects: ["Mathematics", "Science"], monthly: false };
  }

  return null;
}

const CITY_WORD_SOURCE = "new delhi|south west delhi|south delhi|north delhi|east delhi|west delhi|central delhi|greater noida|noida extension|delhi ncr|uttar pradesh|haryana|delhi|noida|gurugram|gurgaon|ghaziabad|faridabad|mumbai|bangalore|bengaluru|hyderabad|pune|kolkata|chennai|jaipur|lucknow|india|ncr|\\bup\\b";

/** Colonies missing from the shared city list, so a real area is not snapped to the city centre. */
const LOCAL_COORDS: Record<string, { lat: number; lng: number }> = {
  "south extension": { lat: 28.5687, lng: 77.2207 },
  "defence colony": { lat: 28.573, lng: 77.229 },
  "green park": { lat: 28.559, lng: 77.206 },
  "sarita vihar": { lat: 28.528, lng: 77.29 },
  "jasola": { lat: 28.541, lng: 77.29 },
  "sheikh sarai": { lat: 28.537, lng: 77.22 },
  "panchsheel park": { lat: 28.544, lng: 77.214 },
  "panchsheel": { lat: 28.544, lng: 77.214 },
  "safdarjung enclave": { lat: 28.564, lng: 77.19 },
  "safdarjung": { lat: 28.568, lng: 77.205 },
  "rk puram": { lat: 28.563, lng: 77.176 },
  "r k puram": { lat: 28.563, lng: 77.176 },
  "chittaranjan park": { lat: 28.538, lng: 77.249 },
  "cr park": { lat: 28.538, lng: 77.249 },
  "govindpuri": { lat: 28.535, lng: 77.264 },
  "khanpur": { lat: 28.512, lng: 77.234 },
  "madangir": { lat: 28.52, lng: 77.216 },
  "tigri": { lat: 28.508, lng: 77.24 },
  "ambedkar nagar": { lat: 28.526, lng: 77.238 },
  "east of kailash": { lat: 28.557, lng: 77.244 },
  "kailash colony": { lat: 28.553, lng: 77.242 },
  "alaknanda": { lat: 28.53, lng: 77.252 },
  "okhla": { lat: 28.535, lng: 77.275 },
  "sohna road": { lat: 28.4, lng: 77.055 },
  "sector 49": { lat: 28.408, lng: 77.045 },
  "sector 50": { lat: 28.413, lng: 77.06 },
  "badshahpur": { lat: 28.392, lng: 77.048 },
  "alpha 1": { lat: 28.478, lng: 77.515 },
  "alpha 2": { lat: 28.474, lng: 77.508 },
  "beta 1": { lat: 28.495, lng: 77.51 },
  "beta 2": { lat: 28.49, lng: 77.515 },
  "gamma 1": { lat: 28.468, lng: 77.498 },
  "delta 1": { lat: 28.462, lng: 77.512 },
  "knowledge park": { lat: 28.47, lng: 77.49 },
};

const LOCAL_COORD_KEYS = Object.keys(LOCAL_COORDS).sort((a, b) => b.length - a.length);

function lookupPlace(text: string): { lat: number; lng: number } | null {
  const clean = text.trim().toLowerCase().replace(/[,.\-]/g, " ").replace(/\s+/g, " ");
  if (!clean) return null;
  for (const key of LOCAL_COORD_KEYS) {
    if (clean.includes(key)) return LOCAL_COORDS[key];
  }
  return resolveLocationCoordinates(clean);
}

function coordsForTutor(rawLocation: string, fullAddress: string): { lat: number; lng: number } | null {
  const loc = rawLocation.trim();
  const specific = loc.replace(new RegExp(`\\b(${CITY_WORD_SOURCE})\\b`, "gi"), " ").replace(/[,.\-]/g, " ").replace(/\s+/g, " ").trim();
  if (specific.length >= 4 && !CITY_ONLY.test(specific) && !LANDMARK.test(specific)) {
    return lookupPlace(specific);
  }
  const fromCity = lookupPlace(loc);
  if (fromCity) return fromCity;
  const pub = extractPublicLocality(fullAddress);
  if (!pub) return null;
  const pubSpecific = pub.replace(new RegExp(`\\b(${CITY_WORD_SOURCE})\\b`, "gi"), " ").replace(/[,.\-]/g, " ").replace(/\s+/g, " ").trim();
  if (pubSpecific.length >= 4 && !CITY_ONLY.test(pubSpecific) && !LANDMARK.test(pubSpecific)) {
    return lookupPlace(pubSpecific);
  }
  return lookupPlace(pub);
}

function nearbyWithin5km(rawLocation: string, fullAddress: string, seed: number): { area: string; distanceKm: number } | null {
  const loc = rawLocation.trim();
  const pub = extractPublicLocality(loc) || extractPublicLocality(fullAddress);
  const coords = coordsForTutor(loc, fullAddress);
  if (!coords) return null;

  const ownKey = (pub || loc.split(",")[0] || "").toLowerCase();
  const tutorText = `${loc} ${pub || ""}`.toLowerCase();
  const tutorIsNcr = /noida|gurugram|gurgaon|faridabad|ghaziabad|delhi/.test(tutorText);

  const options = [...GEO_LOCALITIES, ...EXTRA_LOCALITIES]
    .map((place) => {
      const area = displayLocality(place.name, place.city);
      return {
        area: area || "",
        city: place.city.toLowerCase(),
        dist: Math.round(haversineDistanceKm(coords.lat, coords.lng, place.lat, place.lng) * 10) / 10,
      };
    })
    .filter((place) => {
      if (!place.area || place.dist < 0.8 || place.dist > 5) return false;
      if (LANDMARK.test(place.area) || isCityOnly(place.area)) return false;
      const farCity = /jaipur|lucknow|mumbai|bangalore|bengaluru|hyderabad|chennai|pune|kolkata/.test(place.city);
      if (tutorIsNcr && farCity) return false;
      return true;
    })
    .sort((a, b) => a.dist - b.dist);

  const different = options.filter((place) => !ownKey || ownKey.length < 4 || !place.area.toLowerCase().includes(ownKey));
  const pool = different.length > 0 ? different : options;
  if (pool.length === 0) return null;
  const picked = pool[seed % Math.min(pool.length, 3)];
  return { area: picked.area, distanceKm: picked.dist };
}

function budgetLabel(monthly: boolean, classLevel: string, seed: number): string {
  const grade = Number(classLevel.match(/\d{1,2}/)?.[0] || 0);
  const fmt = (n: number) => n.toLocaleString("en-IN");
  if (monthly || grade <= 8) {
    const bands = grade <= 5
      ? [[6200, 6350], [6400, 6550], [6600, 6750], [6700, 6850]]
      : [[7400, 7550], [7600, 7750], [7800, 7950], [8000, 8150]];
    const [min, max] = bands[seed % bands.length];
    return `₹${fmt(min)} – ₹${fmt(max)} / month`;
  }
  const bands = grade >= 11
    ? [[900, 950], [950, 1000], [1000, 1050], [1050, 1100]]
    : [[650, 700], [680, 730], [700, 750], [730, 780]];
  const [min, max] = bands[seed % bands.length];
  return `₹${fmt(min)} – ₹${fmt(max)} / hour`;
}

/** More days for full-subject junior classes, fewer days for senior subject classes. */
function daysPerWeek(classLevel: string, subjectCount: number): string {
  const grade = Number(classLevel.match(/\d{1,2}/)?.[0] || 0);
  if (grade <= 5) return "5 days a week";
  if (grade <= 8) return "6 days a week";
  if (grade <= 10) return subjectCount >= 2 ? "5 days a week" : "4 days a week";
  return subjectCount >= 2 ? "4 days a week" : "3 days a week";
}

function whatsappText(row: {
  inquiryCode: string;
  clientName: string;
  classLevel: string;
  subjects: string[];
  days: string;
  mode: string;
  area: string;
  distanceKm: number;
  budget: string;
  preference: string;
}): string {
  return [
    `[Tuition Enquiry #${row.inquiryCode}]`,
    `Client: ${row.clientName}`,
    `Class: ${row.classLevel} (${row.subjects.slice(0, 2).join(", ")})`,
    `Days: ${row.days}`,
    `Mode: ${row.mode}`,
    `Location: ${row.area} (${row.distanceKm} km)`,
    `Budget: ${row.budget}`,
    `Preference: ${row.preference}`,
    "",
    "View & Unlock: https://apnatutorhub.com/tutor/leads",
  ].join("\n");
}

async function main() {
  const alreadySent = loadAlreadySentPhones();
  console.log(`Already sent phones: ${alreadySent.size}`);

  const seen = new Set<string>(alreadySent);
  const out: string[] = [];
  let scannedTutors = 0;
  let withLocationAndSubject = 0;
  let skippedSent = 0;
  let skippedInvalidArea = 0;

  const rl = readline.createInterface({
    input: fs.createReadStream(SOURCE),
    crlfDelay: Infinity,
  });

  let header = true;
  for await (const line of rl) {
    if (out.length >= BATCH) break;
    if (!line.trim()) continue;
    if (header) {
      header = false;
      continue;
    }
    const cols = parseCSVLine(line);
    if ((cols[0] || "").trim().toUpperCase() !== "TUTOR") continue;
    scannedTutors++;

    const name = (cols[1] || "").trim() || "Tutor";
    const phone = normalizePhone(cols[2] || "");
    const rawLoc = (cols[5] || "").trim();
    const fullAddress = (cols[7] || "").trim();
    const rawSubjects = (cols[8] || "").trim();
    const rawClasses = (cols[9] || "").trim();

    if (!phone) continue;
    if ((!rawLoc || rawLoc.length < 3) && (!fullAddress || fullAddress.length < 3)) continue;
    if (!rawSubjects || rawSubjects.length < 2) continue;
    withLocationAndSubject++;

    if (seen.has(phone)) {
      skippedSent++;
      continue;
    }

    const seed = INQUIRY_START + out.length;
    const near = nearbyWithin5km(rawLoc, fullAddress, seed);
    if (!near || LANDMARK.test(near.area) || isCityOnly(near.area)) {
      skippedInvalidArea++;
      continue;
    }

    const lead = buildClassAndSubjects(rawClasses, rawSubjects, seed);
    if (!lead) continue;
    const { classLevel, subjects: leadSubjects, monthly } = lead;
    const mode = "Home Tuition (Offline)";
    const budget = budgetLabel(monthly, classLevel, seed);
    const days = daysPerWeek(classLevel, leadSubjects.length);
    const inquiryCode = String(seed);
    const clientName = CLIENT_NAMES[out.length % CLIENT_NAMES.length];
    const preference = "Any (Male or Female Tutor)";
    const message = whatsappText({
      inquiryCode,
      clientName,
      classLevel,
      subjects: leadSubjects,
      days,
      mode,
      area: near.area,
      distanceKm: near.distanceKm,
      budget,
      preference,
    });

    seen.add(phone);
    out.push(
      [
        String(out.length + 1),
        name,
        phone,
        csvCell(rawLoc || fullAddress),
        csvCell(near.area),
        String(near.distanceKm),
        classLevel,
        csvCell(leadSubjects.join(", ")),
        days,
        mode,
        csvCell(budget),
        csvCell(message),
      ].join(",")
    );
  }

  const headerRow = [
    "index",
    "tutorName",
    "phone",
    "tutorLocation",
    "nearbyArea",
    "distanceKm",
    "classLevel",
    "subjects",
    "daysPerWeek",
    "mode",
    "budget",
    "whatsappMessage",
  ].join(",");

  fs.writeFileSync(OUT, `${headerRow}\n${out.join("\n")}\n`, "utf8");

  console.log(`Tutor rows scanned: ${scannedTutors}`);
  console.log(`With location + subject: ${withLocationAndSubject}`);
  console.log(`Skipped because already in the 4k send: ${skippedSent}`);
  console.log(`Skipped because area was not a valid nearby locality: ${skippedInvalidArea}`);
  let junior = 0;
  let senior = 0;
  let badFee = 0;
  let badPlace = 0;
  let badSubject = 0;
  for (const row of out) {
    const cols = parseCSVLine(row);
    const grade = Number((cols[6] || "").match(/\d{1,2}/)?.[0] || 0);
    const subjects = cols[7] || "";
    const days = cols[8] || "";
    const budget = cols[10] || "";
    const area = cols[4] || "";
    if (LANDMARK.test(area) || isCityOnly(area)) badPlace++;
    const subjectCount = subjects.split(",").filter((s) => s.trim()).length;
    const expectedDays = daysPerWeek(cols[6] || "", subjectCount);
    if (days !== expectedDays) badSubject++;
    if (grade >= 1 && grade <= 8) {
      junior++;
      if (subjects !== "All Subjects" || !budget.includes("/ month")) badSubject++;
      const nums = [...budget.matchAll(/\d[\d,]*/g)].map((m) => Number(m[0].replace(/,/g, "")));
      if (nums.length === 2 && (nums[1] - nums[0] > 200 || nums[1] > 8200 || nums[0] < 6200)) badFee++;
    } else {
      senior++;
      if (!budget.includes("/ hour") || subjects === "All Subjects") badSubject++;
      const nums = [...budget.matchAll(/\d[\d,]*/g)].map((m) => Number(m[0].replace(/,/g, "")));
      if (nums.length === 2 && (nums[1] - nums[0] > 50 || nums[0] < 650 || nums[1] > 1100)) badFee++;
    }
  }
  console.log(`Class 1-8 rows: ${junior}`);
  console.log(`Class 9+ rows: ${senior}`);
  console.log(`Bad fee rows: ${badFee}`);
  console.log(`Bad subject rows: ${badSubject}`);
  console.log(`Landmark location rows: ${badPlace}`);
  console.log(`Next batch written: ${out.length}`);
  console.log(`File: ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
