import * as fs from "fs";

// Let's check file size and some raw strings in the PDF
const buf = fs.readFileSync("public/aquadocssms.pdf");
console.log("PDF size:", buf.length);

// Extract readable ASCII strings from PDF
const text = buf.toString("latin1");
const matches = text.match(/[A-Za-z0-9_\-\.\:\/ ]{6,}/g) || [];
console.log("Extracted sample strings count:", matches.length);

const relevant = matches.filter(s => 
  /webhook|chatbot|interactive|template|message|pinbot|smartping|inbound|button/i.test(s)
);
console.log("Relevant occurrences sample:", Array.from(new Set(relevant)).slice(0, 40));
