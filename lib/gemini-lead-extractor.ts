/**
 * lib/gemini-lead-extractor.ts
 *
 * High-performance, multi-format lead extraction engine for Indian tutor & parent CRM leads.
 * Uses optimized in-memory deterministic rule parsing with domain dictionary decoding
 * (Indian location slang, subject short-forms, class levels, enquiry codes, fee budgets).
 *
 * Provides sub-millisecond per-lead parsing speed with zero server timeouts.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ParsedLead {
  leadType: "TUTOR" | "PARENT_LEAD" | "OTHER";
  name: string | null;
  phone: string | null;
  altPhone: string | null;
  whatsapp: string | null;
  email: string | null;
  location: string | null;
  pincode: string | null;
  fullAddress: string | null;
  subjects: string[];
  classes: string[];
  board: string | null;
  qualification: string | null;
  experienceYears: number | null;
  gender: string | null;
  budgetFee: string | null;
  appliedCodes: string[];
  operationalNotes: string | null;
  isJunk: boolean;          // true = skip this message (boilerplate / system message)
  confidence: number;       // 0-100 how confident the extraction is
  rawText: string;          // original snippet
  isDuplicate?: boolean;
  duplicateSource?: "STAFF_LEAD" | "USER" | "IN_BATCH" | null;
  duplicateDetail?: string | null;
}

// ─── Junk phrases to detect ───────────────────────────────────────────────────

const JUNK_PHRASES = [
  "50 percent of the first month will take",
  "50% of the first month will take",
  "send me your adhar card also separately",
  "send me your aadhar card also separately",
  "please copy paste this form in text area below",
  "messages and calls are end-to-end encrypted",
  "joined using a group link",
  "anyone in this group can invite",
  "you created this group",
  "urgently required actors /model",
  "urgently required actors / model",
  "female face required for advitisment shoot",
  "porter.in/customerapplinks",
  "download now and get 20% off",
  "single room available in rakkar",
  "rent 6k per month not negotiable",
  "data sending soon",
  "data competed",
  "mumbai sara sara mail kr diya hai",
  "check email also",
  "phone contact also",
  "if any doubt send me sc",
  "video introduction and a resume on this number",
  "my senior will check and provide you the classes",
  "save our new whatsapp number",
  "we are updating our database",
  "please be advised that due to whatsapp's spam policy",
  "whatsapp on 9582844550",
  "if you are not geting regular updates",
  "whatsapp me your resume on this",
];

const SINGLE_WORD_NOISE = new Set([
  "nerul", "february", "march", "july", "december", "free", "link",
  "registration", "tb", "hudson", "west", "east", "south", "north",
  "okay", "ok", "yes", "no", "done", "...", "p", "a", "par", "dadi",
  "maths", "science", "physics", "chemistry", "biology", "accounts", "eco", "pst", "sst"
]);

export function isJunkMessage(text: string): boolean {
  const lower = text.toLowerCase().trim();
  if (lower === "..." || lower === "okay" || lower === "<media omitted>") return true;
  if (JUNK_PHRASES.some((p) => lower.includes(p))) return true;

  // Single word noise without phone/email
  if (SINGLE_WORD_NOISE.has(lower) && !/[6-9]\d{9}/.test(text) && !text.includes("@")) {
    return true;
  }

  // System notifications without any phone numbers
  if (
    (/joined using a group link|created this group|added studyhelpline|data sending soon/i.test(lower)) &&
    !/[6-9]\d{9}/.test(text)
  ) {
    return true;
  }

  return false;
}

// ─── Comprehensive Indian Location Dictionary ────────────────────────────────

const LOCATION_MAPPINGS: Array<{ pattern: RegExp; canonical: string }> = [
  // North Delhi
  { pattern: /\b(?:gtb(?:\s*ngr|\s*nagar)?|guru\s*teg\s*bahadur\s*nagar)\b/i, canonical: "GTB Nagar, North Delhi" },
  { pattern: /\b(?:model\s*town(?:\s*[123]|[\s-]*[a-h]\s*block)?)\b/i, canonical: "Model Town, North Delhi" },
  { pattern: /\b(?:mukherjee\s*nagar|mukharjee\s*nagar|mukharji\s*nagar)\b/i, canonical: "Mukherjee Nagar, North Delhi" },
  { pattern: /\b(?:kamla\s*nagar|kamal\s*nagar)\b/i, canonical: "Kamla Nagar, North Delhi" },
  { pattern: /\b(?:shakti\s*nagar|shakit\s*nagar)\b/i, canonical: "Shakti Nagar, North Delhi" },
  { pattern: /\b(?:roop\s*nagar|roopa\s*nagar)\b/i, canonical: "Roop Nagar, North Delhi" },
  { pattern: /\b(?:malka\s*ganj|malkagaj|malk\s*ganj)\b/i, canonical: "Malka Ganj, North Delhi" },
  { pattern: /\b(?:derawal(?:\s*nagar)?|dera\s*wal)\b/i, canonical: "Derawal Nagar, North Delhi" },
  { pattern: /\b(?:gujranwala(?:\s*town)?|gugrawala(?:\s*town)?|gujrawala(?:\s*town)?)\b/i, canonical: "Gujranwala Town, North Delhi" },
  { pattern: /\b(?:adarsh\s*nagar|adharsh\s*nagagr|adarsh\s*anand)\b/i, canonical: "Adarsh Nagar, North Delhi" },
  { pattern: /\b(?:azadpur|aazadpur)\b/i, canonical: "Azadpur, North Delhi" },
  { pattern: /\b(?:jahangir\s*puri|jahangirpuri|jhangirpuri)\b/i, canonical: "Jahangirpuri, North Delhi" },
  { pattern: /\b(?:burari|sant\s*nagar(?:\s*burari)?)\b/i, canonical: "Sant Nagar, Burari, North Delhi" },
  { pattern: /\b(?:wazirabad|wazirabaad|wajirabad)\b/i, canonical: "Wazirabad, North Delhi" },
  { pattern: /\b(?:nirankari(?:\s*colony)?)\b/i, canonical: "Nirankari Colony, North Delhi" },
  { pattern: /\b(?:timarpur|timar\s*pur)\b/i, canonical: "Timarpur, North Delhi" },
  { pattern: /\b(?:majlis\s*park)\b/i, canonical: "Majlis Park, North Delhi" },
  { pattern: /\b(?:kalyan\s*vihar|kalan\s*vihar)\b/i, canonical: "Kalyan Vihar, North Delhi" },
  { pattern: /\b(?:cc\s*colony|old\s*gupta\s*colony|gupta\s*colony)\b/i, canonical: "Old Gupta Colony / CC Colony, North Delhi" },
  { pattern: /\b(?:kingsway\s*camp|dhaka(?:\s*village)?|indra\s*vikas(?:\s*colony)?|gandhi\s*vihar|nehru\s*vihar)\b/i, canonical: "North Campus, Delhi University" },
  { pattern: /\b(?:north\s*campus|vishwavidyalaya|vishv\s*vidyalaya)\b/i, canonical: "North Campus, Delhi University" },
  { pattern: /\b(?:rana\s*pratap\s*bagh|rp\s*bagh)\b/i, canonical: "Rana Pratap Bagh, North Delhi" },
  { pattern: /\b(?:gulabi\s*bagh|pratap\s*nagar|shastri\s*nagar)\b/i, canonical: "Shastri Nagar / Gulabi Bagh, North Delhi" },
  { pattern: /\b(?:civil\s*lines|vidhan\s*sabha|vidha\s*sabha|vidhana\s*sabah)\b/i, canonical: "Civil Lines / Vidhan Sabha, North Delhi" },
  { pattern: /\b(?:mkt|majnu\s*ka\s*tilla)\b/i, canonical: "Majnu Ka Tilla, North Delhi" },
  { pattern: /\b(?:outum\s*lane|otrum\s*lane|outram\s*line(?:s)?)\b/i, canonical: "Outram Lines, GTB Nagar, North Delhi" },
  { pattern: /\b(?:sawan\s*park|ashok\s*nagar)\b/i, canonical: "Ashok Vihar, North Delhi" },

  // Central Delhi
  { pattern: /\b(?:karol\s*bagh|karol\s*vagh|regarpura|dev\s*nagar|tank\s*road)\b/i, canonical: "Karol Bagh, Central Delhi" },
  { pattern: /\b(?:paharganj|pahadganj|pahar\s*gunj)\b/i, canonical: "Paharganj, Central Delhi" },
  { pattern: /\b(?:daryaganj|dariya\s*ganj|ansari\s*road)\b/i, canonical: "Daryaganj, Central Delhi" },
  { pattern: /\b(?:cp|connaught\s*place|canaught(?:\s*place)?)\b/i, canonical: "Connaught Place, Central Delhi" },
  { pattern: /\b(?:patel\s*nagar|west\s*patel\s*nagar|east\s*patel\s*nagar|baljeet\s*nagar|ranjit\s*nagar|ranjeet\s*nagar)\b/i, canonical: "Patel Nagar, Central Delhi" },
  { pattern: /\b(?:rajendra\s*nagar|rajender\s*nagar|old\s*rajinder\s*nagar|orn|pusa\s*road)\b/i, canonical: "Old Rajinder Nagar, Central Delhi" },
  { pattern: /\b(?:sadar\s*bazar|sadar\s*bazar|chawri\s*bazar|chawadi\s*bazar|chwari\s*bzar|chandni\s*chowk|mori\s*gate|kashmiri\s*gate|kashmere\s*gate|jama\s*masjid|aazad\s*market|azad\s*market|bada\s*hindu\s*rao|hindu\s*rao|tis\s*hazari|tishazari)\b/i, canonical: "Old Delhi / Kashmiri Gate / Sadar Bazar" },
  { pattern: /\b(?:rk\s*ashram|mandi\s*house|hailey\s*road)\b/i, canonical: "Central Delhi (Mandi House / RK Ashram)" },

  // West Delhi
  { pattern: /\b(?:punjabi\s*bagh|panjabi\s*bagh|west\s*punjabi\s*bagh|east\s*punjabi\s*bagh)\b/i, canonical: "Punjabi Bagh, West Delhi" },
  { pattern: /\b(?:paschim\s*vihar|pashim\s*vihar|pachim\s*vihar|behra\s*enclave|ambika\s*vihar|jwala\s*heri)\b/i, canonical: "Paschim Vihar, West Delhi" },
  { pattern: /\b(?:rajouri(?:\s*garden)?|raja\s*garden|tagore\s*garden(?:\s*ext(?:ension)?)?|subhash\s*nagar|subhas\s*nagar)\b/i, canonical: "Rajouri Garden / Tagore Garden / Subhash Nagar, West Delhi" },
  { pattern: /\b(?:tilak\s*nagar|tilakngr|tilal\s*ngr|hari\s*nagar(?:\s*ghanta\s*ghar)?|virender\s*nagar|ghanta\s*ghar)\b/i, canonical: "Tilak Nagar / Hari Nagar, West Delhi" },
  { pattern: /\b(?:janakpuri|janak\s*puri|jankpuri|chawla)\b/i, canonical: "Janakpuri, West Delhi" },
  { pattern: /\b(?:vikaspuri|vikash\s*puri|vilashpuri)\b/i, canonical: "Vikaspuri, West Delhi" },
  { pattern: /\b(?:uttam\s*nagar|uttam\s*ngr|mohan\s*garden|bindapur|dabri\s*mo[dr]|jeevan\s*park|om\s*vihar)\b/i, canonical: "Uttam Nagar / Mohan Garden, West Delhi" },
  { pattern: /\b(?:dwarka|dwaraka|dawarka)(?:\s*(?:sec(?:tor)?\s*(\d+)|mor|mod))?\b/i, canonical: "Dwarka, South West Delhi" },
  { pattern: /\b(?:vipin\s*garden)\b/i, canonical: "Vipin Garden, Dwarka Mor, Delhi" },
  { pattern: /\b(?:vishnu\s*garden|vishnu\s*park)\b/i, canonical: "Vishnu Garden, West Delhi" },
  { pattern: /\b(?:kirti\s*nagar|kriti\s*nagar|moti\s*nagar|karampura|karanpura|shadipur|mansarovar\s*garden|naraina(?:\s*vihar)?|narina|mayapuri|maya\s*puri)\b/i, canonical: "Kirti Nagar / Moti Nagar / Naraina, West Delhi" },
  { pattern: /\b(?:nangloi|nagloi|mundka|mundaka|nilwal|baprola|najafgarh|najfgadh)\b/i, canonical: "Nangloi / Najafgarh, West Delhi" },
  { pattern: /\b(?:palam|mahavir\s*enclave|sagarpur|sagar\s*pur|nangal\s*raya|delhi\s*cantt|delhi\s*cant)\b/i, canonical: "Palam / Sagarpur / Delhi Cantt" },

  // South Delhi
  { pattern: /\b(?:saket|malviya\s*nagar|panchsheel(?:\s*park)?|adhchini|savitri\s*nagar)\b/i, canonical: "Saket / Malviya Nagar, South Delhi" },
  { pattern: /\b(?:hauz\s*khas|haus\s*khas|green\s*park|safdarjung(?:\s*enclave)?|sda)\b/i, canonical: "Hauz Khas / Green Park / Safdarjung, South Delhi" },
  { pattern: /\b(?:south\s*ex(?:tension)?|defence\s*colony|lajpat\s*nagar|lajapt\s*nagar|kotla(?:\s*mubarakpur)?|amar\s*colony|dayanand\s*colony|andrews\s*ganj|moolchand)\b/i, canonical: "Lajpat Nagar / Defence Colony / South Ex, South Delhi" },
  { pattern: /\b(?:greater\s*kailash|gk-?[12]|cr\s*park|kalkaji|kalka\s*ji|govindpuri|govind\s*puri|nehru\s*nagar|ashram|bhogal|nizamuddin|jangpura|maharani\s*bagh)\b/i, canonical: "GK / Kalkaji / Ashram / Maharani Bagh, South Delhi" },
  { pattern: /\b(?:nfc|new\s*friends\s*colony|zakir\s*nagar|batla\s*house|jamia(?:\s*nagar)?|jamiya|okhla|jasola|sarita\s*vihar|sarira\s*vihar)\b/i, canonical: "New Friends Colony / Jamia / Sarita Vihar / Okhla, South Delhi" },
  { pattern: /\b(?:vasant\s*kunj|vasant\s*vihar|rk\s*puram|munirka|munrika|ber\s*sarai|jia\s*sarai|jnu|iit(?:\s*delhi)?)\b/i, canonical: "Vasant Kunj / Munirka / JNU, South Delhi" },
  { pattern: /\b(?:chattarpur|chatarpur|chattrpur|sangam\s*vihar|devli|khanpur|madangir|dakshin\s*puri|tughlakabad|tughlakabaad|badarpur|jaitpur|mehrauli)\b/i, canonical: "Chhatarpur / Sangam Vihar / Badarpur / Mehrauli, South Delhi" },
  { pattern: /\b(?:anand\s*niketan|chanakyapuri|moti\s*bagh|moth\s*bagh|niti\s*bagh|lodhi\s*colony|ina(?:\s*colony)?|pandara\s*park)\b/i, canonical: "Chanakyapuri / Moti Bagh / Lodhi Colony, South Delhi" },
  { pattern: /\b(?:sainik\s*farm|sanik\s*farm)\b/i, canonical: "Sainik Farm, South Delhi" },

  // East Delhi
  { pattern: /\b(?:laxmi\s*nagar|laxminagar|preet\s*vihar|nirman\s*vihar|shakarpur|pandav\s*nagar|patparganj|padparjanj|ip\s*ext(?:ension)?)\b/i, canonical: "Laxmi Nagar / Preet Vihar / IP Extension, East Delhi" },
  { pattern: /\b(?:mayur\s*vihar(?:\s*(?:phase\s*[123]|ext(?:ension)?))?|new\s*ashok\s*nagar|trilok\s*puri|trilokpuri)\b/i, canonical: "Mayur Vihar, East Delhi" },
  { pattern: /\b(?:anand\s*vihar|karkardooma|kadkadduma|surajmal\s*vihar|dayanand\s*vihar|rishabh\s*vihar|vivek\s*vihar)\b/i, canonical: "Anand Vihar / Karkardooma / Surajmal Vihar, East Delhi" },
  { pattern: /\b(?:geeta\s*colony|krishna\s*nagar|gandhi\s*nagar)\b/i, canonical: "Krishna Nagar / Geeta Colony, East Delhi" },
  { pattern: /\b(?:shahdara|shadhara|shahadra|rohtash\s*nagar|mansarovar\s*park|nand\s*nagri|brijpuri|yamuna\s*vihar|bhajanpura|brahmpuri|maujpur|gokalpuri|khajuri\s*khas|dayalpur|sonia\s*vihar|soniya\s*vihar|dilshad\s*garden|shastri\s*park|seelampur|sheelampur|usmanpur)\b/i, canonical: "Shahdara / Dilshad Garden / Yamuna Vihar, East Delhi" },

  // North West Delhi
  { pattern: /\b(?:pitampura|pritampura|pritam\s*pura|preetampura|rani\s*bagh|kohat(?:\s*enclave)?|saraswati\s*vihar|saraswati\s*garden)\b/i, canonical: "Pitampura / Rani Bagh / Saraswati Vihar, North West Delhi" },
  { pattern: /\b(?:shalimar\s*bagh|salimar\s*bagh|prashant\s*vihar|mangolpuri|mongolpuri|sultanpuri|pooth\s*kalan|kirari|budh\s*vihar|rithala)\b/i, canonical: "Shalimar Bagh / Rohini / Mangolpuri, North West Delhi" },
  { pattern: /\b(?:rohini)(?:\s*(?:sec(?:tor)?\s*(\d+)|sector\s*\d+))?\b/i, canonical: "Rohini, North West Delhi" },
  { pattern: /\b(?:ashok\s*vihar|aashok\s*vihar|keshav\s*puram|keshavpuram)\b/i, canonical: "Ashok Vihar / Keshav Puram, North West Delhi" },
  { pattern: /\b(?:narela|swatantra\s*nagar|alipur|swaroop\s*nagar|samaypur\s*badli|samaypuri\s*badli|libaspur)\b/i, canonical: "Narela / Swaroop Nagar / Badli, North Delhi" },

  // NCR - Noida & Greater Noida
  { pattern: /\b(?:noida|nodia)(?:\s*(?:sec(?:tor)?\s*(\d+)|sector\s*\d+|extension))?\b/i, canonical: "Noida, UP" },
  { pattern: /\b(?:greater\s*noida|gr\s*noida|gr\s*nodia|gaur\s*city|noida\s*extension|ace\s*city|chi\s*v|supertech\s*romano)\b/i, canonical: "Greater Noida, UP" },

  // NCR - Ghaziabad
  { pattern: /\b(?:ghaziabad|gaziabad|ghaziyabaad|gaziyabad|ghz|gyz|gaz|gzy|indirapuram|indrapuram|indrapura|vaishali|vasundhara|vasundra|kaushambi|mohan\s*nagar|surya\s*nagar|sahibabad|raj\s*nagar(?:\s*ext(?:ension)?)?|pratap\s*vihar|khora\s*colony|ahinsa\s*khand)\b/i, canonical: "Ghaziabad, Delhi NCR" },

  // NCR - Gurgaon / Gurugram
  { pattern: /\b(?:gurgaon|gurugram)(?:\s*(?:sec(?:tor)?\s*(\d+)|dlf(?:\s*phase\s*\d+)?|sohna|badshahpur|gwal\s*pahari|south\s*city))?\b/i, canonical: "Gurugram, Haryana" },
  { pattern: /\b(?:dlf\s*phase\s*[1-5]|south\s*city\s*[12]|gwal\s*pahari|darbaripur)\b/i, canonical: "Gurugram, Haryana" },

  // NCR - Faridabad
  { pattern: /\b(?:faridabad|faridabaad)(?:\s*(?:sec(?:tor)?\s*(\d+)|dabua|tilpat|greenfields))?\b/i, canonical: "Faridabad, Haryana" },

  // Mumbai & Other Regions
  { pattern: /\b(?:thane|patlipada|patli\s*para|kasarvadavali|ghodbunder)\b/i, canonical: "Thane, Mumbai NCR" },
  { pattern: /\b(?:navi\s*mumbai|seawoods?|sea\s*wood|nerul|ghansoli|ulwe|vashi|kharghar)\b/i, canonical: "Navi Mumbai, Maharashtra" },
  { pattern: /\b(?:mumbai|malad|andheri|borivali|kandivali|versova|dadar|bandra|goregaon)\b/i, canonical: "Mumbai, Maharashtra" },
  { pattern: /\b(?:pune|chandigarh|mohali|dehradun|dheradun|shimla|lucknow|kanpur|prayagraj|allahabad|patna|guwahati|assam|bhopal|raipur|bangalore|banglore|hyderabad|hyd)\b/i, canonical: "Other Metro / Outstation" },
];

function normalizeLocation(raw: string | null): string | null {
  if (!raw) return null;
  const clean = raw.trim();
  for (const { pattern, canonical } of LOCATION_MAPPINGS) {
    if (pattern.test(clean)) {
      return clean.length > canonical.length ? clean : canonical;
    }
  }
  return clean;
}

// ─── Helpers: Email Name Extraction ──────────────────────────────────────────

function extractNameFromEmail(email: string): string | null {
  if (!email || !email.includes("@")) return null;
  const user = email.split("@")[0].toLowerCase();
  const cleaned = user.replace(/\d+/g, "").replace(/(?:tutor|teacher|home|tuition|mail|git|test|official|dr|mr|mrs|ms)[._-]?/gi, "");
  const parts = cleaned.split(/[._-]+/).filter((p) => p.length >= 2);
  if (parts.length === 0) return null;
  return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
}

function escapeRegex(s: string): string {
  return s.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
}

// Build a flat set of location-only words that should NEVER be treated as names
const LOCATION_ONLY_WORDS = new Set([
  // All common single-word location names from our dictionary
  "dwaraka", "dwarka", "dawarka", "rohini", "noida", "nodia", "gurugram", "gurgaon",
  "faridabad", "ghaziabad", "gaziabad", "shahdara", "shadhara", "thane", "nerul",
  "ghansoli", "mumbai", "pune", "bangalore", "hyderabad", "lucknow", "patna",
  "chandigarh", "dehradun", "pitampura", "pritampura", "saket", "kalkaji",
  "okhla", "jasola", "munirka", "nangloi", "najafgarh", "janakpuri", "vikaspuri",
  "paharganj", "daryaganj", "burari", "azadpur", "wazirabad", "narela",
  "karol bagh", "karol vagh", "rohini", "ashram", "bhogal", "mayapuri",
  "mehrauli", "badarpur", "khanpur", "devli", "chattarpur", "tughlakabad",
  "laxmi nagar", "shakarpur", "dilshad garden", "seelampur", "usmanpur",
  "indirapuram", "vaishali", "vasundhara", "kaushambi", "sahibabad",
  "malad", "andheri", "borivali", "bandra", "dadar", "goregaon",
  "govindpuri", "govind puri", "keshavpuram", "keshav puram",
  "adarsh nagar", "kamla nagar", "kamal nagar", "vijay nagar",
  "sant nagar", "gautam nagar", "krishna nagar", "gandhi nagar",
  "ashok vihar", "ashok nagar", "shalimar bagh", "model town",
  "mukherjee nagar", "sarita vihar", "paschim vihar", "preet vihar",
  "mayur vihar", "anand vihar", "vasant kunj", "vasant vihar",
  "punjabi bagh", "rajouri garden", "tagore garden", "tilak nagar",
  "hari nagar", "uttam nagar", "patel nagar", "moti nagar",
  "kirti nagar", "green park", "hauz khas", "defence colony",
  "lajpat nagar", "lajapt nagar", "south ex", "south extension",
  "greater kailash", "cr park", "connaught place", "old delhi",
  "chandni chowk", "karol bagh", "rajendra nagar", "pusa road",
  "mori gate", "kashmiri gate", "kashmere gate", "civil lines",
  "rana pratap bagh", "rp bagh", "gulabi bagh", "shastri nagar",
  "sadar bazar", "tis hazari", "rk ashram", "mandi house",
  "subhash nagar", "mohan garden", "vipin garden", "vishnu garden",
  "naraina", "narina", "palam", "sagarpur", "mahavir enclave",
  "panchsheel park", "malviya nagar", "safdarjung",
  "jangpura", "nizamuddin", "maharani bagh", "batla house",
  "okhla", "jasola", "jamia", "jnu", "rk puram",
  "sangam vihar", "madangir", "dakshin puri", "lodhi colony",
  "chanakyapuri", "moti bagh", "anand niketan",
  "patparganj", "pandav nagar", "karkardooma", "geeta colony",
  "bhajanpura", "yamuna vihar", "nand nagri", "mansarovar park",
  "shastri park", "saraswati vihar", "kohat enclave",
  "prashant vihar", "mangolpuri", "sultanpuri", "budh vihar",
  "greater noida", "noida extension",
  // Common single-word areas
  "rohini", "dwarka", "saket", "okhla", "jasola", "mehrauli",
  // Standalone locality names that appear in chats
  "karanpur", "karanpura", "karampura", "roshanara",
  "rishi nagar", "shukurpur", "pqpm beach", "ambika vihar",
  "sant nagar", "sant ngr", "otrum lane", "outum lane", "outram lines",
  "sainik farm", "sanik farm", "laxmi nagar", "subhash chowk",
  "patli para", "rishi nagar",
  // More standalone locations found in data
  "karala", "kanjhawala", "bawana", "tikri", "tikri border",
  "sec", "sector", "gazipur", "shakarpur", "loni", "tronica city",
  "harsh vihar", "side", "lal kuan", "atta market",
]);

function isLocationOrSubjectLine(line: string): boolean {
  const lower = line.toLowerCase().trim();

  // Check against location-only words set
  if (LOCATION_ONLY_WORDS.has(lower)) return true;

  // Check against the full location dictionary regex patterns
  for (const { pattern } of LOCATION_MAPPINGS) {
    if (pattern.test(line)) return true;
  }

  const locKeywords = [
    "garden", "enclave", "colony", "nagar", "bagh", "vihar", "sector", "sec",
    "phase", "block", "street", "gali", "marg", "road", "delhi", "noida", "nodia",
    "gurgaon", "gurugram", "ghaziabad", "faridabad", "mumbai", "court", "station",
    "park", "appartment", "apartment", "flats", "floor", "house", "h.no", "plot",
    "opp", "opposite", "near", "village", "extension", "extn", "lane", "bazar", "bzar", "mohalla",
    "puri", "pur", "puram", "kunj", "khas", "ganj", "farm",
    "sec ", "sector", "dwarka", "noida",
  ];
  if (locKeywords.some((k) => lower.includes(k))) return true;

  const subKeywords = [
    "math", "maths", "science", "physics", "chemistry", "biology", "botany", "zoology",
    "account", "accounts", "eco", "economics", "bst", "sst", "english", "hindi",
    "sanskrit", "french", "german", "spanish", "computer", "arts", "pcm", "pcb", "commerce",
    "anatomy", "marathi", "yoga",
  ];
  if (subKeywords.some((k) => lower === k || lower.startsWith(k + " ") || lower.endsWith(" " + k))) return true;

  return false;
}

// ─── High-Speed Local Lead Extractor ─────────────────────────────────────────

export function extractLeadDataFast(text: string): ParsedLead {
  const trimmed = text.trim();
  const lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);

  // 1. Junk detection
  if (isJunkMessage(trimmed)) {
    return {
      leadType: "OTHER",
      name: null,
      phone: null,
      altPhone: null,
      whatsapp: null,
      email: null,
      location: null,
      pincode: null,
      fullAddress: null,
      subjects: [],
      classes: [],
      board: null,
      qualification: null,
      experienceYears: null,
      gender: null,
      budgetFee: null,
      appliedCodes: [],
      operationalNotes: null,
      isJunk: true,
      confidence: 90,
      rawText: trimmed,
    };
  }

  // 2. Lead Type
  const isParentLead = /\b(?:parents?|parent|student(?:\s*name)?|daughter|son|child|bacha|require(?:\s*female)?\s*(?:home\s*)?tutor|need\s*(?:a\s*)?(?:home\s*)?tutor|tution\s*for\s*my|i\s*want\s*(?:a\s*)?tutor\s*for|request\s*tuition\s*for)\b/i.test(trimmed);
  const leadType: "TUTOR" | "PARENT_LEAD" | "OTHER" = isParentLead ? "PARENT_LEAD" : "TUTOR";

  // 3. Phone Numbers
  const rawDigits = trimmed.match(/(?:(?:\+?91[\s-]?)|\b)[6-9]\d{9}\b|(?:(?:\+?91[\s-]?)|\b)[6-9][\d\s-]{8,15}\b|(?<=[-:=,\s/])[6-9]\d{9}\b/g) ?? [];
  const phoneMatches = rawDigits
    .map((p) => p.replace(/\D/g, "").slice(-10))
    .filter((p) => /^[6-9]\d{9}$/.test(p));
  const uniquePhones = [...new Set(phoneMatches)];

  // 4. Emails
  const emailMatches = [...trimmed.matchAll(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g)].map((m) => m[0].toLowerCase());
  const uniqueEmails = [...new Set(emailMatches)];

  // 5. Applied Codes (e.g. C102, C114, C-134, D110)
  const codeMatches = [...trimmed.matchAll(/\b[CD]-?(\d{3,4})\b/gi)].map((m) => `C${m[1]}`);
  const appliedCodes = [...new Set(codeMatches)];

  // 6. Location & Full Address
  let location: string | null = null;
  const locExplicitMatch = trimmed.match(/(?:Your location|Location|Locality|Area|Pref Area|Preferred Area|Preferred Location|Residing at|Living in|Nearby|Near|Address location|Preferred Teaching Location)[^\n\r:=]*[:=-]\s*([^\n\r]+)/i);

  if (locExplicitMatch && locExplicitMatch[1]) {
    location = locExplicitMatch[1]
      .replace(/^(with house no\.?|Address pincode|Home tuition only)[\s\S]*$/i, "")
      .trim()
      .split("\n")[0]
      .trim();
  }

  if (!location) {
    for (const { pattern, canonical } of LOCATION_MAPPINGS) {
      if (pattern.test(trimmed)) {
        location = canonical;
        break;
      }
    }
  }

  location = normalizeLocation(location);

  // Full Address
  let fullAddress: string | null = null;
  const addressBlockMatch = trimmed.match(/(?:Complete address|Full address|Current address|Residential address|Permanent address|Address|Add|Addr|H\.No|Flat No|House No|Plot No)[^\n\r:=]*[:=-]\s*([\s\S]+?)(?=\n\s*(?:(?:1?\d\s*[\.\)]\s*)?(?:Contact|Phone|Mobile|Whatapp|WhatsApp|Email|Qualification|Qual|Experience|Exp|Subjects|Classes|Sincerely|Regards|50 percent)|$))/i);

  if (addressBlockMatch && addressBlockMatch[1]) {
    const rawBlock = addressBlockMatch[1].trim();
    fullAddress = rawBlock
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .join(", ")
      .replace(/\s*,\s*,+/g, ", ")
      .trim();
  }

  if (fullAddress && !location) {
    const parts = fullAddress.split(",").map((s) => s.trim()).filter(Boolean);
    location = parts.length >= 2 ? parts.slice(-2).join(", ") : parts[0] || null;
  } else if (location && !fullAddress) {
    fullAddress = location;
  }

  // Pincode
  const pincodeMatch = trimmed.match(/\b([1-9]\d{5})\b/);
  const pincode = pincodeMatch ? pincodeMatch[1] : null;

  // 7. Name Extraction
  let name: string | null = null;
  const INVALID_NAME_WORDS = [
    "tutor profile", "tutor details", "profile details", "details require",
    "dear tutor", "dear team", "objective", "sincerely", "regards",
    "qualification", "complete address", "educational qualification",
    "special skills", "sarita vihar", "maya puri", "munirka", "roop nagar",
    "delhi", "noida", "gurgaon", "ghaziabad", "bangalore", "mumbai",
    "whatsapp on", "contact no", "home tuition", "home tutor", "required", "classes",
    "about myself", "teacher registration", "my profile", "seeking science",
    "location", "subject", "classes can teach", "good afternoon", "good evening",
    "parents", "paid", "renew", "registration", "hello", "hi", "sir", "madam", "mam",
    "female", "male", "online", "offline", "cbse", "icse", "ib", "fee", "budget", "grade",
    "link", "dadi", "chor", "call back", "follow up", "trial", "demo",
    "tutor", "teacher", "10th", "12th", "class",
    "shukurpur", "vijay nagar", "shahdara", "nerul",
  ];

  // Strategy A: Explicit Label Match
  const explicitNamePatterns = [
    /(?:(?:1\s*[\.\)]\s*)?(?:Tutor\s*Name|Full\s*Name|Candidate\s*Name|Applicant\s*Name|Student\s*Name|Parent\s*Name|Parents\s*Name|Name\s*(?:as per Aadhar)?|Tutor))[^\n\r:=]*[:=-]\s*([^\n\r,]+)/i,
    /(?:(?:I am|My name is|This is|Myself|Self)\s+([A-Za-z\s.]{2,35}))/i,
    /(?:Code[:.]\s*C\d+[\s\S]*?Name[:.]\s*([A-Za-z\s.]{2,35}))/i,
    /(?:(?:Sir|Ma'am|Team)[,\s\n]+([A-Za-z\s.]{2,35})\s+this\s+side)/i,
    /([A-Za-z\s.]{2,35})\s+this\s+side/i,
    /(\d{10})\s*=\s*([A-Za-z\s]{2,30})/i,
    /Teacher\s+([A-Za-z]{2,25})\b/i,
    /\b([A-Za-z]{2,25})\s+paid\b/i,
    /\b([A-Za-z]{2,25})\s+parents\b/i,
  ];

  for (const pat of explicitNamePatterns) {
    const m = trimmed.match(pat);
    if (m) {
      const matchCandidate = m[2] || m[1];
      if (matchCandidate) {
        let candidate = matchCandidate
          .replace(/^(as per Aadhar|for Profile|as a Tutor|Sir|Madam|Dr\.|Mr\.|Mrs\.|Ms\.|Shri|Smt)\s*[-:]?\s*/i, "")
          .replace(/\s*(?:s\/o|w\/o|d\/o|age\s*[-:]|Contact|Phone|Mobile|Email|Qual|Class|Sub|Address|Loc|DOB)[\s\S]*$/i, "")
          .replace(/[^\w\s.]/g, "")
          .trim();
        const lower = candidate.toLowerCase();
        if (
          candidate.length >= 2 &&
          candidate.length <= 35 &&
          !isLocationOrSubjectLine(candidate) &&
          !INVALID_NAME_WORDS.some((inv) => lower === inv || lower.startsWith(inv + " "))
        ) {
          name = candidate.split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
          break;
        }
      }
    }
  }

  // Strategy B: Code Listings (e.g. "C134 \n Anil ghai \n 8588089123")
  if (!name && appliedCodes.length > 0) {
    for (const line of lines) {
      const cleanedLine = line.replace(/\b[CD]-?\d{3,4}\b/gi, "").replace(/\b[6-9]\d{9}\b/g, "").replace(/[^\w\s.]/g, "").trim();
      const words = cleanedLine.split(/\s+/).filter(Boolean);
      const lower = cleanedLine.toLowerCase();
      if (
        words.length >= 1 &&
        words.length <= 3 &&
        cleanedLine.length >= 3 &&
        cleanedLine.length <= 25 &&
        !hasDigitsIn(cleanedLine) &&
        !isLocationOrSubjectLine(cleanedLine) &&
        !INVALID_NAME_WORDS.some((inv) => lower === inv || lower.startsWith(inv + " "))
      ) {
        name = words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
        break;
      }
    }
  }

  // Strategy C: Multi-line line by line inspection — ONLY for lines that look like actual names
  if (!name && lines.length > 0) {
    for (const line of lines) {
      const stripped = line
        .replace(/^(?:\[.*?\]|\d{1,2}\/\d{1,2}\/\d{2,4},?\s*\d{1,2}:\d{2}\s*(?:am|pm)?\s*-?)\s*[^:]*:\s*/i, "")
        .replace(/\b(?:\+?91[\s-]?)?[6-9]\d{9}\b/g, "")
        .replace(/[^\w\s.]/g, "")
        .trim();

      const words = stripped.split(/\s+/).filter(Boolean);
      const lower = stripped.toLowerCase();

      // Skip single words that might be locations, subjects, or noise
      if (words.length === 1) {
        // Single word: only accept if it does NOT match any location pattern
        if (isLocationOrSubjectLine(stripped)) continue;
        if (LOCATION_ONLY_WORDS.has(lower)) continue;
        // Common noise single words: months, class abbrevs, misc
        if (/^(?:hi|hello|ok|done|yes|no|sir|mam|madam|link|dadi|chor|paid|renew|registration|tutor|teacher|parents|female|male|online|offline|cbse|icse|ib|fee|grade|trial|demo|10th|12th|class|pg|arts|yoga|kg|lkg|ukg|nursery|prep|january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec|gyz|pst|str|tb|hudson)$/i.test(stripped)) continue;
        // Too short (2 chars) for single word names
        if (stripped.length < 3) continue;
      }

      const isExcluded = INVALID_NAME_WORDS.some((inv) => lower === inv || lower.startsWith(inv + " ")) ||
        isLocationOrSubjectLine(stripped) ||
        /^(?:hi|hello|dear|applying|subject|classes|contact|phone|email|please|details|parents|required|yes|no|ok|done|cbse|icse|ib|online|offline|grade|fee|call\s*back|trial|demo|recharge|gold\s*crest|pqpm|link|10th|12th|class)/i.test(stripped);

      if (!isExcluded && words.length >= 1 && words.length <= 3 && stripped.length >= 2 && stripped.length <= 25 && !hasDigitsIn(stripped)) {
        name = words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
        break;
      }
    }
  }

  // Strategy D: Infer Name from Email
  if (!name && uniqueEmails.length > 0) {
    name = extractNameFromEmail(uniqueEmails[0]);
  }

  // 8. Subjects
  const foundSubjects: string[] = [];
  const subMatchers: Array<{ pattern: RegExp; subjects: string[] }> = [
    { pattern: /\bpcm\b/i, subjects: ["Physics", "Chemistry", "Mathematics"] },
    { pattern: /\bpcb\b/i, subjects: ["Physics", "Chemistry", "Biology"] },
    { pattern: /\b(?:phy|physics)\b/i, subjects: ["Physics"] },
    { pattern: /\b(?:chem|chemistry|chemsitry)\b/i, subjects: ["Chemistry"] },
    { pattern: /\b(?:bio|biology|botany|zoology|anatomy|physiology)\b/i, subjects: ["Biology"] },
    { pattern: /\b(?:math|maths|mat|nathi|mathematics|applied\s*math(?:ematic)?s?)\b/i, subjects: ["Mathematics"] },
    { pattern: /\b(?:acc|account|accounts|accountancy|cost\s*accounting|corporate\s*accounts|taxation|gst|audit)\b/i, subjects: ["Accountancy"] },
    { pattern: /\b(?:b\.com|bcom|m\.com|mcom)\b/i, subjects: ["Commerce"] },
    { pattern: /\b(?:eco|economic|economics)\b/i, subjects: ["Economics"] },
    { pattern: /\b(?:bst|b\.st|b\s*studies|business\s*studies)\b/i, subjects: ["Business Studies"] },
    { pattern: /\b(?:sst|ss|social\s*studies|social\s*science)\b/i, subjects: ["Social Science"] },
    { pattern: /\b(?:cs|comp|computer|coding|python|java|c\+\+|c\s*language|html|mysql|sql|auto\s*cad|web\s*designing)\b/i, subjects: ["Computer Science"] },
    { pattern: /\b(?:pol|polsci|political\s*science|polity)\b/i, subjects: ["Political Science"] },
    { pattern: /\b(?:geo|geography)\b/i, subjects: ["Geography"] },
    { pattern: /\b(?:his|history)\b/i, subjects: ["History"] },
    { pattern: /\b(?:psy|psycho|psychology|phsycology)\b/i, subjects: ["Psychology"] },
    { pattern: /\b(?:sociology)\b/i, subjects: ["Sociology"] },
    { pattern: /\b(?:humanities|arts)\b/i, subjects: ["Humanities / Arts"] },
    { pattern: /\b(?:evs)\b/i, subjects: ["EVS"] },
    { pattern: /\b(?:vedic\s*maths?)\b/i, subjects: ["Vedic Mathematics"] },
    { pattern: /\b(?:phonics)\b/i, subjects: ["Phonics"] },
    { pattern: /\b(?:handwriting)\b/i, subjects: ["Handwriting"] },
    { pattern: /\b(?:autism|special\s*edu(?:cator)?|special\s*need)\b/i, subjects: ["Special Education"] },
    { pattern: /\b(?:french)\b/i, subjects: ["French"] },
    { pattern: /\b(?:spanish)\b/i, subjects: ["Spanish"] },
    { pattern: /\b(?:german)\b/i, subjects: ["German"] },
    { pattern: /\b(?:japanese|japanes)\b/i, subjects: ["Japanese"] },
    { pattern: /\b(?:chinese)\b/i, subjects: ["Chinese"] },
    { pattern: /\b(?:sanskrit|sanskriti)\b/i, subjects: ["Sanskrit"] },
    { pattern: /\b(?:punjabi)\b/i, subjects: ["Punjabi"] },
    { pattern: /\b(?:hindi)\b/i, subjects: ["Hindi"] },
    { pattern: /\b(?:marathi)\b/i, subjects: ["Marathi"] },
    { pattern: /\b(?:telugu|telgu)\b/i, subjects: ["Telugu"] },
    { pattern: /\b(?:urdu)\b/i, subjects: ["Urdu"] },
    { pattern: /\b(?:arabic)\b/i, subjects: ["Arabic"] },
    { pattern: /\b(?:english|ielts|toefl|pte|celpip|spoken\s*english|british\s*accent)\b/i, subjects: ["English"] },
    { pattern: /\b(?:dance|guitar|vocal\s*music|music|yoga|karate|art\s*and\s*craft|painting|drawing)\b/i, subjects: ["Extracurricular"] },
    { pattern: /\b(?:all\s*subjects?|all\s*sub)\b/i, subjects: ["All Subjects"] },
  ];

  for (const { pattern, subjects } of subMatchers) {
    if (pattern.test(trimmed)) {
      for (const s of subjects) {
        if (!foundSubjects.includes(s)) foundSubjects.push(s);
      }
    }
  }

  // 9. Classes
  const classNumbers: string[] = [];
  const classRanges = [...trimmed.matchAll(/(?:class\s*)?(\d{1,2})\s*(?:st|nd|rd|th)?\s*(?:to|-|–)\s*(?:class\s*)?(\d{1,2})\s*(?:st|nd|rd|th)?/gi)];
  for (const m of classRanges) {
    const s = parseInt(m[1]), e = parseInt(m[2]);
    if (s >= 1 && e <= 12 && s <= e) {
      for (let i = s; i <= e; i++) {
        const c = `Class ${i}`;
        if (!classNumbers.includes(c)) classNumbers.push(c);
      }
    }
  }
  if (classNumbers.length === 0) {
    const singles = [...trimmed.matchAll(/(?:class\s*)?(\d{1,2})\s*(?:st|nd|rd|th)/gi)];
    for (const m of singles) {
      const n = parseInt(m[1]);
      if (n >= 1 && n <= 12) {
        const c = `Class ${n}`;
        if (!classNumbers.includes(c)) classNumbers.push(c);
      }
    }
  }
  if (/\b(?:nursery|kg|lkg|ukg|prep|pre\s*nursery)\b/i.test(trimmed)) {
    for (const k of ["Nursery", "LKG", "UKG"]) {
      if (!classNumbers.includes(k)) classNumbers.unshift(k);
    }
  }
  if (/\b(?:neet|iit|jee|iitjee|cuet)\b/i.test(trimmed)) {
    if (!classNumbers.includes("Class 11")) classNumbers.push("Class 11");
    if (!classNumbers.includes("Class 12")) classNumbers.push("Class 12");
  }

  // 10. Fee / Budget
  let budgetFee: string | null = null;
  const feeMatch = trimmed.match(/(?:fee|budget|charges|rate)[^\d]*(\d{3,6})(?:\s*(?:per|\/)?\s*(?:month|hr|hour|session))?/i);
  if (feeMatch) {
    budgetFee = `₹${feeMatch[1]}${feeMatch[0].toLowerCase().includes("hr") || feeMatch[0].toLowerCase().includes("hour") ? "/hr" : "/month"}`;
  } else {
    const directKMatch = trimmed.match(/\b(\d{1,2})\s*k\b/i);
    if (directKMatch) {
      budgetFee = `₹${parseInt(directKMatch[1]) * 1000}/month`;
    }
  }

  // 11. Operational Notes
  const opNotes: string[] = [];
  if (/\b(?:paid|paid\s*today|payment\s*ki\s*hai)\b/i.test(trimmed)) opNotes.push("Paid Registration");
  if (/\b(?:demo|trial)\b/i.test(trimmed)) {
    const demoSnippet = trimmed.match(/(?:demo|trial)[^\n,.]{0,40}/i)?.[0];
    if (demoSnippet) opNotes.push(demoSnippet.trim());
  }
  if (/\b(?:call\s*back|follow\s*up)\b/i.test(trimmed)) opNotes.push("Follow Up Required");
  if (/\b(?:refund)\b/i.test(trimmed)) opNotes.push("Refund Requested");
  if (appliedCodes.length > 0) opNotes.push(`Applied Codes: ${appliedCodes.join(", ")}`);

  // 12. Qualification
  let qualification: string | null = null;
  const qualMatch = trimmed.match(/(?:qualification|degree|edu)[^\n\r:=]*[:=-]\s*([A-Za-z\s\(\)\.]{3,80})/i);
  if (qualMatch) qualification = qualMatch[1].trim().split("\n")[0].trim();
  if (!qualification) {
    const qualKws = ["B.Ed", "B.Tech", "BTech", "B.Sc", "BSc", "M.Tech", "MBA", "MCA", "M.Sc", "MSc", "MA", "BA", "B.Com", "M.Com", "PhD", "MBBS", "CTET", "JBT", "BAMS", "BHMS", "CA Inter", "CA Final"];
    for (const kw of qualKws) {
      if (new RegExp(`(^|[^a-zA-Z0-9])${escapeRegex(kw)}($|[^a-zA-Z0-9])`, "i").test(trimmed)) {
        qualification = kw;
        break;
      }
    }
  }

  // 13. Experience
  let experienceYears: number | null = null;
  const expMatch = trimmed.match(/(?:experience|exp)[^\d]*(\d+)\s*(?:year|yr)/i);
  if (expMatch) experienceYears = parseInt(expMatch[1]);

  // 14. Gender
  let gender: string | null = null;
  if (/\bFemale\b/i.test(trimmed)) gender = "Female";
  else if (/\bMale\b/i.test(trimmed)) gender = "Male";

  const hasPhone = Boolean(uniquePhones[0]);
  const hasEmail = Boolean(uniqueEmails[0]);
  const hasName = Boolean(name);
  const hasLoc = Boolean(location || fullAddress);

  let dynConfidence = 30;
  if (hasPhone) dynConfidence += 30;
  if (hasEmail) dynConfidence += 15;
  if (hasName) dynConfidence += 15;
  if (hasLoc) dynConfidence += 10;

  return {
    leadType,
    name,
    phone: uniquePhones[0] ?? null,
    altPhone: uniquePhones[1] ?? null,
    whatsapp: uniquePhones[0] ?? null,
    email: uniqueEmails[0] ?? null,
    location,
    pincode,
    fullAddress,
    subjects: foundSubjects,
    classes: classNumbers,
    board: trimmed.includes("CBSE") ? "CBSE" : trimmed.includes("ICSE") ? "ICSE" : trimmed.includes("IB") ? "IB" : null,
    qualification,
    experienceYears,
    gender,
    budgetFee,
    appliedCodes,
    operationalNotes: opNotes.length > 0 ? opNotes.join(" | ") : null,
    isJunk: !hasPhone && !hasEmail && !hasName && !hasLoc,
    confidence: Math.min(dynConfidence, 95),
    rawText: trimmed,
  };
}

function hasDigitsIn(str: string): boolean {
  return /\d/.test(str);
}

// ─── Main Extract Lead Data ──────────────────────────────────────────────────

export async function extractLeadData(rawText: string): Promise<ParsedLead> {
  return extractLeadDataFast(rawText);
}

// ─── Batch Extract with High-Speed In-Memory Execution ───────────────────────

export async function extractLeadsBatch(
  messages: string[],
  onProgress?: (done: number, total: number) => void
): Promise<ParsedLead[]> {
  const results: ParsedLead[] = [];
  const total = messages.length;

  for (let i = 0; i < total; i++) {
    const lead = extractLeadDataFast(messages[i]);
    results.push(lead);
    if (onProgress && (i % 50 === 0 || i === total - 1)) {
      onProgress(i + 1, total);
    }
  }

  return results;
}
