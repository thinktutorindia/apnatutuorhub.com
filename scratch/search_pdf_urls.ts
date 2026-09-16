import * as fs from "fs";

const buf = fs.readFileSync("public/aquadocssms.pdf");
const text = buf.toString("latin1");

// Search for URL patterns like /v3/ or /v1/ or https://partnersv1.pinbot.ai
const matches = text.match(/https:\/\/[^\s\)\"\>\']+/g) || [];
const uniqueUrls = Array.from(new Set(matches));
console.log("Found URLs in PDF:", uniqueUrls);

// Search for webhook setup keywords
const webhookLines = text.split("\n").filter(l => /webhook|callback|aisensy/i.test(l));
console.log("Webhook mentions count:", webhookLines.length);
webhookLines.slice(0, 20).forEach(l => console.log("-", l.trim().slice(0, 150)));
