-- Migration 016: Create Work Station tables
-- These tables support the Work Station page and workstationController.js.

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

CREATE INDEX IF NOT EXISTS idx_workstation_records_student
  ON workstation_records(student_id);

CREATE INDEX IF NOT EXISTS idx_workstation_universities_student
  ON workstation_universities(student_id);

CREATE INDEX IF NOT EXISTS idx_workstation_universities_status
  ON workstation_universities(status);

CREATE INDEX IF NOT EXISTS idx_workstation_universities_position
  ON workstation_universities(student_id, position);

DROP TRIGGER IF EXISTS set_updated_at_workstation_records ON workstation_records;
CREATE TRIGGER set_updated_at_workstation_records
  BEFORE UPDATE ON workstation_records
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_workstation_universities ON workstation_universities;
CREATE TRIGGER set_updated_at_workstation_universities
  BEFORE UPDATE ON workstation_universities
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
