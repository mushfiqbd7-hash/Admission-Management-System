-- ============================================================
-- Migration: 002_add_agent_role_and_password.sql
-- Adds 'agent' role support and plaintext password column
-- ============================================================

-- Add password column first (safe, IF NOT EXISTS)
ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT;

-- Index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Fix any rows with roles not in the full allowed set before adding constraint
-- (handles cases where student/agent rows already exist from a previous partial run)
UPDATE users SET role = 'staff'
  WHERE role NOT IN ('admin', 'staff', 'agent', 'student', 'viewer');

-- Drop old constraint and recreate with ALL roles (002+003 combined)
-- This is safe — 003 will also run and is idempotent
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'staff', 'agent', 'student', 'viewer'));
