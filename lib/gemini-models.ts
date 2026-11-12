/**
 * lib/gemini-models.ts
 *
 * Current Gemini text-model fallback cascade used across the app
 * (AI message editor, locality AI, geocoder).
 *
 * NOTE (2026): Google has retired `gemini-1.5-*` / `gemini-2.0-*` / `gemini-2.5-flash*`
 * for new API keys ("This model is no longer available to new users" — 404).
 * Only current-generation models (3.x) and the `gemini-*-latest` aliases accept
 * new keys, so the cascade below starts with a confirmed-working model.
 */
export const GEMINI_TEXT_MODEL_CASCADE = [
  "gemini-3.5-flash", // current stable flash (serves as gemini-3.6-flash)
  "gemini-flash-latest", // alias → always the newest flash model
  "gemini-3.8-flash",
  "gemini-3.1-flash-lite",
] as const;

/** Resolve the Gemini API key from any of the supported env var names. */
export function getGeminiApiKey(): string | null {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    null
  );
}
