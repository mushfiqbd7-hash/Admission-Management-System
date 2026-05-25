-- Migration 025: Add password reset token fields to users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS reset_token         VARCHAR(64),
  ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMPTZ;
