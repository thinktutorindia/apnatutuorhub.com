# WhatsApp bot cutover plan (NOT ENABLED)

## Kill switch
- `WA_CUTOVER_MODE=OFF` — always legacy. Default when unset.
- Values: `STAFF` → `NEW` → `P10` → `P50` → `P100`.
- `WA_CUTOVER_ALLOWLIST` — comma-separated staff phone numbers (digits only).
- `WA_PIPELINE_SHADOW=1` — record decisions in `whatsapp_reply_outcomes` without changing replies.

`lib/whatsapp-bot/pipeline/cutover.ts` is the only decoder. It is currently unused.

## Rollout order
1. **Shadow only** (`WA_CUTOVER_MODE=OFF`, `WA_PIPELINE_SHADOW=1`) for 7 days.
2. **Staff allowlist** (`STAFF` + allowlist). New pipeline only for the listed staff phones.
3. **New users only** (`NEW`). Existing registered tutors stay on legacy.
4. **10% → 50% → 100%** (`P10`, `P50`, `P100`) by deterministic phone bucket.
5. Hold each stage at least 48 hours; promote only if metrics below are green.

## Metrics to watch
- `whatsapp_reply_outcomes`: REPLY/SILENT ratio, `silentReasons`, `fallbackUsed`, latency.
- `whatsapp_rejected_saves`: reject reasons by field (spikes mean validator regressions).
- `whatsapp_reply_counters`: rate-limit hits, `flaggedForStaff`.
- Stuck-thread cron: count and age of unanswered inbound threads.
- Delivery failures by reason; opt-out counts.
- Golden parity: 19/19 golden + 22/22 legacy + 17/17 shadow before each promotion.

## Rollback
1. Set `WA_CUTOVER_MODE=OFF` (single env change) — all traffic returns to legacy immediately.
2. Keep `whatsapp_sessions.data` JSON intact; for affected phones restore `step`/`pendingQuestion`
   from `docs/MIDFLOW_MIGRATION_PLAN.md` snapshot if a flow looks stuck.
3. Do not delete outcome/reject rows — they are the audit trail for post-mortem.

## Do not enable yet
Nothing in this plan changes an env var, deploy, DB row, or sends a message.
