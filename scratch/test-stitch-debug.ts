import { splitWhatsAppDump } from "../lib/staff-lead-parser";

const sampleData = `26/08/26, 2:02 pm - +91 85069 51507: +91 97176 61509
26/08/26, 2:02 pm - +91 85069 51507: Dipika
26/08/26, 2:02 pm - +91 85069 51507: +91 93150 94235

Dwaraka
26/08/26, 2:02 pm - +91 85069 51507: 9667447331
26/08/26, 2:02 pm - +91 85069 51507: Shukurpur parents`;

const segs = splitWhatsAppDump(sampleData);
console.log("Segments after stitching:");
for (let i = 0; i < segs.length; i++) {
  console.log(`[${i}]: "${segs[i].replace(/\n/g, ' | ')}"`);
}
