import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY;

const models = ["gemini-3.5-flash-lite", "gemini-flash-lite-latest", "gemini-3.5-flash"];

async function testPrompt() {
  const prompt = `
You are the official AI WhatsApp Assistant for ApnaTutorHub.
User sends: "sangam vihar"
User Role: TUTOR
Extract area, city, and respond politely asking for subjects and classes they teach. Suggest 3 quick reply buttons.
Respond in JSON:
{
  "reply": "string",
  "quickReplies": ["string"],
  "detectedRole": "TUTOR",
  "extractedData": { "area": "Sangam Vihar", "city": "Delhi" }
}
`;

  for (const model of ["gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.6-flash"]) {
    const t0 = Date.now();
    try {
      const isLite = model.includes("lite");
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
            ...(!isLite ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
          },
        }),
      });

      const elapsed = Date.now() - t0;
      if (res.ok) {
        const d = await res.json();
        const text = d.candidates?.[0]?.content?.parts?.[0]?.text;
        console.log(`✅ [${model}] ${elapsed}ms:`, JSON.parse(text).reply?.slice(0, 80));
      } else {
        console.log(`❌ [${model}] HTTP ${res.status}:`, (await res.text()).slice(0, 100));
      }
    } catch (e: any) {
      console.log(`⚠️ [${model}] Error:`, e.message);
    }
  }
}

testPrompt();
