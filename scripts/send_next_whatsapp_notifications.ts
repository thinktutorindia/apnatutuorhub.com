/**
 * Send the prepared next-batch enquiry file on WhatsApp.
 * Uses the approved tuition_enquiry_direct template. Does not create leads.
 *
 *   npx tsx scripts/send_next_whatsapp_notifications.ts --live
 */
import * as fs from "fs";
import * as readline from "readline";
import { normalizeIndiaWhatsApp, sendAquaWhatsAppMessage } from "../lib/aqua-whatsapp";
import { prisma } from "../lib/prisma";

try {
  const localEnv = fs.readFileSync(".env.local", "utf8");
  for (const line of localEnv.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [k, ...rest] = trimmed.split("=");
    const key = k.trim();
    if (!key || process.env[key]) continue;
    process.env[key] = rest.join("=").replace(/^["']|["']$/g, "").trim();
  }
} catch {}

const SOURCE = "datauploadrawdata/next_whatsapp_notifications.csv";
const LOG = "datauploadrawdata/next_whatsapp_send_log.jsonl";

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function cleanParam(value: string): string {
  return value.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
}

type Row = {
  phone: string;
  inquiryCode: string;
  clientName: string;
  classLine: string;
  mode: string;
  location: string;
  budget: string;
  preference: string;
  body: string;
};

async function loadRows(): Promise<Row[]> {
  const rows: Row[] = [];
  const rl = readline.createInterface({
    input: fs.createReadStream(SOURCE),
    crlfDelay: Infinity,
  });
  let header = true;
  let buffer = "";
  for await (const line of rl) {
    buffer = buffer ? `${buffer}\n${line}` : line;
    if ((buffer.match(/"/g) || []).length % 2 !== 0) continue;
    const record = buffer;
    buffer = "";
    if (header) {
      header = false;
      continue;
    }
    const cols = parseCSVLine(record);
    const phone = normalizeIndiaWhatsApp(cols[2] || "");
    const message = cols[11] || "";
    const inquiryCode = message.match(/\[Tuition Enquiry #(\d+)\]/)?.[1] || "";
    const clientName = message.match(/Client:\s*(.+)/)?.[1]?.trim() || "Parent";
    const classLevel = cols[6] || "";
    const subjects = cols[7] || "All Subjects";
    const days = cols[8] || "";
    const mode = cols[9] || "Home Tuition (Offline)";
    const budget = cols[10] || "";
    const area = cols[4] || "";
    const distance = cols[5] || "";
    if (!phone || !inquiryCode) continue;
    const classLine = cleanParam(`${classLevel} (${subjects})${days ? `, ${days}` : ""}`);
    const location = cleanParam(distance ? `${area} (${distance} km)` : area);
    rows.push({
      phone,
      inquiryCode,
      clientName: cleanParam(clientName),
      classLine,
      mode: cleanParam(mode),
      location,
      budget: cleanParam(budget),
      preference: "Any (Male or Female Tutor)",
      body: `[Tuition Enquiry #${inquiryCode}]\nClient: ${clientName}\nClass: ${classLine}\nMode: ${mode}\nLocation: ${location}\nBudget: ${budget}\nPreference: Any (Male or Female Tutor)`,
    });
  }
  return rows;
}

function alreadySent(): Set<string> {
  const sent = new Set<string>();
  if (!fs.existsSync(LOG)) return sent;
  for (const line of fs.readFileSync(LOG, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const row = JSON.parse(line) as { phone?: string; ok?: boolean };
      if (row.ok && row.phone) sent.add(row.phone);
    } catch {}
  }
  return sent;
}

async function main() {
  if (!process.argv.includes("--live")) {
    console.log("Refusing to send without --live");
    process.exit(1);
  }

  const rows = await loadRows();
  const done = alreadySent();
  const pending = rows.filter((row) => !done.has(row.phone));
  console.log(`Rows in file: ${rows.length}`);
  console.log(`Already sent: ${done.size}`);
  console.log(`To send now: ${pending.length}`);

  let sent = 0;
  let failed = 0;
  const log = fs.createWriteStream(LOG, { flags: "a" });

  for (let i = 0; i < pending.length; i++) {
    const row = pending[i];
    const res = await sendAquaWhatsAppMessage({
      to: row.phone,
      mode: "template",
      templateId: "tuition_enquiry_direct",
      placeholders: [
        row.inquiryCode,
        row.clientName,
        row.classLine,
        row.mode,
        row.location,
        row.budget,
        row.preference,
      ],
      bypassDailyCap: true,
    });

    if (res.ok) {
      sent++;
      prisma.whatsappChatMessage
        .create({
          data: {
            phone: row.phone,
            direction: "OUTBOUND",
            senderName: "System Broadcast",
            body: row.body,
            step: "BROADCAST_LEAD",
            messageId: res.providerMessageId || null,
            isRead: true,
          },
        })
        .catch(() => {});
    } else {
      failed++;
      if (failed <= 5 || failed % 25 === 0) {
        console.log(`Fail ${row.phone}: ${res.error || res.rawStatus}`);
      }
    }

    log.write(`${JSON.stringify({ phone: row.phone, ok: res.ok, id: res.providerMessageId || null, error: res.ok ? undefined : res.error })}\n`);

    if (i < 8 && !res.ok && failed === i + 1) {
      console.log("Stopping: the first messages were all rejected.");
      break;
    }

    if ((i + 1) % 50 === 0 || i === pending.length - 1) {
      console.log(`Progress: ${i + 1}/${pending.length} (${sent} sent, ${failed} failed)`);
    }
    await new Promise((r) => setTimeout(r, 180));
  }

  log.end();
  console.log(`Done. Sent ${sent}, failed ${failed}.`);
  await prisma.$disconnect().catch(() => {});
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
