/**
 * SAVE GATE — the ONLY writer of email / name / area / city / subjects / classLevels.
 * Every rejected value is logged to whatsapp_rejected_saves via the store.
 * No network and no DB writes unless a real store is explicitly supplied.
 */
import { prisma } from "@/lib/prisma";
import type { Classification } from "./classifier";
import { validateEmail, validateLocation, validateName } from "./validators";
import { parseClassesAndSubjects } from "./taxonomy";

export type ProfileSnapshot = {
  email?: string | null;
  name?: string | null;
  area?: string | null;
  city?: string | null;
  subjects?: string[];
  classLevels?: string[];
};

export type ProfileFields = {
  email?: string;
  name?: string;
  area?: string;
  city?: string;
  subjects?: string[];
  classLevels?: string[];
  /** Carried through the pipeline; DB persistence needs a migration (not yet applied). */
  geo_source?: import("./validators").GeoSource;
};

export interface ProfileStore {
  snapshot(): Promise<ProfileSnapshot>;
  update(fields: ProfileFields): Promise<void>;
  logReject(entry: { phone: string; field: string; input: string; reason: string }): Promise<void>;
}

/** Default DB store. Only used by the live pipeline, never by tests. */
export function dbProfileStore(phone: string): ProfileStore {
  const findUser = () => prisma.user.findFirst({
    where: { OR: [{ phone }, { phone: `+${phone}` }, { email: `wa_${phone}@apnatutorhub.com` }] },
    select: { id: true, email: true, name: true, tutorProfile: { select: { address: true, city: true, subjects: true, classLevels: true } } },
  });
  return {
    snapshot: async () => {
      const u = await findUser();
      return {
        email: u?.email,
        name: u?.name,
        area: u?.tutorProfile?.address,
        city: u?.tutorProfile?.city,
        subjects: u?.tutorProfile?.subjects ?? [],
        classLevels: u?.tutorProfile?.classLevels ?? [],
      };
    },
    update: async (fields) => {
      const u = await findUser();
      if (!u) return;
      await prisma.user.update({ where: { id: u.id }, data: {
        ...(fields.email ? { email: fields.email } : {}),
        ...(fields.name ? { name: fields.name } : {}),
      } });
      if (u.tutorProfile) {
        await prisma.tutorProfile.update({ where: { userId: u.id }, data: {
          ...(fields.area ? { address: fields.area } : {}),
          ...(fields.city ? { city: fields.city } : {}),
          ...(fields.subjects ? { subjects: fields.subjects } : {}),
          ...(fields.classLevels ? { classLevels: fields.classLevels } : {}),
        } });
      }
    },
    logReject: async (entry) => {
      await prisma.whatsappRejectedSave.create({ data: entry });
    },
  };
}

export type SaveGateResult =
  | { status: "NO_SAVE" }
  | { status: "REJECTED"; field: string; reason: string; suggestion?: string }
  | { status: "NEEDS_CONFIRMATION"; field: string; proposed: string; suggestion?: string }
  | { status: "SAVED"; fields: ProfileFields };

const MIN_CONFIDENCE = 0.8;

export async function applySaveGate(input: {
  phone: string;
  classification: Classification;
  store: ProfileStore;
  pendingField?: string;
  /** true only when the user explicitly confirmed a change / yes-button. */
  confirmedChange?: boolean;
  /** Provenance of the inbound row — backfills / staff / forwarded text can never save. */
  source?: { step?: string | null; direction?: string; senderName?: string | null; body?: string };
}): Promise<SaveGateResult> {
  const { classification: c, store, phone } = input;
  if (c.message_type !== "ANSWER_TO_PENDING" && c.message_type !== "PROFILE_INFO") return { status: "NO_SAVE" };

  const src = input.source ?? {};
  const step = (src.step ?? "").toUpperCase();
  if (step === "AQUA_BACKFILL" || src.direction === "OUTBOUND" || /\bstaff\b/i.test(src.senderName ?? "")) {
    await store.logReject({ phone, field: "source", input: (src.body ?? "").slice(0, 200), reason: "outbound_or_backfill_or_staff" });
    return { status: "NO_SAVE" };
  }
  if (/\b(?:products?|download|try our|https?:\/\/|www\.|requirement\s*#|tuition enquiry|client:|forwarded|fwd:)\b/i.test(src.body ?? "")) {
    await store.logReject({ phone, field: "source", input: (src.body ?? "").slice(0, 200), reason: "promo_or_forwarded" });
    return { status: "NO_SAVE" };
  }

  const current = await store.snapshot();
  const fields: ProfileFields = {};
  const writeFields: Array<{ field: "name" | "email" | "location" | "classes_subjects"; raw: string; confidence: number }> = [];

  for (const [key, extracted] of Object.entries(c.extracted)) {
    if (!extracted?.value) continue;
    const confidence = extracted.confidence ?? 0;
    const raw = extracted.value.trim();
    if (confidence < MIN_CONFIDENCE) {
      await store.logReject({ phone, field: key, input: raw, reason: `low_confidence:${confidence}` });
      return { status: "NEEDS_CONFIRMATION", field: key, proposed: raw };
    }
    writeFields.push({ field: key as "name" | "email" | "location" | "classes_subjects", raw, confidence });
  }

  if (writeFields.length === 0) return { status: "NO_SAVE" };

  for (const { field, raw } of writeFields) {
    if (field === "email") {
      const r = await validateEmail(raw);
      if (!r.ok) {
        await store.logReject({ phone, field: "email", input: raw, reason: r.reason });
        return { status: "REJECTED", field: "email", reason: r.reason, suggestion: r.suggestion };
      }
      if (current.email && current.email !== r.value && !input.confirmedChange) {
        return { status: "NEEDS_CONFIRMATION", field: "email", proposed: r.value };
      }
      fields.email = r.value;
    } else if (field === "name") {
      const r = await validateName(raw);
      if (!r.ok) {
        await store.logReject({ phone, field: "name", input: raw, reason: r.reason });
        return { status: "REJECTED", field: "name", reason: r.reason };
      }
      if (current.name && current.name !== r.value && !input.confirmedChange) {
        return { status: "NEEDS_CONFIRMATION", field: "name", proposed: r.value };
      }
      fields.name = r.value;
    } else if (field === "location") {
      const r = await validateLocation(raw);
      if (!r.ok) {
        await store.logReject({ phone, field: "area", input: raw, reason: r.reason });
        return { status: "REJECTED", field: "area", reason: r.reason };
      }
      if (r.ok) {
        if (current.area && current.area !== r.value.locality && !input.confirmedChange) {
          return { status: "NEEDS_CONFIRMATION", field: "area", proposed: r.value.locality };
        }
        fields.area = r.value.locality;
        fields.city = r.value.city ?? undefined;
        fields.geo_source = r.value.geo_source;
      }
    } else if (field === "classes_subjects") {
      const r = parseClassesAndSubjects(raw);
      if (!r.ok) {
        const reason = r.prompt ?? "Invalid class/subject input.";
        await store.logReject({ phone, field: "subjects", input: raw, reason });
        return { status: "REJECTED", field: "subjects", reason };
      }
      const classLevels = [...new Set(r.entries.map((e) => e.match(/Class (\S+)$/)?.[1] ?? ""))].filter(Boolean);
      if (current.classLevels?.length && current.classLevels.join(",") !== classLevels.join(",") && !input.confirmedChange) {
        return { status: "NEEDS_CONFIRMATION", field: "subjects", proposed: r.entries.join(", ") };
      }
      fields.subjects = [...new Set(r.entries)];
      fields.classLevels = classLevels;
    }
  }

  if (Object.keys(fields).length === 0) return { status: "NO_SAVE" };
  await store.update(fields);
  return { status: "SAVED", fields };
}
