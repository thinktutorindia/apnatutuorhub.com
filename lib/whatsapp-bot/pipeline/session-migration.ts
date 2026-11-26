/**
 * MID-FLOW SESSION MIGRATION — pure mapping from legacy bot steps to the
 * profile-based flow. Preserves collected data, never re-sends a welcome to
 * a registered user. No DB writes.
 */
import type { ProfileSnapshot } from "./save-gate";

export type LegacySession = {
  phone: string;
  step: string;
  data: Record<string, unknown>;
};

export type MigratedSession = {
  targetStep: "PROFILE_FLOW" | "DONE";
  pendingField?: "name" | "email" | "location" | "classes_subjects";
  preserved: ProfileSnapshot;
  sendWelcome: boolean;
  notes: string[];
};

const FIELD_STEPS: Record<string, "name" | "email" | "location" | "classes_subjects"> = {
  T_NAME: "name",
  UPDATE_NAME: "name",
  T_EMAIL: "email",
  UPDATE_EMAIL: "email",
  T_AREA: "location",
  UPDATE_AREA: "location",
  T_CITY: "location",
  T_SUBJECTS: "classes_subjects",
  T_CLASSES: "classes_subjects",
  UPDATE_SUBJECTS: "classes_subjects",
};

const SKIP_STEPS = new Set(["T_PASSWORD", "UPDATE_PASSWORD", "P_STUDENT_NAME", "P_CLASS", "P_SUBJECTS", "P_AREA", "P_MODE", "P_BUDGET"]);

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}
function arr(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && Boolean(x.trim())) : [];
}

export function migrateLegacySession(session: LegacySession): MigratedSession {
  const d = session.data ?? {};
  const notes: string[] = [];
  const preserved: ProfileSnapshot = {
    name: str(d.name),
    email: str(d.email),
    area: str(d.area),
    city: str(d.city),
    subjects: arr(d.subjects),
    classLevels: arr(d.classLevels),
  };
  const registered = d._registered === true || session.step === "DONE";
  const pending = FIELD_STEPS[session.step];

  if (SKIP_STEPS.has(session.step)) {
    notes.push(`Step ${session.step} is not a profile field; keep the dedicated handler.`);
    return { targetStep: "PROFILE_FLOW", preserved, sendWelcome: false, notes };
  }

  if (session.step === "LANG_SELECT" || session.step === "WELCOME" || !pending) {
    notes.push(`Step ${session.step} maps to the profile flow with no forced field.`);
    return {
      targetStep: "PROFILE_FLOW",
      preserved,
      sendWelcome: !registered,
      notes,
    };
  }

  const field = pending;
  const existing = field === "name" ? preserved.name
    : field === "email" ? preserved.email
      : field === "location" ? preserved.area
        : preserved.subjects?.length ? preserved.subjects.join(", ") : null;

  if (existing) notes.push(`Kept previously collected ${field} value; ask for confirmation before overwriting.`);
  return {
    targetStep: "PROFILE_FLOW",
    pendingField: field,
    preserved,
    sendWelcome: false, // mid-flow user already saw a question; never duplicate the welcome
    notes,
  };
}

/** No field is dropped: a field is "lost" only if it is absent in both session and DB. */
export function preservedFields(migrated: MigratedSession): string[] {
  const p = migrated.preserved;
  return [
    p.name ? "name" : null,
    p.email ? "email" : null,
    p.area ? "area" : null,
    p.city ? "city" : null,
    p.subjects?.length ? "subjects" : null,
    p.classLevels?.length ? "classLevels" : null,
  ].filter(Boolean) as string[];
}
