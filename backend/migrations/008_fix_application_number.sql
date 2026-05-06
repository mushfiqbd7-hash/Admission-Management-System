-- ─── Migration 008: Backfill application numbers ──────────────────────────────
-- Safe pure-SQL backfill. No extra tables or triggers needed.

WITH ranked AS (
  SELECT id,
    TO_CHAR(created_at AT TIME ZONE 'UTC', 'YYYYMMDD') AS date_str,
    ROW_NUMBER() OVER (
      PARTITION BY DATE(created_at AT TIME ZONE 'UTC')
      ORDER BY created_at ASC
    ) AS rn
  FROM students
  WHERE application_number IS NULL
)
UPDATE students s
SET application_number = r.date_str || '-' || LPAD(r.rn::TEXT, 4, '0')
FROM ranked r
WHERE s.id = r.id;
