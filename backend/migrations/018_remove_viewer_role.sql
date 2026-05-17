-- Remove the deprecated viewer role.
-- Existing viewer accounts are promoted to staff so they remain accessible.

UPDATE users
SET role = 'staff'
WHERE role = 'viewer';

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'staff', 'agent', 'student'));
