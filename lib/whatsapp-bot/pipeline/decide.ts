/**
 * DECIDE — answer the question FIRST, then ask ONE missing field.
 * Pure: no DB, no network, no sends. Replies use the single language policy.
 */
import type { Classification, Intent } from "./classifier";
import { replyInLanguage, type ReplyLanguage, detectLanguage } from "./language";
import { compose, dedupeQuickReplies } from "./compose";

export type DecisionInput = {
  inbound: string;
  classification: Classification;
  missing: string[];
  confirmation?: { field: string; proposed: string } | null;
  askCount?: number;
  askedAt?: Date | null;
  now?: Date;
};

export type Decision = {
  reply: string;
  quickReplies: string[];
  askedField?: string;
  shouldRecordAsk: boolean;
  intent: Intent;
};

const ASK_KEY: Record<string, "needName" | "needEmail" | "needLocation" | "needClasses"> = {
  name: "needName",
  email: "needEmail",
  location: "needLocation",
  classes_subjects: "needClasses",
};

const INTENT_KEY: Partial<Record<Intent, Parameters<typeof replyInLanguage>[1]>> = {
  leads: "leads",
  plans: "plans",
  fees: "fees",
  login: "login",
  online: "online",
  where_from: "whereFrom",
  human: "callMe",
};

export function decide(input: DecisionInput): Decision {
  const inbound = input.inbound ?? "";
  const language: ReplyLanguage = detectLanguage(inbound);
  const c = input.classification;
  const intent = c.intent;
  const t = (key: Parameters<typeof replyInLanguage>[1]) => replyInLanguage(inbound, key);

  // Direct intents are answered before any onboarding question.
  let answer: string;
  const direct = INTENT_KEY[intent];
  if (intent === "decline") answer = t("optOut");
  else if (intent === "coins") answer = t("plans");
  else if (intent === "interested") answer = t("welcomeBack");
  else if (c.message_type === "COMMAND") answer = t("welcomeBack");
  else if (direct) answer = t(direct);
  else if (c.message_type === "QUESTION") answer = t("fallback");
  else answer = t("oneMoment");

  if (input.confirmation) {
    return {
      reply: compose(answer, `${input.confirmation.proposed}\n${t("confirmSave")}`),
      quickReplies: dedupeQuickReplies(["YES", "NO"]),
      shouldRecordAsk: false,
      intent,
    };
  }

  const now = input.now ?? new Date();
  const askedAt = input.askedAt ?? null;
  const suppressed = (input.askCount ?? 0) >= 2 && askedAt != null && now.getTime() - askedAt.getTime() < 24 * 60 * 60 * 1000;
  const missing = input.missing.filter((m) => ASK_KEY[m]);
  const next = missing[0];

  if (!next || suppressed) {
    return { reply: answer, quickReplies: [], shouldRecordAsk: false, intent };
  }

  return {
    reply: compose(answer, t(ASK_KEY[next])),
    quickReplies: dedupeQuickReplies(next === "name" || next === "email" || next === "location" || next === "classes_subjects" ? [] : []),
    askedField: next,
    shouldRecordAsk: true,
    intent,
  };
}
