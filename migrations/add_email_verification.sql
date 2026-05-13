-- migrations/add_email_verification.sql
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_token VARCHAR(64),
  ADD COLUMN IF NOT EXISTS verification_token_expires_at TIMESTAMPTZ;

-- Mark all existing users as already verified so they are not locked out
UPDATE users SET is_verified = true WHERE is_verified = false;
