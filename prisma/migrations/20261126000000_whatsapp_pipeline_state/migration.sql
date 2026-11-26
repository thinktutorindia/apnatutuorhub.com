-- WhatsApp modular pipeline state. Safe, additive-only migration.
-- Apply with: prisma db execute --file prisma/migrations/20261126000000_whatsapp_pipeline_state/migration.sql --schema prisma/schema.prisma

-- 1. Session: explicit pipeline fields (replaces JSON-only state).
ALTER TABLE "whatsapp_sessions"
  ADD COLUMN IF NOT EXISTS "unsubscribed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "windowExpiresAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "pendingQuestion" TEXT,
  ADD COLUMN IF NOT EXISTS "pendingAskedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "askCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "rollingSummary" TEXT;

CREATE INDEX IF NOT EXISTS "whatsapp_sessions_windowExpiresAt_idx" ON "whatsapp_sessions"("windowExpiresAt");

-- Backfill the opt-out flag from the legacy JSON field.
UPDATE "whatsapp_sessions"
SET "unsubscribed" = true
WHERE "data"->>'unsubscribed' = 'true';

-- 2. Structured location fields (locality + landmark, never stored in city).
ALTER TABLE "tutor_profiles"
  ADD COLUMN IF NOT EXISTS "locality" TEXT,
  ADD COLUMN IF NOT EXISTS "landmark" TEXT;

ALTER TABLE "parent_profiles"
  ADD COLUMN IF NOT EXISTS "locality" TEXT,
  ADD COLUMN IF NOT EXISTS "landmark" TEXT;

ALTER TABLE "leads"
  ADD COLUMN IF NOT EXISTS "locality" TEXT,
  ADD COLUMN IF NOT EXISTS "landmark" TEXT;

-- 3. DB-backed counters (survive serverless restarts).
CREATE TABLE IF NOT EXISTS "whatsapp_reply_counters" (
  "phone" TEXT NOT NULL,
  "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "repliesInWindow" INTEGER NOT NULL DEFAULT 0,
  "lastReplyText" TEXT,
  "lastReplyTextCount" INTEGER NOT NULL DEFAULT 0,
  "flaggedForStaff" BOOLEAN NOT NULL DEFAULT false,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "whatsapp_reply_counters_pkey" PRIMARY KEY ("phone")
);

-- 4. Reply-outcome audit (decision, reason, fallback, template vs text, latency).
CREATE TABLE IF NOT EXISTS "whatsapp_reply_outcomes" (
  "id" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "inboundMessageId" TEXT,
  "decision" TEXT NOT NULL,
  "reason" TEXT,
  "fallbackUsed" BOOLEAN NOT NULL DEFAULT false,
  "channel" TEXT,
  "latencyMs" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "whatsapp_reply_outcomes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "whatsapp_reply_outcomes_phone_createdAt_idx" ON "whatsapp_reply_outcomes"("phone", "createdAt");
CREATE INDEX IF NOT EXISTS "whatsapp_reply_outcomes_decision_createdAt_idx" ON "whatsapp_reply_outcomes"("decision", "createdAt");
CREATE INDEX IF NOT EXISTS "whatsapp_reply_outcomes_reason_createdAt_idx" ON "whatsapp_reply_outcomes"("reason", "createdAt");

-- 5. Rejected-save ledger.
CREATE TABLE IF NOT EXISTS "whatsapp_rejected_saves" (
  "id" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "field" TEXT NOT NULL,
  "input" TEXT,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "whatsapp_rejected_saves_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "whatsapp_rejected_saves_phone_createdAt_idx" ON "whatsapp_rejected_saves"("phone", "createdAt");
CREATE INDEX IF NOT EXISTS "whatsapp_rejected_saves_field_createdAt_idx" ON "whatsapp_rejected_saves"("field", "createdAt");

-- 6. Staff callback tasks.
CREATE TABLE IF NOT EXISTS "callback_tasks" (
  "id" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "preferredTime" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "assignedToId" TEXT,
  "staffAlertedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "callback_tasks_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "callback_tasks_status_createdAt_idx" ON "callback_tasks"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "callback_tasks_phone_createdAt_idx" ON "callback_tasks"("phone", "createdAt");
