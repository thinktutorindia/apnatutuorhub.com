import fs from "fs";
import path from "path";
import { prisma } from "../lib/prisma";
import { haversineDistanceKm } from "../lib/haversine";
import { resolveLocationCoordinates } from "../lib/geocoding";
import { normalizeIndiaWhatsApp } from "../lib/aqua-whatsapp";
import { extractAllGrades, isJunkLocality } from "../lib/whatsapp-bot/leads-helper";
import { resolveEnquirySubject, parentNameForLead } from "../lib/enquiry-render";
import { polishSectorAreaName, stripAddressJunk } from "../lib/format-rich-nearby-location";

// ── Data-quality filters (everything below is enforced + QC-audited) ────────

// This sheet is the NCR offline home-tuition blast. Tutors outside NCR
// (Mumbai, Lucknow, Kolkata, Rohtak, Meerut...) get their own campaigns —
// they must NOT receive Delhi-style "(~x km nearby)" leads.
const NCR_CITY_RE =
  /\b(new delhi|delhi|noida|greater noida|gurgaon|gurugram|ghaziabad|faridabad|loni)\b/i;

/** Canonical display city: Gurgaon→Gurugram, New Delhi→Delhi (no mixed spellings). */
function canonicalCity(c: string | null | undefined): string {
  const t = (c || "").trim();
  const l = t.toLowerCase();
  if (l === "new delhi") return "Delhi";
  if (l === "gurgaon") return "Gurugram";
  if (!t) return "";
  return t.replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function deriveNcrCity(city: string | null | undefined, rawLoc: string): string {
  const c = (city || "").trim();
  const hay = `${c} ${rawLoc}`;
  // Shahdara / Loni Road (Delhi - 110093) is Delhi, NOT the Loni (Ghaziabad) town
  if (/shahdara|loni\s*road/i.test(hay)) return "Delhi";
  if (/greater\s+noida/i.test(hay)) return "Greater Noida";
  const m = hay.match(NCR_CITY_RE);
  if (!m) return "";
  const found = m[0].toLowerCase();
  if (found === "delhi" || found === "new delhi") return "Delhi";
  if (found === "noida") return "Noida";
  if (found === "gurgaon" || found === "gurugram") return "Gurugram";
  if (found === "ghaziabad") return "Ghaziabad";
  if (found === "faridabad") return "Faridabad";
  // Loni town lies in Ghaziabad district — never show it as a separate city
  if (found === "loni") return "Ghaziabad";
  return canonicalCity(found);
}

function isTestOrDemoTutor(name: string, email: string): boolean {
  const n = (name || "").toLowerCase();
  const e = (email || "").toLowerCase();
  if (/demo|dummy|pending kyc|sample/.test(n)) return true;
  if (/^test|\.test@|@test\.|test@apnatutorhub/.test(e)) return true;
  if (/\b(test|demo|dummy)\b/.test(e.split("@")[0] || "")) return true;
  return false;
}

function isJunkTutorName(name: string): boolean {
  const n = (name || "").trim();
  if (!n) return true;
  const l = n.toLowerCase();
  if (/^tutor(\s|$|\d)/.test(l)) return true; // "Tutor", "Tutor1" placeholders
  if (/\d/.test(n)) return true; // digits in name
  if (/[\u{1F000}-\u{1FAFF}\u{2190}-\u{27BF}\u{FE0F}]/u.test(n)) return true; // emoji/symbols
  // No usable name: ".", "A", "Jk", "Ko", "Mk" — fewer than 3 letters total
  if (n.replace(/[^a-zA-Z]/g, "").length < 3) return true;
  if (/^(unknown|user|whatsapp user|parent|student|sir|madam|na|nhi|xyz|abc|test|demo|sample|asdf|qwerty|none|null|placeholder)$/.test(l)) return true;
  // business / institution names
  if (/\b(school|academy|institute|coaching|tutorial|classes|centre|center|home tuition|tuition)\b/.test(l)) return true;
  if (/helpline|corporation|building\s+material|\bpvt\b|\bltd\b|\bllp\b|\benterprises\b|\btraders\b|\bcompany\b/.test(l)) return true;
  if (/\bco\s*\.?\s*in\b/.test(l)) return true; // "Studyhelpline Co In"
  // non-names: cities / localities / subjects / chat replies
  if (/\b(delhi|noida|gurgaon|gurugram|rohini|dwarka|faridabad|ghaziabad)\b$/.test(l)) return true;
  if (/^(psychology|mathematics|maths|math or science|science|english|hindi|all subjects|chemistry|biology|physics|accountancy|economics)\b/.test(l)) return true;
  if (n.split(/\s+/).length >= 6) return true; // sentences ("Ok sir Fter class I will see")
  return false;
}

/** Title-case a display name: "ROHIT SHARMA" / "MUKESH GUPTA." → "Rohit Sharma" / "Mukesh Gupta". */
function titleCaseName(name: string): string {
  return (name || "")
    .trim()
    .replace(/\.+\s*$/, "") // stray trailing full stop
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => {
      const core = w.replace(/\.+$/, "");
      const lower = core.toLowerCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

function isJunkLocalityText(loc: string, tutorName?: string): boolean {
  const l = (loc || "").toLowerCase().trim();
  if (!l || l.length < 3) return true;
  if (/^(noted|sorry|nhi|nahi|nothing|none|pending|mention it|not mentioned|na|no|yes|ok|okay|hk|thik|theek)\b/.test(l)) return true;
  if (/location at|current location|my location|coordinates/.test(l)) return true;
  if (/\d{1,3}\.\d{3,}.*\d{1,3}\.\d{3,}/.test(l)) return true; // raw lat,lng
  // bare direction words: "North", "South", "South , And"
  if (/^(north|south|east|west)\s*(,|\band\b|\.)?\s*(and)?\s*,?\s*\.?$/.test(l)) return true;
  // subject / exam words pasted into the locality: "Mathematics", "Iit Physics",
  // "Science And Chemistry", "Maths From Saharanpur", "Online Online Class"
  if (/\b(mathematics|maths|physics|chemistry|science|biology|iit|jee|neet|online)\b/.test(l)) return true;
  // chat / constraint junk: "Max 10 Km From Border", "Anything Else", "Outside"
  if (/\b\d+\s*km\b|from\s+border|anything\s+else|^outside$/.test(l)) return true;
  // "Alpha And Beta"
  if (/\balpha\b|\bbeta\b/.test(l)) return true;
  // the tutor just typed their own name: "Raju Bhatnagar", "Prashita"
  if (tutorName && l === tutorName.toLowerCase().trim()) return true;
  return false;
}

/**
 * Clean the raw locality for display: drop pincode/"- 94"/", India" tails,
 * duplicate city segments and bare directions.
 *   "Wazirabad, Delhi - 110084, India"  → "Wazirabad"
 *   "A-382 gokal puri delhi - 94"       → "Gokal Puri"
 *   "Karol Bagh, Delhi - 110060, India" → "Karol Bagh"
 */
const KNOWN_NCR_AREAS: [RegExp, string][] = [
  // Specific user-requested locations
  [/\bvirender\s+nagar\b/i, "Virender Nagar"],
  [/\bnawada\b/i, "Nawada"],
  [/\bmansaram\s+park\b/i, "Nawada"],
  [/\bmukhar?jee\s+nagar\b/i, "Mukherjee Nagar"],
  [/\bindira\s+vikas\s+colony\b/i, "Mukherjee Nagar"],
  [/\bpreet\s+vihar\b/i, "Preet Vihar"],
  [/\bsec(?:tor)?[- ]*1[56]\s*(?:rohini)?\b|\brohini\b/i, "Rohini"],
  [/\baya\s+nagar\b/i, "Aya Nagar"],
  [/\bbabarpur\b/i, "Babarpur"],
  [/\bbadarpur\b/i, "Badarpur"],
  [/\bmithapur\b/i, "Badarpur"],
  [/\bdwarka\b/i, "Dwarka"],

  // Other common Delhi hubs
  [/\bajmeri\s+gate\b/i, "Ajmeri Gate"],
  [/\bnorth\s+campus\b/i, "North Campus"],
  [/\bbudh\s+vihar\b/i, "Budh Vihar"],
  [/\bgovindpuri\b/i, "Govindpuri Extension"],
  [/\bnaveen\s+shahdara\b/i, "Naveen Shahdara"],
  [/\bshahdara\b/i, "Shahdara"],
  [/\bchattarpur\b/i, "Chattarpur"],
  [/\bpaschim\s+vihar\b/i, "Paschim Vihar"],
  [/\bjanakpuri\b/i, "Janakpuri"],
  [/\buttam\s+nagar\b/i, "Uttam Nagar"],
  [/\btilak\s+nagar\b/i, "Tilak Nagar"],
  [/\bkarol\s+bagh\b/i, "Karol Bagh"],
  [/\bpitampura\b/i, "Pitampura"],
  [/\bshalimar\s+bagh\b/i, "Shalimar Bagh"],
  [/\bmodel\s+town\b/i, "Model Town"],
  [/\bkamla\s+nagar\b/i, "Kamla Nagar"],
  [/\bcivil\s+lines\b/i, "Civil Lines"],
  [/\bsaket\b/i, "Saket"],
  [/\bmalviya\s+nagar\b/i, "Malviya Nagar"],
  [/\bhauz\s+khas\b/i, "Hauz Khas"],
  [/\bvasant\s+kunj\b/i, "Vasant Kunj"],
  [/\blajpat\s+nagar\b/i, "Lajpat Nagar"],
  [/\bkalkaji\b/i, "Kalkaji"],
  [/\bgreater\s+kailash\b/i, "Greater Kailash"],
  [/\bmayur\s+vihar\b/i, "Mayur Vihar"],
  [/\blaxmi\s+nagar\b/i, "Laxmi Nagar"],
  [/\bpatel\s+nagar\b/i, "Patel Nagar"],
  [/\brajouri\s+garden\b/i, "Rajouri Garden"],
  [/\bpunjabi\s+bagh\b/i, "Punjabi Bagh"],
  [/\bvikaspuri\b/i, "Vikaspuri"],
  [/\bburari\b/i, "Burari"],
  [/\bwazirabad\b/i, "Wazirabad"],
  [/\bsangam\s+vihar\b/i, "Sangam Vihar"],
  [/\bgokal\s*puri\b/i, "Gokal Puri"],
  [/\bgeeta\s+colony\b/i, "Geeta Colony"],
  [/\bkrishna\s+nagar\b/i, "Krishna Nagar"],
  [/\brani\s+bagh\b/i, "Rani Bagh"],
  [/\bgautam\s+nagar\b/i, "Gautam Nagar"],
  [/\bsubhash\s+nagar\b/i, "Subhash Nagar"],
  [/\bashok\s+vihar\b/i, "Ashok Vihar"],
  [/\bnehru\s+place\b/i, "Nehru Place"],
  [/\banand\s+vihar\b/i, "Anand Vihar"],
  [/\bvinod\s+nagar\b/i, "Vinod Nagar"],
  [/\bmandawali\b/i, "Mandawali"],

  // Noida, Greater Noida, Ghaziabad, Gurugram, Faridabad
  [/\bsector\s*chi[- ]*5\b|\bchi[- ]*[45]\b|\bomega\b/i, "Greater Noida"],
  [/\bsector\s*150\b/i, "Sector 150"],
  [/\bsector\s*88\b/i, "Sector 88"],
  [/\bindirapuram\b/i, "Indirapuram"],
  [/\bvaishali\b/i, "Vaishali"],
  [/\bvasundhara\b/i, "Vasundhara"],
  [/\braj\s+nagar\b/i, "Raj Nagar"],
  [/\bcrossings\s+republik\b/i, "Crossings Republik"],
  [/\bpalam\s+vihar\b/i, "Palam Vihar"],
  [/\bsouth\s+city\b/i, "South City"],
  [/\bdlf\s+phase\b/i, "DLF Phase"],
  [/\bsohna\s+road\b/i, "Sohna Road"],
  [/\bgolf\s+course\b/i, "Golf Course Road"],
  [/\bsushant\s+lok\b/i, "Sushant Lok"],
  [/\bsector\s*(\d{1,3})\b/i, "Sector $1"],
];

function cleanLocalityDisplay(raw: string, city: string, tutorName?: string): string {
  const orig = String(raw || "").trim();
  const cityLower = (city || "").trim().toLowerCase();

  // If the raw locality has address junk markers or is very long, match against known NCR areas
  const hasRawAddressJunk =
    /\b(gali|lane|floor|wz|rz|c\/o|house|flat|plot|station|metro|gate|transformer|parking|school|clinic|flats|sectors?\s+\d+\s+to\s+\d+|staff\s+flats|stationary|mandir|estd)\b/i.test(orig) ||
    orig.length > 25;

  if (hasRawAddressJunk) {
    for (const [re, name] of KNOWN_NCR_AREAS) {
      if (re.test(orig)) {
        return name;
      }
    }
  }

  let s = orig
    .replace(/\s*\n+\s*/g, " ")
    .replace(/[,–-]?\s*\b\d{6}\b.*$/i, "") // pincode + everything after
    .replace(/\s*[-–]\s*\d{1,3}\s*$/i, "") // trailing postal-district "- 94"
    .replace(/,?\s*(?:india|bharat)\s*$/i, "")
    .replace(/,?\s*(?:uttar pradesh|\bup\b|haryana|delhi|new delhi|noida|gurugram|gurgaon|ghaziabad|faridabad)\s*$/i, "")
    .replace(/,?\s*(?:uttar pradesh|\bup\b|haryana|delhi|new delhi|noida|gurugram|gurgaon|ghaziabad|faridabad)\s*$/i, "")
    .trim();

  const STATE_CITY_RE =
    /^(delhi|new delhi|noida|greater noida|gurgaon|gurugram|ghaziabad|faridabad|loni|india|bharat|na|nhi|uttar pradesh|\bup\b|haryana|uttarakhand|rajasthan)$/i;
  const DIRECTION_RE =
    /^(north|south|east|west|central|north east|north west|south east|south west|and)$/i;

  const segs = s.split(",").map((x) => x.trim().replace(/\.+$/, "")).filter(Boolean);
  const out: string[] = [];
  for (const seg of segs) {
    const sl = seg.toLowerCase();
    if (STATE_CITY_RE.test(sl) || (cityLower && sl === cityLower)) {
      continue;
    }
    if (DIRECTION_RE.test(sl)) continue;
    if (out.length && out[out.length - 1].toLowerCase() === sl) continue;
    out.push(seg);
  }
  let res = out.join(", ").trim();
  // single-segment case: strip a trailing city or state word ("Gokal Puri Delhi", "Sector 75 Uttar Pradesh")
  if (res) {
    res = res
      .replace(/,?\s*(?:uttar pradesh|\bup\b|haryana|delhi|new delhi|noida|gurugram|gurgaon|ghaziabad|faridabad)\s*$/i, "")
      .replace(/,?\s*(?:uttar pradesh|\bup\b|haryana|delhi|new delhi|noida|gurugram|gurgaon|ghaziabad|faridabad)\s*$/i, "")
      .trim();
  }
  if (!res) return "";
  // strip leading house labels ("A-382 gokal puri") and trailing district numbers
  res = stripAddressJunk(res);
  res = res
    .replace(/^\s*[a-z]{1,2}[-\s]?\d+[\w\-/]*\s+/i, "")
    .replace(/\s*[-–]\s*\d{1,3}\s*$/i, "")
    .trim();
  if (cityLower) {
    res = res.replace(new RegExp(`\\s*\\b(?:${cityLower.replace(/\s+/g, "\\s+")})\\b\\s*$`, "i"), "").trim();
  }
  res = res
    .split(/\s+/)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");

  // If the result still matches a known area:
  for (const [re, name] of KNOWN_NCR_AREAS) {
    if (re.test(res)) {
      return name;
    }
  }

  // If the result is just a direction or state name or junk or too long, return empty to fall back to tutorCity
  if (
    DIRECTION_RE.test(res.trim()) ||
    STATE_CITY_RE.test(res.trim()) ||
    isJunkLocalityText(res, tutorName) ||
    res.length > 25
  ) {
    return "";
  }
  return res;
}

const EMAIL_TYPO_FIXES: [RegExp, string][] = [
  [/@gamil\.com$/i, "@gmail.com"],
  [/@gmial\.com$/i, "@gmail.com"],
  [/@gmai\.com$/i, "@gmail.com"],
  [/@gmail\.co$/i, "@gmail.com"],
  [/@yaho\.com$/i, "@yahoo.com"],
  [/@hotmial\.com$/i, "@hotmail.com"],
  [/@rediffmai(l)?\.com$/i, "@rediffmail.com"],
  [/\.gamil\.com$/i, ".gmail.com"],
  [/\.gmial\.com$/i, ".gmail.com"],
  [/\.yaho\.com$/i, ".yahoo.com"],
  [/\.hotmial\.com$/i, ".hotmail.com"],
];

/** Clean the email for the sheet: fix typo domains, blank auto-generated placeholders. */
function cleanSheetEmail(email: string | null | undefined): string {
  if (!email) return "";
  let e = email.trim();
  if (!e.includes("@")) return ""; // not an email at all ("will tell later")
  // system-generated placeholders: wa.*@apnatutorhub.com and the like
  if (/apnatutorhub\.com$/i.test(e)) return "";
  for (const [re, rep] of EMAIL_TYPO_FIXES) e = e.replace(re, rep);
  return e;
}

/** Clean display phone: digits only, 10-digit national format. */
function cleanDisplayPhone(phone: string | null | undefined): string {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

/** The dispatch's default Delhi ref coords — a tutor parked here has NO real coords. */
function isDefaultDelhiCoords(lat?: number | null, lng?: number | null): boolean {
  return (
    lat != null && lng != null &&
    Math.abs(lat - 28.5355) < 0.02 && Math.abs(lng - 77.2410) < 0.02
  );
}

// High-fidelity sector-specific localities with GPS coordinates
// Guarantees concrete sectors/blocks (never bare "Rohini" or "Noida")
interface ConcreteSectorLocality {
  name: string;
  city: string;
  lat: number;
  lng: number;
}

const HIGH_FIDELITY_SECTOR_LOCALITIES: ConcreteSectorLocality[] = [
  // ── Central Delhi ──
  { name: "Karol Bagh, Central Delhi", city: "Delhi", lat: 28.6517, lng: 77.1906 },
  { name: "Old Rajendra Nagar, Delhi", city: "Delhi", lat: 28.6415, lng: 77.1822 },
  { name: "Patel Nagar, Delhi", city: "Delhi", lat: 28.645, lng: 77.168 },
  { name: "Pusa Road, Delhi", city: "Delhi", lat: 28.6465, lng: 77.1855 },
  { name: "Connaught Place, New Delhi", city: "Delhi", lat: 28.6315, lng: 77.2167 },
  { name: "Gole Market, New Delhi", city: "Delhi", lat: 28.631, lng: 77.203 },

  // ── North Delhi & Rohini ──
  { name: "Sector 9, Rohini", city: "Delhi", lat: 28.7197, lng: 77.1109 },
  { name: "Sector 14, Rohini", city: "Delhi", lat: 28.722, lng: 77.128 },
  { name: "Sector 7, Rohini", city: "Delhi", lat: 28.712, lng: 77.12 },
  { name: "Sector 15, Rohini", city: "Delhi", lat: 28.73, lng: 77.122 },
  { name: "Sector 8, Rohini", city: "Delhi", lat: 28.708, lng: 77.123 },
  { name: "Sector 24, Rohini", city: "Delhi", lat: 28.729, lng: 77.085 },
  { name: "Prashant Vihar, Rohini", city: "Delhi", lat: 28.715, lng: 77.135 },
  { name: "Kohat Enclave, Pitampura", city: "Delhi", lat: 28.7053, lng: 77.1317 },
  { name: "Deepali Enclave, Pitampura", city: "Delhi", lat: 28.698, lng: 77.124 },
  { name: "Model Town, North Delhi", city: "Delhi", lat: 28.702, lng: 77.192 },
  { name: "Kamla Nagar, North Delhi", city: "Delhi", lat: 28.681, lng: 77.202 },
  { name: "Civil Lines, North Delhi", city: "Delhi", lat: 28.678, lng: 77.224 },
  { name: "Shakti Nagar, North Delhi", city: "Delhi", lat: 28.678, lng: 77.195 },
  { name: "Hardev Nagar, Burari", city: "Delhi", lat: 28.739, lng: 77.208 },
  { name: "Kaushik Enclave, Burari", city: "Delhi", lat: 28.745, lng: 77.201 },

  // ── West Delhi ──
  { name: "Janakpuri, West Delhi", city: "Delhi", lat: 28.621, lng: 77.085 },
  { name: "Paschim Vihar, West Delhi", city: "Delhi", lat: 28.668, lng: 77.105 },
  { name: "Tagore Garden, West Delhi", city: "Delhi", lat: 28.648, lng: 77.112 },
  { name: "Rajouri Garden, West Delhi", city: "Delhi", lat: 28.6485, lng: 77.1235 },
  { name: "Punjabi Bagh, West Delhi", city: "Delhi", lat: 28.668, lng: 77.129 },
  { name: "Vikaspuri, West Delhi", city: "Delhi", lat: 28.636, lng: 77.072 },
  { name: "Tilak Nagar, West Delhi", city: "Delhi", lat: 28.636, lng: 77.095 },
  { name: "Uttam Nagar, West Delhi", city: "Delhi", lat: 28.623, lng: 77.058 },
  { name: "Sector 6, Dwarka", city: "Delhi", lat: 28.5872, lng: 77.0612 },
  { name: "Sector 10, Dwarka", city: "Delhi", lat: 28.5838, lng: 77.0476 },
  { name: "Sector 12, Dwarka", city: "Delhi", lat: 28.592, lng: 77.039 },

  // ── South Delhi ──
  { name: "Greater Kailash 1, South Delhi", city: "Delhi", lat: 28.5478, lng: 77.2422 },
  { name: "Greater Kailash 2, South Delhi", city: "Delhi", lat: 28.535, lng: 77.245 },
  { name: "Saket, South Delhi", city: "Delhi", lat: 28.5242, lng: 77.2085 },
  { name: "Malviya Nagar, South Delhi", city: "Delhi", lat: 28.531, lng: 77.21 },
  { name: "Hauz Khas, South Delhi", city: "Delhi", lat: 28.5494, lng: 77.2001 },
  { name: "Vasant Kunj, South Delhi", city: "Delhi", lat: 28.5212, lng: 77.1558 },
  { name: "Green Park, South Delhi", city: "Delhi", lat: 28.5585, lng: 77.2065 },
  { name: "South Extension, South Delhi", city: "Delhi", lat: 28.568, lng: 77.221 },
  { name: "Lajpat Nagar, South Delhi", city: "Delhi", lat: 28.5668, lng: 77.2432 },
  { name: "CR Park, South Delhi", city: "Delhi", lat: 28.538, lng: 77.25 },
  { name: "Alaknanda, South Delhi", city: "Delhi", lat: 28.528, lng: 77.252 },
  { name: "Sainik Farm, South Delhi", city: "Delhi", lat: 28.517, lng: 77.231 },

  // ── East Delhi ──
  { name: "Preet Vihar, East Delhi", city: "Delhi", lat: 28.6452, lng: 77.2967 },
  { name: "Mayur Vihar Phase 1, East Delhi", city: "Delhi", lat: 28.605, lng: 77.295 },
  { name: "Mayur Vihar Phase 2, East Delhi", city: "Delhi", lat: 28.618, lng: 77.305 },
  { name: "Laxmi Nagar, East Delhi", city: "Delhi", lat: 28.6304, lng: 77.2777 },
  { name: "IP Extension, Patparganj", city: "Delhi", lat: 28.629, lng: 77.305 },
  { name: "Anand Vihar, East Delhi", city: "Delhi", lat: 28.65, lng: 77.315 },

  // ── Noida ──
  { name: "Sector 62, Noida", city: "Noida", lat: 28.627, lng: 77.365 },
  { name: "Sector 50, Noida", city: "Noida", lat: 28.575, lng: 77.368 },
  { name: "Sector 18, Noida", city: "Noida", lat: 28.57, lng: 77.321 },
  { name: "Sector 76, Noida", city: "Noida", lat: 28.568, lng: 77.385 },
  { name: "Sector 137, Noida", city: "Noida", lat: 28.508, lng: 77.408 },
  { name: "Sector 128, Noida", city: "Noida", lat: 28.528, lng: 77.375 },
  { name: "Sector 44, Noida", city: "Noida", lat: 28.558, lng: 77.338 },

  // ── Gurugram ──
  { name: "DLF Phase 4, Gurugram", city: "Gurugram", lat: 28.472, lng: 77.085 },
  { name: "DLF Phase 2, Gurugram", city: "Gurugram", lat: 28.489, lng: 77.089 },
  { name: "DLF Phase 5, Gurugram", city: "Gurugram", lat: 28.4595, lng: 77.0266 },
  { name: "Sector 56, Golf Course Road, Gurugram", city: "Gurugram", lat: 28.428, lng: 77.108 },
  { name: "Sector 49, Sohna Road, Gurugram", city: "Gurugram", lat: 28.421, lng: 77.045 },
  { name: "South City 1, Gurugram", city: "Gurugram", lat: 28.462, lng: 77.056 },
  { name: "Sector 14, Gurugram", city: "Gurugram", lat: 28.475, lng: 77.045 },

  // ── Ghaziabad & Loni ──
  { name: "Vaishali Sector 4, Ghaziabad", city: "Ghaziabad", lat: 28.648, lng: 77.34 },
  { name: "Indirapuram, Ghaziabad", city: "Ghaziabad", lat: 28.641, lng: 77.368 },
  { name: "Vasundhara, Ghaziabad", city: "Ghaziabad", lat: 28.661, lng: 77.362 },
  { name: "Raj Nagar Extension, Ghaziabad", city: "Ghaziabad", lat: 28.712, lng: 77.428 },
  { name: "Ankur Vihar, Loni", city: "Ghaziabad", lat: 28.729, lng: 77.285 },
  { name: "Indraprastha Colony, Loni", city: "Ghaziabad", lat: 28.735, lng: 77.292 },

  // ── Faridabad ──
  { name: "Sector 15, Faridabad", city: "Faridabad", lat: 28.408, lng: 77.321 },
  { name: "Sector 21C, Faridabad", city: "Faridabad", lat: 28.432, lng: 77.298 },
  { name: "NIT 5, Faridabad", city: "Faridabad", lat: 28.395, lng: 77.305 },

  // ── Indore ──
  { name: "Vijay Nagar, Indore", city: "Indore", lat: 22.7533, lng: 75.8937 },
  { name: "Old Palasia, Indore", city: "Indore", lat: 22.7244, lng: 75.8839 },
  { name: "New Rani Bagh, Limbodi, Indore", city: "Indore", lat: 22.684, lng: 75.885 },
  { name: "Bhawarkua, Indore", city: "Indore", lat: 22.6924, lng: 75.8671 },

  // ── Lucknow ──
  { name: "Gomti Nagar, Lucknow", city: "Lucknow", lat: 26.85, lng: 81.0 },
  { name: "Aliganj, Lucknow", city: "Lucknow", lat: 26.885, lng: 80.94 },
  { name: "Indira Nagar, Lucknow", city: "Lucknow", lat: 26.878, lng: 80.995 },

  // ── Jaipur ──
  { name: "Vaishali Nagar, Jaipur", city: "Jaipur", lat: 26.915, lng: 75.74 },
  { name: "Malviya Nagar, Jaipur", city: "Jaipur", lat: 26.855, lng: 75.82 },
  { name: "Mansarovar, Jaipur", city: "Jaipur", lat: 26.865, lng: 75.765 },
];

// Strict fee rules from .cursor/rules/tutor-pitch-notifications.mdc
function getStrictFee(grade: number, seed: number): { feeLine: string; isMonthly: boolean; min: number; max: number } {
  if (grade <= 5) {
    // Class 1–5: monthly ₹6,000–₹6,800, tight ₹150 spread
    const bases = [6000, 6100, 6200, 6300, 6400, 6500];
    const base = bases[seed % bases.length];
    return {
      feeLine: `₹${base.toLocaleString("en-IN")} – ₹${(base + 150).toLocaleString("en-IN")} / month`,
      isMonthly: true,
      min: base,
      max: base + 150,
    };
  } else if (grade <= 8) {
    // Class 6–8: monthly ₹6,800–₹7,600, tight ₹150 spread
    const bases = [6800, 6900, 7000, 7100, 7200, 7300, 7400];
    const base = bases[seed % bases.length];
    return {
      feeLine: `₹${base.toLocaleString("en-IN")} – ₹${(base + 150).toLocaleString("en-IN")} / month`,
      isMonthly: true,
      min: base,
      max: base + 150,
    };
  } else if (grade <= 10) {
    // Class 9–10: hourly ₹700–₹850, tight ₹50 spread
    const bases = [700, 720, 750, 780, 800];
    const base = bases[seed % bases.length];
    return {
      feeLine: `₹${base} – ₹${base + 50} / hour`,
      isMonthly: false,
      min: base,
      max: base + 50,
    };
  } else {
    // Class 11–12: hourly ₹850–₹1,050, tight ₹50 spread
    const bases = [850, 880, 900, 950, 1000];
    const base = bases[seed % bases.length];
    return {
      feeLine: `₹${base} – ₹${base + 50} / hour`,
      isMonthly: false,
      min: base,
      max: base + 50,
    };
  }
}

// (Subject resolution + parent names now come from lib/enquiry-render.ts and
//  lib/format-rich-nearby-location.ts — the SAME rules the live dispatch and
//  preview use, so the sheet the admin verifies == what tutors receive.)

function pickConcreteGrade(grades: number[], seed: number): number {
  if (!grades || grades.length === 0) return 8;

  // Group by real educational tiers
  const senior = grades.filter((g) => g >= 11 && g <= 12);
  const secondary = grades.filter((g) => g >= 9 && g <= 10);
  const middle = grades.filter((g) => g >= 6 && g <= 8);
  const primary = grades.filter((g) => g >= 1 && g <= 5);

  // If tutor explicitly teaches senior classes (11-12), prioritize 11 or 12
  if (senior.length > 0 && secondary.length === 0 && middle.length === 0 && primary.length === 0) {
    return senior[seed % senior.length];
  }

  // If tutor teaches 9-10 only
  if (secondary.length > 0 && senior.length === 0 && middle.length === 0 && primary.length === 0) {
    return secondary[seed % secondary.length];
  }

  // If tutor teaches multiple tiers, pick appropriately
  const tiers = [senior, secondary, middle, primary].filter((t) => t.length > 0);
  const selectedTier = tiers[seed % tiers.length];
  return selectedTier[seed % selectedTier.length];
}

function makeAreaConcreteAndRealistic(area: string, city: string, seed: number): string {
  const clean = area.trim().replace(/^,\s*|,\s*$/g, "");
  const lower = clean.toLowerCase();

  const lookup: Record<string, string[]> = {
    loni: ["DLF Ankur Vihar, Loni", "Indraprastha Colony, Loni", "Pushta Road, Loni"],
    vaishali: ["Vaishali Sector 4, Ghaziabad", "Vaishali Sector 2, Ghaziabad"],
    rohini: ["Sector 9 (DC Chowk), Rohini", "Sector 14, Rohini", "Sector 15, Rohini"],
    noida: ["Sector 62, Noida", "Sector 50, Noida", "Sector 137, Noida", "Sector 76, Noida"],
    gurugram: ["DLF Phase 4, Gurugram", "Sector 56, Golf Course Road, Gurugram", "South City 1, Gurugram"],
    gurgaon: ["DLF Phase 4, Gurugram", "Sector 56, Golf Course Road, Gurugram", "South City 1, Gurugram"],
    delhi: ["Saket (J-Block), South Delhi", "Preet Vihar, East Delhi", "Rohini Sector 9, Delhi"],
    "new delhi": ["Gole Market Area, New Delhi", "Connaught Place Outer Circle, New Delhi"],
    ghaziabad: ["Vaishali Sector 4, Ghaziabad", "Indirapuram (Ahinsa Khand), Ghaziabad", "Vasundhara Sector 10, Ghaziabad"],
    faridabad: ["Sector 15, Faridabad", "Sector 21C, Faridabad", "NIT 5, Faridabad"],
    badarpur: ["Badarpur Border Area, South Delhi", "Molarband Extension, Badarpur, Delhi"],
    bandra: ["Bandra West (Hill Road Area), Mumbai", "Pali Hill, Bandra West, Mumbai"],
    patna: ["Boring Road (Near Chauraha), Patna", "Kankarbagh Colony, Patna"],
    kolkata: ["Salt Lake Sector 1, Kolkata", "New Town Action Area 1, Kolkata", "Ballygunge, Kolkata"],
    madurai: ["KK Nagar (Near Lake), Madurai", "Anna Nagar, Madurai"],
    infocity: ["Infocity Sector 1, Gandhinagar", "Infocity IT Park Area, Gandhinagar"],
    chhapraula: ["Chhapraula Main Market, Greater Noida West"],
    nagar: ["Gautam Nagar, South Delhi", "Shakti Nagar, North Delhi"],
    ahemdavad: ["Vastrapur (Near Lake), Ahmedabad", "Satellite (Shivranjani), Ahmedabad"],
    ahmedabad: ["Vastrapur (Near Lake), Ahmedabad", "Satellite (Shivranjani), Ahmedabad"],
    indore: ["Vijay Nagar (Scheme 54), Indore", "Old Palasia, Indore", "New Rani Bagh, Limbodi, Indore"],
    lucknow: ["Gomti Nagar Phase 2, Lucknow", "Aliganj Sector B, Lucknow"],
    jaipur: ["Vaishali Nagar, Jaipur", "Malviya Nagar Sector 3, Jaipur"],
  };

  if (lookup[lower]) {
    const opts = lookup[lower];
    return opts[seed % opts.length];
  }

  // If already contains sector/block/colony/nagar/enclave/phase/vihar/road/market, keep it!
  if (/\b(sector|sec\b|block|pocket|phase|enclave|colony|nagar|vihar|ext|extension|market|road|chowk|puram|park|crest|drive|heights|apartments|society)\b/i.test(clean)) {
    return clean;
  }

  // If a single word or generic, append Colony / Main Market
  return `${clean} (Main Colony Area)`;
}

async function main() {
  console.log("=== Pre-Send Lead Message Generator (Updated & Audited) ===");

  const tutors = await prisma.user.findMany({
    where: { role: "TUTOR", isActive: true },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      tutorProfile: {
        select: {
          city: true,
          address: true,
          latitude: true,
          longitude: true,
          subjects: true,
          classLevels: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  console.log(`Fetched ${tutors.length} active tutors from DB.`);

  interface PresendLeadRow {
    srNo: number;
    userId: string;
    tutorName: string;
    phone: string;
    normalizedPhone: string;
    email: string;
    tutorLocality: string;
    tutorCity: string;
    tutorLat: number;
    tutorLng: number;
    tutorSubjects: string;
    tutorClasses: string;
    targetClass: string;
    targetSubject: string;
    parentName: string;
    leadArea: string;
    distanceKm: number;
    budget: string;
    enquiryId: string;
    templateId: string;
    placeholders: string[];
    renderedMessage: string;
  }

  const results: PresendLeadRow[] = [];
  let skippedNoLoc = 0;
  let skippedNoPhone = 0;
  let skippedJunkLoc = 0;
  let skippedDupPhone = 0;
  let skippedTestDemo = 0;
  let skippedJunkName = 0;
  let skippedNonNcr = 0;
  let skippedNoClassSubjects = 0;
  const seenPhones = new Set<string>();

  for (let idx = 0; idx < tutors.length; idx++) {
    const t = tutors[idx];
    const prof = t.tutorProfile;
    if (!prof) {
      skippedNoLoc++;
      continue;
    }

    // Test / demo accounts must never receive paid WhatsApp sends
    if (isTestOrDemoTutor(t.name || "", t.email || "")) {
      skippedTestDemo++;
      continue;
    }

    // Junk tutor names (non-names, businesses, chat replies, placeholders)
    if (isJunkTutorName(t.name || "")) {
      skippedJunkName++;
      continue;
    }

    const tutorName = titleCaseName(t.name || "Tutor");

    // "Pincode 742607" style junk address → fall back to the profile city
    const rawAddr = (prof.address || "").trim();
    let rawLoc = rawAddr && !/^\s*pincode\b/i.test(rawAddr) && !isJunkLocality(rawAddr)
      ? rawAddr
      : (prof.city || "").trim();
    // Chat-reply junk localities ("Noted", "Mathematics", "South , And",
    // the tutor's own name…) → fall back to the profile city instead of
    // dropping the tutor (the city is a believable locality label).
    if (!rawLoc || isJunkLocality(rawLoc) || isJunkLocalityText(rawLoc, tutorName)) {
      const cityFallback = (prof.city || "").trim();
      if (!cityFallback || isJunkLocality(cityFallback) || isJunkLocalityText(cityFallback, tutorName)) {
        skippedJunkLoc++;
        continue;
      }
      rawLoc = cityFallback;
    }

    // Wrong-state addresses ("Gurugram, Uttarakhand - 263151") → the profile
    // coords point outside NCR entirely; remove the row.
    const stateHit = rawLoc.match(
      /\b(uttarakhand|himachal|punjab|bihar|jharkhand|west\s+bengal|odisha|assam|gujarat|maharashtra|goa|karnataka|tamil\s+nadu|telangana|andhra\s+pradesh|kerala|madhya\s+pradesh|chhattisgarh)\b/i
    );
    if (stateHit) {
      skippedNonNcr++;
      continue;
    }

    // NCR-only: outside tutors get Delhi-style leads that don't apply to them
    const tutorCity = deriveNcrCity(prof.city, rawLoc);
    if (!tutorCity) {
      skippedNonNcr++;
      continue;
    }

    // Human-readable locality: strip pincode/India/city-suffix junk, extract clean area
    rawLoc = cleanLocalityDisplay(rawLoc, tutorCity, tutorName) || tutorCity;
    if (isJunkLocalityText(rawLoc, tutorName)) {
      rawLoc = tutorCity;
    }

    if (!t.phone) {
      skippedNoPhone++;
      continue;
    }

    const normPhone = normalizeIndiaWhatsApp(t.phone);
    if (!normPhone || normPhone.length !== 12) {
      skippedNoPhone++;
      continue;
    }
    // Same WhatsApp number twice (duplicate tutor accounts) → send only once
    if (seenPhones.has(normPhone)) {
      skippedDupPhone++;
      continue;
    }
    seenPhones.add(normPhone);

    // Blank subjects or blank classes → we don't know what they teach; an
    // enquiry would be irrelevant. Skip.
    const classStr = Array.isArray(prof.classLevels)
      ? prof.classLevels.join(", ")
      : String(prof.classLevels || "");
    const subjectsList = Array.isArray(prof.subjects)
      ? prof.subjects.filter((s: string) => s && String(s).trim())
      : [];

    // Early-childhood only check (e.g. Sr 199 Jayanti Jha: UKG, LKG, Nursery only)
    // Tutors who only teach preschool/nursery/KG must not be pitched school grades (Class 1-12)
    const hasSchoolGradeInClasses =
      /\b(?:class\s*)?(?:[1-9]|1[0-2])(?:st|nd|rd|th)?\b/i.test(classStr) ||
      /\b(?:primary|middle|secondary|senior|high\s*school)\b/i.test(classStr);
    const isOnlyEarlyChildhood =
      /\b(ukg|lkg|nursery|kg\b|kindergarten|pre-?primary|prep|playgroup)\b/i.test(classStr) &&
      !hasSchoolGradeInClasses;
    if (isOnlyEarlyChildhood) {
      skippedNoClassSubjects++;
      continue;
    }

    const gradeSet = extractAllGrades(classStr);
    const hasRealSubject = subjectsList.some((s: string) => !/all\s+(?:subjects|primary)|nursery|lkg|ukg|kg\b/i.test(s));
    if (gradeSet.size === 0 || !hasRealSubject) {
      skippedNoClassSubjects++;
      continue;
    }

    // Determine coordinates
    let lat = prof.latitude;
    let lng = prof.longitude;

    const coordsMissing = !lat || !lng || Math.abs(lat) < 0.1;
    const coordsAreDefault = isDefaultDelhiCoords(lat, lng);
    if (coordsMissing || coordsAreDefault) {
      const resolved =
        resolveLocationCoordinates(rawLoc) || resolveLocationCoordinates(tutorCity);
      if (resolved) {
        lat = resolved.lat;
        lng = resolved.lng;
      }
    }

    if (!lat || !lng) {
      skippedNoLoc++;
      continue;
    }

    // Tutor class levels and subjects (already validated above)
    const grades = Array.from(gradeSet);
    let concreteGrade = pickConcreteGrade(grades, idx);
    const subStr = subjectsList.join(", ");
    let targetSubject = resolveEnquirySubject(concreteGrade, subStr, idx);

    // Senior class validation (Class 9-12):
    // Subject MUST be a real, specific academic subject (NEVER "Nursery", "KG", "All Subjects", or empty)
    if (concreteGrade >= 9) {
      if (!targetSubject || /^(nursery|lkg|ukg|kg\b|kindergarten|pre-?primary|all subjects)$/i.test(targetSubject.trim())) {
        // As explicitly requested by user: remove rows where Nursery or All Subjects is pitched on a senior class (Sr 117, Sr 260)
        skippedNoClassSubjects++;
        continue;
      }
    }

    // A subject of Nursery or KG on any card is invalid
    if (/^(nursery|lkg|ukg|kg\b|kindergarten|pre-?primary)$/i.test(targetSubject.trim())) {
      skippedNoClassSubjects++;
      continue;
    }

    // A senior-only subject (Accountancy, Physics...) under a Class 9-10 card
    // is not relevant — prefer the tutor's senior tier when they teach one.
    const SENIOR_ONLY_RE =
      /^(Accountancy|Business Studies|Economics|Physics|Chemistry|Biology|Political Science|Psychology|Sociology|History|Computer Science|English Core)$/i;
    if (concreteGrade <= 10 && SENIOR_ONLY_RE.test(targetSubject)) {
      const senior = grades.filter((g) => g >= 11 && g <= 12);
      if (senior.length > 0) {
        concreteGrade = senior[idx % senior.length];
        targetSubject = resolveEnquirySubject(concreteGrade, subStr, idx);
      } else {
        // Contradiction: senior-only subject but only 9-10 classes → skip
        skippedNoClassSubjects++;
        continue;
      }
    }
    const targetClass = `Class ${concreteGrade}`;

    // Fee: strict pricing rules
    const feeInfo = getStrictFee(concreteGrade, idx);

    // Parent Name: deterministic realistic Indian parent name (NEVER "Parent"!)
    const parentName = parentNameForLead(`${t.id}`);

    // Find nearest HIGH_FIDELITY_SECTOR_LOCALITIES by real haversine distance
    const sectorDistances = HIGH_FIDELITY_SECTOR_LOCALITIES.map((loc) => ({
      loc,
      dist: haversineDistanceKm(lat!, lng!, loc.lat, loc.lng),
    })).sort((a, b) => a.dist - b.dist);

    let chosenLocality: { name: string; city: string; dist: number };

    // Only sectors in the tutor's OWN city qualify — a Delhi tutor must never
    // get a Ghaziabad-area lead 15 km away (Sr 223 case).
    const sameCitySectors =
      sectorDistances[0]?.dist != null && sectorDistances[0].dist <= 5.0
        ? sectorDistances.filter(
            (i) => i.dist <= 5.0 && canonicalCity(i.loc.city) === tutorCity
          )
        : [];

    if (sameCitySectors.length > 0) {
      // Pick among closest same-city sector matches (<= 5.0 km) for variance
      const chosen = sameCitySectors[idx % Math.min(3, sameCitySectors.length)];
      chosenLocality = {
        name: polishSectorAreaName(chosen.loc.name, chosen.loc.city, idx),
        city: chosen.loc.city,
        // never show "~0 km nearby" — clamp to a believable minimum
        dist: Math.max(0.4, Math.round(chosen.dist * 10) / 10),
      };
    } else {
      // If outside predefined sectors (e.g. specific tier-2 town or outer locality):
      // Keep tutor's concrete locality if it has a colony/nagar/vihar/sector, or synthesize nearby colony
      const cleanLoc = makeAreaConcreteAndRealistic(rawLoc, tutorCity, idx);
      const dist = Math.round((1.2 + (idx % 25) * 0.14) * 10) / 10; // 1.2 to 4.7 km
      chosenLocality = {
        name: polishSectorAreaName(cleanLoc, tutorCity, idx),
        city: tutorCity,
        dist: Math.min(4.8, Math.max(0.4, dist)),
      };
    }

    // Format Area with distance label
    const areaWithDistance = `${chosenLocality.name} (~${chosenLocality.dist} km nearby)`;

    const enquiryId = String(32200 + results.length + 1);

    // Meta approved template `tuition_enquiry_direct` (7 parameters):
    // 1: Inquiry ID      -> 🆕 Enquiry ID
    // 2: Client Name     -> 💬 Name
    // 3: Class           -> 📝 Class
    // 4: Subject         -> 📚 Subject
    // 5: Location        -> 📍 Area
    // 6: Budget          -> 💵 Budget
    // 7: Mode            -> 📌 Mode
    const placeholders = [
      `#${enquiryId}`,
      parentName,
      targetClass,
      targetSubject,
      areaWithDistance,
      feeInfo.feeLine,
      "Home Tuition (Offline)",
    ];

    const renderedMessage = [
      "We recently received an Enquiry for you with following details:",
      "",
      `🆕 Enquiry ID : #${enquiryId}`,
      `💬 Name : ${parentName}`,
      `📝 Class : ${targetClass}`,
      `📚 Subject : ${targetSubject}`,
      `📍 Area : ${areaWithDistance}`,
      `💵 Budget : ${feeInfo.feeLine}`,
      `📌 Mode : Home Tuition (Offline)`,
      "",
      "Please check this and Respond",
      "Contact 08062180653",
      "ApnaTutorHub (Reply STOP to Unsubscribe)",
    ].join("\n");

    results.push({
      srNo: results.length + 1,
      userId: t.id,
      tutorName,
      phone: cleanDisplayPhone(t.phone),
      normalizedPhone: normPhone,
      email: cleanSheetEmail(t.email),
      tutorLocality: rawLoc,
      tutorCity,
      tutorLat: lat!,
      tutorLng: lng!,
      tutorSubjects: subStr,
      tutorClasses: classStr,
      targetClass,
      targetSubject,
      parentName,
      leadArea: chosenLocality.name,
      distanceKm: chosenLocality.dist,
      budget: feeInfo.feeLine,
      enquiryId,
      templateId: "tuition_enquiry_direct",
      placeholders,
      renderedMessage,
    });
  }

  console.log(`\n======================================================`);
  console.log(`  GENERATION SUMMARY`);
  console.log(`======================================================`);
  console.log(`Total Qualified Tutors Processed: ${results.length}`);
  console.log(`Skipped (No Location):          ${skippedNoLoc}`);
  console.log(`Skipped (Junk Location):        ${skippedJunkLoc}`);
  console.log(`Skipped (Invalid Phone):        ${skippedNoPhone}`);
  console.log(`Skipped (Duplicate Phone):      ${skippedDupPhone}`);
  console.log(`Skipped (Test/Demo Account):    ${skippedTestDemo}`);
  console.log(`Skipped (Junk Tutor Name):      ${skippedJunkName}`);
  console.log(`Skipped (Non-NCR Tutor):        ${skippedNonNcr}`);
  console.log(`Skipped (No Class/Subjects):    ${skippedNoClassSubjects}`);

  // Comprehensive QC Audit
  let qcViolations = 0;
  for (const r of results) {
    // 1. Distance <= 5.0 km
    if (r.distanceKm > 5.0) {
      console.error(`QC Violation: Distance > 5km: Sr #${r.srNo} (${r.distanceKm}km)`);
      qcViolations++;
    }

    // 2. Class 1-8: Must be "All Subjects", Monthly fee
    const grade = Number(r.targetClass.match(/\d+/)?.[0] || 0);
    if (grade <= 8) {
      if (r.targetSubject !== "All Subjects") {
        console.error(`QC Violation: Class 1-8 has specific subject: Sr #${r.srNo} (${r.targetClass} - ${r.targetSubject})`);
        qcViolations++;
      }
      if (!r.budget.includes("/ month")) {
        console.error(`QC Violation: Class 1-8 is not monthly: Sr #${r.srNo} (${r.budget})`);
        qcViolations++;
      }
    } else {
      // 3. Class 9-12: Must be hourly, subject-specific, and Class 11-12 NEVER "Science"
      if (!r.budget.includes("/ hour")) {
        console.error(`QC Violation: Class 9-12 is not hourly: Sr #${r.srNo} (${r.budget})`);
        qcViolations++;
      }
      if (r.targetSubject === "All Subjects") {
        console.error(`QC Violation: Class 9-12 has All Subjects: Sr #${r.srNo}`);
        qcViolations++;
      }
      if (grade >= 11 && (r.targetSubject.toLowerCase() === "science" || r.targetSubject.toLowerCase() === "commerce")) {
        console.error(`QC Violation: Class 11-12 has generic subject: Sr #${r.srNo} (${r.targetClass} - ${r.targetSubject})`);
        qcViolations++;
      }
    }

    // 4. Client Name must NEVER be "Parent"
    if (r.parentName.toLowerCase() === "parent" || r.parentName.toLowerCase() === "student") {
      console.error(`QC Violation: Client name is generic Parent: Sr #${r.srNo}`);
      qcViolations++;
    }

    // 4b. Subject must be clean (no "for Class" junk inside the subject)
    if (/\bfor\s+class\b/i.test(r.targetSubject) || /\bclass\s*[\divx]+\b/i.test(r.targetSubject)) {
      console.error(`QC Violation: Subject contains class junk: Sr #${r.srNo} (${r.targetSubject})`);
      qcViolations++;
    }
    // 4b2. Subject must NEVER be Nursery or KG
    if (/^(nursery|lkg|ukg|kg\b|kindergarten|pre-?primary)$/i.test(r.targetSubject)) {
      console.error(`QC Violation: Subject is Nursery/KG: Sr #${r.srNo} (${r.targetSubject})`);
      qcViolations++;
    }

    // 4c. Tutor name sanity (no placeholders, digits, emoji, business names)
    if (isJunkTutorName(r.tutorName)) {
      console.error(`QC Violation: Tutor name is junk: Sr #${r.srNo} (${r.tutorName})`);
      qcViolations++;
    }

    // 4c2. Name casing: no ALL-CAPS words, no trailing punctuation
    if (
      /\b[A-Z]{2,}\b/.test(r.tutorName) ||
      /[.,]$/.test(r.tutorName)
    ) {
      console.error(`QC Violation: Tutor name casing: Sr #${r.srNo} (${r.tutorName})`);
      qcViolations++;
    }

    // 4d. Tutor locality sanity
    if (isJunkLocalityText(r.tutorLocality, r.tutorName)) {
      console.error(`QC Violation: Tutor locality is junk: Sr #${r.srNo} (${r.tutorLocality})`);
      qcViolations++;
    }
    // 4d2. Locality must be display-clean (no pincode, "India", state, raw suffix)
    if (
      /\b\d{5,6}\b/.test(r.tutorLocality) ||
      /india|uttarakhand|himachal|maharashtra|bihar|uttar\s+pradesh|rajasthan|haryana/i.test(r.tutorLocality) ||
      /\n/.test(r.tutorLocality)
    ) {
      console.error(`QC Violation: Tutor locality has raw address suffix: Sr #${r.srNo} (${r.tutorLocality})`);
      qcViolations++;
    }
    // 4d2b. Locality must be concise (no raw house/lane/floor text)
    if (
      r.tutorLocality.length > 28 ||
      /\b(gali|lane|floor|wz|rz|c\/o|house|flat|transformer|parking|school|clinic|flats|station|metro)\b/i.test(
        r.tutorLocality
      )
    ) {
      console.error(`QC Violation: Locality has raw address text: Sr #${r.srNo} (${r.tutorLocality})`);
      qcViolations++;
    }

    // 4d3. City must be canonical (no mixed Gurgaon/Gurugram, New Delhi, Loni)
    if (
      /^(new delhi|gurgaon|loni)$/i.test(r.tutorCity) ||
      !NCR_CITY_RE.test(r.tutorCity || "")
    ) {
      console.error(`QC Violation: Tutor city not canonical NCR: Sr #${r.srNo} (${r.tutorCity})`);
      qcViolations++;
    }

    // 4e. Email quality: valid format, no auto-generated placeholders, no typo domains
    if (r.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(r.email)) {
      console.error(`QC Violation: Email invalid: Sr #${r.srNo} (${r.email})`);
      qcViolations++;
    }
    if (/apnatutorhub\.com$/i.test(r.email)) {
      console.error(`QC Violation: Email is system placeholder: Sr #${r.srNo} (${r.email})`);
      qcViolations++;
    }
    if (/@gamil\.|@gmial\.|@gmai\.com|@yaho\.|@hotmial\.|@rediffmai\./i.test(r.email)) {
      console.error(`QC Violation: Email typo domain: Sr #${r.srNo} (${r.email})`);
      qcViolations++;
    }

    // 4f. Phone column must be clean 10-digit national format
    if (!/^\d{10}$/.test(String(r.phone))) {
      console.error(`QC Violation: Phone not clean 10-digit: Sr #${r.srNo} (${r.phone})`);
      qcViolations++;
    }

    // 4g. Tutor must be NCR (this is the NCR offline blast)
    if (!NCR_CITY_RE.test(r.tutorCity || "")) {
      console.error(`QC Violation: Non-NCR tutor slipped in: Sr #${r.srNo} (${r.tutorCity})`);
      qcViolations++;
    }

    // 5. Area must be RICH and REAL:
    //    - never a bare city alone ("Rohini", "Noida", "Delhi", "Loni"...)
    //    - never house-number / positional junk ("14/1", "above X", "opp Y",
    //      "plot", "flat", "shop", "behind X")
    //    - never a duplicated city ("X, X")
    //    - always has a sub-colony segment OR a "(near <landmark>)" part
    const areaNoDist = r.leadArea.replace(/\s*\(~\d+(?:\.\d+)?\s*km nearby\)\s*$/i, "").trim();
    const lLower = areaNoDist.toLowerCase().trim();
    const genericList = [
      "rohini", "rohini, delhi", "noida", "delhi", "new delhi", "west delhi",
      "south delhi", "east delhi", "north delhi", "gurugram", "gurgaon",
      "ghaziabad", "loni", "vaishali", "kolkata", "patna", "badarpur",
      "bandra", "faridabad", "indore", "lucknow", "jaipur", "gandhinagar",
      "nearby local area",
    ];
    const houseJunkRe = /\d+\s*\/\s*\d+|\b(?:above|below|opp\.?(?:osite)?|behind|plot|flat|shop|house\s*no|h\.?\s*no)\b/i;
    const areaSegs = areaNoDist.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    const dupSeg = new Set(areaSegs).size !== areaSegs.length;
    const hasSubColony =
      areaSegs.length >= 2 ||
      /\b(?:sector|block|phase|pocket|enclave|colony|vihar|nagar|extension|ext|puram)\b/i.test(areaNoDist);
    const hasNear = /\(near\s+\S/i.test(areaNoDist);
    if (
      genericList.includes(lLower) ||
      (!areaNoDist.includes(" ") && !areaNoDist.includes(",")) ||
      houseJunkRe.test(areaNoDist) ||
      dupSeg ||
      (!hasSubColony && !hasNear)
    ) {
      console.error(
        `QC Violation: Area is too generic / junky: Sr #${r.srNo} (${r.leadArea})` +
          ` [bare=${genericList.includes(lLower) || (!areaNoDist.includes(" ") && !areaNoDist.includes(","))}` +
          ` junk=${houseJunkRe.test(areaNoDist)} dup=${dupSeg} rich=${hasSubColony || hasNear}]`
      );
      qcViolations++;
    }

    // 6. Template label mapping: {{3}}=Class (no subject combo), {{4}}=Subject,
    //    {{7}}=Mode. The gender preference is no longer sent.
    const msgLines = r.renderedMessage.split("\n");
    if (
      !msgLines.some((l) => l.trim() === `📝 Class : ${r.targetClass}`) ||
      !msgLines.some((l) => l.trim() === `📚 Subject : ${r.targetSubject}`) ||
      !msgLines.some((l) => l.trim() === `📌 Mode : Home Tuition (Offline)`) ||
      /Any \(Male or Female Tutor\)/.test(r.renderedMessage) ||
      new RegExp(`${r.targetClass}\\s*\\(`).test(r.renderedMessage)
    ) {
      console.error(`QC Violation: Template label/param mismatch: Sr #${r.srNo}`);
      qcViolations++;
    }

    // 7. Area must be a single line (no line breaks leaked into the card)
    const areaLineIdx = msgLines.findIndex((l) => l.startsWith("📍 Area :"));
    if (
      areaLineIdx < 0 ||
      !msgLines[areaLineIdx + 1]?.startsWith("💵 Budget :") ||
      /\n/.test(r.leadArea)
    ) {
      console.error(`QC Violation: Area line broken/multiline: Sr #${r.srNo}`);
      qcViolations++;
    }
  }

  console.log(`QC Audit Violations:            ${qcViolations}`);

  // Write JSON
  const outJsonPath = path.join(process.cwd(), "exports", "presend_tutor_leads_650.json");
  fs.writeFileSync(outJsonPath, JSON.stringify(results, null, 2), "utf8");
  console.log(`Saved JSON: ${outJsonPath}`);

  // Write CSV (Excel UTF-8 with BOM)
  const csvHeaders = [
    "Sr No",
    "User ID",
    "Tutor Name",
    "Phone",
    "WhatsApp Phone (E164)",
    "Email",
    "Tutor Locality",
    "Tutor City",
    "Latitude",
    "Longitude",
    "Tutor Subjects",
    "Tutor Classes",
    "Pitch Class",
    "Pitch Subject",
    "Client Name (Parent)",
    "Pitch Mode",
    "Lead Area",
    "Distance (km)",
    "Budget / Fee",
    "Enquiry ID",
    "Template ID",
    "Rendered WhatsApp Message",
  ];

  const escapeCsv = (str: string | number | null | undefined): string => {
    if (str === null || str === undefined) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  const csvRows: string[] = [];
  csvRows.push(csvHeaders.join(","));

  for (const r of results) {
    const row = [
      r.srNo,
      escapeCsv(r.userId),
      escapeCsv(r.tutorName),
      escapeCsv(r.phone),
      escapeCsv(r.normalizedPhone),
      escapeCsv(r.email),
      escapeCsv(r.tutorLocality),
      escapeCsv(r.tutorCity),
      r.tutorLat,
      r.tutorLng,
      escapeCsv(r.tutorSubjects),
      escapeCsv(r.tutorClasses),
      escapeCsv(r.targetClass),
      escapeCsv(r.targetSubject),
      escapeCsv(r.parentName),
      escapeCsv("Home Tuition (Offline)"),
      escapeCsv(r.leadArea),
      r.distanceKm,
      escapeCsv(r.budget),
      escapeCsv(r.enquiryId),
      escapeCsv(r.templateId),
      escapeCsv(r.renderedMessage),
    ];
    csvRows.push(row.join(","));
  }

  const outCsvPath = path.join(process.cwd(), "exports", "presend_tutor_leads_650.csv");
  fs.writeFileSync(outCsvPath, "\uFEFF" + csvRows.join("\r\n"), "utf8");
  console.log(`Saved CSV (Excel): ${outCsvPath}`);
  process.exit(0);
}

main().catch((e) => {
  console.error("Error generating presend file:", e);
  process.exit(1);
});
