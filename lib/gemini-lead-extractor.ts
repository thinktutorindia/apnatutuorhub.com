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
  { pattern: /\b(?:burari)\b/i, canonical: "Burari, North Delhi" },
  { pattern: /\b(?:sant\s*nagar)\b/i, canonical: "Sant Nagar, North Delhi" },
  { pattern: /\b(?:wazirabad|wazirabaad|wajirabad)\b/i, canonical: "Wazirabad, North Delhi" },
  { pattern: /\b(?:nirankari(?:\s*colony)?)\b/i, canonical: "Nirankari Colony, North Delhi" },
  { pattern: /\b(?:timarpur|timar\s*pur)\b/i, canonical: "Timarpur, North Delhi" },
  { pattern: /\b(?:majlis\s*park)\b/i, canonical: "Majlis Park, North Delhi" },
  { pattern: /\b(?:kalyan\s*vihar|kalan\s*vihar)\b/i, canonical: "Kalyan Vihar, North Delhi" },
  { pattern: /\b(?:cc\s*colony)\b/i, canonical: "CC Colony, North Delhi" },
  { pattern: /\b(?:old\s*gupta\s*colony|gupta\s*colony)\b/i, canonical: "Gupta Colony, North Delhi" },
  { pattern: /\b(?:kingsway\s*camp)\b/i, canonical: "Kingsway Camp, North Delhi" },
  { pattern: /\b(?:north\s*campus|vishwavidyalaya|vishv\s*vidyalaya)\b/i, canonical: "North Campus, Delhi University" },
  { pattern: /\b(?:rana\s*pratap\s*bagh|rp\s*bagh)\b/i, canonical: "Rana Pratap Bagh, North Delhi" },
  { pattern: /\b(?:gulabi\s*bagh)\b/i, canonical: "Gulabi Bagh, North Delhi" },
  { pattern: /\b(?:shastri\s*nagar)\b/i, canonical: "Shastri Nagar, North Delhi" },
  { pattern: /\b(?:pratap\s*nagar)\b/i, canonical: "Pratap Nagar, North Delhi" },
  { pattern: /\b(?:civil\s*lines)\b/i, canonical: "Civil Lines, North Delhi" },
  { pattern: /\b(?:vidhan\s*sabha|vidha\s*sabha)\b/i, canonical: "Vidhan Sabha, North Delhi" },
  { pattern: /\b(?:mkt|majnu\s*ka\s*tilla)\b/i, canonical: "Majnu Ka Tilla, North Delhi" },
  { pattern: /\b(?:outum\s*lane|otrum\s*lane|outram\s*line(?:s)?)\b/i, canonical: "Outram Lines, North Delhi" },
  { pattern: /\b(?:vijay\s*nagar)\b/i, canonical: "Vijay Nagar, North Delhi" },

  // Central Delhi
  { pattern: /\b(?:karol\s*bagh|karol\s*vagh)\b/i, canonical: "Karol Bagh, Central Delhi" },
  { pattern: /\b(?:regarpura|dev\s*nagar|tank\s*road)\b/i, canonical: "Karol Bagh, Central Delhi" },
  { pattern: /\b(?:paharganj|pahadganj|pahar\s*gunj)\b/i, canonical: "Paharganj, Central Delhi" },
  { pattern: /\b(?:daryaganj|dariya\s*ganj|darya\s*ganj|ansari\s*road)\b/i, canonical: "Daryaganj, Central Delhi" },
  { pattern: /\b(?:connaught\s*place|canaught(?:\s*place)?)\b/i, canonical: "Connaught Place, Central Delhi" },
  { pattern: /\b(?:patel\s*nagar)\b/i, canonical: "Patel Nagar, Central Delhi" },
  { pattern: /\b(?:baljeet\s*nagar|ranjit\s*nagar|ranjeet\s*nagar)\b/i, canonical: "Patel Nagar, Central Delhi" },
  { pattern: /\b(?:rajendra\s*nagar|rajender\s*nagar|old\s*rajinder\s*nagar)\b/i, canonical: "Rajinder Nagar, Central Delhi" },
  { pattern: /\b(?:pusa\s*road)\b/i, canonical: "Pusa Road, Central Delhi" },
  { pattern: /\b(?:chandni\s*chowk)\b/i, canonical: "Chandni Chowk, Old Delhi" },
  { pattern: /\b(?:mori\s*gate)\b/i, canonical: "Mori Gate, Old Delhi" },
  { pattern: /\b(?:kashmiri\s*gate|kashmere\s*gate)\b/i, canonical: "Kashmiri Gate, Old Delhi" },
  { pattern: /\b(?:sadar\s*bazar)\b/i, canonical: "Sadar Bazar, Old Delhi" },
  { pattern: /\b(?:chawri\s*bazar|chawadi\s*bazar)\b/i, canonical: "Chawri Bazar, Old Delhi" },
  { pattern: /\b(?:jama\s*masjid)\b/i, canonical: "Jama Masjid, Old Delhi" },
  { pattern: /\b(?:tis\s*hazari|tishazari)\b/i, canonical: "Tis Hazari, Old Delhi" },
  { pattern: /\b(?:mandi\s*house)\b/i, canonical: "Mandi House, Central Delhi" },
  { pattern: /\b(?:rk\s*ashram)\b/i, canonical: "RK Ashram, Central Delhi" },

  // West Delhi
  { pattern: /\b(?:punjabi\s*bagh|panjabi\s*bagh)\b/i, canonical: "Punjabi Bagh, West Delhi" },
  { pattern: /\b(?:paschim\s*vihar|pashim\s*vihar|pachim\s*vihar)\b/i, canonical: "Paschim Vihar, West Delhi" },
  { pattern: /\b(?:ambika\s*vihar)\b/i, canonical: "Ambika Vihar, West Delhi" },
  { pattern: /\b(?:jwala\s*heri)\b/i, canonical: "Jwala Heri, West Delhi" },
  { pattern: /\b(?:rajouri(?:\s*garden)?)\b/i, canonical: "Rajouri Garden, West Delhi" },
  { pattern: /\b(?:tagore\s*garden)\b/i, canonical: "Tagore Garden, West Delhi" },
  { pattern: /\b(?:subhash\s*nagar|subhas\s*nagar)\b/i, canonical: "Subhash Nagar, West Delhi" },
  { pattern: /\b(?:tilak\s*nagar|tilakngr)\b/i, canonical: "Tilak Nagar, West Delhi" },
  { pattern: /\b(?:hari\s*nagar)\b/i, canonical: "Hari Nagar, West Delhi" },
  { pattern: /\b(?:janakpuri|janak\s*puri|jankpuri)\b/i, canonical: "Janakpuri, West Delhi" },
  { pattern: /\b(?:vikaspuri|vikash\s*puri)\b/i, canonical: "Vikaspuri, West Delhi" },
  { pattern: /\b(?:uttam\s*nagar|uttam\s*ngr)\b/i, canonical: "Uttam Nagar, West Delhi" },
  { pattern: /\b(?:mohan\s*garden)\b/i, canonical: "Mohan Garden, West Delhi" },
  { pattern: /\b(?:bindapur)\b/i, canonical: "Bindapur, West Delhi" },
  { pattern: /\b(?:dwarka|dwaraka|dawarka)(?:\s*(?:sec(?:tor)?\s*(\d+)|mor|mod))?\b/i, canonical: "Dwarka, South West Delhi" },
  { pattern: /\b(?:vipin\s*garden)\b/i, canonical: "Vipin Garden, West Delhi" },
  { pattern: /\b(?:vishnu\s*garden|vishnu\s*park)\b/i, canonical: "Vishnu Garden, West Delhi" },
  { pattern: /\b(?:kirti\s*nagar|kriti\s*nagar)\b/i, canonical: "Kirti Nagar, West Delhi" },
  { pattern: /\b(?:moti\s*nagar)\b/i, canonical: "Moti Nagar, West Delhi" },
  { pattern: /\b(?:karampura|karanpura)\b/i, canonical: "Karampura, West Delhi" },
  { pattern: /\b(?:naraina(?:\s*vihar)?|narina)\b/i, canonical: "Naraina, West Delhi" },
  { pattern: /\b(?:mayapuri|maya\s*puri)\b/i, canonical: "Maya Puri, West Delhi" },
  { pattern: /\b(?:nangloi|nagloi)\b/i, canonical: "Nangloi, West Delhi" },
  { pattern: /\b(?:mundka|mundaka)\b/i, canonical: "Mundka, West Delhi" },
  { pattern: /\b(?:najafgarh|najfgadh)\b/i, canonical: "Najafgarh, West Delhi" },
  { pattern: /\b(?:palam)\b/i, canonical: "Palam, West Delhi" },
  { pattern: /\b(?:sagarpur|sagar\s*pur)\b/i, canonical: "Sagarpur, West Delhi" },
  { pattern: /\b(?:mahavir\s*enclave)\b/i, canonical: "Mahavir Enclave, West Delhi" },
  { pattern: /\b(?:delhi\s*cantt|delhi\s*cant)\b/i, canonical: "Delhi Cantt, West Delhi" },

  // South Delhi
  { pattern: /\b(?:saket)\b/i, canonical: "Saket, South Delhi" },
  { pattern: /\b(?:malviya\s*nagar)\b/i, canonical: "Malviya Nagar, South Delhi" },
  { pattern: /\b(?:panchsheel(?:\s*park)?)\b/i, canonical: "Panchsheel Park, South Delhi" },
  { pattern: /\b(?:hauz\s*khas|haus\s*khas)\b/i, canonical: "Hauz Khas, South Delhi" },
  { pattern: /\b(?:green\s*park)\b/i, canonical: "Green Park, South Delhi" },
  { pattern: /\b(?:safdarjung(?:\s*enclave)?)\b/i, canonical: "Safdarjung, South Delhi" },
  { pattern: /\b(?:south\s*ex(?:tension)?)\b/i, canonical: "South Extension, South Delhi" },
  { pattern: /\b(?:defence\s*colony)\b/i, canonical: "Defence Colony, South Delhi" },
  { pattern: /\b(?:lajpat\s*nagar|lajapt\s*nagar)\b/i, canonical: "Lajpat Nagar, South Delhi" },
  { pattern: /\b(?:greater\s*kailash|gk-?[12])\b/i, canonical: "Greater Kailash, South Delhi" },
  { pattern: /\b(?:cr\s*park)\b/i, canonical: "CR Park, South Delhi" },
  { pattern: /\b(?:kalkaji|kalka\s*ji)\b/i, canonical: "Kalkaji, South Delhi" },
  { pattern: /\b(?:govindpuri|govind\s*puri)\b/i, canonical: "Govindpuri, South Delhi" },
  { pattern: /\b(?:ashram)\b/i, canonical: "Ashram, South Delhi" },
  { pattern: /\b(?:bhogal)\b/i, canonical: "Bhogal, South Delhi" },
  { pattern: /\b(?:nizamuddin)\b/i, canonical: "Nizamuddin, South Delhi" },
  { pattern: /\b(?:jangpura)\b/i, canonical: "Jangpura, South Delhi" },
  { pattern: /\b(?:maharani\s*bagh)\b/i, canonical: "Maharani Bagh, South Delhi" },
  { pattern: /\b(?:new\s*friends\s*colony|nfc)\b/i, canonical: "New Friends Colony, South Delhi" },
  { pattern: /\b(?:sarita\s*vihar|sarira\s*vihar)\b/i, canonical: "Sarita Vihar, South Delhi" },
  { pattern: /\b(?:jamia(?:\s*nagar)?|jamiya)\b/i, canonical: "Jamia Nagar, South Delhi" },
  { pattern: /\b(?:okhla)\b/i, canonical: "Okhla, South Delhi" },
  { pattern: /\b(?:jasola)\b/i, canonical: "Jasola, South Delhi" },
  { pattern: /\b(?:zakir\s*nagar)\b/i, canonical: "Zakir Nagar, South Delhi" },
  { pattern: /\b(?:batla\s*house)\b/i, canonical: "Batla House, South Delhi" },
  { pattern: /\b(?:vasant\s*kunj)\b/i, canonical: "Vasant Kunj, South Delhi" },
  { pattern: /\b(?:vasant\s*vihar)\b/i, canonical: "Vasant Vihar, South Delhi" },
  { pattern: /\b(?:rk\s*puram)\b/i, canonical: "RK Puram, South Delhi" },
  { pattern: /\b(?:munirka|munrika)\b/i, canonical: "Munirka, South Delhi" },
  { pattern: /\b(?:ber\s*sarai)\b/i, canonical: "Ber Sarai, South Delhi" },
  { pattern: /\b(?:jnu)\b/i, canonical: "JNU, South Delhi" },
  { pattern: /\b(?:chattarpur|chatarpur|chattrpur)\b/i, canonical: "Chhatarpur, South Delhi" },
  { pattern: /\b(?:sangam\s*vihar)\b/i, canonical: "Sangam Vihar, South Delhi" },
  { pattern: /\b(?:khanpur)\b/i, canonical: "Khanpur, South Delhi" },
  { pattern: /\b(?:madangir)\b/i, canonical: "Madangir, South Delhi" },
  { pattern: /\b(?:dakshin\s*puri)\b/i, canonical: "Dakshin Puri, South Delhi" },
  { pattern: /\b(?:tughlakabad|tughlakabaad)\b/i, canonical: "Tughlakabad, South Delhi" },
  { pattern: /\b(?:badarpur)\b/i, canonical: "Badarpur, South Delhi" },
  { pattern: /\b(?:mehrauli)\b/i, canonical: "Mehrauli, South Delhi" },
  { pattern: /\b(?:chanakyapuri)\b/i, canonical: "Chanakyapuri, South Delhi" },
  { pattern: /\b(?:moti\s*bagh|moth\s*bagh)\b/i, canonical: "Moti Bagh, South Delhi" },
  { pattern: /\b(?:lodhi\s*colony)\b/i, canonical: "Lodhi Colony, South Delhi" },
  { pattern: /\b(?:anand\s*niketan)\b/i, canonical: "Anand Niketan, South Delhi" },
  { pattern: /\b(?:sainik\s*farm|sanik\s*farm)\b/i, canonical: "Sainik Farm, South Delhi" },
  { pattern: /\b(?:gautam\s*nagar)\b/i, canonical: "Gautam Nagar, South Delhi" },

  // East Delhi
  { pattern: /\b(?:laxmi\s*nagar|laxminagar)\b/i, canonical: "Laxmi Nagar, East Delhi" },
  { pattern: /\b(?:preet\s*vihar)\b/i, canonical: "Preet Vihar, East Delhi" },
  { pattern: /\b(?:nirman\s*vihar)\b/i, canonical: "Nirman Vihar, East Delhi" },
  { pattern: /\b(?:shakarpur)\b/i, canonical: "Shakarpur, East Delhi" },
  { pattern: /\b(?:pandav\s*nagar)\b/i, canonical: "Pandav Nagar, East Delhi" },
  { pattern: /\b(?:patparganj|padparjanj)\b/i, canonical: "Patparganj, East Delhi" },
  { pattern: /\b(?:ip\s*ext(?:ension)?)\b/i, canonical: "IP Extension, East Delhi" },
  { pattern: /\b(?:mayur\s*vihar)\b/i, canonical: "Mayur Vihar, East Delhi" },
  { pattern: /\b(?:new\s*ashok\s*nagar)\b/i, canonical: "New Ashok Nagar, East Delhi" },
  { pattern: /\b(?:anand\s*vihar)\b/i, canonical: "Anand Vihar, East Delhi" },
  { pattern: /\b(?:karkardooma|kadkadduma)\b/i, canonical: "Karkardooma, East Delhi" },
  { pattern: /\b(?:krishna\s*nagar)\b/i, canonical: "Krishna Nagar, East Delhi" },
  { pattern: /\b(?:geeta\s*colony)\b/i, canonical: "Geeta Colony, East Delhi" },
  { pattern: /\b(?:gandhi\s*nagar)\b/i, canonical: "Gandhi Nagar, East Delhi" },
  { pattern: /\b(?:shahdara|shadhara|shahadra)\b/i, canonical: "Shahdara, East Delhi" },
  { pattern: /\b(?:dilshad\s*garden)\b/i, canonical: "Dilshad Garden, East Delhi" },
  { pattern: /\b(?:yamuna\s*vihar)\b/i, canonical: "Yamuna Vihar, East Delhi" },
  { pattern: /\b(?:bhajanpura)\b/i, canonical: "Bhajanpura, East Delhi" },
  { pattern: /\b(?:seelampur|sheelampur)\b/i, canonical: "Seelampur, East Delhi" },
  { pattern: /\b(?:nand\s*nagri)\b/i, canonical: "Nand Nagri, East Delhi" },
  { pattern: /\b(?:shastri\s*park)\b/i, canonical: "Shastri Park, East Delhi" },

  // North West Delhi
  { pattern: /\b(?:pitampura|pritampura|pritam\s*pura|preetampura)\b/i, canonical: "Pitampura, North West Delhi" },
  { pattern: /\b(?:rani\s*bagh)\b/i, canonical: "Rani Bagh, North West Delhi" },
  { pattern: /\b(?:kohat(?:\s*enclave)?)\b/i, canonical: "Kohat Enclave, North West Delhi" },
  { pattern: /\b(?:saraswati\s*vihar)\b/i, canonical: "Saraswati Vihar, North West Delhi" },
  { pattern: /\b(?:shalimar\s*bagh|salimar\s*bagh)\b/i, canonical: "Shalimar Bagh, North West Delhi" },
  { pattern: /\b(?:prashant\s*vihar)\b/i, canonical: "Prashant Vihar, North West Delhi" },
  { pattern: /\b(?:mangolpuri|mongolpuri)\b/i, canonical: "Mangolpuri, North West Delhi" },
  { pattern: /\b(?:sultanpuri)\b/i, canonical: "Sultanpuri, North West Delhi" },
  { pattern: /\b(?:rohini)(?:\s*(?:sec(?:tor)?\s*(\d+)|sector\s*\d+))?\b/i, canonical: "Rohini, North West Delhi" },
  { pattern: /\b(?:ashok\s*vihar|aashok\s*vihar)\b/i, canonical: "Ashok Vihar, North West Delhi" },
  { pattern: /\b(?:keshav\s*puram|keshavpuram)\b/i, canonical: "Keshav Puram, North West Delhi" },
  { pattern: /\b(?:narela)\b/i, canonical: "Narela, North Delhi" },
  { pattern: /\b(?:swaroop\s*nagar)\b/i, canonical: "Swaroop Nagar, North Delhi" },

  // NCR - Noida & Greater Noida
  { pattern: /\b(?:noida|nodia)(?:\s*(?:sec(?:tor)?\s*(\d+)|sector\s*\d+|extension))?\b/i, canonical: "Noida, UP" },
  { pattern: /\b(?:greater\s*noida|gr\s*noida|gr\s*nodia|gaur\s*city|noida\s*extension|ace\s*city|chi\s*v)\b/i, canonical: "Greater Noida, UP" },

  // NCR - Ghaziabad
  { pattern: /\b(?:ghaziabad|gaziabad|ghaziyabaad|gaziyabad|ghz|gyz|gaz|gzy)\b/i, canonical: "Ghaziabad, NCR" },
  { pattern: /\b(?:indirapuram|indrapuram|indrapura)\b/i, canonical: "Indirapuram, Ghaziabad" },
  { pattern: /\b(?:vaishali)\b/i, canonical: "Vaishali, Ghaziabad" },
  { pattern: /\b(?:vasundhara|vasundra)\b/i, canonical: "Vasundhara, Ghaziabad" },
  { pattern: /\b(?:kaushambi)\b/i, canonical: "Kaushambi, Ghaziabad" },
  { pattern: /\b(?:sahibabad)\b/i, canonical: "Sahibabad, Ghaziabad" },
  { pattern: /\b(?:raj\s*nagar(?:\s*ext(?:ension)?)?)\b/i, canonical: "Raj Nagar, Ghaziabad" },

  // NCR - Gurgaon / Gurugram
  { pattern: /\b(?:gurgaon|gurugram)(?:\s*(?:sec(?:tor)?\s*(\d+))?)?\b/i, canonical: "Gurugram, Haryana" },
  { pattern: /\b(?:dlf\s*phase\s*[1-5])\b/i, canonical: "DLF, Gurugram" },

  // NCR - Faridabad
  { pattern: /\b(?:faridabad|faridabaad)(?:\s*(?:sec(?:tor)?\s*(\d+))?)?\b/i, canonical: "Faridabad, Haryana" },

  // Mumbai & Other Regions
  { pattern: /\b(?:thane)\b/i, canonical: "Thane, Maharashtra" },
  { pattern: /\b(?:patli\s*para)\b/i, canonical: "Patli Para, Thane" },
  { pattern: /\b(?:nerul)\b/i, canonical: "Nerul, Navi Mumbai" },
  { pattern: /\b(?:ghansoli)\b/i, canonical: "Ghansoli, Navi Mumbai" },
  { pattern: /\b(?:navi\s*mumbai)\b/i, canonical: "Navi Mumbai, Maharashtra" },
  { pattern: /\b(?:mumbai)\b/i, canonical: "Mumbai, Maharashtra" },
  { pattern: /\b(?:pune)\b/i, canonical: "Pune, Maharashtra" },
  { pattern: /\b(?:chandigarh)\b/i, canonical: "Chandigarh" },
  { pattern: /\b(?:lucknow)\b/i, canonical: "Lucknow, UP" },
  { pattern: /\b(?:bangalore|banglore)\b/i, canonical: "Bangalore, Karnataka" },
  { pattern: /\b(?:hyderabad|hyd)\b/i, canonical: "Hyderabad, Telangana" },
  { pattern: /\b(?:dehradun|dheradun)\b/i, canonical: "Dehradun, Uttarakhand" },
  { pattern: /\b(?:patna)\b/i, canonical: "Patna, Bihar" },
];

function normalizeLocation(raw: string | null): string | null {
  if (!raw) return null;
  let clean = raw
    .replace(/(?:mob(?:ile)?|ph(?:one)?|whatsapp|contact)[^\n\r:=]*[:=-]?\s*[\d\s+-]+/gi, "")
    .replace(/\b(?:\+?91[\s-]?)?[6-9]\d{9}\b/g, "")
    .replace(/^[-:=,\s/]+|[-:=,\s/]+$/g, "")
    .trim();

  if (!clean) return null;

  for (const { pattern, canonical } of LOCATION_MAPPINGS) {
    if (pattern.test(clean)) {
      return canonical;
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
    const candidate = parts.length >= 2 ? parts.slice(-2).join(", ") : parts[0] || null;
    location = normalizeLocation(candidate) || normalizeLocation(fullAddress) || candidate;
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
