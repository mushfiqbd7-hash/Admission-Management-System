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

// ── GET /api/users
// Admin → all users | Agent/Staff → own record only
router.get('/', listUsers);

// ── POST /api/users  (Admin only)
router.post('/',
  requireAdmin,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
    body('full_name').notEmpty().trim(),
    body('role').isIn(['admin', 'staff', 'agent', 'viewer']),
  ],
  validateRequest,
  createUser
);

// ── PUT /api/users/:id
// Admin → any user | Agent/Staff → own account only (enforced in controller)
router.put('/:id',
  [
    body('full_name').optional().notEmpty().trim(),
    body('password').optional().notEmpty(),
  ],
  validateRequest,
  updateUser
);

// ── DELETE /api/users/:id  (Admin only)
router.delete('/:id', requireAdmin, deleteUser);

export default router;
