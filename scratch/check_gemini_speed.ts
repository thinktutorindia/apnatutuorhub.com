import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const apiKey = process.env.GEMINI_API_KEY;

async function checkFast() {
  const start = Date.now();
  const model = "gemini-3.6-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: "Extract user intent into JSON: 'I need a maths tutor for class 10 in Rohini': { role: 'PARENT', class: '10', subject: 'maths', area: 'Rohini' }" }] }],
      generationConfig: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 }
      }
    })
  });
  console.log("Model:", model, "Status:", res.status, "Time:", Date.now() - start, "ms");
  const txt = await res.text();
  console.log("Body:", txt);
}

checkFast().catch(console.error);
