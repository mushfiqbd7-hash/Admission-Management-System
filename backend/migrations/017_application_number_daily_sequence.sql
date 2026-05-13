-- Migration 017: Safe daily application number sequence
-- Format remains YYYYMMDD-0001, YYYYMMDD-0002, etc.

CREATE TABLE IF NOT EXISTS application_number_daily_seq (
  app_date DATE PRIMARY KEY,
  last_seq INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Backfill sequence table from existing application numbers.
INSERT INTO application_number_daily_seq (app_date, last_seq)
SELECT
  app_date,
  MAX(seq_no) AS last_seq
FROM (
  SELECT
    DATE(created_at AT TIME ZONE 'UTC') AS app_date,
    CASE
      WHEN application_number ~ '^[0-9]{8}-[0-9]{4}$'
      THEN SUBSTRING(application_number FROM 10)::INTEGER
      ELSE 0
    END AS seq_no
  FROM students
  WHERE application_number IS NOT NULL
) existing_numbers
GROUP BY app_date
ON CONFLICT (app_date)
DO UPDATE SET
  last_seq = GREATEST(application_number_daily_seq.last_seq, EXCLUDED.last_seq),
  updated_at = NOW();