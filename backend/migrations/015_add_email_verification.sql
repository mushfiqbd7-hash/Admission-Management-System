-- Migration 015: Add email verification fields to users
-- Existing users are marked verified so old admin/staff accounts are not locked out.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_token VARCHAR(64),
  ADD COLUMN IF NOT EXISTS verification_token_expires_at TIMESTAMPTZ;

UPDATE users
SET
  is_verified = true,
  verification_token = NULL,
  verification_token_expires_at = NULL
WHERE is_verified = false;
