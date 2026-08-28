import { splitWhatsAppDump, parseWhatsAppDump } from "../lib/staff-lead-parser";

const sampleData = `26/08/26, 2:02 pm - +91 85069 51507: +91 97176 61509
26/08/26, 2:02 pm - +91 85069 51507: Dipika
26/08/26, 2:02 pm - +91 85069 51507: +91 93150 94235

Dwaraka
26/08/26, 2:02 pm - +91 85069 51507: 9667447331
26/08/26, 2:02 pm - +91 85069 51507: Shukurpur parents
26/08/26, 2:09 pm - +91 85069 51507: Shahdara 
25 k
26/08/26, 2:09 pm - +91 85069 51507: 9958838132
26/08/26, 2:09 pm - +91 85069 51507: 9999594314
26/08/26, 2:09 pm - +91 85069 51507: +91 99995 94314

Karanpur near jain sweets 

9th
`;

parseWhatsAppDump(sampleData).then(res => {
  console.log("Results count:", res.leads.length);
  for (const l of res.leads) {
    console.log({
      name: l.name,
      phone: l.phone,
      location: l.location,
      classes: l.classes,
      budget: l.budgetFee,
      leadType: l.leadType,
      raw: l.rawText.replace(/\n/g, " | ")
    });
  }
});
