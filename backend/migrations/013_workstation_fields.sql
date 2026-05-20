-- Migration 013: Add Work Station fields to students table
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS payment_of_application TEXT,
  ADD COLUMN IF NOT EXISTS application_incharge    TEXT;
