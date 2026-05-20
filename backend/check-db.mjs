import pool from "./src/config/database.js";

const sql = `
SELECT
  current_database() AS db,
  (SELECT COUNT(*) FROM students WHERE application_status <> 'draft') AS non_draft_students,
  (SELECT COUNT(*) FROM workstation_universities) AS ws_rows,
  (SELECT COUNT(*) FROM workstation_universities WHERE university_name ILIKE '%Yunnan%') AS yunnan_rows
`;

const r = await pool.query(sql);
console.table(r.rows);

await pool.end();
