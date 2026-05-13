// src/routes/users.js
import { Router } from 'express';
import { body } from 'express-validator';

import { authenticate, requireAdmin } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';

import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
} from '../controllers/usersController.js';

const router = Router();

// All /api/users routes require authentication
router.use(authenticate);

// GET /api/users
// Admin sees all users. Other users see only their own record.
router.get('/', listUsers);

// POST /api/users
// Admin only. Admin may create admin, staff, agent, student, or viewer accounts.
router.post(
  '/',
  requireAdmin,
  [
    body('email').isEmail().normalizeEmail(),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('full_name').notEmpty().trim(),
    body('role').isIn(['admin', 'staff', 'agent', 'student', 'viewer']),
  ],
  validateRequest,
  createUser
);

// PUT /api/users/:id
// Admin can update any user. Other users can update only their own account.
router.put(
  '/:id',
  [
    body('full_name').optional().notEmpty().trim(),
    body('password')
      .optional()
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
  ],
  validateRequest,
  updateUser
);

// DELETE /api/users/:id
// Admin only.
router.delete('/:id', requireAdmin, deleteUser);

export default router;
