// src/controllers/documentsController.js
import multer from 'multer';
import path from 'path';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { query } from '../config/database.js';
import dotenv from 'dotenv';
dotenv.config();

const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(uploadDir, req.params.id || 'tmp');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${req.body.doc_key || 'doc'}_${Date.now()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error('Invalid file type. Allowed: PDF, JPG, PNG, DOC, DOCX'));
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: (parseFloat(process.env.MAX_FILE_SIZE_MB || '1.5')) * 1024 * 1024 },
});

const canManageAllDocuments = (role) => ['admin', 'staff'].includes(role);

const canAccessStudentDocuments = async (user, studentId) => {
  if (canManageAllDocuments(user.role)) return true;

  const { rows } = await query(
    'SELECT id FROM students WHERE id = $1 AND created_by = $2',
    [studentId, user.id]
  );

  return rows.length > 0;
};

const removeUploadedFileIfNeeded = (file) => {
  try {
    if (file?.path) unlinkSync(file.path);
  } catch (_) {}
};

const publicDocumentFields = `
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
`;

export const uploadDocument = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { id } = req.params;
    const { doc_key, doc_label, is_required } = req.body;

    const hasAccess = await canAccessStudentDocuments(req.user, id);
    if (!hasAccess) {
      removeUploadedFileIfNeeded(req.file);
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!doc_key) {
      removeUploadedFileIfNeeded(req.file);
      return res.status(400).json({ error: 'doc_key is required' });
    }

    const { rows } = await query(`
      INSERT INTO student_documents
        (student_id, doc_key, doc_label, is_required, file_name, file_path, file_size, mime_type, uploaded_at, uploaded_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),$9)
      ON CONFLICT (student_id, doc_key) DO UPDATE SET
        doc_label=$3, is_required=$4, file_name=$5, file_path=$6,
        file_size=$7, mime_type=$8, uploaded_at=NOW(), uploaded_by=$9
      RETURNING ${publicDocumentFields}
    `, [
      id, doc_key, doc_label || doc_key,
      is_required === 'true' || is_required === true,
      req.file.originalname, req.file.path,
      req.file.size, req.file.mimetype, req.user.id,
    ]);

    res.json({ document: rows[0] });
  } catch (err) {
    removeUploadedFileIfNeeded(req.file);
    console.error('uploadDocument error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
};

export const deleteDocument = async (req, res) => {
  try {
    const { id, docId } = req.params;

    const hasAccess = await canAccessStudentDocuments(req.user, id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { rows } = await query(
      'DELETE FROM student_documents WHERE id=$1 AND student_id=$2 RETURNING *',
      [docId, id]
    );

    if (!rows[0]) return res.status(404).json({ error: 'Document not found' });

    try {
      if (rows[0].file_path) unlinkSync(rows[0].file_path);
    } catch (_) {}

    res.json({ message: 'Document deleted' });
  } catch (err) {
    console.error('deleteDocument error:', err);
    res.status(500).json({ error: 'Delete failed' });
  }
};

export const getDocuments = async (req, res) => {
  try {
    const { id } = req.params;

    const hasAccess = await canAccessStudentDocuments(req.user, id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { rows } = await query(
      `SELECT ${publicDocumentFields} FROM student_documents WHERE student_id=$1 ORDER BY doc_key`,
      [id]
    );

    res.json({ documents: rows });
  } catch (err) {
    console.error('getDocuments error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const viewDocument = async (req, res) => {
  try {
    const { id, docId } = req.params;

    const hasAccess = await canAccessStudentDocuments(req.user, id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { rows } = await query(
      'SELECT file_name, file_path, mime_type FROM student_documents WHERE id=$1 AND student_id=$2',
      [docId, id]
    );

    const doc = rows[0];
    if (!doc || !doc.file_path || !existsSync(doc.file_path)) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const safeName = path.basename(doc.file_name || 'document').replace(/["\r\n]/g, '_');
    res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
    return res.sendFile(path.resolve(doc.file_path));
  } catch (err) {
    console.error('viewDocument error:', err);
    res.status(500).json({ error: 'Failed to open document' });
  }
};

// ── Export all documents as ZIP (admin/staff only) ────────────────────────────
// ZIP filename: PassportNumber-StudentName-IntendedMajor.zip
// Files inside ZIP: 01_Passport.pdf, 02_Visa_Scan_Copy.jpg, etc.

// Canonical document order (mirrors frontend DOCUMENTS_LIST in constants.ts)
const DOCUMENTS_ORDER = [
  { key: 'passport',          label: 'Passport' },
  { key: 'visa-scan',         label: 'Visa_Scan_Copy' },
  { key: 'highest-edu-cert',  label: 'Certificate_of_Highest_Education' },
  { key: 'transcript',        label: 'Transcript_of_Highest_Education' },
  { key: 'reference-letters', label: 'Two_Reference_Letters' },
  { key: 'bank-statement',    label: 'Bank_Statement' },
  { key: 'guarantor-id',      label: 'Valid_ID_or_Guarantor_Passport' },
  { key: 'criminal-record',   label: 'Non_Criminal_Record_Certificate' },
  { key: 'photo',             label: 'Photo' },
  { key: 'study-plan',        label: 'Study_Research_Plan' },
  { key: 'resume',            label: 'Resume' },
  { key: 'language-prof',     label: 'Language_Proficiency' },
  { key: 'extra-curricular',  label: 'Extra_Curricular_Certificate' },
];

function sanitizeFilename(str) {
  return (str || '')
    .replace(/[/\\:*?"<>|]/g, '')
    .replace(/\s+/g, '_')
    .trim();
}

export const exportDocumentsZip = async (req, res) => {
  try {
    const { id } = req.params;

    // Only admin/staff can export
    if (!['admin', 'staff'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Fetch student info for ZIP filename
    const { rows: studentRows } = await query(
      'SELECT given_name, family_name, passport_number, intended_major FROM students WHERE id = $1',
      [id]
    );
    if (!studentRows[0]) return res.status(404).json({ error: 'Student not found' });

    const student = studentRows[0];

    // Build ZIP filename: PassportNo-FirstName_LastName-Major.zip
    const passport = sanitizeFilename(student.passport_number) || 'NoPassport';
    const name     = sanitizeFilename(`${student.given_name || ''} ${student.family_name || ''}`.trim());
    const major    = sanitizeFilename(student.intended_major) || 'NoMajor';
    const zipName  = `${passport}-${name}-${major}.zip`;

    // Fetch uploaded documents
    const { rows: docs } = await query(
      'SELECT * FROM student_documents WHERE student_id = $1',
      [id]
    );

    if (!docs.length) {
      return res.status(404).json({ error: 'No documents uploaded for this student' });
    }

    const archiver = (await import('archiver')).default;
    const { createReadStream, existsSync } = await import('fs');

    // Build a map of doc_key → db row for quick lookup
    const docsMap = Object.fromEntries(docs.map(d => [d.doc_key, d]));

    // Sort by canonical order, skip missing/not-uploaded docs
    const orderedDocs = [];
    DOCUMENTS_ORDER.forEach((entry, index) => {
      const doc = docsMap[entry.key];
      if (doc && doc.file_path && existsSync(doc.file_path)) {
        const num = String(index + 1).padStart(2, '0');
        const ext = path.extname(doc.file_name || doc.file_path);
        orderedDocs.push({ doc, filename: `${num}_${entry.label}${ext}` });
      }
    });

    // Also catch any docs with unknown keys (not in canonical list) — append at end
    const knownKeys = new Set(DOCUMENTS_ORDER.map(e => e.key));
    docs.forEach(doc => {
      if (!knownKeys.has(doc.doc_key) && doc.file_path && existsSync(doc.file_path)) {
        const ext = path.extname(doc.file_name || doc.file_path);
        const label = sanitizeFilename(doc.doc_label || doc.doc_key || 'Document');
        orderedDocs.push({ doc, filename: `${label}${ext}` });
      }
    });

    if (!orderedDocs.length) {
      return res.status(404).json({ error: 'No document files found on disk' });
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);

    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.on('error', err => { throw err; });
    archive.pipe(res);

    for (const { doc, filename } of orderedDocs) {
      archive.append(createReadStream(doc.file_path), { name: filename });
    }

    await archive.finalize();
  } catch (err) {
    console.error('exportDocumentsZip error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Export failed' });
    }
  }
};
