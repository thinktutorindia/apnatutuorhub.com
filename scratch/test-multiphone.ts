import { splitWhatsAppDump } from "../lib/staff-lead-parser";

// Test multi-phone segmentation
const sample = `26/08/26, 3:59 pm - studyhelpline co in: 8587022506
9999218333
8802756134
8287640053
8810695910
9599033418
9643647147
8700216389`;

const segs = splitWhatsAppDump(sample);
console.log("Splits for multi-phone message:", segs);
