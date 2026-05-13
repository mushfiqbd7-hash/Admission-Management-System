// src/routes/auth.js
import { Router } from 'express';
import { body } from 'express-validator';

import {
  login,
  refresh,
  logout,
  getMe,
  changePassword,
} from '../controllers/authController.js';

import {
  register,
  verifyEmail,
  resendVerification,
} from '../controllers/usersController.js';

import { authenticate } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';

const router = Router();

// Public: login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  validateRequest,
  login
);

// Public: self-registration
// Only student and agent accounts can self-register.
// Admin/staff accounts must be created by an admin from User Management.
router.post(
  '/register',
  [
    body('full_name').notEmpty().trim().withMessage('Full name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('role')
      .isIn(['agent', 'student'])
      .withMessage('Role must be "agent" or "student"'),
  ],
  validateRequest,
  register
);

// Public: email verification
router.get('/verify-email', verifyEmail);

router.post(
  '/resend-verification',
  [body('email').isEmail().normalizeEmail().withMessage('Valid email is required')],
  validateRequest,
  resendVerification
);

// Token management
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);

// Authenticated: change password
router.post(
  '/change-password',
  authenticate,
  [
    body('currentPassword').notEmpty(),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters'),
  ],
  validateRequest,
  changePassword
);

export default router;
