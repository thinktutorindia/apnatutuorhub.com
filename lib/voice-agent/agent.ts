/**
 * Spoken call agent. Scripted coordinator turns — not a website chatbot.
 */
import { VOICE_GREETING } from "./training-playbook";
import type { VoiceLeadBrief } from "./match";
import { directVoiceTurn } from "./director";

export type VoiceRole = "PARENT" | "TUTOR" | null;

export type VoiceExtract = {
  name?: string;
  classLevel?: string;
  subjects?: string[];
  area?: string;
  city?: string;
  fee?: number;
  rateType?: "MONTHLY" | "HOURLY";
};

export type VoiceTurn = {
  say: string;
  role: VoiceRole;
  extracted: VoiceExtract;
  handoff: boolean;
  complete: boolean;
  offeredLead?: VoiceLeadBrief | null;
  sendOffered?: boolean;
  leadIndex?: number;
};

export type VoiceHistoryItem = { speaker: "caller" | "priya"; text: string };

export function mergeExtract(prev: VoiceExtract, next: VoiceExtract): VoiceExtract {
  return {
    name: next.name || prev.name,
    classLevel: next.classLevel || prev.classLevel,
    subjects: next.subjects?.length ? next.subjects : prev.subjects,
    area: next.area || prev.area,
    city: next.city || prev.city,
    fee: next.fee || prev.fee,
    rateType: next.rateType || prev.rateType,
  };
}

export { VOICE_GREETING };

export async function nextVoiceTurn(input: {
  callerText: string;
  history: VoiceHistoryItem[];
  extracted: VoiceExtract;
  role: VoiceRole;
  liveLeads?: VoiceLeadBrief[];
  offeredLead?: VoiceLeadBrief | null;
  leadIndex?: number;
}): Promise<VoiceTurn> {
  return directVoiceTurn({
    callerText: input.callerText,
    extracted: input.extracted,
    role: input.role,
    leads: input.liveLeads ?? [],
    offeredLead: input.offeredLead,
    leadIndex: input.leadIndex,
  });
}
