/**
 * Export ALL tutors to CSV — full data + location (READ-ONLY, no DB changes).
 * Run: npx tsx --env-file=.env scripts/export_tutors_full_csv.ts
 * Out: exports/tutors_full_data.csv
 */
import * as fs from "fs";
import { PrismaClient } from "@prisma/client";
import { isJunkLocality } from "../lib/whatsapp-bot/leads-helper";
import { stripAddressJunk } from "../lib/format-rich-nearby-location";
import { resolveLocationCoordinates } from "../lib/geocoding";

const prisma = new PrismaClient();

const NCR_CITY_RE = /\b(new delhi|delhi|noida|greater noida|gurgaon|gurugram|ghaziabad|faridabad|loni)\b/i;

function cleanDisplayPhone(phone: string | null | undefined): string {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

function isJunkLocalityText(loc: string, tutorName?: string): boolean {
  const l = (loc || "").toLowerCase().trim();
  if (!l || l.length < 3) return true;
  if (/^(noted|sorry|nhi|nahi|nothing|none|pending|mention it|not mentioned|na|no|yes|ok|okay|hk|thik|theek|wait|later|soon|skip)\b/.test(l)) return true;
  if (/location at|current location|my location|coordinates/.test(l)) return true;
  if (/\d{1,3}\.\d{3,}.*\d{1,3}\.\d{3,}/.test(l)) return true;
  if (/^(north|south|east|west)\s*(,|\band\b|\.)?\s*(and)?\s*,?\s*\.?$/.test(l)) return true;
  if (/\b(mathematics|maths|physics|chemistry|science|biology|iit|jee|neet|online)\b/.test(l)) return true;
  if (/\b\d+\s*km\b|from\s+border|anything\s+else|^outside$/.test(l)) return true;
  if (/\balpha\b|\bbeta\b/.test(l)) return true;
  if (tutorName && l === tutorName.toLowerCase().trim()) return true;
  return false;
}

function isGenericLocationText(text: string): boolean {
  const t = (text || "").toLowerCase();
  if (!t.trim()) return true;
  const stripped = t
    .replace(/\b(north|south|east|west|new|old|upper|lower)\b/g, "")
    .replace(/\b(delhi|delhi\s*ncr|ncr|noida|greater\s+noida|gurgaon|gurugram|ghaziabad|faridabad|loni)\b/g, "")
    .replace(/\b(haryana|uttar\s+pradesh|india|up)\b/g, "")
    .replace(/[\s,.\-–/]/g, "");
  return stripped.length === 0;
}

function isDefaultDelhiCoords(lat?: number | null, lng?: number | null): boolean {
  return lat != null && lng != null &&
    Math.abs(lat - 28.5355) < 0.02 && Math.abs(lng - 77.2410) < 0.02;
}

const LOCALITY_SUFFIX = /\b(nagar|vihar|pur|puri|puram|colony|enclave|apartment|residency|village|mohalla|extension|ext\.?|market)\b/gi;

function sublocalityLevel(addr: string, cityRaw: string): string {
  const core = addr.toLowerCase()
    .replace(/\b(delhi|new\s+delhi|noida|greater\s+noida|gurgaon|gurugram|ghaziabad|faridabad|ncr|haryana|uttar\s+pradesh)\b/g, "")
    .replace(/[\s,]+$/, "").trim();
  if (!core) return "none";
  if (/\b(class|subject|subjects|accountancy|maths|science|english|hindi|economics|physics|chemistry)\b/i.test(core)) return "junk";
  const withoutSuffix = core.replace(LOCALITY_SUFFIX, " ").replace(/[\s,]+/g, " ").trim();
  const hasSubAreaMarker =
    /\b(sector|blk\.?|block|pocket|phase|plot|gali|gully|lane|house\s*no|h\.no|hz|hzl)\b/.test(withoutSuffix) ||
    /\b(near|opposite|opp\.?|behind|beside|next\s+to|across|ke\s+paas|ke\s+samne)\b/.test(withoutSuffix) ||
    /\b(chowk|chock|chauraha|more|mod|adda|mandir|gurudwara|masjid|hospital|metro|station|clinic)\b/.test(withoutSuffix) ||
    /\bno\.?\s*\d|\b\d{1,3}\s*[a-z]?\b/.test(withoutSuffix);
  const multi = /[,/&+]|and\b|\baur\b/i.test(core) && core.length > 20;
  if (hasSubAreaMarker) return "rich-subarea";
  if (multi) return "multi-area";
  return "plain-locality";
}

function esc(v: unknown): string {
  const s = String(v ?? "");
  return `"${s.replace(/"/g, '""')}"`;
}

async function main() {
  const tutors = await prisma.user.findMany({
    where: { role: "TUTOR" },
    select: {
      id: true, name: true, email: true, phone: true, isActive: true, createdAt: true,
      tutorProfile: {
        select: {
          address: true, city: true, state: true, pincode: true,
          latitude: true, longitude: true, subjects: true, classLevels: true,
          teachingMode: true, experience: true, feeMin: true, feeMax: true,
          isVerified: true, kycStatus: true, profileScore: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

    const header = [
    "tutorId", "name", "phone10digit", "rawPhone", "email", "isActive", "isVerified", "kycStatus", "profileScore", "createdAt",
    "city", "state", "pincode", "address", "sublocalityLevel",
    "latitude", "longitude", "coordSource", "coordsUsable5km",
    "ncrFlag", "cityGroup",
    "subjects", "classLevels", "teachingMode",
    "experienceYears", "feeMin", "feeMax",
    "dataQualityNote",
  ];
  const rows: string[] = [header.join(",")];

  let n = 0;
  for (const t of tutors) {
    const prof: Record<string, unknown> = (t as unknown as { tutorProfile: Record<string, unknown> }).tutorProfile || {};
    const name = (t.name || "").trim();
    const digits = cleanDisplayPhone(t.phone);
    const cityRaw = String(prof.city || "").trim();
    const addrRaw = String(prof.address || "");
    const addr = stripAddressJunk(addrRaw) || "";
    const lat = prof.latitude as number | null;
    const lng = prof.longitude as number | null;

    // sublocality assessment
    const addrOk = addr && addr.toLowerCase() !== cityRaw.toLowerCase() &&
      !isJunkLocality(addr) && !isJunkLocalityText(addr, name) && !isGenericLocationText(addr) &&
      !/^\s*pincode\b/i.test(addr);
    const level = addrOk ? sublocalityLevel(addr, cityRaw) : (addr ? "junk-or-generic" : "missing");

    // coords
    const locCoord = addrOk ? resolveLocationCoordinates(addr) : null;
    const cityCoord = cityRaw ? resolveLocationCoordinates(cityRaw) : null;
    const profCoord = lat && lng && !isDefaultDelhiCoords(lat, lng) ? { lat, lng } : null;
    let coordSource = "none";
    let usableLat: number | null = null, usableLng: number | null = null;
    if (locCoord) { coordSource = "locality-geocode"; usableLat = locCoord.lat; usableLng = locCoord.lng; }
    else if (profCoord) { coordSource = "profile"; usableLat = lat; usableLng = lng; }
    else if (cityCoord) { coordSource = "city-approx"; usableLat = cityCoord.lat; usableLng = cityCoord.lng; }
    const coordsUsable = coordSource !== "none" ? "yes" : "no";

    const isNcrCity = Boolean(cityRaw && NCR_CITY_RE.test(cityRaw));
    const ncrFlag = isNcrCity ? "NCR" : (cityRaw ? "Non-NCR" : "Unknown");
    const cityGroup = isNcrCity
      ? (["new delhi", "delhi", "loni"].includes(cityRaw.toLowerCase()) ? "Delhi" : title(cityRaw))
      : (cityRaw ? title(cityRaw) : "Unknown");

    // data quality note
    const notes: string[] = [];
    if (!digits || digits.length !== 10) notes.push("phone-missing/bad");
    if (level === "junk-or-generic") notes.push("address-junk-or-generic");
    if (level === "missing") notes.push("no-address");
    if (!cityRaw) notes.push("no-city");
    if (isDefaultDelhiCoords(lat, lng)) notes.push("default-delhi-coords");
    if (coordSource === "none" && addrOk) notes.push("area-but-no-coords");

    rows.push([
      t.id, name, digits, t.phone || "", t.email || "",
      t.isActive ? "active" : "inactive", prof.isVerified ? "verified" : "unverified",
      String(prof.kycStatus || ""), String(prof.profileScore ?? ""),
      t.createdAt ? t.createdAt.toISOString().slice(0, 10) : "",
      cityRaw, String(prof.state || ""), String(prof.pincode || ""), addrRaw,
      level,
      lat ?? "", lng ?? "", coordSource, coordsUsable,
      ncrFlag, cityGroup,
      (Array.isArray(prof.subjects) ? prof.subjects : []).join(" | "),
      (Array.isArray(prof.classLevels) ? prof.classLevels : []).join(" | "),
      String(prof.teachingMode || ""),
      String(prof.experience ?? ""), String(prof.feeMin ?? ""), String(prof.feeMax ?? ""),
      notes.join("; "),
    ].map(esc).join(","));
    n++;
  }

  fs.writeFileSync("exports/tutors_full_data.csv", "\uFEFF" + rows.join("\n"), "utf8");
  console.log(`Exported ${n} tutors -> exports/tutors_full_data.csv`);

  function title(s: string): string {
    return s.split(/\s+/).filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
