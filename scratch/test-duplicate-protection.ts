import { parseWhatsAppDump } from "../lib/staff-lead-parser";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const DUMP_WITH_DUPLICATES = `
[7:12 pm, 17/08/2026] +91 755 956 3565: Tutor Profile
Tutor Name- Somya Raj
Contact no.- 9876543210
Email - somya@example.com
Subjects - Biology, Chemistry
Complete address - Delhi 110059

[7:13 pm, 17/08/2026] +91 755 956 3565: Tutor Profile
Tutor Name- Somya Raj (Followup msg)
Contact no.- 9876543210
Email - somya@example.com
Subjects - Biology, Science
Complete address - Delhi 110059

[7:14 pm, 17/08/2026] +91 755 956 3565: 1.Name = Rahul Sharma
2.Whatapp no.= 9123456789
3.Email = rahul@example.com
4.Subject = Mathematics
5.location = Noida
`;

async function testDuplicates() {
  console.log("Testing Duplicate Prevention in WhatsApp Dump...");
  const result = await parseWhatsAppDump(DUMP_WITH_DUPLICATES);
  console.log("Total messages parsed:", result.totalMessages);
  console.log("Unique leads after deduplication:", result.leads.length);
  
  result.leads.forEach((l, i) => {
    console.log(`Lead #${i + 1}: Name="${l.name}", Phone="${l.phone}", Email="${l.email}"`);
  });

  const phones = result.leads.map(l => l.phone);
  const emails = result.leads.map(l => l.email);
  const uniquePhones = new Set(phones);
  const uniqueEmails = new Set(emails);

  if (phones.length === uniquePhones.size && emails.length === uniqueEmails.size) {
    console.log("\n✅ SUCCESS: No duplicate phone numbers or emails exist in the parsed batch!");
  } else {
    console.error("\n❌ FAILED: Duplicate phone numbers or emails were found!");
  }
}

testDuplicates().catch(console.error);
