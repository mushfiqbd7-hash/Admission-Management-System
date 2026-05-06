// src/controllers/workstationController.js
import { query, getClient } from '../config/database.js';

const WORKSTATION_STATUSES = [
  'approved',
  'processing',
  'pre_admission',
  'admitted',
  'rejected',
  'revoked',
];

const canManageWorkstation = (role) => ['admin', 'staff'].includes(role);

const normalizeText = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const text = String(value).trim();
  return text === '' ? null : text;
};

const ensureDefaultUniversities = async () => {
  await query(
    `
    INSERT INTO workstation_universities (student_id, status, position)
    SELECT
      s.id,
      CASE
        WHEN s.application_status = ANY($1::text[])
        THEN s.application_status
        ELSE 'approved'
      END,
      0
    FROM students s
    WHERE
      (
        s.application_status = ANY($1::text[])
        OR s.application_status = 'pending'
      )
      AND NOT EXISTS (
        SELECT 1
        FROM workstation_universities wu
        WHERE wu.student_id = s.id
      )
    `,
    [WORKSTATION_STATUSES]
  );
};

export const listWorkstationStudents = async (req, res) => {
  try {
    if (!canManageWorkstation(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await ensureDefaultUniversities();

    const {
      search = '',
      status = '',
      page = 1,
      limit = 20,
    } = req.query;

    const pageNo = Math.max(parseInt(page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 500);
    const offset = (pageNo - 1) * pageSize;

    const params = [];
    const wheres = [
      `
      EXISTS (
        SELECT 1
        FROM workstation_universities wu_exists
        WHERE wu_exists.student_id = s.id
      )
      `,
    ];

    if (status && WORKSTATION_STATUSES.includes(status)) {
      params.push(status);
      wheres.push(`COALESCE(primary_wu.status, s.application_status) = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      const p = params.length;

      wheres.push(`
        (
          s.application_number ILIKE $${p}
          OR s.given_name ILIKE $${p}
          OR s.family_name ILIKE $${p}
          OR s.passport_number ILIKE $${p}
          OR s.nationality ILIKE $${p}
          OR s.intended_major ILIKE $${p}
          OR s.target_university ILIKE $${p}
          OR cb.full_name ILIKE $${p}
          OR EXISTS (
            SELECT 1
            FROM workstation_universities wu_search
            WHERE wu_search.student_id = s.id
            AND wu_search.university_name ILIKE $${p}
          )
        )
      `);
    }

    const whereSql = `WHERE ${wheres.join(' AND ')}`;

    const baseJoinSql = `
      FROM students s
      LEFT JOIN users cb ON s.created_by = cb.id
      LEFT JOIN workstation_records wr ON wr.student_id = s.id

      LEFT JOIN LATERAL (
        SELECT
          wu.status,
          wu.university_name
        FROM workstation_universities wu
        WHERE wu.student_id = s.id
        ORDER BY wu.position ASC, wu.created_at ASC
        LIMIT 1
      ) primary_wu ON true

      LEFT JOIN workstation_universities wu ON wu.student_id = s.id
    `;

    const {
      rows: [countRow],
    } = await query(
      `
      SELECT COUNT(DISTINCT s.id)::int AS count
      ${baseJoinSql}
      ${whereSql}
      `,
      params
    );

    const total = countRow?.count || 0;

    const dataParams = [...params, pageSize, offset];
    const limitIndex = dataParams.length - 1;
    const offsetIndex = dataParams.length;

    const { rows } = await query(
      `
      SELECT
        s.id,
        s.application_number,
        s.family_name,
        s.given_name,
        s.nationality,
        s.email,
        s.mobile,
        s.passport_number,
        s.gender,
        s.target_university,
        s.degree_level,
        COALESCE(primary_wu.status, s.application_status) AS application_status,
        s.priority,
        s.created_at,
        s.updated_at,
        s.intended_major,
        s.intended_start_term,
        s.scholarship_type,

        cb.full_name AS submitted_by_name,
        cb.email AS submitted_by_email,
        cb.role AS submitted_by_role,

        COALESCE(wr.payment_of_application, '') AS payment_of_application,
        COALESCE(wr.application_incharge, '') AS application_incharge,
        COALESCE(wr.portal_email, '') AS portal_email,
        COALESCE(wr.portal_password, '') AS portal_password,

        COALESCE(
          json_agg(
            json_build_object(
              'id', wu.id,
              'university_name', COALESCE(wu.university_name, ''),
              'status', COALESCE(wu.status, COALESCE(primary_wu.status, s.application_status)),
              'position', wu.position
            )
            ORDER BY wu.position ASC, wu.created_at ASC
          ) FILTER (WHERE wu.id IS NOT NULL),
          '[]'::json
        ) AS universities,

        COALESCE(
          STRING_AGG(
            NULLIF(wu.university_name, ''),
            '; '
            ORDER BY wu.position ASC, wu.created_at ASC
          ),
          ''
        ) AS workstation_universities

      ${baseJoinSql}
      ${whereSql}

      GROUP BY
        s.id,
        primary_wu.status,
        cb.full_name,
        cb.email,
        cb.role,
        wr.payment_of_application,
        wr.application_incharge,
        wr.portal_email,
        wr.portal_password

      ORDER BY s.created_at DESC
      LIMIT $${limitIndex} OFFSET $${offsetIndex}
      `,
      dataParams
    );

    const { rows: statRows } = await query(
      `
      SELECT
        COALESCE(primary_wu.status, s.application_status) AS application_status,
        COUNT(DISTINCT s.id)::int AS count
      FROM students s

      LEFT JOIN LATERAL (
        SELECT wu.status
        FROM workstation_universities wu
        WHERE wu.student_id = s.id
        ORDER BY wu.position ASC, wu.created_at ASC
        LIMIT 1
      ) primary_wu ON true

      WHERE EXISTS (
        SELECT 1
        FROM workstation_universities wu_exists
        WHERE wu_exists.student_id = s.id
      )

      GROUP BY COALESCE(primary_wu.status, s.application_status)
      `
    );

    const stats = {
      approved: 0,
      processing: 0,
      pre_admission: 0,
      admitted: 0,
      rejected: 0,
      revoked: 0,
    };

    statRows.forEach((r) => {
      if (stats[r.application_status] !== undefined) {
        stats[r.application_status] = r.count;
      }
    });

    res.json({
      data: rows,
      stats,
      pagination: {
        total,
        page: pageNo,
        limit: pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (err) {
    console.error('listWorkstationStudents error:', err);

    res.status(500).json({
      error: 'Internal server error',
      detail: err.message,
    });
  }
};

export const updateWorkstationRecord = async (req, res) => {
  try {
    if (!canManageWorkstation(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { studentId } = req.params;

    const allowedFields = [
      'payment_of_application',
      'application_incharge',
      'portal_email',
      'portal_password',
    ];

    const updates = [];
    const params = [];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        params.push(normalizeText(req.body[field]));
        updates.push(`${field} = $${params.length}`);
      }
    }

    await query(
      `
      INSERT INTO workstation_records (student_id, created_by, updated_by)
      VALUES ($1, $2, $2)
      ON CONFLICT (student_id) DO NOTHING
      `,
      [studentId, req.user.id]
    );

    if (!updates.length) {
      const {
        rows: [record],
      } = await query(
        `
        SELECT *
        FROM workstation_records
        WHERE student_id = $1
        `,
        [studentId]
      );

      return res.json({ record });
    }

    params.push(req.user.id);
    const updatedByIndex = params.length;

    params.push(studentId);
    const studentIdIndex = params.length;

    const {
      rows: [record],
    } = await query(
      `
      UPDATE workstation_records
      SET
        ${updates.join(', ')},
        updated_by = $${updatedByIndex},
        updated_at = NOW()
      WHERE student_id = $${studentIdIndex}
      RETURNING *
      `,
      params
    );

    res.json({
      message: 'Work Station record updated',
      record,
    });
  } catch (err) {
    console.error('updateWorkstationRecord error:', err);

    res.status(500).json({
      error: 'Internal server error',
      detail: err.message,
    });
  }
};

export const createWorkstationUniversity = async (req, res) => {
  try {
    if (!canManageWorkstation(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { studentId } = req.params;
    const universityName = normalizeText(req.body.university_name);

    const status = WORKSTATION_STATUSES.includes(req.body.status)
      ? req.body.status
      : 'approved';

    const {
      rows: [positionRow],
    } = await query(
      `
      SELECT COALESCE(MAX(position), -1) + 1 AS next_position
      FROM workstation_universities
      WHERE student_id = $1
      `,
      [studentId]
    );

    const {
      rows: [university],
    } = await query(
      `
      INSERT INTO workstation_universities
        (student_id, university_name, status, position)
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [studentId, universityName, status, positionRow.next_position]
    );

    res.status(201).json({ university });
  } catch (err) {
    console.error('createWorkstationUniversity error:', err);

    res.status(500).json({
      error: 'Internal server error',
      detail: err.message,
    });
  }
};

export const updateWorkstationUniversity = async (req, res) => {
  const client = await getClient();

  try {
    if (!canManageWorkstation(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { studentId, universityId } = req.params;

    const updates = [];
    const params = [];

    let newStatus = null;

    if (req.body.university_name !== undefined) {
      params.push(normalizeText(req.body.university_name));
      updates.push(`university_name = $${params.length}`);
    }

    if (req.body.status !== undefined) {
      if (!WORKSTATION_STATUSES.includes(req.body.status)) {
        return res.status(400).json({
          error: 'Invalid status',
          allowed: WORKSTATION_STATUSES,
        });
      }

      newStatus = req.body.status;
      params.push(newStatus);
      updates.push(`status = $${params.length}`);
    }

    if (!updates.length) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    await client.query('BEGIN');

    params.push(studentId);
    const studentIdIndex = params.length;

    params.push(universityId);
    const universityIdIndex = params.length;

    const {
      rows: [university],
    } = await client.query(
      `
      UPDATE workstation_universities
      SET
        ${updates.join(', ')},
        updated_at = NOW()
      WHERE student_id = $${studentIdIndex}
      AND id = $${universityIdIndex}
      RETURNING *
      `,
      params
    );

    if (!university) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'University row not found' });
    }

    let updatedStudent = null;

    if (newStatus) {
      const {
        rows: [student],
      } = await client.query(
        `
        UPDATE students
        SET application_status = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING id, application_status
        `,
        [newStatus, studentId]
      );

      if (!student) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Student not found' });
      }

      updatedStudent = student;
    }

    await client.query('COMMIT');

    res.json({
      message: 'University row updated',
      university,
      student: updatedStudent,
      application_status: newStatus,
    });
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {}

    console.error('updateWorkstationUniversity error:', err);

    res.status(500).json({
      error: 'Internal server error',
      detail: err.message,
      code: err.code,
      constraint: err.constraint,
    });
  } finally {
    client.release();
  }
};

export const deleteWorkstationUniversity = async (req, res) => {
  try {
    if (!canManageWorkstation(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { studentId, universityId } = req.params;

    const {
      rows: [countRow],
    } = await query(
      `
      SELECT COUNT(*)::int AS count
      FROM workstation_universities
      WHERE student_id = $1
      `,
      [studentId]
    );

    if ((countRow?.count || 0) <= 1) {
      return res.status(400).json({
        error: 'At least one university row is required',
      });
    }

    const {
      rows: [deleted],
    } = await query(
      `
      DELETE FROM workstation_universities
      WHERE student_id = $1
      AND id = $2
      RETURNING id
      `,
      [studentId, universityId]
    );

    if (!deleted) {
      return res.status(404).json({ error: 'University row not found' });
    }

    res.json({
      message: 'University row deleted',
      id: deleted.id,
    });
  } catch (err) {
    console.error('deleteWorkstationUniversity error:', err);

    res.status(500).json({
      error: 'Internal server error',
      detail: err.message,
    });
  }
};

export const exportWorkstationStudents = async (req, res) => {
  try {
    if (!canManageWorkstation(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await ensureDefaultUniversities();

    const { rows } = await query(
      `
      SELECT
        s.id,
        s.application_number,
        s.family_name,
        s.given_name,
        s.nationality,
        s.email,
        s.mobile,
        s.passport_number,
        s.gender,
        s.target_university,
        s.degree_level,
        COALESCE(primary_wu.status, s.application_status) AS application_status,
        s.priority,
        s.created_at,
        s.updated_at,
        s.intended_major,
        s.intended_start_term,
        s.scholarship_type,

        cb.full_name AS submitted_by_name,
        cb.email AS submitted_by_email,
        cb.role AS submitted_by_role,

        COALESCE(wr.payment_of_application, '') AS payment_of_application,
        COALESCE(wr.application_incharge, '') AS application_incharge,
        COALESCE(wr.portal_email, '') AS portal_email,
        COALESCE(wr.portal_password, '') AS portal_password,

        COALESCE(
          json_agg(
            json_build_object(
              'id', wu.id,
              'university_name', COALESCE(wu.university_name, ''),
              'status', COALESCE(wu.status, COALESCE(primary_wu.status, s.application_status)),
              'position', wu.position
            )
            ORDER BY wu.position ASC, wu.created_at ASC
          ) FILTER (WHERE wu.id IS NOT NULL),
          '[]'::json
        ) AS universities,

        COALESCE(
          STRING_AGG(
            NULLIF(wu.university_name, ''),
            '; '
            ORDER BY wu.position ASC, wu.created_at ASC
          ),
          ''
        ) AS workstation_universities

      FROM students s
      LEFT JOIN users cb ON s.created_by = cb.id
      LEFT JOIN workstation_records wr ON wr.student_id = s.id

      LEFT JOIN LATERAL (
        SELECT
          wu.status,
          wu.university_name
        FROM workstation_universities wu
        WHERE wu.student_id = s.id
        ORDER BY wu.position ASC, wu.created_at ASC
        LIMIT 1
      ) primary_wu ON true

      LEFT JOIN workstation_universities wu ON wu.student_id = s.id

      WHERE EXISTS (
        SELECT 1
        FROM workstation_universities wu_exists
        WHERE wu_exists.student_id = s.id
      )

      GROUP BY
        s.id,
        primary_wu.status,
        cb.full_name,
        cb.email,
        cb.role,
        wr.payment_of_application,
        wr.application_incharge,
        wr.portal_email,
        wr.portal_password

      ORDER BY s.created_at DESC
      `
    );

    res.json({ rows });
  } catch (err) {
    console.error('exportWorkstationStudents error:', err);

    res.status(500).json({
      error: 'Export failed',
      detail: err.message,
    });
  }
};