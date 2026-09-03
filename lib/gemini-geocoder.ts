/**
 * lib/gemini-geocoder.ts
 *
 * Gemini-backed Geocoding service for Indian tutor & tuition locations.
 * Uses GEMINI_API_KEY / GOOGLE_API_KEY to resolve real latitude & longitude
 * for addresses, localities, landmarks, and pincodes when GPS coordinates are missing.
 *
 * Includes fast in-memory caching to ensure sub-millisecond repeated responses.
 */

export interface GeocodedLocation {
  lat: number;
  lng: number;
  formattedAddress?: string;
  city?: string;
  pincode?: string;
}

const geocodeCache = new Map<string, GeocodedLocation>();

function normalizeKey(address: string, city?: string | null, pincode?: string | null): string {
  return `${(address || "").trim().toLowerCase()}|${(city || "").trim().toLowerCase()}|${(pincode || "").trim()}`;
}

/**
 * Known Indian major hub coordinates fallback if AI is offline
 */
const KNOWN_CITY_CENTERS: Record<string, { lat: number; lng: number }> = {
  delhi: { lat: 28.6139, lng: 77.2090 },
  "new delhi": { lat: 28.6139, lng: 77.2090 },
  noida: { lat: 28.5355, lng: 77.3910 },
  gurgaon: { lat: 28.4595, lng: 77.0266 },
  gurugram: { lat: 28.4595, lng: 77.0266 },
  ghaziabad: { lat: 28.6692, lng: 77.4538 },
  faridabad: { lat: 28.4089, lng: 77.3178 },
  mumbai: { lat: 19.0760, lng: 72.8777 },
  bangalore: { lat: 12.9716, lng: 77.5946 },
  bengaluru: { lat: 12.9716, lng: 77.5946 },
  hyderabad: { lat: 17.3850, lng: 78.4867 },
  pune: { lat: 18.5204, lng: 73.8567 },
  kolkata: { lat: 22.5726, lng: 88.3639 },
  chennai: { lat: 13.0827, lng: 80.2707 },
  jaipur: { lat: 26.9124, lng: 75.7873 },
  lucknow: { lat: 26.8467, lng: 80.9462 },
  chandigarh: { lat: 30.7333, lng: 76.7794 },
};

/**
 * Geocodes an address/locality using Gemini AI with fallback to city centers.
 */
export async function geocodeAddressWithGemini(opts: {
  address?: string | null;
  city?: string | null;
  pincode?: string | null;
  state?: string | null;
}): Promise<GeocodedLocation | null> {
  const address = opts.address?.trim() || "";
  const city = opts.city?.trim() || "";
  const pincode = opts.pincode?.trim() || "";

  if (!address && !city && !pincode) return null;

  const key = normalizeKey(address, city, pincode);
  const cached = geocodeCache.get(key);
  if (cached) return cached;

  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY;

  if (apiKey) {
    const models = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-1.5-flash"];
    const query = [address, city, opts.state, pincode, "India"].filter(Boolean).join(", ");

    const prompt = `Return the approximate GPS coordinates (latitude and longitude) for this location in India: "${query}".
Return ONLY a valid JSON object matching this schema:
{"lat": 28.5152, "lng": 77.2340, "formattedAddress": "Sainik Farm, New Delhi", "city": "Delhi", "pincode": "110062"}`;

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
              temperature: 0.1,
              responseMimeType: "application/json",
            },
          }),
        });

        if (!response.ok) continue;

        const json = (await response.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        const raw = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        const match = raw.match(/\{[\s\S]*\}/);
        if (!match) continue;

        const parsed = JSON.parse(match[0]) as {
          lat?: number;
          lng?: number;
          formattedAddress?: string;
          city?: string;
          pincode?: string;
        };

        if (typeof parsed.lat === "number" && typeof parsed.lng === "number") {
          const result: GeocodedLocation = {
            lat: parsed.lat,
            lng: parsed.lng,
            formattedAddress: parsed.formattedAddress || query,
            city: parsed.city || city,
            pincode: parsed.pincode || pincode,
          };
          geocodeCache.set(key, result);
          return result;
        }
      } catch {
        // try next model
      } finally {
        clearTimeout(timer);
      }
    }
  }

  // Fallback to known city center if city is recognized
  const lowerCity = city.toLowerCase();
  if (KNOWN_CITY_CENTERS[lowerCity]) {
    const center = KNOWN_CITY_CENTERS[lowerCity];
    const result: GeocodedLocation = {
      lat: center.lat,
      lng: center.lng,
      city,
      pincode,
    };
    geocodeCache.set(key, result);
    return result;
  }

  return null;
}
