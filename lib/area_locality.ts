import { stripAddressJunk } from "./format-rich-nearby-location";
import { INDIAN_CITY_COORDINATES } from "../lib/geocoding";

const AREA_ALIASES: Array<[RegExp, string]> = [
  [/\bsangam\s*vihar\b/i, "Sangam Vihar"],
  [/\b(cr\s*park|chittaranjan\s*park)\b/i, "CR Park"],
  [/\buttam\s*nagar\b/i, "Uttam Nagar"],
  [/\brohini\b/i, "Rohini"],
  [/\bdwarka\b/i, "Dwarka"],
  [/\bjanakpuri\b/i, "Janakpuri"],
  [/\bvikaspuri\b/i, "Vikaspuri"],
  [/\bpaschim\s*vihar\b/i, "Paschim Vihar"],
  [/\bpunjabi\s*bagh\b/i, "Punjabi Bagh"],
  [/\bsaket\b/i, "Saket"],
  [/\bmalviya\s*nagar\b/i, "Malviya Nagar"],
  [/\bhauz\s*khas\b/i, "Hauz Khas"],
  [/\bvasant\s*kunj\b/i, "Vasant Kunj"],
  [/\blajpat\s*nagar\b/i, "Lajpat Nagar"],
  [/\bkalkaji\b/i, "Kalkaji"],
  [/\b(greater\s*kailash|gk\s*[- ]?1)\b/i, "Greater Kailash"],
  [/\bmayur\s*vihar\b/i, "Mayur Vihar"],
  [/\blaxmi\s*nagar\b/i, "Laxmi Nagar"],
  [/\bpreet\s*vihar\b/i, "Preet Vihar"],
  [/\banand\s*vihar\b/i, "Anand Vihar"],
  [/\bshahdara\b/i, "Shahdara"],
  [/\bbadarpur\b/i, "Badarpur"],
  [/\bburari\b/i, "Burari"],
  [/\bgovindpuri\b/i, "Govindpuri"],
  [/\bpitampura\b|\bpitam\s*pura\b/i, "Pitampura"],
  [/\bmodel\s*town\b/i, "Model Town"],
  [/\bkamla\s*nagar\b/i, "Kamla Nagar"],
  [/\bcivil\s*lines\b/i, "Civil Lines"],
  [/\bgreen\s*park\b/i, "Green Park"],
  [/\bsouth\s*extension\b/i, "South Extension"],
  [/\balaknanda\b/i, "Alaknanda"],
  [/\bsainik\s*farm\b/i, "Sainik Farm"],
  [/\btagore\s*garden\b/i, "Tagore Garden"],
  [/\brajouri\s*garden\b/i, "Rajouri Garden"],
  [/\btilak\s*nagar\b/i, "Tilak Nagar"],
  [/\bpalam\b/i, "Palam"],
  [/\bnajafgarh\b/i, "Najafgarh"],
  [/\bkarol\s*bagh\b/i, "Karol Bagh"],
  [/\bpatel\s*nagar\b/i, "Patel Nagar"],
  [/\bmoti\s*nagar\b/i, "Moti Nagar"],
  [/\bshastri\s*nagar\b/i, "Shastri Nagar"],
  [/\badarsh\s*nagar\b/i, "Adarsh Nagar"],
  [/\bashok\s*vihar\b/i, "Ashok Vihar"],
  [/\bmukherjee\s*nagar\b|\bmukharjee\s*nagar\b|\bmukherji\s*nagar\b/i, "Mukherjee Nagar"],
  [/\bgtb\s*nagar\b/i, "GTB Nagar"],
  [/\bdilshad\s*garden\b/i, "Dilshad Garden"],
  [/\bindirapuram\b/i, "Indirapuram"],
  [/\bvaishali\b/i, "Vaishali"],
  [/\bvasundhara\b/i, "Vasundhara"],
  [/\bmunirka\b|\bmunirika\b/i, "Munirka"],
  [/\bnawada\b/i, "Nawada"],
  [/\bhari\s*nagar\b/i, "Hari Nagar"],
  [/\bshahpur\s*jat\b/i, "Shahpur Jat"],
  [/\bgautam\s*nagar\b/i, "Gautam Nagar"],
  [/\bjnu\b/i, "JNU Campus"],
  [/\bokhla\b/i, "Okhla"],
  [/\bjamia\s*nagar\b/i, "Jamia Nagar"],
  [/\bneb\s*sarai\b/i, "Neb Sarai"],
  [/\bdevli\b|\btigri\b/i, "Devli / Tigri"],
  [/\bchhatarpur\b|\bchattarpur\b/i, "Chhatarpur"],
  [/\baya\s*nagar\b/i, "Aya Nagar"],
  [/\bsultanpur\b/i, "Sultanpur"],
  [/\bghitorni\b/i, "Ghitorni"],
  [/\bmahipalpur\b/i, "Mahipalpur"],
  [/\bkapashera\b/i, "Kapashera"],
  [/\bbijwasan\b/i, "Bijwasan"],
  [/\bsector\s*[- ]?(\d+)\b/i, "Sector $1"],
  [/\bpaharganj\b/i, "Paharganj"],
  [/\bchandni\s*chowk\b/i, "Chandni Chowk"],
  [/\bturkman\s*gate\b/i, "Turkman Gate"],
  [/\bbatla\s*house\b/i, "Batla House"],
  [/\bjia\s*sarai\b/i, "Jia Sarai"],
  [/\bgokal\s*puri\b/i, "Gokal Puri"],
  [/\bnirankari\s*colony\b/i, "Nirankari Colony"],
  [/\brajinder\s*nagar\b|\brajendra\s*nagar\b|\brajender\s*nagar\b/i, "Rajinder Nagar"],
  [/\bvirender\s*nagar\b/i, "Virender Nagar"],
  [/\bjeevan\s*nagar\b/i, "Jeevan Nagar"],
  [/\bsarita\s*vihar\b/i, "Sarita Vihar"],
  [/\byamuna\s*vihar\b/i, "Yamuna Vihar"],
  [/\btrilokpuri\b/i, "Trilokpuri"],
  [/\bmohan\s*garden\b/i, "Mohan Garden"],
  [/\bmahavir\s*enclave\b/i, "Mahavir Enclave"],
  [/\bom\s*vihar\b/i, "Om Vihar"],
  [/\bqutub\s*vihar\b/i, "Qutub Vihar"],
  [/\bshyam\s*vihar\b/i, "Shyam Vihar"],
  [/\bkrishna\s*nagar\b/i, "Krishna Nagar"],
  [/\bkrishan\s*vihar\b/i, "Krishan Vihar"],
  [/\bkeshav\s*puram\b/i, "Keshav Puram"],
  [/\brani\s*bagh\b/i, "Rani Bagh"],
  [/\bshakarpur\b/i, "Shakarpur"],
  [/\bshalimar\s*bagh\b/i, "Shalimar Bagh"],
  [/\bazadpur\b/i, "Azadpur"],
  [/\bjahangirpuri\b/i, "Jahangirpuri"],
  [/\bkirti\s*nagar\b/i, "Kirti Nagar"],
  [/\bmoti\s*bagh\b/i, "Moti Bagh"],
  [/\btimarpur\b/i, "Timarpur"],
  [/\bvishnu\s*garden\b/i, "Vishnu Garden"],
  [/\bvishwas\s*park\b/i, "Vishwas Park"],
  [/\bvivekanand\s*puri\b/i, "Vivekanand Puri"],
  [/\bwazirabad\b/i, "Wazirabad"],
  [/\bmandawali\b/i, "Mandawali"],
  [/\bmayapuri\b/i, "Mayapuri"],
  [/\bmangolpuri\b/i, "Mangolpuri"],
  [/\bkarala\b/i, "Karala"],
  [/\bkirari\b/i, "Kirari"],
  [/\bnangloi\b/i, "Nangloi"],
  [/\bmadhuban\b/i, "Madhuban"],
  [/\bindraprastha\b/i, "Indraprastha"],
  [/\bashram\b/i, "Ashram"],
  [/\bvidhan\s*sabha\b/i, "Vidhan Sabha"],
  [/\bpratp?at\s*nagar\b/i, "Pratap Nagar"],
];

const CITY_KEYS = new Set(Object.keys(INDIAN_CITY_COORDINATES));
const EXTRA_CITIES = new Set(["shimla","sonipat","rohtak","modinagar","nainital","saharanpur","gurugram","gurgaon","greater noida","new delhi"]);

const GENERIC_SEGMENT =
  /^(delhi|new delhi|north delhi|south delhi|east delhi|west delhi|central delhi|north east delhi|north west delhi|south east delhi|south west delhi|north west|south west|south east|north east|ncr|delhi ncr|india|uttar pradesh|haryana|up|noida|greater noida|gurgaon|gurugram|ghaziabad|faridabad|south|north|east|west|central)$/i;

const REAL_CITY_NAMES = new Set([
  "delhi", "new delhi", "noida", "greater noida", "gurgaon", "gurugram", "ghaziabad", "faridabad",
  "mumbai", "bengaluru", "bangalore", "kolkata", "chennai", "hyderabad", "pune", "ahmedabad",
  "jaipur", "lucknow", "kanpur", "kanpur nagar", "agra", "varanasi", "aligarh", "bareilly", "meerut", "rohtak",
  "sonipat", "modinagar", "dehradun", "chandigarh", "shimla", "nainital", "madurai", "indore",
  "bhopal", "patna", "ranchi", "ludhiana", "amritsar", "jalandhar", "vadodara", "rajkot",
  "nashik", "aurangabad", "bhubaneswar", "cuttack", "raipur", "guwahati", "kochi", "coimbatore",
  "visakhapatnam", "vizag", "vijayawada", "gwalior", "jabalpur", "jodhpur", "prayagraj", "allahabad",
  "saharanpur", "haldwani", "budaun", "badaun", "mandi", "bardhaman", "burdwan", "purba bardhaman",
  "gautam buddha Nagar", "gautam buddha nagar",
]);

const KNOWN_CITY_OR_STATE = new Set([
  ...REAL_CITY_NAMES,
  "ncr", "delhi ncr", "india", "uttar pradesh", "haryana", "up",
  "assam", "maharashtra", "rajasthan", "himachal pradesh", "jammu and kashmir", "jharkhand",
  "madhya pradesh", "tamil nadu", "uttarakhand", "bihar", "punjab", "gujarat", "kerala",
  "karnataka", "telangana", "andhra pradesh", "odisha", "west bengal", "chhattisgarh", "goa",
  "south", "north", "east", "west", "central",
]);

export function isCityOrStateName(loc?: string | null): boolean {
  const s = (loc || "").trim().toLowerCase();
  if (!s) return false;
  return KNOWN_CITY_OR_STATE.has(s) || GENERIC_SEGMENT.test(s) || STATE_ONLY.test(s);
}

const STATE_ONLY =
  /^(assam|maharashtra|rajasthan|himachal pradesh|jammu and kashmir|jharkhand|madhya pradesh|tamil nadu|uttarakhand|bihar|uttar pradesh|haryana|punjab|gujarat|kerala|karnataka|telangana|andhra pradesh|odisha|west bengal|chhattisgarh|goa|india)$/i;

const SUBJECT_JUNK =
  /\b(all subjects?|maths?|mathematics|science|chemistry|physics|biology|accountancy|economics|english|hindi|sst|social science|commerce|computer|sanskrit|french|german|pcm|pcb|humanities|arts)\b/i;

const REQUEST_JUNK =
  /\b(can you|do u have|do you have|provide students?|online mode|i can'?t|location at|sector kon|not pay|home tutor at|students in|mai abhi|need tutor|tutor chahiye|max \d+\s*km|from border)\b/i;

const HOUSE_LEAD =
  /^(?:[a-z]?\s*-?\s*\d+[\w\-\/\.]*|wz|rz|h\.?\s*no\.?|house|plot|flat|shop|room|gali\s*(?:no\.?)?\s*\d+|near|opp\.?|opposite|behind|above|below|beside)\b[\s,\.\-]*/i;

const LOCALITY_SUFFIX =
  /\b(nagar|vihar|colony|enclave|puram|park|garden|bagh|sector|block|phase|extension|extn|market|road|marg|gali|chowk|khan|pura|abad|garh|pur|puri|lines?|city|greens|residency|apartment|complex|society|farm|village|basti|camp|area|square|tri|teela|mandi|bazar|bazaar|gate|kunj|dham|wadi|campus|prastha|gram|khurd|kalan)\b/i;

function titleCaseLocality(s: string): string {
  return s.toLowerCase().split(/\s+/).filter(Boolean).map((w) => /^(gtb|cr|gk|jnu|ncr|dlf|sec)$/.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)).join(" ").replace(/[\s,\.\-]+$/, "").slice(0, 42);
}

function cleanSegments(raw: string): string[] {
  const normalized = stripAddressJunk(raw)
    .replace(/\bsector\s*[-–]\s*(\d+)\b/gi, "Sector $1")
    .replace(/\bsector\s*(?:pie|pi)[\s-]*(\d+)\b/gi, "Sector Pi $1")
    .replace(/\bsec\.?\s*[-–]?\s*(\d+)\b/gi, "Sector $1")
    .replace(/\s+/g, " ").trim();
  const out: string[] = [];
  for (let seg of normalized.split(",")) {
    seg = seg.replace(HOUSE_LEAD, "").replace(/\s+/g, " ").trim();
    seg = seg.replace(/(?:\s*[-–]\s*\d{2,6}|\s+\b(?:delhi|new delhi|noida|gurugram|gurgaon|ghaziabad|faridabad)\b)\s*$/i, "").trim();
    seg = seg.replace(/[\s,\.\-]+$/, "");
    if (!seg || seg.length < 2) continue;
    if (REAL_CITY_NAMES.has(seg.toLowerCase()) || GENERIC_SEGMENT.test(seg) || STATE_ONLY.test(seg)) continue;
    if (/^\d{1,6}$/.test(seg)) continue;
    if (SUBJECT_JUNK.test(seg) || REQUEST_JUNK.test(seg)) continue;
    if (/\b(house|flat|plot|shop|clinic|hospital|school|academy|institute|coaching|tuition|classes|underpass|flyover|overpass|lane|floor|transformer|gali)\b/i.test(seg) && !/(?:nagar|vihar|colony|enclave|puram|park|garden|bagh|sector|market|road|marg|chowk|pura|pur|puri|extension|residency|society|campus|prastha|gram)\s*$/i.test(seg)) continue;
    if (!out.some((x) => x.toLowerCase() === seg.toLowerCase())) out.push(seg);
  }
  return out;
}

// A bare suffix (e.g. "Pur" carved out of "Raghunathpur") is not a usable
// locality. This is the last line of defence before a value reaches the export.
const WEAK_LOCALITY =
  /^(pur|puri|nagar|vihar|colony|enclave|puram|park|garden|bagh|road|marg|chowk|market|mandi|bazar|bazaar|gate|kunj|city|gram|khurd|kalan|block|phase|sector|extension|farm|village|camp|area|square|wadi|campus|prastha|lines?|complex|residency|society|apartment|greens|tri|teela|dham)$/i;

export function extractLocality(raw?: string | null): string {
  const out = computeLocality(raw);
  if (!out || out.length < 3 || WEAK_LOCALITY.test(out) || isCityOrStateName(out)) return "";
  return out;
}

function computeLocality(raw?: string | null): string {
  const s = (raw || "").trim();
  if (!s || s.length < 3) return "";
  if (/^-?\d{1,3}(?:\.\d+)?\s*,\s*-?\d{1,3}(?:\.\d+)?$/.test(s)) return "";
  if (/location at|latitude|longitude/i.test(s)) return "";
  if (SUBJECT_JUNK.test(s) || REQUEST_JUNK.test(s)) return "";
  if (/\bsector\s+(?:chi|kon|kaun|konsa|which)\b/i.test(s)) return "";

  const cleaned = stripAddressJunk(s)
    .replace(/\bsector\s*[-–]\s*(\d+)\b/gi, "Sector $1")
    .replace(/\bsector\s*(?:pie|pi)[\s-]*(\d+)\b/gi, "Sector Pi $1")
    .replace(/\bsec\.?\s*[-–]?\s*(\d+)\b/gi, "Sector $1")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned || s) {
    const aliasHay = `${cleaned} ${s}`;
    for (const [re, name] of AREA_ALIASES) {
      if (re.test(aliasHay) && !isCityOrStateName(name)) {
        if (name.startsWith("Sector ")) {
          const m = cleaned.match(/\bsector\s*(?:pi\s*)?[-\s]*(\d+)\b/i);
          if (m) return `Sector ${m[1]}`;
          const pi = cleaned.match(/\bsector\s*pi\s*(\d+)\b/i);
          if (pi) return `Sector Pi ${pi[1]}`;
        }
        return name;
      }
    }
  }

  const segments = cleanSegments(s);
  const joinedAll = segments.join(", ");
  if (!segments.length) return "";
  if (segments.length === 1 && (/^sector$/i.test(segments[0]) || /^phase\s*\d*$/i.test(segments[0]) || /^block\s*[a-z0-9]*$/i.test(segments[0]))) return "";
  let areaSegments = segments.filter((seg) => !isCityOrStateName(seg));
  if (!areaSegments.length) {
    const sectorOnly = segments.find((seg) => /^sector\s*(?:pi\s*)?\d+$/i.test(seg));
    if (sectorOnly) areaSegments = [sectorOnly];
  }
  if (!areaSegments.length) {
    const tail = joinedAll.match(/((?:[A-Za-z][A-Za-z.'-]*\s+){0,2}(?:Nagar|Vihar|Colony|Enclave|Puram|Park|Garden|Bagh|Sector\s*(?:Pi\s*)?\d+|Block\s*[A-Za-z0-9]+|Phase\s*\d+|Extension|Market|Road|Marg|Chowk|Pura|Pur|Puri|Residency|Society|Campus|Prastha|Gram))\s*$/i);
    if (!tail) return "";
    return titleCaseLocality(tail[1].trim());
  }
  const joined = areaSegments.join(", ");

  for (const [re, name] of AREA_ALIASES) {
    if (re.test(joined)) {
      if (name.startsWith("Sector ")) {
        const m = joined.match(/\bsector\s*(?:pi\s*)?[-\s]*(\d+)\b/i);
        if (m) return `Sector ${m[1]}`;
        const pi = joined.match(/\bsector\s*pi\s*(\d+)\b/i);
        if (pi) return `Sector Pi ${pi[1]}`;
      }
      return name;
    }
  }

  const suffixSeg = areaSegments.find((seg) => LOCALITY_SUFFIX.test(seg) && !/^phase\s*\d*$/i.test(seg));
  if (suffixSeg) {
    const compact = suffixSeg.match(/((?:[A-Za-z][A-Za-z.'-]*\s+){0,2}(?:Nagar|Vihar|Colony|Enclave|Puram|Park|Garden|Bagh|Sector\s*(?:Pi\s*)?\d+|Block\s*[A-Za-z0-9]+|Phase\s*\d+|Extension|Market|Road|Marg|Gali|Chowk|Khan|Pura|Abad|Garh|Pur|Puri|Lines?|City|Greens|Residency|Apartment|Complex|Society|Farm|Village|Basti|Camp|Area|Square|Mandi|Bazar|Bazaar|Gate|Kunj|Wadi|Campus|Prastha|Gram|Khurd|Kalan))\s*$/i);
    return titleCaseLocality(compact ? compact[1].trim() : suffixSeg);
  }

  if (areaSegments.length >= 2) {
    const first = areaSegments[0];
    const compact = first.match(/((?:[A-Za-z][A-Za-z.'-]*\s+){0,2}(?:Nagar|Vihar|Colony|Enclave|Puram|Park|Garden|Bagh|Extension|Market|Road|Marg|Chowk|Pura|Pur|Puri|Lines?|Residency|Society|Farm|Village|Basti|Camp|Area|Square|Mandi|Bazar|Bazaar|Gate|Kunj|Wadi|Campus|Prastha|Gram|Khurd|Kalan))\s*$/i);
    return titleCaseLocality(compact ? compact[1].trim() : first);
  }
  if (areaSegments.length === 1 && segments.length > 1) return titleCaseLocality(areaSegments[0]);
  return "";
}

export function isSpecificLocality(raw?: string | null): boolean {
  return extractLocality(raw).length > 0;
}

// ── City normalisation ────────────────────────────────────────────────────────
// Raw `city` values in the DB are messy: some are real cities, some are
// localities (e.g. "Dwarka", "Saket", "Khanpur", "Model Town"). The City column
// must contain ONLY real city names, so look for a known city in the city field
// first, then in the address. If neither has one, leave City blank.
const CITY_ALIASES: Array<[RegExp, string]> = [
  [/\bgreater\s*noida\b/i, "Greater Noida"],
  [/\bgautam\s*buddha\s*nagar\b/i, "Greater Noida"],
  [/\bnew\s*delhi\b/i, "Delhi"],
  [/\bdelhi\s*ncr\b/i, "Delhi"],
  [/\bncr\b/i, "Delhi"],
  [/\bdelhi\b/i, "Delhi"],
  [/\bnoida\b/i, "Noida"],
  [/\bgurgaon\b|\bgurugram\b/i, "Gurugram"],
  [/\bghaziabad\b/i, "Ghaziabad"],
  [/\bfaridabad\b/i, "Faridabad"],
  [/\bsonipat\b|\bsonepat\b/i, "Sonipat"],
  [/\brohtak\b/i, "Rohtak"],
  [/\bmeerut\b/i, "Meerut"],
  [/\bmodinagar\b/i, "Modinagar"],
  [/\bdehradun\b/i, "Dehradun"],
  [/\bchandigarh\b/i, "Chandigarh"],
  [/\bshimla\b/i, "Shimla"],
  [/\bnainital\b/i, "Nainital"],
  [/\bhaldwani\b/i, "Haldwani"],
  [/\bsaharanpur\b/i, "Saharanpur"],
  [/\bmumbai\b|\bbombay\b/i, "Mumbai"],
  [/\bbengaluru\b|\bbangalore\b/i, "Bengaluru"],
  [/\bkolkata\b|\bcalcutta\b/i, "Kolkata"],
  [/\bchennai\b|\bmadras\b/i, "Chennai"],
  [/\bhyderabad\b/i, "Hyderabad"],
  [/\bpune\b/i, "Pune"],
  [/\bahmedabad\b/i, "Ahmedabad"],
  [/\bjaipur\b/i, "Jaipur"],
  [/\blucknow\b/i, "Lucknow"],
  [/\bkanpur\b/i, "Kanpur"],
  [/\bbudaun\b|\bbadaun\b/i, "Budaun"],
  [/\bagra\b/i, "Agra"],
  [/\bvaranasi\b|\bvanaras\b/i, "Varanasi"],
  [/\baligarh\b/i, "Aligarh"],
  [/\bbareilly\b/i, "Bareilly"],
  [/\bmandi\b/i, "Mandi"],
  [/\bindore\b/i, "Indore"],
  [/\bbhopal\b/i, "Bhopal"],
  [/\bpatna\b/i, "Patna"],
  [/\branchi\b/i, "Ranchi"],
  [/\bludhiana\b/i, "Ludhiana"],
  [/\bamritsar\b/i, "Amritsar"],
  [/\bjalandhar\b/i, "Jalandhar"],
  [/\bvadodara\b|\bbaroda\b/i, "Vadodara"],
  [/\brajkot\b/i, "Rajkot"],
  [/\bnashik\b/i, "Nashik"],
  [/\baurangabad\b/i, "Aurangabad"],
  [/\bbhubaneswar\b/i, "Bhubaneswar"],
  [/\bcuttack\b/i, "Cuttack"],
  [/\braipur\b/i, "Raipur"],
  [/\bguwahati\b/i, "Guwahati"],
  [/\bkochi\b|\bcochin\b/i, "Kochi"],
  [/\bcoimbatore\b/i, "Coimbatore"],
  [/\bvisakhapatnam\b|\bvizag\b/i, "Visakhapatnam"],
  [/\bvijayawada\b/i, "Vijayawada"],
  [/\bgwalior\b/i, "Gwalior"],
  [/\bjabalpur\b/i, "Jabalpur"],
  [/\bjodhpur\b/i, "Jodhpur"],
  [/\bprayagraj\b|\ballahabad\b/i, "Prayagraj"],
  [/\bbardhaman\b|\bburdwan\b|\bpurba\s*bardhaman\b/i, "Bardhaman"],
  [/\bmadurai\b/i, "Madurai"],
];

const CITY_BY_LOCALITY = new Map<string, string>([
  ["Indirapuram", "Ghaziabad"], ["Vaishali", "Ghaziabad"], ["Vasundhara", "Ghaziabad"],
  ["Pari Chowk", "Greater Noida"], ["Delta 1", "Greater Noida"], ["Gaur City 1", "Greater Noida"],
  ["Gaur City 2", "Greater Noida"], ["Sector Pi 1", "Greater Noida"],
]);

const DELHI_LOCALITIES = new Set([
  "Sangam Vihar","CR Park","Uttam Nagar","Rohini","Dwarka","Janakpuri","Vikaspuri","Paschim Vihar",
  "Punjabi Bagh","Saket","Malviya Nagar","Hauz Khas","Vasant Kunj","Lajpat Nagar","Kalkaji",
  "Greater Kailash","Mayur Vihar","Laxmi Nagar","Preet Vihar","Anand Vihar","Shahdara","Badarpur",
  "Burari","Govindpuri","Pitampura","Model Town","Kamla Nagar","Civil Lines","Green Park",
  "South Extension","Alaknanda","Sainik Farm","Tagore Garden","Rajouri Garden","Tilak Nagar","Palam",
  "Najafgarh","Karol Bagh","Patel Nagar","Moti Nagar","Shastri Nagar","Adarsh Nagar","Ashok Vihar",
  "Mukherjee Nagar","GTB Nagar","Dilshad Garden","Munirka","Nawada","Hari Nagar","Shahpur Jat",
  "Gautam Nagar","JNU Campus","Okhla","Jamia Nagar","Neb Sarai","Devli / Tigri","Chhatarpur",
  "Aya Nagar","Ghitorni","Mahipalpur","Kapashera","Bijwasan","Paharganj","Chandni Chowk",
  "Turkman Gate","Batla House","Jia Sarai","Gokal Puri","Nirankari Colony","Rajinder Nagar",
  "Virender Nagar","Jeevan Nagar","Sarita Vihar","Yamuna Vihar","Trilokpuri","Mohan Garden",
  "Mahavir Enclave","Om Vihar","Qutub Vihar","Shyam Vihar","Krishna Nagar","Krishan Vihar",
  "Keshav Puram","Rani Bagh","Shakarpur","Shalimar Bagh","Azadpur","Jahangirpuri","Kirti Nagar",
  "Moti Bagh","Timarpur","Vishnu Garden","Vishwas Park","Vivekanand Puri","Wazirabad","Mandawali",
  "Mayapuri","Maya Puri","Mangolpuri","Karala","Kirari","Nangloi","Madhuban","Indraprastha",
  "Ashram","Vidhan Sabha","Pratap Nagar","Freedom Fighter Colony","Aadham Pur","Sant Nagar",
  "Vijay Nagar","Shakti Nagar","Hardev Nagar","Prashant Vihar","Sanjay Nagar","Ashok Nagar",
  "Vikas Nagar","Swaroop Nagar","Ayurvigyan Nagar","Kidwai Nagar","Raj Nagar","Vinod Nagar",
  "Hakikat Nagar","Roop Nagar","Derawal Nagar","Ganga Nagar","Lodhi Road Complex","Malka Ganj",
  "Jhilmil","Tagore Park","Baba Temple Road","Loni Road","Gur Mandi","Sadar Bazar","Khand Park Road",
  "Probyn Road Staff Flats","Inder Enclave","Shaki Nagar","Gtp Nagar","Alipur","New Ashok Nagar",
  "Vijay Vihar Phase 2","Giri Nagar","Tri Nagar","Karawal Nagar","New Panchwati Colony","Aya Nagar Johar",
  "Sector 110",
]);

export function normalizeCity(
  city?: string | null,
  address?: string | null,
  locality?: string | null,
  state?: string | null
): string {
  for (const hay of [city || "", address || ""]) {
    if (!hay) continue;
    for (const [re, name] of CITY_ALIASES) {
      if (re.test(hay)) return name;
    }
  }
  const st = (state || "").trim().toLowerCase();
  if (st === "delhi" || st === "new delhi" || st === "ncr" || st === "delhi ncr") return "Delhi";
  if (locality) {
    const hint = CITY_BY_LOCALITY.get(locality);
    if (hint) return hint;
    if (DELHI_LOCALITIES.has(locality)) return "Delhi";
  }
  return "";
}
