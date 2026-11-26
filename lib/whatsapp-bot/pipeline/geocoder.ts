/**
 * Pipeline geocoder — wraps the EXISTING stack. No Google Maps by default.
 *
 * resolveLocationCoordinates() (static city list)
 *   → geocodeLocation() (Nominatim, 24h cache, countrycodes=in, <=1 req/s)
 *   → Gemini text split ONLY (locality/city/landmark, never coordinates)
 *   → Nominatim retry on the cleaned locality
 *
 * Google Geocoder stays OPTIONAL and is used only when GOOGLE_MAPS_API_KEY is set.
 */
import { GEMINI_TEXT_MODEL_CASCADE, getGeminiApiKey } from "@/lib/gemini-models";
import { geocodeLocation, resolveLocationCoordinates, reverseGeocodeLocation } from "@/lib/geocoding";
import type { Geocoder, GeoResult } from "./validators";

export interface TextSplitter {
  split(raw: string): Promise<{ locality?: string; city?: string; landmark?: string } | null>;
}

export class GeminiTextSplitter implements TextSplitter {
  async split(raw: string): Promise<{ locality?: string; city?: string; landmark?: string } | null> {
    const key = getGeminiApiKey();
    if (!key) return null;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10_000);
      let res: Response;
      try {
        res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TEXT_MODEL_CASCADE[0]}:generateContent?key=${encodeURIComponent(key)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text:
                `Split this Indian location into JSON ONLY: {"locality":"...","city":"...","landmark":"..."}. ` +
                `Do NOT invent coordinates. Text: ${JSON.stringify(raw)}` }] }],
              generationConfig: { temperature: 0, responseMimeType: "application/json" },
            }),
          }
        );
      } finally {
        clearTimeout(timer);
      }
      if (!res.ok) return null;
      const body = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
      const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
      const parsed = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, "")) as Record<string, unknown>;
      if (!parsed || typeof parsed !== "object") return null;
      const out = {
        locality: typeof parsed.locality === "string" ? parsed.locality.trim() : undefined,
        city: typeof parsed.city === "string" ? parsed.city.trim() : undefined,
        landmark: typeof parsed.landmark === "string" ? parsed.landmark.trim() : undefined,
      };
      return out.locality || out.city || out.landmark ? out : null;
    } catch {
      return null; // invalid JSON / timeout / no key → deterministic fallback
    }
  }
}

function localityFromText(raw: string): string {
  return raw.split(",")[0].trim() || raw.trim();
}

export type GeocodeDeps = {
  staticLookup?: (value: string) => { lat: number; lng: number } | null;
  forward?: (params: { address?: string | null; city?: string | null; cityHint?: string | null }) => Promise<{ lat: number; lng: number } | null>;
  reverse?: (lat: number, lng: number) => Promise<{ locality: string | null; city: string | null } | null>;
};

export class StackGeocoder implements Geocoder {
  private readonly deps: Required<GeocodeDeps>;

  constructor(
    private readonly splitter: TextSplitter = new GeminiTextSplitter(),
    private readonly google?: Geocoder,
    deps: GeocodeDeps = {}
  ) {
    this.deps = {
      staticLookup: deps.staticLookup ?? resolveLocationCoordinates,
      forward: deps.forward ?? geocodeLocation,
      reverse: deps.reverse ?? reverseGeocodeLocation,
    };
  }

  async geocode(raw: string, knownCity?: string | null): Promise<GeoResult | null> {
    const locality = localityFromText(raw);
    const cityHint = knownCity?.trim() || null;

    // 1. Static city/locality dictionary.
    const staticCoords = this.deps.staticLookup(raw) || this.deps.staticLookup(locality) || (cityHint ? this.deps.staticLookup(cityHint) : null);
    if (staticCoords) {
      return { locality, city: cityHint, lat: staticCoords.lat, lng: staticCoords.lng, geo_source: "static", needsReview: false };
    }

    // 2. Nominatim on the raw locality + city hint.
    const first = await this.deps.forward({ address: locality, city: cityHint, cityHint });
    if (first) {
      return { locality, city: cityHint, lat: first.lat, lng: first.lng, geo_source: "nominatim", needsReview: false };
    }

    // Optional Google adapter (only when a key is configured) — used for TEXT cleanup,
    // never as a coordinate source recorded in geo_source.
    let cleaned: { locality?: string; city?: string; landmark?: string } | null = null;
    if (this.google && process.env.GOOGLE_MAPS_API_KEY) {
      const g = await this.google.geocode(raw, cityHint);
      if (g) cleaned = { locality: g.locality ?? undefined, city: g.city || cityHint || undefined, landmark: g.landmark ?? undefined };
    }

    // 3. Gemini splits TEXT ONLY.
    cleaned ??= await this.splitter.split(raw);
    if (!cleaned) return null;

    // 4. Retry Nominatim on the cleaned locality. Gemini never supplies coordinates.
    const retry = await this.deps.forward({
      address: cleaned.locality,
      city: cleaned.city || cityHint,
      cityHint: cleaned.city || cityHint,
    });
    return {
      locality: cleaned.locality || locality,
      city: cleaned.city || cityHint || null,
      landmark: cleaned.landmark,
      lat: retry?.lat ?? null,
      lng: retry?.lng ?? null,
      geo_source: retry ? "nominatim" : "gemini-text",
      needsReview: !retry,
    };
  }

  async geocodePin(lat: number, lng: number): Promise<GeoResult | null> {
    const resolved = await this.deps.reverse(lat, lng);
    return {
      locality: resolved?.locality ?? "",
      city: resolved?.city ?? null,
      lat,
      lng,
      geo_source: "pin",
      needsReview: !resolved,
    };
  }
}
