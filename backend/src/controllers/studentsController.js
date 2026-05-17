// src/controllers/studentsController.js
// VERSION: 2026-FIXED — Applications + Work Station visibility fixed

import { query, getClient } from '../config/database.js';
import { createNotification, notifyAdminsAndStaff, statusLabel } from '../utils/notifications.js';

const canSeeAll = (role) => ['admin', 'staff'].includes(role);

// Empty string / undefined / null → null
const n = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const s = String(v).trim();
  return s === '' ? null : s;
};

// ── List students ─────────────────────────────────────────────────────────────
export const listStudents = async (req, res) => {
  try {
    const {
      search = '',
      status = '',
      priority = '',
      page = 1,
      limit = 20,
      sort = 'created_at',
      order = 'desc',
    } = req.query;

    const currentPage = Math.max(parseInt(page) || 1, 1);
    const pageLimit = Math.max(parseInt(limit) || 20, 1);
    const offset = (currentPage - 1) * pageLimit;

    const params = [];
    const wheres = [];

    if (!canSeeAll(req.user.role)) {
      // Student/agent see only their own applications, including draft.
      params.push(req.user.id);
      wheres.push(`s.created_by = $${params.length}`);
    }

    if (search && String(search).trim()) {
      params.push(`%${String(search).trim()}%`);
      const p = params.length;

      wheres.push(`
        (
          s.family_name ILIKE $${p}
          OR s.given_name ILIKE $${p}
          OR s.passport_number ILIKE $${p}
          OR s.email ILIKE $${p}
          OR s.mobile ILIKE $${p}
          OR s.target_university ILIKE $${p}
          OR s.application_number ILIKE $${p}
          OR s.intended_major ILIKE $${p}
          OR cb.full_name ILIKE $${p}
          OR cb.email ILIKE $${p}
        )
      `);
    }

    if (status && String(status).trim()) {
      params.push(String(status).trim());
      wheres.push(`s.application_status = $${params.length}`);
    }

    if (priority && String(priority).trim()) {
      params.push(String(priority).trim());
      wheres.push(`s.priority = $${params.length}`);
    }

    const where = wheres.length ? `WHERE ${wheres.join(' AND ')}` : '';

    const allowedSort = [
      'created_at',
      'updated_at',
      'family_name',
      'given_name',
      'application_status',
      'application_number',
    ];

    const safeSort = allowedSort.includes(sort) ? sort : 'created_at';
    const safeOrder = String(order).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const countResult = await query(
      `
      SELECT COUNT(*)
      FROM students s
      LEFT JOIN users cb ON s.created_by = cb.id
      ${where}
      `,
      params
    );

    const total = parseInt(countResult.rows[0]?.count || 0);

    params.push(pageLimit);
    params.push(offset);

    const { rows } = await query(
      `
      SELECT
        s.id,
        s.application_number,
        s.family_name,
        s.given_name,
        s.chinese_name,
        s.date_of_birth,
        s.gender,
        s.nationality,
        s.email,
        s.mobile,
        s.whatsapp,
        s.wechat_id,
        s.passport_number,
        s.target_university,
        s.intended_major,
        s.scholarship_type,
        s.degree_level,
        s.intended_start_term,
        s.application_status,
        s.priority,
        s.created_at,
        s.updated_at,
        s.payment_of_application,
        s.application_incharge,
        s.university_applied,
        s.ws_status,
        u.full_name AS assigned_to_name,
        cb.full_name AS submitted_by_name,
        cb.email AS submitted_by_email,
        cb.role AS submitted_by_role
      FROM students s
      LEFT JOIN users u ON s.assigned_to = u.id
      LEFT JOIN users cb ON s.created_by = cb.id
      ${where}
      ORDER BY s.${safeSort} ${safeOrder}
      LIMIT $${params.length - 1}
      OFFSET $${params.length}
      `,
      params
    );

    res.json({
      data: rows,
      pagination: {
        total,
        page: currentPage,
        limit: pageLimit,
        totalPages: Math.ceil(total / pageLimit),
      },
    });
  } catch (err) {
    console.error('listStudents error:', err);
    res.status(500).json({
      error: 'Internal server error',
      detail: err.message,
    });
  }
};

// ── Get single student ────────────────────────────────────────────────────────
export const getStudent = async (req, res) => {
  try {
    const { id } = req.params;

    const { rows: [student] } = await query(
      'SELECT * FROM students WHERE id = $1',
      [id]
    );

    if (!student) return res.status(404).json({ error: 'Student not found' });

    // Admin/staff can open every application, including draft.
    // Student/agent can open only their own.
    if (!canSeeAll(req.user.role) && student.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [addr, pass, edu, china, fin, lang, work, docs, notes] = await Promise.all([
      query('SELECT * FROM student_addresses WHERE student_id = $1', [id]),
      query('SELECT * FROM student_passport WHERE student_id = $1', [id]),
      query('SELECT * FROM student_education WHERE student_id = $1 ORDER BY start_date DESC', [id]),
      query('SELECT * FROM student_china_experience WHERE student_id = $1', [id]),
      query('SELECT * FROM student_financial WHERE student_id = $1', [id]),
      query('SELECT * FROM student_language WHERE student_id = $1', [id]),
      query('SELECT * FROM student_work_experience WHERE student_id = $1 ORDER BY start_date DESC', [id]),
      query(`
        SELECT
          id,
          student_id,
          doc_key,
          doc_label,
          is_required,
          file_name,
          file_size,
          mime_type,
          uploaded_at,
          uploaded_by
        FROM student_documents
        WHERE student_id = $1
        ORDER BY doc_key
      `, [id]),
      query(
        `
        SELECT n.*, u.full_name AS author
        FROM student_notes n
        LEFT JOIN users u ON n.created_by = u.id
        WHERE n.student_id = $1
        ORDER BY n.created_at DESC
        `,
        [id]
      ),
    ]);

    res.json({
      student,
      addresses: addr.rows,
      passport: pass.rows[0] || null,
      education: edu.rows,
      china: china.rows[0] || null,
      financial: fin.rows[0] || null,
      languages: lang.rows,
      work: work.rows,
      documents: docs.rows,
      notes: notes.rows,
    });
  } catch (err) {
    console.error('getStudent error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── Create student ────────────────────────────────────────────────────────────
export const createStudent = async (req, res) => {
  const client = await getClient();

  let sid = null;
  let submitStatus = 'draft';
  let givenName = '';
  let familyName = '';

  try {
    await client.query('BEGIN');

    const {
      family_name,
      given_name,
      chinese_name,
      date_of_birth,
      gender,
      nationality,
      email,
      mobile,
      whatsapp,
      wechat_id,
      target_university,
      intended_major,
      scholarship_type,
      degree_level,
      intended_start_term,
      passport_number,
      priority,
      application_status,
      addresses,
      passport,
      education,
      financial,
    } = req.body;

    givenName = given_name || '';
    familyName = family_name || '';

    submitStatus = canSeeAll(req.user.role)
      ? application_status || 'pending'
      : application_status === 'pending'
        ? 'pending'
        : 'draft';

    const { rows: colCheck } = await client.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='scholarship_type'`
    );

    const hasScholarshipCol = colCheck.length > 0;

    const today = new Date().toISOString().slice(0, 10);
    const dateStr = today.replace(/-/g, '');

    // Self-heal: ensure the daily-sequence table exists even if migration 017
    // wasn't applied to this database (common when the Supabase project was
    // created before the migration was added). Cheap idempotent DDL.
    await client.query(`
      CREATE TABLE IF NOT EXISTS application_number_daily_seq (
        app_date DATE PRIMARY KEY,
        last_seq INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const {
      rows: [seqRow],
    } = await client.query(
      `
      INSERT INTO application_number_daily_seq (app_date, last_seq)
      VALUES ($1, 1)
      ON CONFLICT (app_date)
      DO UPDATE SET
        last_seq = application_number_daily_seq.last_seq + 1,
        updated_at = NOW()
      RETURNING last_seq
      `,
      [today]
    );

    const appNum = `${dateStr}-${String(seqRow.last_seq).padStart(4, '0')}`;

    const cols = [
      'family_name',
      'given_name',
      'chinese_name',
      'date_of_birth',
      'gender',
      'nationality',
      'email',
      'mobile',
      'whatsapp',
      'wechat_id',
      'target_university',
      'intended_major',
      'degree_level',
      'intended_start_term',
      'passport_number',
      'priority',
      'application_status',
      'application_number',
      'created_by',
    ];

    const vals = [
      n(family_name),
      n(given_name),
      n(chinese_name),
      n(date_of_birth),
      n(gender),
      n(nationality),
      n(email),
      n(mobile),
      n(whatsapp),
      n(wechat_id),
      n(target_university),
      n(intended_major),
      n(degree_level),
      n(intended_start_term),
      n(passport_number),
      priority || 'normal',
      submitStatus,
      appNum,
      req.user.id,
    ];

    if (hasScholarshipCol) {
      cols.splice(12, 0, 'scholarship_type');
      vals.splice(12, 0, n(scholarship_type));
    }

    const placeholders = vals.map((_, i) => `$${i + 1}`).join(',');

    const { rows: [student] } = await client.query(
      `INSERT INTO students (${cols.join(',')}) VALUES (${placeholders}) RETURNING *`,
      vals
    );

    sid = student.id;

    if (addresses?.length) {
      for (const a of addresses) {
        await client.query(
          `
          INSERT INTO student_addresses
            (student_id, address_type, country, street_address, city, state_province, postal_code)
          VALUES ($1,$2,$3,$4,$5,$6,$7)
          ON CONFLICT (student_id, address_type) DO UPDATE
          SET country=$3, street_address=$4, city=$5, state_province=$6, postal_code=$7
          `,
          [
            sid,
            a.address_type,
            n(a.country),
            n(a.street_address),
            n(a.city),
            n(a.state_province),
            n(a.postal_code),
          ]
        );
      }
    }

    if (passport) {
      await client.query(
        `
        INSERT INTO student_passport
          (student_id, passport_number, issuing_country, issue_date, expiry_date, place_of_issue,
           has_china_visa, visa_type, visa_number, visa_issue_date, visa_expiry_date)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (student_id) DO UPDATE
        SET passport_number=$2,
            issuing_country=$3,
            issue_date=$4,
            expiry_date=$5,
            place_of_issue=$6,
            has_china_visa=$7,
            visa_type=$8,
            visa_number=$9,
            visa_issue_date=$10,
            visa_expiry_date=$11
        `,
        [
          sid,
          n(passport.passport_number),
          n(passport.issuing_country),
          n(passport.issue_date),
          n(passport.expiry_date),
          n(passport.place_of_issue),
          passport.has_china_visa || false,
          n(passport.visa_type),
          n(passport.visa_number),
          n(passport.visa_issue_date),
          n(passport.visa_expiry_date),
        ]
      );
    }

    if (education?.length) {
      for (const e of education) {
        if (!e.institution_name && !e.country && !e.degree_obtained && !e.field_of_study) continue;

        await client.query(
          `
          INSERT INTO student_education
            (student_id, institution_name, country, degree_obtained, field_of_study,
             start_date, end_date, gpa, is_highest)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
          `,
          [
            sid,
            n(e.institution_name),
            n(e.country),
            n(e.degree_obtained),
            n(e.field_of_study),
            n(e.start_date),
            n(e.end_date),
            e.gpa ? Number(e.gpa) : null,
            e.is_highest || false,
          ]
        );
      }
    }

    if (financial) {
      await client.query(
        `
        INSERT INTO student_financial
          (student_id, supporter_name, relationship, occupation,
           annual_income_amount, annual_income_currency, phone, email,
           bank_name, account_holder_name, current_balance)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (student_id) DO UPDATE
        SET supporter_name=$2,
            relationship=$3,
            occupation=$4,
            annual_income_amount=$5,
            annual_income_currency=$6,
            phone=$7,
            email=$8,
            bank_name=$9,
            account_holder_name=$10,
            current_balance=$11
        `,
        [
          sid,
          n(financial.supporter_name),
          n(financial.relationship),
          n(financial.occupation),
          financial.annual_income_amount || null,
          financial.annual_income_currency || 'USD',
          n(financial.phone),
          n(financial.email),
          n(financial.bank_name),
          n(financial.account_holder_name),
          financial.current_balance || null,
        ]
      );
    }

    await client.query(
      `
      INSERT INTO audit_log (user_id, action, entity_type, entity_id, details, ip_address)
      VALUES ($1, 'CREATE', 'student', $2, $3, $4)
      `,
      [req.user.id, sid, JSON.stringify({ name: `${givenName} ${familyName}` }), req.ip]
    );

    await client.query('COMMIT');

    res.status(201).json({ message: 'Student created', student });
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {}

    console.error('createStudent error:', err);

    if (!res.headersSent) {
      res.status(500).json({
        error: 'Internal server error',
        detail: err.message,
        code: err.code,
      });
    }
  } finally {
    client.release();
  }

  if (sid && submitStatus !== 'draft') {
    notifyAdminsAndStaff({
      applicationId: sid,
      type: 'info',
      message: `New application submitted by ${givenName} ${familyName}`.trim(),
      link: `/students/${sid}`,
    }).catch(() => {});
  }
};

// ── Update student ────────────────────────────────────────────────────────────
export const updateStudent = async (req, res) => {
  const client = await getClient();

  try {
    const { id } = req.params;

    await client.query('BEGIN');

    const { rows: [existing] } = await client.query(
      'SELECT id, created_by, application_status FROM students WHERE id = $1',
      [id]
    );

    if (!existing) return res.status(404).json({ error: 'Student not found' });

    if (!canSeeAll(req.user.role) && existing.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { rows: dbColRows } = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name='students'`
    );

    const dbCols = new Set(dbColRows.map((r) => r.column_name));

    const fields = [
      'family_name',
      'given_name',
      'chinese_name',
      'date_of_birth',
      'gender',
      'nationality',
      'email',
      'mobile',
      'whatsapp',
      'wechat_id',
      'target_university',
      'intended_major',
      'scholarship_type',
      'degree_level',
      'intended_start_term',
      'passport_number',
      'priority',
      'payment_of_application',
      'application_incharge',
      'university_applied',
      'ws_status',
    ];

    const nullables = new Set([
      'gender',
      'degree_level',
      'date_of_birth',
      'chinese_name',
      'whatsapp',
      'wechat_id',
      'intended_major',
      'scholarship_type',
      'intended_start_term',
      'passport_number',
      'nationality',
      'email',
      'mobile',
      'target_university',
      'payment_of_application',
      'application_incharge',
      'university_applied',
      'ws_status',
    ]);

    const updates = [];
    const params = [];

    if (req.body.application_status !== undefined) {
      const requestedStatus = req.body.application_status;

      const validStatuses = [
        'draft',
        'pending',
        'approved',
        'revoked',
        'processing',
        'pre_admission',
        'admitted',
        'rejected',
      ];

      if (!validStatuses.includes(requestedStatus)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Invalid status' });
      }

      if (canSeeAll(req.user.role)) {
        params.push(requestedStatus);
        updates.push(`application_status = $${params.length}`);
      } else {
        const canSubmitDraft =
          existing.application_status === 'draft' && requestedStatus === 'pending';

        if (!canSubmitDraft) {
          await client.query('ROLLBACK');
          return res.status(403).json({
            error: 'Students and agents can only submit draft applications for review',
          });
        }

        params.push('pending');
        updates.push(`application_status = $${params.length}`);
      }
    }


    for (const f of fields) {
      if (!dbCols.has(f)) continue;

      if (req.body[f] !== undefined) {
        params.push(nullables.has(f) ? n(req.body[f]) : req.body[f]);
        updates.push(`${f} = $${params.length}`);
      }
    }

    if (updates.length) {
      params.push(id);

      await client.query(
        `UPDATE students SET ${updates.join(', ')} WHERE id = $${params.length}`,
        params
      );
    }

    const { addresses, passport, education, financial } = req.body;

    if (addresses?.length) {
      for (const a of addresses) {
        await client.query(
          `
          INSERT INTO student_addresses
            (student_id, address_type, country, street_address, city, state_province, postal_code)
          VALUES ($1,$2,$3,$4,$5,$6,$7)
          ON CONFLICT (student_id, address_type) DO UPDATE
          SET country=$3, street_address=$4, city=$5, state_province=$6, postal_code=$7
          `,
          [
            id,
            a.address_type,
            n(a.country),
            n(a.street_address),
            n(a.city),
            n(a.state_province),
            n(a.postal_code),
          ]
        );
      }
    }

    if (passport) {
      await client.query(
        `
        INSERT INTO student_passport
          (student_id, passport_number, issuing_country, issue_date, expiry_date, place_of_issue,
           has_china_visa, visa_type, visa_number, visa_issue_date, visa_expiry_date)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (student_id) DO UPDATE
        SET passport_number=$2,
            issuing_country=$3,
            issue_date=$4,
            expiry_date=$5,
            place_of_issue=$6,
            has_china_visa=$7,
            visa_type=$8,
            visa_number=$9,
            visa_issue_date=$10,
            visa_expiry_date=$11
        `,
        [
          id,
          n(passport.passport_number),
          n(passport.issuing_country),
          n(passport.issue_date),
          n(passport.expiry_date),
          n(passport.place_of_issue),
          passport.has_china_visa || false,
          n(passport.visa_type),
          n(passport.visa_number),
          n(passport.visa_issue_date),
          n(passport.visa_expiry_date),
        ]
      );
    }

    if (education !== undefined) {
      await client.query('DELETE FROM student_education WHERE student_id = $1', [id]);

      for (const e of education || []) {
        if (!e.institution_name && !e.country && !e.degree_obtained && !e.field_of_study) continue;

        await client.query(
          `
          INSERT INTO student_education
            (student_id, institution_name, country, degree_obtained, field_of_study,
             start_date, end_date, gpa, is_highest)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
          `,
          [
            id,
            n(e.institution_name),
            n(e.country),
            n(e.degree_obtained),
            n(e.field_of_study),
            n(e.start_date),
            n(e.end_date),
            e.gpa ? Number(e.gpa) : null,
            e.is_highest || false,
          ]
        );
      }
    }

    if (financial) {
      await client.query(
        `
        INSERT INTO student_financial
          (student_id, supporter_name, relationship, occupation,
           annual_income_amount, annual_income_currency, phone, email,
           bank_name, account_holder_name, current_balance)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (student_id) DO UPDATE
        SET supporter_name=$2,
            relationship=$3,
            occupation=$4,
            annual_income_amount=$5,
            annual_income_currency=$6,
            phone=$7,
            email=$8,
            bank_name=$9,
            account_holder_name=$10,
            current_balance=$11
        `,
        [
          id,
          n(financial.supporter_name),
          n(financial.relationship),
          n(financial.occupation),
          financial.annual_income_amount || null,
          financial.annual_income_currency || 'USD',
          n(financial.phone),
          n(financial.email),
          n(financial.bank_name),
          n(financial.account_holder_name),
          financial.current_balance || null,
        ]
      );
    }

    await client.query(
      `
      INSERT INTO audit_log (user_id, action, entity_type, entity_id, ip_address)
      VALUES ($1, 'UPDATE', 'student', $2, $3)
      `,
      [req.user.id, id, req.ip]
    );

    await client.query('COMMIT');

    const { rows: [updated] } = await query(
      'SELECT * FROM students WHERE id = $1',
      [id]
    );

    res.json({ message: 'Student updated', student: updated });

    if (existing.application_status === 'draft' && req.body.application_status === 'pending') {
      notifyAdminsAndStaff({
        applicationId: id,
        type: 'info',
        message: `New application submitted by ${updated.given_name} ${updated.family_name}`.trim(),
        link: `/students/${id}`,
      }).catch(() => {});
    }
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {}

    console.error('updateStudent error:', err);

    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error', detail: err.message });
    }
  } finally {
    client.release();
  }
};

// ── Delete student ────────────────────────────────────────────────────────────
export const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;

    if (!canSeeAll(req.user.role)) {
      const { rows: [r] } = await query(
        'SELECT created_by FROM students WHERE id = $1',
        [id]
      );

      if (!r) return res.status(404).json({ error: 'Student not found' });
      if (r.created_by !== req.user.id) return res.status(403).json({ error: 'Access denied' });
    }

    const { rows: [r] } = await query(
      'DELETE FROM students WHERE id = $1 RETURNING id, family_name, given_name',
      [id]
    );

    if (!r) return res.status(404).json({ error: 'Student not found' });

    await query(
      `
      INSERT INTO audit_log (user_id, action, entity_type, entity_id, details, ip_address)
      VALUES ($1, 'DELETE', 'student', $2, $3, $4)
      `,
      [req.user.id, id, JSON.stringify({ name: `${r.family_name} ${r.given_name}` }), req.ip]
    );

    res.json({ message: 'Student deleted successfully' });
  } catch (err) {
    console.error('deleteStudent error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── Update status ─────────────────────────────────────────────────────────────
export const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const valid = [
      'draft',
      'pending',
      'approved',
      'revoked',
      'processing',
      'pre_admission',
      'admitted',
      'rejected',
    ];

    if (!valid.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const {
      rows: [existing],
    } = await query(
      'SELECT id, created_by, application_status FROM students WHERE id = $1',
      [id]
    );

    if (!existing) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (!canSeeAll(req.user.role)) {
      if (existing.created_by !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const canSubmitDraft =
        existing.application_status === 'draft' && status === 'pending';

      if (!canSubmitDraft) {
        return res.status(403).json({
          error: 'Students and agents can only submit draft applications for review',
        });
      }
    }

    const {
      rows: [r],
    } = await query(
      `
      UPDATE students
      SET application_status = $1
      WHERE id = $2
      RETURNING id, application_status, given_name, family_name, created_by
      `,
      [status, id]
    );

    await query(
      `
      INSERT INTO audit_log (user_id, action, entity_type, entity_id, details, ip_address)
      VALUES ($1, 'STATUS_CHANGE', 'student', $2, $3, $4)
      `,
      [req.user.id, id, JSON.stringify({ new_status: status }), req.ip]
    );

    res.json({ message: 'Status updated', student: r });

    if (r.created_by && r.created_by !== req.user.id) {
      createNotification({
        userId: r.created_by,
        applicationId: id,
        type: 'info',
        message: `Your application status has been updated to "${statusLabel(status)}"`,
        link: `/students/${id}`,
      }).catch(() => {});
    }

    if (
      existing.application_status === 'draft' &&
      status === 'pending' &&
      r.created_by === req.user.id
    ) {
      notifyAdminsAndStaff({
        applicationId: id,
        type: 'info',
        message: `New application submitted by ${r.given_name} ${r.family_name}`.trim(),
        link: `/students/${id}`,
      }).catch(() => {});
    }
  } catch (err) {
    console.error('updateStatus error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── Add note ──────────────────────────────────────────────────────────────────
export const addNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    if (!note?.trim()) {
      return res.status(400).json({ error: 'Note is required' });
    }

    if (!canSeeAll(req.user.role)) {
      return res.status(403).json({ error: 'Only admin or staff can add notes' });
    }

    const { rows: [r] } = await query(
      'INSERT INTO student_notes (student_id, note, created_by) VALUES ($1,$2,$3) RETURNING *',
      [id, note.trim(), req.user.id]
    );

    res.status(201).json({ note: r });

    query('SELECT created_by FROM students WHERE id = $1', [id])
      .then(({ rows: [s] }) => {
        if (s?.created_by && s.created_by !== req.user.id) {
          createNotification({
            userId: s.created_by,
            applicationId: id,
            type: 'info',
            message: 'A staff member added a note to your application',
            link: `/students/${id}`,
          }).catch(() => {});
        }
      })
      .catch(() => {});
  } catch (err) {
    console.error('addNote error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── Dashboard stats ───────────────────────────────────────────────────────────
export const getStats = async (req, res) => {
  try {
    const params = [];
    let where = '';

    const recentParams = [];
    let recentWhere = '';

    // Admin/staff dashboard should NOT count draft applications.
    if (canSeeAll(req.user.role)) {
      where = `WHERE application_status != 'draft'`;
      recentWhere = `WHERE s.application_status != 'draft'`;
    } else {
      params.push(req.user.id);
      where = `WHERE created_by = $${params.length}`;

      recentParams.push(req.user.id);
      recentWhere = `WHERE s.created_by = $${recentParams.length}`;
    }

    const [totals, recent] = await Promise.all([
      query(
        `
        SELECT
          COUNT(*) FILTER (WHERE true) AS total,
          COUNT(*) FILTER (WHERE application_status='pending') AS pending,
          COUNT(*) FILTER (WHERE application_status='approved') AS approved,
          COUNT(*) FILTER (WHERE application_status='processing') AS processing,
          COUNT(*) FILTER (WHERE application_status='pre_admission') AS pre_admission,
          COUNT(*) FILTER (WHERE application_status='admitted') AS admitted,
          COUNT(*) FILTER (WHERE application_status='rejected') AS rejected,
          COUNT(*) FILTER (WHERE application_status='revoked') AS revoked,
          COUNT(*) FILTER (WHERE priority='high') AS high_priority
        FROM students
        ${where}
        `,
        params
      ),

      query(
        `
        SELECT
          s.id,
          s.application_number,
          s.family_name,
          s.given_name,
          s.passport_number,
          s.target_university,
          s.application_status,
          s.priority,
          s.created_at,
          cb.full_name AS submitted_by_name,
          cb.email AS submitted_by_email,
          cb.role AS submitted_by_role
        FROM students s
        LEFT JOIN users cb ON s.created_by = cb.id
        ${recentWhere}
        ORDER BY s.created_at DESC
        LIMIT 10
        `,
        recentParams
      ),
    ]);

    res.json({
      stats: totals.rows[0],
      recent: recent.rows,
    });
  } catch (err) {
    console.error('getStats error:', err);
    res.status(500).json({
      error: 'Internal server error',
      detail: err.message,
    });
  }
};
