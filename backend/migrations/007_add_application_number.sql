-- ─── Migration 007: Add application_number column only ────────────────────────
-- Number generation is handled entirely by the application layer (Node.js).
-- No triggers, no extra tables, no permission issues.

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS application_number VARCHAR(20) UNIQUE;
