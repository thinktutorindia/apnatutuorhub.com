/**
 * REAL implementations behind the pipeline interfaces.
 * No network call happens at import time. Every adapter fails closed /
 * hands back "needs review" when its credential or API is unavailable.
 */
import { resolveMx } from "node:dns/promises";
import { GEMINI_TEXT_MODEL_CASCADE, getGeminiApiKey } from "@/lib/gemini-models";
import { prisma } from "@/lib/prisma";
import type { GeminiClassifier } from "./classifier";
import type { NameChecker, Geocoder, MxLookup, CallbackTasks } from "./validators";
import type { ProfileStore } from "./save-gate";
import { dbProfileStore } from "./save-gate";

const TIMEOUT_MS = 10_000;

async function timedFetch(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timer);
  }
}

function extractJson(text: string): unknown | null {
  try { return JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, "")); }
  catch { return null; }
}

// ── GEMINI CLASSIFIER ─────────────────────────────────────────────────────────

export class LiveGeminiClassifier implements GeminiClassifier {
  constructor(private readonly model = GEMINI_TEXT_MODEL_CASCADE[0]) {}

  async classify(prompt: string): Promise<string> {
    const key = getGeminiApiKey();
    if (!key) throw new Error("Gemini key unavailable");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${encodeURIComponent(key)}`;
    const res = await timedFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: "Return ONLY valid JSON matching the user's schema. No prose, no markdown." }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
      }),
    });
    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
    const body = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    if (!text) throw new Error("Gemini empty response");
    return text;
  }
}

// ── GEMINI NAME CHECK ─────────────────────────────────────────────────────────

export class LiveNameChecker implements NameChecker {
  async isRealPersonName(name: string): Promise<{ is_real_person_name: boolean; confidence: number }> {
    const key = getGeminiApiKey();
    if (!key) return { is_real_person_name: false, confidence: 0 };
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TEXT_MODEL_CASCADE[0]}:generateContent?key=${encodeURIComponent(key)}`;
      const res = await timedFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: `Is this a real person's name (titles allowed)? Reply JSON only: {"is_real_person_name":boolean,"confidence":0..1}. Name: ${JSON.stringify(name)}` }] }],
          generationConfig: { temperature: 0, responseMimeType: "application/json" },
        }),
      });
      if (!res.ok) return { is_real_person_name: false, confidence: 0 };
      const body = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
      const parsed = extractJson(body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "") as Record<string, unknown> | null;
      if (!parsed || typeof parsed.is_real_person_name !== "boolean" || typeof parsed.confidence !== "number") {
        return { is_real_person_name: false, confidence: 0 };
      }
      return { is_real_person_name: parsed.is_real_person_name, confidence: Math.max(0, Math.min(1, parsed.confidence)) };
    } catch {
      return { is_real_person_name: false, confidence: 0 };
    }
  }
}

// ── GOOGLE GEOCODER ───────────────────────────────────────────────────────────

type GeoComponent = { long_name: string; short_name: string; types: string[] };

export function parseGoogleGeocode(body: {
  status?: string;
  results?: Array<{ address_components?: GeoComponent[]; geometry?: { location?: { lat?: number; lng?: number } } }>;
}): { locality?: string; city?: string; lat?: number; lng?: number } | null {
  if (body.status !== "OK" || !body.results?.length) return null;
  const result = body.results[0];
  const components = result.address_components ?? [];
  const find = (types: string[]) => components.find((c) => types.some((t) => c.types.includes(t)))?.long_name;
  const locality = find(["locality", "postal_town", "sublocality", "neighborhood"]);
  const city = find(["locality", "administrative_area_level_2", "administrative_area_level_1"]);
  const lat = result.geometry?.location?.lat;
  const lng = result.geometry?.location?.lng;
  if (!locality && !city) return null;
  return { locality, city, lat, lng };
}

export class GoogleGeocoder implements Geocoder {
  constructor(private readonly apiKey = process.env.GOOGLE_MAPS_API_KEY ?? "") {}

  async geocode(raw: string): Promise<{ locality?: string; city?: string; lat?: number; lng?: number } | null> {
    if (!this.apiKey) return null;
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(raw)}&region=in&key=${encodeURIComponent(this.apiKey)}`;
      const res = await timedFetch(url, { method: "GET" });
      if (!res.ok) return null;
      return parseGoogleGeocode(await res.json() as never);
    } catch {
      return null;
    }
  }
}

// ── MX LOOKUP ─────────────────────────────────────────────────────────────────

export class DnsMxLookup implements MxLookup {
  async hasMx(domain: string): Promise<boolean> {
    try {
      const records = await Promise.race([
        resolveMx(domain),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("MX timeout")), 3000)),
      ]);
      return records.length > 0;
    } catch {
      return false;
    }
  }
}

// ── PRISMA STORES ─────────────────────────────────────────────────────────────

export function liveProfileStore(phone: string): ProfileStore {
  return dbProfileStore(phone);
}

export const liveCallbackTasks: CallbackTasks = {
  create: (input) => prisma.callbackTask.create({
    data: {
      phone: input.phone,
      reason: input.reason,
      preferredTime: input.preferredTime ?? null,
      status: "PENDING",
    },
  }),
};

export const counters = {
  async get(phone: string) {
    return prisma.whatsappReplyCounter.findUnique({ where: { phone } });
  },
  async recordReply(phone: string, replyText: string) {
    const now = new Date();
    const existing = await prisma.whatsappReplyCounter.findUnique({ where: { phone } });
    const windowExpired = !existing || now.getTime() - existing.windowStart.getTime() > 10 * 60 * 1000;
    const repeats = existing && !windowExpired && existing.lastReplyText === replyText ? existing.lastReplyTextCount + 1 : 1;
    return prisma.whatsappReplyCounter.upsert({
      where: { phone },
      create: { phone, windowStart: now, repliesInWindow: 1, lastReplyText: replyText, lastReplyTextCount: 1 },
      update: {
        windowStart: windowExpired ? now : existing.windowStart,
        repliesInWindow: windowExpired ? 1 : { increment: 1 },
        lastReplyText: replyText,
        lastReplyTextCount: repeats,
        flaggedForStaff: repeats > 2,
      },
    });
  },
};

export const outcomes = {
  record: (input: {
    phone: string;
    inboundMessageId?: string | null;
    decision: "REPLY" | "SILENT";
    reason?: string | null;
    fallbackUsed?: boolean;
    channel?: "TEXT" | "TEMPLATE" | "IMAGE";
    latencyMs?: number;
  }) => prisma.whatsappReplyOutcome.create({
    data: {
      phone: input.phone,
      inboundMessageId: input.inboundMessageId ?? null,
      decision: input.decision,
      reason: input.reason ?? null,
      fallbackUsed: input.fallbackUsed ?? false,
      channel: input.channel ?? null,
      latencyMs: input.latencyMs ?? null,
    },
  }),
};

export const rejectedSaves = {
  log: (entry: { phone: string; field: string; input: string; reason: string }) =>
    prisma.whatsappRejectedSave.create({ data: entry }),
};

export const sessionStore = {
  async get(phone: string) {
    return prisma.whatsappSession.findUnique({ where: { phone } });
  },
  async setPipelineState(phone: string, patch: {
    unsubscribed?: boolean;
    windowExpiresAt?: Date | null;
    pendingQuestion?: string | null;
    pendingAskedAt?: Date | null;
    askCount?: number;
    rollingSummary?: string | null;
  }) {
    return prisma.whatsappSession.update({ where: { phone }, data: patch });
  },
};
