import { execSync } from "child_process";
import fs from "fs";
import path from "path";

async function syncVercelEnv() {
  console.log("==================================================");
  console.log("     PUSHING LATEST PRODUCTION ENV TO VERCEL");
  console.log("==================================================");

  const envPath = path.join(process.cwd(), ".env");
  const envContent = fs.readFileSync(envPath, "utf8");

  const lines = envContent.split("\n");
  const envVars: { key: string; value: string }[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      let value = trimmed.slice(eqIdx + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (key && value !== undefined) {
        envVars.push({ key, value });
      }
    }
  }

  console.log(`Found ${envVars.length} variable(s) to push to Vercel...`);

  const envs = ["production", "preview", "development"];

  for (const { key, value } of envVars) {
    console.log(`Pushing '${key}' to Vercel...`);
    for (const env of envs) {
      try {
        // First attempt to remove existing value to ensure fresh overwrite
        try {
          execSync(`npx vercel env rm ${key} ${env} -y`, { stdio: "ignore" });
        } catch {
          // ignore error if key doesn't exist yet
        }

        // Now add the fresh key value
        execSync(`echo "${value.replace(/"/g, '\\"')}" | npx vercel env add ${key} ${env}`, {
          stdio: "ignore",
          shell: "powershell.exe",
        });
        console.log(`  ✓ ${key} (${env}) set`);
      } catch (err: any) {
        console.log(`  ! Notice setting ${key} (${env}):`, err.message || err);
      }
    }
  }

  console.log("\n==================================================");
  console.log("     ALL LATEST ENV VARIABLES PUSHED TO VERCEL!");
  console.log("==================================================");
}

syncVercelEnv();
