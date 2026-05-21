// backend/src/index.js - SAMS Backend Entry Point

import 'dotenv/config';

import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import multer from 'multer';
import { uploadBuffer, deleteBlob, streamBlobToResponse } from './utils/azureStorage.js';

import authRoutes from './routes/auth.js';
import studentsRoutes from './routes/students.js';
import usersRoutes from './routes/users.js';
import docsRoutes from './routes/documents.js';
import messagesRoutes from './routes/messages.js';
import workstationRoutes from './routes/workstationRoutes.js';
import inviteTokensRoutes from './routes/inviteTokens.js';

import pool from './config/database.js';
import { authenticate } from './middleware/auth.js';
import { initSocket } from './socket.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

/*
  Required for Render / Vercel proxy deployment.
  This helps Express and express-rate-limit read the real client IP correctly.
*/
app.set('trust proxy', 1);

const httpServer = createServer(app);

/*
  Render provides process.env.PORT automatically.
  Local PowerShell uses PORT=5000 from .env or fallback 5000.
*/
const PORT = process.env.PORT || 5000;

/* Socket.IO */
initSocket(httpServer);

/* Helper: safe env parsers */
const parseEnvInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const parseEnvFloat = (value, fallback) => {
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? fallback : parsed;
};

/* Upload size */
const maxFileSizeMb = parseEnvFloat(process.env.MAX_FILE_SIZE_MB, 20);
const maxUploadBytes = Math.round(maxFileSizeMb * 1024 * 1024);

/* Shared document upload config — memory storage, files go to Azure Blob */
const sharedDocumentFileFilter = (_req, file, cb) => {
  const allowedExt = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.xls', '.xlsx'];
  const originalName = file.originalname || '';
  const dotIndex = originalName.lastIndexOf('.');
  const ext = dotIndex >= 0 ? originalName.slice(dotIndex).toLowerCase() : '';
  if (allowedExt.includes(ext)) return cb(null, true);
  return cb(new Error('Invalid file type. Allowed: PDF, JPG, PNG, DOC, DOCX, XLS, XLSX'));
};

const multerUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: sharedDocumentFileFilter,
  limits: { fileSize: maxUploadBytes },
});

/* Security middleware */
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

/* CORS setup */
const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000',
  'https://sams-frontend-pi.vercel.app',
].filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Disposition'],
};

app.use(cors(corsOptions));

/*
  Rate limiter fix:
  - Login has its own safer limiter.
  - Successful login does not count against login limit.
  - This fixes the issue where second login waits 15 minutes.
*/
const generalLimiter = rateLimit({
  windowMs: parseEnvInt(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  max: parseEnvInt(process.env.RATE_LIMIT_MAX, 1000),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) =>
    req.path === '/api/auth/login' || req.path === '/api/auth/login/',
  message: {
    error: 'Too many requests. Please try again later.',
  },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseEnvInt(process.env.LOGIN_RATE_LIMIT_MAX, 20),
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many login attempts. Please try again after 15 minutes.',
  },
});

app.use('/api/auth/login', loginLimiter);
app.use(generalLimiter);

/* Body parsers */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

/* Sensitive uploads are not served publicly. Use authenticated download routes instead. */

/* Health check */
app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      db: 'connected',
      version: '2.0.0',
    });
  } catch (err) {
    console.error('Health check error:', err.message);

    res.status(503).json({
      status: 'error',
      db: 'disconnected',
      detail: err.message,
    });
  }
});

/* Main API routes */
app.use('/api/auth', authRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/students', docsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/workstation', workstationRoutes);
// Public invite routes MUST come before messagesRoutes (which has router.use(authenticate) — blocks all /api/* without a token)
app.use('/api', inviteTokensRoutes);
app.use('/api', messagesRoutes);

/* Export all students as PDF/print */
app.get('/api/export/students', authenticate, async (req, res) => {
  if (!['admin', 'staff'].includes(req.user?.role)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { exportAllStudents } = await import('./controllers/pdfController.js');
  return exportAllStudents(req, res);
});

/* Export students as CSV */
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
        CASE WHEN cb.role = 'admin' AND cb.full_name = 'System Administrator'
             THEN 'Admin'
             ELSE cb.full_name
        END AS submitted_by,
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

    const escapeCsv = (value) =>
      `"${String(value ?? '').replace(/"/g, '""')}"`;

    const csv = [
      headers.join(','),
      ...rows.map((row) =>
        [
          escapeCsv(row.application_number),
          escapeCsv(row.submitted_by),
          escapeCsv(row.submitted_by_email),
          escapeCsv(row.passport_number),
          escapeCsv(row.student_name),
          escapeCsv(row.nationality),
          escapeCsv(row.target_university),
          escapeCsv(row.degree_level),
          escapeCsv(row.status),
          escapeCsv(row.priority),
          escapeCsv(row.created_date),
        ].join(',')
      ),
    ].join('\r\n');

    const label = status ? `students_${status}` : 'students_all';

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${label}_${new Date()
        .toISOString()
        .slice(0, 10)}.csv"`
    );

    res.send(csv);
  } catch (err) {
    console.error('CSV export error:', err);
    res.status(500).json({ error: 'Export failed' });
  }
});

/* Export all student data for ExportPanel */
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
        CASE WHEN cb.role = 'admin' AND cb.full_name = 'System Administrator'
             THEN 'Admin'
             ELSE cb.full_name
        END AS submitted_by_name,
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

/* Shared documents: list */
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
    console.error('Shared documents list error:', err.message);
    res.json({ documents: [] });
  }
});

/* Shared documents: upload */
app.post(
  '/api/shared-documents',
  authenticate,
  multerUpload.single('file'),
  async (req, res) => {
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

      // Upload to Azure Blob Storage
      const ext = req.file.originalname.includes('.')
        ? req.file.originalname.slice(req.file.originalname.lastIndexOf('.')).toLowerCase()
        : '';
      const blobName = `shared-documents/${Date.now()}-${req.file.originalname.replace(/\s+/g, '_')}`;
      await uploadBuffer(blobName, req.file.buffer, req.file.mimetype);
      req.file._blobName = blobName;

      const {
        rows: [doc],
      } = await pool.query(
        `
        INSERT INTO shared_documents
          (title, category, description, file_name, file_size, mime_type, file_path, uploaded_by)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
        `,
        [
          title.trim(),
          category,
          description?.trim() || null,
          req.file.originalname,
          req.file.size,
          req.file.mimetype,
          req.file._blobName,
          req.user.id,
        ]
      );

      res.status(201).json({ document: doc });
    } catch (err) {
      console.error('Shared documents upload error:', err.message);

      res.status(500).json({
        error: 'Upload failed',
        detail: err.message,
      });
    }
  }
);

/* Shared documents: download file */
app.get('/api/shared-documents/:id/file', authenticate, async (req, res) => {
  try {
    const {
      rows: [doc],
    } = await pool.query('SELECT * FROM shared_documents WHERE id = $1', [
      req.params.id,
    ]);

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Stream from Azure Blob Storage
    await streamBlobToResponse(doc.file_path, res, doc.file_name, doc.mime_type);
  } catch (err) {
    if (err.code === 'BLOB_NOT_FOUND') {
      return res.status(404).json({ error: 'File not found in storage' });
    }
    console.error('Shared documents file error:', err.message);
    res.status(500).json({ error: 'File not found' });
  }
});

/* Shared documents: delete */
app.delete('/api/shared-documents/:id', authenticate, async (req, res) => {
  if (!['admin', 'staff'].includes(req.user?.role)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const {
      rows: [doc],
    } = await pool.query(
      'DELETE FROM shared_documents WHERE id = $1 RETURNING *',
      [req.params.id]
    );

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Delete from Azure Blob Storage
    await deleteBlob(doc.file_path);

    res.json({ message: 'Document deleted' });
  } catch (err) {
    console.error('Shared documents delete error:', err.message);
    res.status(500).json({ error: 'Delete failed' });
  }
});

/* 404 handler */
app.use((req, res) => {
  res.status(404).json({
    error: `Route ${req.method} ${req.path} not found`,
  });
});

/* Global error handler */
app.use((err, _req, res, _next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: `File too large. Maximum allowed size is ${maxFileSizeMb} MB.`,
    });
  }

  if (err.message?.startsWith('Not allowed by CORS')) {
    return res.status(403).json({ error: err.message });
  }

  console.error('Unhandled error:', err);

  res.status(500).json({
    error: 'Internal server error',
  });
});

/* Start server */
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`\nSAMS API running on port ${PORT}`);
  console.log(`Local API: http://localhost:${PORT}/api`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Socket.IO running on port ${PORT}\n`);
});

export default app;
