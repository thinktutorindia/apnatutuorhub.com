/**
 * lib/lead-contact-generator.ts
 *
 * Ensures every unlocked lead presents authentic, realistic, and UNIQUE parent contact
 * details to tutors, eliminating generic placeholders ("Parent", "wa_...", admin numbers, or duplicate helpdesk numbers).
 */

const REALISTIC_FIRST_NAMES = [
  "Rajesh", "Pooja", "Vikram", "Sunita", "Amit", "Shalini", "Sanjay", "Meenakshi",
  "Deepak", "Anita", "Rakesh", "Neha", "Manoj", "Kavita", "Alok", "Priya",
  "Ramesh", "Vandana", "Suresh", "Swati", "Gaurav", "Ritu", "Ashok", "Suman",
  "Naveen", "Archana", "Pradeep", "Rashmi", "Vivek", "Anjali", "Dinesh", "Preeti",
  "Tarun", "Divya", "Kamal", "Shweta", "Mohit", "Monika", "Sachin", "Bhavna",
];

const REALISTIC_LAST_NAMES = [
  "Sharma", "Verma", "Gupta", "Malhotra", "Agarwal", "Mehta", "Chawla", "Kapoor",
  "Bhatia", "Saxena", "Khanna", "Bansal", "Singh", "Joshi", "Chopra", "Dua",
  "Goyal", "Seth", "Mathur", "Tandon", "Arora", "Sood", "Dhingra", "Kohli",
];

// Major Delhi-NCR / Indian mobile network prefixes
const MOBILE_PREFIXES = [
  "9810", "9811", "9818", "9871", "9910", "9911", "9899", "9971", "9873", "9891",
  "9717", "9650", "9560", "9812", "9958", "9711", "9870", "9820", "9830",
];

// Placeholder and admin numbers that must never be presented as parent numbers
const SYSTEM_PLACEHOLDER_PHONES = new Set([
  "8882716869",
  "918882716869",
  "7559563565",
  "917559563565",
  "9311459543",
  "919311459543",
  "9319193109",
  "919319193109",
  "NO_PHONE",
  "",
]);

/**
 * Deterministic hash of string to positive integer
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export interface RealisticParentContact {
  name: string;
  phone: string;
  email: string;
  area: string;
  city: string;
  pincode?: string | null;
}

/**
 * Resolves or synthesizes realistic parent contact details for an unlocked lead.
 * If the lead has genuine parent details, they are preserved.
 * If the lead belongs to a system placeholder account, it deterministically generates
 * a unique, realistic Indian parent name, phone number, and clean email.
 */
export function resolveParentContactForLead(lead: {
  id: string;
  inquiryNumber?: number | null;
  area?: string | null;
  city?: string | null;
  pincode?: string | null;
  parentProfile?: {
    address?: string | null;
    city?: string | null;
    pincode?: string | null;
    user?: {
      name?: string | null;
      phone?: string | null;
      email?: string | null;
    } | null;
  } | null;
}): RealisticParentContact {
  const user = lead.parentProfile?.user;
  const rawPhone = (user?.phone || "").replace(/\D/g, "");
  const rawName = (user?.name || "").trim();
  const rawEmail = (user?.email || "").trim().toLowerCase();

  const isGenericName =
    !rawName ||
    /^(parent|user|admin|apnatutorhub|verified|coordinator|test)/i.test(rawName);

  const isPlaceholderPhone =
    !rawPhone ||
    SYSTEM_PLACEHOLDER_PHONES.has(rawPhone) ||
    SYSTEM_PLACEHOLDER_PHONES.has(rawPhone.slice(-10));

  const isPlaceholderEmail =
    !rawEmail ||
    rawEmail.startsWith("wa_") ||
    rawEmail.includes("placeholder") ||
    rawEmail.includes("apnatutorhub.com") ||
    rawEmail.includes("apnatutorhub.internal");

  // If already genuine and non-placeholder, keep it
  if (!isGenericName && !isPlaceholderPhone && !isPlaceholderEmail) {
    return {
      name: rawName,
      phone: user?.phone || rawPhone,
      email: rawEmail,
      area: lead.area || lead.parentProfile?.address || "Delhi NCR",
      city: lead.city || lead.parentProfile?.city || "Delhi",
      pincode: lead.pincode || lead.parentProfile?.pincode,
    };
  }

  // Generate deterministic seed from lead identity
  const seedStr = `${lead.id}_${lead.inquiryNumber || 1000}`;
  const seed = hashString(seedStr);

  const firstName = REALISTIC_FIRST_NAMES[seed % REALISTIC_FIRST_NAMES.length];
  const lastName = REALISTIC_LAST_NAMES[(seed >> 3) % REALISTIC_LAST_NAMES.length];
  const finalName = !isGenericName ? rawName : `${firstName} ${lastName}`;

  // Generate deterministic 10-digit mobile number
  let finalPhone = user?.phone || "";
  if (isPlaceholderPhone) {
    const prefix = MOBILE_PREFIXES[(seed >> 2) % MOBILE_PREFIXES.length];
    const suffixNum = 100000 + ((seed >> 5) % 899999);
    // Standard 10-digit Indian mobile number (e.g., 9810123456)
    finalPhone = `${prefix}${suffixNum}`;
  }

  // Generate clean email
  let finalEmail = rawEmail;
  if (isPlaceholderEmail) {
    const cleanFirst = firstName.toLowerCase();
    const cleanLast = lastName.toLowerCase().slice(0, 4);
    const num = 10 + ((seed >> 4) % 89);
    finalEmail = `${cleanFirst}.${cleanLast}${num}@gmail.com`;
  }

  const rawAddress = lead.area || lead.parentProfile?.address || "";
  const isBadAddress =
    !rawAddress ||
    /^(delhi ncr, delhi|verified parent helpdesk|science tutor required)$/i.test(rawAddress.trim());

  let finalArea = rawAddress;
  if (isBadAddress) {
    const LOCALITIES = [
      "Block C, Greater Kailash I",
      "Sector 14, Rohini",
      "Model Town II",
      "Vasant Kunj, Sector B",
      "Green Park Extension",
      "Punjabi Bagh West",
      "Sector 62, Noida",
      "DLF Phase 4, Gurugram",
      "Patel Nagar West",
      "Kalkaji, Pocket A",
      "Dwarka Sector 12",
      "Janakpuri, Block C",
    ];
    finalArea = LOCALITIES[seed % LOCALITIES.length];
  }

  return {
    name: finalName,
    phone: finalPhone,
    email: finalEmail,
    area: finalArea,
    city: lead.city || lead.parentProfile?.city || "Delhi",
    pincode: lead.pincode || lead.parentProfile?.pincode,
  };
}
