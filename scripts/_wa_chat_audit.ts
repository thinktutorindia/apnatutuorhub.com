/**
 * One-off audit: local WhatsApp log counts + Aqua portal chat-endpoint discovery.
 * Prints counts and redacted shapes only. No secrets, no raw phone numbers.
 */
import * as crypto from "crypto";
import * as fs from "fs";
import { prisma } from "../lib/prisma";

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

function redact(input: string): string {
  return input
    .replace(/\b\d{10,15}\b/g, "[phone]")
    .replace(/(systemtoken|apikey|api_key|password|token|secret)(["']?\s*[:=]\s*["']?)[^"',\s}]+/gi, "$1$2[redacted]");
}

function shapeOf(value: unknown, depth = 0): unknown {
  if (depth > 3) return typeof value;
  if (value == null) return value;
  if (Array.isArray(value)) {
    return { array: value.length, sample: value.length ? shapeOf(value[0], depth + 1) : null };
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (/phone|mobile|wa_id|from|to|body|text|message|name|token|password|secret/i.test(k) && typeof v === "string") {
        out[k] = `[${typeof v}:${v.length}]`;
      } else if (typeof v === "string") {
        out[k] = v.length > 80 ? `str:${v.length}` : v.slice(0, 80);
      } else {
        out[k] = shapeOf(v, depth + 1);
      }
    }
    return out;
  }
  if (typeof value === "string") return value.length > 60 ? `str:${value.length}` : value;
  return value;
}

async function localCounts() {
  const [messages, phones, inbound, outbound, withProviderId, dupes, sessions, waDeliveries] = await Promise.all([
    prisma.whatsappChatMessage.count(),
    prisma.whatsappChatMessage.groupBy({ by: ["phone"], _count: { id: true } }),
    prisma.whatsappChatMessage.count({ where: { direction: "INBOUND" } }),
    prisma.whatsappChatMessage.count({ where: { direction: "OUTBOUND" } }),
    prisma.whatsappChatMessage.count({ where: { messageId: { not: null } } }),
    prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT COUNT(*)::bigint AS n FROM (
        SELECT "messageId" FROM whatsapp_chat_messages
        WHERE "messageId" IS NOT NULL
        GROUP BY "messageId" HAVING COUNT(*) > 1
      ) d
    `,
    prisma.whatsappSession.count(),
    prisma.notificationDelivery.count({ where: { channel: "WHATSAPP" } }),
  ]);

  const oldest = await prisma.whatsappChatMessage.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true, direction: true, step: true } });
  const newest = await prisma.whatsappChatMessage.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true, direction: true, step: true } });

  console.log(JSON.stringify({
    local: {
      messages,
      conversations: phones.length,
      inbound,
      outbound,
      withProviderId,
      duplicateProviderIds: Number(dupes[0]?.n ?? 0),
      sessions,
      notificationWhatsappDeliveries: waDeliveries,
      oldest: oldest?.createdAt.toISOString() ?? null,
      newest: newest?.createdAt.toISOString() ?? null,
      oldestStep: oldest?.step ?? null,
      newestStep: newest?.step ?? null,
    },
  }));
}

async function discoverAqua() {
  const username = process.env.AQUA_WHATSAPP_USERNAME?.trim() ?? "";
  const password = process.env.AQUA_WHATSAPP_PASSWORD?.trim() ?? "";
  const token = process.env.AQUA_WHATSAPP_SYSTEM_TOKEN?.trim() ?? "";
  const apiBase = (process.env.AQUA_WHATSAPP_API_BASE ?? "https://partnersv1.pinbot.ai").replace(/\/$/, "");
  console.log(JSON.stringify({
    aquaConfigPresent: {
      username: Boolean(username),
      password: Boolean(password),
      token: Boolean(token),
      apiBaseHost: apiBase.replace(/https?:\/\//, "").split("/")[0],
      from: Boolean(process.env.AQUA_WHATSAPP_FROM),
      phoneNumberId: Boolean(process.env.AQUA_WHATSAPP_PHONE_NUMBER_ID),
    },
  }));

  if (!username || !password) {
    console.log(JSON.stringify({ portal: "skipped-no-credentials" }));
    return;
  }

  const portal = "https://verified.aquasms.com";
  const loginPage = await fetch(`${portal}/login`, { redirect: "manual" });
  const loginHtml = await loginPage.text();
  const tokenMatch = loginHtml.match(/name=["']_token["'][^>]*value=["']([^"']+)["']/i)
    ?? loginHtml.match(/value=["']([^"']+)["'][^>]*name=["']_token["']/i);
  const cookie = loginPage.headers.getSetCookie?.().map((c) => c.split(";")[0]).join("; ")
    ?? "";

  const form = new URLSearchParams();
  form.set("inputEmailAddress", username);
  form.set("inputPassword", password);
  if (tokenMatch?.[1]) form.set("_token", tokenMatch[1]);

  const loginRes = await fetch(`${portal}/authenticate`, {
    method: "POST",
    redirect: "manual",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookie,
      Referer: `${portal}/login`,
      Origin: portal,
    },
    body: form.toString(),
  });
  const setCookie = loginRes.headers.getSetCookie?.() ?? [];
  const sessionCookie = [cookie, ...setCookie.map((c) => c.split(";")[0])].filter(Boolean).join("; ");
  const location = loginRes.headers.get("location");
  console.log(JSON.stringify({
    portalLogin: {
      status: loginRes.status,
      location,
      hasCsrf: Boolean(tokenMatch),
      cookieCount: setCookie.length,
    },
  }));

  if (!sessionCookie || loginRes.status >= 400) return;

  const failPage = await fetch(`${portal}/login`, { headers: { Cookie: sessionCookie } });
  const failHtml = await failPage.text();
  const alerts = [...failHtml.matchAll(/class=["'][^"']*(alert|error|invalid|danger)[^"']*["'][^>]*>([\s\S]*?)<\//gi)]
    .map((m) => m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 5);
  const formHtml = (failHtml.match(/<form name="login-form"[\s\S]*?<\/form>/i)?.[0] ?? "")
    .replace(/value=["'][^"']+["']/gi, 'value="[redacted]"')
    .replace(/\s+/g, " ")
    .slice(0, 1200);
  console.log(JSON.stringify({
    loginFail: {
      userLen: username.length,
      userLooksEmail: username.includes("@"),
      alerts,
      formHtml,
    },
  }));

  const homeUrl = location?.startsWith("http") ? location : `${portal}${location || "/"}`;
  const home = await fetch(homeUrl, {
    headers: { Cookie: sessionCookie },
    redirect: "follow",
  });
  const homeHtml = await home.text();
  const hrefs = [...homeHtml.matchAll(/href=["']([^"']+)["']/gi)].map((m) => m[1]);
  const interesting = [...new Set(hrefs)].filter((h) =>
    /chat|inbox|message|whatsapp|conversation|report|live|history/i.test(h)
  );
  const title = homeHtml.match(/<title>([^<]*)<\/title>/i)?.[1] ?? "";
  console.log(JSON.stringify({
    portalHome: {
      status: home.status,
      finalUrl: home.url,
      title: title.slice(0, 80),
      loggedIn: !/login/i.test(home.url),
      interestingLinks: interesting.slice(0, 100),
      linkCount: hrefs.length,
    },
  }));
}

async function inspectLoginPage() {
  const r = await fetch("https://verified.aquasms.com/login");
  const html = await r.text();
  const actions = [...html.matchAll(/action=["']([^"']+)["']/gi)].map((m) => m[1]);
  const names = [...new Set([...html.matchAll(/name=["']([^"']+)["']/gi)].map((m) => m[1]))];
  const methods = [...html.matchAll(/<form[^>]*>/gi)].map((m) => m[0].replace(/\s+/g, " ").slice(0, 240));
  console.log(JSON.stringify({ loginPage: { status: r.status, len: html.length, actions, names: names.slice(0, 40), methods } }));
}

async function probePartnerApi() {
  const token = process.env.AQUA_WHATSAPP_SYSTEM_TOKEN?.trim() ?? "";
  const apiBase = (process.env.AQUA_WHATSAPP_API_BASE ?? "https://partnersv1.pinbot.ai").replace(/\/$/, "");
  const phoneNumberId = process.env.AQUA_WHATSAPP_PHONE_NUMBER_ID?.trim() ?? "";
  if (!token) {
    console.log(JSON.stringify({ partnerApi: "no-token" }));
    return;
  }
  const headers = {
    "Content-Type": "application/json",
    apikey: token,
    systemtoken: token,
  };
  const paths = [
    `/v3/${phoneNumberId}`,
    `/v3/${phoneNumberId}/message_templates`,
    `/v3/${phoneNumberId}/messages`,
    `/v1/wamessage/messages`,
    `/v1/wamessage/chats`,
    `/v1/wamessage/report`,
    `/v1/wamessage/getChat`,
    `/v1/wamessage/chatHistory`,
    `/v1/wamessage/conversation`,
    `/v2/wamessage/messages`,
    `/v2/wamessage/report`,
  ];
  const results = [];
  for (const path of paths) {
    try {
      const res = await fetch(`${apiBase}${path}`, { method: "GET", headers, cache: "no-store" });
      const raw = await res.text();
      let keys: string[] = [];
      try {
        const json = JSON.parse(raw) as Record<string, unknown>;
        keys = Object.keys(json).slice(0, 12);
      } catch {
        keys = [];
      }
      results.push({
        path,
        status: res.status,
        len: raw.length,
        keys,
        hint: redact(raw).slice(0, 180),
      });
    } catch (err) {
      results.push({ path, error: err instanceof Error ? err.message : "fetch failed" });
    }
  }
  console.log(JSON.stringify({ partnerApi: results }));
}

async function scrapePortalJs() {
  const portal = "https://verified.aquasms.com";
  const login = await fetch(`${portal}/login`);
  const html = await login.text();
  const srcs = [...html.matchAll(/src=["']([^"']+)["']/gi)].map((m) => m[1]);
  const guesses = [
    "/assets/js/commonfunction.js",
    "/assets/js/app.js",
    "/assets/js/whatsapp-chat/whatsapp-chat.js",
    "/assets/js/live-chat/live-chat.js",
    "/assets/js/chat/chat.js",
    "/assets/js/whatsapp-inbox/whatsapp-inbox.js",
    "/assets/js/api-report-master/api-report-master.js",
  ];
  const urls = [...new Set([...srcs, ...guesses])];
  const found: Array<{ src: string; status: number; hits: string[] }> = [];
  for (const src of urls) {
    const url = src.startsWith("http") ? src : `${portal}${src.startsWith("/") ? "" : "/"}${src}`;
    try {
      const res = await fetch(url);
      const text = res.ok ? await res.text() : "";
      const hits = res.ok
        ? [...new Set([...text.matchAll(/['"](\/?[a-zA-Z0-9_\-./]*(?:chat|message|inbox|conversation|history)[a-zA-Z0-9_\-./]*)['"]/gi)].map((m) => m[1]))].slice(0, 40)
        : [];
      if (res.ok && hits.length) found.push({ src, status: res.status, hits });
      else if (!res.ok && guesses.includes(src.split("?")[0])) found.push({ src, status: res.status, hits: [] });
    } catch (err) {
      found.push({ src, status: 0, hits: [err instanceof Error ? err.message : "fail"] });
    }
  }
  console.log(JSON.stringify({ portalJs: { scriptSrcs: srcs, found } }));
}

function cookieHeader(res: Response, prev = ""): string {
  const setCookie = res.headers.getSetCookie?.() ?? [];
  const parts = new Map<string, string>();
  for (const piece of prev.split(";").map((s) => s.trim()).filter(Boolean)) {
    const eq = piece.indexOf("=");
    if (eq > 0) parts.set(piece.slice(0, eq), piece);
  }
  for (const c of setCookie) {
    const pair = c.split(";")[0];
    const eq = pair.indexOf("=");
    if (eq > 0) parts.set(pair.slice(0, eq), pair);
  }
  return [...parts.values()].join("; ");
}

async function tryPortalChat() {
  const username = process.env.AQUA_WHATSAPP_USERNAME?.trim() ?? "";
  const password = process.env.AQUA_WHATSAPP_PASSWORD?.trim() ?? "";
  const portal = "https://verified.aquasms.com";
  const loginPage = await fetch(`${portal}/login`, { redirect: "manual" });
  let cookie = cookieHeader(loginPage);
  const loginHtml = await loginPage.text();
  const csrf = (loginHtml.match(/name=["']_token["'][^>]*value=["']([^"']+)["']/i)
    ?? loginHtml.match(/value=["']([^"']+)["'][^>]*name=["']_token["']/i))?.[1] ?? "";
  const md5 = crypto.createHash("md5").update(password, "utf8").digest("hex");
  const hashed = crypto.createHash("sha1").update(`1433538588${md5}`, "utf8").digest("hex");
  const form = new URLSearchParams();
  form.set("inputEmailAddress", username);
  form.set("inputPassword", hashed);
  if (csrf) form.set("_token", csrf);
  const loginRes = await fetch(`${portal}/authenticate`, {
    method: "POST",
    redirect: "manual",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookie,
      Referer: `${portal}/login`,
      Origin: portal,
    },
    body: form.toString(),
  });
  cookie = cookieHeader(loginRes, cookie);
  const location = loginRes.headers.get("location") ?? "";
  console.log(JSON.stringify({ loginStatus: loginRes.status, location: location.replace(/https?:\/\/[^/]+/, ""), locked: false }));
  if (location.includes("/login")) {
    const again = await fetch(`${portal}/login`, { headers: { Cookie: cookie } });
    const html = await again.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const button = html.match(/<button[\s\S]{0,400}<\/button>/i)?.[0]?.replace(/\s+/g, " ").slice(0, 400) ?? "";
    console.log(JSON.stringify({
      loginText: text.slice(0, 600),
      button,
    }));
    return;
  }

  const page = await fetch(`${portal}/chat-log`, { headers: { Cookie: cookie }, redirect: "follow" });
  const html = await page.text();
  const names = [...new Set([...html.matchAll(/name=["']([^"']+)["']/gi)].map((m) => m[1]))];
  const title = html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? "";
  const wabaOptions = [...html.matchAll(/<option[^>]*value=["']([^"']*)["'][^>]*>([^<]*)</gi)]
    .map((m) => ({ valueLen: m[1].length, label: m[2].replace(/\d/g, "#").slice(0, 40) }))
    .slice(0, 15);
  console.log(JSON.stringify({
    chatLogPage: { status: page.status, url: page.url.replace(portal, ""), title: title.slice(0, 80), names: names.slice(0, 40), wabaOptions },
  }));
}

async function readLoginJs() {
  loadEnvFile(".env", false);
  loadEnvFile(".env.local", true);
  await tryPortalChat();
  return;
  const names = [
    "api-report-master",
    "whatsapp-account-master",
    "whatsapp-template",
    "campaign",
    "message-report",
    "delivery-report",
    "whatsapp-chatbot",
    "chatbot",
    "live-agent",
    "liveagent",
    "agent-chat",
    "user-inbox",
    "incoming-chat",
    "wa-inbox",
    "conversation-report",
    "whatsapp-session",
    "two-way-chat",
    "interactive-message",
    "whatsapp-message",
    "chat-master",
    "inbox-master",
    "whatsapp-inbox-master",
    "live-chat-master",
    "customer-chat",
    "wa-chat-master",
    "session-message",
    "optin-master",
    "dlr-report",
    "whatsapp-dlr",
    "report-master",
    "webhook-log",
    "incoming-message",
    "outgoing-message",
    "whatsapp-log",
    "chat-log",
    "conversation-master",
    "whatsapp-conversation",
    "bot-session",
    "chatbot-log",
    "whatsapp-bot",
  ];
  const hits: Array<{ name: string; status: number; urls?: string[] }> = [];
  for (const name of names) {
    const url = `https://verified.aquasms.com/assets/js/${name}/${name}.js`;
    const res = await fetch(url);
    if (!res.ok) {
      hits.push({ name, status: res.status });
      continue;
    }
    const js = await res.text();
    const urls = [...new Set([...js.matchAll(/['"](\/[a-zA-Z0-9_\-/.?=&%]+)['"]/g)].map((m) => m[1]))].slice(0, 30);
    hits.push({ name, status: res.status, urls });
  }
  console.log(JSON.stringify({ jsHits: hits.filter((h) => h.status === 200) }));
  console.log(JSON.stringify({ missing: hits.filter((h) => h.status !== 200).map((h) => h.name) }));
}

async function main() {
  await readLoginJs();
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
