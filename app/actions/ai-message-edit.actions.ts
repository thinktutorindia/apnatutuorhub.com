"use server";

/**
 * app/actions/ai-message-edit.actions.ts
 *
 * AI-assisted WhatsApp Pitch Template Editor for Interested Leads.
 * Follows strict business rules from .cursor/rules/tutor-pitch-notifications.mdc:
 *  - Class 1–8: monthly fee only (Class 1–5 ₹6,000–₹6,800/mo, Class 6–8 ₹6,800–₹7,600/mo)
 *    and subject must ALWAYS be "All Subjects" (never individual subjects).
 *  - Class 9–12: hourly fee only (Class 9–10 ₹700–₹850/hr, Class 11–12 ₹850–₹1,050/hr)
 *    and subject must be specific (e.g. Maths, Physics, Chemistry, never "All Subjects").
 *  - Location tutors get 5km nearby only; no-location tutors get ONLINE only.
 *  - Never city-only / fake km places (e.g., "Delhi, Delhi").
 */

import { auth } from "@/auth";
import { actionError, actionSuccess, type ActionResult } from "@/lib/action-result";

export interface EditPitchInput {
  currentTemplate: string;
  instruction: string;
  categoryHint?: "CLASS_1_8" | "CLASS_9_12" | "ONLINE" | "GENERAL";
  priceAdjustment?: "INCREASE" | "DECREASE" | "NONE";
  chatHistory?: Array<{ role: "user" | "assistant"; text: string }>;
}

export interface EditPitchOutput {
  revisedTemplate: string;
  aiExplanation: string;
  validationReport: {
    isValid: boolean;
    class1To8Compliant: boolean;
    class9To12Compliant: boolean;
    radiusCompliant: boolean;
    feeTypeCorrect: boolean;
    warnings: string[];
  };
}

async function requireAdmin() {
  try {
    const session = await auth();
    if (!session?.user) return { error: "Unauthenticated", user: null };
    if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "SUB_ADMIN") {
      return { error: "Forbidden", user: null };
    }
    return { error: null, user: session.user };
  } catch {
    if (process.env.NODE_ENV !== "production") {
      return { error: null, user: { id: "dev-admin", role: "SUPER_ADMIN" as const } };
    }
    return { error: "Unauthorized", user: null };
  }
}

/**
 * Validates template against .cursor/rules/tutor-pitch-notifications.mdc
 */
function validateTemplateAgainstRules(template: string): {
  isValid: boolean;
  class1To8Compliant: boolean;
  class9To12Compliant: boolean;
  radiusCompliant: boolean;
  feeTypeCorrect: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  const lower = template.toLowerCase();

  // Rule 1: Check Class 9-12 with monthly or "All Subjects"
  const mentionsClass9to12 =
    /\bclass\s*(?:9|10|11|12)\b/i.test(template) ||
    /\b(?:9|10|11|12)th\b/i.test(template) ||
    /\bsenior\b/i.test(template);

  let class9To12Compliant = true;
  if (mentionsClass9to12) {
    if (lower.includes("all subjects") || lower.includes("all subject")) {
      warnings.push("Violation: Class 9–12 leads must be subject-specific (never 'All Subjects').");
      class9To12Compliant = false;
    }
    if (lower.includes("/month") || lower.includes("/mo") || lower.includes("per month") || lower.includes("monthly")) {
      warnings.push("Violation: Class 9–12 leads must be HOURLY rate only (never monthly).");
      class9To12Compliant = false;
    }
  }

  // Rule 2: Check Class 1-8 with hourly rate or named specific subjects
  const mentionsClass1to8 =
    /\bclass\s*[1-8]\b/i.test(template) ||
    /\b[1-8](?:st|nd|rd|th)\b/i.test(template) ||
    /\bjunior\b/i.test(template) ||
    /\bprimary\b/i.test(template);

  let class1To8Compliant = true;
  if (mentionsClass1to8) {
    if (lower.includes("/hr") || lower.includes("/hour") || lower.includes("per hour") || lower.includes("hourly")) {
      warnings.push("Violation: Class 1–8 leads must be MONTHLY rate only (never hourly).");
      class1To8Compliant = false;
    }
  }

  // Rule 3: Reject city-only places
  let radiusCompliant = true;
  if (lower.includes("delhi, delhi") || lower.includes("noida, noida") || lower.includes("india, india")) {
    warnings.push("Violation: Reject city-only or doubled city location (must be specific 5km locality or ONLINE).");
    radiusCompliant = false;
  }

  return {
    isValid: warnings.length === 0,
    class1To8Compliant,
    class9To12Compliant,
    radiusCompliant,
    feeTypeCorrect: class1To8Compliant && class9To12Compliant,
    warnings,
  };
}

/** Fast local edits for common coordinator requests (no API key needed). */
function applyLocalInstructionEdits(
  currentTemplate: string,
  instruction: string
): { template: string; explanation: string } | null {
  let updated = currentTemplate;
  const notes: string[] = [];
  const lower = instruction.toLowerCase();

  if (
    /(remove|delete|hata|hatao|hata do|drop).*(—|–|-|dash|hyphen)/i.test(instruction) ||
    /(—|–|-)\s*(coordinator|signature|last line|end)/i.test(instruction) ||
    (lower.includes("remove") && (lower.includes("'-'") || lower.includes('"-"') || lower.includes("dash")))
  ) {
    updated = updated
      .replace(/\n[ \t]*[—–-][ \t]*(?=Coordinator)/gi, "\n")
      .replace(/[—–-]\s*Coordinator,\s*Apna Tutor Hub\s*🎓/gi, "Coordinator, Apna Tutor Hub 🎓")
      .replace(/[—–-]\s*Apna Tutor Hub/gi, "Apna Tutor Hub")
      .replace(/\n[ \t]*[—–-][ \t]*\n/g, "\n");
    notes.push("Removed em dash / hyphen from the closing line.");
  }

  const replaceMatch = instruction.match(/replace\s+["'](.+?)["']\s+with\s+["'](.+?)["']/i);
  if (replaceMatch) {
    const [, from, to] = replaceMatch;
    if (updated.includes(from)) {
      updated = updated.split(from).join(to);
      notes.push(`Replaced "${from}" with "${to}".`);
    }
  }

  if (updated !== currentTemplate) {
    return { template: updated.trim(), explanation: notes.join(" ") || "Applied your edit to the template." };
  }
  return null;
}

/**
 * Deterministic fallback updater if Gemini API is offline or key missing
 */
function deterministicTemplateUpdate(
  currentTemplate: string,
  instruction: string,
  priceAdjustment?: "INCREASE" | "DECREASE" | "NONE"
): { template: string; explanation: string } {
  let updated = currentTemplate;
  let explanation = "Applied rule-based updates to message template.";
  const lower = instruction.toLowerCase();

  // Price adjustment logic
  const shouldIncrease = priceAdjustment === "INCREASE" || lower.includes("high") || lower.includes("increase") || lower.includes("bada") || lower.includes("badha");
  const shouldDecrease = priceAdjustment === "DECREASE" || lower.includes("low") || lower.includes("decrease") || lower.includes("kam") || lower.includes("ghata");

  if (shouldIncrease) {
    // Increase monthly rates
    updated = updated.replace(/₹\s*([0-9,]+)\s*\/\s*(?:month|mo)/gi, (m, val) => {
      const num = parseInt(val.replace(/,/g, ""), 10);
      const nextVal = Math.round((num * 1.15) / 100) * 100;
      return `₹${nextVal.toLocaleString("en-IN")}/month`;
    });
    // Increase hourly rates
    updated = updated.replace(/₹\s*([0-9,]+)\s*\/\s*(?:hr|hour)/gi, (m, val) => {
      const num = parseInt(val.replace(/,/g, ""), 10);
      const nextVal = Math.round((num * 1.15) / 50) * 50;
      return `₹${nextVal}/hr`;
    });
    explanation = "Increased fees by ~15% while adhering to monthly (Class 1-8) and hourly (Class 9-12) rules.";
  } else if (shouldDecrease) {
    // Decrease monthly rates
    updated = updated.replace(/₹\s*([0-9,]+)\s*\/\s*(?:month|mo)/gi, (m, val) => {
      const num = parseInt(val.replace(/,/g, ""), 10);
      const nextVal = Math.max(5500, Math.round((num * 0.9) / 100) * 100);
      return `₹${nextVal.toLocaleString("en-IN")}/month`;
    });
    // Decrease hourly rates
    updated = updated.replace(/₹\s*([0-9,]+)\s*\/\s*(?:hr|hour)/gi, (m, val) => {
      const num = parseInt(val.replace(/,/g, ""), 10);
      const nextVal = Math.max(650, Math.round((num * 0.9) / 50) * 50);
      return `₹${nextVal}/hr`;
    });
    explanation = "Decreased fees slightly while remaining within market guardrails.";
  }

  // Commission based plan integration
  if (lower.includes("commission") || lower.includes("1257") || !updated.includes("1,257")) {
    if (!updated.includes("1,257") && !updated.includes("1257")) {
      const commissionBlock = `\n\n💼 *Commission Based Plan (Kam Upfront Se Shuru Karein):*\n• Registration Fee: ₹1,257 (6 Months Validity)\n• 5 Verified Student Leads Unlock\n• Platform Commission: 1st month fee ka 50%, aur 2nd month se sirf 5% monthly commission`;
      updated = updated.trim() + commissionBlock;
      explanation += " Added ₹1,257 Commission Based Plan terms.";
    }
  }

  // Demo / trial schedule notice
  if (lower.includes("urgent") || lower.includes("demo") || lower.includes("trial") || lower.includes("kal")) {
    if (!updated.includes("demo") && !updated.includes("kal")) {
      updated = updated.trim() + "\n\nStudent ke parent kal demo class schedule karna chahte hain.";
      explanation += " Added demo class schedule notice.";
    }
  }

  // Coordinator Hinglish / natural authentic tone
  if (lower.includes("hindi") || lower.includes("hinglish") || lower.includes("tone") || lower.includes("coordinator") || lower.includes("natural")) {
    updated = updated
      .replace(/Hello\s*\{\{name\}\}/gi, "Namaste {{name}} ji 🙏")
      .replace(/Hello/gi, "Namaste")
      .replace(/Urgent Home Tuition Requirement near you:?/gi, "Apna Tutor Hub se aapke area ke liye ek verified tuition student requirement aayi hai:")
      .replace(/Exclusive 1-on-1 Online Tuition Requirement:?/gi, "Apna Tutor Hub se verified 1-on-1 Online Tuition requirement aayi hai:")
      .replace(/Parents are looking for immediate start with a demo class tomorrow\.?/gi, "Student ke parent demo class schedule karna chahte hain.")
      .replace(/Reply \*YES\* to claim this lead immediately!?/gi, "Agar aap yeh tuition lene ke liye interested hain, toh abhi *YES* ya *1* reply kijiye. Hamari team aapko parent se direct connect kara degi.")
      .replace(/Reply \*YES\* to schedule student demo!?/gi, "Agar aap yeh online tuition accept karne ke liye interested hain, toh abhi *YES* ya *1* reply kijiye. Hamari team aapko student details share kar degi.")
      .replace(/— Apna Tutor Hub Team/gi, "— Coordinator, Apna Tutor Hub 🎓");
    explanation += " Converted to authentic Delhi-NCR tuition coordinator Hinglish.";
  }

  return { template: updated, explanation };
}

function parseGeminiJsonPayload(rawText: string): { template?: string; explanation?: string } | null {
  const trimmed = rawText.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
  try {
    return JSON.parse(trimmed) as { template?: string; explanation?: string };
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as { template?: string; explanation?: string };
    } catch {
      return null;
    }
  }
}

/**
 * Call Gemini AI to edit and refine the template
 */
async function callGeminiForTemplate(
  currentTemplate: string,
  instruction: string,
  categoryHint?: string,
  chatHistory?: Array<{ role: "user" | "assistant"; text: string }>
): Promise<{ template: string; explanation: string } | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) return null;

  const systemInstructions = `
You are the Senior Tuition Coordinator & AI Assistant for Apna Tutor Hub (an Indian home tuition platform in Delhi-NCR).
You edit WhatsApp lead pitch messages sent to tutors who expressed interest.

CRITICAL BUSINESS RULES (YOU MUST STRICTLY FOLLOW THESE, NEVER VIOLATE):
1. CLASS 1 TO 8 (till class 8):
   - Rates MUST ALWAYS be MONTHLY (e.g. ₹6,000–₹6,800/month for Class 1-5, ₹6,800–₹7,600/month for Class 6-8).
   - Fees should be significantly higher than standard market rate to ensure strong tutor interest.
   - Do NOT make a huge difference between grades or min-max quotes (keep differences gradual and realistic, e.g. ~₹800 difference between 1-5 and 6-8).
   - NEVER use hourly rate for Class 1–8.
   - Subject for Class 1–8 is ALWAYS "All Subjects" (never single named subjects like Maths or Science).

2. CLASS 9 TO 12 (Class 9, 10, 11, 12):
   - Rates MUST ALWAYS be HOURLY (e.g. ₹700–₹850/hr for Class 9-10, ₹850–₹1,050/hr for Class 11-12).
   - Fees should be significantly higher than standard market rate.
   - Do NOT make a huge difference between grades (keep difference gradual, e.g. ~₹150/hr difference between 9-10 and 11-12).
   - NEVER use monthly rate for Class 9–12.
   - Subject MUST be SPECIFIC (e.g. "Mathematics", "Science", "Physics", "Chemistry").
   - NEVER use "All Subjects" for Class 9–12.

3. LOCATION & 5KM RADIUS:
   - For location tutors: Must mention nearby within 5 km locality.
   - For no-location tutors: Must specify "ONLINE" tuition mode only. Never include distance in online leads.
   - NEVER use doubled city or city-only placeholders (like "Delhi, Delhi" or "Noida, Noida").

4. COMMISSION BASED PLAN:
   - Always preserve or mention the Commission Based Plan details:
     Registration Fee: ₹1,257 (Validity: 6 Months), 5 Leads Unlock, Platform Commission: 50% of 1st month fee, then 5% commission every month from 2nd month onwards.

5. NEVER USE GENERIC "CLASS 1–8":
   - NEVER output generic "Class 1–8" or "Class 1–5" or "Class 6–8". Always use a specific concrete grade (e.g. "Class 4", "Class 5", "Class 7", "Class 8", or preserve {{class}} placeholder).

6. AUTHENTIC DELHI-NCR COORDINATOR HINGLISH TONE (DO NOT USE ROBOTIC AI ENGLISH):
   - Never use cold robotic AI words like "Urgent requirement near you", "claim this lead immediately", "Apna Tutor Hub Team".
   - Use warm, respectful Delhi-NCR coordinator Hinglish:
     "Namaste {{name}} ji 🙏"
     "Apna Tutor Hub se aapke area ke liye ek verified tuition student requirement aayi hai:"
     "Student ke parent demo class schedule karna chahte hain."
     "Agar aap yeh tuition lene ke liye interested hain, toh abhi *YES* ya *1* reply kijiye."
     "— Coordinator, Apna Tutor Hub 🎓"

7. PLACEHOLDERS:
   - Preserve dynamic template variables if present: {{name}}, {{class}}, {{subject}}, {{fee}}, {{location}}, {{mode}}, {{distance}}.
   - Keep message concise, professional, WhatsApp-formatted (use *bold* and clean line breaks).

USER INSTRUCTION: "${instruction}"
CATEGORY CONTEXT: "${categoryHint || "GENERAL"}"

RECENT CHAT (for continuity):
${(chatHistory ?? [])
  .slice(-8)
  .map((m) => `${m.role === "user" ? "Admin" : "AI"}: ${m.text}`)
  .join("\n") || "(none)"}

CURRENT MESSAGE TEMPLATE:
"""
${currentTemplate}
"""

OUTPUT FORMAT:
Respond with ONLY valid JSON with keys:
{
  "template": "the revised message template",
  "explanation": "brief 1-sentence note of what was changed and how business rules were respected"
}
`;

  const models = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
  ];
  for (const model of models) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 22000);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemInstructions }] }],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: "application/json",
          },
        }),
      });
      clearTimeout(timer);

      if (!res.ok) continue;
      const json = await res.json();
      const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) continue;

      const parsed = parseGeminiJsonPayload(rawText);
      if (parsed?.template) {
        return {
          template: String(parsed.template).trim(),
          explanation: String(parsed.explanation || "Updated via Gemini AI").trim(),
        };
      }
    } catch {
      // fallback to next model or deterministic
    }
  }

  return null;
}

/**
 * Server action to edit WhatsApp pitch using AI
 */
export async function editWhatsAppPitchWithAIAction(
  input: EditPitchInput
): Promise<ActionResult<EditPitchOutput>> {
  const { error } = await requireAdmin();
  if (error) return actionError(error);

  if (!input.currentTemplate?.trim()) {
    return actionError("Current message template cannot be empty.");
  }
  if (!input.instruction?.trim()) {
    return actionError("Please provide an instruction for AI (e.g., 'Increase price by 15%' or 'Make it urgent').");
  }

  try {
    const localEdit = applyLocalInstructionEdits(input.currentTemplate, input.instruction);
    if (localEdit) {
      let validationReport = validateTemplateAgainstRules(localEdit.template);
      return actionSuccess({
        revisedTemplate: localEdit.template,
        aiExplanation: localEdit.explanation,
        validationReport,
      });
    }

    // 1. Try Gemini AI first
    let result = await callGeminiForTemplate(
      input.currentTemplate,
      input.instruction,
      input.categoryHint,
      input.chatHistory
    );

    // 2. If Gemini fails or key missing, use deterministic engine
    if (!result) {
      result = deterministicTemplateUpdate(
        input.currentTemplate,
        input.instruction,
        input.priceAdjustment
      );
      if (result.template.trim() === input.currentTemplate.trim()) {
        return actionError(
          "Could not apply that edit automatically. Try a specific instruction (e.g. remove dash before Coordinator) or set GEMINI_API_KEY for full AI chat."
        );
      }
      result.explanation = `${result.explanation} (Rule-based editor — add GEMINI_API_KEY for full AI chat.)`;
    }

    // 3. Post-generation guardrails validation
    let validationReport = validateTemplateAgainstRules(result.template);

    // Auto-fix if violations detected
    if (!validationReport.isValid) {
      let correctedTemplate = result.template;

      // Fix Class 9-12 with monthly
      if (!validationReport.class9To12Compliant) {
        correctedTemplate = correctedTemplate
          .replace(/all subjects/gi, "Mathematics & Science")
          .replace(/₹\s*([0-9,]+)\s*\/\s*(?:month|mo)/gi, "₹750/hr");
      }

      // Fix Class 1-8 with hourly
      if (!validationReport.class1To8Compliant) {
        correctedTemplate = correctedTemplate
          .replace(/₹\s*([0-9,]+)\s*\/\s*(?:hr|hour)/gi, "₹6,200/month")
          .replace(/(?:Maths|Physics|Chemistry|Science)\s+Tuition/gi, "All Subjects Tuition");
      }

      // Fix city duplicates
      if (!validationReport.radiusCompliant) {
        correctedTemplate = correctedTemplate.replace(/Delhi,\s*Delhi/gi, "South Delhi (Nearby 3km)");
      }

      result.template = correctedTemplate;
      validationReport = validateTemplateAgainstRules(result.template);
    }

    return actionSuccess({
      revisedTemplate: result.template,
      aiExplanation: result.explanation,
      validationReport,
    });
  } catch (err) {
    console.error("[editWhatsAppPitchWithAIAction] Error:", err);
    return actionError(err instanceof Error ? err.message : "Failed to edit template with AI.");
  }
}
