import * as fs from "fs";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
function parseCsv(file: string): string[][] {
  if (!fs.existsSync(file)) return [];
  const text = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
  const rows: string[][] = []; let cur = "", row: string[] = [], inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) { if (ch === '"' && text[i+1] === '"') { cur += '"'; i++; } else if (ch === '"') inQ = false; else cur += ch; }
    else if (ch === '"') inQ = true;
    else if (ch === ",") { row.push(cur); cur = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i+1] === "\n") i++; row.push(cur); cur = ""; if (row.some((c) => c !== "")) rows.push(row); row = []; }
    else cur += ch;
  }
  return rows;
}
const norm = (p: string) => {
  const d = String(p || "").replace(/\D/g, "");
  return d.length === 12 && d.startsWith("91") ? d.slice(2) : d.length === 11 && d.startsWith("0") ? d.slice(1) : d;
};
async function main() {
  // Already-sent phones (all real blasts) + unsubscribed → permanent exclusions.
  const sent = new Set<string>();
  const unsub = new Set<string>();
  for (const f of ["location_ask_blast_results.csv", "generic_location_ask_results.csv", "generic_location_ask2_results.csv", "baddata_notasked7_results.csv"]) {
    const rows = parseCsv(`exports/${f}`);
    const h = rows[0] || [];
    const pi = h.indexOf("phone"), si = h.indexOf("status"), ri = h.indexOf("rawStatus");
    for (const r of rows.slice(1)) {
      const p = norm(r[pi]);
      if (p.length !== 10) continue;
      if (/unsub/i.test(`${r[si] || ""} ${r[ri] || ""}`)) unsub.add(p);
      if (/^sent$/i.test(r[si] || "")) sent.add(p);
    }
  }
  const status = parseCsv("exports/location_ask_status.csv");
  const sh = status[0], spi = sh.indexOf("phone10digit"), sai = sh.indexOf("askedStatus"), sni = sh.indexOf("note");
  for (const r of status.slice(1)) {
    const p = norm(r[spi]);
    if (p.length !== 10) continue;
    if (r[sai] === "unsendable" && /unsub/i.test(r[sni] || "")) unsub.add(p);
    if (r[sai] !== "not-asked" && r[sai] !== "unsendable") sent.add(p);
  }

  type T = { phone: string; name: string; city: string; source: string };
  const map = new Map<string, T>();
  const add = (phone: string, name: string, city: string, source: string) => {
    if (phone.length !== 10 || sent.has(phone) || unsub.has(phone)) return;
    if (!map.has(phone)) map.set(phone, { phone, name: name || `Tutor ${phone}`, city, source });
  };

  // A) the 153 actionable (never asked / old-unsendable with phone)
  const reask = parseCsv("exports/location_reask_candidates_2026-11-18.csv");
  const rh = reask[0], rpi = rh.indexOf("phone"), rni = rh.indexOf("name"), rci = rh.indexOf("city");
  for (const r of reask.slice(1)) add(norm(r[rpi]), r[rni] || "", r[rci] || "", "reask-153");

  // B) excluded tutors with a usable phone (junk name / demo / inactive / missing-phone rows)
  const dq = parseCsv("exports/data_quality_report_2026-11-18.csv");
  const dh = dq[0], dpi = dh.indexOf("phone"), dxi = dh.indexOf("exclusionReason"), dni = dh.indexOf("name"), dci = dh.indexOf("city");
  const excludedPhones = dq.slice(1).filter((r) => r[dxi] && r[dxi] !== "unsubscribed").map((r) => norm(r[dpi]));
  for (const p of [...new Set(excludedPhones)]) {
    const u = await prisma.user.findFirst({
      where: { phone: { in: [p, `91${p}`] }, role: "TUTOR" },
      select: { name: true, phone: true, tutorProfile: { select: { city: true } } },
    });
    if (!u) continue;
    const d = norm(u.phone);
    if (d.length !== 10) continue;
    add(d, u.name || "", u.tutorProfile?.city || "", "excluded-with-phone");
  }

  const bySource: Record<string, number> = {};
  for (const t of map.values()) bySource[t.source] = (bySource[t.source] || 0) + 1;
  const rows = [...map.values()].map((t) => {
    const city = (t.city || "").trim();
    const ncr = /delhi|noida|gurgaon|gurugram|ghaziabad|faridabad|loni/i.test(city) ? "NCR" : "OTHER";
    return [t.name, t.phone, city || "Unknown", ncr, t.source];
  });
  const file = "exports/final_location_ask_recipients.csv";
  fs.writeFileSync(file, "\uFEFF" + ["name,phone,cityGroup,ncrFlag,source", ...rows.map((r) => r.map(esc).join(","))].join("\r\n"), "utf8");
  console.log(`final recipients=${rows.length} · by source=${JSON.stringify(bySource)}`);
  console.log(`excluded (already sent or unsub)=${sent.size} sent-phones, ${unsub.size} unsub-phones`);
  console.log(`placeholder names=${rows.filter((r) => /^Tutor \d+$/.test(r[0])).length}`);
  console.log(file);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
