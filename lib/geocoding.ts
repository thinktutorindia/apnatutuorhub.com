/**
 * lib/geocoding.ts
 * Auto-geocoding utility for converting City, State, Pincode, and Address
 * into (Latitude, Longitude) coordinates using OpenStreetMap Nominatim with centroid fallbacks.
 */

const INDIAN_CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
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
  "gurugram": { lat: 28.4595, lng: 77.0266 },
  "gurgaon": { lat: 28.4595, lng: 77.0266 },
  "indore": { lat: 22.7196, lng: 75.8577 },
  "bhopal": { lat: 23.2599, lng: 77.4126 },
  "patna": { lat: 25.5941, lng: 85.1376 },
  "ranchi": { lat: 23.3441, lng: 85.3096 },
  "dehradun": { lat: 30.3165, lng: 78.0322 },
  "surat": { lat: 21.1702, lng: 72.8311 },
  "nagpur": { lat: 21.1458, lng: 79.0882 },
};

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
