import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { sendAquaWhatsAppMessage } from "../lib/aqua-whatsapp";
import { MSG } from "../lib/whatsapp-bot/messages";

async function sendWelcomeToUser() {
  const userPhone = "919311459543";
  console.log(`Sending Welcome reply to user's test phone (${userPhone})...`);
  
  const res = await sendAquaWhatsAppMessage({
    to: userPhone,
    mode: "text",
    text: MSG.WELCOME
  });

  console.log("Send Result:", res);
}

sendWelcomeToUser().catch(console.error);
