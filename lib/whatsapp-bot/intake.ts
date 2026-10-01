/**
 * One question at a time before a parent lead is saved.
 * A wrong class, subject, mode, or address is explained. Nothing is ready until
 * class, subjects, and a public locality are all valid.
 */
import { isTill8thClass, extractPublicLocality, leadSubjectsForClass, normalizeCanonicalClassLevel } from "@/lib/lead-utils";
import { validateAndAlignSubjects, validateSubjectClassCompatibility } from "@/lib/whatsapp-bot/subject-rules";

export type IntakeDraft = {
  classLevel?: string;
  subjects?: string[];
  area?: string;
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

function localityFrom(text: string): string | null {
  if (YES.test(text)) return null;
  const sector = text.match(/\bsector\s*-?\s*(\d{1,3}[a-z]?)\b/i);
  if (sector) return `Sector ${sector[1].toUpperCase()}`;
  const place = text.match(PLACE_RE);
  if (place) return titleCase(place[1]);
  const cleaned = extractPublicLocality(text, "Delhi");
  if (!cleaned || /^class\b/i.test(cleaned) || YES.test(cleaned)) return null;
  return cleaned;
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
      `Yeh class nahi hai, isliye request save nahi hui.\n\nClass 1–8 = home tuition, All Subjects.\nClass 9–10 = Maths / Science / English.\nClass 11–12 = Physics, Accounts, jaise koi ek subject.\n\nEk line mein likhein: *Class 4, All Subjects, Mukundpur*`,
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

  const area = localityFrom(text);
  if (area) draft.area = area;

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
      `Pehle class batayein. Sirf number ya koi sentence class nahi hota.\n\n*Class 1 se 8* — home tuition, saare subjects.\n*Class 9–10* — Maths, Science, English.\n*Class 11–12 / JEE / NEET* — Physics, Chemistry, Accounts jaise subject.`,
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
      `*${draft.classLevel}* ke bachche ke liye online class nahi chalti. Sirf *home tuition (offline)* hai, mahine ki fees par.\n\nAgar yeh theek hai to *HAAN* likhein, aur locality batayein (sector ya colony, ghar number nahi).`,
      ["HAAN", "Class 9-10 Online", "Mukundpur", "Rohini"],
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
        `${compat.reason || `*${draft.classLevel}* mein Physics ya Accounts alag se nahi hota.`}\n\nIs class par *All Subjects* aur *home tuition* hota hai. Sahi ho to *HAAN* likhein.`,
        ["HAAN, All Subjects", "Class 9-10 Science", "Class 11 Physics"],
        draft
      );
    }
    draft.subjects = ["All Subjects"];
  } else if (senior && (draft.subjects || []).some((s) => /^(science|general science|all subjects)$/i.test(s))) {
    draft.subjects = [];
    draft.confirm = "senior-subject";
    return explain(
      `*${draft.classLevel}* mein "All Subjects" ya sirf "Science" nahi hota. Stream alag hoti hai.\n\nKaunsa subject chahiye: *Physics, Chemistry, Maths, Biology, Accounts, Economics, ya English*?`,
      ["Physics", "Chemistry", "Maths", "Accounts"],
      draft
    );
  } else if (!junior && (!draft.subjects || draft.subjects.length === 0 || draft.subjects.every((s) => /^all subjects$/i.test(s)))) {
    draft.subjects = [];
    return explain(
      `*${draft.classLevel}* ke liye subject batayein. Class 9–10 par Maths, Science, English, SST. Class 11–12 par Physics, Accounts, ya Economics.\n\nAll Subjects sirf Class 1–8 par hota hai.`,
      grade !== null && grade <= 10 ? ["Maths", "Science", "English", "SST"] : ["Physics", "Maths", "Accounts", "Biology"],
      draft
    );
  } else if (draft.classLevel && draft.subjects && draft.subjects.length > 0) {
    const compat = validateSubjectClassCompatibility(draft.subjects, draft.classLevel, "PARENT");
    if (!compat.isValid) {
      return explain(
        compat.reason || `*${draft.subjects[0]}* is class ke saath match nahi karta.`,
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
      `Confirm kar dein: *${draft.classLevel}*, ${draft.subjects?.join(", ") || "subject"}, ${draft.mode === "ONLINE" ? "Online" : "Home tuition"}${draft.area ? `, ${draft.area}` : ""}.\n\nSahi ho to *HAAN* likhein.`,
      ["HAAN", "Class 9-10", "Change subject"],
      draft
    );
  }

  if (!draft.area) {
    return explain(
      `*${draft.classLevel}* · ${(draft.subjects || []).join(", ")} · ${junior ? "Home tuition, monthly" : draft.mode === "ONLINE" ? "Online, hourly" : "Home tuition, hourly"}.\n\nAb locality batayein — mohalla, sector, ya colony. Ghar number, pincode, ya "near SBI" mat likhein.`,
      ["Rohini", "Dwarka", "Mukundpur", "Noida Sector 62"],
      draft
    );
  }

  const subjects = leadSubjectsForClass(draft.classLevel, draft.subjects || []);
  if (subjects.length === 0) {
    return explain(
      `Subject abhi clear nahi hai. *${draft.classLevel}* ke liye subject ka naam likhein.`,
      ["Maths", "Science", "English", "All Subjects"],
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
    reply: `Save kar rahe hain: *${sealed.classLevel}*, ${sealed.subjects.join(", ")}, ${sealed.area}, ${sealed.mode === "ONLINE" ? "Online" : "Home tuition"}.`,
    quickReplies: [],
  };
}

/** Last gate before any lead row is written. Invalid class, subject, or address never passes. */
export function sealLeadEntry(draft: IntakeDraft):
  | { ok: true; classLevel: string; subjects: string[]; area: string; mode: "ONLINE" | "OFFLINE" }
  | { ok: false; reason: string } {
  const classLevel = normalizeCanonicalClassLevel(draft.classLevel || "");
  if (!classLevel || !/^(Class ([1-9]|1[0-2])(-([1-9]|1[0-2]))?|Nursery|LKG|UKG|KG|JEE|NEET|CUET)$/.test(classLevel)) {
    return { ok: false, reason: "Yeh class valid nahi hai. Class 1 se 12, Nursery, JEE ya NEET likhein." };
  }
  const area = extractPublicLocality(draft.area || "") || localityFrom(draft.area || "");
  if (!area || area.length > 40 || /[?]|\b(please|call|hu|hoon|padhta|padhti|near|house|sbi|tuition|tution)\b/i.test(area)) {
    return { ok: false, reason: "Area sirf sector, colony ya mohalla ho sakta hai. Ghar number aur poora sentence save nahi hota." };
  }
  const junior = isTill8thClass(classLevel);
  const subjects = leadSubjectsForClass(classLevel, draft.subjects || []);
  if (junior) {
    if (draft.mode === "ONLINE") {
      return { ok: false, reason: "Class 1–8 online save nahi hota. Sirf home tuition hai." };
    }
    const specific = (draft.subjects || []).filter((s) => !/^all subjects$/i.test(s));
    if (specific.some((s) => /physic|chem|bio|account|commerce/i.test(s))) {
      return { ok: false, reason: `${classLevel} mein Physics ya Accounts save nahi hota. Is class par All Subjects aur home tuition hota hai.` };
    }
    return { ok: true, classLevel, subjects: ["All Subjects"], area, mode: "OFFLINE" };
  }
  if (subjects.length === 0 || subjects.every((s) => /^all subjects$/i.test(s))) {
    return { ok: false, reason: `${classLevel} ke liye Maths, Science, Physics ya Accounts jaisa subject chahiye. All Subjects sirf Class 1–8 par hai.` };
  }
  if (/^(jee|neet|cuet|class 11|class 12)/i.test(classLevel) && subjects.some((s) => /^(science|general science)$/i.test(s))) {
    return { ok: false, reason: `${classLevel} mein sirf Science kaafi nahi. Physics, Chemistry, Maths, Biology ya Accounts likhein.` };
  }
  const compat = validateSubjectClassCompatibility(subjects, classLevel, "PARENT");
  if (!compat.isValid) {
    return { ok: false, reason: compat.reason || "Yeh subject is class ke saath save nahi ho sakta." };
  }
  return { ok: true, classLevel, subjects, area, mode: draft.mode === "ONLINE" ? "ONLINE" : "OFFLINE" };
}
