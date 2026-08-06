import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const envPath = path.join(process.cwd(), ".env");
const content = fs.readFileSync(envPath, "utf-8");

const lines = content.split("\n");

console.log("Pushing environment variables from .env to Vercel (thinktutor/apnatutuorhubcom)...");

const envs = ["production", "preview", "development"];

for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;

  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;

  const key = trimmed.slice(0, eqIdx).trim();
  let val = trimmed.slice(eqIdx + 1).trim();

  // Strip wrapping quotes if present
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }

  // Skip empty values
  if (!val) continue;

  // In production on Vercel, omit AUTH_URL / NEXT_PUBLIC_APP_URL if set to localhost
  if ((key === "AUTH_URL" || key === "NEXT_PUBLIC_APP_URL") && val.includes("localhost")) {
    console.log(`Skipping local URL setting for ${key}...`);
    continue;
  }

  for (const envTarget of envs) {
    try {
      // Remove existing variable if present
      try {
        execSync(`npx vercel env rm ${key} ${envTarget} -y`, { stdio: "pipe" });
      } catch {
        // ignore error if key didn't exist
      }

      // Add key to environment
      execSync(`npx vercel env add ${key} ${envTarget}`, {
        input: `${val}\n`,
        stdio: ["pipe", "pipe", "pipe"],
      });

      console.log(`  ✅ Added ${key} to ${envTarget}`);
    } catch (err: any) {
      console.error(`  ❌ Failed to set ${key} for ${envTarget}:`, err.message || err);
    }
  }
}

console.log("\n🚀 All environment variables pushed to Vercel (thinktutor/apnatutuorhubcom) successfully!");
