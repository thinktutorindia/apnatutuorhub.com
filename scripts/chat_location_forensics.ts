/**
 * READ-ONLY: For every tutor whose location is NOT OK (630 of 1009), scan ALL
 * inbound WhatsApp messages ever — including old chats before any ask — and
 * report whether a usable sublocality was ever stated. NO DB writes.
 *
 * Run: npx tsx --env-file=.env scripts/chat_location_forensics.ts
 * Out: exports/chat_location_forensics_2026-11-18.csv
 */
import * as fs from "fs";
import { PrismaClient } from "@prisma/client";
import { isJunkLocality } from "../lib/whatsapp-bot/leads-helper";
import { stripAddressJunk } from "../lib/format-rich-nearby-location";
import { INDIAN_CITY_COORDINATES } from "../lib/geocoding";

const prisma = new PrismaClient();
const FLAT_KEYS = new Set(Object.keys(INDIAN_CITY_COORDINATES).map((k) => k.replace(/\s+/g, "").toLowerCase()));
const NCR = /\b(new delhi|delhi|noida|greater noida|gurgaon|gurugram|ghaziabad|faridabad|loni)\b/i;
const CITY_WORD = /\b(delhi|noida|greater noida|gurgaon|gurugram|ghaziabad|faridabad|loni|new delhi)\b/i;
const LOCALITY_TOKEN =
  /\b(sector|blk\.?|block|pocket|phase|nagar|vihar|colony|enclave|extension|extn|puram|puri|bagh|garden|market|chowk|kunj|marg|road|street|park|place|dwarka|rohini|pitampura|paschim|punjabi|rajouri|karol|patel|laxmi|lakshmi|mayur|preet|anand|dilshad|shahdara|vasundhara|indirapuram|vaishali|kaushambi|model\s+town|gtb|mukherjee|civil\s+lines|burari|saket|hauz\s+khas|malviya|greater\s+kailash|lajpat|kalkaji|nehru\s+place|okhla|badarpur|sarita|jasola|alaknanda|chittaranjan|tughlakabad|sainik\s+farm|chhatarpur|mahipalpur|palam|najafgarh|nangloi|narela|munirka|khanpur|govindpuri|niti|kondli|trilok|baljit|karkardooma|krishna\s+nagar|gandhi\s+nagar|shakarpur|geeta\s+colony|ahinsa\s+khand|raj\s+nagar|uttam|tilak|moti|kirti|subhash|ashok|pushp|bindapur|matiala|dabri|jwala|heri|mahavir|peera\s+garhi|sultanpuri|kirari|nithari|harola|jamia|seelampur|yamuna|timarpur|kingsway|du\s+campus|campus|madhuban|ganesh\s+nagar|paharganj|karol\s+bagh|ballabhgarh|old\s+delhi|new\s+delhi)\b/i;
const NOISE =
  /\b(reply\s+stop|apnatutorhub|unlock|membership|vip\s+plan|contact\s+080|template|please|thanks|thank\s+you|bhejo|chahiye|chiye|kahan|dedo|whatsapp|payment|fees?|number|otp|password|plans?|hi|hello|bye|start|stop|ok|okay)\b/i;
const SUBJECT_NOISE =
  /\b(math|maths|mathematics|science|physics|chemistry|bio|english|hindi|subject|subjects|class|classes|tuition|teach|teaching|spanish|unable|need|want|online|tutor)\b/i;

function normalizePhone(p: string | null | undefined): string {
  const d = String(p || "").replace(/\D/g, "");
  return d.length === 12 && d.startsWith("91") ? d.slice(2) : d.length === 11 && d.startsWith("0") ? d.slice(1) : d;
}

const REQUEST_NEGATIVE_RE =
  /\b(kindly|please|mujhe|de\s*do|provide|which|kahan|kidhar|any|only|available|chahiye|chiye|bhejo|send|need|want|left|leave|not\s+in|not\s+stay|too\s+far|nhi|nahi|ma'am|sir|enquiry|what\s+about|don't|do\s+not|ask|bataiye|dein|dedo|question)\b|\?/i;

function genericLoc(t: string): boolean {
  const s = String(t || "").toLowerCase()
    .replace(/\b(north|south|east|west|new|old|upper|lower)\b/g, "")
    .replace(/\b(delhi|delhi\s*ncr|ncr|noida|greater\s+noida|gurgaon|gurugram|ghaziabad|faridabad|loni)\b/g, "")
    .replace(/\b(haryana|uttar\s+pradesh|india|up)\b/g, "")
    .replace(/[\s,.\-–/]/g, "");
  return !s;
}
function junkText(l: string): boolean {
  if (!l || l.length < 3) return true;
  if (/^(noted|sorry|nhi|nahi|nothing|none|pending|mention it|not mentioned|na|no|yes|ok|okay|hk|thik|theek|wait|later|soon|skip|pass|abcd)\b/.test(l)) return true;
  if (/location at|current location|my location|coordinates/.test(l)) return true;
  if (/\d{1,3}\.\d{3,}.*\d{1,3}\.\d{3,}/.test(l)) return true;
  if (/^(north|south|east|west)\s*(,|\band\b|\.)?\s*(and)?\s*,?\s*\.?$/.test(l)) return true;
  if (/\b(mathematics|maths|physics|chemistry|science|biology|iit|jee|neet|online)\b/.test(l)) return true;
  if (/\b\d+\s*km\b|from\s+border|^outside$/.test(l)) return true;
  return isJunkLocality(l);
}
function looksLikePlace(text: string): boolean {
  const c = (text || "").toLowerCase().replace(/[,–\-/.]/g, " ").trim();
  if (!c || c.length < 3) return false;
  if (LOCALITY_TOKEN.test(c) || CITY_WORD.test(c) || FLAT_KEYS.has(c.replace(/\s+/g, ""))) return true;
  return false;
}
function titleCase(s: string): string {
  return String(s || "").trim().split(/\s+/).filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}
function cleanReplyLocation(text: string): string {
  let out = String(text || "").trim();
  for (let i = 0; i < 3; i++) {
    const next = out.replace(/^\s*\d{1,2}\s*[.)]\s*/, "")
      .replace(/^\s*(?:full\s+)?(?:address|area|location|locality|residence|city)\s*[:=-]\s*/i, "").trim();
    if (next === out) break;
    out = next;
  }
  out = out.replace(/\([^)]*\)/g, " ").replace(/\s*\betc\.?\s*$/i, "")
    .replace(/\s{2,}/g, " ").replace(/\s+([,.;])/g, "$1").trim();
  return stripAddressJunk(out) || out;
}

/** Same candidate extraction as the harvester, but reports all usable candidates. */
function usablePlaces(bodies: string[]): { text: string; labeled: boolean }[] {
  const out: { text: string; labeled: boolean }[] = [];
  const segs: string[] = [];
  for (const b of bodies) for (const s of String(b).split(/\n|\||•/)) if (s.trim()) segs.push(s.trim());
  for (const seg of segs) {
    const lower = seg.toLowerCase();
    const labeled = seg.match(/^(?:📍\s*)?(?:my\s+)?(?:updated?\s+)?(?:my\s+)?(?:location|locality|area|address|residence)\s*(?:is|:|-|–)?\s*(.+)$/i);
    // Requests / negations are not location statements ("I left Delhi", "which place?").
    if (REQUEST_NEGATIVE_RE.test(lower) && !labeled) continue;
    let cand = labeled ? labeled[1].trim() : null;
    if (!cand) {
      const tok = LOCALITY_TOKEN.test(lower);
      const cityWord = CITY_WORD.test(lower);
      if ((cityWord || tok) && seg.length <= 90) {
        if (!SUBJECT_NOISE.test(lower)) cand = seg.replace(/^📍\s*/, "").trim();
        else {
          const parts: string[] = [];
          for (const p of seg.split(/\s*,\s*|\s*&\s*|\s+and\s+/i)) {
            const pl = p.toLowerCase();
            if (!p.trim() || SUBJECT_NOISE.test(pl) || NOISE.test(pl)) continue;
            if (p.trim().length <= 50 && looksLikePlace(p)) parts.push(p.trim());
          }
          if (parts.length) cand = parts.join(", ");
        }
      } else if (!cityWord && !tok && !SUBJECT_NOISE.test(lower) && seg.length >= 3 && seg.length <= 45 && !/\d/.test(seg) && looksLikePlace(seg)) {
        cand = seg.trim();
      }
    }
    if (!cand) continue;
    cand = cand.replace(/^[=–\-:,\s📍]+/, "").trim();
    // A bare city ("Noida", "Delhi NCR") is not a sublocality — require a real
    // locality token or a known place key in every accepted candidate.
    // A bare city ("Noida", "Delhi NCR", "Bhopal") is not a sublocality —
    // require a locality token/suffix (Sector, Nagar, Vihar, Puri, Colony…).
    const hasLocality = LOCALITY_TOKEN.test(cand) || /\b[a-z]{2,}(?:nagar|vihar|puri|puram|colony|enclave|bagh|chowk|ganj|town|layout|phase|block|pocket)\b/i.test(cand) || /\b(?:sector|road|market|park)\b/i.test(cand);
    if (!hasLocality) continue;
    if (NOISE.test(cand.toLowerCase()) && cand.length < 60) continue;
    if (junkText(cand.toLowerCase()) || genericLoc(cand) || !looksLikePlace(cand)) continue;
    const cleaned = cleanReplyLocation(cand);
    if (cleaned && cleaned.length >= 3 && !genericLoc(cleaned) && looksLikePlace(cleaned)) {
      out.push({ text: titleCase(cleaned), labeled: Boolean(labeled) });
    }
  }
  return out;
}

const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;

async function main() {
  const users = await prisma.user.findMany({
    where: { role: "TUTOR" },
    select: { id: true, name: true, phone: true, email: true, isActive: true, tutorProfile: { select: { address: true, city: true, latitude: true, longitude: true } } },
  });
  const seen = new Set<string>();
  const bad: Array<(typeof users)[number]> = [];
  for (const u of users) {
    const p = u.tutorProfile;
    if (!p) continue;
    const phone = normalizePhone(u.phone);
    const addr = stripAddressJunk(p.address || "") || "";
    const city = (p.city || "").trim();
    const ok = Boolean(addr && city && !junkText(addr.toLowerCase()) && addr.toLowerCase() !== city.toLowerCase() && !genericLoc(addr) && NCR.test(city) && p.latitude != null && p.longitude != null &&
      !(Math.abs(p.latitude - 28.5355) < 0.02 && Math.abs(p.longitude - 77.2410) < 0.02));
    const dup = seen.has(phone);
    if (!dup && phone.length === 10) seen.add(phone);
    if (phone.length !== 10 || dup || !u.isActive || /\b(test|demo|dummy)\b/i.test(`${u.name || ""} ${u.email || ""}`)) continue;
    if (!ok) bad.push(u);
  }

  const phones = [...new Set(bad.flatMap((u) => { const p = normalizePhone(u.phone); return [p, `91${p}`]; }))];
  const msgs = await prisma.whatsappChatMessage.findMany({
    where: { direction: "INBOUND", phone: { in: phones } },
    select: { phone: true, body: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  const byPhone = new Map<string, string[]>();
  for (const m of msgs) {
    const k = normalizePhone(m.phone);
    const list = byPhone.get(k) || [];
    list.push(m.body);
    byPhone.set(k, list);
  }

  const rows: string[][] = [];
  let found = 0, none = 0, ambiguous = 0;
  for (const u of bad) {
    const phone = normalizePhone(u.phone);
    const bodies = byPhone.get(phone) || [];
    const places = usablePlaces(bodies);
    const uniq = [...new Map(places.map((p) => [p.text.toLowerCase(), p])).values()];
    const latest = uniq[uniq.length - 1]?.text || "";
    const addrNorm = String(u.tutorProfile?.address || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const locNorm = latest.toLowerCase().replace(/[^a-z0-9]/g, "");
    const core = locNorm.replace(/(delhi|noida|gurugram|ghaziabad|faridabad|india|\d+)/g, "").slice(0, 8);
    const alreadyHas = Boolean(core && addrNorm.includes(core));
    const label = uniq.length === 0 ? "NO_LOCATION_IN_CHAT" : uniq.length === 1 ? "ONE_LOCATION_FOUND" : "MULTIPLE_LOCATIONS_FOUND";
    if (label === "NO_LOCATION_IN_CHAT") none++;
    else if (label === "ONE_LOCATION_FOUND") found++;
    else ambiguous++;
    rows.push([
      String(u.name || ""), phone,
      ((u.tutorProfile?.address || "").trim() || "BLANK").slice(0, 60),
      (u.tutorProfile?.city || "BLANK").slice(0, 30),
      label,
      latest,
      alreadyHas ? "ADDRESS_ALREADY_MATCHES" : "ADDRESS_NOT_UPDATED",
      uniq.map((p) => p.text + (p.labeled ? " [labeled]" : "")).join(" | ").slice(0, 300),
      String(bodies.length),
      bodies.slice(-4).map((b) => String(b).replace(/\s+/g, " ").slice(0, 100)).join(" ⏎ ").slice(0, 400),
    ]);
  }

  console.log(`Bad-location tutors scanned: ${bad.length}`);
  console.log(`Inbound messages for them: ${msgs.length}`);
  console.log(`ONE location found: ${found} · MULTIPLE locations found: ${ambiguous} · NO usable location in chat: ${none}`);
  const out = "exports/chat_location_forensics_2026-11-18.csv";
  fs.writeFileSync(out, "\uFEFF" + [
    ["name", "phone", "currentAddress", "currentCity", "chatFinding", "latestLocationInChat", "addressMatch", "locationsStatedInChat", "inboundMsgCount", "last4Messages"].join(","),
    ...rows.map((r) => r.map(esc).join(",")),
  ].join("\r\n"), "utf8");
  console.log(`Report: ${out} (${rows.length} rows)`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
