/**
 * PREPARED ONLY — DO NOT RUN until keys are provided and you explicitly confirm.
 *
 * Second replay: 300–500 real threads through LiveGeminiClassifier + GoogleGeocoder
 * + DnsMxLookup. No WhatsApp sends, no DB writes.
 *
 * Run (only after approval):
 *   node node_modules/tsx/dist/cli.mjs scripts/offline_replay_live.ts --i-provided-keys
 */
import * as fs from "fs";
import { classify } from "../lib/whatsapp-bot/pipeline/classifier";
import { validateEmail, validateLocation } from "../lib/whatsapp-bot/pipeline/validators";
import { LiveGeminiClassifier, GoogleGeocoder, DnsMxLookup } from "../lib/whatsapp-bot/pipeline/real-adapters";

if (!process.argv.includes("--i-provided-keys")) {
  console.error("PREPARED ONLY: pass --i-provided-keys after supplying GEMINI_API_KEY and GOOGLE_MAPS_API_KEY.");
  process.exit(1);
}
if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY && !process.env.GOOGLE_GENAI_API_KEY) {
  console.error("Gemini key missing. Refusing to run.");
  process.exit(1);
}
if (!process.env.GOOGLE_MAPS_API_KEY) {
  console.error("GOOGLE_MAPS_API_KEY missing. Refusing to run.");
  process.exit(1);
}

const LIMIT = 400;
const SRC = "exports/whatsapp_all_chats_2026-11-26.json";
const OUT = "exports/offline_replay_live_report.json";

async function main() {
  const data = JSON.parse(fs.readFileSync(SRC, "utf8")) as {
    users: Array<{ phone: string; messages: Array<{ atUTC: string; direction: string; body: string }> }>;
  };
  const gemini = new LiveGeminiClassifier();
  const geocoder = new GoogleGeocoder();
  const mx = new DnsMxLookup();
  const rows: unknown[] = [];

  outer: for (const user of data.users) {
    const inbound = user.messages.filter((m) => m.direction === "INBOUND");
    for (const msg of inbound) {
      if (rows.length >= LIMIT) break outer;
      const text = msg.body?.trim();
      if (!text) continue;
      const c = await classify(text, { gemini });
      const probe: Record<string, unknown> = { phone: user.phone, message: text.slice(0, 300), classification: c };
      if (c.extracted.email?.value) probe.emailValidation = await validateEmail(c.extracted.email.value, mx);
      if (c.extracted.location?.value) probe.locationGeocode = await validateLocation(c.extracted.location.value, geocoder);
      rows.push(probe);
    }
  }

  const report = { generatedAt: new Date().toISOString(), source: SRC, mode: "live-keys", count: rows.length, rows };
  fs.mkdirSync("exports", { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2), "utf8");
  console.log("wrote", OUT, `${rows.length} rows`);
}

main().catch((e) => { console.error(e); process.exit(1); });
