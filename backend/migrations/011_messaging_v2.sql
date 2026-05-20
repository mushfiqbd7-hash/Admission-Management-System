-- ─── Migration 011: Messaging System V2 ──────────────────────────────────────

-- Extend messages table with new fields
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS recipient_group  TEXT,
  ADD COLUMN IF NOT EXISTS application_id  UUID REFERENCES students(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS read_at         TIMESTAMPTZ;

-- Make recipient_id optional (group messages don't need it)
ALTER TABLE messages
  ALTER COLUMN recipient_id DROP NOT NULL;

-- Message attachments
CREATE TABLE IF NOT EXISTS message_attachments (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id    UUID        NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  original_name TEXT        NOT NULL,
  stored_name   TEXT        NOT NULL,
  file_path     TEXT        NOT NULL,
  mime_type     TEXT        NOT NULL,
  size          INTEGER     NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_msg_attach_msg ON message_attachments(message_id);

-- Ensure uploads/messages directory note
-- (directory created at runtime by backend)
