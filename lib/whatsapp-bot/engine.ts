/**
 * lib/whatsapp-bot/engine.ts
 * Central state machine router.
 * Receives current session + incoming message → returns reply + next state.
 */

import {
  MSG,
  SPECIAL_COMMANDS,
  HELP_COMMANDS,
  CANCEL_COMMANDS,
} from "./messages";
import { type BotSession } from "./session";
import { handleTutorStep } from "./flows/tutor";
import { handleParentStep } from "./flows/parent";

const MAX_RETRIES = 3;

export type EngineResult = {
  reply: string;
  nextStep: string;
  updatedData: Record<string, unknown>;
  userType?: string | null;
  retries: number;
};

export async function processMessage(
  session: BotSession,
  rawMessage: string
): Promise<EngineResult> {
  const msg = rawMessage.trim().toUpperCase();
  const { step, data, retries } = session;

  // ── Global commands — always honoured regardless of step ──────────────────

  if (CANCEL_COMMANDS.includes(msg)) {
    return { reply: MSG.CANCEL, nextStep: "WELCOME", updatedData: {}, userType: null, retries: 0 };
  }

  if (HELP_COMMANDS.includes(msg)) {
    return { reply: MSG.HELP, nextStep: step, updatedData: data, retries: 0 };
  }

  if (SPECIAL_COMMANDS.includes(msg) || step === "DONE") {
    const reply = step === "WELCOME" ? MSG.WELCOME : MSG.RE_WELCOME;
    return { reply, nextStep: "WELCOME", updatedData: {}, userType: null, retries: 0 };
  }

  // ── WELCOME — choose role ─────────────────────────────────────────────────

  if (step === "WELCOME") {
    const normalized = rawMessage.trim();
    if (normalized === "1") {
      return {
        reply: MSG.T_NAME,
        nextStep: "T_NAME",
        updatedData: {},
        userType: "TUTOR",
        retries: 0,
      };
    }
    if (normalized === "2") {
      return {
        reply: MSG.P_STUDENT_NAME,
        nextStep: "P_STUDENT_NAME",
        updatedData: {},
        userType: "PARENT",
        retries: 0,
      };
    }
    // Invalid reply at welcome
    return handleInvalid(session, MSG.WELCOME);
  }

  // ── TUTOR steps ───────────────────────────────────────────────────────────

  if (step.startsWith("T_")) {
    const result = await handleTutorStep(step, rawMessage, data, session.phone);
    if (!result) return handleInvalid(session, null);
    return { ...result, userType: "TUTOR", retries: 0 };
  }

  // ── PARENT steps ──────────────────────────────────────────────────────────

  if (step.startsWith("P_")) {
    const result = await handleParentStep(step, rawMessage, data, session.phone);
    if (!result) return handleInvalid(session, null);
    return { ...result, userType: "PARENT", retries: 0 };
  }

  // ── Fallback ──────────────────────────────────────────────────────────────
  return {
    reply: MSG.WELCOME,
    nextStep: "WELCOME",
    updatedData: {},
    userType: null,
    retries: 0,
  };
}

// ── Helper: invalid reply handler ─────────────────────────────────────────────

function handleInvalid(session: BotSession, contextHint: string | null): EngineResult {
  const nextRetries = session.retries + 1;

  if (nextRetries >= MAX_RETRIES) {
    // Too many bad replies — hard reset
    return {
      reply: MSG.TOO_MANY_RETRIES,
      nextStep: "WELCOME",
      updatedData: {},
      userType: null,
      retries: 0,
    };
  }

  // Echo the unknown-input message, then re-send the current step prompt if useful
  const base = MSG.UNKNOWN;
  return {
    reply: contextHint ? `${base}\n\n${contextHint}` : base,
    nextStep: session.step,
    updatedData: session.data,
    retries: nextRetries,
  };
}
