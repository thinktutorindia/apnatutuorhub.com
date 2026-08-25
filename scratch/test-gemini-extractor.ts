import { extractLeadData } from "../lib/gemini-lead-extractor";
import { parseWhatsAppDump } from "../lib/staff-lead-parser";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const SAMPLE_DATA = `
[7:12 pm, 17/08/2026] +91 755 956 3565: 50 percent of the first month will take👈

Please copy paste this form in text area below fill details & send me.


Send me Your  Adhar Card also Seperately
[7:12 pm, 17/08/2026] +91 755 956 3565: Tutor Profile

Tutor Name-  somya raj 

Contact no.- 6395322935

Email - somyarajgit9@gmail.com

Qualification -  master's in science 

Experience in years - 5 years 

Subjects/Classes Can Teach - 11th 12th biology , 8th,9th,10th science and maths 

Complete address - RZ111A uttam nagar West ,110059 



50 percent of the first month will take👈

Please copy paste this form in text area below fill details & send me.


Send me Your  Adhar Card also Seperately
[7:12 pm, 17/08/2026] +91 755 956 3565: 1.Name = vipasha 
2.Whatapp no.= 8920467910
3.class = nursary.Lkg.Ukg.1st
4.Subject = all subjects 
5.location = Gaziyabad vaishali sec 4
6.class. Home tution only
[7:12 pm, 17/08/2026] +91 755 956 3565: +91 80058 95127
French lajpat nagar
[7:12 pm, 17/08/2026] +91 755 956 3565: Batla house Paid Rani Bagh +91 70535 08200 Male
`;

async function test() {
  console.log("Testing Gemini AI Lead Parser with raw WhatsApp sample...");
  const result = await parseWhatsAppDump(SAMPLE_DATA);
  console.log("Total messages parsed:", result.totalMessages);
  console.log("Junk messages skipped:", result.junkCount);
  console.log("Valid leads extracted:", result.leads.length);
  console.log("\n--- Extracted Leads ---");
  console.dir(result.leads, { depth: null });
}

test().catch(console.error);
