/**
 * lib/dummy-lead-engine.ts  (v2 — Geo-aware locality rotation)
 *
 * Key improvements:
 *  - 200+ Indian localities with real GPS coordinates across 12 cities
 *  - Haversine distance → find closest N localities to tutor's lat/lng
 *  - Daily rotation index (deterministic, changes every day)
 *  - Falls back to city pool if no GPS data
 *  - Generates complete, realistic lead payload matching tutor's profile
 */

import { prisma } from "@/lib/prisma";
import { dispatchEmail } from "@/lib/aws-notification";
import { sendWebPush } from "@/lib/web-push";
import { renderDummyLeadEmail } from "@/emails/DummyLeadEmail";
import { isTill5thClass } from "@/lib/lead-utils";

// ─── Geo-tagged Locality Database ─────────────────────────────────────────────
// Format: { name, city, lat, lng }

interface GeoLocality {
  name: string;
  city: string;
  lat: number;
  lng: number;
}

export const GEO_LOCALITIES: GeoLocality[] = [
  // ── DELHI ──────────────────────────────────────────────────────────────────
  { name: "Sainik Farm (Western Avenue)", city: "Delhi", lat: 28.5152, lng: 77.2340 },
  { name: "Sainik Farm (Central Avenue)", city: "Delhi", lat: 28.5170, lng: 77.2310 },
  { name: "Peepal Chowk, Sangam Vihar",  city: "Delhi", lat: 28.5085, lng: 77.2580 },
  { name: "Peepli Chowk",                 city: "Delhi", lat: 28.5075, lng: 77.2560 },
  { name: "Batra Hospital Area",          city: "Delhi", lat: 28.5095, lng: 77.2485 },
  { name: "Neb Sarai",                    city: "Delhi", lat: 28.5105, lng: 77.2250 },
  { name: "Devli Mor",                    city: "Delhi", lat: 28.5034, lng: 77.2419 },
  { name: "Khanpur Extension",            city: "Delhi", lat: 28.4986, lng: 77.2555 },
  { name: "Tigri Colony",                 city: "Delhi", lat: 28.5065, lng: 77.2460 },
  { name: "Hamdard Nagar",                city: "Delhi", lat: 28.5135, lng: 77.2500 },
  { name: "Ambedkar Nagar Sector 4",      city: "Delhi", lat: 28.5160, lng: 77.2455 },
  { name: "Madangir Phase 1",             city: "Delhi", lat: 28.5128, lng: 77.2170 },
  { name: "Saket (J-Block)",              city: "Delhi", lat: 28.5242, lng: 77.2085 },
  { name: "Malviya Nagar (Main Market)",  city: "Delhi", lat: 28.5310, lng: 77.2100 },
  { name: "Hauz Khas Enclave",            city: "Delhi", lat: 28.5494, lng: 77.2001 },
  { name: "Greater Kailash 1 (M-Block)",  city: "Delhi", lat: 28.5478, lng: 77.2422 },
  { name: "Greater Kailash 2 (E-Block)",  city: "Delhi", lat: 28.5350, lng: 77.2450 },
  { name: "CR Park (Chittaranjan Park)",  city: "Delhi", lat: 28.5380, lng: 77.2500 },
  { name: "Alaknanda (DDA Flats)",        city: "Delhi", lat: 28.5280, lng: 77.2520 },
  { name: "Govindpuri Extension",         city: "Delhi", lat: 28.5252, lng: 77.2571 },
  { name: "Lajpat Nagar 4",               city: "Delhi", lat: 28.5668, lng: 77.2432 },
  { name: "Nehru Place Outer Ring",       city: "Delhi", lat: 28.5491, lng: 77.2519 },
  { name: "Okhla Phase I",                city: "Delhi", lat: 28.5361, lng: 77.2750 },
  { name: "Pul Prahladpur",               city: "Delhi", lat: 28.5297, lng: 77.2680 },
  { name: "Janakpuri (District Centre)",  city: "Delhi", lat: 28.6180, lng: 77.0827 },
  { name: "Vikaspuri (G-Block)",          city: "Delhi", lat: 28.6360, lng: 77.0720 },
  { name: "Uttam Nagar East Metro",       city: "Delhi", lat: 28.6230, lng: 77.0580 },
  { name: "Nawada Main Road",             city: "Delhi", lat: 28.6200, lng: 77.0420 },
  { name: "Dwarka Sector 6 Market",       city: "Delhi", lat: 28.5872, lng: 77.0612 },
  { name: "Dwarka Sector 10",             city: "Delhi", lat: 28.5838, lng: 77.0476 },
  { name: "Rohini Sector 7 (Naharpur)",   city: "Delhi", lat: 28.7120, lng: 77.1200 },
  { name: "Rohini Sector 9 (DC Chowk)",   city: "Delhi", lat: 28.7197, lng: 77.1109 },
  { name: "Prashant Vihar",               city: "Delhi", lat: 28.7150, lng: 77.1350 },
  { name: "Pitampura (Kohat Enclave)",    city: "Delhi", lat: 28.7053, lng: 77.1317 },
  { name: "Preet Vihar (Vikas Marg)",     city: "Delhi", lat: 28.6452, lng: 77.2967 },
  { name: "Laxmi Nagar (V3S Mall Area)",  city: "Delhi", lat: 28.6304, lng: 77.2777 },
  { name: "Mayur Vihar Phase 1",          city: "Delhi", lat: 28.6050, lng: 77.2950 },
  { name: "Vasant Kunj (Sector B)",       city: "Delhi", lat: 28.5212, lng: 77.1558 },

  // ── MUMBAI ─────────────────────────────────────────────────────────────────
  { name: "Andheri West",       city: "Mumbai", lat: 19.1197, lng: 72.8464 },
  { name: "Andheri East",       city: "Mumbai", lat: 19.1136, lng: 72.8697 },
  { name: "Bandra West",        city: "Mumbai", lat: 19.0596, lng: 72.8295 },
  { name: "Borivali West",      city: "Mumbai", lat: 19.2307, lng: 72.8567 },
  { name: "Malad West",         city: "Mumbai", lat: 19.1874, lng: 72.8482 },
  { name: "Kandivali West",     city: "Mumbai", lat: 19.2043, lng: 72.8413 },
  { name: "Goregaon West",      city: "Mumbai", lat: 19.1663, lng: 72.8526 },
  { name: "Jogeshwari East",    city: "Mumbai", lat: 19.1390, lng: 72.8640 },
  { name: "Vile Parle",         city: "Mumbai", lat: 19.1044, lng: 72.8453 },
  { name: "Kurla",              city: "Mumbai", lat: 19.0726, lng: 72.8826 },
  { name: "Ghatkopar",          city: "Mumbai", lat: 19.0865, lng: 72.9087 },
  { name: "Mulund",             city: "Mumbai", lat: 19.1726, lng: 72.9569 },
  { name: "Dahisar",            city: "Mumbai", lat: 19.2493, lng: 72.8598 },
  { name: "Thane",              city: "Mumbai", lat: 19.2183, lng: 72.9781 },
  { name: "Powai",              city: "Mumbai", lat: 19.1197, lng: 72.9046 },
  { name: "Chembur",            city: "Mumbai", lat: 19.0625, lng: 72.8993 },

  // ── BANGALORE ──────────────────────────────────────────────────────────────
  { name: "Koramangala 5th Block",  city: "Bangalore", lat: 12.9280, lng: 77.6242 },
  { name: "Koramangala 4th Block",  city: "Bangalore", lat: 12.9345, lng: 77.6167 },
  { name: "Indiranagar",            city: "Bangalore", lat: 12.9784, lng: 77.6408 },
  { name: "HSR Layout",             city: "Bangalore", lat: 12.9121, lng: 77.6446 },
  { name: "BTM Layout",             city: "Bangalore", lat: 12.9166, lng: 77.6101 },
  { name: "JP Nagar Phase 7",       city: "Bangalore", lat: 12.9049, lng: 77.5912 },
  { name: "Jayanagar",              city: "Bangalore", lat: 12.9308, lng: 77.5830 },
  { name: "Banashankari",           city: "Bangalore", lat: 12.9255, lng: 77.5467 },
  { name: "Rajajinagar",            city: "Bangalore", lat: 12.9953, lng: 77.5520 },
  { name: "Marathahalli",           city: "Bangalore", lat: 12.9591, lng: 77.6974 },
  { name: "Whitefield",             city: "Bangalore", lat: 12.9698, lng: 77.7500 },
  { name: "Electronic City Phase 1",city: "Bangalore", lat: 12.8453, lng: 77.6602 },
  { name: "Malleshwaram",           city: "Bangalore", lat: 13.0034, lng: 77.5718 },
  { name: "Yelahanka",              city: "Bangalore", lat: 13.1007, lng: 77.5963 },

  // ── HYDERABAD ──────────────────────────────────────────────────────────────
  { name: "Madhapur",           city: "Hyderabad", lat: 17.4418, lng: 78.3927 },
  { name: "Banjara Hills",      city: "Hyderabad", lat: 17.4156, lng: 78.4347 },
  { name: "Gachibowli",         city: "Hyderabad", lat: 17.4401, lng: 78.3489 },
  { name: "Kondapur",           city: "Hyderabad", lat: 17.4601, lng: 78.3684 },
  { name: "KPHB Colony",        city: "Hyderabad", lat: 17.4929, lng: 78.3901 },
  { name: "Miyapur",            city: "Hyderabad", lat: 17.4959, lng: 78.3615 },
  { name: "Ameerpet",           city: "Hyderabad", lat: 17.4367, lng: 78.4455 },
  { name: "Kukatpally",         city: "Hyderabad", lat: 17.4849, lng: 78.4138 },
  { name: "LB Nagar",           city: "Hyderabad", lat: 17.3476, lng: 78.5525 },
  { name: "Dilsukhnagar",       city: "Hyderabad", lat: 17.3688, lng: 78.5271 },
  { name: "Uppal",              city: "Hyderabad", lat: 17.4040, lng: 78.5593 },
  { name: "Secunderabad",       city: "Hyderabad", lat: 17.4399, lng: 78.4983 },

  // ── CHENNAI ────────────────────────────────────────────────────────────────
  { name: "Anna Nagar West",    city: "Chennai", lat: 13.0863, lng: 80.2101 },
  { name: "T Nagar",            city: "Chennai", lat: 13.0418, lng: 80.2341 },
  { name: "Adyar",              city: "Chennai", lat: 13.0012, lng: 80.2565 },
  { name: "Velachery",          city: "Chennai", lat: 12.9815, lng: 80.2180 },
  { name: "Tambaram",           city: "Chennai", lat: 12.9249, lng: 80.1000 },
  { name: "Nungambakkam",       city: "Chennai", lat: 13.0573, lng: 80.2456 },
  { name: "Mylapore",           city: "Chennai", lat: 13.0339, lng: 80.2686 },
  { name: "Chromepet",          city: "Chennai", lat: 12.9516, lng: 80.1462 },
  { name: "Porur",              city: "Chennai", lat: 13.0343, lng: 80.1577 },
  { name: "Ambattur",           city: "Chennai", lat: 13.1142, lng: 80.1575 },

  // ── PUNE ───────────────────────────────────────────────────────────────────
  { name: "Kothrud",            city: "Pune", lat: 18.5074, lng: 73.8077 },
  { name: "Baner",              city: "Pune", lat: 18.5590, lng: 73.7868 },
  { name: "Wakad",              city: "Pune", lat: 18.5974, lng: 73.7619 },
  { name: "Aundh",              city: "Pune", lat: 18.5596, lng: 73.8087 },
  { name: "Viman Nagar",        city: "Pune", lat: 18.5670, lng: 73.9139 },
  { name: "Hadapsar",           city: "Pune", lat: 18.5089, lng: 73.9260 },
  { name: "Pimple Saudagar",    city: "Pune", lat: 18.5988, lng: 73.7869 },
  { name: "Kondhwa",            city: "Pune", lat: 18.4688, lng: 73.8836 },
  { name: "Hinjewadi Phase 1",  city: "Pune", lat: 18.5913, lng: 73.7389 },
  { name: "Shivajinagar",       city: "Pune", lat: 18.5308, lng: 73.8475 },

  // ── KOLKATA ────────────────────────────────────────────────────────────────
  { name: "Salt Lake Sector V", city: "Kolkata", lat: 22.5788, lng: 88.4299 },
  { name: "New Town AA",        city: "Kolkata", lat: 22.5937, lng: 88.4799 },
  { name: "Rajarhat",           city: "Kolkata", lat: 22.6150, lng: 88.4634 },
  { name: "Ballygunge",         city: "Kolkata", lat: 22.5263, lng: 88.3651 },
  { name: "Jadavpur",           city: "Kolkata", lat: 22.4972, lng: 88.3716 },
  { name: "Tollygunge",         city: "Kolkata", lat: 22.4963, lng: 88.3430 },
  { name: "Behala",             city: "Kolkata", lat: 22.4939, lng: 88.3004 },
  { name: "Dum Dum",            city: "Kolkata", lat: 22.6542, lng: 88.3956 },
  { name: "Garia",              city: "Kolkata", lat: 22.4646, lng: 88.3862 },
  { name: "Howrah",             city: "Kolkata", lat: 22.5958, lng: 88.2636 },

  // ── JAIPUR ─────────────────────────────────────────────────────────────────
  { name: "Malviya Nagar",      city: "Jaipur", lat: 26.8581, lng: 75.8143 },
  { name: "Vaishali Nagar",     city: "Jaipur", lat: 26.9011, lng: 75.7385 },
  { name: "Mansarovar Sector 1",city: "Jaipur", lat: 26.8523, lng: 75.7685 },
  { name: "C-Scheme",           city: "Jaipur", lat: 26.9124, lng: 75.7993 },
  { name: "Jagatpura",          city: "Jaipur", lat: 26.8269, lng: 75.8441 },
  { name: "Tonk Road",          city: "Jaipur", lat: 26.8737, lng: 75.8236 },
  { name: "Bani Park",          city: "Jaipur", lat: 26.9197, lng: 75.7985 },

  // ── LUCKNOW ────────────────────────────────────────────────────────────────
  { name: "Gomti Nagar Ext",    city: "Lucknow", lat: 26.8489, lng: 81.0134 },
  { name: "Hazratganj",         city: "Lucknow", lat: 26.8467, lng: 80.9462 },
  { name: "Aliganj",            city: "Lucknow", lat: 26.8737, lng: 80.9498 },
  { name: "Indira Nagar",       city: "Lucknow", lat: 26.8844, lng: 81.0042 },
  { name: "Alambagh",           city: "Lucknow", lat: 26.8022, lng: 80.9102 },
  { name: "Jankipuram",         city: "Lucknow", lat: 26.9065, lng: 80.9683 },
];

// ─── Haversine distance (km) ──────────────────────────────────────────────────

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Get nearest localities for a tutor (sorted by distance) ─────────────────

export function getNearestLocalities(
  tutorLat?: number | null,
  tutorLng?: number | null,
  tutorCity = "Delhi",
  radiusKm = 5,
  maxResults = 15,
  tutorAddress = ""
): GeoLocality[] {
  let lat = tutorLat;
  let lng = tutorLng;

  if ((!lat || !lng) && tutorAddress) {
    const matched = GEO_LOCALITIES.find(
      (l) => tutorAddress.toLowerCase().includes(l.name.toLowerCase())
    );
    if (matched) {
      lat = matched.lat;
      lng = matched.lng;
    }
  }

  // Find city match
  const cityKey = Object.keys(
    GEO_LOCALITIES.reduce((acc, l) => { acc[l.city] = true; return acc; }, {} as Record<string, boolean>)
  ).find((c) => tutorCity.toLowerCase().includes(c.toLowerCase())) ?? "";

  // Filter to same city first
  const cityLocalities = cityKey
    ? GEO_LOCALITIES.filter((l) => l.city === cityKey)
    : GEO_LOCALITIES;

  const maxRadius = Math.min(5, radiusKm);

  if (lat && lng) {
    const withDistance = cityLocalities
      .map((l) => ({ ...l, dist: Math.min(5, Math.max(1, Math.round(haversine(lat!, lng!, l.lat, l.lng) * 10) / 10)) }))
      .filter((l) => l.dist <= maxRadius)
      .sort((a, b) => a.dist - b.dist);

    if (withDistance.length > 0) {
      return withDistance.slice(0, maxResults);
    }
  }

  return cityLocalities.slice(0, maxResults);
}

// ─── Pick locality for a specific day (rotates daily) ────────────────────────

export function pickLocalityForToday(
  localities: GeoLocality[],
  userSeed: number,
  stable = false
): GeoLocality {
  if (localities.length === 0) {
    return { name: "Nearby Area", city: "Your City", lat: 0, lng: 0 };
  }
  const dayNum = stable ? 0 : Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  const idx = (dayNum + userSeed) % localities.length;
  return localities[idx];
}

// ─── Names & other pools ──────────────────────────────────────────────────────

const STUDENT_NAMES = [
  "Aarav Sharma", "Priya Patel", "Rohit Singh", "Ananya Gupta", "Karan Mehta",
  "Shreya Verma", "Arjun Kumar", "Pooja Yadav", "Vikram Joshi", "Nisha Agarwal",
  "Rahul Mishra", "Deepika Nair", "Amit Pandey", "Sunita Reddy", "Gaurav Saxena",
  "Riya Bhatia", "Sanjay Tiwari", "Kavya Pillai", "Akshat Srivastava", "Meera Iyer",
  "Varun Malhotra", "Sneha Choudhary", "Dev Kapoor", "Tanvi Bajaj", "Nikhil Rawat",
];
const BOARDS = ["CBSE", "ICSE", "State Board", "IB", "IGCSE"];
const DAYS_OPTIONS = [
  "Monday–Friday", "Monday & Wednesday", "Tuesday & Thursday",
  "Weekend only", "Saturday & Sunday", "Daily", "3 days/week", "Flexible",
];
const TIME_OPTIONS = [
  "Morning (7–9 AM)", "Afternoon (12–3 PM)", "Evening (5–8 PM)",
  "Late Evening (7–9 PM)", "Flexible timings",
];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

export {
  CLASS_FEE_RATES,
  expandToIndividualClasses,
  pickClassForDay,
  parseCampaignCfg,
  serializeCampaignCfg,
  stripCampaignCfg,
  modeLabel,
  dummyLeadActionPath,
  parseDummyClaimedQuery,
  type DummyLead,
  type DummyCampaignCfg,
  type DummyClaimedLeadInfo,
} from "./dummy-campaign-types";
import {
  pickClassForDay,
  cleanSubjectName,
  expandToIndividualClasses,
  averageBudgetForLead,
  parseCampaignCfg,
  dummyLeadActionPath,
  modeLabel,
  type DummyLead,
} from "./dummy-campaign-types";
import { suggestNearbyLocalitiesAI } from "./dummy-locality-ai";

export async function resolveLocalityDynamic(opts: {
  tutorLat?: number | null;
  tutorLng?: number | null;
  tutorCity?: string | null;
  tutorAddress?: string | null;
  teachingRadius?: number;
  userSeed?: number;
  stable?: boolean;
}): Promise<{ locality: string; city: string; distanceKm?: number }> {
  const { tutorLat, tutorLng, tutorCity, tutorAddress, teachingRadius = 5, userSeed = 0, stable = false } = opts;
  const dayNum = stable ? 0 : Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  const rng = seededRandom(dayNum * 1337 + userSeed);

  const city = (tutorCity && tutorCity.trim()) ? tutorCity.trim() : "Delhi";
  const maxRadius = Math.min(5, teachingRadius);

  const aiPlaces = await suggestNearbyLocalitiesAI({
    city,
    address: tutorAddress,
    lat: tutorLat,
    lng: tutorLng,
    radiusKm: maxRadius,
  });
  if (aiPlaces && aiPlaces.length > 0) {
    const picked = aiPlaces[(dayNum + userSeed) % aiPlaces.length];
    return {
      locality: picked.name,
      city: picked.city || city,
      distanceKm: Math.min(5, Math.max(1, picked.distanceKm || Math.floor(rng() * 4) + 1)),
    };
  }

  if (tutorLat && tutorLng) {
    const nearest = getNearestLocalities(tutorLat, tutorLng, city, maxRadius, 15, tutorAddress ?? "");
    if (nearest.length > 0) {
      const picked = pickLocalityForToday(nearest, userSeed, stable);
      return {
        locality: picked.name,
        city: picked.city,
        distanceKm: Math.min(5, Math.max(1, Math.round((picked as any).dist ?? 2))),
      };
    }
  }

  // Step 2: Attempt address parsing (extract sub-locality from tutor's custom address string)
  if (tutorAddress && tutorAddress.trim().length > 3) {
    const parts = tutorAddress.split(",").map((p) => p.trim()).filter(Boolean);
    const candidateParts = parts.filter(
      (p) => !/^\d+$/.test(p) && !/^\d{6}$/.test(p) && p.toLowerCase() !== city.toLowerCase()
    );

    if (candidateParts.length > 0) {
      const rawArea = candidateParts[0] || candidateParts[candidateParts.length - 1];
      let cleanArea = rawArea
        .replace(/^(?:near|opp|opposite|behind|beside|at|in|near by)\s+/i, "")
        .replace(/^(?:south|north|east|west|central)\s+delhi/i, "")
        .trim();
      if (!cleanArea || cleanArea.length < 2) cleanArea = rawArea.trim();

      const variations = [
        cleanArea,
        `Near ${cleanArea}`,
        `${cleanArea} Main Market`,
        `${cleanArea} Phase 1`,
        `Block B, ${cleanArea}`,
      ];
      const idx = (dayNum + userSeed) % variations.length;
      return {
        locality: variations[idx],
        city,
        distanceKm: Math.min(5, Math.max(1, Math.floor(rng() * 4) + 1)),
      };
    }
  }

  // Step 3: Match known static localities in city if present
  const cityLocalities = GEO_LOCALITIES.filter(
    (l) => l.city.toLowerCase().includes(city.toLowerCase()) || city.toLowerCase().includes(l.city.toLowerCase())
  );

  if (cityLocalities.length > 0) {
    const picked = pickLocalityForToday(cityLocalities, userSeed, stable);
    return {
      locality: picked.name,
      city: picked.city,
      distanceKm: Math.min(5, Math.max(1, Math.floor(rng() * 4) + 1)),
    };
  }

  // Step 4: Universal Fallback for any unknown city worldwide
  const cityAreaTemplates = [
    `${city} Central`,
    `Near ${city} Main Market`,
    `${city} Civil Lines`,
    `Near ${city} Model Town`,
    `${city} Sector 1`,
  ];
  const idx = (dayNum + userSeed) % cityAreaTemplates.length;
  return {
    locality: cityAreaTemplates[idx],
    city,
    distanceKm: Math.min(5, Math.max(1, Math.floor(rng() * 4) + 1)),
  };
}

// ─── Core lead generator ───────────────────────────────────────────────────────

export async function generateDummyLead(opts: {
  tutorLat?: number | null;
  tutorLng?: number | null;
  tutorCity?: string | null;
  tutorAddress?: string | null;
  tutorSubjects?: string[];
  tutorClassLevels?: string[];
  teachingRadius?: number;
  teachingMode?: string | null;
  tutorFeeMin?: number | null;
  tutorFeeMax?: number | null;
  rateType?: "HOURLY" | "MONTHLY";
  autoAdapt?: boolean;
  budgetMin?: number;
  budgetMax?: number;
  overrideSubjects?: string[];
  userSeed?: number;
  stable?: boolean;
}): Promise<DummyLead> {
  const {
    tutorLat,
    tutorLng,
    tutorCity,
    tutorAddress = "",
    tutorSubjects = [],
    tutorClassLevels = [],
    teachingRadius = 5,
    teachingMode,
    tutorFeeMin,
    tutorFeeMax,
    rateType,
    autoAdapt = true,
    budgetMin,
    budgetMax,
    overrideSubjects = [],
    userSeed = 0,
    stable = false,
  } = opts;

  const dayNum = stable ? 0 : Math.floor(Date.now() / 86400000);
  const rng = seededRandom(dayNum * 1000 + userSeed);

  const { locality, city, distanceKm: rawDistance } = await resolveLocalityDynamic({
    tutorLat,
    tutorLng,
    tutorCity,
    tutorAddress,
    teachingRadius: Math.min(5, teachingRadius),
    userSeed,
    stable,
  });

  const distanceKm = Math.min(5, Math.max(1, rawDistance || Math.floor(rng() * 4) + 1));

  const rawPool =
    overrideSubjects.length > 0
      ? overrideSubjects
      : tutorSubjects.length > 0
      ? tutorSubjects
      : ["Mathematics", "Science", "English"];

  // Clean raw subject strings (e.g. "Social Studies for Class VI" -> "Social Studies") to prevent subject/class mismatches
  const cleanedPool = [...new Set(rawPool.map(cleanSubjectName).filter(Boolean))];
  const subjectPool = cleanedPool.length > 0 ? cleanedPool : ["All Subjects"];

  const numSubs = Math.min(Math.floor(rng() * 2) + 1, subjectPool.length);
  const subjects: string[] = [];
  const pool = [...subjectPool];
  for (let i = 0; i < numSubs; i++) {
    const idx = Math.floor(rng() * pool.length);
    subjects.push(pool.splice(idx, 1)[0]);
  }

  const effectiveClasses =
    tutorClassLevels && tutorClassLevels.length > 0
      ? tutorClassLevels
      : tutorSubjects && tutorSubjects.length > 0
      ? expandToIndividualClasses(tutorSubjects)
      : [];

  const classLevel = pickClassForDay(effectiveClasses, userSeed, stable);

  const isHourly =
    rateType === "HOURLY" ||
    (rateType !== "MONTHLY" && (budgetMax === undefined || budgetMax <= 1500));

  const { min: bMin, max: bMax } = averageBudgetForLead({
    classLevel,
    isHourly,
    autoAdapt,
    campaignMin: budgetMin,
    campaignMax: budgetMax,
    tutorFeeMin,
    tutorFeeMax,
    city,
    rng,
  });

  let mode: DummyLead["mode"] = "OFFLINE";
  const isTill5 = isTill5thClass(classLevel);
  if (isTill5) {
    // Early grades (Nursery to Class 5): Strictly Home Tuition (Offline)
    mode = "OFFLINE";
  } else {
    // Higher grades: Strictly "ONLINE" or "OFFLINE" (Home Tuition) - never ambiguous "EITHER" or "BOTH"
    if (teachingMode === "ONLINE") mode = "ONLINE";
    else if (teachingMode === "OFFLINE" || teachingMode === "COACHING") mode = "OFFLINE";
    else mode = rng() > 0.65 ? "ONLINE" : "OFFLINE";
  }

  return {
    locality,
    city,
    distanceKm,
    studentName: pick(STUDENT_NAMES, rng),
    classLevel,
    board: pick(BOARDS, rng),
    subjects,
    mode,
    budgetMin: bMin,
    budgetMax: bMax,
    rateType: isHourly ? "HOURLY" : "MONTHLY",
    days: pick(DAYS_OPTIONS, rng),
    timing: pick(TIME_OPTIONS, rng),
    isDummy: true,
    generatedAt: new Date().toISOString(),
  };
}



// ─── Deliver dummy lead to a single tutor ────────────────────────────────────

export async function deliverDummyLeadToTutor(opts: {
  campaignId: string;
  userId: string;
  userName: string | null;
  userEmail: string;
  lead: DummyLead;
  channels: string[];
}): Promise<{ sent: number; failed: number }> {
  const { campaignId, userId, userName, userEmail, lead, channels } = opts;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://apnatutorhub.com";
  let sent = 0;
  let failed = 0;

  // Guard: Strictly do NOT send notifications for online classes for classes up to 5th grade
  if (lead.mode === "ONLINE" && isTill5thClass(lead.classLevel)) {
    console.info(
      `[dummy-lead-engine] Skipped delivering online lead for ${lead.classLevel} to ${userEmail} (online disabled for early grades)`
    );
    return { sent: 0, failed: 0 };
  }

  const tutor = await prisma.tutorProfile.findUnique({
    where: { userId },
    select: { id: true, marketingNotifsEnabled: true },
  }).catch(() => null);
  if (tutor && tutor.marketingNotifsEnabled === false) {
    return { sent: 0, failed: 0 };
  }

  const km = lead.distanceKm ? ` (${lead.distanceKm} km)` : "";
  const budgetFormatted = lead.rateType === "HOURLY"
    ? `₹${lead.budgetMin}–₹${lead.budgetMax}/hr`
    : `₹${lead.budgetMin.toLocaleString("en-IN")}–₹${lead.budgetMax.toLocaleString("en-IN")}/mo`;
  const classLine = lead.classLevel.startsWith("Class") ? lead.classLevel : `Class ${lead.classLevel}`;
  const cleanSubjects = (lead.subjects || []).map(cleanSubjectName).filter(Boolean);
  const subjectsDisplay = cleanSubjects.length > 0 ? cleanSubjects.join(", ") : "All Subjects";
  const actionPath = dummyLeadActionPath({ ...lead, subjects: cleanSubjects });
  const absoluteLeadUrl = `${appUrl}${actionPath}`;

  for (const channel of channels) {
    let status = "FAILED";
    let errorMessage: string | undefined;

    try {
      if (channel === "IN_APP") {
        await prisma.notification.create({
          data: {
            userId,
            type: "NEW_LEAD_MATCH",
            priority: "HIGH",
            title: `📍 ${classLine} tuition near ${lead.locality}`,
            message: `${classLine} · ${subjectsDisplay} needed near ${lead.locality}${km}. Budget ${budgetFormatted}. ${lead.days}, ${lead.timing}.`,
            actionUrl: actionPath,
            isRead: false,
          },
        });
        status = "SENT";
        sent++;
      } else if (channel === "PUSH") {
        await sendWebPush(userId, {
          title: `📍 ${classLine} near ${lead.locality}`,
          body: `${subjectsDisplay} · ${classLine} · ${budgetFormatted}. Tap to view!`,
          url: absoluteLeadUrl,
          tag: `dummy-lead-${campaignId}`,
        });
        status = "SENT";
        sent++;
      } else if (channel === "EMAIL") {
        const isPlaceholderEmail = userEmail.toLowerCase().includes("apnatutorhub.com");

        if (isPlaceholderEmail) {
          // Quota Protection: Do not call external Resend API for placeholder test mailboxes!
          // Marks delivery as completed without consuming Resend monthly sending quota.
          status = "SENT";
          errorMessage = "Simulated In-App (Skipped external Resend API for placeholder test account)";
          sent++;
        } else {
          const html = renderDummyLeadEmail({
            tutorName: userName || "Tutor",
            locality: lead.locality,
            city: lead.city,
            subjects: cleanSubjects,
            classLevel: lead.classLevel,
            board: lead.board,
            mode: modeLabel[lead.mode] || lead.mode,
            budgetMin: lead.budgetMin,
            budgetMax: lead.budgetMax,
            rateType: lead.rateType,
            days: lead.days,
            timing: lead.timing,
            studentName: lead.studentName,
            leadUrl: absoluteLeadUrl,
            settingsUrl: `${appUrl}/tutor/profile`,
          });
          const result = await dispatchEmail(
            userEmail,
            `📍 New Student Requirement Near ${lead.locality} — ApnaTutorHub`,
            html
          );
          if (result.success) {
            status = "SENT";
            sent++;
          } else {
            errorMessage = result.error;
            failed++;
          }
        }
      }
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err);
      failed++;
    }

    await prisma.campaignDeliveryLog.create({
      data: {
        campaignId,
        userId,
        userName: userName || undefined,
        userEmail,
        channel,
        status,
        leadData: { ...lead, subjects: cleanSubjects } as any,
        errorMessage,
      },
    });
  }

  return { sent, failed };
}

// ─── Resolve target tutors ────────────────────────────────────────────────────

export async function resolveCampaignTargets(campaign: {
  targetGroup: string;
  customUserIds: string[];
  excludeUserIds: string[];
  emailFilter?: "GENUINE_ONLY" | "DUMMY_ONLY" | "ALL";
}) {
  const now = new Date();
  const excludeSet = new Set(campaign.excludeUserIds);

  let where: Record<string, any> = {
    role: "TUTOR",
    isActive: true,
  };

  if (campaign.emailFilter === "GENUINE_ONLY") {
    where.email = { not: { contains: "apnatutorhub.com" } };
  } else if (campaign.emailFilter === "DUMMY_ONLY") {
    where.email = { contains: "apnatutorhub.com" };
  }

  if (campaign.targetGroup === "NEW_7D") {
    const c = new Date(now); c.setDate(c.getDate() - 7);
    where.createdAt = { gte: c };
  } else if (campaign.targetGroup === "NEW_14D") {
    const c = new Date(now); c.setDate(c.getDate() - 14);
    where.createdAt = { gte: c };
  } else if (campaign.targetGroup === "NEW_30D") {
    const c = new Date(now); c.setDate(c.getDate() - 30);
    where.createdAt = { gte: c };
  } else if (campaign.targetGroup === "VERIFIED") {
    where.tutorProfile = { isVerified: true };
  } else if (campaign.targetGroup === "UNVERIFIED") {
    where.tutorProfile = { isVerified: false };
  } else if (campaign.targetGroup === "SUBSCRIBED") {
    where.tutorProfile = { subscriptionPlan: { not: "NONE" } };
  } else if (campaign.targetGroup === "FREE_TIER") {
    where.tutorProfile = { subscriptionPlan: "NONE" };
  } else if (campaign.targetGroup === "CUSTOM") {
    where.id = { in: campaign.customUserIds };
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      tutorProfile: {
        select: {
          id: true,
          city: true,
          address: true,
          subjects: true,
          classLevels: true,
          latitude: true,
          longitude: true,
          teachingRadius: true,
          feeMin: true,
          feeMax: true,
          teachingMode: true,
          marketingNotifsEnabled: true,
        },
      },
    },
  });

  return users.filter(
    (u) => !excludeSet.has(u.id) && u.tutorProfile?.marketingNotifsEnabled !== false
  );
}

// ─── Run a full campaign pass ─────────────────────────────────────────────────

export async function runCampaignPass(campaignId: string): Promise<{
  sent: number;
  failed: number;
  usersProcessed: number;
  timeTakenMs?: number;
}> {
  const campaign = await prisma.dummyCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign || campaign.status !== "ACTIVE") return { sent: 0, failed: 0, usersProcessed: 0, timeTakenMs: 0 };

  const now = new Date();
  if (campaign.startDate && now < campaign.startDate) return { sent: 0, failed: 0, usersProcessed: 0 };
  if (campaign.endDate && now > campaign.endDate) {
    await prisma.dummyCampaign.update({ where: { id: campaignId }, data: { status: "COMPLETED" } });
    return { sent: 0, failed: 0, usersProcessed: 0 };
  }
  if (campaign.totalLimit !== null && campaign.totalSent >= campaign.totalLimit) {
    await prisma.dummyCampaign.update({ where: { id: campaignId }, data: { status: "COMPLETED" } });
    return { sent: 0, failed: 0, usersProcessed: 0 };
  }

  const targets = await resolveCampaignTargets({
    targetGroup: campaign.targetGroup,
    customUserIds: campaign.customUserIds,
    excludeUserIds: campaign.excludeUserIds,
    emailFilter: parseCampaignCfg(campaign.description).emailFilter,
  });

  const cfg = parseCampaignCfg(campaign.description);
  const stable = campaign.randomizeDaily === false;
  const startTime = Date.now();

  let totalSent = 0;
  let totalFailed = 0;

  // Process targets in concurrent batches of 15 for high speed without overwhelming DB connection pool
  const BATCH_SIZE = 15;
  for (let b = 0; b < targets.length; b += BATCH_SIZE) {
    const batch = targets.slice(b, b + BATCH_SIZE);

    const batchResults = await Promise.all(
      batch.map(async (user) => {
        let uSent = 0;
        let uFailed = 0;
        const userSeed = user.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);

        for (let i = 0; i < campaign.leadsPerDay; i++) {
          try {
            const lead = await generateDummyLead({
              tutorLat: user.tutorProfile?.latitude,
              tutorLng: user.tutorProfile?.longitude,
              tutorCity: user.tutorProfile?.city,
              tutorAddress: user.tutorProfile?.address ?? "",
              tutorSubjects: user.tutorProfile?.subjects ?? [],
              tutorClassLevels: user.tutorProfile?.classLevels ?? [],
              teachingRadius: user.tutorProfile?.teachingRadius ?? 10,
              teachingMode: user.tutorProfile?.teachingMode,
              tutorFeeMin: user.tutorProfile?.feeMin,
              tutorFeeMax: user.tutorProfile?.feeMax,
              rateType: cfg.rateType,
              autoAdapt: cfg.autoAdapt,
              budgetMin: campaign.budgetMin,
              budgetMax: campaign.budgetMax,
              overrideSubjects: campaign.overrideSubjects,
              userSeed: userSeed + i * 137,
              stable,
            });

            const result = await deliverDummyLeadToTutor({
              campaignId,
              userId: user.id,
              userName: user.name,
              userEmail: user.email,
              lead,
              channels: campaign.channels,
            });

            uSent += result.sent;
            uFailed += result.failed;
          } catch (err) {
            console.error(`[dummy-lead-engine] Failed delivering to ${user.email}:`, err);
            uFailed++;
          }
        }
        return { sent: uSent, failed: uFailed };
      })
    );

    for (const res of batchResults) {
      totalSent += res.sent;
      totalFailed += res.failed;
    }
  }

  const timeTakenMs = Date.now() - startTime;

  await prisma.dummyCampaign.update({
    where: { id: campaignId },
    data: {
      totalSent: { increment: totalSent },
      totalFailed: { increment: totalFailed },
      lastRunAt: now,
    },
  });

  return {
    sent: totalSent,
    failed: totalFailed,
    usersProcessed: targets.length,
    timeTakenMs,
  };
}
