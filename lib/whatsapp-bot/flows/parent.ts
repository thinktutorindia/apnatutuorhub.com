/**
 * lib/whatsapp-bot/flows/parent.ts
 * Step-by-step handlers for the PARENT tuition-request flow.
 */

import { MSG, CLASS_MAP, TEACHING_MODE_MAP, BUDGET_MAP } from "../messages";
import { registerParentFromWhatsapp, type ParentBotData } from "../auto-register";
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
function isValidClass(v: string) {
  return ["1", "2", "3", "4", "5", "6"].includes(v.trim());
}
function isValidMode(v: string) {
  return ["1", "2", "3"].includes(v.trim());
}
function isValidBudget(v: string) {
  return ["1", "2", "3", "4"].includes(v.trim());
}

// ── Handlers ──────────────────────────────────────────────────────────────────

export async function handleParentStep(
  step: string,
  reply: string,
  data: Record<string, unknown>,
  phone: string
): Promise<StepResult | null> {
  const r = reply.trim();

  switch (step) {
    case "P_STUDENT_NAME": {
      if (!isValidName(r)) return null;
      return {
        reply: MSG.P_CLASS,
        nextStep: "P_CLASS",
        updatedData: { ...data, studentName: r },
      };
    }

    case "P_CLASS": {
      if (!isValidClass(r)) return null;
      return {
        reply: MSG.P_SUBJECTS,
        nextStep: "P_SUBJECTS",
        updatedData: { ...data, classKey: r },
      };
    }

    case "P_SUBJECTS": {
      const cls = typeof data.classLevel === "string" ? data.classLevel : typeof data.classKey === "string" ? CLASS_MAP[data.classKey] : undefined;
      const subRes = validateAndAlignSubjects(r, cls);
      if (!subRes.isValid || subRes.subjects.length === 0) return null;
      return {
        reply: MSG.P_CITY,
        nextStep: "P_CITY",
        updatedData: { ...data, subjects: subRes.subjects },
      };
    }

    case "P_CITY": {
      const loc = validateAndCleanLocality(r);
      const cityName = loc.isValid ? loc.city : r;
      if (cityName.length < 2) return null;
      return {
        reply: MSG.P_AREA(cityName),
        nextStep: "P_AREA",
        updatedData: { ...data, city: cityName },
      };
    }

    case "P_AREA": {
      const loc = validateAndCleanLocality(r, (data.city as string) || "Delhi");
      if (!loc.isValid) return null;
      return {
        reply: MSG.P_TIMING,
        nextStep: "P_TIMING",
        updatedData: { ...data, area: loc.area, city: loc.city },
      };
    }

    case "P_TIMING": {
      if (r.length < 3) return null;
      return {
        reply: MSG.P_MODE,
        nextStep: "P_MODE",
        updatedData: { ...data, timing: r },
      };
    }

    case "P_MODE": {
      if (!isValidMode(r)) return null;
      return {
        reply: MSG.P_BUDGET,
        nextStep: "P_BUDGET",
        updatedData: { ...data, modeKey: r },
      };
    }

    case "P_BUDGET": {
      if (!isValidBudget(r)) return null;
      return {
        reply: MSG.P_PARENT_NAME,
        nextStep: "P_PARENT_NAME",
        updatedData: { ...data, budgetKey: r },
      };
    }

    case "P_PARENT_NAME": {
      if (!isValidName(r)) return null;
      const updated = { ...data, parentName: r } as Record<string, unknown>;

      // Build confirm message — read from `data` (previously accumulated)
      const classLevel = CLASS_MAP[data.classKey as string] ?? (data.classKey as string);
      const modeLabel = TEACHING_MODE_MAP[data.modeKey as string] ?? (data.modeKey as string);
      const budgetLabel = BUDGET_MAP[data.budgetKey as string]?.label ?? (data.budgetKey as string);

      return {
        reply: MSG.P_CONFIRM({
          studentName: data.studentName as string,
          classLevel,
          subjects: (data.subjects as string[]).join(", "),
          city: data.city as string,
          area: data.area as string,
          timing: data.timing as string,
          mode: modeLabel,
          budget: budgetLabel,
          parentName: r,
        }),
        nextStep: "P_CONFIRM",
        updatedData: updated,
      };
    }

    case "P_CONFIRM": {
      if (r === "1") {
        // Register!
        const botData: ParentBotData = {
          studentName: data.studentName as string,
          classKey: data.classKey as string,
          subjects: data.subjects as string[],
          city: data.city as string,
          area: data.area as string,
          timing: data.timing as string,
          modeKey: data.modeKey as string,
          budgetKey: data.budgetKey as string,
          parentName: data.parentName as string,
        };
        const result = await registerParentFromWhatsapp(phone, botData);
        if (!result.ok) {
          return {
            reply: `⚠️ Submission failed. Please try again.\n\nType *MENU* to restart.`,
            nextStep: "WELCOME",
            updatedData: {},
          };
        }
        return {
          reply: MSG.P_DONE(result.inquiryNumber),
          nextStep: "DONE",
          updatedData: {},
        };
      }
      if (r === "2") {
        // Edit — restart parent flow
        return {
          reply: MSG.P_STUDENT_NAME,
          nextStep: "P_STUDENT_NAME",
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
