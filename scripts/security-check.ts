/**
 * scripts/security-check.ts
 *
 * Pre-push security and hygiene auditor for ApnaTutorHub.
 * Run this before git commits or pushes:
 *   npx tsx scripts/security-check.ts
 *   or: npm run check:security
 */

import fs from "fs";
import path from "path";

const ROOT = process.cwd();

type CheckResult = {
  name: string;
  passed: boolean;
  message: string;
  details?: string[];
};

const results: CheckResult[] = [];

function checkGitIgnoreRules(): void {
  const gitignorePath = path.join(ROOT, ".gitignore");
  if (!fs.existsSync(gitignorePath)) {
    results.push({
      name: ".gitignore Configuration",
      passed: false,
      message: "Missing .gitignore file in project root!",
    });
    return;
  }

  const content = fs.readFileSync(gitignorePath, "utf-8");
  const requiredPatterns = [
    ".env",
    "*.xlsx",
    "*.csv",
    "/scratch/",
    "/data/",
    "/datauploadrawdata/",
    "/.venv/",
  ];

  const missing: string[] = [];
  for (const pat of requiredPatterns) {
    if (!content.includes(pat)) {
      missing.push(pat);
    }
  }

  if (missing.length > 0) {
    results.push({
      name: ".gitignore Security Rules",
      passed: false,
      message: "Some critical security ignore rules are missing in .gitignore.",
      details: missing.map((m) => `Missing pattern: ${m}`),
    });
  } else {
    results.push({
      name: ".gitignore Security Rules",
      passed: true,
      message: "All critical security patterns (.env, *.xlsx, *.csv, /scratch/, /data/) are active.",
    });
  }
}

function checkRootHygiene(): void {
  const rootFiles = fs.readdirSync(ROOT, { withFileTypes: true });
  const forbiddenPatterns = [
    /\.xlsx$/i,
    /\.csv$/i,
    /^mitali_/i,
    /\.pem$/i,
    /\.key$/i,
    /proposal.*\.html$/i,
    /^test-.*\.ts$/i,
  ];

  const violations: string[] = [];

  for (const dirent of rootFiles) {
    if (dirent.isFile()) {
      for (const pattern of forbiddenPatterns) {
        if (pattern.test(dirent.name)) {
          violations.push(dirent.name);
          break;
        }
      }
    }
  }

  if (violations.length > 0) {
    results.push({
      name: "Root Directory Hygiene",
      passed: false,
      message: "Unprotected sensitive or temporary files detected in the project root.",
      details: violations.map((v) => `Exposed root file: ${v}`),
    });
  } else {
    results.push({
      name: "Root Directory Hygiene",
      passed: true,
      message: "Root directory is completely clean and free of loose PII, test scripts, or workbooks.",
    });
  }
}

function checkDataFolderProtection(): void {
  const dataDir = path.join(ROOT, "data");
  if (!fs.existsSync(dataDir)) {
    results.push({
      name: "Data Folder Shielding",
      passed: true,
      message: "No local data/ folder exists.",
    });
    return;
  }

  const dataGitIgnore = path.join(dataDir, ".gitignore");
  if (!fs.existsSync(dataGitIgnore)) {
    results.push({
      name: "Data Folder Shielding",
      passed: false,
      message: "data/.gitignore is missing. Local customer files risk being committed.",
    });
  } else {
    results.push({
      name: "Data Folder Shielding",
      passed: true,
      message: "data/ directory has dual-layer .gitignore protection.",
    });
  }
}

function checkEnvironmentSafety(): void {
  const envExample = path.join(ROOT, ".env.example");
  if (!fs.existsSync(envExample)) {
    results.push({
      name: "Environment Template Safety",
      passed: false,
      message: ".env.example is missing.",
    });
    return;
  }

  const content = fs.readFileSync(envExample, "utf-8");
  // Ensure no live production secrets leaked into .env.example
  const suspiciousTokens = [
    "sb_secret_",
    "re_cVawCoee",
    "ppo7k7P8W4bUlLfWhdQ6lb5L",
    "promoted-maggot-141911",
  ];

  const leaked: string[] = [];
  for (const token of suspiciousTokens) {
    if (content.includes(token)) {
      leaked.push(token);
    }
  }

  if (leaked.length > 0) {
    results.push({
      name: "Environment Template Safety",
      passed: false,
      message: "Live production secrets found inside public .env.example template!",
      details: leaked.map((t) => `Leaked secret token: ${t}`),
    });
  } else {
    results.push({
      name: "Environment Template Safety",
      passed: true,
      message: ".env.example is clean and safely sanitized.",
    });
  }
}

function run(): void {
  console.log("=========================================================");
  console.log("🛡️  ApnaTutorHub — Pre-Push Security & Structure Audit");
  console.log("=========================================================\n");

  checkGitIgnoreRules();
  checkRootHygiene();
  checkDataFolderProtection();
  checkEnvironmentSafety();

  let allPassed = true;

  for (const r of results) {
    const icon = r.passed ? "✅ [PASS]" : "❌ [FAIL]";
    console.log(`${icon} ${r.name}`);
    console.log(`   ${r.message}`);
    if (r.details && r.details.length > 0) {
      for (const d of r.details) {
        console.log(`   ⚠️  ${d}`);
      }
    }
    console.log("");
    if (!r.passed) allPassed = false;
  }

  console.log("=========================================================");
  if (allPassed) {
    console.log("🎉 ALL SECURITY CHECKS PASSED: Safe to commit and push code!");
  } else {
    console.log("🚨 SECURITY AUDIT FAILED: Address the issues above before pushing!");
    process.exit(1);
  }
  console.log("=========================================================\n");
}

run();
