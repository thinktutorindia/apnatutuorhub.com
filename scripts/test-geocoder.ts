/**
 * Geocoder stack tests — injected fakes only. No network, DB or sends.
 * Run: node node_modules/tsx/dist/cli.mjs scripts/test-geocoder.ts
 */
import assert from "node:assert/strict";
import { StackGeocoder, type TextSplitter } from "../lib/whatsapp-bot/pipeline/geocoder";
import { validateLocation, validateLocationPin } from "../lib/whatsapp-bot/pipeline/validators";

let passed = 0;
async function check(name: string, fn: () => void | Promise<void>) {
  await fn(); passed += 1; console.log(`  PASS: ${name}`);
}

const splitter = (value: ReturnType<TextSplitter["split"]>): TextSplitter => ({ split: async () => value });

(async () => {
  await check('"Sangam Vihar, New Delhi near Kumar Sweet" accepted with locality + landmark', async () => {
    const g = new StackGeocoder(splitter(null), undefined, {
      staticLookup: () => null,
      forward: async () => ({ lat: 28.5, lng: 77.2 }),
      reverse: async () => null,
    });
    const r = await validateLocation("Sangam Vihar, New Delhi near Kumar Sweet", g);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.locality, "Sangam Vihar");
    assert.equal(r.value.city, "New Delhi");
    assert.equal(r.value.landmark, "Kumar Sweet");
    assert.equal(r.value.geo_source, "nominatim");
    assert.equal(r.needsReview, false);
  });

  await check('"Delhi" city-only still rejected before any geocode', async () => {
    let called = false;
    const g = new StackGeocoder(splitter(null), undefined, {
      staticLookup: () => { called = true; return { lat: 1, lng: 1 }; },
      forward: async () => ({ lat: 1, lng: 1 }),
      reverse: async () => null,
    });
    assert.equal((await validateLocation("Delhi", g)).ok, false);
    assert.equal(called, false);
  });

  await check("Nominatim down → needs_review, no crash", async () => {
    const g = new StackGeocoder(splitter(null), undefined, {
      staticLookup: () => null,
      forward: async () => null,
      reverse: async () => null,
    });
    const r = await validateLocation("Rohini Sector 24, Delhi", g);
    assert.equal(r.ok, true);
    assert.equal(r.needsReview, true);
    if (r.ok) { assert.equal(r.value.lat, null); assert.equal(r.value.geo_source, "none"); }
  });

  await check("Gemini invalid JSON → fallback, never stored coordinates", async () => {
    const g = new StackGeocoder(splitter(null), undefined, {
      staticLookup: () => null,
      forward: async () => null,
      reverse: async () => null,
    });
    const r = await validateLocation("16 No Gali, Ratiya Marg Road", g);
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value.lat, null);
  });

  await check("Gemini text split → Nominatim retry supplies coords", async () => {
    let calls = 0;
    const g = new StackGeocoder(
      splitter({ locality: "Sangam Vihar", city: "New Delhi", landmark: "Kumar Sweet" }),
      undefined,
      {
        staticLookup: () => null,
        forward: async () => { calls += 1; return calls >= 2 ? { lat: 28.5, lng: 77.2 } : null; },
        reverse: async () => null,
      }
    );
    const r = await validateLocation("Sangam Vihar near Kumar Sweet, New Delhi", g);
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.lat, 28.5);
      assert.equal(r.value.geo_source, "nominatim");
      assert.equal(r.value.landmark, "Kumar Sweet");
    }
    assert.equal(calls, 2);
  });

  await check("static city list produces geo_source static", async () => {
    const g = new StackGeocoder(splitter(null), undefined, {
      staticLookup: () => ({ lat: 28.61, lng: 77.21 }),
      forward: async () => null,
      reverse: async () => null,
    });
    const r = await validateLocation("Rohini, Delhi", g);
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value.geo_source, "static");
  });

  await check("WhatsApp pin keeps exact coords, geo_source pin", async () => {
    const g = new StackGeocoder(splitter(null), undefined, {
      staticLookup: () => null,
      forward: async () => null,
      reverse: async () => ({ locality: "Sangam Vihar", city: "New Delhi" }),
    });
    const r = await validateLocationPin(28.5123, 77.2012, g);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.lat, 28.5123);
    assert.equal(r.value.lng, 77.2012);
    assert.equal(r.value.locality, "Sangam Vihar");
    assert.equal(r.value.geo_source, "pin");
  });

  console.log(`\n${passed}/7 geocoder checks passed`);
  console.log("No network call, DB write or WhatsApp send performed.");
})().catch((e) => { console.error("FAIL", e); process.exit(1); });
