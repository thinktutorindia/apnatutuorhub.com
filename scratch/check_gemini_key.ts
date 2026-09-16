import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const apiKey = process.env.GEMINI_API_KEY;

async function checkDirect() {
  const model = "gemini-3.6-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: "Hello, reply with JSON { status: 'ok' }" }] }],
      generationConfig: { responseMimeType: "application/json" }
    })
  });
  console.log("Status:", res.status);
  const txt = await res.text();
  console.log("Body:", txt);
}

checkDirect().catch(console.error);
