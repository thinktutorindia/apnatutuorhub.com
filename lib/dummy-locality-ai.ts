/**
 * lib/dummy-locality-ai.ts
 *
 * Gemini-backed nearby locality & micro-cluster resolver for dummy tutor leads.
 * - Queries Gemini AI for realistic nearby residential neighborhoods within 1-5 km.
 * - Contains pre-compiled high-density Indian micro-clusters (e.g. Sangam Vihar -> Batra/Sainik Farm/Khanpur,
 *   Govindpuri -> Okhla/Nehru Place/Kalkaji, Rohini -> Pitampura/Prashant Vihar, Koramangala -> HSR/BTM).
 * - Caches per city / rounded GPS / area so campaign execution is lightning fast.
 */

export type NearbyLocality = { name: string; city: string; distanceKm: number };

const cache = new Map<string, NearbyLocality[]>();

// ─── Known High-Density Micro Clusters ────────────────────────────────────────

const MICRO_CLUSTERS: Record<string, Array<{ name: string; dist: number }>> = {
  // South Delhi / Sangam Vihar & Batra Cluster
  "sangam vihar": [
    { name: "Sainik Farm (Western Avenue)", dist: 1.8 },
    { name: "Sainik Farm (Gate No. 2)", dist: 2.1 },
    { name: "Peepal Chowk", dist: 1.0 },
    { name: "Peepli Chowk", dist: 1.2 },
    { name: "Batra Hospital Area", dist: 1.4 },
    { name: "Devli Mor / Sainik Farm Border", dist: 1.5 },
    { name: "Khanpur Extension", dist: 1.8 },
    { name: "Neb Sarai", dist: 2.0 },
    { name: "Saket (J-Block)", dist: 2.5 },
    { name: "Hamdard Nagar", dist: 2.3 },
    { name: "Tigri Colony", dist: 1.9 },
    { name: "Ambedkar Nagar Sector 4", dist: 2.8 },
  ],
  "cr park": [
    { name: "Alaknanda (DDA Flats)", dist: 1.2 },
    { name: "Greater Kailash 2 (E-Block)", dist: 1.5 },
    { name: "Kalkaji (Near Extension)", dist: 1.4 },
    { name: "Nehru Place Outer Ring", dist: 1.8 },
    { name: "Panchsheel Enclave", dist: 2.2 },
    { name: "CR Park Market 1", dist: 0.8 },
  ],
  "chittaranjan park": [
    { name: "Alaknanda (DDA Flats)", dist: 1.2 },
    { name: "Greater Kailash 2 (E-Block)", dist: 1.5 },
    { name: "Kalkaji (Near Extension)", dist: 1.4 },
    { name: "Nehru Place Outer Ring", dist: 1.8 },
  ],
  "kalkaji": [
    { name: "CR Park (Chittaranjan Park)", dist: 1.2 },
    { name: "Nehru Place Outer Ring", dist: 1.5 },
    { name: "Govindpuri Extension", dist: 1.3 },
    { name: "Alaknanda", dist: 1.6 },
    { name: "Greater Kailash 1", dist: 2.2 },
  ],
  "greater kailash": [
    { name: "CR Park Market 1", dist: 1.5 },
    { name: "Kailash Colony Market", dist: 1.4 },
    { name: "Pamposh Enclave", dist: 1.2 },
    { name: "Alaknanda Shopping Complex", dist: 1.6 },
  ],
  "lajpat nagar": [
    { name: "Defence Colony (Main Flyover Area)", dist: 1.5 },
    { name: "South Extension 1", dist: 2.0 },
    { name: "Amar Colony Market", dist: 1.2 },
    { name: "National Park Area", dist: 1.4 },
  ],
  "boring road": [
    { name: "Patliputra Colony", dist: 1.5 },
    { name: "Bailey Road (Raja Bazar)", dist: 2.0 },
    { name: "Kankarbagh (Tempo Stand)", dist: 2.8 },
    { name: "Kidwaipuri", dist: 1.4 },
  ],
  "chandigarh": [
    { name: "Sector 35 Inner Market", dist: 1.0 },
    { name: "Sector 34 Sub City Centre", dist: 1.5 },
    { name: "Sector 22 Market Area", dist: 2.0 },
    { name: "Sector 43 Bus Stand Area", dist: 1.8 },
  ],
  "kothrud": [
    { name: "Karve Nagar", dist: 1.5 },
    { name: "Paud Road (Near Vanaz)", dist: 1.8 },
    { name: "Erandwane", dist: 2.2 },
    { name: "Mayur Colony", dist: 1.2 },
  ],
  // Govindpuri / Kalkaji / Okhla Cluster
  "govindpuri": [
    { name: "CR Park (Chittaranjan Park)", dist: 1.5 },
    { name: "Alaknanda (DDA Flats)", dist: 1.8 },
    { name: "Kalkaji (Near Extension)", dist: 1.4 },
    { name: "Nehru Place Outer Ring", dist: 2.3 },
    { name: "Greater Kailash 2 (E-Block)", dist: 2.8 },
    { name: "Tughlakabad Extension", dist: 1.9 },
    { name: "DDA Flats Kalkaji", dist: 1.6 },
    { name: "Okhla Phase 1", dist: 2.0 },
  ],
  "batra": [
    { name: "Sainik Farm (Western Avenue)", dist: 1.6 },
    { name: "Peepal Chowk", dist: 1.1 },
    { name: "Peepli Chowk", dist: 1.3 },
    { name: "Sangam Vihar Block L", dist: 1.1 },
    { name: "Tigri Gol Chakkar", dist: 1.4 },
    { name: "Devli Gaon", dist: 1.6 },
    { name: "Khanpur Village", dist: 2.0 },
    { name: "Hamdard Convention Centre", dist: 2.3 },
    { name: "Saket Metro Enclave", dist: 2.5 },
  ],
  "sainik farm": [
    { name: "Sainik Farm (Central Avenue)", dist: 1.0 },
    { name: "Neb Sarai", dist: 1.3 },
    { name: "Saket (J-Block)", dist: 2.0 },
    { name: "Freedom Fighters Enclave", dist: 2.2 },
    { name: "Khanpur", dist: 2.0 },
    { name: "Sangam Vihar Near Batra", dist: 2.1 },
    { name: "Peepli Chowk", dist: 1.8 },
  ],
  "saket": [
    { name: "Malviya Nagar Corner", dist: 1.5 },
    { name: "Hauz Rani", dist: 1.8 },
    { name: "Saidulajab", dist: 1.2 },
    { name: "Sainik Farm", dist: 2.4 },
    { name: "Sheikh Sarai Phase 1", dist: 2.5 },
  ],
  "malviya nagar": [
    { name: "Saket J Block", dist: 1.6 },
    { name: "Hauz Khas Enclave", dist: 2.1 },
    { name: "Sarvapriya Vihar", dist: 1.8 },
    { name: "Geetanjali Enclave", dist: 1.2 },
    { name: "Begumpur", dist: 1.5 },
  ],
  "uttam nagar": [
    { name: "Uttam Nagar East Metro", dist: 0.8 },
    { name: "Nawada Main Road", dist: 1.5 },
    { name: "Dwarka Mor Pillar 780", dist: 2.1 },
    { name: "Janakpuri C Block", dist: 2.4 },
    { name: "Vikaspuri Extension", dist: 2.8 },
    { name: "Milap Nagar", dist: 1.2 },
  ],
  "janakpuri": [
    { name: "Vikaspuri Outer", dist: 1.6 },
    { name: "Tilak Nagar Central Market", dist: 2.0 },
    { name: "Uttam Nagar East", dist: 2.2 },
    { name: "Hari Nagar Clock Tower", dist: 2.8 },
    { name: "Shiv Nagar", dist: 2.3 },
  ],
  "rohini": [
    { name: "Rohini Sector 7 Main Market", dist: 1.2 },
    { name: "Rohini Sector 8", dist: 1.4 },
    { name: "Rohini Sector 9 DC Chowk", dist: 1.9 },
    { name: "Prashant Vihar", dist: 2.2 },
    { name: "Pitampura (Near Metro)", dist: 2.8 },
    { name: "Rohini Sector 13", dist: 2.5 },
  ],
  "laxmi nagar": [
    { name: "Preet Vihar G Block", dist: 1.5 },
    { name: "Nirman Vihar Metro", dist: 1.8 },
    { name: "Shakarpur Main Road", dist: 1.1 },
    { name: "Pandav Nagar", dist: 2.0 },
    { name: "Mayur Vihar Phase 1 Pocket 1", dist: 3.0 },
  ],
  "preet vihar": [
    { name: "Nirman Vihar", dist: 1.2 },
    { name: "Laxmi Nagar Vikas Marg", dist: 1.6 },
    { name: "Swasthya Vihar", dist: 1.4 },
    { name: "Karkardooma", dist: 2.2 },
    { name: "Anand Vihar", dist: 3.1 },
  ],
  // Bangalore Clusters
  "koramangala": [
    { name: "HSR Layout Sector 1", dist: 2.2 },
    { name: "BTM Layout 2nd Stage", dist: 2.5 },
    { name: "Indiranagar 100 Feet Rd", dist: 3.8 },
    { name: "Ejipura Near Signal", dist: 1.2 },
    { name: "Jayanagar 4th Block", dist: 3.5 },
  ],
  "hsr layout": [
    { name: "Koramangala 1st Block", dist: 2.0 },
    { name: "BTM Layout 1st Stage", dist: 2.2 },
    { name: "Haralur Road", dist: 2.8 },
    { name: "Bellandur Gate", dist: 3.5 },
    { name: "Bommanahalli", dist: 2.6 },
  ],
  "whitefield": [
    { name: "ITPL Main Road", dist: 1.5 },
    { name: "Kadugodi", dist: 2.5 },
    { name: "Brookefield", dist: 3.2 },
    { name: "Kundalahalli Gate", dist: 3.5 },
    { name: "Marathahalli Bridge", dist: 4.2 },
  ],
  // Mumbai Clusters
  "andheri": [
    { name: "Lokhandwala Complex", dist: 1.8 },
    { name: "Versova Near Beach", dist: 2.4 },
    { name: "DN Nagar", dist: 1.6 },
    { name: "Oshiwara Link Road", dist: 2.2 },
    { name: "Vile Parle West", dist: 3.0 },
    { name: "Four Bungalows", dist: 1.9 },
  ],
  "bandra": [
    { name: "Khar West 14th Road", dist: 1.8 },
    { name: "Pali Hill", dist: 1.5 },
    { name: "Bandra Reclamation", dist: 2.2 },
    { name: "Santacruz West", dist: 2.8 },
    { name: "BKC Complex", dist: 3.4 },
  ],
};

function cacheKey(opts: {
  city: string;
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
}): string {
  const day = Math.floor(Date.now() / 86400000);
  const lat = opts.lat != null ? opts.lat.toFixed(2) : "";
  const lng = opts.lng != null ? opts.lng.toFixed(2) : "";
  const area = (opts.address || "").slice(0, 40).toLowerCase().trim();
  return `${day}|${opts.city.toLowerCase()}|${lat}|${lng}|${area}`;
}

async function callGeminiLocalities(prompt: string): Promise<NearbyLocality[] | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) return null;

  const models = ["gemini-2.0-flash", "gemini-3.6-flash", "gemini-2.5-flash", "gemini-1.5-flash"];

  for (const model of models) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: "application/json",
          },
        }),
      });
      if (!response.ok) continue;
      const json = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const raw = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      const match = raw.match(/\[[\s\S]*\]/);
      if (!match) continue;
      const parsed = JSON.parse(match[0]) as Array<{ name?: string; locality?: string; distanceKm?: number }>;
      const rows = parsed
        .map((row) => ({
          name: String(row.name || row.locality || "").trim(),
          city: "",
          distanceKm: Math.max(1, Math.min(15, Number(row.distanceKm) || 2)),
        }))
        .filter((row) => row.name.length > 2 && row.name.length < 60)
        .slice(0, 10);
      if (rows.length > 0) return rows;
    } catch {
      // try next model
    } finally {
      clearTimeout(timer);
    }
  }

  return null;
}

export function matchLocalMicroCluster(addressOrCity: string): NearbyLocality[] | null {
  const lower = addressOrCity.toLowerCase();
  for (const [key, list] of Object.entries(MICRO_CLUSTERS)) {
    if (lower.includes(key)) {
      return list.map((item) => ({
        name: item.name,
        city: "",
        distanceKm: item.dist,
      }));
    }
  }
  return null;
}

export async function suggestNearbyLocalitiesAI(opts: {
  city?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  radiusKm?: number;
}): Promise<NearbyLocality[] | null> {
  const city = (opts.city && opts.city.trim()) || "Delhi";
  const key = cacheKey({ city, lat: opts.lat, lng: opts.lng, address: opts.address });
  const hit = cache.get(key);
  if (hit) return hit;

  // 1. Fast local micro-cluster lookup first (immediate 0ms response)
  const queryStr = `${opts.address ?? ""} ${city}`;
  const matchedCluster = matchLocalMicroCluster(queryStr);
  if (matchedCluster && matchedCluster.length > 0) {
    const withCity = matchedCluster.map((r) => ({ ...r, city }));
    cache.set(key, withCity);
    return withCity;
  }

  // 2. Gemini AI prompt for smart adjacent residential areas
  const radius = opts.radiusKm ?? 8;
  const coords =
    opts.lat != null && opts.lng != null ? `GPS coordinates: ${opts.lat.toFixed(4)}, ${opts.lng.toFixed(4)}.` : "";
  const area = opts.address ? `Tutor's specific area/address: ${opts.address}.` : "";

  const prompt = `You are an expert geographical assistant for an Indian home tuition marketplace.
A home tutor is registered in city "${city}". ${area} ${coords}
Identify 8 realistic, real-life adjacent colonies, residential sectors, or well-known neighborhood landmarks within ${radius} km of this tutor.
Examples of proximity logic:
- Sangam Vihar -> Batra Hospital, Sainik Farm, Khanpur, Devli, Tigri
- Govindpuri -> Okhla Phase 1, Kalkaji, Nehru Place, CR Park, Alaknanda
- Rohini -> Pitampura, Prashant Vihar, Sector 7, Sector 9
- Janakpuri -> Uttam Nagar, Vikaspuri, Tilak Nagar
- Koramangala -> HSR Layout, BTM Layout, Indiranagar
- Andheri West -> Lokhandwala, Versova, DN Nagar, Juhu

Return ONLY a JSON array of objects:
[
  {"name": "Batra Hospital Area", "distanceKm": 1.5},
  {"name": "Sainik Farm Gate 2", "distanceKm": 2.2}
]
Rules:
- Real locality names that Indian parents and tutors recognize.
- Stay strictly within 1 to ${radius} km.
- Do NOT output the city name alone as the locality name.`;

  const rows = await callGeminiLocalities(prompt);
  if (!rows || rows.length === 0) return null;

  const withCity = rows.map((r) => ({ ...r, city }));
  cache.set(key, withCity);
  return withCity;
}
