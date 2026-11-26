/**
 * CLASSIFIER — at most ONE Gemini call, strict JSON schema, deterministic fallback.
 * Classifies only; saves nothing. Never throws.
 */
import { EMAIL_RE_HINT } from "./classifier-shared";
import { stripAquaNoise } from "./pii";

export type MessageType = "ANSWER_TO_PENDING" | "PROFILE_INFO" | "QUESTION" | "COMMAND" | "CHITCHAT" | "UNCLEAR";
export type Intent =
  | "leads" | "plans" | "fees" | "login" | "coins" | "update" | "human" | "online"
  | "where_from" | "interested" | "documents" | "decline" | "no_email" | "chitchat" | "other";

export type ExtractedField = { value?: string; confidence: number };
export type Extracted = {
  name?: ExtractedField;
  email?: ExtractedField;
  location?: ExtractedField;
  classes_subjects?: ExtractedField;
};

export type Classification = {
  message_type: MessageType;
  extracted: Extracted;
  intent: Intent;
  confidence: number;
  usedFallback?: boolean;
};

export interface GeminiClassifier {
  /** Must return a JSON string. Called AT MOST once per inbound message. */
  classify(prompt: string): Promise<string>;
}

const TYPES: MessageType[] = ["ANSWER_TO_PENDING", "PROFILE_INFO", "QUESTION", "COMMAND", "CHITCHAT", "UNCLEAR"];
const INTENTS: Intent[] = ["leads", "plans", "fees", "login", "coins", "update", "human", "online", "where_from", "interested", "documents", "decline", "no_email", "chitchat", "other"];

function field(raw: unknown): ExtractedField | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  if (typeof r.value !== "string" || typeof r.confidence !== "number") return undefined;
  return { value: r.value, confidence: Math.min(1, Math.max(0, r.confidence)) };
}

export function isStrictClassification(raw: unknown): raw is Classification {
  if (!raw || typeof raw !== "object") return false;
  const r = raw as Record<string, unknown>;
  if (!TYPES.includes(r.message_type as MessageType)) return false;
  if (!INTENTS.includes(r.intent as Intent)) return false;
  if (typeof r.confidence !== "number" || r.confidence < 0 || r.confidence > 1) return false;
  if (!r.extracted || typeof r.extracted !== "object") return false;
  const e = r.extracted as Record<string, unknown>;
  for (const k of ["name", "email", "location", "classes_subjects"]) {
    if (e[k] !== undefined && !field(e[k])) return false;
  }
  return true;
}

function deterministic(text: string, pendingField?: string): Classification {
  const t = stripAquaNoise(text).trim();
  const lower = t.toLowerCase();
  if (!t) return { message_type: "UNCLEAR", extracted: {}, intent: "other", confidence: 0, usedFallback: true };
  const extracted: Extracted = {};
  let intent: Intent = "other";
  let type: MessageType = "UNCLEAR";

  // Questions, broadcasts, forwards and promotions must never become profile writes.
  const NOT_PROFILE =
    /\?|\b(?:what|how|why|where|when|which|who|kya|kaise|kitna|kitne|kahan|fee|fees|price|free|plan|lead|leads|requirement|student|teacher|tutor|parent|looking|need|want|please|download|try our|products?|http|www\.|reply stop|client:|subject:|location:|budget:)\b|#\d{4,}/i.test(t);

  if (/^(?:stop|unsubscribe|not interested|don't message|nahi chahiye|message mat karo|dobara mat bhejo|band karo)\b/i.test(t)) {
    type = "COMMAND"; intent = "decline";
  } else if (/^(?:no email|email nahi|mere paas email nahi|sirf whatsapp|only whatsapp)\b/i.test(t)) {
    type = "PROFILE_INFO"; intent = "no_email";
  } else if (/^(?:hi|hello|hey|namaste|hii|heelo|good (?:morning|evening)|thanks?|thank you|ok|okay)\b/i.test(t)) {
    type = "CHITCHAT"; intent = "chitchat";
  } else if (/^(?:start|menu|help|manual reset|pay|activate|cancel)\b/i.test(t)) {
    type = "COMMAND";
  } else if (/^(?:yes|haan|han|ha|1|2|interested|i am interested|i'm interested|ready|confirm)$/i.test(t)) {
    type = "CHITCHAT"; intent = "interested";
  } else if (/fees?|free|price|kitna|kya\s*fee|payment/i.test(lower)) {
    type = "QUESTION"; intent = "fees";
  } else if (/lead|requirement|enquiry/i.test(lower)) {
    type = "QUESTION"; intent = "leads";
  } else if (/plan|commission|1257|2999/i.test(lower)) {
    type = "QUESTION"; intent = "plans";
  } else if (/login|log in|sign.?in|password|forgot|reset|link.{0,20}not.{0,10}open|not opening/i.test(lower)) {
    type = "QUESTION"; intent = "login";
  } else if (/coin|wallet/i.test(lower)) {
    type = "QUESTION"; intent = "coins";
  } else if (/online|pan.?india/i.test(lower)) {
    type = "QUESTION"; intent = "online";
  } else if (/where.*(?:number|get my)|kahan se/i.test(lower)) {
    type = "QUESTION"; intent = "where_from";
  } else if (/call me|call pe baat|call karo|call kijiye|phone karo|human|coordinator|support/i.test(lower)) {
    type = "QUESTION"; intent = "human";
  } else if (/^(?:ok|okay|thanks|thank you|👍|🙏)$/i.test(t)) {
    type = "CHITCHAT";
  }

  const explicitUpdate = /^(?:change|update|set)\s+(?:my\s+)?(?:name|email|area|location|subjects|classes)/i.test(t);
  const alreadyClassified = type === "CHITCHAT" || type === "COMMAND" || type === "QUESTION";
  const CLASS_FRAGMENT = /\b(?:\d{1,2}\s*(?:to|-|se|tak)\s*\d{1,2}|class\s*(?:\d{1,2}|xi|xii)|nursery|physics|chemistry|biology|mathematics|maths|science|english|social science|all subjects)\b/i;
  const LOC_FRAGMENT = /\b(?:sector\s*\d+|[a-z]+\s*(?:nagar|vihar|colony|road|marg|gali|chowk|khand)|najafgarh|rohini|noida|gurugram|delhi|mumbai)\b/i;

  const emailMatch = t.match(EMAIL_RE_HINT);
  if (emailMatch) {
    // An email is always routed to the validator, even when unasked.
    if (type === "UNCLEAR") type = pendingField === "email" ? "ANSWER_TO_PENDING" : "PROFILE_INFO";
    if (intent === "other") intent = "update";
    extracted.email = { value: emailMatch[0], confidence: pendingField === "email" || explicitUpdate ? 0.95 : 0.75 };
  } else if (!alreadyClassified) {
    if (
      pendingField === "classes_subjects" || explicitUpdate ||
      (/^(?:i (?:teach|can teach)|teaching)/i.test(t) && CLASS_FRAGMENT.test(t)) ||
      CLASS_FRAGMENT.test(t) && t.length <= 90
    ) {
      type = pendingField === "classes_subjects" ? "ANSWER_TO_PENDING" : "PROFILE_INFO";
      extracted.classes_subjects = { value: t.match(CLASS_FRAGMENT)?.[0] ?? t, confidence: pendingField === "classes_subjects" ? 0.9 : 0.7 };
      intent = "update";
    } else if (pendingField === "location" || LOC_FRAGMENT.test(t)) {
      type = pendingField === "location" ? "ANSWER_TO_PENDING" : "PROFILE_INFO";
      extracted.location = { value: t.match(LOC_FRAGMENT)?.[0] ?? t, confidence: pendingField === "location" ? 0.85 : 0.7 };
      intent = "update";
    } else if (pendingField === "name" || /^my name is\b/i.test(t)) {
      type = pendingField === "name" ? "ANSWER_TO_PENDING" : "PROFILE_INFO";
      extracted.name = { value: t.replace(/^my name is\s+/i, ""), confidence: pendingField === "name" ? 0.8 : 0.7 };
      intent = "update";
    }
  }

  return { message_type: type, extracted, intent, confidence: 0.8, usedFallback: true };
}

export async function classify(
  text: string,
  opts: { pendingField?: string; gemini?: GeminiClassifier; context?: string } = {}
): Promise<Classification> {
  const t = (text ?? "").trim();
  if (!t) return deterministic(t, opts.pendingField);
  if (!opts.gemini) return deterministic(t, opts.pendingField);

  try {
    const prompt = `Classify the inbound WhatsApp message. Return ONLY strict JSON with keys:
message_type (one of ${TYPES.join(", ")}), intent (one of ${INTENTS.join(", ")}),
confidence (0..1), extracted (object with optional name/email/location/classes_subjects,
each {value:string, confidence:number}).
Pending field: ${opts.pendingField ?? "none"}.
Context: ${opts.context ?? ""}
Message: ${t}`;
    const raw = await opts.gemini.classify(prompt);
    const parsed = JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, ""));
    if (!isStrictClassification(parsed)) return deterministic(t, opts.pendingField);
    return parsed;
  } catch {
    return deterministic(t, opts.pendingField);
  }
}
