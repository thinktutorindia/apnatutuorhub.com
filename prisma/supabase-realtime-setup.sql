-- ============================================================
-- ApnaTutorHub: Supabase Realtime Publication Setup (Idempotent)
-- ============================================================
-- Run this SQL in your Supabase project dashboard:
--   Dashboard → SQL Editor → Paste → Run
--
-- Safely adds tables to supabase_realtime publication without failing
-- if they are already added!
-- ============================================================

DO $$
BEGIN
  -- 1. Add messages table
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;

  -- 2. Add notifications table
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;

  -- 3. Add conversations table
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
  END IF;
END $$;

-- Verify publication tables:
SELECT schemaname, tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
