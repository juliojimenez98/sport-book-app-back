import { Router } from 'express';
import {
  register,
  login,
  refresh,
  logout,
  me,
  verifyEmail,
  forgotPassword,
  resetPassword,
} from '../controllers/auth.controller';
import { authenticate, optionalAuth } from '../middlewares/authenticate';
import { authLimiter } from '../middlewares/rateLimiter';
import { validate } from '../middlewares/validate';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/schemas';


const router = Router();

// POST /auth/register
router.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  register
);

// POST /auth/login
router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  login
);

// POST /auth/refresh
router.post(
  '/refresh',
  authLimiter,
  validate(refreshTokenSchema),
  refresh
);

// POST /auth/logout
router.post(
  '/logout',
  optionalAuth,
  logout
);

// GET /auth/me
router.get(
  '/me',
  authenticate,
  me
);

// GET /auth/verify-email?token=...
router.get(
  '/verify-email',
  verifyEmail
);

// POST /auth/forgot-password
router.post(
  '/forgot-password',
  authLimiter,
  validate(forgotPasswordSchema),
  forgotPassword
);

// POST /auth/reset-password
router.post(
  '/reset-password',
  authLimiter,
  validate(resetPasswordSchema),
  resetPassword
);

export default router;

