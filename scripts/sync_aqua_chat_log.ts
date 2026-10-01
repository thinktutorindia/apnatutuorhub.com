/**
 * Idempotent backfill of Aqua SMS portal chat logs into whatsapp_chat_messages.
 * Safe to re-run: rows are upserted on provider message id.
 *
 *   npx tsx scripts/sync_aqua_chat_log.ts
 */
import * as crypto from "crypto";
import * as dns from "dns";
import * as fs from "fs";
import * as net from "net";

type ChatDirection = "INBOUND" | "OUTBOUND";
type ChatWrite = {
  phone: string;
  direction: ChatDirection;
  body: string;
  senderName?: string | null;
  contactName?: string | null;
  step?: string | null;
  messageId?: string | null;
  messageType?: string | null;
  status?: string | null;
  isRead?: boolean;
  createdAt?: Date;
};

let prismaDisconnect: (() => Promise<void>) | null = null;
let normalizeIndiaWhatsApp: (phone: string) => string | null = () => null;
let upsertWhatsAppChatMessage: (input: ChatWrite) => Promise<unknown> = async () => {
  throw new Error("Chat log writer is not ready.");
};

const PORTAL = "https://verified.aquasms.com";
const PORTAL_HOST = "verified.aquasms.com";
const PORTAL_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

function loadEnvFile(file: string, override: boolean) {
  if (!fs.existsSync(file)) return;
  const text = fs.readFileSync(file, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const eq = trimmed.indexOf("=");
    const key = trimmed.slice(0, eq).trim();
    if (!key) continue;
    if (!override && process.env[key]) continue;
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function hashPortalPassword(password: string, salt: string): string {
  const md5 = crypto.createHash("md5").update(password, "utf8").digest("hex");
  return crypto.createHash("sha1").update(`${salt}${md5}`, "utf8").digest("hex");
}

function redactPhones(text: string): string {
  return text.replace(/\d{10,15}/g, (digits) => `****${digits.slice(-4)}`);
}

function safeNotice(html: string): string {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const hit = text.match(/.{0,90}(exceeded|invalid|incorrect|failed|attempt|locked|password).{0,90}/i);
  return redactPhones((hit?.[0] ?? text.slice(0, 180)).trim()).slice(0, 220);
}

function tcpOpen(ip: string, timeoutMs: number, port = 443): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ host: ip, port });
    const finish = (ok: boolean) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

/** One portal address accepts connections; the other hangs. Pin fetch to a live one. */
async function pinPortalHost() {
  const ips = await dns.promises.resolve4(PORTAL_HOST);
  let chosen = "";
  for (const ip of ips) {
    if (await tcpOpen(ip, 5000)) {
      chosen = ip;
      break;
    }
  }
  if (!chosen) throw new Error("Aqua portal is unreachable.");
  const lookup = dns.lookup;
  dns.lookup = ((hostname: string, options: unknown, callback?: unknown) => {
    let opts: dns.LookupOptions = {};
    let cb = callback as (err: NodeJS.ErrnoException | null, address: string | dns.LookupAddress[], family?: number) => void;
    if (typeof options === "function") {
      cb = options as typeof cb;
    } else if (options && typeof options === "object") {
      opts = options as dns.LookupOptions;
    }
    if (hostname === PORTAL_HOST) {
      if (opts.all) cb(null, [{ address: chosen, family: 4 }]);
      else cb(null, chosen, 4);
      return;
    }
    return lookup(hostname, opts, cb);
  }) as typeof dns.lookup;
  console.log(JSON.stringify({ stage: "portal-route", reachable: true }));
}

function cookieHeader(res: Response, prev = ""): string {
  const parts = new Map<string, string>();
  for (const piece of prev.split(";").map((s) => s.trim()).filter(Boolean)) {
    const eq = piece.indexOf("=");
    if (eq > 0) parts.set(piece.slice(0, eq), piece);
  }
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const pair = c.split(";")[0];
    const eq = pair.indexOf("=");
    if (eq > 0) parts.set(pair.slice(0, eq), pair);
  }
  return [...parts.values()].join("; ");
}

function decodeHtml(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseTime(raw?: string): Date | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(trimmed) && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(trimmed)) {
    const iso = trimmed.replace(" ", "T");
    const withZone = iso.length === 16 ? `${iso}:00+05:30` : `${iso}+05:30`;
    const zoned = new Date(withZone);
    if (!Number.isNaN(zoned.getTime())) return zoned;
  }
  const direct = new Date(trimmed);
  if (!Number.isNaN(direct.getTime())) return direct;
  const m = trimmed.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?/i);
  if (!m) return undefined;
  let hour = Number(m[4] ?? 0);
  const ampm = m[7]?.toUpperCase();
  if (ampm === "PM" && hour < 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;
  const iso = `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}T${String(hour).padStart(2, "0")}:${m[5] ?? "00"}:${m[6] ?? "00"}+05:30`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function directionFromClass(className: string): "INBOUND" | "OUTBOUND" {
  const c = className.toLowerCase();
  if (/\byou\b/.test(c)) return "INBOUND";
  if (/\bme\b|outgoing|outbound|chat-right|from-me|\bsent\b|agent|business|sender|right-msg|my-message/.test(c)) {
    return "OUTBOUND";
  }
  return "INBOUND";
}

type Bubble = {
  id?: string;
  time?: string;
  className: string;
  text: string;
};

function parseBubbles(html: string): Bubble[] {
  const starts = [...html.matchAll(/<(div|li)\b[^>]*\bchat-bubble\b[^>]*>/gi)];
  const out: Bubble[] = [];
  for (let i = 0; i < starts.length; i++) {
    const tag = starts[i][0];
    const from = (starts[i].index ?? 0) + tag.length;
    const to = i + 1 < starts.length ? (starts[i + 1].index ?? html.length) : html.length;
    const id =
      tag.match(/\bdata-id=["']([^"']+)["']/i)?.[1] ??
      tag.match(/\bdata-msgid=["']([^"']+)["']/i)?.[1] ??
      tag.match(/\bdata-messageid=["']([^"']+)["']/i)?.[1];
    const time =
      tag.match(/\bdata-time=["']([^"']+)["']/i)?.[1] ??
      tag.match(/\bdata-datetime=["']([^"']+)["']/i)?.[1];
    const className = tag.match(/\bclass=["']([^"']+)["']/i)?.[1] ?? "";
    const text = decodeHtml(html.slice(from, to));
    if (!text) continue;
    out.push({ id, time, className, text: text.slice(0, 8000) });
  }
  return out;
}

function parseContacts(html: string): Array<{ phone: string; name: string | null }> {
  const found = new Map<string, string | null>();
  const add = (rawPhone: string, name?: string) => {
    const phone = normalizeIndiaWhatsApp(rawPhone);
    if (!phone) return;
    const cleanName = name?.replace(/\s+/g, " ").trim();
    const prev = found.get(phone);
    if (!prev && cleanName && !/^\d+$/.test(cleanName)) found.set(phone, cleanName);
    else if (!found.has(phone)) found.set(phone, prev ?? null);
  };

  for (const match of html.matchAll(/getChatConversation\(\s*'([^']+)'\s*,\s*'[^']*'\s*,\s*'([^']*)'/gi)) {
    add(match[1], match[2]);
  }
  for (const match of html.matchAll(/\bid=["'](\d{10,15})["'][^>]*>([\s\S]{0,400})/gi)) {
    const name = decodeHtml(match[2]).split("\n")[0]?.slice(0, 80);
    add(match[1], name);
  }
  for (const match of html.matchAll(/\b(?:contactno|mobileno|mobile)=(\d{10,15})/gi)) {
    add(match[1]);
  }
  return [...found.entries()].map(([phone, name]) => ({ phone, name }));
}

function isDbBlip(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /can't reach database|timed out|timeout|ECONNRESET|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|P1001|P1002|P1017|closed the connection/i.test(message);
}

function isGatewayPage(status: number, text: string): boolean {
  return status >= 500 || /502 Bad Gateway|503 Service|504 Gateway/i.test(text);
}

async function portalGet(cookie: string, path: string): Promise<string> {
  let last: unknown;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const res = await fetch(`${PORTAL}${path}`, {
        headers: {
          Cookie: cookie,
          Referer: `${PORTAL}/chat-log`,
          "User-Agent": PORTAL_UA,
          Accept: "text/html,application/xhtml+xml",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(45000),
      });
      const text = await res.text();
      if (isGatewayPage(res.status, text)) {
        throw new Error("Aqua portal returned a gateway error.");
      }
      if (res.url.includes("/login") || /name=["']login-form["']/i.test(text)) {
        throw new Error("Aqua session expired while reading chat logs.");
      }
      return text;
    } catch (err) {
      last = err;
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("session expired")) throw err;
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
  throw last;
}

async function upsertWithRetry(input: ChatWrite) {
  let last: unknown;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      return await upsertWhatsAppChatMessage(input);
    } catch (err) {
      last = err;
      if (!isDbBlip(err) || attempt === 5) throw err;
      await new Promise((resolve) => setTimeout(resolve, 1200 * attempt));
    }
  }
  throw last;
}

async function mapPool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  let index = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const current = items[index++];
      await fn(current);
    }
  });
  await Promise.all(workers);
}

async function login(): Promise<string> {
  const username = process.env.AQUA_WHATSAPP_USERNAME?.trim() ?? "";
  const password = process.env.AQUA_WHATSAPP_PASSWORD?.trim() ?? "";
  if (!username || !password) throw new Error("Aqua portal username/password are not configured.");

  const loginPage = await fetch(`${PORTAL}/login`, {
    redirect: "manual",
    headers: { "User-Agent": PORTAL_UA, Accept: "text/html" },
  });
  let cookie = cookieHeader(loginPage);
  const loginHtml = await loginPage.text();
  const csrf =
    (loginHtml.match(/name=["']_token["'][^>]*value=["']([^"']+)["']/i) ??
      loginHtml.match(/value=["']([^"']+)["'][^>]*name=["']_token["']/i))?.[1] ?? "";
  const salt = loginHtml.match(/var\s+salt\s*=\s*['"](\d+)['"]/)?.[1] ?? "";
  if (!salt) throw new Error("AQUA_LOGIN_SALT_MISSING");
  const form = new URLSearchParams();
  form.set("inputEmailAddress", username);
  form.set("inputPassword", hashPortalPassword(password, salt));
  if (csrf) form.set("_token", csrf);

  const loginRes = await fetch(`${PORTAL}/authenticate`, {
    method: "POST",
    redirect: "manual",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookie,
      Referer: `${PORTAL}/login`,
      Origin: PORTAL,
      "User-Agent": PORTAL_UA,
      Accept: "text/html",
    },
    body: form.toString(),
  });
  cookie = cookieHeader(loginRes, cookie);
  const location = loginRes.headers.get("location") ?? "";
  const bounced = location.includes("/login") || loginRes.status >= 400;
  const body = bounced || loginRes.status >= 300 ? "" : await loginRes.text();
  const stayedOnLogin = loginRes.status < 300 && /name=["']login-form["']/i.test(body);
  if (bounced || stayedOnLogin) {
    const again = await fetch(`${PORTAL}/login`, {
      headers: { Cookie: cookie, "User-Agent": PORTAL_UA, Accept: "text/html" },
      redirect: "manual",
    });
    cookie = cookieHeader(again, cookie);
    const html = body || (await again.text());
    const notice = safeNotice(html);
    console.log(JSON.stringify({ stage: "login-rejected", notice }));
    const locked = /exceeded/i.test(html);
    throw new Error(locked ? "AQUA_LOGIN_LOCKED" : "AQUA_LOGIN_FAILED");
  }
  return cookie;
}

async function loginWithRetries(): Promise<string> {
  const waitsMs = [0, 3 * 60 * 1000, 8 * 60 * 1000];
  let last = "AQUA_LOGIN_FAILED";
  for (let attempt = 0; attempt < waitsMs.length; attempt++) {
    if (waitsMs[attempt] > 0) {
      console.log(JSON.stringify({
        stage: "login-locked-wait",
        attempt: attempt + 1,
        waitSeconds: waitsMs[attempt] / 1000,
      }));
      await new Promise((resolve) => setTimeout(resolve, waitsMs[attempt]));
    }
    try {
      return await login();
    } catch (err) {
      last = err instanceof Error ? err.message : "login failed";
      if (last !== "AQUA_LOGIN_LOCKED") throw err;
    }
  }
  throw new Error(last);
}

async function withDbRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  let last: unknown;
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      if (!isDbBlip(err) || attempt === 6) throw err;
      console.log(JSON.stringify({ stage: "db-retry", label, attempt }));
      await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
    }
  }
  throw last;
}

async function main() {
  loadEnvFile(".env", false);
  loadEnvFile(".env.local", true);
  const directUrl = process.env.DIRECT_URL?.trim() ?? "";
  let dbRoute = "pooler";
  if (directUrl) {
    try {
      const parsed = new URL(directUrl);
      const port = Number(parsed.port || 5432);
      if (parsed.hostname && await tcpOpen(parsed.hostname, 8000, port)) {
        process.env.DATABASE_URL = directUrl;
        dbRoute = "direct";
      }
    } catch {
      dbRoute = "pooler";
    }
  }
  console.log(JSON.stringify({ stage: "db", route: dbRoute }));
  const chatLog = await import("../lib/whatsapp-chat-log");
  const aqua = await import("../lib/aqua-whatsapp");
  normalizeIndiaWhatsApp = aqua.normalizeIndiaWhatsApp;
  upsertWhatsAppChatMessage = chatLog.upsertWhatsAppChatMessage;
  const { prisma } = await import("../lib/prisma");
  prismaDisconnect = () => prisma.$disconnect();
  await pinPortalHost();

  const beforeMessages = await withDbRetry("count", () => prisma.whatsappChatMessage.count());
  const beforePhones = await withDbRetry("conversations", () => prisma.whatsappChatMessage.groupBy({ by: ["phone"] }));

  let cookie: string;
  try {
    cookie = await loginWithRetries();
  } catch (err) {
    const message = err instanceof Error ? err.message : "login failed";
    console.log(JSON.stringify({ ok: false, reason: message, beforeMessages, beforeConversations: beforePhones.length }));
    process.exitCode = message === "AQUA_LOGIN_LOCKED" ? 2 : 1;
    return;
  }

  const page = await portalGet(cookie, "/chat-log");
  const optionValues = [...page.matchAll(/<option[^>]*value=["']([^"']+)["']/gi)].map((m) => m[1]);
  const fromEnv = normalizeIndiaWhatsApp(process.env.AQUA_WHATSAPP_FROM ?? "");
  const waba =
    optionValues.map((v) => normalizeIndiaWhatsApp(v)).find(Boolean) ||
    fromEnv;
  if (!waba) throw new Error("No WhatsApp business number found on the Aqua chat-log page.");
  console.log(JSON.stringify({ stage: "logged-in", wabaPresent: true }));

  const search = new URLSearchParams();
  search.set("swabanumber", waba);
  await portalGet(cookie, `/chat-log/show?context=${encodeURIComponent(Buffer.from(search.toString()).toString("base64"))}`);

  const contacts: Array<{ phone: string; name: string | null }> = [];
  const seenPhones = new Set<string>();
  let emptyPages = 0;
  for (let pageNo = 1; pageNo <= 400; pageNo++) {
    const html = await portalGet(
      cookie,
      `/get-chat-log-contact-list?wabanumber=${encodeURIComponent(waba)}&mobilenumber=&PageNo=${pageNo}&PerPageRecord=100`
    );
    const batch = parseContacts(html);
    let added = 0;
    for (const contact of batch) {
      if (seenPhones.has(contact.phone)) continue;
      seenPhones.add(contact.phone);
      contacts.push(contact);
      added++;
    }
    if (added === 0) {
      emptyPages++;
      if (emptyPages >= 1) break;
    } else {
      emptyPages = 0;
    }
  }

  console.log(JSON.stringify({ stage: "contacts", count: contacts.length }));

  let bubblesSeen = 0;
  let insertedOrUpdated = 0;
  let contactsWithMessages = 0;
  let contactsEmpty = 0;
  let failures = 0;
  let oldest: Date | undefined;
  let newest: Date | undefined;
  const classCounts = new Map<string, number>();
  let sampleLogged = false;
  const noteTime = (createdAt?: Date) => {
    if (!createdAt) return;
    if (!oldest || createdAt < oldest) oldest = createdAt;
    if (!newest || createdAt > newest) newest = createdAt;
  };

  await mapPool(contacts, 3, async (contact) => {
    const seenIds = new Set<string>();
    let contactBubbles = 0;
    try {
    for (let limitStart = 1; limitStart <= 40; limitStart++) {
      const html = await portalGet(
        cookie,
        `/get-chat-log-conversation?contactno=${encodeURIComponent(contact.phone)}&wabanumber=${encodeURIComponent(waba)}&limitstart=${limitStart}`
      );
      const bubbles = parseBubbles(html);
      if (!sampleLogged && bubbles.length === 0 && html.length > 200 && !/no record|no data|no conversation|no chat/i.test(html)) {
        const tags = [...html.matchAll(/<([a-z0-9]+)[^>]*class=["']([^"']+)["']/gi)]
          .map((m) => m[2])
          .filter((c) => /chat|msg|bubble|message/i.test(c));
        console.log(JSON.stringify({
          parserHint: {
            htmlLength: html.length,
            classes: [...new Set(tags)].slice(0, 20),
            sample: redactPhones(html.replace(/\s+/g, " ").slice(0, 280)),
          },
        }));
        sampleLogged = true;
        throw new Error("AQUA_PARSER_MISMATCH");
      }
      if (bubbles.length === 0) break;
      let fresh = 0;
      for (const bubble of bubbles) {
        const key = bubble.id || `${bubble.time ?? ""}:${bubble.text.slice(0, 80)}`;
        if (seenIds.has(key)) continue;
        seenIds.add(key);
        fresh++;
        contactBubbles++;
        bubblesSeen++;
        const classKey = bubble.className || "(none)";
        classCounts.set(classKey, (classCounts.get(classKey) ?? 0) + 1);
        const createdAt = parseTime(bubble.time);
        noteTime(createdAt);
        const messageId =
          bubble.id ||
          `aqua:${contact.phone}:${createdAt?.toISOString() ?? "na"}:${crypto.createHash("sha1").update(bubble.text).digest("hex").slice(0, 12)}`;
        const direction = directionFromClass(bubble.className);
        const saved = await upsertWithRetry({
          phone: contact.phone,
          direction,
          body: bubble.text,
          senderName: direction === "INBOUND" ? contact.name || "User" : "Aqua",
          contactName: contact.name,
          step: "AQUA_BACKFILL",
          messageId,
          messageType: "text",
          status: direction === "INBOUND" ? "received" : "sent",
          isRead: direction === "OUTBOUND",
          createdAt,
        }) as { step?: string | null; direction?: string; messageId?: string | null } | null;
        if (saved?.step === "AQUA_BACKFILL" && saved.direction !== direction && saved.messageId) {
          await withDbRetry("direction", () => prisma.whatsappChatMessage.update({
            where: { messageId: saved.messageId! },
            data: {
              direction,
              senderName: direction === "INBOUND" ? contact.name || "User" : "Aqua",
              status: direction === "INBOUND" ? "received" : "sent",
              isRead: direction === "OUTBOUND",
            },
          }));
        }
        insertedOrUpdated++;
      }
      if (fresh === 0) break;
    }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message === "AQUA_PARSER_MISMATCH") throw err;
      failures++;
      console.log(JSON.stringify({ stage: "contact-failed", notice: redactPhones(message).slice(0, 180) }));
    }
    if (contactBubbles === 0) contactsEmpty++;
    else contactsWithMessages++;
    if ((contactsWithMessages + contactsEmpty) % 25 === 0) {
      console.log(JSON.stringify({
        stage: "progress",
        scanned: contactsWithMessages + contactsEmpty,
        of: contacts.length,
        bubblesSeen,
        failures,
      }));
    }
  });

  const afterMessages = await withDbRetry("count-after", () => prisma.whatsappChatMessage.count());
  const afterPhones = await withDbRetry("conversations-after", () => prisma.whatsappChatMessage.groupBy({ by: ["phone"] }));
  const inbound = await withDbRetry("inbound", () => prisma.whatsappChatMessage.count({ where: { direction: "INBOUND" } }));
  const outbound = await withDbRetry("outbound", () => prisma.whatsappChatMessage.count({ where: { direction: "OUTBOUND" } }));
  const bounds = await withDbRetry("bounds", () => prisma.whatsappChatMessage.aggregate({
    _min: { createdAt: true },
    _max: { createdAt: true },
  }));

  console.log(JSON.stringify({
    ok: true,
    aquaContacts: contacts.length,
    contactsWithMessages,
    contactsEmpty,
    failures,
    bubblesSeen,
    upserts: insertedOrUpdated,
    classCounts: Object.fromEntries(classCounts),
    pulledRange: {
      oldest: oldest?.toISOString() ?? null,
      newest: newest?.toISOString() ?? null,
    },
    before: { messages: beforeMessages, conversations: beforePhones.length },
    after: {
      messages: afterMessages,
      conversations: afterPhones.length,
      inbound,
      outbound,
      oldest: bounds._min.createdAt?.toISOString() ?? null,
      newest: bounds._max.createdAt?.toISOString() ?? null,
    },
    addedMessages: afterMessages - beforeMessages,
    adminInboxReadsTable: true,
    rerunSafe: true,
  }));
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prismaDisconnect?.();
  });
