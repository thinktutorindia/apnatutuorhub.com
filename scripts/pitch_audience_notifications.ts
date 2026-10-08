/**
 * Match 527 WhatsApp real-reply numbers + dashboard tutors to a nearby
 * relevant class (5 km, tight slightly-high fees) and optionally send WhatsApp.
 *
 *   npx tsx scripts/pitch_audience_notifications.ts
 *   npx tsx scripts/pitch_audience_notifications.ts --live
 */
import * as fs from "fs";
import * as path from "path";
import { PrismaClient } from "@prisma/client";
import { GEO_LOCALITIES } from "../lib/dummy-lead-engine";
import { resolveLocationCoordinates } from "../lib/geocoding";
import { haversineDistanceKm } from "../lib/haversine";
import {
  extractPublicLocality,
  formatLeadBudget,
  isTill8thClass,
  leadSubjectsForClass,
  normalizeCanonicalClassLevel,
  realisticTightBudget,
} from "../lib/lead-utils";
import { sanitizeSubjectsForClassLevel } from "../lib/dummy-campaign-types";
import { canonicalIndiaPhone, indiaPhoneLast10 } from "../lib/india-phone";
import { normalizeIndiaWhatsApp, sendAquaWhatsAppMessage } from "../lib/aqua-whatsapp";
import { isClassCompatible, isSubjectCompatible } from "../lib/whatsapp-bot/leads-helper";

try {
  const localEnv = fs.readFileSync(".env.local", "utf8");
  for (const line of localEnv.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [k, ...rest] = trimmed.split("=");
    const key = k.trim();
    if (!key || process.env[key]) continue;
    process.env[key] = rest.join("=").replace(/^["']|["']$/g, "").trim();
  }
} catch {}

const prisma = new PrismaClient();
const LIVE = process.argv.includes("--live");
const FORCE = process.argv.includes("--force");
const OUT_DIR = path.join(process.cwd(), "datauploadrawdata");
const XLS = path.join(OUT_DIR, "tutor_pitch_notifications.xls");
const CSV = path.join(OUT_DIR, "tutor_pitch_notifications.csv");
const XLS_ALL = path.join(OUT_DIR, "tutor_pitch_all.xls");
const CSV_ALL = path.join(OUT_DIR, "tutor_pitch_all.csv");
const XLS_CITY = path.join(OUT_DIR, "tutor_pitch_city_batch.xls");
const CSV_CITY = path.join(OUT_DIR, "tutor_pitch_city_batch.csv");
const LOG = path.join(OUT_DIR, "tutor_pitch_send_log.jsonl");
const INQUIRY_START = 54001;
const CITY_INQUIRY_START = 55001;
const RADIUS_KM = 5;

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

const LANDMARK =
  /\b(near|opp\.?|opposite|behind|beside|mandir|temple|sweet|sweets|metro|cinema|chowk|market|road|gali|house|flat|plot|block|tower|apartment|school|hospital|gurudwara|masjid|church|mall|outer ring)\b/i;
const CITY_ONLY =
  /^(delhi|new delhi|south delhi|north delhi|east delhi|west delhi|central delhi|noida|greater noida|noida extension|gurugram|gurgaon|ghaziabad|faridabad|mumbai|bangalore|bengaluru|hyderabad|pune|kolkata|chennai|jaipur|lucknow|india|ncr|delhi ncr)$/i;

function last10(phone: string | null | undefined): string | null {
  if (!phone) return null;
  return indiaPhoneLast10(phone) ?? canonicalIndiaPhone(phone)?.slice(-10) ?? null;
}

function isStop(text: string): boolean {
  const t = text.trim();
  return (
    /^(?:stop|unsubscribe|unsub|opt\s*out)$/i.test(t) ||
    /\b(?:unsubscribe|unsub|opt\s*out|stop\s*messages?|stop\s*messaging|dont\s*message|don't\s*message|mat\s*bhejo|msg\s*mat\s*karo|alerts?\s*band)\b/i.test(t)
  );
}

function isNotInterested(text: string): boolean {
  const t = text.trim();
  return (
    /^(?:not\s*int[e]?rested|no\s*thanks?|no|nahi|nahin|na)$/i.test(t) ||
    /\b(?:not\s*int[e]?rested|nahi\s*chahiye|nahin\s*chahiye|don't\s*want|dont\s*want|no\s*need|no\s*thanks?|mujhe\s*nahi)\b/i.test(t)
  );
}

function xmlEsc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function cleanParam(value: string): string {
  return value.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
}

function budgetLabel(classLevel: string, seed: number): string {
  const lead = { id: `pitch-${seed}`, inquiryNumber: seed, classLevel };
  const tight = realisticTightBudget(lead);
  return formatLeadBudget(
    {
      ...lead,
      budgetMin: tight?.min,
      budgetMax: tight?.max,
    },
    "full"
  );
}

function daysPerWeek(classLevel: string, subjectCount: number): string {
  const grade = Number(classLevel.match(/\d{1,2}/)?.[0] || 0);
  if (grade <= 5) return "5 days a week";
  if (grade <= 8) return "6 days a week";
  if (grade <= 10) return subjectCount >= 2 ? "5 days a week" : "4 days a week";
  return subjectCount >= 2 ? "4 days a week" : "3 days a week";
}

function pickClass(classLevels: string[], subjects: string[], seed: number): string {
  const grades = new Set<number>();
  for (const raw of classLevels) {
    const n = normalizeCanonicalClassLevel(raw);
    const g = Number((n || raw).match(/\d{1,2}/)?.[0] || 0);
    if (g >= 1 && g <= 12) grades.add(g);
    const range = raw.match(/(\d{1,2})\s*(?:to|-|–)\s*(\d{1,2})/i);
    if (range) {
      const a = Number(range[1]);
      const b = Number(range[2]);
      for (let i = Math.min(a, b); i <= Math.max(a, b); i++) {
        if (i >= 1 && i <= 12) grades.add(i);
      }
    }
  }
  const list = [...grades].sort((a, b) => a - b);
  if (list.length > 0) return `Class ${list[seed % list.length]}`;
  const blob = subjects.join(" ");
  if (/jee|neet|physics|chemistry|biology|account|commerce|class\s*1[12]/i.test(blob)) return "Class 11";
  if (/class\s*9|class\s*10/.test(blob)) return "Class 9";
  return "Class 7";
}

function pickSubjects(tutorSubjects: string[], classLevel: string, seed: number): string[] {
  if (isTill8thClass(classLevel)) return ["All Subjects"];
  const sanitized = sanitizeSubjectsForClassLevel(tutorSubjects || [], classLevel, seed);
  if (sanitized.length === 0) return leadSubjectsForClass(classLevel, ["Mathematics"]);
  return leadSubjectsForClass(classLevel, sanitized.slice(0, 2));
}

function cityPool(city: string) {
  const cityKey = (city || "Delhi").toLowerCase();
  const aliases: Record<string, string[]> = {
    delhi: ["delhi", "new delhi"],
    "new delhi": ["delhi", "new delhi"],
    gurgaon: ["gurugram", "gurgaon"],
    gurugram: ["gurugram", "gurgaon"],
    noida: ["noida", "greater noida"],
  };
  const keys = aliases[cityKey] || [cityKey];
  return GEO_LOCALITIES.filter((p) => keys.includes(p.city.toLowerCase()));
}

function cleanAreaName(raw: string, city: string): string | null {
  const stripped = raw.replace(/\s*\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  const area = extractPublicLocality(stripped, city) || stripped;
  const cleaned = area
    .replace(/\b(east metro|metro|hospital area|hospital|outer ring|main market|main road|market|chowk)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned || cleaned.length < 3) return null;
  if (LANDMARK.test(cleaned) || CITY_ONLY.test(cleaned)) return null;
  return cleaned;
}

function shownCityDistance(seed: number, actual?: number): number {
  if (actual != null && actual >= 0.6 && actual <= RADIUS_KM) {
    return Math.round(actual * 10) / 10;
  }
  return Math.round((1.2 + ((seed * 7) % 35) / 10) * 10) / 10;
}

function cityFallbackNearby(
  lat: number | undefined,
  lng: number | undefined,
  city: string,
  seed: number
): { area: string; city: string; distanceKm: number } {
  const sameCity = cityPool(city);
  const pool = sameCity.length > 0 ? sameCity : cityPool("Delhi").length > 0 ? cityPool("Delhi") : GEO_LOCALITIES;
  const options = pool
    .map((place) => {
      const area = cleanAreaName(place.name, place.city);
      return area
        ? {
            area,
            city: place.city,
            lat: place.lat,
            lng: place.lng,
          }
        : null;
    })
    .filter((p): p is { area: string; city: string; lat: number; lng: number } => !!p);

  if (lat != null && lng != null && options.length > 0) {
    const scored = options
      .map((place) => ({
        ...place,
        dist: Math.round(haversineDistanceKm(lat, lng, place.lat, place.lng) * 10) / 10,
      }))
      .sort((a, b) => a.dist - b.dist);
    const within = scored.filter((p) => p.dist >= 0.6 && p.dist <= RADIUS_KM);
    const pickFrom = within.length > 0 ? within.slice(0, 8) : scored.slice(0, 8);
    const picked = pickFrom[seed % pickFrom.length];
    return {
      area: picked.area,
      city: picked.city,
      distanceKm: shownCityDistance(seed, picked.dist),
    };
  }

  const picked = options[seed % Math.max(options.length, 1)] || {
    area: "Janakpuri",
    city: "Delhi",
  };
  return { area: picked.area, city: picked.city, distanceKm: shownCityDistance(seed) };
}

function nearbyWithin5km(
  lat: number,
  lng: number,
  city: string,
  ownArea: string,
  seed: number
): { area: string; city: string; distanceKm: number } | null {
  const own = (ownArea || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const cityKey = (city || "").toLowerCase();
  const options = GEO_LOCALITIES.map((place) => ({
    area: extractPublicLocality(place.name, place.city) || place.name,
    city: place.city,
    dist: Math.round(haversineDistanceKm(lat, lng, place.lat, place.lng) * 10) / 10,
  }))
    .filter((place) => {
      if (place.dist < 0.6 || place.dist > RADIUS_KM) return false;
      if (LANDMARK.test(place.area) || CITY_ONLY.test(place.area.trim())) return false;
      if (own && own.length >= 4 && place.area.toLowerCase().includes(own.slice(0, 8))) return false;
      return true;
    })
    .sort((a, b) => a.dist - b.dist);

  const sameCity = options.filter((p) => !cityKey || p.city.toLowerCase() === cityKey);
  const pool = (sameCity.length >= 2 ? sameCity : options).slice(0, 6);
  if (pool.length > 0) {
    const picked = pool[seed % pool.length];
    return { area: picked.area, city: picked.city, distanceKm: picked.dist };
  }

  const fallback = cityPool(city)
    .map((place) => ({
      area: extractPublicLocality(place.name, place.city) || place.name,
      city: place.city,
      dist: Math.round(haversineDistanceKm(lat, lng, place.lat, place.lng) * 10) / 10,
    }))
    .filter((place) => !LANDMARK.test(place.area) && !CITY_ONLY.test(place.area.trim()))
    .sort((a, b) => a.dist - b.dist);
  if (fallback.length === 0) return null;
  const closest = fallback.filter((p) => p.dist >= 0.6 && p.dist <= RADIUS_KM).slice(0, 8);
  if (closest.length === 0) return null;
  const picked = closest[seed % closest.length];
  return { area: picked.area, city: picked.city, distanceKm: picked.dist };
}

type Row = {
  phone: string;
  name: string;
  source: string;
  tutorLocation: string;
  nearbyArea: string;
  distanceKm: number;
  classLevel: string;
  subjects: string;
  days: string;
  mode: string;
  budget: string;
  inquiryCode: string;
  clientName: string;
  classLine: string;
  locationLine: string;
  message: string;
  userId?: string;
  matchBand: "5km" | "city";
};

function alreadySent(): Set<string> {
  const sent = new Set<string>();
  if (!fs.existsSync(LOG)) return sent;
  for (const line of fs.readFileSync(LOG, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const row = JSON.parse(line) as { phone?: string; ok?: boolean };
      if (row.ok && row.phone) sent.add(row.phone);
    } catch {}
  }
  return sent;
}

function rowCells(r: Row, i: number): string[] {
  return [
    String(i + 1),
    r.name,
    r.phone,
    r.source,
    r.matchBand,
    r.tutorLocation,
    r.nearbyArea,
    String(r.distanceKm),
    r.classLevel,
    r.subjects,
    r.days,
    r.mode,
    r.budget,
    r.inquiryCode,
    r.message,
  ];
}

function toCsv(rows: Row[]): string {
  const headers = [
    "index",
    "tutorName",
    "phone",
    "source",
    "matchBand",
    "tutorLocation",
    "nearbyArea",
    "distanceKm",
    "classLevel",
    "subjects",
    "daysPerWeek",
    "mode",
    "budget",
    "inquiryCode",
    "whatsappMessage",
  ];
  return [
    headers.join(","),
    ...rows.map((r, i) => rowCells(r, i).map((v, idx) => (idx === 0 || idx === 2 || idx === 7 || idx === 13 ? v : csvCell(v))).join(",")),
  ].join("\n");
}

function sheetXml(name: string, rows: Row[]): string {
  const headers = [
    "index",
    "tutorName",
    "phone",
    "source",
    "matchBand",
    "tutorLocation",
    "nearbyArea",
    "distanceKm",
    "classLevel",
    "subjects",
    "daysPerWeek",
    "mode",
    "budget",
    "inquiryCode",
    "whatsappMessage",
  ];
  const cell = (v: string) => `<Cell><Data ss:Type="String">${xmlEsc(v)}</Data></Cell>`;
  const xmlRows = [
    `<Row>${headers.map((h) => cell(h)).join("")}</Row>`,
    ...rows.map((r, i) => `<Row>${rowCells(r, i).map(cell).join("")}</Row>`),
  ].join("\n");
  return `<Worksheet ss:Name="${xmlEsc(name)}">
<Table>
${xmlRows}
</Table>
</Worksheet>`;
}

function writeWorkbook(filePath: string, sheets: Array<{ name: string; rows: Row[] }>) {
  const xls = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
${sheets.map((s) => sheetXml(s.name, s.rows)).join("\n")}
</Workbook>`;
  fs.writeFileSync(filePath, xls, "utf8");
}

function writeExcel(rows: Row[]) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const km5 = rows.filter((r) => r.matchBand === "5km");
  const city = rows.filter((r) => r.matchBand === "city");
  fs.writeFileSync(CSV, `${toCsv(km5)}\n`, "utf8");
  fs.writeFileSync(CSV_ALL, `${toCsv(rows)}\n`, "utf8");
  fs.writeFileSync(CSV_CITY, `${toCsv(city)}\n`, "utf8");
  writeWorkbook(XLS, [
    { name: "5km Verified", rows: km5 },
    { name: "City Batch", rows: city },
    { name: "All Tutors", rows },
  ]);
  writeWorkbook(XLS_ALL, [
    { name: "All Tutors", rows },
    { name: "5km Verified", rows: km5 },
    { name: "City Batch", rows: city },
  ]);
  writeWorkbook(XLS_CITY, [{ name: "City Batch", rows: city }]);
}

async function main() {
  const [inbound, tutors, sessions, leads] = await Promise.all([
    prisma.whatsappChatMessage.findMany({
      where: { direction: "INBOUND" },
      select: { phone: true, body: true },
    }),
    prisma.user.findMany({
      where: { role: "TUTOR", isActive: true, tutorProfile: { isNot: null } },
      select: {
        id: true,
        name: true,
        phone: true,
        tutorProfile: {
          select: {
            city: true,
            address: true,
            latitude: true,
            longitude: true,
            subjects: true,
            classLevels: true,
            marketingNotifsEnabled: true,
          },
        },
      },
    }),
    prisma.whatsappSession.findMany({
      select: { phone: true, userType: true, data: true },
    }),
    prisma.lead.findMany({
      where: { status: { in: ["ACTIVE", "MATCHING"] } },
      select: {
        id: true,
        inquiryNumber: true,
        classLevel: true,
        subjects: true,
        mode: true,
        area: true,
        city: true,
        latitude: true,
        longitude: true,
        timingPreference: true,
        tutorGenderPref: true,
        parentProfile: { select: { user: { select: { name: true } } } },
      },
    }),
  ]);

  const people = new Map<string, { real: number; skip: number }>();
  for (const msg of inbound) {
    const k = last10(msg.phone);
    if (!k) continue;
    const text = (msg.body || "").trim();
    if (!text) continue;
    const row = people.get(k) ?? { real: 0, skip: 0 };
    if (isStop(text) || isNotInterested(text)) row.skip += 1;
    else row.real += 1;
    people.set(k, row);
  }
  const areaGuess = new Map<string, string>();
  for (const msg of inbound) {
    const k = last10(msg.phone);
    if (!k) continue;
    const loc = extractPublicLocality(msg.body || "");
    if (loc && !CITY_ONLY.test(loc.trim()) && !LANDMARK.test(loc)) areaGuess.set(k, loc);
  }

  const waReal = new Set([...people.entries()].filter(([, b]) => b.real > 0).map(([k]) => k));
  const skipOnly = new Set(
    [...people.entries()].filter(([, b]) => b.real === 0 && b.skip > 0).map(([k]) => k)
  );

  type Person = {
    key: string;
    phone: string;
    name: string;
    source: string;
    userId?: string;
    lat?: number;
    lng?: number;
    city: string;
    area: string;
    subjects: string[];
    classLevels: string[];
  };

  const audience = new Map<string, Person>();

  for (const t of tutors) {
    const k = last10(t.phone);
    if (!k || skipOnly.has(k)) continue;
    if (t.tutorProfile?.marketingNotifsEnabled === false) continue;
    const phone = normalizeIndiaWhatsApp(t.phone || "") || `91${k}`;
    const guessed = areaGuess.get(k) || "";
    const area = t.tutorProfile?.address || guessed || t.tutorProfile?.city || "";
    audience.set(k, {
      key: k,
      phone,
      name: t.name?.trim() || "Tutor",
      source: waReal.has(k) ? "WhatsApp + Dashboard" : "Dashboard",
      userId: t.id,
      lat: t.tutorProfile?.latitude ?? undefined,
      lng: t.tutorProfile?.longitude ?? undefined,
      city: t.tutorProfile?.city || "Delhi",
      area,
      subjects: t.tutorProfile?.subjects || [],
      classLevels: t.tutorProfile?.classLevels || [],
    });
  }

  for (const s of sessions) {
    const k = last10(s.phone);
    if (!k || skipOnly.has(k) || !waReal.has(k)) continue;
    const data = (s.data || {}) as Record<string, unknown>;
    if (data.unsubscribed === true) continue;
    const existing = audience.get(k);
    const area = (typeof data.area === "string" && data.area) || areaGuess.get(k) || "";
    const city = typeof data.city === "string" ? data.city : existing?.city || "Delhi";
    const subjects = Array.isArray(data.subjects) ? data.subjects.map(String) : existing?.subjects || [];
    const classLevels = [
      ...(Array.isArray(data.classLevels) ? data.classLevels.map(String) : []),
      ...(typeof data.classLevel === "string" ? [data.classLevel] : []),
    ];
    if (existing) {
      if (!existing.area && area) existing.area = area;
      if (!existing.city && city) existing.city = city;
      if (existing.subjects.length === 0 && subjects.length) existing.subjects = subjects;
      if (existing.classLevels.length === 0 && classLevels.length) existing.classLevels = classLevels;
      continue;
    }
    audience.set(k, {
      key: k,
      phone: normalizeIndiaWhatsApp(s.phone) || `91${k}`,
      name: typeof data.name === "string" && data.name.trim() ? data.name.trim() : "Tutor",
      source: "WhatsApp",
      city,
      area: area || city,
      subjects,
      classLevels,
    });
  }

  for (const k of waReal) {
    if (audience.has(k) || skipOnly.has(k)) continue;
    audience.set(k, {
      key: k,
      phone: `91${k}`,
      name: "Tutor",
      source: "WhatsApp",
      city: "Delhi",
      area: areaGuess.get(k) || "",
      subjects: [],
      classLevels: [],
    });
  }

  const rows: Row[] = [];
  let cityMatches = 0;
  let realMatches = 0;
  let dummyMatches = 0;

  const list = [...audience.values()];
  for (let i = 0; i < list.length; i++) {
    const person = list[i];
    let lat = person.lat;
    let lng = person.lng;
    if (lat == null || lng == null) {
      for (const place of [person.area, `${person.area} ${person.city}`, person.city]) {
        if (!place) continue;
        const coords = resolveLocationCoordinates(place);
        if (coords) {
          lat = coords.lat;
          lng = coords.lng;
          break;
        }
      }
    }
    const seedBase = lat == null || lng == null ? CITY_INQUIRY_START : INQUIRY_START;
    const seed = seedBase + rows.length;
    let classLevel = pickClass(person.classLevels, person.subjects, seed);
    let subjects = pickSubjects(person.subjects, classLevel, seed);
    const tutorClassBlob = person.classLevels.join(", ") || classLevel;
    const clientName = CLIENT_NAMES[rows.length % CLIENT_NAMES.length];
    const preference = "Any (Male or Female Tutor)";

    let nearby: { area: string; city: string; distanceKm: number } | null = null;
    let inquiryCode = String(seed);
    let usedReal = false;
    let budget = budgetLabel(classLevel, seed);

    let matchBand: "5km" | "city" = "5km";

    const applyLead = (lead: (typeof leads)[0], dist: number, band: "5km" | "city") => {
      const area = extractPublicLocality(
        [lead.area, lead.city].filter(Boolean).join(", "),
        person.city
      );
      if (!area || LANDMARK.test(area) || CITY_ONLY.test(area)) return false;
      nearby = {
        area,
        city: lead.city || person.city,
        distanceKm: band === "5km" ? Math.round(dist * 10) / 10 : shownCityDistance(seed, dist),
      };
      classLevel = normalizeCanonicalClassLevel(lead.classLevel) || classLevel;
      subjects = leadSubjectsForClass(classLevel, lead.subjects);
      budget = formatLeadBudget(
        {
          id: lead.id,
          inquiryNumber: lead.inquiryNumber,
          classLevel,
        },
        "full"
      );
      inquiryCode = String(lead.inquiryNumber || seed);
      usedReal = true;
      matchBand = band;
      return true;
    };

    const leadFits = (lead: (typeof leads)[0]) => {
      if (isTill8thClass(lead.classLevel) && lead.mode === "ONLINE") return false;
      if (!isClassCompatible(tutorClassBlob, lead.classLevel || "")) return false;
      if (
        !isTill8thClass(lead.classLevel) &&
        !isSubjectCompatible(person.subjects, lead.subjects || [], tutorClassBlob, lead.classLevel)
      ) {
        return false;
      }
      return true;
    };

    if (lat != null && lng != null) {
      const candidates: Array<{ lead: (typeof leads)[0]; dist: number }> = [];
      for (const lead of leads) {
        if (lead.latitude == null || lead.longitude == null) continue;
        const dist = haversineDistanceKm(lat, lng, lead.latitude, lead.longitude);
        if (dist < 0.3 || dist > RADIUS_KM) continue;
        if (!leadFits(lead)) continue;
        candidates.push({ lead, dist });
      }
      candidates.sort((a, b) => a.dist - b.dist);
      if (candidates[0]) applyLead(candidates[0].lead, candidates[0].dist, "5km");
      if (!nearby) nearby = nearbyWithin5km(lat, lng, person.city, person.area, seed);
    }

    if (!nearby) {
      matchBand = "city";
      const cityKey = (person.city || "Delhi").toLowerCase();
      const cityHits: Array<{ lead: (typeof leads)[0]; dist: number }> = [];
      for (const lead of leads) {
        if (!leadFits(lead)) continue;
        const leadCity = (lead.city || "").toLowerCase();
        if (!leadCity || (!leadCity.includes(cityKey) && !cityKey.includes(leadCity))) continue;
        const dist =
          lat != null && lng != null && lead.latitude != null && lead.longitude != null
            ? haversineDistanceKm(lat, lng, lead.latitude, lead.longitude)
            : shownCityDistance(seed);
        cityHits.push({ lead, dist });
      }
      cityHits.sort((a, b) => a.dist - b.dist);
      if (cityHits[0]) applyLead(cityHits[0].lead, cityHits[0].dist, "city");
      if (!nearby) nearby = cityFallbackNearby(lat, lng, person.city || "Delhi", seed);
      cityMatches++;
    }

    if (usedReal) realMatches++;
    else dummyMatches++;

    if (!nearby) continue;

    const mode = "Home Tuition (Offline)";
    const days = daysPerWeek(classLevel, subjects.length);
    const classLine = cleanParam(`${classLevel} (${subjects.join(", ")}), ${days}`);
    const locationLine = cleanParam(`${nearby.area} (${nearby.distanceKm} km)`);
    const message = [
      `[Tuition Enquiry #${inquiryCode}]`,
      `Client: ${clientName}`,
      `Class: ${classLine}`,
      `Mode: ${mode}`,
      `Location: ${locationLine}`,
      `Budget: ${budget}`,
      `Preference: ${preference}`,
      "",
      "View & Unlock: https://apnatutorhub.com/tutor/leads",
    ].join("\n");

    rows.push({
      phone: person.phone,
      name: person.name,
      source: person.source,
      tutorLocation: person.area || person.city,
      nearbyArea: nearby.area,
      distanceKm: nearby.distanceKm,
      classLevel,
      subjects: subjects.join(", "),
      days,
      mode,
      budget,
      inquiryCode,
      clientName,
      classLine,
      locationLine,
      message,
      userId: person.userId,
      matchBand,
    });
  }

  writeExcel(rows);

  let junior = 0;
  let senior = 0;
  let badFee = 0;
  let badPlace = 0;
  let over5 = 0;
  for (const r of rows) {
    const grade = Number(r.classLevel.match(/\d{1,2}/)?.[0] || 0);
    const nums = [...r.budget.matchAll(/\d[\d,]*/g)].map((m) => Number(m[0].replace(/,/g, "")));
    if (LANDMARK.test(r.nearbyArea) || CITY_ONLY.test(r.nearbyArea)) badPlace++;
    if (r.matchBand === "5km" && r.distanceKm > RADIUS_KM) over5++;
    const monthly = /month/i.test(r.budget);
    const hourly = /hour/i.test(r.budget);
    if (grade <= 8) {
      junior++;
      if (!monthly || hourly || nums[0] < 4500 || nums[nums.length - 1] > 6000) badFee++;
    } else {
      senior++;
      if (!hourly || monthly || nums[0] < 450 || nums[nums.length - 1] > 900) badFee++;
    }
  }

  console.log(JSON.stringify({
    audienceBuilt: audience.size,
    matchedRows: rows.length,
    km5Rows: rows.filter((r) => r.matchBand === "5km").length,
    cityRows: rows.filter((r) => r.matchBand === "city").length,
    cityFallbackUsed: cityMatches,
    realLeadMatches: realMatches,
    nearbyFallbackMatches: dummyMatches,
    class1to8: junior,
    class9plus: senior,
    badFeeRows: badFee,
    badPlaceRows: badPlace,
    over5kmRows: over5,
    excelAll: XLS_ALL,
    excelCity: XLS_CITY,
    excel: XLS,
    csvAll: CSV_ALL,
    live: LIVE,
  }, null, 2));

  if (!LIVE) {
    console.log("Dry run only. Re-run with --live to send WhatsApp.");
    await prisma.$disconnect();
    return;
  }

  const fiveKmPhones = new Set(rows.filter((r) => r.matchBand === "5km").map((r) => r.phone));
  const pending = rows.filter((r) => r.matchBand === "city" && !fiveKmPhones.has(r.phone));
  console.log(`To send now: ${pending.length} (city batch; skipped ${fiveKmPhones.size} already-sent 5km)`);

  let sent = 0;
  let failed = 0;
  const log = fs.createWriteStream(LOG, { flags: "a" });

  for (let i = 0; i < pending.length; i++) {
    const row = pending[i];
    const res = await sendAquaWhatsAppMessage({
      to: row.phone,
      mode: "template",
      templateId: "tuition_enquiry_direct",
      placeholders: [
        row.inquiryCode,
        row.clientName,
        row.classLine,
        row.mode,
        row.locationLine,
        row.budget,
        "Any (Male or Female Tutor)",
      ],
      bypassDailyCap: true,
    });

    if (res.ok) {
      sent++;
      prisma.whatsappChatMessage
        .create({
          data: {
            phone: row.phone,
            direction: "OUTBOUND",
            senderName: "System Broadcast",
            body: row.message,
            step: "BROADCAST_LEAD",
            messageId: res.providerMessageId || null,
            isRead: true,
          },
        })
        .catch(() => {});
      if (row.userId) {
        prisma.notification
          .create({
            data: {
              userId: row.userId,
              type: "LEAD_MATCHED",
              priority: "HIGH",
              channel: "WEB",
              title: `New tuition nearby in ${row.nearbyArea}`,
              message: `${row.classLine}. Budget: ${row.budget}.`,
              actionUrl: "/tutor/leads",
            },
          })
          .catch(() => {});
      }
    } else {
      failed++;
      if (failed <= 5 || failed % 25 === 0) {
        console.log(`Fail ${row.phone}: ${res.error || res.rawStatus}`);
      }
    }

    log.write(
      `${JSON.stringify({
        phone: row.phone,
        ok: res.ok,
        id: res.providerMessageId || null,
        error: res.ok ? undefined : res.error,
      })}\n`
    );

    if (i < 8 && !res.ok && failed === i + 1) {
      console.log("Stopping: first messages were all rejected.");
      break;
    }
    if ((i + 1) % 50 === 0 || i === pending.length - 1) {
      console.log(`Progress: ${i + 1}/${pending.length} (${sent} sent, ${failed} failed)`);
    }
    await new Promise((r) => setTimeout(r, 180));
  }

  log.end();
  console.log(`Done. Sent ${sent}, failed ${failed}.`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
