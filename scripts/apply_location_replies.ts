/**
 * Location-reply harvester: scan inbound WhatsApp messages from the tutors
 * we sent the location-ask to, parse their replied area/locality, and refresh
 * TutorProfile (address/city). Latest reply always wins — no skip-if-filled.
 *
 * Run: npx tsx --env-file=.env scripts/apply_location_replies.ts
 * Dry: npx tsx --env-file=.env scripts/apply_location_replies.ts --dry
 */
import * as fs from "fs";
import { PrismaClient } from "@prisma/client";
import { isJunkLocality } from "../lib/whatsapp-bot/leads-helper";
import { stripAddressJunk } from "../lib/format-rich-nearby-location";
import { INDIAN_CITY_COORDINATES } from "../lib/geocoding";

const prisma = new PrismaClient();
const DRY = process.argv.includes("--dry");
/** --days N: scan inbound messages from the last N days (default 1). */
const DAYS = (() => {
  const i = process.argv.indexOf("--days");
  return i >= 0 ? Math.max(1, parseInt(process.argv[i + 1] || "1", 10) || 1) : 1;
})();

/** flattened locality keys ("laxminagar" ← "laxmi nagar") for fuzzy place check */
const FLAT_KEYS = new Set(
  Object.keys(INDIAN_CITY_COORDINATES).map((k) => k.replace(/\s+/g, "").toLowerCase())
);

const NCR_CITY_RE =
  /\b(new delhi|delhi|noida|greater noida|gurgaon|gurugram|ghaziabad|faridabad|loni)\b/i;

function cleanDisplayPhone(phone: string | null | undefined): string {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

function titleCase(s: string): string {
  return String(s || "").trim().split(/\s+/).filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

/** TRUE sublocality check (same rule as the ask scripts). */
function isGenericLocationText(text: string): boolean {
  const t = (text || "").toLowerCase();
  if (!t.trim()) return true;
  const stripped = t
    .replace(/\b(north|south|east|west|new|old|upper|lower)\b/g, "")
    .replace(/\b(delhi|delhi\s*ncr|ncr|noida|greater\s+noida|gurgaon|gurugram|ghaziabad|faridabad|loni)\b/g, "")
    .replace(/\b(haryana|uttar\s+pradesh|india|up)\b/g, "")
    .replace(/[\s,.\-–/]/g, "");
  return stripped.length === 0;
}

function isJunkLocalityText(loc: string, tutorName?: string): boolean {
  const l = (loc || "").toLowerCase().trim();
  if (!l || l.length < 3) return true;
  if (/^(noted|sorry|nhi|nahi|nothing|none|pending|mention it|not mentioned|na|no|yes|ok|okay|hk|thik|theek|wait|later|soon|skip|pass|abcd)\b/.test(l)) return true;
  if (/location at|current location|my location|coordinates/.test(l)) return true;
  if (/\d{1,3}\.\d{3,}.*\d{1,3}\.\d{3,}/.test(l)) return true;
  if (/^(north|south|east|west)\s*(,|\band\b|\.)?\s*(and)?\s*,?\s*\.?$/.test(l)) return true;
  if (/\b(mathematics|maths|physics|chemistry|science|biology|iit|jee|neet|online)\b/.test(l)) return true;
  if (/\b\d+\s*km\b|from\s+border|anything\s+else|^outside$/.test(l)) return true;
  if (/\balpha\b|\bbeta\b/.test(l)) return true;
  if (tutorName && l === tutorName.toLowerCase().trim()) return true;
  return false;
}

function canonicalCity(city: string): string {
  const l = (city || "").toLowerCase().trim();
  if (l === "new delhi" || l === "delhi ncr") return "Delhi";
  if (l === "gurgaon") return "Gurugram";
  if (l === "loni") return "Ghaziabad";
  if (/\b(delhi|loni road)\b/.test(l)) return "Delhi";
  return titleCase(l);
}

/** CSV helper */
function parseCsv(path: string): string[][] {
  const text = fs.readFileSync(path, "utf8").replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let cur = "", row: string[] = [], inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQ = false;
      else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ",") { row.push(cur); cur = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cur); cur = "";
      if (row.some((c) => c !== "")) rows.push(row);
      row = [];
    } else cur += ch;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

/** Phones we actually SENT the location-ask to (all 3 batches). */
function askedPhones(): Set<string> {
  const out = new Set<string>();
  for (const p of ["exports/location_ask_blast_results.csv", "exports/generic_location_ask_results.csv", "exports/generic_location_ask2_results.csv", "exports/baddata_notasked7_results.csv"]) {
    if (!fs.existsSync(p)) continue;
    const rows = parseCsv(p);
    const header = rows[0];
    const iPhone = header.findIndex((h) => /phone/i.test(h));
    const iStatus = header.findIndex((h) => /^status$/i.test(h));
    for (const r of rows.slice(1)) {
      if (iStatus >= 0 && (r[iStatus] || "").toLowerCase() !== "sent") continue;
      const d = cleanDisplayPhone(r[iPhone] || "");
      if (d.length === 10) out.add(d);
    }
  }
  return out;
}

// ── Reply → location parsing ────────────────────────────────────────────────
const LOCALITY_TOKEN_RE =
  /\b(sector|blk\.?|block|pocket|phase|nagar|vihar|colony|enclave|ext|extension|extn|puram|puri|bagh|garden|market|chowk|kunj|marg|road|street|park|place|dwarka|rohini|pitampura|paschim|punjabi|rajouri|karol|patel|laxmi|lakshmi|mayur|preet|anand|dilshad|shahdara|vasundhara|indirapuram|vaishali|kaushambi|model\s+town|gtb|mukherjee|civil\s+lines|burari|saket|hauz\s+khas|malviya|greater\s+kailash|lajpat|kalkaji|nehru\s+place|okhla|badarpur|sarita|jasola|alaknanda|chittaranjan|tughlakabad|sainik\s+farm|chhatarpur|mahipalpur|palam|najafgarh|nangloi|narela|munirka|khanpur|govindpuri|niti|kondli|trilok|baljit|karkardooma|krishna\s+nagar|gandhi\s+nagar|shakarpur|geeta\s+colony|ahinsa\s+khand|raj\s+nagar|uttam|tilak|moti|kirti|subhash|ashok|pushp|bindapur|matiala|dabri|jwala|heri|mahavir|peera\s+garhi|sultanpuri|kirari|nithari|harola|jamia|seelampur|yamuna|timarpur|kingsway|du\s+campus|campus|madhuban|ganesh\s+nagar|laxmi|paharganj|karol\s+bagh|ballabhgarh|old\s+delhi|new\s+delhi)\b/i;

const CHAT_NOISE_RE =
  /reply\s+stop|apnatutorhub\.com|1️⃣|2️⃣|3️⃣|unlock|membership|vip\s+plan|contact\s+080|template|hello!?|please\s+(?:check|share)|\bok\b|\bokay\b|\bthanks?\b|thank\s+you|\bstop\b|\bstart\b|\bhi\b|\bhello\b|\bbye\b|\bhelp\b|dedo|chahiye|bhejo|kahan|kya\s+haal/i;

const SUBJECT_NOISE_RE =
  /\b(math|maths|mathematics|science|physics|chemistry|bio|english|hindi|subject|subjects|class|classes|tuition|fees?|contact|number|teach|teaching|spanish|unable|need|want|online|tutor)\b/i;

/** Does this text look like an actual place? (resolvable or has a locality token) */
function looksLikePlace(text: string): boolean {
  const clean = (text || "").toLowerCase().replace(/[,–\-/.]/g, " ").trim();
  if (!clean || clean.length < 3) return false;
  if (LOCALITY_TOKEN_RE.test(clean)) return true;
  if (/\b(delhi|noida|greater noida|gurgaon|gurugram|ghaziabad|faridabad)\b/.test(clean)) return true;
  if (FLAT_KEYS.has(clean.replace(/\s+/g, ""))) return true;
  return false;
}

/** Strip numbered-list / label prefixes like "4. Address: X" and empty "()" junk. */
function cleanReplyLocation(text: string): string {
  let out = String(text || "").trim();
  for (let i = 0; i < 3; i++) {
    const next = out
      .replace(/^\s*\d{1,2}\s*[.)]\s*/, "")
      .replace(/^\s*(?:full\s+)?(?:address|area|location|locality|residence|city)\s*[:=-]\s*/i, "")
      .trim();
    if (next === out) break;
    out = next;
  }
  out = out
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s*\betc\.?\s*$/i, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;])/g, "$1")
    .trim();
  return stripAddressJunk(out) || out;
}

/** Extract the best location text from a tutor's inbound reply bodies. */
function extractReplyLocation(bodies: string[]): { location: string | null; city: string | null; raw: string } {
  const segs: string[] = [];
  for (const b of bodies) {
    for (const s of String(b).split(/\n|\||•/)) {
      const t = s.trim();
      if (t) segs.push(t);
    }
  }

  let best: string | null = null;
  let cityHit: string | null = null;
  const raws: string[] = [];

  for (const seg of segs) {
    const lower = seg.toLowerCase();
    if (CHAT_NOISE_RE.test(lower) && seg.length < 60) continue;

    // labeled: "my location is X", "location: X", "update my location X", "📍X"
    const labeled = seg.match(/^(?:📍\s*)?(?:my\s+)?(?:updated?\s+)?(?:my\s+)?(?:location|locality|area|address|residence)\s*(?:is|:|-|–)?\s*(.+)$/i);
    let cand = labeled ? labeled[1].trim() : null;

    if (!cand) {
      const tok = LOCALITY_TOKEN_RE.test(lower);
      const cityWord = lower.match(/\b(delhi|noida|greater noida|gurgaon|gurugram|ghaziabad|faridabad)\b/);
      if ((cityWord || tok) && seg.length <= 90) {
        if (!SUBJECT_NOISE_RE.test(lower)) {
          cand = seg.replace(/^📍\s*/, "").trim();
        } else {
          // mixed line ("Badarpur, near sarita vihar, I am unable to teach..."):
          // re-segment on commas/&/and and keep only place-looking parts
          const goodParts: string[] = [];
          for (const p of seg.split(/\s*,\s*|\s*&\s*|\s+and\s+/i)) {
            const pl = p.toLowerCase();
            if (!p.trim() || SUBJECT_NOISE_RE.test(pl) || CHAT_NOISE_RE.test(pl)) continue;
            if (p.trim().length <= 50 && looksLikePlace(p)) goodParts.push(p.trim());
          }
          if (goodParts.length) cand = goodParts.join(", ");
        }
      } else if (!cityWord && !tok && !SUBJECT_NOISE_RE.test(lower) && seg.length >= 3 && seg.length <= 45 && !/\d/.test(seg) && looksLikePlace(seg)) {
        // short plain word reply e.g. "Rohini", "Vikaspuri" — must look like a place
        cand = seg.trim();
      }
    }

    if (cand) {
      cand = cand.replace(/^[=–\-:,\s📍]+/, "").trim();
      if (cand && !isJunkLocality(cand) && !isJunkLocalityText(cand) && !isGenericLocationText(cand)) {
        const cleaned = cleanReplyLocation(cand);
        if (cleaned && cleaned.length >= 3) {
          raws.push(cleaned);
          if (!best || labeled) best = cleaned;
          else if (isGenericLocationText(best) && !isGenericLocationText(cleaned)) best = cleaned;
          else if (cleaned.length > best.length && cleaned.length <= 70 && looksLikePlace(cleaned) && !looksLikePlace(best)) best = cleaned;
        }
      }
      const cw = lower.match(/\b(delhi|noida|greater noida|gurgaon|gurugram|ghaziabad|faridabad)\b/);
      if (cw && !cityHit) cityHit = cw[1];
    }
  }

  // final guard: best must itself be a real, non-generic sublocality
  if (best && (isGenericLocationText(best) || !looksLikePlace(best))) return { location: null, city: cityHit ? canonicalCity(cityHit) : null, raw: raws.join(" | ") };

  return { location: best ? titleCase(best) : null, city: cityHit ? canonicalCity(cityHit) : null, raw: raws.join(" | ") };
}

async function main() {
  const asked = askedPhones();
  console.log(`Asked phones (all 3 batches, SENT only): ${asked.size}`);

  const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000);
  const msgs = await prisma.whatsappChatMessage.findMany({
    where: { direction: "INBOUND", createdAt: { gte: since } },
    select: { phone: true, body: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  console.log(`Inbound msgs last ${DAYS}d: ${msgs.length}`);

  const byPhone = new Map<string, string[]>();
  for (const m of msgs) {
    const d = cleanDisplayPhone(m.phone);
    if (!asked.has(d)) continue;
    const list = byPhone.get(d) || [];
    list.push(m.body);
    byPhone.set(d, list);
  }
  console.log(`Replied (from asked phones): ${byPhone.size}`);

  // tutors for those phones
  const tutors = await prisma.user.findMany({
    where: { role: "TUTOR", isActive: true },
    select: { id: true, name: true, phone: true, tutorProfile: { select: { id: true, address: true, city: true } } },
  });
  const tutorByPhone = new Map<string, (typeof tutors)[number]>();
  for (const t of tutors) {
    const d = cleanDisplayPhone(t.phone);
    if (d.length === 10 && !tutorByPhone.has(d)) tutorByPhone.set(d, t);
  }

  const updated: string[][] = [];
  const noParse: string[][] = [];
  const skippedGood: string[][] = [];
  let updatedCount = 0;

  for (const [digits, bodies] of byPhone) {
    const t = tutorByPhone.get(digits);
    if (!t || !t.tutorProfile) continue;
    const parsed = extractReplyLocation(bodies);
    if (!parsed.location) {
      noParse.push([t.name || "", digits, bodies.map((b) => String(b).replace(/\s+/g, " ").slice(0, 80)).join(" ⏎ ").slice(0, 300)]);
      continue;
    }
    const prof = t.tutorProfile;
    const cityRaw = (prof.city || "").trim();

    // User rule (18 Nov 2026): location reply always overwrites the stored
    // location — even when the profile already had a usable address.
    // No skip/exceptions.

    // city: reply's explicit city > existing NCR city > resolved from locality
    const replyCity = parsed.city;
    let newCity = cityRaw && !isJunkLocality(cityRaw) && NCR_CITY_RE.test(cityRaw) ? canonicalCity(cityRaw) : "";
    if (replyCity && replyCity.toLowerCase() !== (newCity || "").toLowerCase()) newCity = replyCity;
    else if (!newCity) newCity = replyCity || "";

    const patch: { address?: string; city?: string } = { address: parsed.location };
    let cityNote = "";
    if (newCity && newCity.toLowerCase() !== cityRaw.toLowerCase()) { patch.city = newCity; cityNote = `city "${cityRaw}" → "${newCity}"`; }

    updated.push([t.id, t.name || "", digits, parsed.raw, parsed.location, cityRaw, newCity, cityNote, new Date().toISOString()]);
    updatedCount++;
    console.log(`✓ ${t.name} (${digits}): "${(prof.address || "").trim()}" → "${parsed.location}"${cityNote ? ` · ${cityNote}` : ""}`);
    if (!DRY) {
      await prisma.tutorProfile.update({ where: { id: prof.id }, data: patch });
    }
  }

  const esc = (v: string) => `"${String(v || "").replace(/"/g, '""')}"`;
  const { writeFileSync } = await import("fs");
  writeFileSync("exports/location_reply_updates.csv", "\uFEFF" + [
    "userId,name,phone,replyRaw,newAddress,oldCity,newCity,cityNote,updatedAt",
    ...updated.map((r) => r.map(esc).join(",")),
  ].join("\n"), "utf8");
  writeFileSync("exports/location_reply_unparsed.csv", "\uFEFF" + [
    "name,phone,replyText",
    ...noParse.map((r) => r.map(esc).join(",")),
  ].join("\n"), "utf8");
  writeFileSync("exports/location_reply_skipped_had_location.csv", "\uFEFF" + [
    "name,phone,existingAddress,replyRaw",
    ...skippedGood.map((r) => r.map(esc).join(",")),
  ].join("\n"), "utf8");

  console.log(`\n=== Replied: ${byPhone.size} · location parsed: ${updated.length + skippedGood.length} · ${DRY ? "would update" : "updated"}: ${updatedCount} · already had proper location (skipped): ${skippedGood.length} · unparsed: ${noParse.length} ===`);
  console.log(`Files: exports/location_reply_updates.csv · exports/location_reply_unparsed.csv · exports/location_reply_skipped_had_location.csv`);

  if (noParse.length) {
    console.log("\n--- Unparsed replies (manual review) ---");
    noParse.slice(0, 40).forEach((r) => console.log(`${r[0]} (${r[1]}): ${r[2]}`));
  }

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
