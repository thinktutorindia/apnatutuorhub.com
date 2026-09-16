import * as fs from "fs";

const buf = fs.readFileSync("public/aquadocssms.pdf");
const text = buf.toString("latin1");

// Look for lines or sections discussing webhook setup or configuration
const lines = text.split("\n");
const matches: string[] = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (/webhook|callback|endpoint|url|subscribe|register/i.test(line)) {
    const snippet = lines.slice(Math.max(0, i - 1), Math.min(lines.length, i + 3)).join(" ");
    matches.push(snippet);
  }
}

console.log("Found matches count:", matches.length);
console.log("\nSample matches:");
matches.slice(0, 15).forEach((m, idx) => console.log(`[${idx + 1}]`, m.slice(0, 200)));
