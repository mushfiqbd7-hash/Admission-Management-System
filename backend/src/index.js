// src/index.js  – SAMS Backend Entry Point
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import multer from 'multer';

import authRoutes        from './routes/auth.js';
import studentsRoutes    from './routes/students.js';
import usersRoutes       from './routes/users.js';
import docsRoutes        from './routes/documents.js';
import messagesRoutes    from './routes/messages.js';
import workstationRoutes from './routes/workstationRoutes.js';

import pool from './config/database.js';
import { authenticate } from './middleware/auth.js';
import { initSocket } from './socket.js';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

// Required for Render/proxy deployment so rate limiting sees real client IPs.
app.set('trust proxy', 1);

const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;

// Socket.IO — must init before routes
initSocket(httpServer);

const uploadDir = process.env.UPLOAD_DIR || join(__dirname, '../uploads');
if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });

const msgUploadDir = join(uploadDir, 'messages');
if (!existsSync(msgUploadDir)) mkdirSync(msgUploadDir, { recursive: true });

// Multer instance for shared document uploads
const sharedDocsDir = join(uploadDir, 'shared-documents');
if (!existsSync(sharedDocsDir)) mkdirSync(sharedDocsDir, { recursive: true });

const multerUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, sharedDocsDir),
    filename: (_req, file, cb) =>
      cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`),
  }),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

app.use(helmet({ contentSecurityPolicy: false }));

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX || '500'),
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);



app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadDir));

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      db: 'connected',
      version: '2.0.0',
    });
  } catch {
    res.status(503).json({
      status: 'error',
      db: 'disconnected',
    });
  }
});

// ── Main API Routes ───────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/students', docsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api', messagesRoutes);

// Work Station API
app.use('/api/workstation', workstationRoutes);

// Export all route (no student id prefix)
app.get('/api/export/students', authenticate, async (req, res) => {
  if (!['admin', 'staff'].includes(req.user?.role)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { exportAllStudents } = await import('./controllers/pdfController.js');
  return exportAllStudents(req, res);
});

// CSV export
app.get('/api/export/students/csv', authenticate, async (req, res) => {
  if (!['admin', 'staff'].includes(req.user?.role)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const { status } = req.query;
    const params = [];
    const wheres = [`application_status != 'draft'`];

    if (status) {
      params.push(status);
      wheres.push(`application_status = $${params.length}`);
    }

    const { rows } = await pool.query(
      `
      SELECT
        s.application_number,
        cb.full_name AS submitted_by,
        cb.email AS submitted_by_email,
        s.passport_number,
        s.given_name || ' ' || s.family_name AS student_name,
        s.nationality,
        s.target_university,
        s.degree_level,
        s.application_status AS status,
        s.priority,
        TO_CHAR(s.created_at, 'YYYY-MM-DD') AS created_date
      FROM students s
      LEFT JOIN users cb ON s.created_by = cb.id
      WHERE ${wheres.join(' AND ')}
      ORDER BY s.created_at DESC
      `,
      params
    );

    const headers = [
      'App No.',
      'Submitted By',
      'Email',
      'Passport No.',
      'Student Name',
      'Nationality',
      'University',
      'Degree',
      'Status',
      'Priority',
      'Created Date',
    ];

    const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

    const csv = [
      headers.join(','),
      ...rows.map((r) =>
        [
          escape(r.application_number),
          escape(r.submitted_by),
          escape(r.submitted_by_email),
          escape(r.passport_number),
          escape(r.student_name),
          escape(r.nationality),
          escape(r.target_university),
          escape(r.degree_level),
          escape(r.status),
          escape(r.priority),
          escape(r.created_date),
        ].join(',')
      ),
    ].join('\r\n');

    const label = status ? `students_${status}` : 'students_all';

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${label}_${new Date().toISOString().slice(0, 10)}.csv"`
    );

    res.send(csv);
  } catch (err) {
    console.error('CSV export error:', err);
    res.status(500).json({ error: 'Export failed' });
  }
});

// Full data export endpoint for ExportPanel
app.get('/api/export/students/all', authenticate, async (req, res) => {
  if (!['admin', 'staff'].includes(req.user?.role)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const { rows } = await pool.query(`
      SELECT
        s.id,
        s.application_number,
        s.given_name,
        s.family_name,
        s.passport_number,
        s.nationality,
        s.target_university,
        s.intended_major,
        s.degree_level,
        s.intended_start_term,
        s.application_status,
        s.priority,
        s.created_at,
        cb.full_name AS submitted_by_name,
        cb.role AS submitted_by_role,

        COALESCE(wr.payment_of_application, '') AS payment_of_application,
        COALESCE(wr.application_incharge, '') AS application_incharge,
        COALESCE(wr.portal_email, '') AS portal_email,
        COALESCE(wr.portal_password, '') AS portal_password,

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
      LEFT JOIN workstation_universities wu ON wu.student_id = s.id

      WHERE s.application_status != 'draft'

      GROUP BY
        s.id,
        cb.full_name,
        cb.role,
        wr.payment_of_application,
        wr.application_incharge,
        wr.portal_email,
        wr.portal_password

      ORDER BY s.created_at DESC
    `);

    res.json({ rows });
  } catch (err) {
    console.error('Export all error:', err);
    res.status(500).json({
      error: 'Export failed',
      detail: err.message,
    });
  }
});

// ── Shared Documents ──────────────────────────────────────────
// GET /api/shared-documents — list all
app.get('/api/shared-documents', authenticate, async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        d.id,
        d.title,
        d.category,
        d.description,
        d.file_name,
        d.file_size,
        d.mime_type,
        d.file_path,
        u.full_name AS uploaded_by_name,
        u.role AS uploaded_by_role,
        d.created_at
      FROM shared_documents d
      LEFT JOIN users u ON d.uploaded_by = u.id
      ORDER BY d.created_at DESC
    `);

    res.json({ documents: rows });
  } catch (err) {
    console.error('shared-documents list error:', err.message);
    res.json({ documents: [] });
  }
});

// POST /api/shared-documents — upload
app.post('/api/shared-documents', authenticate, multerUpload.single('file'), async (req, res) => {
  if (!['admin', 'staff'].includes(req.user?.role)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const { title, category, description } = req.body;

    if (!title || !category || !req.file) {
      return res.status(400).json({
        error: 'title, category and file are required',
      });
    }

    const {
      rows: [doc],
    } = await pool.query(
      `
      INSERT INTO shared_documents
        (title, category, description, file_name, file_size, mime_type, file_path, uploaded_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *
      `,
      [
        title.trim(),
        category,
        description?.trim() || null,
        req.file.originalname,
        req.file.size,
        req.file.mimetype,
        req.file.path,
        req.user.id,
      ]
    );

    res.status(201).json({ document: doc });
  } catch (err) {
    console.error('shared-documents upload error:', err.message);
    res.status(500).json({
      error: 'Upload failed',
      detail: err.message,
    });
  }
});

// GET /api/shared-documents/:id/file — serve file
app.get('/api/shared-documents/:id/file', authenticate, async (req, res) => {
  try {
    const {
      rows: [doc],
    } = await pool.query('SELECT * FROM shared_documents WHERE id = $1', [req.params.id]);

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.download(doc.file_path, doc.file_name);
  } catch (err) {
    console.error('shared-documents file error:', err.message);
    res.status(500).json({ error: 'File not found' });
  }
});

// DELETE /api/shared-documents/:id
app.delete('/api/shared-documents/:id', authenticate, async (req, res) => {
  if (!['admin', 'staff'].includes(req.user?.role)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const {
      rows: [doc],
    } = await pool.query('DELETE FROM shared_documents WHERE id = $1 RETURNING *', [
      req.params.id,
    ]);

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    try {
      const { unlinkSync } = await import('fs');
      if (doc.file_path) unlinkSync(doc.file_path);
    } catch (_) {}

    res.json({ message: 'Document deleted' });
  } catch (err) {
    console.error('shared-documents delete error:', err.message);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// ── Error Handling ────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error: `Route ${req.method} ${req.path} not found`,
  });
});

app.use((err, _req, res, _next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large' });
  }

  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

httpServer.listen(PORT, () => {
  console.log(`\n  🚀  SAMS API     →  http://localhost:${PORT}/api`);
  console.log(`  🔌  Socket.IO   →  ws://localhost:${PORT}`);
  console.log(`  📋  Health      →  http://localhost:${PORT}/api/health\n`);
});

export default app;