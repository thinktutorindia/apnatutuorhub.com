/**
 * lib/format-rich-nearby-location.ts
 *
 * Rich, REAL-feeling area formatting for tuition enquiry cards:
 *   "Karol Bagh, Padam Singh Road (near Metro Gate 3)"
 *   "Rohini, Sector 9 (near DC Chowk)"
 *
 * Hard rules:
 *  - NEVER shows scraped junk: house numbers ("14/1"), "above <Shop Name>",
 *    "opp/behind <X>" positional fragments, bare building names.
 *  - NEVER shows a bare city name ("Delhi", "Noida") alone as the area.
 *  - Always ends with a believable near-landmark: either a real one from
 *    LOCALITY_LANDMARK_MAP / the address itself, or a generic-real one
 *    (Main Market / Main Chowk / Community Centre).
 */

const LOCALITY_LANDMARK_MAP: Record<string, string> = {
  "sangam vihar": "Sangam Vihar, Gali No. 16 (near Kumar Sweets)",
  saket: "Saket, Block J (near Central Market)",
  "malviya nagar": "Malviya Nagar, Shivalik Road (near Mother Dairy)",
  pitampura: "Pitampura, Saraswati Vihar (near Aggarwal Sweets)",
  "patel nagar": "Patel Nagar, West Patel Nagar, Gali No. 4 (near Metro Gate 2)",
  "kamla nagar": "Kamla Nagar, Bungalow Road (near Spark Mall)",
  "civil lines": "Civil Lines, Rajpur Road (near Metro Station)",
  "rani bagh": "Rani Bagh, Main Market (near Shiva Mandir)",
  "gautam nagar": "Gautam Nagar, Gulmohar Enclave (near Father Agnel School)",
  kalkaji: "Kalkaji, Block B (near Rampuri Gurudwara)",
  "lajpat nagar": "Lajpat Nagar, Part 4 (near National Market)",
  rohini: "Rohini, Sector 9 (near DC Chowk)",
  dwarka: "Dwarka, Sector 12 (near City Centre)",
  janakpuri: "Janakpuri, Block C2 (near District Centre)",
  "hauz khas": "Hauz Khas, E Block (near Aurobindo Market)",
  "vasant kunj": "Vasant Kunj, Sector B (near Fortis Hospital)",
  "mayur vihar": "Mayur Vihar, Phase 1, Pocket 4 (near Acharya Niketan)",
  "laxmi nagar": "Laxmi Nagar, Vijay Block (near Metro Gate 1)",
  "paschim vihar": "Paschim Vihar, B3 Block (near Jwala Heri Market)",
  "punjabi bagh": "Punjabi Bagh, West Punjabi Bagh (near Club Road)",
  "rajouri garden": "Rajouri Garden, Block F (near Main Market)",
  vikaspuri: "Vikaspuri, Block G (near Oxford School)",
  "uttam nagar": "Uttam Nagar, Mohan Garden (near Pillar 745)",
  "preet vihar": "Preet Vihar, G Block (near Metro Station)",
  "anand vihar": "Anand Vihar, C Block (near Railway Station)",
  "nehru place": "Nehru Place (near Paras Cinema)",
  noida: "Noida, Sector 15 (near Gulmohar Market)",
  gurgaon: "Gurugram, Sector 14 (near Main Market)",
  gurugram: "Gurugram, Sector 14 (near Main Market)",
  faridabad: "Faridabad, Sector 16 (near Old Faridabad Metro)",
  ghaziabad: "Ghaziabad, Raj Nagar (near RDC Market)",
  indirapuram: "Indirapuram, Niti Khand 1 (near Swarna Jayanti Park)",
  vaishali: "Vaishali, Sector 4 (near Metro Gate 2)",
  shahdara: "Shahdara, Naveen Shahdara (near Shyam Lal College)",
  "geeta colony": "Geeta Colony, Block 7 (near Taj Enclave)",
  "krishna nagar": "Krishna Nagar, Lal Quarter (near Ghondli Chowk)",
  "karol bagh": "Karol Bagh, Padam Singh Road (near Metro Gate 3)",
  "subhash nagar": "Subhash Nagar, Block 8 (near Pacific Mall)",
  "tilak nagar": "Tilak Nagar, Main Market (near Metro Gate 1)",
  "shalimar bagh": "Shalimar Bagh, BP Block (near Club)",
  "model town": "Model Town, Phase 2 (near Gujranwala Town)",
  "ashok vihar": "Ashok Vihar, Phase 1 (near Deep Market)",
};

const BARE_CITY_SET = new Set([
  "delhi", "new delhi", "ncr", "delhi ncr", "noida", "greater noida",
  "gurgaon", "gurugram", "ghaziabad", "faridabad", "mumbai", "lucknow",
  "patna", "kolkata", "indore", "jaipur", "madurai", "gandhinagar",
  "ahmedabad", "ahemdavad", "india", "up", "haryana", "uttar pradesh",
  "west delhi", "south delhi", "east delhi", "north delhi", "central delhi",
  "old delhi", "south west delhi", "north west delhi", "north east delhi",
  // states — never a locality
  "rajasthan", "uttarakhand", "punjab", "bihar", "west bengal",
  "madhya pradesh", "maharashtra", "gujarat", "odisha", "orissa",
  "jharkhand", "chhattisgarh", "himachal pradesh", "assam",
  "andhra pradesh", "telangana", "tamil nadu", "karnataka", "kerala", "goa",
  "pincode",
]);

/**
 * Curated sub-areas per known locality — rotated by seed so 40 tutors in the
 * same city don't all show the same sector ("Rohini, Sector 9" x40 felt fake).
 */
const SUB_AREA_ROTATION: Record<string, string[]> = {
  rohini: ["Sector 7", "Sector 8", "Sector 9", "Sector 14", "Sector 15", "Sector 24"],
  dwarka: ["Sector 6", "Sector 10", "Sector 12", "Sector 19"],
  janakpuri: ["Block A1", "Block B1", "Block C2", "Block D"],
  noida: ["Sector 15", "Sector 18", "Sector 50", "Sector 62", "Sector 76", "Sector 137"],
  gurgaon: ["Sector 14", "Sector 40", "Sector 56", "South City 1"],
  gurugram: ["Sector 14", "Sector 40", "Sector 56", "South City 1"],
  faridabad: ["Sector 15", "Sector 16", "Sector 21C", "NIT 5"],
  ghaziabad: ["Raj Nagar", "Raj Nagar Extension", "RDC Colony"],
  vaishali: ["Sector 2", "Sector 4", "Sector 5"],
  saket: ["Block J", "Block D", "Block G"],
  "malviya nagar": ["Shivalik Road", "Hauz Rani", "Block E"],
  "lajpat nagar": ["Part 2", "Part 3", "Part 4"],
  "laxmi nagar": ["Vijay Block", "Shakarpur", "Block 9"],
  "preet vihar": ["G Block", "A Block", "C Block"],
  "anand vihar": ["C Block", "B Block", "I.P. Extension"],
  "kamla nagar": ["Bungalow Road", "Jawahar Nagar", "Hudson Lane"],
  "model town": ["Phase 1", "Phase 2", "Gujranwala Town", "Kingsway Camp"],
  "paschim vihar": ["B3 Block", "A5 Block", "B1 Block"],
  "punjabi bagh": ["West Punjabi Bagh", "Club Road", "Road No. 13"],
  "rajouri garden": ["Block F", "Block C", "Tagore Garden"],
  vikaspuri: ["Block G", "Block J", "Block M"],
  "uttam nagar": ["Mohan Garden", "Matiyala", "Pankha Road"],
  "karol bagh": ["Padam Singh Road", "WEA Colony", "Dev Nagar"],
  pitampura: ["Saraswati Vihar", "Kohat Enclave", "Deepali Enclave"],
  kalkaji: ["Block B", "Block D", "Govindpuri"],
  "hauz khas": ["E Block", "A Block", "Sarvodaya Enclave"],
  "mayur vihar": ["Phase 1", "Phase 2", "Phase 3"],
  "tilak nagar": ["Khyala", "Vishnu Garden", "Fateh Nagar"],
  "vasant kunj": ["Sector B", "Sector C", "Kishangarh"],
  "geeta colony": ["Block 7", "Block 9", "Block 12"],
  shahdara: ["Naveen Shahdara", "Balbir Nagar", "Jhilmil"],
  "krishna nagar": ["Lal Quarter", "Chhota Bazaar", "East End Apartments"],
  "subhash nagar": ["Block 8", "Block 5", "Ashok Nagar"],
  "shalimar bagh": ["BP Block", "AB Block", "CC Block"],
  "ashok vihar": ["Phase 1", "Phase 2", "Phase 3"],
  "sangam vihar": ["Devli Road", "Tigri Extension", "Gali No. 16"],
  "rani bagh": ["Multani Mohalla", "Sindhu Vihar", "Main Bazaar"],
  "gautam nagar": ["Gulmohar Enclave", "Block B", "Yusuf Sarai"],
  "civil lines": ["Rajpur Road", "Underhill Road", "Meta Estate"],
  "patel nagar": ["West Patel Nagar", "East Patel Nagar", "South Patel Nagar"],
  "nehru place": ["Nehru Enclave", "Kalkaji Extension", "Nikhil Vihar"],
  indirapuram: ["Niti Khand 1", "Niti Khand 2", "Ahinsa Khand 1", "Nyay Khand 1"],
  rohtak: ["Model Town", "Sector 1", "Shanti Nagar", "Jawahar Colony"],
  kanpur: ["Civil Lines", "Swaroop Nagar", "Kakadeo"],
  aligarh: ["Civil Lines", "Centre Point", "Ramghat Road"],
};

/** A segment that is a building/society name, not a locality. */
const BUILDING_RE = /\b(the\s+[a-z]{3,}|crest|towers?|tower|apartments?|flats|residency|heights|villas?|condo|conclave|society|greensonet|greens)\b/i;

/** A segment that reads as a believable landmark when prefixed with "near". */
const LANDMARK_RE = /\b(market|chowk|metro|station|pillar|school|hospital|park|temple|mandir|gurudwara|masjid|mall|cinema|road|marg|chauraha|more|circle|enclave|centre|center)\b/i;

const GENERIC_LANDMARKS = [
  "Main Market", "Main Chowk", "Community Centre", "Bus Stand",
  "Central Park", "Market Chowk", "Main Bazaar", "Metro Road",
  "Water Tank", "Hanuman Mandir", "Main Gol Chakkar", "Sabzi Mandi",
];

function stableHash(s: string): number {
  return Math.abs(String(s || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0));
}

/**
 * Remove scraped address junk while KEEPING real "near X" landmarks:
 *   "14/1 above Richa Jewellers, Indira Vikas Marg" → "Indira Vikas Marg"
 *   "Plot 7 opp SBI, Nehru Nagar" → "Nehru Nagar"
 */
export function stripAddressJunk(raw: string): string {
  return String(raw || "")
    // collapse line breaks — an Area line must never contain a "\n"
    .replace(/\s*\n+\s*/g, " ")
    // leading house/plot/flat/shop labels with their numbers
    .replace(/^\s*(?:h\.?\s*no\.?|house\s*(?:no\.?)?|plot\s*(?:no\.?)?|flat\s*(?:no\.?)?|kothi|shop\s*(?:no\.?)?|office|room|unit|building)\b[\w\s\-/,]*?(?=(?:,|\b(?:near|above|below|opp|behind|block|sector|phase|pocket)\b)|$)/i, "")
    // bare leading numbers like "14/1" or "B-14"
    .replace(/^\s*\d+[\w\-/]*\s+/, "")
    // positional junk fragments ("above Richa Jewellers", "opp SBI", "behind Temple")
    .replace(/,?\s*\b(?:above|below|opp\.?(?:osite)?|behind|beside)\s+[^,()]*/gi, "")
    // postal remnants: "Delhi - 110019", "Rajasthan - 302001", bare pincodes
    .replace(/\s*-\s*\d{5,6}\b/g, "")
    .replace(/\b\d{5,6}\b/g, "")
    // civic-body tails: "Jaipur Municipal Corporation"
    .replace(/\bmunicipal\s+(?:corporation|council|body)\b/gi, "")
    .replace(/,?\s*india\s*$/i, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s,\-–:]+|[\s,\-–:]+$/g, "")
    .trim();
}

function splitSegments(text: string): string[] {
  return text
    .replace(/\(([^()]+)\)/g, " ‹$1› ") // protect parenthetical content
    .split(",")
    .map((s) => s.replace(/^[\s\-–:]+|[\s\-–:]+$/g, "").trim())
    .filter(Boolean)
    .map((s) => s.replace(/‹([^›]*)›/g, "($1)"));
}

/**
 * Compose a rich area string from loose parts, e.g.
 *   locality "Karol Bagh", sub "Padam Singh Road", landmark "Metro Gate 3"
 *   → "Karol Bagh, Padam Singh Road (near Metro Gate 3)"
 */
function composeRich(parts: string[], landmark: string | null, seed: number): string {
  const pieces = parts.slice(0, 2).map((p) => p.replace(/\s{2,}/g, " ").trim()).filter(Boolean);
  const base = pieces.length ? pieces.join(", ") : "";
  if (!base) return "";
  const near = landmark
    ? landmark.replace(/^(?:near|chowk)\s+/i, "").trim()
    : GENERIC_LANDMARKS[seed % GENERIC_LANDMARKS.length];
  return `${base} (near ${near})`;
}

/**
 * Format a raw lead/tutor location into a rich, real-feeling area:
 *   "Karol Bagh" → "Karol Bagh, Padam Singh Road (near Metro Gate 3)"
 *   "14/1 above Richa Jewellers, Indira Vikas Marg, Delhi" → "Indira Vikas (near Main Market)"
 */
export function formatRichNearbyLocation(rawLoc: string | null, cityHint?: string | null): string {
  if (!rawLoc) return cityHint?.trim() || "Nearby Local Area";

  const cleaned = stripAddressJunk(rawLoc);
  if (!cleaned) return cityHint?.trim() || "Nearby Local Area";

  const lower = cleaned.toLowerCase();

  // 1. Known locality → its curated rich form (real sub-area + real landmark)
  for (const [key, rich] of Object.entries(LOCALITY_LANDMARK_MAP)) {
    if (lower.includes(key)) return rich;
  }

  // 2. Compose from the cleaned segments, dropping junk/detail pieces
  const segments = splitSegments(cleaned);
  const cityLower = (cityHint || "").trim().toLowerCase();

  const localityParts: string[] = [];
  let landmark: string | null = null;

  for (const seg of segments) {
    const segLower = seg.toLowerCase();
    if (BARE_CITY_SET.has(segLower) || (cityLower && segLower === cityLower)) continue;
    if (BUILDING_RE.test(seg)) continue; // building names feel fake → drop
    if (!landmark && LANDMARK_RE.test(seg) && localityParts.length > 0) {
      landmark = seg;
      continue;
    }
    localityParts.push(seg);
  }

  if (!localityParts.length) {
    // Only city/buildings were present → fall back to the city itself
    const city = cityHint?.trim() || segments.find((s) => BARE_CITY_SET.has(s.toLowerCase()));
    return city ? composeRich([city], null, stableHash(cleaned)) : "Nearby Local Area";
  }

  // Prefer a landmark from the remaining parts; else generic-real
  if (!landmark) {
    const candidate = localityParts.find((p) => LANDMARK_RE.test(p) && p !== localityParts[0]);
    if (candidate) landmark = candidate;
  }
  const seed = stableHash(localityParts[0]);

  return composeRich(localityParts, landmark, seed);
}

/**
 * Curated area for a known locality: rotates its sub-area by seed when a
 * rotation list exists (so repeats don't all show the same sector), else
 * returns the static rich form.
 */
function curatedArea(key: string, seed: number): string {
  const rich = LOCALITY_LANDMARK_MAP[key];
  const rot = SUB_AREA_ROTATION[key];
  if (rot) {
    const base = rich.split(" (near")[0].split(", ")[0];
    const s = Math.abs(seed);
    return `${base}, ${rot[s % rot.length]} (near ${GENERIC_LANDMARKS[s % GENERIC_LANDMARKS.length]})`;
  }
  return rich;
}

/**
 * Normalize a structured sector-style area name ("Sector 9 (DC Chowk), Rohini")
 * into the rich card format ("Rohini, Sector 9 (near DC Chowk)"), used by the
 * pre-send batch exporter. Drops building-name entries to their city's rich form.
 */
export function polishSectorAreaName(name: string, city: string | null, seed = 0): string {
  const cleaned = stripAddressJunk(name);
  if (!cleaned) return formatRichNearbyLocation(city, city);

  const lowerClean = cleaned.toLowerCase();
  const cityTrim = (city || "").trim();
  const cityLower = cityTrim.toLowerCase();

  // Concrete sub-area already present in the name ("Sector 14, Rohini",
  // "Prashant Vihar, Block C")? Then the curated DEFAULT sector must NOT
  // override it. (nagar/vihar/park are locality-name words, not sub-markers)
  const hasConcreteSub =
    /\b(?:sector|blk\.?|block|phase|pocket|enclave|extension|ext|khand)\b|\d/i.test(cleaned);

  // 1. Known locality without its own sub-area → rotate a real sub-area in
  for (const key of Object.keys(LOCALITY_LANDMARK_MAP)) {
    if (lowerClean.includes(key)) {
      if (hasConcreteSub) break; // polish the actual name below instead
      return curatedArea(key, seed);
    }
  }

  // 2. City itself is a known locality → rotate ("Gurgaon" → "Gurugram, Sector 40")
  for (const [key, rich] of Object.entries(LOCALITY_LANDMARK_MAP)) {
    if (key === cityLower || cityLower.includes(key)) return curatedArea(key, seed);
  }

  // Building-only names ("DLF The Crest, Park Drive") → fall back to city rich form
  const segments = splitSegments(cleaned.replace(/\(([^()]+)\)/g, ""));
  // Dedupe identical / contained segments ("Shimla, Shimla", "X, X (urban)")
  const uniq = new Map<string, string>();
  for (const s of segments) {
    if (BARE_CITY_SET.has(s.toLowerCase()) || BUILDING_RE.test(s)) continue;
    const k = s.toLowerCase().trim();
    const clash = [...uniq.keys()].some(
      (e) => e === k || e.startsWith(k + " ") || k.startsWith(e + " ")
    );
    if (!clash && s.toLowerCase() !== cityLower) uniq.set(k, s);
  }
  const meaningful = [...uniq.values()];
  if (!meaningful.length) {
    return cityTrim
      ? composeRich([cityTrim.replace(/\s*Sector.*$/i, "") || cityTrim], null, seed)
      : "Nearby Local Area";
  }

  // Extract parenthetical content as a natural landmark ("DC Chowk", "Ahinsa Khand")
  const paren = cleaned.match(/\(([^()]+)\)/)?.[1]?.trim() || null;
  let landmark = paren && LANDMARK_RE.test(paren) ? paren : null;

  // "Sub Area, Locality" convention → locality is the last meaningful segment
  let parts = meaningful.slice();
  let locality = parts[parts.length - 1];
  let subs = parts.slice(0, -1);

  // Split embedded sub-sector from a single segment: "Vaishali Sector 4" → "Vaishali" + "Sector 4"
  const embedded = locality.match(/^(.{4,}?)\s+((?:sector|phase|block|pocket)\s*[\wivx]+)$/i);
  if (embedded) {
    locality = embedded[1].trim();
    subs = [embedded[2].trim(), ...subs];
  }

  // "<X> Market" → locality without the market word, market becomes the landmark
  const marketTail = locality.match(/^(.{6,}?)\s+market$/i);
  if (marketTail && !landmark) {
    locality = marketTail[1].trim();
    landmark = "Main Market";
  }

  if (!landmark) landmark = null; // composeRich falls back to generic-real rotation

  const out = subs.length
    ? `${[locality, ...subs].slice(0, 2).join(", ")}`
    : locality;
  const near = landmark
    ? landmark.replace(/^near\s+/i, "").trim()
    : GENERIC_LANDMARKS[seed % GENERIC_LANDMARKS.length];
  return `${out} (near ${near})`;
}
