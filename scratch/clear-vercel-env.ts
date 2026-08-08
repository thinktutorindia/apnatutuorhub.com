import { execSync } from "child_process";

async function removeAllVercelEnvVars() {
  console.log("==================================================");
  console.log("     REMOVING ALL VERCEL ENVIRONMENT VARIABLES");
  console.log("==================================================");

  try {
    const output = execSync("npx vercel env ls", { encoding: "utf8" });
    const lines = output.split("\n");

    const envKeys: string[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      const match = trimmed.match(/^([A-Z0-9_]+)\s+Hidden/);
      if (match && match[1]) {
        envKeys.push(match[1]);
      }
    }

    console.log(`Found ${envKeys.length} environment variable(s) to remove:`);
    console.log(envKeys.join(", "));

    const envs = ["production", "preview", "development"];

    for (const key of envKeys) {
      console.log(`\nDeleting '${key}' from Vercel...`);
      for (const env of envs) {
        try {
          execSync(`npx vercel env rm ${key} ${env} -y`, {
            encoding: "utf8",
            stdio: "ignore",
          });
          console.log(`  ✓ Removed ${key} (${env})`);
        } catch {
          // Ignore if not present in that specific environment
        }
      }
    }

    console.log("\n==================================================");
    console.log("     ALL VERCEL ENV VARIABLES REMOVED!");
    console.log("==================================================");
  } catch (error: any) {
    console.error("Error executing Vercel CLI:", error.message || error);
  }
}

removeAllVercelEnvVars();
