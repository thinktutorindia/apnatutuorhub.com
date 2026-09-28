/**
 * Idempotent backfill of Aqua SMS portal chat logs into whatsapp_chat_messages.
 * Safe to re-run: rows are upserted on provider message id.
 *
 *   npx tsx scripts/sync_aqua_chat_log.ts
 */
import * as crypto from "crypto";
import * as fs from "fs";
import { prisma } from "../lib/prisma";
import { normalizeIndiaWhatsApp } from "../lib/aqua-whatsapp";
import { upsertWhatsAppChatMessage } from "../lib/whatsapp-chat-log";

const PORTAL = "https://verified.aquasms.com";

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

function hashPortalPassword(password: string): string {
  const md5 = crypto.createHash("md5").update(password, "utf8").digest("hex");
  return crypto.createHash("sha1").update(`1433538588${md5}`, "utf8").digest("hex");
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
  if (/outgoing|outbound|chat-right|from-me|\bsent\b|agent|business|sender|right-msg|my-message/.test(c)) {
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

async function portalGet(cookie: string, path: string): Promise<string> {
  const res = await fetch(`${PORTAL}${path}`, {
    headers: { Cookie: cookie, Referer: `${PORTAL}/chat-log` },
    redirect: "follow",
  });
  const text = await res.text();
  if (res.url.includes("/login") || /name=["']login-form["']/i.test(text)) {
    throw new Error("Aqua session expired while reading chat logs.");
  }
  return text;
}

async function login(): Promise<string> {
  const username = process.env.AQUA_WHATSAPP_USERNAME?.trim() ?? "";
  const password = process.env.AQUA_WHATSAPP_PASSWORD?.trim() ?? "";
  if (!username || !password) throw new Error("Aqua portal username/password are not configured.");

  const loginPage = await fetch(`${PORTAL}/login`, { redirect: "manual" });
  let cookie = cookieHeader(loginPage);
  const loginHtml = await loginPage.text();
  const csrf =
    (loginHtml.match(/name=["']_token["'][^>]*value=["']([^"']+)["']/i) ??
      loginHtml.match(/value=["']([^"']+)["'][^>]*name=["']_token["']/i))?.[1] ?? "";
  const form = new URLSearchParams();
  form.set("inputEmailAddress", username);
  form.set("inputPassword", hashPortalPassword(password));
  if (csrf) form.set("_token", csrf);

  const loginRes = await fetch(`${PORTAL}/authenticate`, {
    method: "POST",
    redirect: "manual",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookie,
      Referer: `${PORTAL}/login`,
      Origin: PORTAL,
    },
    body: form.toString(),
  });
  cookie = cookieHeader(loginRes, cookie);
  const location = loginRes.headers.get("location") ?? "";
  if (location.includes("/login") || loginRes.status >= 400) {
    const again = await fetch(`${PORTAL}/login`, { headers: { Cookie: cookie } });
    const html = await again.text();
    const alert = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ");
    const locked = /exceeded/i.test(alert);
    const err = new Error(locked ? "AQUA_LOGIN_LOCKED" : "AQUA_LOGIN_FAILED");
    throw err;
  }
  return cookie;
}

async function main() {
  loadEnvFile(".env", false);
  loadEnvFile(".env.local", true);

  const beforeMessages = await prisma.whatsappChatMessage.count();
  const beforePhones = await prisma.whatsappChatMessage.groupBy({ by: ["phone"] });

  let cookie: string;
  try {
    cookie = await login();
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

  let bubblesSeen = 0;
  let insertedOrUpdated = 0;
  let contactsWithMessages = 0;
  let contactsEmpty = 0;
  const classCounts = new Map<string, number>();
  let sampleLogged = false;

  for (const contact of contacts) {
    const seenIds = new Set<string>();
    let contactBubbles = 0;
    for (let limitStart = 1; limitStart <= 40; limitStart++) {
      const html = await portalGet(
        cookie,
        `/get-chat-log-conversation?contactno=${encodeURIComponent(contact.phone)}&wabanumber=${encodeURIComponent(waba)}&limitstart=${limitStart}`
      );
      const bubbles = parseBubbles(html);
      if (!sampleLogged && bubbles.length === 0 && html.length > 200 && !/no record|no data|no conversation/i.test(html)) {
        const tags = [...html.matchAll(/<([a-z0-9]+)[^>]*class=["']([^"']+)["']/gi)]
          .map((m) => m[2])
          .filter((c) => /chat|msg|bubble|message/i.test(c));
        console.log(JSON.stringify({
          parserHint: {
            htmlLength: html.length,
            classes: [...new Set(tags)].slice(0, 20),
          },
        }));
        sampleLogged = true;
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
        const messageId =
          bubble.id ||
          `aqua:${contact.phone}:${createdAt?.toISOString() ?? "na"}:${crypto.createHash("sha1").update(bubble.text).digest("hex").slice(0, 12)}`;
        const direction = directionFromClass(bubble.className);
        await upsertWhatsAppChatMessage({
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
        });
        insertedOrUpdated++;
      }
      if (fresh === 0) break;
    }
    if (contactBubbles === 0) contactsEmpty++;
    else contactsWithMessages++;
  }

  const afterMessages = await prisma.whatsappChatMessage.count();
  const afterPhones = await prisma.whatsappChatMessage.groupBy({ by: ["phone"] });
  const inbound = await prisma.whatsappChatMessage.count({ where: { direction: "INBOUND" } });
  const outbound = await prisma.whatsappChatMessage.count({ where: { direction: "OUTBOUND" } });

  console.log(JSON.stringify({
    ok: true,
    aquaContacts: contacts.length,
    contactsWithMessages,
    contactsEmpty,
    bubblesSeen,
    upserts: insertedOrUpdated,
    classCounts: Object.fromEntries(classCounts),
    before: { messages: beforeMessages, conversations: beforePhones.length },
    after: { messages: afterMessages, conversations: afterPhones.length, inbound, outbound },
    addedMessages: afterMessages - beforeMessages,
  }));
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
