import * as fs from "fs";

const buf = fs.readFileSync("public/aquadocssms.pdf");
const text = buf.toString("latin1");

const term = "webhook";
let pos = 0;
while (true) {
  const i = text.toLowerCase().indexOf(term, pos);
  if (i === -1) break;
  console.log("--- FOUND AT", i, "---");
  console.log(text.slice(Math.max(0, i - 100), Math.min(text.length, i + 300)).replace(/\r|\n/g, " "));
  pos = i + 100;
  if (pos > i + 10000) break; // limit
}
