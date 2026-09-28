import * as fs from "fs";
import { prisma } from "../lib/prisma";

function loadEnvFile(file: string, override: boolean) {
  if (!fs.existsSync(file)) return;
  const text = fs.readFileSync(file, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const eq = trimmed.indexOf("=");
    const key = trimmed.slice(0, eq).trim();
    if (!key) continue;
    if (!override && process.env[key]) continue;
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

async function main() {
  loadEnvFile(".env", false);
  loadEnvFile(".env.local", true);

  const before = await prisma.whatsappChatMessage.count();
  const deleted = await prisma.$executeRaw`
    DELETE FROM whatsapp_chat_messages a
    USING whatsapp_chat_messages b
    WHERE a."messageId" IS NOT NULL
      AND a."messageId" = b."messageId"
      AND a.ctid > b.ctid
  `;
  const after = await prisma.whatsappChatMessage.count();
  const dupes = await prisma.$queryRaw<Array<{ n: bigint }>>`
    SELECT COUNT(*)::bigint AS n FROM (
      SELECT "messageId" FROM whatsapp_chat_messages
      WHERE "messageId" IS NOT NULL
      GROUP BY "messageId" HAVING COUNT(*) > 1
    ) d
  `;
  const role = await prisma.$queryRaw<Array<{ current_user: string; bypass: boolean; rls: boolean }>>`
    SELECT current_user,
           (SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user) AS bypass,
           c.relrowsecurity AS rls
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'whatsapp_chat_messages'
  `;
  await prisma.$executeRaw`ALTER TABLE public.whatsapp_chat_messages ENABLE ROW LEVEL SECURITY`;
  const rls = await prisma.$queryRaw<Array<{ rls: boolean }>>`
    SELECT c.relrowsecurity AS rls
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'whatsapp_chat_messages'
  `;
  console.log(JSON.stringify({
    before,
    deleted,
    after,
    remainingDuplicateProviderIds: Number(dupes[0]?.n ?? 0),
    role: role[0] ?? null,
    rlsEnabled: rls[0]?.rls ?? null,
  }));
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
