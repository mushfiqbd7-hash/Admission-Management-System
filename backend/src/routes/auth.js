// src/routes/auth.js
import { Router } from 'express';
import { body } from 'express-validator';

import {
  login,
  refresh,
  logout,
  getMe,
  changePassword,
  requestPasswordReset,
  resetPassword,
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
// Public sign-up is only for applicants (student role).
// Agent / staff / admin accounts must be created by an admin from User Management.
// The `role` field on the request body is intentionally ignored by the controller.
router.post(
  '/register',
  [
    body('full_name').notEmpty().trim().withMessage('Full name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
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
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters'),
  ],
  validateRequest,
  changePassword
);

// Public: forgot password
router.post(
  '/forgot-password',
  [body('email').isEmail().normalizeEmail().withMessage('Valid email is required')],
  validateRequest,
  requestPasswordReset
);

// Public: reset password
router.post(
  '/reset-password',
  [
    body('token').notEmpty(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  validateRequest,
  resetPassword
);

export default router;
