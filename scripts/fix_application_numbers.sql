-- ─── Fix: Backfill ALL missing application numbers ────────────────────────────
-- Run this in psql or pgAdmin against your sams_db database.
-- Safe to run multiple times — only fills rows where application_number IS NULL.

-- Step 1: Ensure the daily sequence table exists
CREATE TABLE IF NOT EXISTS application_number_daily_seq (
  seq_date  DATE    PRIMARY KEY,
  last_seq  INTEGER NOT NULL DEFAULT 0
);

-- Step 2: Ensure the trigger function exists (recreate to be safe)
CREATE OR REPLACE FUNCTION assign_application_number()
RETURNS TRIGGER AS $$
DECLARE
  v_date     DATE    := DATE(NOW() AT TIME ZONE 'UTC');
  v_date_str TEXT    := TO_CHAR(v_date, 'YYYYMMDD');
  v_seq      INTEGER;
BEGIN
  IF NEW.application_number IS NULL THEN
    INSERT INTO application_number_daily_seq (seq_date, last_seq)
      VALUES (v_date, 1)
      ON CONFLICT (seq_date) DO UPDATE
        SET last_seq = application_number_daily_seq.last_seq + 1
      RETURNING last_seq INTO v_seq;
    NEW.application_number := v_date_str || '-' || LPAD(v_seq::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Re-attach trigger
DROP TRIGGER IF EXISTS trg_assign_application_number ON students;
CREATE TRIGGER trg_assign_application_number
  BEFORE INSERT ON students
  FOR EACH ROW EXECUTE FUNCTION assign_application_number();

-- Step 4: Backfill existing rows that are missing a number
DO $$
DECLARE
  rec        RECORD;
  v_date_str TEXT;
  v_seq      INTEGER;
BEGIN
  FOR rec IN
    SELECT id, created_at FROM students
    WHERE application_number IS NULL
    ORDER BY created_at ASC
  LOOP
    v_date_str := TO_CHAR(rec.created_at AT TIME ZONE 'UTC', 'YYYYMMDD');

    INSERT INTO application_number_daily_seq (seq_date, last_seq)
      VALUES (DATE(rec.created_at AT TIME ZONE 'UTC'), 1)
      ON CONFLICT (seq_date) DO UPDATE
        SET last_seq = application_number_daily_seq.last_seq + 1
      RETURNING last_seq INTO v_seq;

    UPDATE students
      SET application_number = v_date_str || '-' || LPAD(v_seq::TEXT, 4, '0')
      WHERE id = rec.id;

    RAISE NOTICE 'Assigned % to student %', v_date_str || '-' || LPAD(v_seq::TEXT, 4, '0'), rec.id;
  END LOOP;
END;
$$;

-- Step 5: Confirm results
SELECT application_number, given_name, family_name, created_at
FROM students ORDER BY created_at;