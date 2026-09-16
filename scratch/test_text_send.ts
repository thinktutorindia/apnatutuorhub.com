import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { sendAquaWhatsAppMessage } from "../lib/aqua-whatsapp";

async function testTextSend() {
  console.log("Testing sendAquaWhatsAppMessage mode: 'text'...");
  // Using test phone
  const res = await sendAquaWhatsAppMessage({
    to: "919999999999",
    mode: "text",
    text: "Test bot reply from ApnaTutorHub"
  });
  console.log("Result:", res);
}

testTextSend().catch(console.error);
