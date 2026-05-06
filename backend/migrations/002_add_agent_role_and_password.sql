-- ============================================================
-- Migration: 002_add_agent_role_and_password.sql
-- Adds 'agent' role support and plaintext password column for
-- self-registered Agent/Staff users
-- ============================================================

-- Drop old role constraint and recreate with 'agent' included
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'staff', 'agent', 'viewer'));

-- Add plaintext password column for self-registered users
-- (password_hash remains for admin-created / seeded users)
ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT;

-- Index for faster email lookups on registration checks
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
