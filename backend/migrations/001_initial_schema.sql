-- ============================================================
-- SAMS Database Schema  (PostgreSQL)
-- Migration: 001_initial_schema.sql
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Users / Staff ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(255) NOT NULL,
  role          VARCHAR(50)  NOT NULL DEFAULT 'staff'
                  CHECK (role IN ('admin','staff','viewer')),
  is_active     BOOLEAN      NOT NULL DEFAULT true,
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── Students ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS students (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic
  family_name     VARCHAR(100) NOT NULL,
  given_name      VARCHAR(100) NOT NULL,
  chinese_name    VARCHAR(100),
  date_of_birth   DATE,
  gender          VARCHAR(10)  CHECK (gender IN ('male','female')),
  nationality     VARCHAR(100),

  -- Contact
  email           VARCHAR(255),
  mobile          VARCHAR(50),
  whatsapp        VARCHAR(50),
  wechat_id       VARCHAR(100),

  -- Application details
  target_university VARCHAR(255),
  intended_major    VARCHAR(255),
  degree_level      VARCHAR(50)  CHECK (degree_level IN (
                      'language','diploma','bachelor','master','phd')),
  intended_start_term VARCHAR(50),

  -- Status
  application_status VARCHAR(30) NOT NULL DEFAULT 'draft'
                        CHECK (application_status IN (
                          'draft','pending','approved','rejected','on_hold','documents_verified')),
  priority           VARCHAR(10) NOT NULL DEFAULT 'normal'
                        CHECK (priority IN ('normal','high')),
  passport_number    VARCHAR(50),

  -- Tracking
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Address ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS student_addresses (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID    NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  address_type    VARCHAR(20) NOT NULL CHECK (address_type IN ('permanent','current')),
  country         VARCHAR(100),
  street_address  TEXT,
  city            VARCHAR(100),
  state_province  VARCHAR(100),
  postal_code     VARCHAR(20),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, address_type)
);

-- ─── Passport & Visa ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS student_passport (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       UUID    NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
  passport_number  VARCHAR(50),
  issuing_country  VARCHAR(100),
  issue_date       DATE,
  expiry_date      DATE,
  place_of_issue   VARCHAR(100),
  has_china_visa   BOOLEAN DEFAULT false,
  visa_type        VARCHAR(20),
  visa_number      VARCHAR(50),
  visa_issue_date  DATE,
  visa_expiry_date DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Education Background ───────────────────────────────────
CREATE TABLE IF NOT EXISTS student_education (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       UUID    NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  institution_name VARCHAR(255),
  country          VARCHAR(100),
  degree_obtained  VARCHAR(100),
  field_of_study   VARCHAR(100),
  start_date       DATE,
  end_date         DATE,
  gpa              DECIMAL(4,2),
  is_highest       BOOLEAN DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── China Study Experience ─────────────────────────────────
CREATE TABLE IF NOT EXISTS student_china_experience (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID    NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
  has_experience  BOOLEAN DEFAULT false,
  university_name VARCHAR(255),
  city            VARCHAR(100),
  start_date      DATE,
  end_date        DATE,
  program_major   VARCHAR(255),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Financial Supporter ────────────────────────────────────
CREATE TABLE IF NOT EXISTS student_financial (
  id                   UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id           UUID    NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
  supporter_name       VARCHAR(255),
  relationship         VARCHAR(50),
  occupation           VARCHAR(255),
  annual_income_amount NUMERIC(15,2),
  annual_income_currency VARCHAR(10),
  phone                VARCHAR(50),
  email                VARCHAR(255),
  bank_name            VARCHAR(255),
  account_holder_name  VARCHAR(255),
  current_balance      NUMERIC(15,2),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Language Proficiency ───────────────────────────────────
CREATE TABLE IF NOT EXISTS student_language (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   UUID    NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  language     VARCHAR(50),
  test_name    VARCHAR(50),
  score        VARCHAR(20),
  test_date    DATE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Work Experience ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS student_work_experience (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   UUID    NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  employer     VARCHAR(255),
  position     VARCHAR(255),
  start_date   DATE,
  end_date     DATE,
  description  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Documents ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS student_documents (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id     UUID    NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  doc_key        VARCHAR(50) NOT NULL,
  doc_label      VARCHAR(255) NOT NULL,
  is_required    BOOLEAN DEFAULT false,
  file_name      VARCHAR(255),
  file_path      VARCHAR(500),
  file_size      INTEGER,
  mime_type      VARCHAR(100),
  uploaded_at    TIMESTAMPTZ,
  uploaded_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, doc_key)
);

-- ─── Application Notes ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS student_notes (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID    NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  note       TEXT    NOT NULL,
  created_by UUID    REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Audit Log ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID    REFERENCES users(id) ON DELETE SET NULL,
  action      VARCHAR(50)  NOT NULL,
  entity_type VARCHAR(50)  NOT NULL,
  entity_id   UUID,
  details     JSONB,
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Refresh Tokens ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ  NOT NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── Indexes ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_students_passport    ON students(passport_number);
CREATE INDEX IF NOT EXISTS idx_students_status      ON students(application_status);
CREATE INDEX IF NOT EXISTS idx_students_created_at  ON students(created_at);
CREATE INDEX IF NOT EXISTS idx_students_email       ON students(email);
CREATE INDEX IF NOT EXISTS idx_audit_log_user       ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity     ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_docs_student         ON student_documents(student_id);

-- ─── Updated_at trigger ─────────────────────────────────────
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER set_updated_at_students
  BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE OR REPLACE TRIGGER set_updated_at_users
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE OR REPLACE TRIGGER set_updated_at_passport
  BEFORE UPDATE ON student_passport
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE OR REPLACE TRIGGER set_updated_at_financial
  BEFORE UPDATE ON student_financial
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE OR REPLACE TRIGGER set_updated_at_china_exp
  BEFORE UPDATE ON student_china_experience
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
