// src/routes/students.js
import { Router } from 'express';
import { body } from 'express-validator';

import {
  listStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  updateStatus,
  addNote,
  getStats,
} from '../controllers/studentsController.js';

import { authenticate, requireRole } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';

const router = Router();

router.use(authenticate);

// -- Stats and list --------------------------------------------
router.get('/stats', getStats);
router.get('/', listStudents);

// -- Create student/application --------------------------------
// Validation rules are conditional on application_status:
//   - status='draft'  -> no required fields (Save Draft / auto-save)
//   - anything else   -> family_name and given_name are required (submit)
router.post(
  '/',
  [
    body('family_name')
      .if(body('application_status').not().equals('draft'))
      .notEmpty().trim().withMessage('Family name is required to submit'),
    body('given_name')
      .if(body('application_status').not().equals('draft'))
      .notEmpty().trim().withMessage('Given name is required to submit'),
  ],
  validateRequest,
  createStudent
);

// -- Status update ---------------------------------------------
// PATCH is the main route used by the app.
router.patch(
  '/:id/status',
  [body('status').notEmpty()],
  validateRequest,
  updateStatus
);

// PUT is added as backup support for older frontend/API calls.
router.put(
  '/:id/status',
  [body('status').notEmpty()],
  validateRequest,
  updateStatus
);

// -- Notes -----------------------------------------------------
router.post(
  '/:id/notes',
  requireRole('admin', 'staff'),
  [body('note').notEmpty().trim()],
  validateRequest,
  addNote
);

// -- Single student / update / delete --------------------------
router.get('/:id', getStudent);
router.put('/:id', updateStudent);
router.delete('/:id', deleteStudent);

export default router;
