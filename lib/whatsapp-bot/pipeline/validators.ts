/**
 * FIELD VALIDATORS — location, email, name.
 *
 * All external dependencies (geocoder, MX lookup, Gemini name check, callback
 * task creation) sit behind interfaces, so this module is testable with no
 * network, no DB writes and no WhatsApp sends.
 */
import { prisma } from "@/lib/prisma";

export type Validation<T> =
  | { ok: true; value: T; needsReview?: boolean; suggestion?: string }
  | { ok: false; reason: string; suggestion?: string };

// ── LOCATION ──────────────────────────────────────────────────────────────────

export type LocationValue = {
  raw: string;
  locality: string;
  city: string | null;
  lat: number | null;
  lng: number | null;
  landmark: string | null;
};

export interface Geocoder {
  geocode(raw: string): Promise<{ locality?: string; city?: string; lat?: number; lng?: number } | null>;
}

const CITY_ONLY = /^(?:new\s+delhi|delhi|ncr|north\s+delhi|south\s+delhi|east\s+delhi|west\s+delhi|central\s+delhi|noida|greater\s+noida|gurugram|gurgaon|mumbai|pune|hyderabad|bengaluru|bangalore|chennai|kolkata|jaipur|lucknow|patna|ahmedabad|chandigarh|online(?:\s*\(pan-?india\))?)$/i;
const PLACE_HINT = /\b(vihar|colony|enclave|sector|phase|block|pocket|road|marg|street|gali|lane|nagar|pur|pura|ganj|park|heights|apartments|extension|chowk|market|bazaar|community|camp|estate|society|tower|near|opp|opposite|behind|beside)\b/i;
const CITY_WORDS = /\b(new\s+delhi|delhi|noida|greater\s+noida|gurugram|gurgaon|mumbai|pune|hyderabad|bengaluru|bangalore|chennai|kolkata|jaipur|lucknow|patna|ahmedabad|chandigarh)\b/i;

export function validateLocation(raw: string, geocoder?: Geocoder): Promise<Validation<LocationValue>> {
  const text = (raw ?? "").trim().replace(/\s+/g, " ");
  const fail = (reason: string): Promise<Validation<LocationValue>> => Promise.resolve({ ok: false, reason });
  if (!text) return fail("Location is required.");
  if (/^online\b/i.test(text)) return fail("Online is not a location. Please share your locality and city.");
  if (CITY_ONLY.test(text)) return fail("A city alone is not enough. Please add a locality, lane or landmark.");
  if (/\?$/.test(text) || /\b(?:please|kindly|send me|call me|my name is|email)\b/i.test(text)) return fail("Please send only the location.");
  if (text.split(/\s+/).length > 14) return fail("That looks like a sentence, not a location.");
  if (!PLACE_HINT.test(text)) return fail("Please include a locality, lane, road or landmark.");

  const cityMatch = text.match(CITY_WORDS);
  const city = cityMatch ? cityMatch[0].replace(/\bnew\s+delhi\b/i, "New Delhi") : null;
  let locality = text.split(/[,]/)[0].trim();
  if (city && locality.toLowerCase() === city.toLowerCase()) locality = text.replace(city, "").replace(/^[,-\s]+/, "").trim();
  if (!locality) locality = text;
  const landmarkMatch = text.match(/\b(?:near|opp\.?|opposite|behind|beside)\s+(.+)$/i);
  const landmark = landmarkMatch ? landmarkMatch[1].trim() : null;

  const base: LocationValue = { raw: text, locality, city, lat: null, lng: null, landmark };
  if (!geocoder) return Promise.resolve({ ok: true, value: base, needsReview: true });

  return geocoder.geocode(text).then((geo) => {
    if (!geo) return { ok: true as const, value: base, needsReview: true };
    return {
      ok: true as const,
      needsReview: !(geo.lat != null && geo.lng != null),
      value: {
        ...base,
        locality: geo.locality || base.locality,
        city: geo.city || base.city,
        lat: geo.lat ?? null,
        lng: geo.lng ?? null,
      },
    };
  }).catch(() => ({ ok: true as const, value: base, needsReview: true }));
}

// ── EMAIL ─────────────────────────────────────────────────────────────────────

export interface MxLookup {
  hasMx(domain: string): Promise<boolean>;
}

const DISPOSABLE = new Set([
  "mailinator.com", "yopmail.com", "guerrillamail.com", "10minutemail.com", "tempmail.com",
  "trashmail.com", "throwawaymail.com", "dispostable.com", "fakeinbox.com", "getairmail.com",
]);
const TYPO_DOMAINS: Record<string, string> = {
  "gmial.com": "gmail.com", "gmai.com": "gmail.com", "gmal.com": "gmail.com", "gmaill.com": "gmail.com",
  "yaho.com": "yahoo.com", "yahooo.com": "yahoo.com", "outlok.com": "outlook.com", "hotmial.com": "hotmail.com",
};
const EMAIL_RE = /^[a-z0-9._%+-]{2,64}@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i;

export function validateEmail(raw: string, mx?: MxLookup): Promise<Validation<string>> {
  const email = (raw ?? "").trim().toLowerCase().replace(/^[<("'`]+|[>)"'`.,;:!?]+$/g, "");
  const fail = (reason: string, suggestion?: string): Promise<Validation<string>> =>
    Promise.resolve({ ok: false, reason, ...(suggestion ? { suggestion } : {}) });
  if (!EMAIL_RE.test(email)) return fail("This email doesn't look supported, please send another one.");
  const domain = email.split("@")[1];
  if (domain === "apnatutorhub.com" || /^wa[._]/.test(email)) return fail("This email doesn't look supported, please send another one.");
  if (DISPOSABLE.has(domain)) return fail("This email doesn't look supported, please send another one.");
  const typo = TYPO_DOMAINS[domain];
  if (typo) return fail("This email doesn't look supported, please send another one.", email.replace(domain, typo));
  if (!mx) return Promise.resolve({ ok: true, value: email, needsReview: true });
  return mx.hasMx(domain).then((ok) => ok
    ? { ok: true as const, value: email }
    : { ok: false as const, reason: "This email doesn't look supported, please send another one." }
  ).catch(() => ({ ok: true as const, value: email, needsReview: true }));
}

/** Two failed email attempts create a staff callback task instead of looping. */
export interface CallbackTasks {
  create(input: { phone: string; reason: string; preferredTime?: string }): Promise<unknown>;
}

export const dbCallbackTasks: CallbackTasks = {
  create: (input) => prisma.callbackTask.create({
    data: { phone: input.phone, reason: input.reason, preferredTime: input.preferredTime ?? null, status: "PENDING" },
  }),
};

export async function recordEmailFailure(
  phone: string,
  failures: number,
  callbacks: CallbackTasks,
  reason: string
): Promise<{ handoff: boolean }> {
  if (failures < 2) return { handoff: false };
  await callbacks.create({ phone, reason: `Email validation failed twice: ${reason}` });
  return { handoff: true };
}

// ── NAME ──────────────────────────────────────────────────────────────────────

export interface NameChecker {
  isRealPersonName(name: string): Promise<{ is_real_person_name: boolean; confidence: number }>;
}

const NAME_RE = /^(?:mr\.?|mrs\.?|ms\.?|dr\.?|shri|smt\.?|sri)\s+[a-z][a-z.' -]{0,38}$|^[a-z][a-z.' -]{0,38}$/i;
const NAME_STOP = /^(?:sir|madam|ma'am|tutor|teacher|student|parent|hello|hi|namaste|yes|ok|okay|test|user)$/i;

export function validateName(raw: string, checker?: NameChecker): Promise<Validation<string>> {
  const name = (raw ?? "").trim().replace(/\s+/g, " ");
  const fail = (reason: string): Promise<Validation<string>> => Promise.resolve({ ok: false, reason });
  if (!name || name.length < 2 || name.length > 40) return fail("Please send a real name (2–40 characters).");
  if (!NAME_RE.test(name)) return fail("Please send a real name using letters only.");
  if (NAME_STOP.test(name.replace(/^(?:mr\.?|mrs\.?|ms\.?|dr\.?|shri|smt\.?|sri)\s+/i, ""))) return fail("Please send your real name.");
  if (!checker) return Promise.resolve({ ok: true, value: name, needsReview: true });
  return checker.isRealPersonName(name).then((r) => r.is_real_person_name && r.confidence >= 0.8
    ? { ok: true as const, value: name }
    : { ok: false as const, reason: "Please send your real name." }
  ).catch(() => ({ ok: true as const, value: name, needsReview: true }));
}
