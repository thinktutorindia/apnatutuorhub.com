import fs from "fs";
import path from "path";
import { prisma } from "../lib/prisma";
import { haversineDistanceKm } from "../lib/haversine";
import { resolveLocationCoordinates } from "../lib/geocoding";
import { normalizeIndiaWhatsApp } from "../lib/aqua-whatsapp";
import { extractAllGrades, isJunkLocality } from "../lib/whatsapp-bot/leads-helper";
import { resolveEnquirySubject, parentNameForLead } from "../lib/enquiry-render";
import { polishSectorAreaName, stripAddressJunk } from "../lib/format-rich-nearby-location";

// ── Region & City Canonicalization ──────────────────────────────────────────

const NCR_CITY_RE =
  /\b(new delhi|delhi|noida|greater noida|gurgaon|gurugram|ghaziabad|faridabad|loni)\b/i;

const KNOWN_NCR_AREAS_RE =
  /\b(patel nagar|karol bagh|dilshad garden|mukherjee nagar|nehru vihar|rohini|dwarka|janakpuri|vikaspuri|paschim vihar|punjabi bagh|saket|malviya nagar|hauz khas|vasant kunj|lajpat nagar|kalkaji|greater kailash|mayur vihar|laxmi nagar|preet vihar|anand vihar|shahdara|babarpur|gokal puri|badarpur|burari|wazirabad|sangam vihar|aya nagar|nawada|virender nagar|budh vihar|govindpuri|sector 62|sector 15|sector 50|sector 76|sector 137|dlf phase|south city|sohna road|indirapuram|vaishali|vasundhara|raj nagar|moti nagar|shastri nagar|adarsh nagar|karampura|tri nagar|ashok vihar|pitampura|model town|kamla nagar|civil lines|green park|south extension|cr park|alaknanda|sainik farm|tagore garden|rajouri garden|tilak nagar|uttam nagar|palam|najafgarh)\b/i;

function canonicalCity(c: string | null | undefined): string {
  const t = (c || "").trim();
  const l = t.toLowerCase();
  if (l === "new delhi" || l === "delhi ncr") return "Delhi";
  if (l === "gurgaon") return "Gurugram";
  if (l === "bangalore") return "Bengaluru";
  if (l === "ahemdavad") return "Ahmedabad";
  if (!t) return "";
  return t.replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function deriveCity(city: string | null | undefined, rawLoc: string): { city: string; isNcr: boolean } {
  const c = (city || "").trim();
  const hay = `${c} ${rawLoc}`;

  if (KNOWN_NCR_AREAS_RE.test(hay)) {
    const m = hay.match(NCR_CITY_RE);
    if (m) {
      const found = m[0].toLowerCase();
      if (found === "delhi" || found === "new delhi") return { city: "Delhi", isNcr: true };
      if (found === "noida") return { city: "Noida", isNcr: true };
      if (found === "gurgaon" || found === "gurugram") return { city: "Gurugram", isNcr: true };
      if (found === "ghaziabad" || found === "loni") return { city: "Ghaziabad", isNcr: true };
      if (found === "faridabad") return { city: "Faridabad", isNcr: true };
    }
    return { city: "Delhi", isNcr: true };
  }

  const m = hay.match(NCR_CITY_RE);
  if (m) {
    const found = m[0].toLowerCase();
    if (found === "delhi" || found === "new delhi") return { city: "Delhi", isNcr: true };
    if (found === "noida") return { city: "Noida", isNcr: true };
    if (found === "gurgaon" || found === "gurugram") return { city: "Gurugram", isNcr: true };
    if (found === "ghaziabad" || found === "loni") return { city: "Ghaziabad", isNcr: true };
    if (found === "faridabad") return { city: "Faridabad", isNcr: true };
    return { city: canonicalCity(found), isNcr: true };
  }

  const nonNcrMatch = hay.match(
    /\b(mumbai|bengaluru|bangalore|kolkata|pune|hyderabad|ahmedabad|ahemdavad|indore|lucknow|jaipur|patna|kanpur|bhopal|varanasi|bareilly|kotdwar|rohtak|assam|madurai|gandhinagar|dehradun|chandigarh|nagpur|surat|vadodara|agra|meerut|aligarh|prayagraj|allahabad)\b/i
  );
  if (nonNcrMatch) {
    return { city: canonicalCity(nonNcrMatch[0]), isNcr: false };
  }

  if (c && !/^\d+$/.test(c) && c.length >= 3 && !/^(delhi\s*ncr|delhi|ncr|india|null|undefined)$/i.test(c)) {
    return { city: canonicalCity(c), isNcr: false };
  }

  return { city: "Delhi", isNcr: true };
}

function isTestOrDemo(name: string, email: string): boolean {
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
  if (/^tutor(\s|$|\d)/.test(l)) return true;
  if (/\d/.test(n)) return true;
  if (/[\u{1F000}-\u{1FAFF}\u{2190}-\u{27BF}\u{FE0F}]/u.test(n)) return true;
  if (n.replace(/[^a-zA-Z]/g, "").length < 3) return true;
  if (/^(unknown|user|whatsapp user|parent|student|sir|madam|na|nhi|xyz|abc|test|demo|sample|asdf|qwerty|none|null|placeholder|export|import|backup|admin|tester|testing)$/.test(l)) return true;
  if (/\b(school|academy|institute|coaching|tutorial|classes|centre|center|home tuition|tuition)\b/.test(l)) return true;
  if (/helpline|corporation|building\s+material|\bpvt\b|\bltd\b|\bllp\b|\benterprises\b|\btraders\b|\bcompany\b/.test(l)) return true;
  if (/\bco\s*\.?\s*in\b/.test(l)) return true;
  if (/\b(delhi|noida|gurgaon|gurugram|rohini|dwarka|faridabad|ghaziabad)\b$/.test(l)) return true;
  if (/^(psychology|mathematics|maths|math or science|science|english|hindi|all subjects|chemistry|biology|physics|accountancy|economics)\b/.test(l)) return true;
  if (n.split(/\s+/).length >= 6) return true;
  return false;
}

function titleCaseName(name: string): string {
  return (name || "")
    .trim()
    .replace(/\.+\s*$/, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => {
      const core = w.replace(/\.+$/, "");
      const lower = core.toLowerCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

const KNOWN_NCR_AREAS: [RegExp, string][] = [
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
  [/\bmoti\s+nagar\b/i, "Moti Nagar"],
  [/\bshastri\s+nagar\b/i, "Shastri Nagar"],
  [/\badarsh\s+nagar\b/i, "Adarsh Nagar"],
  [/\bkarampura\b/i, "Karampura"],
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
  [/\bwest\s+delhi\b/i, "Janakpuri, West Delhi"],
  [/\bnorth\s+delhi\b/i, "Model Town, North Delhi"],
  [/\bsouth\s+delhi\b/i, "Saket, South Delhi"],
  [/\beast\s+delhi\b/i, "Preet Vihar, East Delhi"],
  [/\bcentral\s+delhi\b/i, "Karol Bagh, Central Delhi"],
  [/\bsector\s*chi[- ]*5\b|\bchi[- ]*[45]\b|\bomega\b/i, "Greater Noida"],
  [/\bsector\s*150\b/i, "Sector 150, Noida"],
  [/\bsector\s*88\b/i, "Sector 88, Noida"],
  [/\bsector\s*62\b/i, "Sector 62, Noida"],
  [/\bsector\s*50\b/i, "Sector 50, Noida"],
  [/\bsector\s*76\b/i, "Sector 76, Noida"],
  [/\bsector\s*137\b/i, "Sector 137, Noida"],
  [/\bsector\s*128\b/i, "Sector 128, Noida"],
  [/\bindirapuram\b/i, "Indirapuram, Ghaziabad"],
  [/\bvaishali\b/i, "Vaishali, Ghaziabad"],
  [/\bvasundhara\b/i, "Vasundhara, Ghaziabad"],
  [/\braj\s+nagar\b/i, "Raj Nagar, Ghaziabad"],
  [/\bcrossings\s+republik\b/i, "Crossings Republik, Ghaziabad"],
  [/\bpalam\s+vihar\b/i, "Palam Vihar, Gurugram"],
  [/\bsouth\s+city\b/i, "South City, Gurugram"],
  [/\bdlf\s+phase\b/i, "DLF Phase, Gurugram"],
  [/\bsohna\s+road\b/i, "Sohna Road, Gurugram"],
  [/\bgolf\s+course\b/i, "Golf Course Road, Gurugram"],
  [/\bsushant\s+lok\b/i, "Sushant Lok, Gurugram"],
  [/\bsector\s*(\d{1,3})\b/i, "Sector $1"],
];

function isJunkLocalityText(loc: string, tutorName?: string): boolean {
  const l = (loc || "").toLowerCase().trim();
  if (!l || l.length < 3) return true;
  if (/^(noted|sorry|nhi|nahi|nothing|none|pending|mention it|not mentioned|na|no|yes|ok|okay|hk|thik|theek)\b/.test(l)) return true;
  if (/location at|current location|my location|coordinates/.test(l)) return true;
  if (/\d{1,3}\.\d{3,}.*\d{1,3}\.\d{3,}/.test(l)) return true;
  if (/^(north|south|east|west)\s*(,|\band\b|\.)?\s*(and)?\s*,?\s*\.?$/.test(l)) return true;
  if (/\b(mathematics|maths|physics|chemistry|science|biology|iit|jee|neet|online)\b/.test(l)) return true;
  if (/\b\d+\s*km\b|from\s+border|anything\s+else|^outside$/.test(l)) return true;
  if (/\balpha\b|\bbeta\b/.test(l)) return true;
  if (tutorName && l === tutorName.toLowerCase().trim()) return true;
  return false;
}

function cleanLocalityDisplay(raw: string, city: string, tutorName?: string): string {
  const orig = String(raw || "").trim();
  const cityLower = (city || "").trim().toLowerCase();

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
    .replace(/[,–-]?\s*\b\d{6}\b.*$/i, "")
    .replace(/\s*[-–]\s*\d{1,3}\s*$/i, "")
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
    if (STATE_CITY_RE.test(sl) || (cityLower && sl === cityLower)) continue;
    if (DIRECTION_RE.test(sl)) continue;
    if (out.length && out[out.length - 1].toLowerCase() === sl) continue;
    out.push(seg);
  }
  let res = out.join(", ").trim();
  if (res) {
    res = res
      .replace(/,?\s*(?:uttar pradesh|\bup\b|haryana|delhi|new delhi|noida|gurugram|gurgaon|ghaziabad|faridabad)\s*$/i, "")
      .replace(/,?\s*(?:uttar pradesh|\bup\b|haryana|delhi|new delhi|noida|gurugram|gurgaon|ghaziabad|faridabad)\s*$/i, "")
      .trim();
  }
  if (!res) return "";
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

  for (const [re, name] of KNOWN_NCR_AREAS) {
    if (re.test(res)) {
      return name;
    }
  }

  if (
    DIRECTION_RE.test(res.trim()) ||
    STATE_CITY_RE.test(res.trim()) ||
    isJunkLocalityText(res, tutorName) ||
    res.length > 28
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

function cleanSheetEmail(email: string | null | undefined): string {
  if (!email) return "";
  let e = email.trim();
  if (!e.includes("@")) return "";
  if (/apnatutorhub\.com$/i.test(e)) return "";
  for (const [re, rep] of EMAIL_TYPO_FIXES) e = e.replace(re, rep);
  return e;
}

function cleanDisplayPhone(phone: string | null | undefined): string {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

// ── Lead Sectors with Coords ───────────────────────────────────────────────

interface ConcreteSectorLocality {
  name: string;
  city: string;
  lat: number;
  lng: number;
}

const HIGH_FIDELITY_SECTOR_LOCALITIES: ConcreteSectorLocality[] = [
  // Delhi
  { name: "Karol Bagh, Central Delhi", city: "Delhi", lat: 28.6517, lng: 77.1906 },
  { name: "Old Rajendra Nagar, Delhi", city: "Delhi", lat: 28.6415, lng: 77.1822 },
  { name: "Patel Nagar, Delhi", city: "Delhi", lat: 28.645, lng: 77.168 },
  { name: "Pusa Road, Delhi", city: "Delhi", lat: 28.6465, lng: 77.1855 },
  { name: "Connaught Place, New Delhi", city: "Delhi", lat: 28.6315, lng: 77.2167 },
  { name: "Gole Market, New Delhi", city: "Delhi", lat: 28.631, lng: 77.203 },
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
  { name: "Preet Vihar, East Delhi", city: "Delhi", lat: 28.6452, lng: 77.2967 },
  { name: "Mayur Vihar Phase 1, East Delhi", city: "Delhi", lat: 28.605, lng: 77.295 },
  { name: "Mayur Vihar Phase 2, East Delhi", city: "Delhi", lat: 28.618, lng: 77.305 },
  { name: "Laxmi Nagar, East Delhi", city: "Delhi", lat: 28.6304, lng: 77.2777 },
  { name: "IP Extension, Patparganj", city: "Delhi", lat: 28.629, lng: 77.305 },
  { name: "Anand Vihar, East Delhi", city: "Delhi", lat: 28.65, lng: 77.315 },
  { name: "Moti Nagar, West Delhi", city: "Delhi", lat: 28.6578, lng: 77.1428 },
  { name: "Shastri Nagar, North Delhi", city: "Delhi", lat: 28.6698, lng: 77.1812 },

  // Noida & Greater Noida
  { name: "Sector 62, Noida", city: "Noida", lat: 28.627, lng: 77.365 },
  { name: "Sector 50, Noida", city: "Noida", lat: 28.575, lng: 77.368 },
  { name: "Sector 18, Noida", city: "Noida", lat: 28.57, lng: 77.321 },
  { name: "Sector 76, Noida", city: "Noida", lat: 28.568, lng: 77.385 },
  { name: "Sector 137, Noida", city: "Noida", lat: 28.508, lng: 77.408 },
  { name: "Sector 128, Noida", city: "Noida", lat: 28.528, lng: 77.375 },
  { name: "Sector 44, Noida", city: "Noida", lat: 28.558, lng: 77.338 },
  { name: "Alpha 1, Greater Noida", city: "Greater Noida", lat: 28.4732, lng: 77.5106 },
  { name: "Beta 2, Greater Noida", city: "Greater Noida", lat: 28.4682, lng: 77.5015 },
  { name: "Omega 1, Greater Noida", city: "Greater Noida", lat: 28.455, lng: 77.518 },

  // Gurugram
  { name: "DLF Phase 4, Gurugram", city: "Gurugram", lat: 28.472, lng: 77.085 },
  { name: "DLF Phase 2, Gurugram", city: "Gurugram", lat: 28.489, lng: 77.089 },
  { name: "DLF Phase 5, Gurugram", city: "Gurugram", lat: 28.4595, lng: 77.0266 },
  { name: "Sector 56, Golf Course Road, Gurugram", city: "Gurugram", lat: 28.428, lng: 77.108 },
  { name: "Sector 49, Sohna Road, Gurugram", city: "Gurugram", lat: 28.421, lng: 77.045 },
  { name: "South City 1, Gurugram", city: "Gurugram", lat: 28.462, lng: 77.056 },
  { name: "Sector 14, Gurugram", city: "Gurugram", lat: 28.475, lng: 77.045 },

  // Ghaziabad
  { name: "Vaishali Sector 4, Ghaziabad", city: "Ghaziabad", lat: 28.648, lng: 77.34 },
  { name: "Indirapuram, Ghaziabad", city: "Ghaziabad", lat: 28.641, lng: 77.368 },
  { name: "Vasundhara, Ghaziabad", city: "Ghaziabad", lat: 28.661, lng: 77.362 },
  { name: "Raj Nagar Extension, Ghaziabad", city: "Ghaziabad", lat: 28.712, lng: 77.428 },
  { name: "Ankur Vihar, Loni", city: "Ghaziabad", lat: 28.729, lng: 77.285 },
  { name: "Indraprastha Colony, Loni", city: "Ghaziabad", lat: 28.735, lng: 77.292 },

  // Faridabad
  { name: "Sector 15, Faridabad", city: "Faridabad", lat: 28.408, lng: 77.321 },
  { name: "Sector 21C, Faridabad", city: "Faridabad", lat: 28.432, lng: 77.298 },
  { name: "NIT 5, Faridabad", city: "Faridabad", lat: 28.395, lng: 77.305 },

  // Mumbai
  { name: "Bandra West, Mumbai", city: "Mumbai", lat: 19.0596, lng: 72.8295 },
  { name: "Andheri West, Mumbai", city: "Mumbai", lat: 19.1363, lng: 72.8277 },
  { name: "Juhu, Mumbai", city: "Mumbai", lat: 19.1075, lng: 72.8263 },
  { name: "Powai, Mumbai", city: "Mumbai", lat: 19.1176, lng: 72.906 },
  { name: "Kandivali West, Mumbai", city: "Mumbai", lat: 19.2062, lng: 72.8427 },

  // Indore
  { name: "Vijay Nagar, Indore", city: "Indore", lat: 22.7533, lng: 75.8937 },
  { name: "Old Palasia, Indore", city: "Indore", lat: 22.7244, lng: 75.8839 },
  { name: "New Rani Bagh, Limbodi, Indore", city: "Indore", lat: 22.684, lng: 75.885 },
  { name: "Bhawarkua, Indore", city: "Indore", lat: 22.6924, lng: 75.8671 },

  // Lucknow
  { name: "Gomti Nagar, Lucknow", city: "Lucknow", lat: 26.85, lng: 81.0 },
  { name: "Aliganj, Lucknow", city: "Lucknow", lat: 26.885, lng: 80.94 },
  { name: "Indira Nagar, Lucknow", city: "Lucknow", lat: 26.878, lng: 80.995 },

  // Jaipur
  { name: "Vaishali Nagar, Jaipur", city: "Jaipur", lat: 26.915, lng: 75.74 },
  { name: "Malviya Nagar, Jaipur", city: "Jaipur", lat: 26.855, lng: 75.82 },
  { name: "Mansarovar, Jaipur", city: "Jaipur", lat: 26.865, lng: 75.765 },

  // Bengaluru
  { name: "Indiranagar, Bengaluru", city: "Bengaluru", lat: 12.9784, lng: 77.6408 },
  { name: "Koramangala, Bengaluru", city: "Bengaluru", lat: 12.9352, lng: 77.6245 },
  { name: "Whitefield, Bengaluru", city: "Bengaluru", lat: 12.9698, lng: 77.75 },

  // Kolkata
  { name: "Salt Lake Sector 1, Kolkata", city: "Kolkata", lat: 22.5867, lng: 88.41 },
  { name: "New Town Action Area 1, Kolkata", city: "Kolkata", lat: 22.5894, lng: 88.4688 },
  { name: "Ballygunge, Kolkata", city: "Kolkata", lat: 22.528, lng: 88.365 },

  // Pune
  { name: "Kothrud, Pune", city: "Pune", lat: 18.5074, lng: 73.8077 },
  { name: "Viman Nagar, Pune", city: "Pune", lat: 18.5679, lng: 73.9143 },

  // Patna
  { name: "Boring Road, Patna", city: "Patna", lat: 25.6173, lng: 85.1147 },
  { name: "Kankarbagh, Patna", city: "Patna", lat: 25.5977, lng: 85.1554 },

  // Ahmedabad
  { name: "Vastrapur, Ahmedabad", city: "Ahmedabad", lat: 23.035, lng: 72.5293 },
  { name: "Satellite, Ahmedabad", city: "Ahmedabad", lat: 23.03, lng: 72.518 },
];

function getStrictFee(grade: number, seed: number): { feeLine: string; isMonthly: boolean; min: number; max: number } {
  if (grade <= 5) {
    const bases = [6000, 6100, 6200, 6300, 6400, 6500];
    const base = bases[seed % bases.length];
    return {
      feeLine: `₹${base.toLocaleString("en-IN")} – ₹${(base + 150).toLocaleString("en-IN")} / month`,
      isMonthly: true,
      min: base,
      max: base + 150,
    };
  } else if (grade <= 8) {
    const bases = [6800, 6900, 7000, 7100, 7200, 7300, 7400];
    const base = bases[seed % bases.length];
    return {
      feeLine: `₹${base.toLocaleString("en-IN")} – ₹${(base + 150).toLocaleString("en-IN")} / month`,
      isMonthly: true,
      min: base,
      max: base + 150,
    };
  } else if (grade <= 10) {
    const bases = [700, 720, 750, 780, 800];
    const base = bases[seed % bases.length];
    return {
      feeLine: `₹${base} – ₹${base + 50} / hour`,
      isMonthly: false,
      min: base,
      max: base + 50,
    };
  } else {
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

function pickConcreteGrade(grades: number[], seed: number): number {
  if (grades.length === 1) return grades[0];
  const primary = grades.filter((g) => g <= 5);
  const middle = grades.filter((g) => g >= 6 && g <= 8);
  const secondary = grades.filter((g) => g >= 9 && g <= 10);
  const senior = grades.filter((g) => g >= 11 && g <= 12);
  const tiers = [senior, secondary, middle, primary].filter((t) => t.length > 0);
  const selectedTier = tiers[seed % tiers.length];
  return selectedTier[seed % selectedTier.length];
}

function makeAreaConcreteAndRealistic(area: string, city: string, seed: number): string {
  const clean = area.trim().replace(/^,\s*|,\s*$/g, "");
  const lower = clean.toLowerCase();
  const lookup: Record<string, string[]> = {
    mumbai: ["Bandra West (Hill Road Area), Mumbai", "Andheri West (Lokhandwala), Mumbai", "Juhu Scheme, Mumbai"],
    bengaluru: ["Indiranagar 100ft Road, Bengaluru", "Koramangala 4th Block, Bengaluru", "Whitefield Main Road, Bengaluru"],
    kolkata: ["Salt Lake Sector 1, Kolkata", "New Town Action Area 1, Kolkata", "Ballygunge Circular Road, Kolkata"],
    pune: ["Kothrud (Near Shivaji Statue), Pune", "Viman Nagar (Near Phoenix), Pune"],
    indore: ["Vijay Nagar (Scheme 54), Indore", "Old Palasia, Indore", "New Rani Bagh, Limbodi, Indore"],
    lucknow: ["Gomti Nagar Phase 2, Lucknow", "Aliganj Sector B, Lucknow", "Indira Nagar Sector 14, Lucknow"],
    jaipur: ["Vaishali Nagar, Jaipur", "Malviya Nagar Sector 3, Jaipur", "Mansarovar Sector 5, Jaipur"],
    patna: ["Boring Road (Near Chauraha), Patna", "Kankarbagh Colony, Patna"],
    ahmedabad: ["Vastrapur (Near Lake), Ahmedabad", "Satellite (Shivranjani), Ahmedabad"],
    delhi: ["Saket (J-Block), South Delhi", "Preet Vihar, East Delhi", "Rohini Sector 9, Delhi"],
    noida: ["Sector 62, Noida", "Sector 50, Noida", "Sector 137, Noida", "Sector 76, Noida"],
    gurugram: ["DLF Phase 4, Gurugram", "Sector 56, Golf Course Road, Gurugram", "South City 1, Gurugram"],
    ghaziabad: ["Vaishali Sector 4, Ghaziabad", "Indirapuram (Ahinsa Khand), Ghaziabad", "Vasundhara Sector 10, Ghaziabad"],
    faridabad: ["Sector 15, Faridabad", "Sector 21C, Faridabad", "NIT 5, Faridabad"],
  };
  if (lookup[lower]) {
    const opts = lookup[lower];
    return opts[seed % opts.length];
  }
  if (/\b(sector|sec\b|block|pocket|phase|enclave|colony|nagar|vihar|ext|extension|market|road|chowk|puram|park|crest|drive|heights|apartments|society)\b/i.test(clean)) {
    return clean;
  }
  return `${clean} (Main Colony Area)`;
}

export async function generateBatches() {
  console.log("=== Generating All Pre-Send Lead Message Batches ===");

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
          teachingMode: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  console.log(`Fetched ${tutors.length} active tutors from DB.`);

  const allQualifiedLeads: any[] = [];
  const ncrLeads: any[] = [];
  const otherCitiesLeads: any[] = [];
  const missingLocationFollowups: any[] = [];

  const seenPhones = new Set<string>();

  for (let idx = 0; idx < tutors.length; idx++) {
    const t = tutors[idx];
    const prof = t.tutorProfile;
    if (!prof) continue;

    if (isTestOrDemo(t.name, t.email || "")) continue;
    if (isJunkTutorName(t.name)) continue;

    const normPhone = normalizeIndiaWhatsApp(t.phone || "");
    if (!normPhone || normPhone.length !== 12 || !normPhone.startsWith("91")) continue;
    if (seenPhones.has(normPhone)) continue;
    seenPhones.add(normPhone);

    const tutorName = titleCaseName(t.name);
    const rawAddr = (prof.address || "").trim();
    const profileCity = (prof.city || "").trim();
    const hasSpecificLoc = rawAddr && !isJunkLocality(rawAddr) && !/^(delhi|delhi ncr|ncr|india|na|none|null)$/i.test(rawAddr);

    let rawLoc = hasSpecificLoc ? rawAddr : profileCity;

    // Subjects and classes check
    const classStr = Array.isArray(prof.classLevels)
      ? prof.classLevels.join(", ")
      : String(prof.classLevels || "");
    const subjectsList = Array.isArray(prof.subjects)
      ? prof.subjects.filter((s: string) => s && String(s).trim())
      : [];
    const subStr = subjectsList.join(", ");

    // Check if missing location entirely
    const hasAnyLoc = !!(profileCity || rawAddr);
    const isLocMissing =
      !hasAnyLoc ||
      (!hasSpecificLoc && (!profileCity || /^(delhi|delhi ncr|ncr|india|na|none|null)$/i.test(profileCity)));

    if (isLocMissing) {
      // Add to missing location follow-up batch
      const reminderMsg = [
        "Hello! 👋",
        "",
        "Thank you for connecting apnatutorhub.com",
        "",
        "Please share the following details so we can assign suitable tuition:",
        "",
        "1️⃣ Your Location / Area",
        "2️⃣ Subjects you want to teach",
        "3️⃣ Classes you want to teach (e.g., Nursery–5th, 6th–8th, 9th–10th, 11th–12th)",
        "",
        "ApnaTutorHub Team",
      ].join("\n");

      missingLocationFollowups.push({
        srNo: missingLocationFollowups.length + 1,
        userId: t.id,
        tutorName,
        phone: cleanDisplayPhone(t.phone),
        whatsappPhone: normPhone,
        email: cleanSheetEmail(t.email),
        status: "Missing Location / Unverified",
        templateName: "location_details_collection",
        renderedMessage: reminderMsg,
      });
      continue;
    }

    // Determine city & region
    const { city: tutorCity, isNcr } = deriveCity(profileCity, rawLoc);
    rawLoc = cleanLocalityDisplay(rawLoc, tutorCity, tutorName) || tutorCity;
    if (isJunkLocalityText(rawLoc, tutorName)) {
      rawLoc = tutorCity;
    }

    // Early-childhood only check (e.g. UKG, LKG, Nursery only)
    const combinedText = `${classStr} ${subStr}`;
    const hasSchoolGradeInClasses =
      /\b(?:class\s*)?(?:[1-9]|1[0-2])(?:st|nd|rd|th)?\b/i.test(combinedText) ||
      /\b(?:primary|middle|secondary|senior|high\s*school)\b/i.test(combinedText);
    const isOnlyEarlyChildhood =
      /\b(ukg|lkg|nursery|kg\b|kindergarten|pre-?primary|prep|playgroup)\b/i.test(combinedText) &&
      !hasSchoolGradeInClasses;
    if (isOnlyEarlyChildhood) continue;

    // Extract grades from both classLevels AND subjects
    const gradeSet = extractAllGrades(combinedText);
    if (gradeSet.size === 0 || subjectsList.length === 0) continue;

    const grades = Array.from(gradeSet);
    let concreteGrade = pickConcreteGrade(grades, idx);
    let targetSubject = resolveEnquirySubject(concreteGrade, subStr, idx);

    // If senior class (9-12), subject MUST be a real specific subject
    if (concreteGrade >= 9) {
      if (!targetSubject || /^(nursery|lkg|ukg|kg\b|kindergarten|pre-?primary|all subjects)$/i.test(targetSubject.trim())) {
        const junior = grades.filter((g) => g <= 8);
        if (junior.length > 0) {
          concreteGrade = junior[idx % junior.length];
          targetSubject = "All Subjects";
        } else {
          continue; // senior-only with no concrete subject
        }
      }
    }

    if (/^(nursery|lkg|ukg|kg\b|kindergarten|pre-?primary)$/i.test(targetSubject.trim())) {
      continue;
    }

    const targetClass = `Class ${concreteGrade}`;
    const feeInfo = getStrictFee(concreteGrade, idx);
    const parentName = parentNameForLead(`${t.id}`);

    // Locality and distance matching
    let lat = prof.latitude;
    let lng = prof.longitude;
    if (!lat || !lng || Math.abs(lat) < 0.1) {
      const resolved = resolveLocationCoordinates(rawLoc) || resolveLocationCoordinates(tutorCity);
      if (resolved) {
        lat = resolved.lat;
        lng = resolved.lng;
      }
    }

    let chosenLocality: { name: string; city: string; dist: number };
    const sameCitySectors = HIGH_FIDELITY_SECTOR_LOCALITIES.filter(
      (loc) => loc.city.toLowerCase() === tutorCity.toLowerCase()
    );

    if (sameCitySectors.length > 0 && lat && lng) {
      const distances = sameCitySectors.map((loc) => ({
        loc,
        dist: haversineDistanceKm(lat, lng, loc.lat, loc.lng),
      })).sort((a, b) => a.dist - b.dist);

      const within5km = distances.filter((d) => d.dist <= 5.0);
      if (within5km.length > 0) {
        const chosen = within5km[idx % Math.min(3, within5km.length)];
        chosenLocality = {
          name: polishSectorAreaName(chosen.loc.name, chosen.loc.city, idx),
          city: chosen.loc.city,
          dist: Math.max(0.4, Math.round(chosen.dist * 10) / 10),
        };
      } else {
        const cleanLoc = makeAreaConcreteAndRealistic(rawLoc, tutorCity, idx);
        const dist = Math.round((1.2 + (idx % 25) * 0.14) * 10) / 10;
        chosenLocality = {
          name: polishSectorAreaName(cleanLoc, tutorCity, idx),
          city: tutorCity,
          dist: Math.min(4.8, Math.max(0.4, dist)),
        };
      }
    } else {
      const cleanLoc = makeAreaConcreteAndRealistic(rawLoc, tutorCity, idx);
      const dist = Math.round((1.2 + (idx % 25) * 0.14) * 10) / 10;
      chosenLocality = {
        name: polishSectorAreaName(cleanLoc, tutorCity, idx),
        city: tutorCity,
        dist: Math.min(4.8, Math.max(0.4, dist)),
      };
    }

    const areaWithDistance = `${chosenLocality.name} (~${chosenLocality.dist} km nearby)`;
    const enquiryId = String(32200 + allQualifiedLeads.length + 1);

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

    const record = {
      srNo: allQualifiedLeads.length + 1,
      batchRegion: isNcr ? "NCR Offline" : "Other Cities / Online",
      userId: t.id,
      tutorName,
      phone: cleanDisplayPhone(t.phone),
      whatsappPhone: normPhone,
      email: cleanSheetEmail(t.email),
      tutorLocality: rawLoc,
      tutorCity,
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
      renderedMessage,
    };

    allQualifiedLeads.push(record);
    if (isNcr) {
      ncrLeads.push({ ...record, srNo: ncrLeads.length + 1 });
    } else {
      otherCitiesLeads.push({ ...record, srNo: otherCitiesLeads.length + 1 });
    }
  }

  console.log("\n======================================================");
  console.log("  BATCH GENERATION SUMMARY");
  console.log("======================================================");
  console.log(`Total Qualified Tutors (Location + Subject): ${allQualifiedLeads.length}`);
  console.log(`  - Group 1: NCR Tutors Batch:               ${ncrLeads.length}`);
  console.log(`  - Group 2: Other Cities Tutors Batch:       ${otherCitiesLeads.length}`);
  console.log(`Group 3: Tutors Missing Location (Follow-up): ${missingLocationFollowups.length}`);

  // Helper to save CSV with UTF-8 BOM
  function saveCsv(filePath: string, headers: string[], rows: any[][]) {
    const csvLines = [headers.join(",")];
    for (const row of rows) {
      csvLines.push(row.map((val) => `"${String(val ?? "").replace(/"/g, '""')}"`).join(","));
    }
    fs.writeFileSync(filePath, "\uFEFF" + csvLines.join("\n"), "utf8");
    console.log(`Saved CSV: ${filePath}`);
  }

  const exportDir = path.join(process.cwd(), "exports");
  if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });

  const leadHeaders = [
    "Sr No",
    "Batch / Region",
    "User ID",
    "Tutor Name",
    "Phone",
    "WhatsApp Phone (E164)",
    "Email",
    "Tutor Locality",
    "Tutor City",
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

  function leadToRow(r: any) {
    return [
      r.srNo,
      r.batchRegion,
      r.userId,
      r.tutorName,
      r.phone,
      r.whatsappPhone,
      r.email,
      r.tutorLocality,
      r.tutorCity,
      r.tutorSubjects,
      r.tutorClasses,
      r.targetClass,
      r.targetSubject,
      r.parentName,
      "Home Tuition (Offline)",
      r.leadArea,
      r.distanceKm,
      r.budget,
      r.enquiryId,
      r.templateId,
      r.renderedMessage,
    ];
  }

  // 1. Master All Qualified Leads
  const allCsvPath = path.join(exportDir, "presend_leads_all_location_subject.csv");
  const allJsonPath = path.join(exportDir, "presend_leads_all_location_subject.json");
  saveCsv(allCsvPath, leadHeaders, allQualifiedLeads.map(leadToRow));
  fs.writeFileSync(allJsonPath, JSON.stringify(allQualifiedLeads, null, 2), "utf8");

  // Also update legacy presend_tutor_leads_650.csv/json
  const legacyCsvPath = path.join(exportDir, "presend_tutor_leads_650.csv");
  const legacyJsonPath = path.join(exportDir, "presend_tutor_leads_650.json");
  saveCsv(legacyCsvPath, leadHeaders, allQualifiedLeads.map(leadToRow));
  fs.writeFileSync(legacyJsonPath, JSON.stringify(allQualifiedLeads, null, 2), "utf8");

  // 2. Separate NCR Batch
  const ncrCsvPath = path.join(exportDir, "presend_leads_ncr.csv");
  const ncrJsonPath = path.join(exportDir, "presend_leads_ncr.json");
  saveCsv(ncrCsvPath, leadHeaders, ncrLeads.map(leadToRow));
  fs.writeFileSync(ncrJsonPath, JSON.stringify(ncrLeads, null, 2), "utf8");

  // 3. Separate Other Cities Batch
  const otherCsvPath = path.join(exportDir, "presend_leads_other_cities.csv");
  const otherJsonPath = path.join(exportDir, "presend_leads_other_cities.json");
  saveCsv(otherCsvPath, leadHeaders, otherCitiesLeads.map(leadToRow));
  fs.writeFileSync(otherJsonPath, JSON.stringify(otherCitiesLeads, null, 2), "utf8");

  // 4. Missing Location Follow-up Batch
  const missingHeaders = [
    "Sr No",
    "User ID",
    "Tutor Name",
    "Phone",
    "WhatsApp Phone (E164)",
    "Email",
    "Status",
    "Template Name",
    "Rendered WhatsApp Message",
  ];
  const missingCsvPath = path.join(exportDir, "presend_missing_location_reminder.csv");
  const missingJsonPath = path.join(exportDir, "presend_missing_location_reminder.json");
  saveCsv(
    missingCsvPath,
    missingHeaders,
    missingLocationFollowups.map((r) => [
      r.srNo,
      r.userId,
      r.tutorName,
      r.phone,
      r.whatsappPhone,
      r.email,
      r.status,
      r.templateName,
      r.renderedMessage,
    ])
  );
  fs.writeFileSync(missingJsonPath, JSON.stringify(missingLocationFollowups, null, 2), "utf8");
}

generateBatches().catch(console.error);