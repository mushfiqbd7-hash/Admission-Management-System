-- Migration: 022_add_file_data_to_documents.sql
-- Adds temporary bytea column to hold draft document bytes
-- before they are pushed to Azure Blob Storage on submission.

ALTER TABLE student_documents
  ADD COLUMN IF NOT EXISTS file_data BYTEA;
