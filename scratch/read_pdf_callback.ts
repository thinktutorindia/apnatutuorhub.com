import * as fs from "fs";

const buf = fs.readFileSync("public/aquadocssms.pdf");
const text = buf.toString("latin1");

const idx = text.indexOf("MESSAGE CALLBACK PAYLOAD");
if (idx !== -1) {
  console.log(text.slice(idx, idx + 2500));
} else {
  console.log("Not found directly");
}
