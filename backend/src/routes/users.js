// src/routes/users.js
import { Router } from 'express';
import { body } from 'express-validator';
import multer from 'multer';

import { authenticate, requireAdmin } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';

import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  uploadAvatar,
  getAvatar,
} from '../controllers/usersController.js';

const MAX_AVATAR_BYTES = 200 * 1024; // 200 KB

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AVATAR_BYTES },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Avatar must be JPG, PNG, or WebP'));
  },
});

const router = Router();

// All /api/users routes require authentication
router.use(authenticate);

// GET /api/users
// Admin sees all users. Other users see only their own record.
router.get('/', listUsers);

// POST /api/users
// Admin only. Admin may create admin, staff, agent, or student accounts.
router.post(
  '/',
  requireAdmin,
  [
    body('email')
      .trim()
      .isEmail()
      .withMessage('Enter a valid email address. Any email domain is allowed.')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('full_name').notEmpty().trim(),
    body('role').isIn(['admin', 'staff', 'agent', 'student']),
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

// POST /api/users/me/avatar — upload profile picture (max 200 KB)
router.post(
  '/me/avatar',
  (req, res, next) => {
    avatarUpload.single('avatar')(req, res, (err) => {
      if (err?.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Avatar must be 200 KB or smaller.' });
      }
      if (err) return res.status(400).json({ error: err.message });
      next();
    });
  },
  uploadAvatar
);

// GET /api/users/me/avatar — stream avatar image
router.get('/me/avatar', getAvatar);

export default router;
