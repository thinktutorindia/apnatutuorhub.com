import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });
import { prisma } from "../lib/prisma";

async function clearSessions() {
  const res = await prisma.whatsappSession.deleteMany({});
  console.log(`Deleted ${res.count} existing chatbot sessions from DB.`);
}

clearSessions().catch(console.error);
