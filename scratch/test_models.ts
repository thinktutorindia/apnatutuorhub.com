import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
console.log("API Key present:", Boolean(apiKey), "prefix:", apiKey ? apiKey.substring(0, 8) : "none");

async function checkModels() {
  try {
    const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await listRes.json();
    if (data.models) {
      console.log("Found", data.models.length, "models.");
      const flashModels = data.models
        .map((m: any) => m.name.replace("models/", ""))
        .filter((name: string) => name.includes("flash") || name.includes("gemini"));
      console.log("Available gemini/flash models:", flashModels);
    } else {
      console.log("List error:", data);
    }
  } catch (err: any) {
    console.error("Fetch failed:", err.message);
  }
}

checkModels();
