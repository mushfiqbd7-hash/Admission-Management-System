-- ============================================================
-- Migration: 004_update_application_status_values.sql
-- Replaces old status values with the new full set:
--   draft, pending, approved, revoked, processing,
--   pre_admission, admitted, rejected
-- ============================================================

-- First migrate any rows using old statuses that no longer exist
UPDATE students SET application_status = 'revoked'    WHERE application_status = 'documents_verified';
UPDATE students SET application_status = 'processing'  WHERE application_status = 'on_hold';

-- Drop old constraint and add new one
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_application_status_check;
ALTER TABLE students ADD CONSTRAINT students_application_status_check
  CHECK (application_status IN (
    'draft', 'pending', 'approved', 'revoked',
    'processing', 'pre_admission', 'admitted', 'rejected'
  ));
