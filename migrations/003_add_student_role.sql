-- ============================================================
-- Migration: 003_add_student_role.sql
-- Adds 'student' to the allowed roles in the users table
-- ============================================================

-- Drop and recreate to ensure student is included
-- (constraint may already have student from fixed 002 — DROP IF EXISTS is safe)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'staff', 'agent', 'student', 'viewer'));
