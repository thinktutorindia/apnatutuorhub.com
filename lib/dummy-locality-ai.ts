/**
 * Gemini-backed nearby locality picker for dummy lead notifications.
 * Cached per city / rounded GPS / calendar day so a campaign does not
 * burn one API call per tutor.
 */

type NearbyLocality = { name: string; city: string; distanceKm: number };

const cache = new Map<string, NearbyLocality[]>();

function cacheKey(opts: {
  city: string;
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
}): string {
  const day = Math.floor(Date.now() / 86400000);
  const lat = opts.lat != null ? opts.lat.toFixed(2) : "";
  const lng = opts.lng != null ? opts.lng.toFixed(2) : "";
  const area = (opts.address || "").slice(0, 40).toLowerCase();
  return `${day}|${opts.city.toLowerCase()}|${lat}|${lng}|${area}`;
}

async function callGeminiLocalities(prompt: string): Promise<NearbyLocality[] | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) return null;

  const models = ["gemini-2.0-flash", "gemini-3.6-flash", "gemini-2.5-flash"];

  for (const model of models) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
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
          distanceKm: Math.max(1, Math.min(25, Number(row.distanceKm) || 2)),
        }))
        .filter((row) => row.name.length > 1 && row.name.length < 60)
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

  const radius = opts.radiusKm ?? 10;
  const coords =
    opts.lat != null && opts.lng != null ? `GPS ${opts.lat.toFixed(4)}, ${opts.lng.toFixed(4)}.` : "";
  const area = opts.address ? `Tutor area: ${opts.address}.` : "";

  const prompt = `You are helping an Indian home-tuition marketplace.
Return ONLY a JSON array of 8 real neighbourhoods / colonies / sectors near this tutor.
City: ${city}. ${coords} ${area}
Stay within about ${radius} km. Use real place names parents would recognise.
Each item: {"name":"Malviya Nagar","distanceKm":3}
Do not invent fantasy names. Do not include the city name as the locality.`;

  const rows = await callGeminiLocalities(prompt);
  if (!rows || rows.length === 0) return null;

  const withCity = rows.map((r) => ({ ...r, city }));
  cache.set(key, withCity);
  return withCity;
}
