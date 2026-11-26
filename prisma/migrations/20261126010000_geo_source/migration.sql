-- PENDING — DO NOT APPLY without explicit approval.
-- Adds geo_source next to every stored locality/landmark/lat/lng location.
-- Safe/additive: ADD COLUMN IF NOT EXISTS only. No data rewrite.

ALTER TABLE "tutor_profiles"
  ADD COLUMN IF NOT EXISTS "geo_source" TEXT;

ALTER TABLE "parent_profiles"
  ADD COLUMN IF NOT EXISTS "geo_source" TEXT;

ALTER TABLE "leads"
  ADD COLUMN IF NOT EXISTS "geo_source" TEXT;

-- Allowed values (enforced in code): static | nominatim | gemini-text | pin | none
-- Existing rows remain NULL (unknown provenance); no backfill performed.
