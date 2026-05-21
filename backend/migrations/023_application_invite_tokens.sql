CREATE TABLE IF NOT EXISTS application_invite_tokens (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  token       VARCHAR(48) UNIQUE NOT NULL,
  created_by  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  used_at     TIMESTAMPTZ,
  student_id  UUID        REFERENCES students(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invite_tokens_token      ON application_invite_tokens(token);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_created_by ON application_invite_tokens(created_by);

-- Clean up any already-expired unused tokens at migration time
DELETE FROM application_invite_tokens
WHERE used_at IS NULL AND expires_at <= NOW();
