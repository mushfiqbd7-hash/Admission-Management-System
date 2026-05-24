-- Rename the seeded default admin display name.
-- This keeps the current admin email/login unchanged.

UPDATE users
SET full_name = 'Admin'
WHERE full_name = 'System Administrator';
