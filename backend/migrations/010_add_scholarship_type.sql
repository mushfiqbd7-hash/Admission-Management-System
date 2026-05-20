-- Migration 010: Add scholarship_type to students table
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS scholarship_type TEXT;
