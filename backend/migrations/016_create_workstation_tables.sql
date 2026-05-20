-- Migration 016: Create Work Station tables
-- Table-only migration to avoid owner-permission errors on existing tables.

CREATE TABLE IF NOT EXISTS workstation_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,

  payment_of_application TEXT,
  application_incharge TEXT,
  portal_email TEXT,
  portal_password TEXT,

  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workstation_universities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,

  university_name TEXT,
  status TEXT NOT NULL DEFAULT 'approved'
    CHECK (status IN (
      'approved',
      'processing',
      'pre_admission',
      'admitted',
      'rejected',
      'revoked'
    )),

  position INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);