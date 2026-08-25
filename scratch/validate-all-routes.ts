import fs from "fs";
import path from "path";

async function walkDir(dir: string, fileList: string[] = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== "node_modules" && file !== ".next" && file !== ".git") {
        await walkDir(filePath, fileList);
      }
    } else if (file.endsWith(".ts") || file.endsWith(".tsx")) {
      if (!file.endsWith(".d.ts")) {
        fileList.push(filePath);
      }
    }
  }
  return fileList;
}

async function validate() {
  console.log("Validating all TypeScript and TSX files in app/ and lib/ and components/...");
  const appFiles = await walkDir(path.join(process.cwd(), "app"));
  const libFiles = await walkDir(path.join(process.cwd(), "lib"));
  const compFiles = await walkDir(path.join(process.cwd(), "components"));

  const allFiles = [...appFiles, ...libFiles, ...compFiles];
  let errors = 0;

  for (const f of allFiles) {
    try {
      // Dynamic import to check module resolution and execution
      const relPath = "./" + path.relative(__dirname, f).replace(/\\/g, "/");
      await import(relPath);
    } catch (e: any) {
      console.error(`❌ Issue in ${path.relative(process.cwd(), f)}:`, e.message);
      errors++;
    }
  }

  if (errors === 0) {
    console.log(`\n🎉 ALL ${allFiles.length} files compiled & loaded cleanly with 0 errors!`);
  } else {
    console.error(`\n⚠️ Found ${errors} files with issues.`);
  }
}

validate();
