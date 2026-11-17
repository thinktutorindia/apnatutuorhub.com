/**
 * Submit a new Meta WhatsApp template `tutor_subject_classes_ask` for approval
 * via the Pinbot (Aqua) API. Tries the plausible template-management endpoints
 * (none are documented) and prints the first working one + full response.
 *
 * Run: npx tsx --env-file=.env scripts/meta_subject_template_submit.ts
 */
import * as fs from "fs";

const cfg: Record<string, string> = {};
for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = line.match(/^(AQUA_WHATSAPP_[A-Z_]+)=(.*)$/);
  if (m) cfg[m[1]] = m[2].replace(/^"|"$/g, "");
}
const BASE = (cfg.AQUA_WHATSAPP_API_BASE || "").replace(/\/$/, "");
const TOKEN = cfg.AQUA_WHATSAPP_SYSTEM_TOKEN || "";
const PHONE_ID = cfg.AQUA_WHATSAPP_PHONE_NUMBER_ID || "";

const TEMPLATE_NAME = "tutor_subject_classes_ask";

const BODY_TEXT = [
  "Hi {{1}}! 👋",
  "",
  "We could not find the SUBJECTS and CLASSES you teach on your ApnaTutorHub profile.",
  "",
  "Please reply with:",
  "1️⃣ Subjects you teach (e.g. Maths, Science, English, Hindi)",
  "2️⃣ Classes you teach (e.g. Class 6-10, Class 11-12)",
  "",
  "Example: Maths & Science, Class 6-10",
  "",
  "— Team ApnaTutorHub",
].join("\n");

const payload = {
  name: TEMPLATE_NAME,
  category: "MARKETING",
  language: "en",
  components: [
    {
      type: "BODY",
      text: BODY_TEXT,
      example: { body_text: [["Rohit"]] },
    },
  ],
};

async function tryEndpoint(path: string): Promise<void> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", systemtoken: TOKEN, apikey: TOKEN },
      body: JSON.stringify(payload),
    });
    const raw = await res.text();
    console.log(`\nPOST ${path} → HTTP ${res.status}`);
    console.log(raw.slice(0, 600) || "(empty body)");
  } catch (e) {
    console.log(`\nPOST ${path} → ERROR: ${String(e).slice(0, 200)}`);
  }
}

async function main() {
  console.log(`Submitting Meta template "${TEMPLATE_NAME}" (category MARKETING, language en)`);
  console.log(`Base: ${BASE} · PhoneID: ${PHONE_ID}`);
  const candidates = [
    `/api/v1/message_templates`,
    `/v3/${PHONE_ID}/message_templates`,
    `/message_templates`,
    `/api/message_templates`,
    `/templates`,
    `/api/templates`,
    `/v3/${PHONE_ID}/templates`,
    `/api/v1/templates`,
  ];
  for (const p of candidates) {
    await tryEndpoint(p);
  }
  console.log("\nDone — check which endpoint returned a non-404/non-401 response.");
}
main().catch((e) => { console.error(e); process.exit(1); });
