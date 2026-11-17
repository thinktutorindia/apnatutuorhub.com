/**
 * Location-ask blast: send the approved `tutor_location_details` template
 * (ZERO variables → placeholders []) to every tutor in
 * exports/need_location_from_tutors.csv who is still missing a usable location.
 *
 * Run: npx tsx --env-file=.env scripts/send_location_ask_blast.ts
 * Test only (first 3): npx tsx --env-file=.env scripts/send_location_ask_blast.ts --test
 */
import * as fs from "fs";
import { sendAquaWhatsAppMessage } from "../lib/aqua-whatsapp";

const TEST = process.argv.includes("--test");
const NCR_ONLY = process.argv.includes("--ncr-only");
function argAfter(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const CSV_PATH = argAfter("--csv") || "exports/need_location_from_tutors.csv";
const OUT_PATH = argAfter("--out") || "exports/location_ask_blast_results.csv";
const TEMPLATE = "tutor_location_details";
const EST_INR = 1.005; // marketing template price per message

function parseCsv(path: string): string[][] {
  const text = fs.readFileSync(path, "utf8").replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let cur = "", row: string[] = [], inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQ = false;
      else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ",") { row.push(cur); cur = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cur); cur = "";
      if (row.some((c) => c !== "")) rows.push(row);
      row = [];
    } else cur += ch;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

async function main() {
  const rows = parseCsv(CSV_PATH);
  const header = rows[0];
  const iName = header.indexOf("name");
  const iPhone = header.indexOf("phone");
  const iCity = header.indexOf("cityGroup");
  const iNcr = header.indexOf("ncrFlag");
  const dataRows = NCR_ONLY ? rows.slice(1).filter((r) => r[iNcr] === "NCR" && r[iCity] !== "Unknown") : rows.slice(1);

  // Dedupe phones (keep first occurrence)
  const seen = new Set<string>();
  const targets: { name: string; phone: string; city: string }[] = [];
  let dupes = 0;
  for (const r of dataRows) {
    const digits = String(r[iPhone] || "").replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "").replace(/^0(?=\d{10}$)/, "");
    if (digits.length !== 10) { continue; }
    if (seen.has(digits)) { dupes++; continue; }
    seen.add(digits);
    targets.push({ name: r[iName] || "", phone: digits, city: r[iCity] || "" });
  }

  const batch = TEST ? targets.slice(0, 3) : targets;
  console.log(`=== Location-ask blast (${TEMPLATE}) ${TEST ? "[TEST: first 3]" : ""} ===`);
  console.log(`Rows in CSV: ${dataRows.length} · unique valid phones: ${targets.length} · dupes skipped: ${dupes}`);
  console.log(`Sending to: ${batch.length} tutors · est cost ₹${(batch.length * EST_INR).toFixed(2)}`);

  const results: string[][] = [];
  let sent = 0, failed = 0;
  for (let i = 0; i < batch.length; i++) {
    const t = batch[i];
    try {
      const res = await sendAquaWhatsAppMessage({
        to: `91${t.phone}`,
        mode: "template",
        templateId: TEMPLATE,
        placeholders: [],
        estimatedInr: EST_INR,
        bypassDailyCap: true,
      });
      if (res.ok) sent++;
      else failed++;
      results.push([t.name, t.phone, t.city, res.ok ? "SENT" : "FAILED", res.rawStatus || "", res.error || "", res.messageId || ""]);
      console.log(`${i + 1}/${batch.length} ${res.ok ? "✓" : "✗"} ${t.name} (${t.phone})${res.error ? ` — ${res.error}` : ""}`);
    } catch (e) {
      failed++;
      results.push([t.name, t.phone, t.city, "ERROR", "", String(e).slice(0, 200), ""]);
      console.log(`${i + 1}/${batch.length} ✗ ${t.name} (${t.phone}) — ${e}`);
    }
    if (i < batch.length - 1) await new Promise((r) => setTimeout(r, 200));
  }

  const esc = (v: string) => `"${String(v || "").replace(/"/g, '""')}"`;
  const outFile = TEST ? OUT_PATH.replace(/\.csv$/, "_test.csv") : OUT_PATH;
  fs.writeFileSync(
    outFile,
    "\uFEFF" + ["name,phone,cityGroup,status,rawStatus,error,messageId", ...results.map((r) => r.map(esc).join(","))].join("\n"),
    "utf8"
  );

  console.log(`\n=== DONE: sent=${sent} failed=${failed} → ${outFile} ===`);
}

main().catch((e) => { console.error(e); process.exit(1); });
