import fs from "fs";
import path from "path";

async function checkAll() {
  console.log("Checking all actions...");
  const actionsDir = path.join(process.cwd(), "app/actions");
  const files = fs.readdirSync(actionsDir).filter((f) => f.endsWith(".ts"));
  for (const f of files) {
    try {
      await import(`../app/actions/${f}`);
      console.log(`✓ ${f}`);
    } catch (e: any) {
      console.error(`❌ Error in ${f}:`, e.message);
    }
  }

  console.log("\nChecking all staff leads components...");
  const compDir = path.join(process.cwd(), "components/admin/staff-leads");
  const compFiles = fs.readdirSync(compDir).filter((f) => f.endsWith(".tsx"));
  for (const f of compFiles) {
    try {
      await import(`../components/admin/staff-leads/${f}`);
      console.log(`✓ ${f}`);
    } catch (e: any) {
      console.error(`❌ Error in ${f}:`, e.message);
    }
  }
}

checkAll();
