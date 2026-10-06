import { prisma } from "@/lib/prisma";
import { coinCostFromTuitionFee } from "@/lib/subscription-plans";
import { registerParentFromWhatsapp } from "@/lib/whatsapp-bot/auto-register";
import { canonicalIndiaPhone } from "@/lib/india-phone";
import {
  mergeExtract,
  nextVoiceTurn,
  type VoiceExtract,
  type VoiceHistoryItem,
  type VoiceRole,
  type VoiceTurn,
} from "./agent";
import { extractFromCallerText, inferVoiceRole, normalizeCallerText, parentReady } from "./match";
import { VOICE_GREETING } from "./training-playbook";
import { getChatbotMatchingLeads } from "@/lib/whatsapp-bot/leads-helper";

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

function callerPhone(from: string): string | null {
  return canonicalIndiaPhone(from);
}

async function saveParentLead(
  from: string,
  extracted: VoiceExtract
): Promise<{ inquiryNumber?: number; leadId?: string; say?: string; error?: string }> {
  const phone = callerPhone(from);
  if (!phone) return { error: "phone" };
  if (!extracted.classLevel) return { error: "class" };
  if (!extracted.area) return { error: "area" };
  const result = await registerParentFromWhatsapp(phone, {
    name: extracted.name,
    parentName: extracted.name,
    phone,
    classLevel: extracted.classLevel,
    subjects: extracted.subjects,
    area: extracted.area,
    city: extracted.city,
    modeKey: "1",
  });
  if (!result.ok) return { error: "save" };
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

export async function rememberGreeting(callId: string, from: string) {
  const call = await loadCall(callId);
  if (call.history.length > 0) return;
  await saveCall(
    callId,
    from,
    {
      role: null,
      extracted: {},
      history: [{ speaker: "priya", text: VOICE_GREETING }],
    },
    "VOICE"
  );
}

export async function handleCallerTurn(input: {
  callId: string;
  from: string;
  callerText: string;
}): Promise<VoiceTurn & { inquiryNumber?: number }> {
  const callerText = normalizeCallerText(input.callerText);
  const call = await loadCall(input.callId);
  if (call.inquiryNumber) {
    return {
      say: `Aapki enquiry ${call.inquiryNumber} pehle hi note ho chuki hai. Coordinator zarurat padne par WhatsApp karega.`,
      role: call.role,
      extracted: call.extracted,
      handoff: false,
      complete: true,
      inquiryNumber: call.inquiryNumber,
    };
  }

  const guessed = mergeExtract(call.extracted, extractFromCallerText(callerText, {}));
  const role = inferVoiceRole(callerText, call.role);
  const liveLeads =
    role === "TUTOR" && guessed.area
      ? (await getChatbotMatchingLeads(guessed.area, guessed.city, guessed.classLevel, guessed.subjects)).map(
          (lead) => ({
            classLevel: lead.classLevel,
            area: lead.area,
            budget: lead.budget,
          })
        )
      : [];

  const priorHistory =
    call.history.length > 0
      ? call.history
      : [{ speaker: "priya" as const, text: VOICE_GREETING }];

  const turn = await nextVoiceTurn({
    callerText,
    history: priorHistory,
    extracted: guessed,
    role,
    liveLeads,
  });
  const history: VoiceHistoryItem[] = [
    ...priorHistory,
    { speaker: "caller" as const, text: callerText },
    { speaker: "priya" as const, text: turn.say },
  ].slice(-12);
  const next: StoredCall = {
    role: turn.role,
    extracted: mergeExtract(call.extracted, turn.extracted),
    history,
  };

  if (parentReady(next.role, next.extracted) && !turn.handoff) {
    const saved = await saveParentLead(input.from, next.extracted);
    if (saved.inquiryNumber) {
      next.leadId = saved.leadId;
      next.inquiryNumber = saved.inquiryNumber;
      const say = saved.say || turn.say;
      next.history = [...history.slice(0, -1), { speaker: "priya" as const, text: say }];
      await saveCall(input.callId, input.from, next, "DONE");
      return { ...turn, say, inquiryNumber: saved.inquiryNumber, complete: true };
    }
    const ask =
      saved.error === "area"
        ? "Kaunsi colony ya locality hai? Jaise Rohini, Karol Bagh, ya Noida Sector 40."
        : saved.error === "class"
          ? "Bachcha kaunsi class mein hai?"
          : "Ek baar locality aur class clearly bataiye, enquiry save kar deti hoon.";
    await saveCall(input.callId, input.from, next, "VOICE");
    return { ...turn, say: ask, complete: false };
  }

  await saveCall(input.callId, input.from, next, turn.handoff ? "HANDOFF" : "VOICE");
  return turn;
}

export { VOICE_GREETING };
