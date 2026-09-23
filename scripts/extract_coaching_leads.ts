/**
 * scripts/extract_coaching_leads.ts
 *
 * Extracts and cleans coaching centers and tuition requirement leads
 * from WhatsApp raw exports or text dumps into CRM-ready JSON format.
 *
 * Usage:
 * npx tsx scripts/extract_coaching_leads.ts [path/to/raw_file.txt]
 */

import fs from "fs";
import path from "path";

interface ParsedLead {
  id: string;
  source: string;
  title: string;
  phone: string | null;
  locality: string;
  city: string;
  classLevel: string;
  subjects: string[];
  budget: string | null;
  rawText: string;
}

const DELHI_LOCALITIES = [
  "rohini", "pitampura", "janakpuri", "dwarka", "uttam nagar", "paschim vihar",
  "mukundpur", "burari", "sant nagar", "malviya nagar", "saket", "kalkaji",
  "laxmi nagar", "preet vihar", "mayur vihar", "noida", "gurgaon", "ghaziabad"
];

export function parseRawLeadText(raw: string): ParsedLead[] {
  const blocks = raw.split(/\n\s*[-=]{3,}\s*\n|\n{2,}/).map((b) => b.trim()).filter(Boolean);
  const results: ParsedLead[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const phoneMatch = block.match(/(?:\+?91[\s-]?)?([6-9]\d{9})\b/);
    if (!phoneMatch && !/tutor|teacher|class|subject|coaching|student/i.test(block)) {
      continue;
    }

    const phone = phoneMatch ? phoneMatch[1] : null;

    // Locality detection
    let locality = "Delhi NCR";
    for (const loc of DELHI_LOCALITIES) {
      if (new RegExp(`\\b${loc}\\b`, "i").test(block)) {
        locality = loc.charAt(0).toUpperCase() + loc.slice(1);
        break;
      }
    }

    // Class detection
    let classLevel = "Class 1-10";
    const classMatch = block.match(/\b(class\s*\d{1,2}|nursery|kg|jee|neet|\d{1,2}(?:th|st|nd|rd)?(?:\s*class)?)\b/i);
    if (classMatch) {
      classLevel = classMatch[0].trim();
    }

    // Subjects detection
    const subjects: string[] = [];
    const subMatches = block.match(/\b(maths?|mathematics|science|physics|chemistry|biology|english|hindi|social studies|sst|accounts|economics|coding|all subjects)\b/gi);
    if (subMatches) {
      subjects.push(...Array.from(new Set(subMatches.map((s) => s.trim()))));
    } else {
      subjects.push("All Subjects");
    }

    // Budget detection
    const budgetMatch = block.match(/(?:budget|fee|fees|rs\.?|₹)\s*[:=]?\s*(\d{3,6}(?:\s*(?:to|-)\s*\d{3,6})?)/i);
    const budget = budgetMatch ? budgetMatch[0] : null;

    // Title
    const firstLine = block.split("\n")[0].trim().slice(0, 60);

    results.push({
      id: `ext_${Date.now()}_${i + 1}`,
      source: "WHATSAPP_EXPORT",
      title: firstLine || "Tuition Requirement",
      phone,
      locality,
      city: "Delhi",
      classLevel,
      subjects,
      budget,
      rawText: block,
    });
  }

  return results;
}

async function main() {
  const targetFile = process.argv[2] || path.join(process.cwd(), "whattodo", "WhatsApp Chat with +91 75595 63565.txt");

  if (!fs.existsSync(targetFile)) {
    console.warn(`Target file not found at: ${targetFile}. Using sample text.`);
    return;
  }

  console.log(`Extracting leads from: ${targetFile}...`);
  const content = fs.readFileSync(targetFile, "utf-8");
  const extracted = parseRawLeadText(content);

  const outDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outPath = path.join(outDir, "coaching_leads.json");
  fs.writeFileSync(outPath, JSON.stringify(extracted, null, 2), "utf-8");
  console.log(`✅ Extracted ${extracted.length} leads saved to: ${outPath}`);
}

main().catch(console.error);
