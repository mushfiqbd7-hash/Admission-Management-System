-- Migration 021: Workstation data cleanup
-- 1. Remove workstation entries for students still in 'pending' or 'draft' status
--    (they should never have been in workstation).
-- 2. Deduplicate workstation_universities positions per student.
-- 3. Add a unique index on (student_id, position) to prevent future duplicates.

-- ── Step 1: Clean up bad entries ──────────────────────────────────────────────

DELETE FROM workstation_universities
WHERE student_id IN (
  SELECT id FROM students
  WHERE application_status IN ('pending', 'draft')
);

DELETE FROM workstation_records
WHERE student_id IN (
  SELECT id FROM students
  WHERE application_status IN ('pending', 'draft')
);

-- ── Step 2: Deduplicate positions within each student ─────────────────────────
-- Re-number all rows per student (ordered by created_at) starting from 0.
-- This fixes any duplicate positions introduced by race conditions.

UPDATE workstation_universities wu
SET position = sub.new_position
FROM (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY student_id ORDER BY created_at ASC) - 1 AS new_position
  FROM workstation_universities
) sub
WHERE wu.id = sub.id
  AND wu.position <> sub.new_position;

-- ── Step 3: Unique index on (student_id, position) ───────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS workstation_universities_student_position_idx
  ON workstation_universities (student_id, position);

-- ── Step 4: Ensure workstation_records exist for all current workstation students

INSERT INTO workstation_records (student_id)
SELECT DISTINCT wu.student_id
FROM workstation_universities wu
WHERE NOT EXISTS (
  SELECT 1 FROM workstation_records wr WHERE wr.student_id = wu.student_id
)
ON CONFLICT (student_id) DO NOTHING;
