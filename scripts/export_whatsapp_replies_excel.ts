/**
 * Export everyone who replied on WhatsApp (INBOUND in whatsapp_chat_messages).
 *
 *   npx tsx scripts/export_whatsapp_replies_excel.ts
 *
 * Output: scratch/whatsapp_replies_<timestamp>.xlsx
 */

import * as fs from "fs";
import * as path from "path";
import { prisma } from "../lib/prisma";
import { isPositiveInterest } from "../lib/whatsapp-interest-sync";

const EXPLICIT_OPT_OUT_PATTERNS = [
  /\bnot interested\b/i,
  /\bno need\b/i,
  /\bstop\b/i,
  /\bdon't message\b/i,
  /\bdont message\b/i,
  /\bunsubscribe\b/i,
  /\bwrong number\b/i,
  /^no$/i,
  /^nahi$/i,
  /^nahin$/i,
];

function isOptOut(text: string): boolean {
  const t = (text || "").trim();
  for (const p of EXPLICIT_OPT_OUT_PATTERNS) {
    if (p.test(t)) return true;
  }
  return false;
}

function classifyReply(body: string): "Interested" | "Opt-out" | "Other reply" {
  if (isOptOut(body)) return "Opt-out";
  if (isPositiveInterest(body)) return "Interested";
  return "Other reply";
}

function phone10(phone: string): string {
  const d = phone.replace(/\D/g, "");
  return d.length >= 10 ? d.slice(-10) : d;
}

type InboundRow = {
  phone: string;
  contactName: string | null;
  inboundCount: bigint;
  firstReplyAt: Date;
  lastReplyAt: Date;
  latestReply: string;
  firstReply: string;
};

async function main() {
  const rows = await prisma.$queryRaw<InboundRow[]>`
    SELECT
      phone,
      MAX("contactName") AS "contactName",
      COUNT(*)::bigint AS "inboundCount",
      MIN("createdAt") AS "firstReplyAt",
      MAX("createdAt") AS "lastReplyAt",
      (
        SELECT body FROM whatsapp_chat_messages w2
        WHERE w2.phone = w1.phone AND w2.direction = 'INBOUND'
        ORDER BY w2."createdAt" DESC LIMIT 1
      ) AS "latestReply",
      (
        SELECT body FROM whatsapp_chat_messages w2
        WHERE w2.phone = w1.phone AND w2.direction = 'INBOUND'
        ORDER BY w2."createdAt" ASC LIMIT 1
      ) AS "firstReply"
    FROM whatsapp_chat_messages w1
    WHERE direction = 'INBOUND'
    GROUP BY phone
    ORDER BY MAX("createdAt") DESC
  `;

  const phones = rows.map((r) => r.phone);
  const phones10 = [...new Set(rows.map((r) => phone10(r.phone)).filter(Boolean))];

  const staffLeads = await prisma.staffLead.findMany({
    where: {
      OR: [
        { phone: { in: phones } },
        { whatsapp: { in: phones } },
      ],
    },
    select: {
      id: true,
      name: true,
      phone: true,
      whatsapp: true,
      email: true,
      location: true,
      status: true,
      subjects: true,
      classes: true,
      staffNotes: true,
      batch: { select: { name: true } },
    },
  });

  const staffByPhone = new Map<string, (typeof staffLeads)[0]>();
  for (const s of staffLeads) {
    if (s.phone) {
      staffByPhone.set(s.phone, s);
      staffByPhone.set(phone10(s.phone), s);
    }
    if (s.whatsapp) {
      staffByPhone.set(s.whatsapp, s);
      staffByPhone.set(phone10(s.whatsapp), s);
    }
  }

  const users = await prisma.user.findMany({
    where: {
      OR: [{ phone: { in: phones } }, { phone: { in: phones10 } }],
    },
    select: { name: true, phone: true, email: true, role: true, signupSource: true },
  });
  const userByPhone = new Map<string, (typeof users)[0]>();
  for (const u of users) {
    if (u.phone) {
      userByPhone.set(u.phone, u);
      userByPhone.set(phone10(u.phone), u);
    }
  }

  const sheetRows = rows.map((r, idx) => {
    const p10 = phone10(r.phone);
    const staff = staffByPhone.get(r.phone) || staffByPhone.get(p10);
    const user = userByPhone.get(r.phone) || userByPhone.get(p10);
    const latest = r.latestReply || "";
    return {
      "#": idx + 1,
      Phone: r.phone,
      "Phone (10 digit)": p10,
      "WhatsApp name": r.contactName || staff?.name || user?.name || "",
      "CRM name": staff?.name || "",
      "User account name": user?.name || "",
      "User role": user?.role || "",
      "StaffLead status": staff?.status || "",
      "Lead batch": staff?.batch?.name || "",
      Location: staff?.location || "",
      Email: staff?.email || user?.email || "",
      Subjects: (staff?.subjects || []).join(", "),
      Classes: (staff?.classes || []).join(", "),
      "Reply category": classifyReply(latest),
      "Inbound message count": Number(r.inboundCount),
      "First reply at (IST)": formatIst(r.firstReplyAt),
      "Last reply at (IST)": formatIst(r.lastReplyAt),
      "First reply text": (r.firstReply || "").slice(0, 500),
      "Latest reply text": latest.slice(0, 500),
      "Staff notes (snippet)": (staff?.staffNotes || "").slice(0, 300),
    };
  });

  const interested = sheetRows.filter((r) => r["Reply category"] === "Interested").length;
  const optOut = sheetRows.filter((r) => r["Reply category"] === "Opt-out").length;
  const other = sheetRows.length - interested - optOut;

  const summaryRows = [
    { Metric: "Total unique WhatsApp repliers (INBOUND)", Value: sheetRows.length },
    { Metric: "Classified as Interested (latest reply)", Value: interested },
    { Metric: "Classified as Opt-out (latest reply)", Value: optOut },
    { Metric: "Other replies (latest reply)", Value: other },
    { Metric: "With StaffLead record", Value: sheetRows.filter((r) => r["StaffLead status"]).length },
    { Metric: "StaffLead status = INTERESTED", Value: sheetRows.filter((r) => r["StaffLead status"] === "INTERESTED").length },
    { Metric: "Exported at (IST)", Value: formatIst(new Date()) },
  ];

  const outDir = path.join(process.cwd(), "scratch");
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outPath = path.join(outDir, `whatsapp_replies_${stamp}.xlsx`);

  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), "Summary");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheetRows), "WhatsApp repliers");
  XLSX.writeFile(wb, outPath);

  console.log(JSON.stringify({ file: outPath, totalRepliers: sheetRows.length, interested, optOut, other }, null, 2));
}

function formatIst(d: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
