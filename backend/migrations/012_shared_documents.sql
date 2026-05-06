-- Migration 012: Shared documents library
CREATE TABLE IF NOT EXISTS shared_documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  category    TEXT NOT NULL,
  description TEXT,
  file_name   TEXT NOT NULL,
  file_size   BIGINT DEFAULT 0,
  mime_type   TEXT,
  file_path   TEXT NOT NULL,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shared_documents_category ON shared_documents(category);
CREATE INDEX IF NOT EXISTS idx_shared_documents_created_at ON shared_documents(created_at DESC);
