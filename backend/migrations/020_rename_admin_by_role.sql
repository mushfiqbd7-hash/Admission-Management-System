-- Make the default admin display name robust even if the earlier migration
-- was not applied before the seed/admin record changed.

UPDATE users
SET full_name = 'Admin-Mushfiq'
WHERE role = 'admin'
  AND full_name IN ('System Administrator', 'Sytem Administrator');
