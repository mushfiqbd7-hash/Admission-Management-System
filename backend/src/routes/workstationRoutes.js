// src/routes/workstationRoutes.js
import express from 'express';

import {
  listWorkstationStudents,
  updateWorkstationRecord,
  createWorkstationUniversity,
  updateWorkstationUniversity,
  deleteWorkstationUniversity,
  exportWorkstationStudents,
} from '../controllers/workstationController.js';

import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

// Work Station list
router.get('/students', listWorkstationStudents);

// Work Station export data for Export Reports
router.get('/export', exportWorkstationStudents);

// Work Station record fields
router.put('/:studentId/record', updateWorkstationRecord);

// University rows
router.post('/:studentId/universities', createWorkstationUniversity);
router.put('/:studentId/universities/:universityId', updateWorkstationUniversity);
router.delete('/:studentId/universities/:universityId', deleteWorkstationUniversity);

export default router;