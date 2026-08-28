import { splitWhatsAppDump, parseWhatsAppDump } from "../lib/staff-lead-parser";
import { extractLeadData, regexExtract } from "../lib/gemini-lead-extractor";

// Let's test how fast regexExtract is on sample messages
console.log("Testing splitWhatsAppDump and regexExtract...");
