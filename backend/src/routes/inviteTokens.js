// src/routes/inviteTokens.js
import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  generateToken,
  listTokens,
  validateToken,
  requireToken,
  requireTokenStudent,
  publicCreateStudent,
  publicUpdateStudent,
  publicSubmit,
} from '../controllers/inviteTokensController.js';
import {
  upload,
  uploadDocument,
  deleteDocument,
  getDocuments,
  viewDocument,
} from '../controllers/documentsController.js';

const router = express.Router();

// ── Authenticated (admin / staff / agent) ────────────────────────────────────
router.post('/invite-tokens',    authenticate, generateToken);
router.get('/invite-tokens',     authenticate, listTokens);

// ── Public (no auth — token in URL path) ─────────────────────────────────────
router.get('/apply/:token',                                               validateToken);
router.post('/apply/:token/students',                   requireToken,     publicCreateStudent);
router.put('/apply/:token/students/:id',                requireToken, requireTokenStudent, publicUpdateStudent);
router.post('/apply/:token/students/:id/documents',     requireToken, requireTokenStudent, upload.single('file'), uploadDocument);
router.get('/apply/:token/students/:id/documents',      requireToken, requireTokenStudent, getDocuments);
router.get('/apply/:token/students/:id/documents/:docId/file', requireToken, requireTokenStudent, viewDocument);
router.delete('/apply/:token/students/:id/documents/:docId',   requireToken, requireTokenStudent, deleteDocument);
router.post('/apply/:token/students/:id/submit',        requireToken, requireTokenStudent, publicSubmit);

export default router;
