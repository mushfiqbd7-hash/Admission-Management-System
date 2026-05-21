// src/controllers/documentsController.js
import multer from 'multer';
import path from 'path';
import { query } from '../config/database.js';
import { uploadBuffer, deleteBlob, streamBlobToResponse, downloadBlobToBuffer } from '../utils/azureStorage.js';
import dotenv from 'dotenv';
dotenv.config();

// Use memory storage — files go to Azure Blob, not local disk
const storage = multer.memoryStorage();

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

// Returns student row or null — caller checks fields
const getStudentForDocAccess = async (studentId) => {
  const { rows: [student] } = await query(
    'SELECT id, created_by, application_status FROM students WHERE id = $1',
    [studentId]
  );
  return student || null;
};

const canAccessStudentDocuments = async (user, studentId) => {
  const student = await getStudentForDocAccess(studentId);
  if (!student) return false;
  if (student.created_by === user.id) return true;
  return canManageAllDocuments(user.role) && student.application_status !== 'draft';
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

    const student = await getStudentForDocAccess(id);
    if (!student) return res.status(404).json({ error: 'Application not found' });

    const hasAccess = await canAccessStudentDocuments(req.user, id);
    if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

    if (!doc_key) return res.status(400).json({ error: 'doc_key is required' });

    // Delete old blob if replacing existing document (submitted state)
    const { rows: existing } = await query(
      'SELECT file_path FROM student_documents WHERE student_id=$1 AND doc_key=$2',
      [id, doc_key]
    );
    if (existing[0]?.file_path) await deleteBlob(existing[0].file_path);

    const ext = path.extname(req.file.originalname).toLowerCase();
    const isDraft = student.application_status === 'draft';

    let blobName = null;
    let fileData  = null;

    if (isDraft) {
      // Draft → hold bytes in DB, nothing goes to Azure yet
      fileData = req.file.buffer;
    } else {
      // Submitted → push directly to Azure
      blobName = `documents/${id}/${doc_key}_${Date.now()}${ext}`;
      await uploadBuffer(blobName, req.file.buffer, req.file.mimetype);
    }

    const { rows } = await query(`
      INSERT INTO student_documents
        (student_id, doc_key, doc_label, is_required, file_name, file_path, file_data, file_size, mime_type, uploaded_at, uploaded_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),$10)
      ON CONFLICT (student_id, doc_key) DO UPDATE SET
        doc_label=$3, is_required=$4, file_name=$5, file_path=$6,
        file_data=$7, file_size=$8, mime_type=$9, uploaded_at=NOW(), uploaded_by=$10
      RETURNING ${publicDocumentFields}
    `, [
      id, doc_key, doc_label || doc_key,
      is_required === 'true' || is_required === true,
      req.file.originalname, blobName, fileData,
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

    const hasAccess = await canAccessStudentDocuments(req.user, id);
    if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

    const { rows } = await query(
      'DELETE FROM student_documents WHERE id=$1 AND student_id=$2 RETURNING *',
      [docId, id]
    );

    if (!rows[0]) return res.status(404).json({ error: 'Document not found' });

    // Delete from Azure Blob Storage
    await deleteBlob(rows[0].file_path);

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
    if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

    // For draft applications, only return docs already in Azure (file_path set).
    // Docs held temporarily in file_data bytea are invisible — user must re-upload on return.
    const student = await getStudentForDocAccess(id);
    const isDraft = student?.application_status === 'draft';

    const { rows } = await query(
      `SELECT ${publicDocumentFields} FROM student_documents
       WHERE student_id=$1 ${isDraft ? 'AND file_path IS NOT NULL' : ''}
       ORDER BY doc_key`,
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
    if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

    const { rows } = await query(
      'SELECT file_name, file_path, mime_type FROM student_documents WHERE id=$1 AND student_id=$2',
      [docId, id]
    );

    const doc = rows[0];
    if (!doc?.file_path) return res.status(404).json({ error: 'Document not found' });

    await streamBlobToResponse(doc.file_path, res, doc.file_name, doc.mime_type);
  } catch (err) {
    if (err.code === 'BLOB_NOT_FOUND') {
      return res.status(404).json({ error: 'Document file not found in storage' });
    }
    console.error('viewDocument error:', err);
    res.status(500).json({ error: 'Failed to open document' });
  }
};

// ── Export all documents as ZIP ───────────────────────────────────────────────
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
  return (str || '').replace(/[/\\:*?"<>|]/g, '').replace(/\s+/g, '_').trim();
}

export const exportDocumentsZip = async (req, res) => {
  try {
    const { id } = req.params;

    if (!['admin', 'staff'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { rows: studentRows } = await query(
      'SELECT given_name, family_name, passport_number, intended_major, created_by, application_status FROM students WHERE id = $1',
      [id]
    );
    if (!studentRows[0]) return res.status(404).json({ error: 'Student not found' });

    const student = studentRows[0];
    if (student.application_status === 'draft' && student.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const passport = sanitizeFilename(student.passport_number) || 'NoPassport';
    const name     = sanitizeFilename(`${student.given_name || ''} ${student.family_name || ''}`.trim());
    const major    = sanitizeFilename(student.intended_major) || 'NoMajor';
    const zipName  = `${passport}-${name}-${major}.zip`;

    const { rows: docs } = await query(
      'SELECT * FROM student_documents WHERE student_id = $1',
      [id]
    );
    if (!docs.length) return res.status(404).json({ error: 'No documents uploaded for this student' });

    const archiver = (await import('archiver')).default;
    const docsMap = Object.fromEntries(docs.map(d => [d.doc_key, d]));

    // Download each blob from Azure and add to ZIP
    const orderedDocs = [];
    for (const [index, entry] of DOCUMENTS_ORDER.entries()) {
      const doc = docsMap[entry.key];
      if (doc?.file_path) {
        try {
          const buffer = await downloadBlobToBuffer(doc.file_path);
          const ext = path.extname(doc.file_name || doc.file_path);
          orderedDocs.push({ buffer, filename: `${index + 1}. ${entry.label}${ext}` });
        } catch (_) { /* blob missing, skip */ }
      }
    }

    // Append any docs with unknown keys at end
    const knownKeys = new Set(DOCUMENTS_ORDER.map(e => e.key));
    for (const doc of docs) {
      if (!knownKeys.has(doc.doc_key) && doc.file_path) {
        try {
          const buffer = await downloadBlobToBuffer(doc.file_path);
          const ext = path.extname(doc.file_name || doc.file_path);
          const label = sanitizeFilename(doc.doc_label || doc.doc_key || 'Document');
          orderedDocs.push({ buffer, filename: `${label}${ext}` });
        } catch (_) {}
      }
    }

    if (!orderedDocs.length) {
      return res.status(404).json({ error: 'No document files found in storage' });
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);

    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.on('error', err => { throw err; });
    archive.pipe(res);

    for (const { buffer, filename } of orderedDocs) {
      archive.append(buffer, { name: filename });
    }

    await archive.finalize();
  } catch (err) {
    console.error('exportDocumentsZip error:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Export failed' });
  }
};
