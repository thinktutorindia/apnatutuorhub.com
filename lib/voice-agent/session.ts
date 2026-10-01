import { prisma } from "@/lib/prisma";
import { coinCostFromTuitionFee } from "@/lib/subscription-plans";
import { registerParentFromWhatsapp } from "@/lib/whatsapp-bot/auto-register";
import {
  mergeExtract,
  nextVoiceTurn,
  VOICE_GREETING,
  type VoiceExtract,
  type VoiceHistoryItem,
  type VoiceRole,
  type VoiceTurn,
} from "./agent";

type StoredCall = {
  role: VoiceRole;
  extracted: VoiceExtract;
  history: VoiceHistoryItem[];
  leadId?: string;
  inquiryNumber?: number;
};

function sessionPhone(callId: string): string {
  const safe = callId.replace(/\W/g, "").slice(0, 40) || "unknown";
  return `voice_${safe}`;
}

async function loadCall(callId: string): Promise<StoredCall> {
  const row = await prisma.whatsappSession.findUnique({ where: { phone: sessionPhone(callId) } });
  const data = (row?.data ?? {}) as StoredCall;
  return {
    role: data.role ?? null,
    extracted: data.extracted ?? {},
    history: Array.isArray(data.history) ? data.history.slice(-12) : [],
    leadId: data.leadId,
    inquiryNumber: data.inquiryNumber,
  };
}

async function saveCall(callId: string, from: string, call: StoredCall, step: string) {
  await prisma.whatsappSession.upsert({
    where: { phone: sessionPhone(callId) },
    create: {
      phone: sessionPhone(callId),
      userType: call.role,
      step,
      data: { ...call, caller: from } as object,
      retries: 0,
    },
    update: {
      userType: call.role,
      step,
      data: { ...call, caller: from } as object,
      lastMessageAt: new Date(),
    },
  });
}

async function saveParentLead(
  from: string,
  extracted: VoiceExtract
): Promise<{ inquiryNumber?: number; leadId?: string; say?: string }> {
  const result = await registerParentFromWhatsapp(from, {
    name: extracted.name,
    parentName: extracted.name,
    phone: from,
    classLevel: extracted.classLevel,
    subjects: extracted.subjects,
    area: extracted.area,
    city: extracted.city,
    modeKey: "1",
  });
  if (!result.ok) return {};
  const fee = extracted.fee;
  const rateType = extracted.rateType ?? (fee && fee < 2000 ? "HOURLY" : "MONTHLY");
  await prisma.lead.update({
    where: { id: result.leadId },
    data: {
      radiusKm: 5,
      notes: "[VOICE CALL]",
      ...(fee
        ? {
            budgetMin: fee,
            budgetMax: fee,
            coinCost: coinCostFromTuitionFee({
              budgetMin: fee,
              budgetMax: fee,
              rateType,
              classLevel: extracted.classLevel,
            }),
          }
        : {}),
    },
  });
  return {
    inquiryNumber: result.inquiryNumber,
    leadId: result.leadId,
    say: `Aapki enquiry number ${result.inquiryNumber} note ho gayi hai. Paas ke tutors ko bataya jayega. Dhanyavaad.`,
  };
}

export async function handleCallerTurn(input: {
  callId: string;
  from: string;
  callerText: string;
}): Promise<VoiceTurn & { inquiryNumber?: number }> {
  const call = await loadCall(input.callId);
  if (call.inquiryNumber) {
    return {
      say: `Aapki enquiry ${call.inquiryNumber} pehle hi note ho chuki hai. Coordinator zarurat padne par call karega. Dhanyavaad.`,
      role: call.role,
      extracted: call.extracted,
      handoff: false,
      complete: true,
      inquiryNumber: call.inquiryNumber,
    };
  }

  const turn = await nextVoiceTurn({
    callerText: input.callerText,
    history: call.history,
    extracted: call.extracted,
    role: call.role,
  });
  const history: VoiceHistoryItem[] = [
    ...call.history,
    { speaker: "caller", text: input.callerText },
    { speaker: "priya", text: turn.say },
  ].slice(-12);
  const next: StoredCall = {
    role: turn.role,
    extracted: mergeExtract(call.extracted, turn.extracted),
    history,
  };

  if (turn.complete && turn.role === "PARENT" && !turn.handoff) {
    const saved = await saveParentLead(input.from, next.extracted);
    if (saved.inquiryNumber) {
      next.leadId = saved.leadId;
      next.inquiryNumber = saved.inquiryNumber;
      const say = saved.say || turn.say;
      next.history = [...history.slice(0, -1), { speaker: "priya", text: say }];
      await saveCall(input.callId, input.from, next, "DONE");
      return { ...turn, say, inquiryNumber: saved.inquiryNumber, complete: true };
    }
  }

  await saveCall(input.callId, input.from, next, turn.handoff ? "HANDOFF" : "VOICE");
  return turn;
}

export { VOICE_GREETING };
