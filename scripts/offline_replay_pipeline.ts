/**
 * OFFLINE REPLAY — run the new pipeline over every INBOUND message in the
 * WhatsApp export. No Gemini, no DB, no sends. Writes only a JSON report file.
 *
 * Run: node node_modules/tsx/dist/cli.mjs scripts/offline_replay_pipeline.ts
 */
import * as fs from "fs";
import { evaluatePrefilter } from "../lib/whatsapp-bot/pipeline/prefilter";
import { classify } from "../lib/whatsapp-bot/pipeline/classifier";
import { applySaveGate, type ProfileStore, type ProfileSnapshot, type ProfileFields } from "../lib/whatsapp-bot/pipeline/save-gate";
import { computeMissing } from "../lib/whatsapp-bot/pipeline/context";
import { decide } from "../lib/whatsapp-bot/pipeline/decide";
import type { Classification } from "../lib/whatsapp-bot/pipeline/classifier";

const SRC = "exports/whatsapp_all_chats_2026-11-26.json";
const OUT = "exports/offline_replay_report.json";

type Msg = { atUTC: string; direction: string; body: string; from?: string; messageId?: string | null; step?: string | null };

const OUTBOUND_TEMPLATE_RE = /^(?:\[(?:Tuition Enquiry|Photo|Document)|Welcome to \*ApnaTutorHub|Namaste! Aapki tuition enquiry|Requirement #|Hi! I'm Priya)/i;

function fakeStore(initial: ProfileSnapshot) {
  const state = { snapshot: initial, updates: [] as ProfileFields[], rejects: [] as Array<{ field: string; input: string; reason: string }> };
  const store: ProfileStore = {
    snapshot: async () => state.snapshot,
    update: async (f) => { state.updates.push(f); state.snapshot = { ...state.snapshot, ...f }; },
    logReject: async (e) => { state.rejects.push({ field: e.field, input: e.input, reason: e.reason }); },
  };
  return { store, state };
}

async function main() {
  const data = JSON.parse(fs.readFileSync(SRC, "utf8")) as {
    exportInfo: { totalMessages: number; totalUsers: number; totalInbound: number };
    users: Array<{ phone: string; linkedUser?: {
      name?: string | null; email?: string | null;
      tutorProfile?: { subjects?: string[]; classLevels?: string[]; address?: string | null; city?: string | null };
    } | null; messages: Msg[] }>;
  };

  const decisions = { REPLY: 0, SILENT: 0 };
  const reasons: Record<string, number> = {};
  const silenceTexts: Record<string, Record<string, number>> = {};
  const intents: Record<string, number> = {};
  const samples: Array<{ phone: string; at: string; userMessage: string; pendingQuestion: string | null; newReply: string }> = [];
  const optedOutPhones = new Set<string>();
  const piiHits: Array<{ phone: string; at: string; kind: string; reply: string }> = [];
  let skippedRows = 0;
  const examples: Record<string, unknown[]> = {
    silent: [], reply: [], stopped: [], reactions: [], autoReply: [], stuckAtEmail: [], mathsSaves: [], noDecision: [], affirmative: [],
  };
  const savedEntries: string[] = [];
  let inboundCount = 0;
  let legacyDiff = 0;
  const diffs: unknown[] = [];

  for (const user of data.users) {
    const msgs = [...user.messages].sort((a, b) => a.atUTC.localeCompare(b.atUTC));
    const profile: ProfileSnapshot = {
      name: user.linkedUser?.name ?? null,
      email: user.linkedUser?.email ?? null,
      area: user.linkedUser?.tutorProfile?.address ?? null,
      city: user.linkedUser?.tutorProfile?.city ?? null,
      subjects: user.linkedUser?.tutorProfile?.subjects ?? [],
      classLevels: user.linkedUser?.tutorProfile?.classLevels ?? [],
    };
    const { store, state } = fakeStore(profile);
    const seenIds = new Set<string>();
    const recentTexts: Array<{ text: string; at: string }> = [];
    let pendingField: string | undefined;
    let pendingQuestion: string | null = null;
    let askCount = 0;
    let askedAt: Date | null = null;

    for (let i = 0; i < msgs.length; i += 1) {
      const msg = msgs[i];
      if (msg.direction === "OUTBOUND") {
        recentTexts.push({ text: (msg.body ?? "").trim().toLowerCase(), at: msg.atUTC });
        continue;
      }
      const text = msg.body ?? "";
      if (msg.step === "AQUA_BACKFILL" || OUTBOUND_TEMPLATE_RE.test(text.trim())) {
        skippedRows += 1;
        continue;
      }
      inboundCount += 1;
      const pre = evaluatePrefilter({
        text, messageId: msg.messageId ?? null, seenMessageIds: seenIds, recentTexts,
        now: new Date(msg.atUTC), hasPendingQuestion: Boolean(pendingQuestion),
        alreadyUnsubscribed: optedOutPhones.has(user.phone),
      });
      if (pre.unsubscribed) optedOutPhones.add(user.phone);
      if (msg.messageId) seenIds.add(msg.messageId);
      recentTexts.push({ text: text.trim().toLowerCase(), at: msg.atUTC });
      reasons[pre.reason ?? "none"] = (reasons[pre.reason ?? "none"] ?? 0) + 1;

      if (pre.decision === "SILENT") {
        decisions.SILENT += 1;
        const rk = pre.reason ?? "none";
        silenceTexts[rk] ??= {};
        const key = text.trim().slice(0, 120) || "(empty)";
        silenceTexts[rk][key] = (silenceTexts[rk][key] ?? 0) + 1;
        const ex = { phone: user.phone, at: msg.atUTC, text: text.slice(0, 160), reason: pre.reason };
        if (pre.reason === "opt_out" && examples.stopped.length < 5) examples.stopped.push(ex);
        if (pre.reason === "reaction" && examples.reactions.length < 5) examples.reactions.push(ex);
        if ((pre.reason === "other_business_auto_reply" || pre.reason === "quoted_alert") && examples.autoReply.length < 5) examples.autoReply.push(ex);
        if (examples.silent.length < 5) examples.silent.push(ex);
        continue;
      }

      const c: Classification = await classify(text, { pendingField });
      intents[c.intent] = (intents[c.intent] ?? 0) + 1;
      const missing = computeMissing(state.snapshot);
      const gate = await applySaveGate({
        phone: user.phone,
        classification: c,
        store: fakeStore(state.snapshot).store,
        source: { step: msg.step ?? null, direction: msg.direction, senderName: msg.from ?? null, body: text },
      });
      if (gate.status === "SAVED") {
        savedEntries.push(...(gate.fields.subjects ?? []));
        if (c.extracted.classes_subjects && /\b(?:math|science|physics|chemistry|biology|9\s*(?:to|-)\s*12|10\s*(?:to|-)\s*12)\b/i.test(text) && examples.mathsSaves.length < 8) {
          examples.mathsSaves.push({ phone: user.phone, text: text.slice(0, 120), saved: gate.fields.subjects });
        }
        Object.assign(state.snapshot, gate.fields);
      } else if (gate.status === "NEEDS_CONFIRMATION") {
        pendingField = gate.field;
      }
      const d = decide({
        inbound: text,
        classification: c,
        missing,
        confirmation: gate.status === "NEEDS_CONFIRMATION" ? { field: gate.field, proposed: gate.proposed } : null,
        askCount: dAsk(), askedAt,
      });
      function dAsk() { return askCount; }
      if (d.shouldRecordAsk) {
        askCount += 1; askedAt = new Date(msg.atUTC); pendingField = d.askedField;
        pendingQuestion = d.reply.split("\n\n").at(-1) ?? null;
      }
      samples.push({
        phone: user.phone,
        at: msg.atUTC,
        userMessage: text.slice(0, 300),
        pendingQuestion,
        newReply: d.reply.slice(0, 600),
      });
      decisions.REPLY += 1;
      if (pre.reason === "affirmative" && examples.affirmative.length < 8) {
        examples.affirmative.push({ phone: user.phone, text: text.slice(0, 100), reply: d.reply.slice(0, 180) });
      }
      const pii = /(?:^|\D)(?:9[6-9]\d{9}|[6-9]\d{9})(?!\d)|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}|Tutor@123|12345678|\b\d{12}\b/i.exec(d.reply);
      if (pii && piiHits.length < 20) piiHits.push({ phone: user.phone, at: msg.atUTC, kind: pii[0].slice(0, 30), reply: d.reply.slice(0, 160) });
      if (!d.reply.trim() && examples.noDecision.length < 8) examples.noDecision.push({ phone: user.phone, at: msg.atUTC, text: text.slice(0, 120) });
      if (examples.reply.length < 8) examples.reply.push({ phone: user.phone, text: text.slice(0, 100), reply: d.reply.slice(0, 180), reason: pre.reason });

      // Legacy comparison: next outbound text actually sent after this inbound.
      const actual = msgs.slice(i + 1).find((m) => m.direction === "OUTBOUND")?.body ?? "";
      if (actual && !d.reply.trim().startsWith(actual.trim().slice(0, 20))) {
        legacyDiff += 1;
        if (diffs.length < 10) diffs.push({ phone: user.phone, inbound: text.slice(0, 100), new: d.reply.slice(0, 140), legacy: actual.slice(0, 140) });
      }
      const previousOutbound = [...msgs.slice(0, i)].reverse().find((m) => m.direction === "OUTBOUND")?.body ?? "";
      if (/email/i.test(previousOutbound) && !/[a-z0-9._%+-]+@/i.test(text) && examples.stuckAtEmail.length < 8) {
        examples.stuckAtEmail.push({ phone: user.phone, text: text.slice(0, 120) });
      }
    }
  }

  // Loop detection from outbound messages.
  const outboundByPhone = new Map<string, Map<string, number>>();
  for (const u of data.users) {
    const counts = new Map<string, number>();
    for (const m of u.messages) {
      if (m.direction !== "OUTBOUND") continue;
      const key = (m.body ?? "").trim().slice(0, 120);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    outboundByPhone.set(u.phone, counts);
  }
  const loops: Array<{ phone: string; count: number; text: string }> = [];
  for (const [phone, counts] of outboundByPhone) {
    for (const [text, count] of counts) if (count >= 20) loops.push({ phone, count, text });
  }
  loops.sort((a, b) => b.count - a.count);
  const welcome207 = loops.filter((l) => /welcome|namaste|hello|hi!/i.test(l.text)).slice(0, 10);
  const loop2837 = loops.filter((l) => l.phone.includes("2837")).slice(0, 10);

  const topSilenceTexts: Record<string, Array<{ text: string; count: number }>> = {};
  for (const [reason, texts] of Object.entries(silenceTexts)) {
    topSilenceTexts[reason] = Object.entries(texts)
      .map(([text, count]) => ({ text, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    source: SRC,
    inboundReplayed: inboundCount,
    skippedRows,
    decisions,
    reasons,
    topSilenceTexts,
    intents,
    legacyDiff,
    savedClassSubjectEntries: savedEntries.length,
    piiHits,
    loops: loops.slice(0, 20),
    welcome207,
    loop2837,
    examples,
    legacyDiffExamples: diffs,
  };
  fs.mkdirSync("exports", { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2), "utf8");

  // Readable 100-sample review file.
  const step = Math.max(1, Math.floor(samples.length / 100));
  const sample100 = samples.filter((_, idx) => idx % step === 0).slice(0, 100);
  const md = [
    "# Offline replay — sample new replies",
    "",
    `Generated ${new Date().toISOString()} · ${sample100.length} samples · deterministic fallback (no Gemini/Maps)`,
    "",
    ...sample100.flatMap((s, i) => [
      `## ${i + 1}. ${s.phone} · ${s.at}`,
      `**User:** ${JSON.stringify(s.userMessage)}`,
      `**Pending question:** ${s.pendingQuestion ? JSON.stringify(s.pendingQuestion) : "none"}`,
      `**New reply:**`,
      "",
      s.newReply,
      "",
    ]),
  ].join("\n");
  fs.writeFileSync("exports/offline_replay_sample_replies.md", md, "utf8");

  console.log(JSON.stringify({
    inboundReplayed: inboundCount,
    skippedRows,
    decisions,
    topReasons: Object.entries(reasons).sort((a, b) => b[1] - a[1]).slice(0, 8),
    topIntents: Object.entries(intents).sort((a, b) => b[1] - a[1]).slice(0, 8),
    legacyDiff,
    topSilenceTexts: Object.fromEntries(Object.entries(topSilenceTexts).map(([k, v]) => [k, v.slice(0, 5)])),
    savedClassSubjectEntries: savedEntries.length,
    topLoop: loops[0],
    welcome207: welcome207.slice(0, 3),
    loop2837: loop2837.slice(0, 3),
    stuckAtEmailExamples: examples.stuckAtEmail.length,
    noDecisionExamples: examples.noDecision.length,
  }, null, 2));
  console.log("wrote", OUT);
}

main().catch((e) => { console.error(e); process.exit(1); });
