-- ============================================================
-- Migration: 003_add_student_role.sql
-- Adds 'student' to the allowed roles in the users table
-- ============================================================

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'staff', 'agent', 'student', 'viewer'));
