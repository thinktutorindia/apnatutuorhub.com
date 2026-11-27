-- Additive column for exact per-employee attribution on outbound WhatsApp replies.
ALTER TABLE "whatsapp_chat_messages"
  ADD COLUMN IF NOT EXISTS "sentByUserId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'whatsapp_chat_messages_sentByUserId_fkey'
  ) THEN
    ALTER TABLE "whatsapp_chat_messages"
      ADD CONSTRAINT "whatsapp_chat_messages_sentByUserId_fkey"
      FOREIGN KEY ("sentByUserId") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "whatsapp_chat_messages_sentByUserId_createdAt_idx"
  ON "whatsapp_chat_messages"("sentByUserId", "createdAt");
