/**
 * lib/whatsapp-bot/flows/tutor.ts
 * Step-by-step handlers for the TUTOR registration flow.
 * Each handler receives the current data and the user's reply,
 * and returns { reply, nextStep, updatedData }.
 */

import {
  MSG,
  TUTOR_CLASS_MAP,
  TEACHING_MODE_MAP,
} from "../messages";
import { registerTutorFromWhatsapp, type TutorBotData } from "../auto-register";
import { validateAndCleanLocality, validateAndAlignSubjects } from "../subject-rules";

type StepResult = {
  reply: string;
  nextStep: string;
  updatedData: Record<string, unknown>;
};

// ── Validators ────────────────────────────────────────────────────────────────

function isValidName(v: string) {
  return v.trim().length >= 2 && v.trim().length <= 100;
}
function isValidCity(v: string) {
  return v.trim().length >= 2 && v.trim().length <= 80;
}
function isValidClasses(v: string) {
  const keys = v.split(",").map((s) => s.trim());
  return keys.every((k) => k in TUTOR_CLASS_MAP) && keys.length >= 1;
}
function isValidMode(v: string) {
  return ["1", "2", "3"].includes(v.trim());
}
function isValidExperience(v: string) {
  const n = parseInt(v, 10);
  return !isNaN(n) && n >= 0 && n <= 60;
}

// ── Handlers ──────────────────────────────────────────────────────────────────

export async function handleTutorStep(
  step: string,
  reply: string,
  data: Record<string, unknown>,
  phone: string
): Promise<StepResult | null> {
  const r = reply.trim();

  switch (step) {
    case "T_NAME": {
      if (!isValidName(r)) return null;
      return {
        reply: MSG.T_CITY,
        nextStep: "T_CITY",
        updatedData: { ...data, name: r },
      };
    }

    case "T_CITY": {
      const loc = validateAndCleanLocality(r);
      const cityName = loc.isValid ? loc.city : r;
      if (!isValidCity(cityName)) return null;
      return {
        reply: MSG.T_AREA(cityName),
        nextStep: "T_AREA",
        updatedData: { ...data, city: cityName },
      };
    }

    case "T_AREA": {
      const loc = validateAndCleanLocality(r, (data.city as string) || "Delhi");
      if (!loc.isValid) return null;
      return {
        reply: MSG.T_SUBJECTS,
        nextStep: "T_SUBJECTS",
        updatedData: { ...data, area: loc.area, city: loc.city },
      };
    }

    case "T_SUBJECTS": {
      const subRes = validateAndAlignSubjects(r, data.classLevel as string);
      if (!subRes.isValid || subRes.subjects.length === 0) return null;
      return {
        reply: MSG.T_CLASSES,
        nextStep: "T_CLASSES",
        updatedData: { ...data, subjects: subRes.subjects },
      };
    }

    case "T_CLASSES": {
      // Accept "6" alone as "All"
      const inputKeys = r === "6"
        ? ["1", "2", "3", "4", "5"]
        : r.split(",").map((s) => s.trim());
      if (!isValidClasses(inputKeys.join(","))) return null;
      return {
        reply: MSG.T_MODE,
        nextStep: "T_MODE",
        updatedData: { ...data, classKeys: inputKeys },
      };
    }

    case "T_MODE": {
      if (!isValidMode(r)) return null;
      return {
        reply: MSG.T_TIMING,
        nextStep: "T_TIMING",
        updatedData: { ...data, modeKey: r },
      };
    }

    case "T_TIMING": {
      if (r.length < 3) return null;
      return {
        reply: MSG.T_EXPERIENCE,
        nextStep: "T_EXPERIENCE",
        updatedData: { ...data, timing: r },
      };
    }

    case "T_EXPERIENCE": {
      if (!isValidExperience(r)) return null;
      const exp = parseInt(r, 10);
      const updated = { ...data, experience: exp } as Record<string, unknown>;

      // Build confirm message — all keys accumulated from previous steps
      const classKeys = (data.classKeys as string[]) ?? [];
      const classes = classKeys.includes("6")
        ? "All Classes"
        : classKeys.map((k) => TUTOR_CLASS_MAP[k] ?? k).join(", ");
      const modeLabel = TEACHING_MODE_MAP[data.modeKey as string] ?? (data.modeKey as string);

      return {
        reply: MSG.T_CONFIRM({
          name: data.name as string,
          city: data.city as string,
          area: data.area as string,
          subjects: (data.subjects as string[]).join(", "),
          classes,
          mode: modeLabel,
          timing: data.timing as string,
          experience: String(exp),
        }),
        nextStep: "T_CONFIRM",
        updatedData: updated,
      };
    }

    case "T_CONFIRM": {
      if (r === "1") {
        // Register!
        const botData: TutorBotData = {
          name: data.name as string,
          city: data.city as string,
          area: data.area as string,
          subjects: data.subjects as string[],
          classKeys: data.classKeys as string[],
          modeKey: data.modeKey as string,
          timing: data.timing as string,
          experience: data.experience as number,
        };
        const result = await registerTutorFromWhatsapp(phone, botData);
        if (!result.ok) {
          return {
            reply: `⚠️ Registration failed. Please try again later.\n\nType *MENU* to restart.`,
            nextStep: "WELCOME",
            updatedData: {},
          };
        }
        return {
          reply: MSG.T_DONE(result.magicLink),
          nextStep: "DONE",
          updatedData: {},
        };
      }
      if (r === "2") {
        // Edit — restart tutor flow
        return {
          reply: MSG.T_NAME,
          nextStep: "T_NAME",
          updatedData: {},
        };
      }
      if (r === "3") {
        return {
          reply: MSG.CANCEL,
          nextStep: "WELCOME",
          updatedData: {},
        };
      }
      return null;
    }

    default:
      return null;
  }
}
