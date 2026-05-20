-- ─── Migration 009: Add application_id to notifications ───────────────────────
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS application_id UUID REFERENCES students(id) ON DELETE SET NULL;

-- Add unread-count index for performance
CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON notifications(user_id, is_read)
  WHERE is_read = FALSE;
