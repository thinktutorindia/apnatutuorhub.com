# Pending migrations (single place)

## Applied (already on DB)
- `20261126000000_whatsapp_pipeline_state` — session pipeline columns, locality/landmark columns, counters/outcomes/rejected-saves/callback tables. Applied earlier; additive-only.

## PENDING — DO NOT APPLY without explicit approval
- `20261126010000_geo_source` — adds `geo_source TEXT` to `tutor_profiles`, `parent_profiles`, `leads`. Additive only (`ADD COLUMN IF NOT EXISTS`), no backfill. Values: `static | nominatim | gemini-text | pin | none`.

No other migrations are pending. The current pipeline carries `geo_source` in memory only;
DB persistence waits on approval of the migration above.
