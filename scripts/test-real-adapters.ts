/** Real-adapter smoke tests — no network, no DB, no sends. */
import assert from "node:assert/strict";
import {
  GoogleGeocoder, LiveGeminiClassifier, LiveNameChecker, parseGoogleGeocode,
} from "../lib/whatsapp-bot/pipeline/real-adapters";

let passed = 0;
function check(name: string, fn: () => void | Promise<void>) {
  return async () => { await fn(); passed += 1; console.log(`  PASS: ${name}`); };
}

const saved = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
  GOOGLE_GENAI_API_KEY: process.env.GOOGLE_GENAI_API_KEY,
  GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
};
for (const k of Object.keys(saved)) delete process.env[k];

const tests: Array<() => Promise<void>> = [
  check("geocoder without key returns null → needsReview, never throws", async () => {
    assert.equal(await new GoogleGeocoder().geocode("Sangam Vihar, Delhi"), null);
  }),
  check("Gemini classifier without key throws → deterministic fallback takes over", async () => {
    await assert.rejects(() => new LiveGeminiClassifier().classify("classify this"));
  }),
  check("name checker without key fails closed (no save)", async () => {
    assert.deepEqual(await new LiveNameChecker().isRealPersonName("Rohit Kumar"), { is_real_person_name: false, confidence: 0 });
  }),
  check("Google geocode parser extracts locality/city/coords", async () => {
    const parsed = parseGoogleGeocode({
      status: "OK",
      results: [{
        address_components: [
          { long_name: "Sangam Vihar", short_name: "Sangam Vihar", types: ["sublocality", "political"] },
          { long_name: "New Delhi", short_name: "New Delhi", types: ["locality", "political"] },
          { long_name: "Delhi", short_name: "DL", types: ["administrative_area_level_1", "political"] },
        ],
        geometry: { location: { lat: 28.5, lng: 77.2 } },
      }],
    });
    assert.equal(parsed?.locality, "Sangam Vihar");
    assert.equal(parsed?.city, "New Delhi");
    assert.equal(parsed?.lat, 28.5);
  }),
  check("failed geocode status returns null", async () => {
    assert.equal(parseGoogleGeocode({ status: "ZERO_RESULTS", results: [] }), null);
  }),
];

(async () => {
  for (const t of tests) await t();
  for (const [k, v] of Object.entries(saved)) { if (v == null) delete process.env[k]; else process.env[k] = v; }
  console.log(`\n${passed}/${tests.length} real-adapter checks passed`);
  console.log("No network call, DB write or WhatsApp send performed.");
})().catch((e) => { console.error("FAIL", e); process.exit(1); });
