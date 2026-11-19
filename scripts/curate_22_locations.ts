/**
 * Curated fixes from full chat reading of the 22 "location given" tutors.
 * Explicit, non-generic sublocality per tutor. Dry by default.
 */
import * as fs from "fs";
import { PrismaClient } from "@prisma/client";
import { resolveLocationCoordinates } from "../lib/geocoding";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

type Fix = { phone: string; address?: string; city?: string; geoQuery?: string };
const fixes: Fix[] = [
  { phone: "6387992215", geoQuery: "Vijay Nagar, Indore" },
  { phone: "7397511755", geoQuery: "Madurai" },                       // city only in chat — no sublocality available
  { phone: "9588820166", geoQuery: "Nelamangala, Bangalore" },
  { phone: "9473526441", geoQuery: "Rohini, Delhi" },                 // Tripti: address already right, coords missing
  { phone: "8178338373" },                                            // no sublocality in chat ("all sectors")
  { phone: "9871497880", address: "Abul Fazal Enclave, Jamia Nagar Okhla", city: "Delhi", geoQuery: "Abul Fazal Enclave, Jamia Nagar Okhla" },
  { phone: "8178058701", address: "Lohegaon, Viman Nagar", city: "Pune", geoQuery: "Viman Nagar, Pune" },
  { phone: "7073219934", geoQuery: "Raja Park, Jaipur" },
  { phone: "9336774471", geoQuery: "Indira Nagar, Lucknow" },
  { phone: "6307027794", address: "Kanpur Nagar", city: "Kanpur", geoQuery: "Kanpur Nagar" },
  { phone: "9569937320", address: "Campbell Road, Lucknow", city: "Lucknow", geoQuery: "Campbell Road, Lucknow" },
  { phone: "9380663171", address: "Banashankari 2nd Stage", city: "Bangalore", geoQuery: "Banashankari 2nd Stage, Bangalore" },
  { phone: "9555099554", city: "Delhi", geoQuery: "Laxminagar, Delhi" },
  { phone: "8851745301", geoQuery: "Badarpur, Delhi" },
  { phone: "9554241525", geoQuery: "Sector 49, Noida" },
  { phone: "8851304013", geoQuery: "Freedom Fighter Colony, Saket" },
  { phone: "7678572299", geoQuery: "Mayur Vihar, Noida" },
  { phone: "8708543258", address: "Mangolpuri", city: "Delhi", geoQuery: "Mangolpuri, Delhi" },
  { phone: "8743801358", geoQuery: "Model Town, Delhi" },
  { phone: "9716708312", geoQuery: "Paschim Vihar, Delhi" },
  { phone: "9811981907", address: "Ramprastha Colony, Surya Nagar", city: "Ghaziabad", geoQuery: "Ramprastha Colony, Surya Nagar, Ghaziabad" },
  { phone: "9555065245", geoQuery: "Sector 12, Noida" },
];

const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;

async function main() {
  const out: string[][] = [];
  let changed = 0;
  for (const f of fixes) {
    const u = await prisma.user.findFirst({
      where: { phone: { in: [f.phone, `91${f.phone}`] }, role: "TUTOR" },
      include: { tutorProfile: true },
    });
    const p = u?.tutorProfile;
    if (!p) { console.log(`SKIP ${f.phone}: no tutor profile`); continue; }
    const oldAddr = (p.address || "").trim();
    const oldCity = (p.city || "").trim();
    const newAddr = f.address || oldAddr;
    const newCity = f.city || oldCity;
    const patch: { address?: string; city?: string; latitude?: number; longitude?: number } = {};
    if (newAddr.toLowerCase() !== oldAddr.toLowerCase()) patch.address = newAddr;
    if (newCity.toLowerCase() !== oldCity.toLowerCase()) patch.city = newCity;
    // Address/city change can make old coords point to the wrong city
    // (e.g. Shafiullah had Kanpur coords but actually lives in Delhi).
    const needCoords = Boolean(patch.address || patch.city) || p.latitude == null || p.longitude == null ||
      (Math.abs(p.latitude - 28.5355) < 0.02 && Math.abs(p.longitude - 77.2410) < 0.02);
    if (needCoords && f.geoQuery) {
      const geo = resolveLocationCoordinates(f.geoQuery);
      if (geo) { patch.latitude = geo.lat; patch.longitude = geo.lng; }
    }
    if (!Object.keys(patch).length) { console.log(`~ ${u?.name || ""} (${f.phone}): already fine`); continue; }
    changed++;
    console.log(`✓ ${u?.name || ""} (${f.phone}): "${oldAddr}" [${oldCity}] → "${newAddr}" [${newCity}]${patch.latitude ? ` @${patch.latitude},${patch.longitude}` : ""}`);
    if (APPLY) await prisma.tutorProfile.update({ where: { id: p.id }, data: patch });
    out.push([String(u?.id || ""), String(u?.name || ""), f.phone, oldAddr, oldCity, newAddr, newCity, String(patch.latitude ?? ""), String(patch.longitude ?? "")]);
  }
  const date = new Date().toISOString().slice(0, 10);
  const file = `exports/chat_location_curated_${date}.csv`;
  fs.writeFileSync(file, "\uFEFF" + [
    ["userId", "name", "phone", "oldAddress", "oldCity", "newAddress", "newCity", "lat", "lng"].join(","),
    ...out.map((r) => r.map(esc).join(",")),
  ].join("\r\n"), "utf8");
  console.log(`\n=== ${APPLY ? "applied" : "would update"}: ${changed} · ${file} ===`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
