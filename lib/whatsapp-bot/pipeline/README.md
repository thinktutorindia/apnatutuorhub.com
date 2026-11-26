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
- Existing bot vars: `AQUA_WHATSAPP_*`, `GEMINI_API_KEY` (or `GOOGLE_API_KEY`), `DATABASE_URL` / `DIRECT_URL`.
- No Google Maps key exists locally; the geocoder interface falls back to `needsReview`.

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

## Parked

Payment/wallet items are explicitly parked in `docs/CHATBOT_PARKED_TODO.md`.
