/**
 * Off-script tutor talk that must interrupt onboarding slot-filling.
 * Prevents loops like repeating "Commerce / Accounts kaunsi classes…"
 * while the user is talking about payment or "I don't teach commerce".
 */

const COMMERCE_FAMILY = /commerce|accounts?|accountancy|business\s*studies|\bbst\b|economics?/i;

const SUBJECT_ALIASES: Array<{ re: RegExp; keys: string[] }> = [
  { re: /commerce|accounts?|accountancy|business\s*studies|\bbst\b/i, keys: ["commerce", "account", "business studies", "bst"] },
  { re: /economics?/i, keys: ["econom"] },
  { re: /physics|phy\b/i, keys: ["physic"] },
  { re: /chemistry|chem\b/i, keys: ["chem"] },
  { re: /biology|bio\b/i, keys: ["biolog", "zoo", "botany"] },
  { re: /maths?|mathematics|ganit/i, keys: ["math"] },
  { re: /computer|coding|python|\bcs\b/i, keys: ["computer", "coding", "python"] },
  { re: /english/i, keys: ["english"] },
  { re: /hindi/i, keys: ["hindi"] },
  { re: /science/i, keys: ["science"] },
];

export function wantsToPayNow(raw: string): boolean {
  const t = raw.trim();
  if (!t) return false;
  if (refusesAdvancePayment(t)) return false;
  return (
    /\bi\s*(?:want|will|would like|gonna|going)\s+to\s+pay\b/i.test(t) ||
    /\b(?:ready|want|will)\s+to\s+pay\b/i.test(t) ||
    /\bpay\s+(?:now|kar(?:na|unga|ungi|ta|ti|un)|kar\s+deta|kar\s+deti)\b/i.test(t) ||
    /\bpayment\s+kar(?:na|unga|ungi|ta|ti)\b/i.test(t) ||
    /\babhi\s+(?:pay|payment|kharid)/i.test(t) ||
    /\bpaise\s+(?:de|dunga|dungi|bhej)/i.test(t)
  );
}

export function refusesAdvancePayment(raw: string): boolean {
  const t = raw.trim();
  if (!t) return false;
  return (
    /\b(?:will not|won't|wont|do not|don't|dont)\s+pay\b/i.test(t) ||
    /\bnot\s+pay\s+anything\b/i.test(t) ||
    /\bnothing\s+advance\b/i.test(t) ||
    /\badvance\s*(?:nahi|nai|not)\b/i.test(t) ||
    /\b(?:nahi|nai)\s+(?:dunga|dungi|dena|depaunga).{0,24}(?:advance|paise|pay|payment)/i.test(t) ||
    /\b(?:paise|payment|advance)\s+(?:nahi|nai)\b/i.test(t) ||
    /\bbina\s+(?:advance|payment|paise|reg)/i.test(t) ||
    /\bfree\s*(?:mein|me|lead)/i.test(t)
  );
}

export function isBareNo(raw: string): boolean {
  return /^(nahi+|naah+|na+|nope|no|nah)$/i.test(raw.trim());
}

export function isAckOnly(raw: string): boolean {
  return /^(ok+|okay+|okk+|haan+|han|theek|thik hai|thik|yes|yep|yeah|yup|ji+|hmm+|achha+|acha+|done|alright|sure)$/i.test(
    raw.trim()
  );
}

export function refusesRegistration(raw: string): boolean {
  return /(?:registration|register|account)\s*nahi|nahi\s*(?:karwaunga|karunga|banwaunga|register)|don'?t want to register|account nahi/i.test(
    raw
  );
}

export function wantsLeadsOnWhatsApp(raw: string): boolean {
  return /whatsapp\s*(?:per|pe|par|pe)\s*(?:nahin|nahi|lead)|lead.{0,30}whatsapp|whatsapp.{0,20}lead/i.test(raw);
}

export function outsideNcrCity(raw: string): string | null {
  const t = raw.trim();
  const named = t.match(
    /\b(Bihar|Patna|Chennai|Mumbai|Pune|Kolkata|Hyderabad|Bangalore|Bengaluru|Lucknow|Jaipur|Ranchi|Chandigarh|Ahmedabad|Indore|Bhopal|Nagpur|Surat|Kanpur|Varanasi|Guwahati|Kochi|Coimbatore)\b/i
  );
  if (!named) return null;
  const city = named[1].replace(/^\w/, (c) => c.toUpperCase());
  if (/delhi|noida|gurgaon|gurugram|faridabad|ghaziabad|ncr/i.test(city)) return null;
  return city;
}

/** True if the user is refusing a subject, not naming one they teach. */
export function isSubjectNegation(raw: string): boolean {
  const t = raw.trim();
  if (!t) return false;
  if (isBareNo(t)) return true;
  return (
    /\bi\s*(?:don't|do\s*not|dont)\s+teach\b/i.test(t) ||
    /\bnahi\s+padh(?:ata|ati|ate|aata|aati|ta|ti)\b/i.test(t) ||
    /\bnahi\s+sikh(?:ata|ati|ate|aata)\b/i.test(t) ||
    /\bnot\s+(?:a\s+)?(?:commerce|physics|maths?|science|english|accounts?)\s+(?:tutor|teacher)/i.test(t) ||
    /\b(?:commerce|physics|maths?|accounts?)\s+nahi\b/i.test(t)
  );
}

export function rejectedSubjectKeys(raw: string): string[] {
  const t = raw.trim();
  if (!t) return [];
  const keys: string[] = [];
  for (const alias of SUBJECT_ALIASES) {
    if (alias.re.test(t)) keys.push(...alias.keys);
  }
  if (keys.length === 0 && COMMERCE_FAMILY.test(t)) {
    keys.push("commerce", "account", "business studies");
  }
  return keys;
}

export function stripRejectedSubjects(subjects: unknown, keys: string[]): string[] {
  const list = Array.isArray(subjects) ? subjects.map((s) => String(s)) : [];
  if (keys.length === 0) return list;
  return list.filter((s) => !keys.some((k) => s.toLowerCase().includes(k.toLowerCase())));
}

/** Do not treat this message as a new class/subject/area answer. */
export function isOffScriptTutorTalk(raw: string): boolean {
  return (
    wantsToPayNow(raw) ||
    refusesAdvancePayment(raw) ||
    isSubjectNegation(raw) ||
    isBareNo(raw) ||
    isAckOnly(raw) ||
    refusesRegistration(raw) ||
    wantsLeadsOnWhatsApp(raw)
  );
}
