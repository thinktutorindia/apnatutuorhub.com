# WhatsApp modular pipeline (shadow mode)

## Architecture

```
inbound → prefilter → context → classifier → save gate → decide → compose → (legacy sender)
              │           │          │            │           │          │
              └───────────┴──────────┴────────────┴───────────┴──────────┘
                         whatsapp_reply_outcomes / rejected_saves / counters
```

| Module | File | Role |
|---|---|---|
| Taxonomy | `taxonomy.ts` | One entry per class; 1–8 Arabic "All Subjects", 9–12 Roman, band splitting |
| Validators | `validators.ts` | Location / email / name; all external checks behind interfaces |
| Classifier | `classifier.ts` | ≤1 Gemini call, strict JSON, deterministic fallback |
| Save gate | `save-gate.ts` | **Only writer** of email/name/area/city/subjects/classLevels; logs rejects |
| Decide | `decide.ts` | Answer first, then ask ONE missing field; direct intents |
| Compose | `compose.ts` | Merge into exactly ONE outbound message |
| Language | `language.ts` | Match user language: English / Hinglish / Hindi |
| Update flow | `update-flow.ts` | Menu + natural-language updates via the same validators |
| Prefilter | `prefilter.ts` | Reactions, duplicates, echoes, opt-outs, rate/repeat guards |
| Context | `context.ts` | DB-derived profile, missing[], pending, 24h window |
| Monitoring | `monitoring.ts` | Stuck-thread detection + weekly aggregates |

## Shadow mode

- Set `WA_PIPELINE_SHADOW=1` to record prefilter decisions in `whatsapp_reply_outcomes`.
- The flag **never sends** and never changes the legacy engine's reply.
- Cutover happens by wiring `decide()`/`compose()` into the webhook after golden parity.

## Env vars

- `WA_PIPELINE_SHADOW` — `1` enables outcome recording (default off).
- `CRON_SECRET` — protects `/api/cron/stuck-threads` in production.
- `GEMINI_API_KEY` (or `GOOGLE_API_KEY` / `GOOGLE_GENAI_API_KEY`) — classifier, name check and text-only location split. **Not present locally.**
- `DATABASE_URL` / `DIRECT_URL` — Prisma stores (counters, outcomes, rejected saves, callbacks, session fields).
- Existing bot vars: `AQUA_WHATSAPP_*`.
- **Google Maps is NOT used.** Geocoding uses the existing stack: static city list → Nominatim (`countrycodes=in`, 1 req/s, 24h cache) → Gemini text split only → Nominatim retry. `GoogleGeocoder` is an OPTIONAL adapter, active only if `GOOGLE_MAPS_API_KEY` is explicitly set.
- Real adapters fail closed: Gemini unavailable → deterministic classifier; name check unavailable → no save; geocoder unavailable → `needsReview` with null coords (city-only is still rejected by the validator before any geocode).

## Tests

```powershell
node node_modules/tsx/dist/cli.mjs scripts/test-taxonomy.ts
node node_modules/tsx/dist/cli.mjs scripts/test-validators.ts
node node_modules/tsx/dist/cli.mjs scripts/test-classifier-savegate.ts
node node_modules/tsx/dist/cli.mjs scripts/test-decide.ts
node node_modules/tsx/dist/cli.mjs scripts/test-update-flow.ts
node node_modules/tsx/dist/cli.mjs scripts/test-monitoring.ts
node node_modules/tsx/dist/cli.mjs scripts/test-whatsapp-golden.ts
node node_modules/tsx/dist/cli.mjs scripts/test-whatsapp-bot.ts
node node_modules/tsx/dist/cli.mjs scripts/test-pipeline-shadow.ts
```

All pipeline tests are pure/injected — no live Gemini, no DB writes, no WhatsApp sends.

## Stuck-thread cron cadence (Vercel Hobby)

`vercel.json` runs `/api/cron/stuck-threads` **once daily at 03:30 UTC** (`30 3 * * *`).
Vercel Hobby does not allow `*/30 * * * *` (more than once per day), so a build with that
expression fails. To get the intended 30-minute cadence, either upgrade to Vercel Pro or
trigger the same endpoint from an external scheduler (GitHub Actions / cron-job.io) with
`Authorization: Bearer $CRON_SECRET`. The route itself is unchanged and supports any cadence.

## Parked

Payment/wallet items are explicitly parked in `docs/CHATBOT_PARKED_TODO.md`.
