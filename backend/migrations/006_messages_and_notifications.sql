-- ─── Migration 006: Messages & Notifications ─────────────────────────────────

-- ─── Messages ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id            UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject              VARCHAR(255),
  body                 TEXT        NOT NULL,
  is_read              BOOLEAN     NOT NULL DEFAULT FALSE,
  deleted_by_sender    BOOLEAN     NOT NULL DEFAULT FALSE,
  deleted_by_recipient BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender    ON messages(sender_id,    created_at DESC);

-- ─── Notifications ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       VARCHAR(20) NOT NULL DEFAULT 'info'
               CHECK (type IN ('info','success','warning','error')),
  message    TEXT        NOT NULL,
  link       VARCHAR(500),
  is_read    BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
