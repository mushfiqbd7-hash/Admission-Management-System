-- Migration 014: Add Work Station extra fields
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS university_applied TEXT,
  ADD COLUMN IF NOT EXISTS ws_status          TEXT;
