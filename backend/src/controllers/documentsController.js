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
  limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB || '10')) * 1024 * 1024 },
});

export const uploadDocument = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { id } = req.params;
    const { doc_key, doc_label, is_required } = req.body;

    if (!doc_key) return res.status(400).json({ error: 'doc_key is required' });

    const { rows } = await query(`
      INSERT INTO student_documents
        (student_id, doc_key, doc_label, is_required, file_name, file_path, file_size, mime_type, uploaded_at, uploaded_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),$9)
      ON CONFLICT (student_id, doc_key) DO UPDATE SET
        doc_label=$3, is_required=$4, file_name=$5, file_path=$6,
        file_size=$7, mime_type=$8, uploaded_at=NOW(), uploaded_by=$9
      RETURNING *
    `, [
      id, doc_key, doc_label || doc_key,
      is_required === 'true' || is_required === true,
      req.file.originalname, req.file.path,
      req.file.size, req.file.mimetype, req.user.id,
    ]);

    res.json({ document: rows[0] });
  } catch (err) {
    console.error('uploadDocument error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
};

export const deleteDocument = async (req, res) => {
  try {
    const { id, docId } = req.params;
    const { rows } = await query(
      'DELETE FROM student_documents WHERE id=$1 AND student_id=$2 RETURNING *',
      [docId, id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Document not found' });
    try { if (rows[0].file_path) unlinkSync(rows[0].file_path); } catch {}
    res.json({ message: 'Document deleted' });
  } catch (err) {
    console.error('deleteDocument error:', err);
    res.status(500).json({ error: 'Delete failed' });
  }
};

export const getDocuments = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await query(
      'SELECT * FROM student_documents WHERE student_id=$1 ORDER BY doc_key',
      [id]
    );
    res.json({ documents: rows });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── Export all documents as ZIP (admin/staff only) ────────────────────────────
// ZIP filename: PassportNumber-StudentName-IntendedMajor.zip
// Files inside ZIP named by document type, e.g. Passport.jpg, Academic_Transcript.pdf

function sanitizeFilename(str) {
  // Replace unsafe chars with nothing, spaces with underscore
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

    // Build ZIP filename parts
    const passport = sanitizeFilename(student.passport_number) || 'NoPassport';
    const name     = sanitizeFilename(`${student.given_name || ''} ${student.family_name || ''}`.trim());
    const major    = sanitizeFilename(student.intended_major) || 'NoMajor';
    const zipName  = `${passport}-${name}-${major}.zip`;

    // Fetch uploaded documents
    const { rows: docs } = await query(
      'SELECT * FROM student_documents WHERE student_id = $1 ORDER BY doc_key',
      [id]
    );

    if (!docs.length) {
      return res.status(404).json({ error: 'No documents uploaded for this student' });
    }

    const archiver = (await import('archiver')).default;
    const { createReadStream, existsSync } = await import('fs');

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);

    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.on('error', err => { throw err; });
    archive.pipe(res);

    for (const doc of docs) {
      if (doc.file_path && existsSync(doc.file_path)) {
        // Name inside ZIP = doc type label (from doc_key), original extension preserved
        const ext          = path.extname(doc.file_name || doc.file_path);
        // Convert doc_key like "academic_transcript" → "Academic_Transcript"
        const docLabel     = (doc.doc_label || doc.doc_key || 'Document')
          .split(/[_\s]+/)
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join('_');
        const safeDocName  = sanitizeFilename(docLabel) + ext;
        archive.append(createReadStream(doc.file_path), { name: safeDocName });
      }
    }

    await archive.finalize();
  } catch (err) {
    console.error('exportDocumentsZip error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Export failed' });
    }
  }
};
