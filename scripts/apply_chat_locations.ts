/**
 * Apply the locations tutors actually stated in WhatsApp chat (from
 * chat_location_forensics.csv + post-ask replies). DRY by default.
 *   npx tsx --env-file=.env scripts/apply_chat_locations.ts --dry
 *   npx tsx --env-file=.env scripts/apply_chat_locations.ts --apply
 * Out: exports/chat_location_applied_YYYY-MM-DD.csv
 */
import * as fs from "fs";
import { PrismaClient } from "@prisma/client";
import { validateAndCleanLocality } from "../lib/whatsapp-bot/subject-rules";
import { resolveLocationCoordinates } from "../lib/geocoding";
import { geocodeAddressWithGemini } from "../lib/gemini-geocoder";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const NCR = /^(delhi|noida|greater noida|gurgaon|gurugram|ghaziabad|faridabad|loni)$/i;

function parseCsv(file: string): string[][] {
  const text = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
  const rows: string[][] = []; let cur = "", row: string[] = [], inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) { if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') inQ = false; else cur += ch; }
    else if (ch === '"') inQ = true;
    else if (ch === ",") { row.push(cur); cur = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cur); cur = ""; if (row.some((c) => c !== "")) rows.push(row); row = []; }
    else cur += ch;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}
const norm = (p: string) => {
  const d = String(p || "").replace(/\D/g, "");
  return d.length === 12 && d.startsWith("91") ? d.slice(2) : d.length === 11 && d.startsWith("0") ? d.slice(1) : d;
};
const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
function cleanArea(a: string): string {
  return String(a || "").trim().replace(/^[/&,\-–—\s]+/, "").replace(/\s+(?:and\s+near\s+by|near\s+by|ki\s+h|and\s+adjoining\s+area)$/i, "").replace(/[\s,&]+$/, "").trim();
}
function areaQuality(area: string, raw: string): boolean {
  const a = area.toLowerCase().trim();
  if (a.length < 4 || a === "nagar") return false;
  if (/^(i am|my name|swarna|satyam anand)/.test(a)) return false;
  if (/all sector|and near by|adjoining|^near\b|subject|class|unable|only in|too far|^which\b/i.test(a)) return false;
  if (/^\d+$/.test(a)) return false;
  return Boolean(raw);
}

async function main() {
  const rows = parseCsv("exports/chat_location_forensics_2026-11-18.csv");
  const h = rows[0];
  const ix = (n: string) => h.indexOf(n);
  const candidates = new Map<string, { latest: string; city: string }>();
  for (const r of rows.slice(1)) {
    const latest = (r[ix("latestLocationInChat")] || "").trim();
    if (latest) candidates.set(norm(r[ix("phone")]), { latest, city: (r[ix("currentCity")] || "").trim() });
  }
  // Post-ask replies the forensic parser missed.
  candidates.set("9818541405", { latest: "Roop Nagar, Delhi", city: "Delhi" });

  const out: string[][] = [];
  let applied = 0, skipped = 0;
  for (const [phone, cand] of candidates) {
    const u = await prisma.user.findFirst({ where: { phone: { in: [phone, `91${phone}`] } }, include: { tutorProfile: true } });
    const p = u?.tutorProfile;
    if (!p) { skipped++; continue; }
    const v = validateAndCleanLocality(cand.latest, cand.city || undefined || undefined, true);
    if (!v.isValid) { skipped++; continue; }
    const area = cleanArea(v.area);
    if (!areaQuality(area, cand.latest)) { skipped++; continue; }
    let city = String(v.city || "").trim();
    if (!city || !NCR.test(city)) {
      const oldCity = (p.city || "").trim();
      city = NCR.test(oldCity) ? oldCity : city;
    }
    const patch: { address?: string; city?: string; latitude?: number; longitude?: number } = {};
    if (area.toLowerCase() !== (p.address || "").trim().toLowerCase()) patch.address = area;
    if (city && city.toLowerCase() !== (p.city || "").trim().toLowerCase()) patch.city = city;

    const needCoords = p.latitude == null || p.longitude == null ||
      (Math.abs(p.latitude - 28.5355) < 0.02 && Math.abs(p.longitude - 77.2410) < 0.02);
    if (needCoords) {
      const q = `${area}${city ? `, ${city}` : ""}`;
      let geo = resolveLocationCoordinates(q);
      if (!geo) {
        try { const g = await geocodeAddressWithGemini({ address: area, city }); if (g) geo = { lat: g.lat, lng: g.lng }; } catch { /* ignore */ }
      }
      if (geo) { patch.latitude = geo.lat; patch.longitude = geo.lng; }
    }
    if (!Object.keys(patch).length) { skipped++; continue; }

    applied++;
    console.log(`✓ ${u?.name || ""} (${phone}): "${(p.address || "").trim() || "BLANK"}" [${(p.city || "").trim() || "BLANK"}] → "${area}" [${city || (p.city || "")}]${patch.latitude ? ` @${patch.latitude},${patch.longitude}` : " (coords unresolved)"}`);
    if (APPLY) await prisma.tutorProfile.update({ where: { id: p.id }, data: patch });
    out.push([String(u?.id || ""), String(u?.name || ""), phone, (p.address || "").trim(), (p.city || "").trim(), cand.latest, area, city, String(patch.latitude ?? ""), String(patch.longitude ?? "")]);
  }

  const date = new Date().toISOString().slice(0, 10);
  const file = `exports/chat_location_applied_${date}.csv`;
  fs.writeFileSync(file, "\uFEFF" + [
    ["userId", "name", "phone", "oldAddress", "oldCity", "chatLocation", "newAddress", "newCity", "lat", "lng"].join(","),
    ...out.map((r) => r.map(esc).join(",")),
  ].join("\r\n"), "utf8");
  console.log(`\n=== ${APPLY ? "applied" : "would update"}: ${applied} · skipped: ${skipped} · ${file} ===`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
