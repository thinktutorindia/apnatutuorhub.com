/**
 * CLASSIFIER — at most ONE Gemini call, strict JSON schema, deterministic fallback.
 * Classifies only; saves nothing. Never throws.
 */
import { EMAIL_RE_HINT } from "./classifier-shared";

export type MessageType = "ANSWER_TO_PENDING" | "PROFILE_INFO" | "QUESTION" | "COMMAND" | "CHITCHAT" | "UNCLEAR";
export type Intent =
  | "leads" | "plans" | "fees" | "login" | "coins" | "update" | "human" | "online"
  | "where_from" | "interested" | "documents" | "decline" | "other";

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
const INTENTS: Intent[] = ["leads", "plans", "fees", "login", "coins", "update", "human", "online", "where_from", "interested", "documents", "decline", "other"];

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
  const t = text.trim();
  const lower = t.toLowerCase();
  const extracted: Extracted = {};
  let intent: Intent = "other";
  let type: MessageType = "UNCLEAR";

  // Questions, broadcasts, forwards and promotions must never become profile writes.
  const NOT_PROFILE =
    /\?|\b(?:what|how|why|where|when|which|who|kya|kaise|kitna|kitne|kahan|fee|fees|price|free|plan|lead|leads|requirement|student|teacher|tutor|parent|looking|need|want|please|download|try our|products?|http|www\.|reply stop|client:|subject:|location:|budget:)\b|#\d{4,}/i.test(t);

  if (/^(?:stop|start|menu|help|hi|hello|manual reset|pay|activate|cancel)\b/i.test(t)) {
    type = "COMMAND";
  } else if (/^(?:yes|haan|han|ha|1|2|interested|i am interested|i'm interested|ready|confirm)$/i.test(t)) {
    type = "CHITCHAT"; intent = "interested";
  } else if (/fees?|free|price|kitna|kya\s*fee|payment/i.test(lower)) {
    type = "QUESTION"; intent = "fees";
  } else if (/lead|requirement|enquiry/i.test(lower)) {
    type = "QUESTION"; intent = "leads";
  } else if (/plan|commission|1257|2999/i.test(lower)) {
    type = "QUESTION"; intent = "plans";
  } else if (/login|password|forgot|reset/i.test(lower)) {
    type = "QUESTION"; intent = "login";
  } else if (/coin|wallet/i.test(lower)) {
    type = "QUESTION"; intent = "coins";
  } else if (/online|pan.?india/i.test(lower)) {
    type = "QUESTION"; intent = "online";
  } else if (/where.*(?:number|get my)|kahan se/i.test(lower)) {
    type = "QUESTION"; intent = "where_from";
  } else if (/call me|human|coordinator|support/i.test(lower)) {
    type = "QUESTION"; intent = "human";
  } else if (/^(?:ok|okay|thanks|thank you|👍|🙏)$/i.test(t)) {
    type = "CHITCHAT";
  }

  const explicitUpdate = /^(?:change|update|set)\s+(?:my\s+)?(?:name|email|area|location|subjects|classes)/i.test(t);
  if (!NOT_PROFILE || explicitUpdate) {
    if (EMAIL_RE_HINT.test(t) && (pendingField === "email" || explicitUpdate || /^(?:my email|email)\s*(?:is|:)?/i.test(t))) {
      type = pendingField === "email" ? "ANSWER_TO_PENDING" : "PROFILE_INFO";
      extracted.email = { value: t.trim(), confidence: 0.95 };
      intent = "update";
    } else if (
      pendingField === "classes_subjects" || explicitUpdate ||
      /^(?:i (?:teach|can teach)|teaching|classes?\s*\d|\d{1,2}\s*(?:to|-|se)\s*\d{1,2}|class\s*\d{1,2}\s*(?:maths|science|physics|chemistry|biology|all subjects)|(?:maths?|physics|chemistry|biology|all subjects)[,\s]+(?:maths?|science|physics|chemistry|biology|english|sst|all subjects|\d))/i.test(t)
    ) {
      type = pendingField === "classes_subjects" ? "ANSWER_TO_PENDING" : "PROFILE_INFO";
      extracted.classes_subjects = { value: t.trim(), confidence: 0.9 };
      intent = "update";
    } else if (pendingField === "location" || /^my (?:area|locality|location|city) is\b/i.test(t)) {
      type = pendingField === "location" ? "ANSWER_TO_PENDING" : "PROFILE_INFO";
      extracted.location = { value: t.trim(), confidence: 0.85 };
      intent = "update";
    } else if (pendingField === "name" || /^my name is\b/i.test(t)) {
      type = pendingField === "name" ? "ANSWER_TO_PENDING" : "PROFILE_INFO";
      extracted.name = { value: t.trim(), confidence: 0.8 };
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
