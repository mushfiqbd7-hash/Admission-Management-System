-- ============================================================
-- Migration: 002_add_agent_role_and_password.sql
-- Adds agent/student role support and legacy password column.
-- NOTE: New code stores bcrypt hashes in password_hash.
-- ============================================================

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'staff', 'agent', 'student', 'viewer'));

ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT;

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);