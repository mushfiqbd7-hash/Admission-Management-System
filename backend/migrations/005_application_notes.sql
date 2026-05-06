-- ─── Migration 005: Rename Staff Notes → Application Notes ───────────────────
-- The student_notes table is unchanged structurally.
-- This migration documents that notes are now called "Application Notes",
-- are written only by admin/staff, and are visible to all roles
-- (student, agent, staff, admin).

-- Add a comment to the table for documentation purposes
COMMENT ON TABLE student_notes IS
  'Application Notes: written by admin/staff only; visible to all roles (student, agent, staff, admin).';
