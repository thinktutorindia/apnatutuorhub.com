/**
 * lib/geocoding.ts
 * Auto-geocoding utility for converting City, State, Pincode, and Address
 * into (Latitude, Longitude) coordinates using OpenStreetMap Nominatim with centroid fallbacks.
 */

export const INDIAN_CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  // Metros & Major Cities
  "delhi": { lat: 28.6139, lng: 77.2090 },
  "new delhi": { lat: 28.6139, lng: 77.2090 },
  "mumbai": { lat: 19.0760, lng: 72.8777 },
  "bengaluru": { lat: 12.9716, lng: 77.5946 },
  "bangalore": { lat: 12.9716, lng: 77.5946 },
  "hyderabad": { lat: 17.3850, lng: 78.4867 },
  "chennai": { lat: 13.0827, lng: 80.2707 },
  "kolkata": { lat: 22.5726, lng: 88.3639 },
  "pune": { lat: 18.5204, lng: 73.8567 },
  "ahmedabad": { lat: 23.0225, lng: 72.5714 },
  "jaipur": { lat: 26.9124, lng: 75.7873 },
  "lucknow": { lat: 26.8467, lng: 80.9462 },
  "chandigarh": { lat: 30.7333, lng: 76.7794 },
  "noida": { lat: 28.5355, lng: 77.3910 },
  "greater noida": { lat: 28.4744, lng: 77.5040 },
  "gurugram": { lat: 28.4595, lng: 77.0266 },
  "gurgaon": { lat: 28.4595, lng: 77.0266 },
  "ghaziabad": { lat: 28.6692, lng: 77.4538 },
  "faridabad": { lat: 28.4089, lng: 77.3178 },
  "indore": { lat: 22.7196, lng: 75.8577 },
  "bhopal": { lat: 23.2599, lng: 77.4126 },
  "patna": { lat: 25.5941, lng: 85.1376 },
  "ranchi": { lat: 23.3441, lng: 85.3096 },
  "dehradun": { lat: 30.3165, lng: 78.0322 },
  "surat": { lat: 21.1702, lng: 72.8311 },
  "nagpur": { lat: 21.1458, lng: 79.0882 },

  // Delhi NCR Localities (South Delhi)
  "sangam vihar": { lat: 28.5024, lng: 77.2458 },
  "saket": { lat: 28.5244, lng: 77.2177 },
  "malviya nagar": { lat: 28.5355, lng: 77.2090 },
  "hauz khas": { lat: 28.5494, lng: 77.2001 },
  "greater kailash": { lat: 28.5482, lng: 77.2415 },
  "gk": { lat: 28.5482, lng: 77.2415 },
  "lajpat nagar": { lat: 28.5677, lng: 77.2433 },
  "kalkaji": { lat: 28.5447, lng: 77.2588 },
  "nehru place": { lat: 28.5493, lng: 77.2529 },
  "vasant kunj": { lat: 28.5230, lng: 77.1470 },
  "vasant vihar": { lat: 28.5583, lng: 77.1583 },
  "munirka": { lat: 28.5540, lng: 77.1720 },
  "mehrauli": { lat: 28.5170, lng: 77.1840 },

  // Delhi NCR (West & Central Delhi)
  "dwarka": { lat: 28.5921, lng: 77.0460 },
  "janakpuri": { lat: 28.6219, lng: 77.0878 },
  "vikaspuri": { lat: 28.6366, lng: 77.0709 },
  "uttam nagar": { lat: 28.6219, lng: 77.0588 },
  "tilak nagar": { lat: 28.6366, lng: 77.0963 },
  "rajouri garden": { lat: 28.6492, lng: 77.1227 },
  "punjabi bagh": { lat: 28.6692, lng: 77.1314 },
  "paschim vihar": { lat: 28.6692, lng: 77.0963 },
  "karol bagh": { lat: 28.6517, lng: 77.1906 },
  "patel nagar": { lat: 28.6534, lng: 77.1645 },
  "ranjeet nagar": { lat: 28.6440, lng: 77.1647 },
  "kirti nagar": { lat: 28.6540, lng: 77.1430 },
  "moti nagar": { lat: 28.6570, lng: 77.1430 },
  "connaught place": { lat: 28.6315, lng: 77.2167 },

  // Delhi NCR (North & North West Delhi)
  "rohini": { lat: 28.7495, lng: 77.0565 },
  "pitampura": { lat: 28.6990, lng: 77.1384 },
  "shalimar bagh": { lat: 28.7166, lng: 77.1614 },
  "mukherjee nagar": { lat: 28.7125, lng: 77.2144 },
  "gtb nagar": { lat: 28.7041, lng: 77.2064 },
  "burari": { lat: 28.7532, lng: 77.1979 },
  "azadpur": { lat: 28.7071, lng: 77.1764 },
  "model town": { lat: 28.7030, lng: 77.1930 },
  "ashok vihar": { lat: 28.6920, lng: 77.1750 },
  "civil lines": { lat: 28.6810, lng: 77.2220 },

  // Delhi NCR (East Delhi, Ghaziabad, Noida)
  "laxmi nagar": { lat: 28.6315, lng: 77.2773 },
  "mayur vihar": { lat: 28.6079, lng: 77.2970 },
  "preet vihar": { lat: 28.6415, lng: 77.2970 },
  "anand vihar": { lat: 28.6469, lng: 77.3160 },
  "dilshad garden": { lat: 28.6811, lng: 77.3208 },
  "shahdara": { lat: 28.6738, lng: 77.2917 },
  "vasundhara": { lat: 28.6648, lng: 77.3896 },
  "indirapuram": { lat: 28.6415, lng: 77.3714 },
  "vaishali": { lat: 28.6469, lng: 77.3415 },
  "kaushambi": { lat: 28.6430, lng: 77.3270 },

  // Other Metro Popular Areas
  "koramangala": { lat: 12.9352, lng: 77.6245 },
  "indiranagar": { lat: 12.9784, lng: 77.6408 },
  "whitefield": { lat: 12.9698, lng: 77.7500 },
  "hsr layout": { lat: 12.9121, lng: 77.6446 },
  "andheri": { lat: 19.1136, lng: 72.8697 },
  "bandra": { lat: 19.0596, lng: 72.8295 },
  "powai": { lat: 19.1176, lng: 72.9060 },
  "juhu": { lat: 19.1075, lng: 72.8263 },
  "kothrud": { lat: 18.5074, lng: 73.8077 },
  "hinjewadi": { lat: 18.5913, lng: 73.7389 },
  "gachibowli": { lat: 17.4401, lng: 78.3489 },
  "madhapur": { lat: 17.4483, lng: 78.3915 },
};

/**
 * Fast synchronous coordinate resolver for Indian localities and cities.
 * Sub-millisecond lookup for instant distance calculations.
 */
export function resolveLocationCoordinates(query?: string | null): { lat: number; lng: number } | null {
  if (!query) return null;
  const clean = query.trim().toLowerCase().replace(/[,–-]/g, " ");

  // 1. Direct exact match
  if (INDIAN_CITY_COORDINATES[clean]) {
    return INDIAN_CITY_COORDINATES[clean];
  }

  // 2. Substring match across all known locality keys
  for (const [key, coords] of Object.entries(INDIAN_CITY_COORDINATES)) {
    if (clean.includes(key) || key.includes(clean)) {
      return coords;
    }
  }

  // 3. Check individual tokens
  const tokens = clean.split(/\s+/).filter((t) => t.length >= 4);
  for (const t of tokens) {
    if (INDIAN_CITY_COORDINATES[t]) {
      return INDIAN_CITY_COORDINATES[t];
    }
  }

  return null;
}


export async function geocodeLocation(params: {
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
}): Promise<{ lat: number; lng: number } | null> {
  const { address, city, state, pincode } = params;

  // Build query string
  const queryParts = [address, city, state, pincode, "India"].filter(Boolean);
  if (queryParts.length === 0) return null;

  const searchQuery = queryParts.join(", ");

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        searchQuery
      )}&limit=1`,
      {
        headers: {
          "User-Agent": "ApnaTutorHub-Geocoding-Engine/1.0 (support@apnatutorhub.com)",
        },
        next: { revalidate: 86400 }, // Cache 24h
      }
    );

    if (res.ok) {
      const data = (await res.json()) as { lat: string; lon: string }[];
      if (data.length > 0 && data[0].lat && data[0].lon) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
        };
      }
    }
  } catch (err) {
    console.warn("[geocoding] Nominatim fetch failed, using fallback:", err);
  }

  // Fallback to city centroid lookup
  if (city) {
    const key = city.trim().toLowerCase();
    if (INDIAN_CITY_COORDINATES[key]) {
      return INDIAN_CITY_COORDINATES[key];
    }
  }

  return null;
}
