/**
 * Aqua SMS WhatsApp client (Pinbot / Pinnacle API).
 *
 * Demo accounts often have portal login + wallet credit but no WABA, template,
 * or system token. This module never auto-broadcasts. Paid sends are opt-in
 * and hard-capped so a test cannot empty the wallet.
 */

import { prisma } from "@/lib/prisma";

export const AQUA_INDIA_UTILITY_INR = 0.147;
export const AQUA_INDIA_MARKETING_INR = 1.005;
export const AQUA_DEFAULT_DAILY_TEST_CAP = 3;

const SEND_AUDIT_ACTIONS = ["SEND_TEST_WHATSAPP", "SEND_WHATSAPP"] as const;

export type AquaSendMode = "template" | "text";

export type AquaWhatsAppConfig = {
  enabled: boolean;
  autoDispatch: boolean;
  autoReply: boolean;
  apiBase: string;
  systemToken: string;
  username: string;
  password: string;
  fromNumber: string;
  phoneNumberId: string;
  defaultTemplateId: string;
  dailyTestCap: number;
};

export type AquaWhatsAppStatus = {
  enabled: boolean;
  autoDispatch: boolean;
  autoReply?: boolean;
  hasSystemToken: boolean;
  hasUsername: boolean;
  hasFromNumber: boolean;
  hasTemplateId: boolean;
  fromNumberMasked: string | null;
  usernameMasked: string | null;
  apiBase: string;
  dailyTestCap: number;
  dailyUsed: number;
  dailyRemaining: number;
  estimatedUtilityInr: number;
  estimatedMarketingInr: number;
  readyForTemplateTest: boolean;
  readyForSessionText: boolean;
  blockers: string[];
};

export type AquaSendResult = {
  ok: boolean;
  providerMessageId?: string;
  rawStatus?: string;
  error?: string;
  billedEstimateInr?: number;
};

function envFlag(name: string, fallback = false): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return fallback;
  return raw === "1" || raw === "true" || raw === "yes";
}

export function getAquaWhatsAppConfig(): AquaWhatsAppConfig {
  const rawCap = process.env.AQUA_WHATSAPP_DAILY_TEST_CAP?.trim();
  const cap = rawCap !== undefined && rawCap !== "" ? Number(rawCap) : 0;
  return {
    enabled: envFlag("AQUA_WHATSAPP_ENABLED", false),
    autoDispatch: envFlag("AQUA_WHATSAPP_AUTO_DISPATCH", false),
    autoReply: envFlag("AQUA_WHATSAPP_AUTO_REPLY", false),
    apiBase: (process.env.AQUA_WHATSAPP_API_BASE ?? "https://partnersv1.pinbot.ai").replace(/\/$/, ""),
    systemToken: process.env.AQUA_WHATSAPP_SYSTEM_TOKEN?.trim() ?? "",
    username: process.env.AQUA_WHATSAPP_USERNAME?.trim() ?? "",
    password: process.env.AQUA_WHATSAPP_PASSWORD?.trim() ?? "",
    fromNumber: normalizeIndiaWhatsApp(process.env.AQUA_WHATSAPP_FROM ?? "") ?? "",
    phoneNumberId: process.env.AQUA_WHATSAPP_PHONE_NUMBER_ID?.trim() ?? "1417510641438661",
    defaultTemplateId: process.env.AQUA_WHATSAPP_TEMPLATE_ID?.trim() ?? "information2",
    dailyTestCap: Number.isFinite(cap) && cap > 0 ? Math.floor(cap) : 0,
  };
}

export function maskSecret(value: string | null | undefined): string | null {
  const v = value?.trim();
  if (!v) return null;
  if (v.length <= 4) return "••••";
  return `${v.slice(0, 2)}••••${v.slice(-2)}`;
}

/** Split Aqua template vars. Prefer one value per line — class/location often contain commas. */
export function parseAquaTemplatePlaceholders(raw: string | null | undefined): string[] {
  const text = raw?.trim() ?? "";
  if (!text) return [];
  const parts = text.includes("\n")
    ? text.split(/\r?\n/)
    : text.includes("|")
      ? text.split("|")
      : text.split(",");
  return parts.map((part) => part.trim()).filter(Boolean);
}

export function normalizeIndiaWhatsApp(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10 && /^[6-9]/.test(digits)) return `91${digits}`;
  if (digits.length === 12 && /^91[6-9]\d{9}$/.test(digits)) return digits;
  if (digits.length === 11 && digits.startsWith("0") && /^[6-9]/.test(digits.slice(1))) {
    return `91${digits.slice(1)}`;
  }
  return null;
}

function startOfUtcDay(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function countAquaSendsToday(): Promise<number> {
  const since = startOfUtcDay();
  const [audits, deliveries] = await Promise.all([
    prisma.auditLog.count({
      where: {
        action: { in: [...SEND_AUDIT_ACTIONS] },
        createdAt: { gte: since },
      },
    }),
    prisma.notificationDelivery.count({
      where: {
        provider: "AQUA_SMS",
        status: { in: ["SENT", "DELIVERED"] },
        createdAt: { gte: since },
      },
    }),
  ]);
  return audits + deliveries;
}

export async function getAquaWhatsAppStatus(): Promise<AquaWhatsAppStatus> {
  const cfg = getAquaWhatsAppConfig();
  const dailyUsed = await countAquaSendsToday();
  const isUncapped = !cfg.dailyTestCap || cfg.dailyTestCap <= 0;
  const dailyRemaining = isUncapped ? 999999 : Math.max(0, cfg.dailyTestCap - dailyUsed);
  const blockers: string[] = [];

  if (!cfg.enabled) blockers.push("Aqua WhatsApp is disabled (AQUA_WHATSAPP_ENABLED).");
  if (!cfg.systemToken) {
    blockers.push("Ask Aqua SMS for the API system token — portal login is not enough.");
  }
  if (!cfg.fromNumber) {
    blockers.push("No WABA sender number. Onboard a WhatsApp Business number in Aqua SMS.");
  }
  if (!cfg.defaultTemplateId) {
    blockers.push("No approved Utility template id. Create one in Aqua SMS → WhatsApp Templates.");
  }

  const readyBase = cfg.enabled && Boolean(cfg.systemToken) && Boolean(cfg.fromNumber);
  return {
    enabled: cfg.enabled,
    autoDispatch: cfg.autoDispatch,
    autoReply: cfg.autoReply,
    hasSystemToken: Boolean(cfg.systemToken),
    hasUsername: Boolean(cfg.username),
    hasFromNumber: Boolean(cfg.fromNumber),
    hasTemplateId: Boolean(cfg.defaultTemplateId),
    fromNumberMasked: maskSecret(cfg.fromNumber),
    usernameMasked: maskSecret(cfg.username),
    apiBase: cfg.apiBase,
    dailyTestCap: cfg.dailyTestCap,
    dailyUsed,
    dailyRemaining,
    estimatedUtilityInr: AQUA_INDIA_UTILITY_INR,
    estimatedMarketingInr: AQUA_INDIA_MARKETING_INR,
    readyForTemplateTest: readyBase && Boolean(cfg.defaultTemplateId) && (isUncapped || dailyRemaining > 0),
    readyForSessionText: readyBase && (isUncapped || dailyRemaining > 0),
    blockers,
  };
}

type AquaApiEnvelope = {
  code?: string;
  status?: string;
  message?: string;
  data?: unknown;
};

function extractProviderId(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const rec = data as Record<string, unknown>;
  const nested = rec.data && typeof rec.data === "object" ? (rec.data as Record<string, unknown>) : rec;
  const id =
    nested.messageid ??
    nested.messageId ??
    nested.id ??
    nested.msgid ??
    rec.messageid ??
    rec.messageId;
  return typeof id === "string" && id.trim() ? id.trim() : undefined;
}

async function aquaRequest(
  path: string,
  body: Record<string, unknown>
): Promise<{ httpStatus: number; payload: AquaApiEnvelope; raw: string }> {
  const cfg = getAquaWhatsAppConfig();
  if (!cfg.systemToken) {
    throw new Error("Aqua SMS system token is not configured.");
  }

  const res = await fetch(`${cfg.apiBase}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      systemtoken: cfg.systemToken,
      apikey: cfg.systemToken,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const raw = await res.text();
  let payload: AquaApiEnvelope = {};
  try {
    payload = raw ? (JSON.parse(raw) as AquaApiEnvelope) : {};
  } catch {
    payload = { status: "FAILED", message: raw.slice(0, 300) || `HTTP ${res.status}` };
  }
  return { httpStatus: res.status, payload, raw };
}

export async function probeAquaWhatsAppLogin(): Promise<AquaSendResult> {
  const cfg = getAquaWhatsAppConfig();
  if (!cfg.enabled) return { ok: false, error: "Aqua WhatsApp is disabled." };
  if (!cfg.systemToken) return { ok: false, error: "System token missing — no paid send was attempted." };
  if (!cfg.username || !cfg.password) {
    return { ok: false, error: "Username/password missing — login probe skipped." };
  }

  try {
    const { payload } = await aquaRequest("/v1/wamessage/login", {
      username: cfg.username,
      password: cfg.password,
    });
    const failed = String(payload.status ?? "").toUpperCase() === "FAILED";
    return {
      ok: !failed,
      rawStatus: payload.status,
      error: failed ? payload.message ?? "Login probe failed" : undefined,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Login probe failed" };
  }
}

async function assertDailyCap(cfg: AquaWhatsAppConfig): Promise<string | null> {
  if (!cfg.dailyTestCap || cfg.dailyTestCap <= 0) return null; // Automatic / uncapped
  const used = await countAquaSendsToday();
  if (used >= cfg.dailyTestCap) {
    return `Daily WhatsApp test cap reached (${cfg.dailyTestCap}). Credits were not spent.`;
  }
  return null;
}

export async function sendAquaWhatsAppMessage(input: {
  to: string;
  mode: AquaSendMode;
  text?: string;
  templateId?: string;
  placeholders?: string[];
  estimatedInr?: number;
  bypassDailyCap?: boolean;
}): Promise<AquaSendResult> {
  const cfg = getAquaWhatsAppConfig();
  if (!cfg.enabled) return { ok: false, error: "Aqua WhatsApp is disabled." };
  if (!cfg.systemToken) return { ok: false, error: "System token missing. No message was sent." };

  const to = normalizeIndiaWhatsApp(input.to);
  if (!to) return { ok: false, error: "Enter a valid Indian mobile number." };

  // Chatbot conversational text replies are ALWAYS uncapped and automatic
  if (input.mode !== "text" && !input.bypassDailyCap) {
    const capError = await assertDailyCap(cfg);
    if (capError) return { ok: false, error: capError };
  }

  const billedEstimateInr = input.estimatedInr ?? AQUA_INDIA_UTILITY_INR;
  const templateName = (input.templateId || cfg.defaultTemplateId || "information2").trim();

  // Pinbot / Meta Cloud API v3 payload format
  const body: Record<string, unknown> =
    input.mode === "template"
      ? {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "template",
          template: {
            name: templateName,
            language: { code: "en" },
            components: [
              {
                type: "body",
                parameters: (input.placeholders && input.placeholders.length > 0
                  ? input.placeholders
                  : ["000000", "Student", "Tuition", "Home", "Delhi", "5000", "Any", "Immediate"]
                ).map((p) => ({
                  type: "text",
                  text: String(p),
                })),
              },
            ],
          },
        }
      : {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "text",
          text: { body: (input.text ?? "").trim() },
        };

  try {
    const endpoint = `${cfg.apiBase}/v3/${cfg.phoneNumberId}/messages`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: cfg.systemToken,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const raw = await res.text();
    let json: Record<string, any> = {};
    try {
      json = raw ? (JSON.parse(raw) as Record<string, any>) : {};
    } catch {
      json = {};
    }

    if (!res.ok) {
      const errMsg =
        json?.error?.message ||
        json?.message ||
        raw.slice(0, 300) ||
        `HTTP ${res.status}`;
      return {
        ok: false,
        rawStatus: `HTTP_${res.status}`,
        error: errMsg,
        billedEstimateInr,
      };
    }

    const providerMessageId = json?.messages?.[0]?.id;
    const rawStatus = json?.messages?.[0]?.message_status || "accepted";

    return {
      ok: true,
      providerMessageId,
      rawStatus,
      billedEstimateInr,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "WhatsApp API request failed",
    };
  }
}
