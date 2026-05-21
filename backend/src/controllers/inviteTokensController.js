// src/controllers/inviteTokensController.js
import crypto from 'crypto';
import { query } from '../config/database.js';
import { createStudent, updateStudent } from './studentsController.js';
import { uploadBuffer } from '../utils/azureStorage.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

const lookupToken = async (token) => {
  const { rows } = await query(
    `SELECT * FROM application_invite_tokens
     WHERE token = $1 AND used_at IS NULL AND expires_at > NOW()`,
    [token]
  );
  return rows[0] || null;
};

// ── Middleware ────────────────────────────────────────────────────────────────

/** Validate invite token, inject req.user = token owner, attach req.tokenRecord */
export const requireToken = async (req, res, next) => {
  try {
    const rec = await lookupToken(req.params.token);
    if (!rec) {
      return res.status(410).json({ error: 'This application link is invalid or has already been used.' });
    }
    req.tokenRecord = rec;
    // Inject fake user so existing controller helpers work unchanged
    req.user = { id: rec.created_by, role: 'agent' };
    next();
  } catch (err) {
    console.error('requireToken error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/** Ensure URL :id matches the student already associated with this token */
export const requireTokenStudent = (req, res, next) => {
  const expectedId = req.tokenRecord?.student_id;
  const requestedId = parseInt(req.params.id, 10);
  if (!expectedId || expectedId !== requestedId) {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
};

// ── Authenticated endpoints ───────────────────────────────────────────────────

/** POST /api/invite-tokens — generate a new single-use link */
export const generateToken = async (req, res) => {
  try {
    if (!['admin', 'staff', 'agent'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const token = crypto.randomBytes(24).toString('hex'); // 48-char hex
    const { rows } = await query(
      `INSERT INTO application_invite_tokens (token, created_by)
       VALUES ($1, $2)
       RETURNING token, expires_at, created_at`,
      [token, req.user.id]
    );
    res.json({
      token: rows[0].token,
      expires_at: rows[0].expires_at,
    });
  } catch (err) {
    console.error('generateToken error:', err);
    res.status(500).json({ error: 'Failed to generate link' });
  }
};

/** GET /api/invite-tokens — list own active (unused, non-expired) tokens */
export const listTokens = async (req, res) => {
  try {
    const isAdminStaff = ['admin', 'staff'].includes(req.user.role);
    const baseWhere = `used_at IS NULL AND expires_at > NOW()`;
    const { rows } = await query(
      `SELECT t.token, t.expires_at, t.created_at, t.student_id,
              u.full_name AS created_by_name
       FROM application_invite_tokens t
       JOIN users u ON u.id = t.created_by
       WHERE ${baseWhere} ${isAdminStaff ? '' : 'AND t.created_by = $1'}
       ORDER BY t.created_at DESC`,
      isAdminStaff ? [] : [req.user.id]
    );
    res.json({ tokens: rows });
  } catch (err) {
    console.error('listTokens error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ── Public endpoints (no auth required) ──────────────────────────────────────

/** GET /api/apply/:token — validate token */
export const validateToken = async (req, res) => {
  try {
    const rec = await lookupToken(req.params.token);
    if (!rec) return res.status(410).json({ valid: false, error: 'Link invalid or expired' });
    res.json({ valid: true });
  } catch (err) {
    console.error('validateToken error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/** POST /api/apply/:token/students — create student draft, bind to token */
export const publicCreateStudent = async (req, res) => {
  // Intercept res.json so we can save student_id on the token record
  const origJson = res.json.bind(res);
  res.json = async (body) => {
    const studentId = body?.student?.id;
    if (studentId) {
      try {
        await query(
          `UPDATE application_invite_tokens SET student_id = $1 WHERE token = $2`,
          [studentId, req.tokenRecord.token]
        );
      } catch (e) {
        console.error('Failed to bind student_id to token:', e);
      }
    }
    return origJson(body);
  };
  await createStudent(req, res);
};

/** PUT /api/apply/:token/students/:id — update student draft */
export const publicUpdateStudent = async (req, res) => {
  await updateStudent(req, res);
};

/** POST /api/apply/:token/students/:id/submit — finalize: push docs → Azure, set pending, mark token used */
export const publicSubmit = async (req, res) => {
  try {
    const { id } = req.params;
    const tokenStr = req.tokenRecord.token;

    // Push any bytea-held draft docs to Azure
    const { rows: draftDocs } = await query(
      `SELECT id, file_name, file_data, mime_type
       FROM student_documents
       WHERE student_id = $1 AND file_data IS NOT NULL`,
      [id]
    );
    for (const doc of draftDocs) {
      try {
        const ext = doc.file_name?.includes('.')
          ? doc.file_name.slice(doc.file_name.lastIndexOf('.')).toLowerCase()
          : '';
        const blobName = `documents/${id}/${doc.id}_${Date.now()}${ext}`;
        await uploadBuffer(blobName, doc.file_data, doc.mime_type);
        await query(
          `UPDATE student_documents SET file_path = $1, file_data = NULL WHERE id = $2`,
          [blobName, doc.id]
        );
      } catch (blobErr) {
        console.error('Blob push error (public submit):', blobErr);
      }
    }

    // Set application to pending
    await query(`UPDATE students SET application_status = 'pending' WHERE id = $1`, [id]);

    // Mark token as used
    await query(`UPDATE application_invite_tokens SET used_at = NOW() WHERE token = $1`, [tokenStr]);

    res.json({ success: true });
  } catch (err) {
    console.error('publicSubmit error:', err);
    res.status(500).json({ error: 'Submission failed' });
  }
};
