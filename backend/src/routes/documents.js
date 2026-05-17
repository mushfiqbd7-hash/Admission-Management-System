// src/routes/documents.js
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { upload, uploadDocument, deleteDocument, getDocuments, viewDocument, exportDocumentsZip } from '../controllers/documentsController.js';
import { exportStudentPDF, exportAllStudents } from '../controllers/pdfController.js';

const router = Router();
router.use(authenticate);

router.get('/:id/documents',                getDocuments);
router.post('/:id/documents', upload.single('file'), uploadDocument);
router.get('/:id/documents/:docId/file',    viewDocument);
router.delete('/:id/documents/:docId',      deleteDocument);
router.get('/:id/documents/export',         exportDocumentsZip);

// PDF / HTML export
router.get('/:id/export',    exportStudentPDF);
router.get('/export/all',    exportAllStudents);

export default router;
