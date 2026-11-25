/**
 * One question at a time before a parent lead is saved.
 * A wrong class, subject, mode, or address is explained. Nothing is ready until
 * class, subjects, and a public locality are all valid.
 */
import { isTill8thClass, extractPublicLocality, leadSubjectsForClass, normalizeCanonicalClassLevel } from "@/lib/lead-utils";
import { validateAndAlignSubjects, validateSubjectClassCompatibility, validateAndCleanLocality } from "@/lib/whatsapp-bot/subject-rules";

export type IntakeDraft = {
  classLevel?: string;
  subjects?: string[];
  area?: string;
  city?: string;
  mode?: "ONLINE" | "OFFLINE";
  /** Set when we corrected something and still need a yes before saving. */
  confirm?: "junior-offline" | "junior-subjects" | "senior-subject" | null;
};

export type IntakeAssessment = {
  ready: boolean;
  draft: IntakeDraft;
  reply: string;
  quickReplies: string[];
};

const YES = /^(?:haan|han|ha|yes|ok|okay|theek|thik|sahi|correct|confirm|all subjects|home tuition|offline)$/i;

const PLACE_RE =
  /\b((?:north|south|east|west|central)\s+delhi|greater\s+noida|noida|gurugram|gurgaon|rohini|dwarka|mukundpur|pitampura|janakpuri|laxmi\s+nagar|sector\s*-?\s*\d{1,3}[a-z]?)\b/i;

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (/^\d/.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join(" ")
    .replace(/\bSector\s*/i, "Sector ");
}

function locationFrom(text: string, fallbackCity?: string): { area: string; city: string } | null {
  if (YES.test(text)) return null;

  // If text is multi-segment (e.g. "Class 1, All Subjects, Sector 6"), check segments from right to left
  const parts = text.split(/[,|]/).map((p) => p.trim()).filter(Boolean);
  if (parts.length > 1) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i];
      if (normalizeCanonicalClassLevel(part)) continue;
      const partRes = validateAndCleanLocality(part, fallbackCity || "Delhi");
      if (partRes.isValid && partRes.area) {
        return { area: partRes.area, city: partRes.city };
      }
    }
  }

  const locRes = validateAndCleanLocality(text, fallbackCity || "Delhi");
  if (locRes.isValid && locRes.area) {
    return { area: locRes.area, city: locRes.city };
  }
  const sector = text.match(/\bsector\s*-?\s*(\d{1,3}[a-z]?)\b/i);
  if (sector) return { area: `Sector ${sector[1].toUpperCase()}`, city: locRes.city || fallbackCity || "Delhi" };
  const place = text.match(PLACE_RE);
  if (place) return { area: titleCase(place[1]), city: locRes.city || fallbackCity || "Delhi" };
  const cleaned = extractPublicLocality(text, fallbackCity || "Delhi");
  if (!cleaned || /^class\b/i.test(cleaned) || YES.test(cleaned)) return null;
  return { area: cleaned, city: locRes.city || fallbackCity || "Delhi" };
}

function localityFrom(text: string, fallbackCity?: string): string | null {
  const loc = locationFrom(text, fallbackCity);
  return loc?.area ?? null;
}

function classFrom(text: string): string | null {
  const withoutPlace = text
    .replace(/\bsector\s*-?\s*\d{1,3}[a-z]?\b/gi, " ")
    .replace(/\b\d{6}\b/g, " ");
  return normalizeCanonicalClassLevel(withoutPlace);
}

function gradeOf(classLevel?: string | null): number | null {
  if (!classLevel) return null;
  if (/jee|neet|cuet/i.test(classLevel)) return 12;
  const range = classLevel.match(/(\d{1,2})\s*-\s*(\d{1,2})/);
  if (range) return parseInt(range[1], 10);
  const one = classLevel.match(/\b(\d{1,2})\b/);
  if (!one) return null;
  const n = parseInt(one[1], 10);
  return n >= 1 && n <= 12 ? n : null;
}

function explain(reply: string, quickReplies: string[], draft: IntakeDraft): IntakeAssessment {
  return { ready: false, draft, reply, quickReplies };
}

export function assessIntake(message: string, previous: IntakeDraft = {}): IntakeAssessment {
  const text = message.trim();
  const draft: IntakeDraft = {
    classLevel: previous.classLevel,
    subjects: previous.subjects ? [...previous.subjects] : undefined,
    area: previous.area,
    city: previous.city,
    mode: previous.mode,
    confirm: previous.confirm ?? null,
  };

  if (draft.confirm && YES.test(text)) {
    draft.confirm = null;
  } else if (draft.confirm && !YES.test(text)) {
    draft.confirm = null;
  }

  const garbage =
    /^(?:please\s*)?call(?:\s*me)?\.?$|\bonline\s+le\s+s|\bnot attending\b|\bhindi medium\b|\benglish medium\b|\bagree to take\b|\bfree\s+(?:one\s+)?class\b|\bregistration fees?\b|\bcharges?\b/i.test(text);
  if (garbage && !normalizeCanonicalClassLevel(text)) {
    return explain(
      `That doesn't look like a school class, so nothing was saved yet.\n\n• Class 1–8: Home tuition, All Subjects\n• Class 9–10: Maths, Science, SST, English, etc.\n• Class 11–12: Specific stream subjects (Physics, Accounts, Maths, etc.)\n\nPlease reply in one line, e.g.: *Class 4, All Subjects, Mukundpur*`,
      ["Class 1-5 All Subjects", "Class 8 All Subjects", "Class 9 Maths", "Class 11 Physics"],
      draft
    );
  }

  const parsedClass = classFrom(text);
  if (parsedClass) draft.classLevel = parsedClass;

  const wantsOnline = /\bonline\b/i.test(text) && !/\boffline\b/i.test(text) && !/\bhome\b/i.test(text);
  const wantsOffline = /\b(offline|home tuition|home visit|ghar)\b/i.test(text);
  if (wantsOnline) draft.mode = "ONLINE";
  if (wantsOffline) draft.mode = "OFFLINE";

  const loc = locationFrom(text, draft.city);
  if (loc) {
    draft.area = loc.area;
    draft.city = loc.city;
  }

  const subjectText = text.replace(/\bgeneral science\b/gi, "Science");
  const sub = validateAndAlignSubjects(subjectText, draft.classLevel);
  const namedSubjects = sub.isValid ? sub.subjects : [];
  const mentionsSeniorSubject = namedSubjects.some((s) => /physic|chem|bio|account|commerce/i.test(s))
    || /\b(physics|chemistry|biology|accounts?|commerce)\b/i.test(text);
  const juniorClass = draft.classLevel ? isTill8thClass(draft.classLevel) : false;
  if (namedSubjects.length > 0 && !(juniorClass && mentionsSeniorSubject)) {
    draft.subjects = namedSubjects;
  }

  if (!draft.classLevel) {
    return explain(
      `Please tell me the student's class first.\n\n• *Class 1–8* — Home tuition, All Subjects\n• *Class 9–10* — Mathematics, Science, English, SST\n• *Class 11–12 / JEE / NEET* — Physics, Chemistry, Accountancy, Maths, etc.`,
      ["Class 1-5", "Class 6-8", "Class 9-10", "Class 11-12"],
      draft
    );
  }

  const junior = isTill8thClass(draft.classLevel);
  const grade = gradeOf(draft.classLevel);
  const senior = grade !== null && grade >= 11 || /jee|neet/i.test(draft.classLevel);

  if (junior && draft.mode === "ONLINE") {
    draft.mode = "OFFLINE";
    draft.confirm = "junior-offline";
    return explain(
      `For *${draft.classLevel}*, we offer *home tuition (offline)* on a monthly fee basis.\n\nPlease reply *YES* to confirm and share your locality (sector or colony name).`,
      ["YES", "Class 9-10 Online", "Mukundpur", "Rohini"],
      draft
    );
  }

  if (junior) {
    draft.mode = "OFFLINE";
    const askedSpecific = mentionsSeniorSubject || (draft.subjects || []).some((s) => !/^all subjects$/i.test(s));
    const compat = validateSubjectClassCompatibility(namedSubjects.length > 0 ? namedSubjects : draft.subjects || [], draft.classLevel, "PARENT");
    if (askedSpecific && (mentionsSeniorSubject || !compat.isValid)) {
      draft.subjects = ["All Subjects"];
      draft.confirm = "junior-subjects";
      return explain(
        `${compat.reason || `*${draft.classLevel}* does not have separate Physics or Accountancy subjects.`}\n\nFor Classes 1–8, home tuition covers *All Subjects*. Reply *YES* if that works for you.`,
        ["YES, All Subjects", "Class 9-10 Science", "Class 11 Physics"],
        draft
      );
    }
    draft.subjects = ["All Subjects"];
  } else if (senior && (draft.subjects || []).some((s) => /^(science|general science|all subjects)(?:\s+for\s+class\b.*)?$/i.test(s))) {
    draft.subjects = [];
    draft.confirm = "senior-subject";
    return explain(
      `For *${draft.classLevel}*, please choose specific stream subjects rather than "All Subjects" or generic "Science".\n\nWhich subject do you need: *Physics, Chemistry, Mathematics, Biology, Accountancy, Economics, or English*?`,
      ["Physics", "Chemistry", "Mathematics", "Accountancy"],
      draft
    );
  } else if (!junior && (!draft.subjects || draft.subjects.length === 0 || draft.subjects.every((s) => /^all subjects$/i.test(s)))) {
    draft.subjects = [];
    return explain(
      `Please specify the subjects needed for *${draft.classLevel}*. Class 9–10 covers Maths, Science, English, SST; Class 11–12 covers stream subjects like Physics, Accountancy, Economics.\n\n"All Subjects" is only for Classes 1–8.`,
      grade !== null && grade <= 10 ? ["Mathematics", "Science", "English", "Social Science"] : ["Physics", "Mathematics", "Accountancy", "Biology"],
      draft
    );
  } else if (draft.classLevel && draft.subjects && draft.subjects.length > 0) {
    const compat = validateSubjectClassCompatibility(draft.subjects, draft.classLevel, "PARENT");
    if (!compat.isValid) {
      return explain(
        compat.reason || `*${draft.subjects[0]}* does not match this class level.`,
        compat.suggestedReplies || ["Class 9-10 Science", "Class 11 Physics"],
        { ...draft, subjects: [] }
      );
    }
    if (compat.switchedSubject) draft.subjects = leadSubjectsForClass(draft.classLevel, compat.switchedSubject);
    if (compat.switchedClass) {
      const switched = normalizeCanonicalClassLevel(compat.switchedClass);
      if (switched) draft.classLevel = switched;
    }
  }

  if (draft.confirm) {
    return explain(
      `Please confirm: *${draft.classLevel}*, ${draft.subjects?.join(", ") || "subjects"}, ${draft.mode === "ONLINE" ? "Online" : "Home tuition"}${draft.area ? `, ${draft.area}` : ""}.\n\nReply *YES* to confirm.`,
      ["YES", "Class 9-10", "Change subject"],
      draft
    );
  }

  if (!draft.area) {
    return explain(
      `*${draft.classLevel}* · ${(draft.subjects || []).join(", ")} · ${junior ? "Home tuition (monthly)" : draft.mode === "ONLINE" ? "Online (hourly)" : "Home tuition (hourly)"}.\n\nPlease share your locality / sector / colony name (no house number or landmark needed).`,
      ["Rohini", "Dwarka", "Mukundpur", "Noida Sector 62"],
      draft
    );
  }

  const subjects = leadSubjectsForClass(draft.classLevel, draft.subjects || []);
  if (subjects.length === 0) {
    return explain(
      `The subjects for *${draft.classLevel}* aren't clear yet. Please name the subject(s) you need.`,
      ["Mathematics", "Science", "English", "All Subjects"],
      draft
    );
  }

  draft.subjects = subjects;
  if (!draft.mode) draft.mode = "OFFLINE";
  const sealed = sealLeadEntry(draft);
  if (!sealed.ok) {
    return explain(sealed.reason, ["Class 4 All Subjects Rohini", "Class 10 Maths Rohini", "Class 11 Physics Noida"], draft);
  }
  draft.classLevel = sealed.classLevel;
  draft.subjects = sealed.subjects;
  draft.area = sealed.area;
  draft.mode = sealed.mode;
  return {
    ready: true,
    draft,
    reply: `Saving your request: *${sealed.classLevel}*, ${sealed.subjects.join(", ")}, ${sealed.area}, ${sealed.mode === "ONLINE" ? "Online" : "Home tuition"}.`,
    quickReplies: [],
  };
}

/** Last gate before any lead row is written. Invalid class, subject, or address never passes. */
export function sealLeadEntry(draft: IntakeDraft):
  | { ok: true; classLevel: string; subjects: string[]; area: string; city?: string; mode: "ONLINE" | "OFFLINE" }
  | { ok: false; reason: string } {
  const classLevel = normalizeCanonicalClassLevel(draft.classLevel || "");
  if (!classLevel || !/^(Class ([1-9]|1[0-2])(-([1-9]|1[0-2]))?|Nursery|LKG|UKG|KG|JEE|NEET|CUET)$/.test(classLevel)) {
    return { ok: false, reason: "That doesn't look like a valid class. Please enter Class 1 to 12, Nursery, JEE, or NEET." };
  }
  const rawArea = (draft.area || "").trim();
  if (
    /[?]|\b(near|house|h\.?\s*no|flat|plot|sbi|atm|bank|mandir|temple|branch)\b/i.test(rawArea) &&
    !/\b(sector|sec\b|nagar|vihar|colony|enclave|pur\b|bagh\b|kunj|society)\b/i.test(rawArea)
  ) {
    return { ok: false, reason: "Please enter only your sector, colony, or neighbourhood (not a house number or full sentence)." };
  }
  const area = extractPublicLocality(draft.area || "") || localityFrom(draft.area || "");
  if (!area || area.length > 40 || /[?]|\b(please|call|hu|hoon|padhta|padhti|near|house|sbi|tuition|tution)\b/i.test(area)) {
    return { ok: false, reason: "Please enter only your sector, colony, or neighbourhood (not a house number or full sentence)." };
  }
  const junior = isTill8thClass(classLevel);
  const subjects = leadSubjectsForClass(classLevel, draft.subjects || []);
  if (junior) {
    if (draft.mode === "ONLINE") {
      return { ok: false, reason: "Classes 1–8 are available for offline home tuition only." };
    }
    const specific = (draft.subjects || []).filter((s) => !/^all subjects$/i.test(s));
    if (specific.some((s) => /physic|chem|bio|account|commerce/i.test(s))) {
      return { ok: false, reason: `${classLevel} does not support Physics or Accountancy separately — Classes 1–8 cover All Subjects via home tuition.` };
    }
    return { ok: true, classLevel, subjects: ["All Subjects"], area, city: draft.city, mode: "OFFLINE" };
  }
  const rawSubs = draft.subjects || [];
  if (subjects.length === 0 || rawSubs.every((s) => /^all subjects$/i.test(s))) {
    return { ok: false, reason: `Please specify subjects for ${classLevel} (e.g., Mathematics, Science, Physics, Accountancy). "All Subjects" is for Classes 1–8 only.` };
  }
  if (/^(jee|neet|cuet|class 11|class 12)/i.test(classLevel) && subjects.some((s) => /^(science|general science)(?:\s+for\s+class\b.*)?$/i.test(s))) {
    return { ok: false, reason: `For ${classLevel}, please specify exact stream subjects like Physics, Chemistry, Mathematics, Biology, or Accountancy.` };
  }
  const compat = validateSubjectClassCompatibility(subjects, classLevel, "PARENT");
  if (!compat.isValid) {
    return { ok: false, reason: compat.reason || "Those subjects are not compatible with this class level." };
  }
  return { ok: true, classLevel, subjects, area, city: draft.city, mode: draft.mode === "ONLINE" ? "ONLINE" : "OFFLINE" };
}
