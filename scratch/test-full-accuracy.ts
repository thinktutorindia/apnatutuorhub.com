import { parseWhatsAppDump } from "../lib/staff-lead-parser";
import * as fs from "fs";

const rawText = fs.readFileSync("C:/Users/coder/.gemini/antigravity-ide/brain/30440107-f5b4-4d75-b023-6c19c49df4e6/.user_uploaded/media_1787935261851.txt", "utf-8");

async function main() {
  const start = Date.now();
  const res = await parseWhatsAppDump(rawText);
  const elapsed = Date.now() - start;
  
  console.log(`Parsed ${res.leads.length} leads from ${res.totalMessages} messages in ${elapsed}ms (junk: ${res.junkCount})`);
  console.log("\n=== ALL LEADS ===\n");
  
  let nameCount = 0;
  let locCount = 0;
  let subCount = 0;
  let classCount = 0;
  
  for (let i = 0; i < res.leads.length; i++) {
    const l = res.leads[i];
    if (l.name) nameCount++;
    if (l.location) locCount++;
    if (l.subjects.length > 0) subCount++;
    if (l.classes.length > 0) classCount++;
    
    console.log(`[${i}] Phone: ${l.phone} | Name: ${l.name || '-'} | Location: ${l.location || '-'} | Subjects: ${l.subjects.join(',')||'-'} | Classes: ${l.classes.join(',')||'-'} | Type: ${l.leadType} | Budget: ${l.budgetFee || '-'} | Notes: ${l.operationalNotes || '-'}`);
  }
  
  console.log(`\n=== STATS ===`);
  console.log(`Total Leads: ${res.leads.length}`);
  console.log(`With Name: ${nameCount} (${(nameCount/res.leads.length*100).toFixed(1)}%)`);
  console.log(`With Location: ${locCount} (${(locCount/res.leads.length*100).toFixed(1)}%)`);
  console.log(`With Subjects: ${subCount} (${(subCount/res.leads.length*100).toFixed(1)}%)`);
  console.log(`With Classes: ${classCount} (${(classCount/res.leads.length*100).toFixed(1)}%)`);
}

main();
