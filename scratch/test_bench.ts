import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY;

const candidates = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.6-flash",
  "gemini-flash-lite-latest",
  "gemini-flash-latest",
];

async function bench() {
  for (const model of candidates) {
    const t0 = Date.now();
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Respond with JSON: {"status": "ok", "role": "TUTOR"}' }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
          },
        }),
      });

      const elapsed = Date.now() - t0;
      if (res.ok) {
        const d = await res.json();
        console.log(`✅ [${model}] SUCCESS in ${elapsed}ms ->`, d.candidates?.[0]?.content?.parts?.[0]?.text?.slice(0, 60));
      } else {
        const err = await res.text();
        console.log(`❌ [${model}] HTTP ${res.status} in ${elapsed}ms ->`, err.slice(0, 100));
      }
    } catch (e: any) {
      console.log(`⚠️ [${model}] Exception:`, e.message);
    }
  }
}

bench();
