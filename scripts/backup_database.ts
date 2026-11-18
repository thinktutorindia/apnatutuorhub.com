/**
 * FULL DATABASE BACKUP — dumps every Prisma model to one JSON file.
 * Run: npx tsx --env-file=.env scripts/backup_database.ts
 * Out: exports/db_backup_YYYY-MM-DD.json (+ .info.txt summary)
 */
import * as fs from "fs";
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const models = Prisma.dmmf.datamodel.models.map((m) => m.name);
  const backup: Record<string, unknown[]> = {};
  const summary: string[] = [];
  let totalRows = 0;

  for (const model of models) {
    const delegate = (prisma as unknown as Record<string, { findMany: (a?: unknown) => Promise<unknown[]> }>)[model];
    if (!delegate?.findMany) continue;
    const rows = await delegate.findMany({});
    backup[model] = rows;
    totalRows += rows.length;
    summary.push(`${model}: ${rows.length}`);
    console.log(`  ${model}: ${rows.length} rows`);
  }

  const date = new Date().toISOString().slice(0, 10);
  const file = `exports/db_backup_${date}.json`;
  fs.writeFileSync(file, JSON.stringify(backup), "utf8");
  fs.writeFileSync(`exports/db_backup_${date}.info.txt`, [
    `ApnaTutorHub DB backup — ${new Date().toISOString()}`,
    `Tables: ${models.length} · Total rows: ${totalRows}`,
    "",
    ...summary,
  ].join("\n"), "utf8");
  const size = (fs.statSync(file).size / 1024 / 1024).toFixed(2);
  console.log(`\n✓ Backup: ${file} (${size} MB, ${models.length} tables, ${totalRows} rows)`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
