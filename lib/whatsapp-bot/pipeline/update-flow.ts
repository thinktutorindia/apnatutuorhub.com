/**
 * UPDATE FLOW — menu and natural-language updates use the SAME validators.
 * Nothing is saved here; a YES/NO confirmation is returned for the SAVE GATE.
 * Pure: no DB, no network, no sends.
 */
import { validateEmail, validateLocation, validateName, type Validation } from "./validators";
import { parseClassesAndSubjects } from "./taxonomy";
import { replyInLanguage } from "./language";
import { compose } from "./compose";

export type UpdateField = "name" | "email" | "location" | "classes_subjects";

export type UpdateRequest = {
  field: UpdateField;
  proposed: string;
  needsConfirmation: true;
};

export type UpdateResult =
  | { kind: "NO_UPDATE" }
  | { kind: "MENU" }
  | { kind: "INVALID"; field: UpdateField; reason: string }
  | { kind: "CONFIRM"; request: UpdateRequest };

const MENU_RE = /^(?:update details?|update|change details?|my profile|edit profile)$/i;
const MENU_PICK: Record<string, UpdateField> = {
  "1": "name", "2": "email", "3": "location", "4": "classes_subjects",
  name: "name", email: "email", location: "location", area: "location", subjects: "classes_subjects", classes: "classes_subjects",
};

export function isUpdateMenu(text: string): boolean {
  return MENU_RE.test((text ?? "").trim());
}

export function parseUpdateMenuPick(text: string): UpdateField | null {
  return MENU_PICK[(text ?? "").trim().toLowerCase()] ?? null;
}

async function validate(field: UpdateField, value: string): Promise<Validation<string> | Validation<import("./validators").LocationValue>> {
  if (field === "email") return validateEmail(value);
  if (field === "name") return validateName(value);
  if (field === "location") return validateLocation(value);
  const r = parseClassesAndSubjects(value);
  return r.ok ? { ok: true, value: r.entries.join(", ") } : { ok: false, reason: r.prompt ?? "Invalid classes/subjects." };
}

export async function parseUpdateRequest(text: string): Promise<UpdateResult> {
  const raw = (text ?? "").trim();
  if (!raw) return { kind: "NO_UPDATE" };

  const natural: Array<[RegExp, UpdateField]> = [
    [/\b(?:change|update|set)\s+(?:my\s+)?(?:email(?:\s+address)?|login\s*id)\s*(?:to|as)\s*(.+)$/i, "email"],
    [/\b(?:change|update|set)\s+(?:my\s+)?(?:name)\s*(?:to|as)\s*(.+)$/i, "name"],
    [/\b(?:change|update|set)\s+(?:my\s+)?(?:area|locality|location|address|city)\s*(?:to|as)\s*(.+)$/i, "location"],
    [/\b(?:change|update|set)\s+(?:my\s+)?(?:subjects?|classes?|class)\s*(?:to|as)\s*(.+)$/i, "classes_subjects"],
  ];

  let field: UpdateField | null = null;
  let value = "";
  for (const [re, f] of natural) {
    const m = raw.match(re);
    if (m) { field = f; value = m[1].trim(); break; }
  }
  if (!field) return { kind: "NO_UPDATE" };

  const result = await validate(field, value);
  if (!result.ok) return { kind: "INVALID", field, reason: result.reason };
  const proposed = result.ok && typeof result.value === "string"
    ? result.value
    : result.ok ? (result.value as { locality: string }).locality : value;

  return { kind: "CONFIRM", request: { field, proposed, needsConfirmation: true } };
}

/** One-line welcome back after a gap; the actual message is still handled first. */
export function returningUserPrefix(inbound: string, hoursSinceLastInbound: number | null): string {
  if (hoursSinceLastInbound == null || hoursSinceLastInbound < 12) return "";
  return replyInLanguage(inbound, "welcomeBack");
}

export function composeReturningReply(inbound: string, answer: string, hours: number | null, nextQuestion?: string): string {
  return compose([returningUserPrefix(inbound, hours), answer].filter(Boolean).join("\n\n"), nextQuestion);
}
