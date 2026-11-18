/**
 * Full database → one CSV per table (read-only, no DB changes).
 * Run: npx tsx --env-file=.env scripts/export_database_csv.ts
 * Out: exports/db_full_YYYY-MM-DD/<table>.csv + _summary.txt
 */
import * as fs from "fs";
import * as path from "path";
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

function cell(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString();
  if (Buffer.isBuffer(v)) return v.toString("base64");
  if (typeof v === "object") {
    try { return JSON.stringify(v); } catch { return String(v); }
  }
  return String(v);
}
function csvCell(v: unknown): string {
  const s = cell(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function main() {
  const models: string[] = Prisma.dmmf.datamodel.models.map((m) => m.name);
  const date = new Date().toISOString().slice(0, 10);
  const dir = path.join("exports", `db_full_${date}`);
  fs.mkdirSync(dir, { recursive: true });

  const summary: string[] = [];
  let totalRows = 0;
  for (const model of models) {
    const delegate = (prisma as unknown as Record<string, { findMany: (a?: unknown) => Promise<Record<string, unknown>[]> }>)[model];
    if (!delegate?.findMany) continue;
    const rows = await delegate.findMany({});
    totalRows += rows.length;
    const cols: string[] = [];
    const seen = new Set<string>();
    for (const r of rows) for (const k of Object.keys(r)) if (!seen.has(k)) { seen.add(k); cols.push(k); }
    fs.writeFileSync(
      path.join(dir, `${model}.csv`),
      "\uFEFF" + [cols.join(","), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(","))].join("\r\n"),
      "utf8"
    );
    summary.push(`${model}: ${rows.length} rows`);
    console.log(`  ${model}: ${rows.length} rows`);
  }
  fs.writeFileSync(path.join(dir, "_summary.txt"), [
    `ApnaTutorHub — full DB export (current state) — ${new Date().toISOString()}`,
    `Tables: ${models.length} · Total rows: ${totalRows}`,
    "",
    ...summary,
  ].join("\n"), "utf8");
  console.log(`\n✓ ${models.length} CSVs in ${dir} (${totalRows} rows total)`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
