/**
 * CLI wrapper for the 5 km geo-lead broadcast.
 *
 *   npx tsx scripts/broadcast_geo_leads.ts --dry-run
 *   npx tsx scripts/broadcast_geo_leads.ts --live
 *   npx tsx scripts/broadcast_geo_leads.ts --in-app-only
 */

import * as fs from "fs";
import { prisma } from "../lib/prisma";
import { runGeoLeadBroadcast, type GeoBroadcastMode } from "../lib/geo-lead-broadcast";

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

const mode: GeoBroadcastMode | null = process.argv.includes("--dry-run")
  ? "dry-run"
  : process.argv.includes("--in-app-only")
    ? "in-app-only"
    : process.argv.includes("--live")
      ? "live"
      : null;

if (!mode) {
  console.log("Please specify --dry-run, --live, or --in-app-only.");
  process.exit(1);
}

runGeoLeadBroadcast(mode)
  .catch((e) => {
    console.error("Fatal error during broadcast:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
