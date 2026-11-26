/** Read-only breakdown of messages the fallback classifier labels intent "other". */
import * as fs from "fs";
import { classify } from "../lib/whatsapp-bot/pipeline/classifier";

(async () => {
const data = JSON.parse(fs.readFileSync("exports/whatsapp_all_chats_2026-11-26.json", "utf8")) as {
  users: Array<{ messages: Array<{ direction: string; body: string }> }>;
};

const BUCKETS: Array<[string, RegExp]> = [
  ["greeting", /^(?:hi|hello|hey|namaste|good (?:morning|evening)|hii|heelo)\b/i],
  ["affirmative_short", /^(?:yes|haan|han|ha|1|2|ok|okay|thanks|👍|🙏)$/i],
  ["promo_or_forward", /(?:https?:\/\/|www\.|products?|download|fwd:|forwarded|thank you for contacting|requirement #)/i],
  ["inquiry_id_or_number", /^#?\d{4,8}$/],
  ["single_name_like", /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}$/],
  ["class_subject_fragment", /\b(?:class|grade|maths|science|physics|chemistry|biology|all subjects|nursery)\b/i],
  ["location_fragment", /\b(?:delhi|noida|gurgaon|mumbai|sector|vihar|colony|gali|road|near)\b/i],
  ["question_unclassified", /\?|\b(?:what|how|why|where|kya|kaise|kitna|batao)\b/i],
  ["very_short", /^.{1,3}$/],
];

const counts: Record<string, number> = {};
const examples: Record<string, string[]> = {};
let total = 0;
for (const u of data.users) {
  for (const m of u.messages) {
    if (m.direction !== "INBOUND") continue;
    const text = (m.body ?? "").trim();
    if (!text) continue;
    const c = await classify(text);
    if (c.intent !== "other") continue;
    total += 1;
    const bucket = BUCKETS.find(([, re]) => re.test(text))?.[0] ?? "unclassified_rest";
    counts[bucket] = (counts[bucket] ?? 0) + 1;
    (examples[bucket] ??= []).push(text.slice(0, 100));
  }
}
const rest = examples.unclassified_rest ?? [];
const step = Math.max(1, Math.floor(rest.length / 50));
const sample50 = rest.filter((_, i) => i % step === 0).slice(0, 50);
console.log(JSON.stringify({
  totalOther: total,
  buckets: counts,
  examples: Object.fromEntries(Object.entries(examples).map(([k, v]) => [k, v.slice(0, 4)])),
  unclassifiedRestSample50: sample50,
}, null, 2));
})().catch((e) => { console.error(e); process.exit(1); });
