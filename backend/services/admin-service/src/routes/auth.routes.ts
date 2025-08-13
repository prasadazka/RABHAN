/**
 * RABHAN Admin Authentication Routes
 * Saudi Arabia's Solar BNPL Platform - Zero-Trust Admin Authentication
 * 
 * Features:
 * - Multi-factor authentication (MFA)
 * - Session management with zero-trust
 * - SAMA compliance logging
 * - Saudi-optimized performance
 */

import { Router } from 'express';
import { body } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { AuthController } from '../controllers/auth.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { auditLog } from '../middleware/audit.middleware';

const router = Router();
const authController = new AuthController();

// Rate limiting for authentication endpoints
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    success: false,
    error: 'Too many authentication attempts',
    error_code: 'RATE_LIMIT_EXCEEDED',
    retry_after: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation schemas
const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email address is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('mfa_code')
    .optional()
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('MFA code must be 6 digits')
];

const setupMfaValidation = [
  body('password')
    .isLength({ min: 8 })
    .withMessage('Current password is required for MFA setup')
];

const verifyMfaValidation = [
  body('token')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('MFA token must be 6 digits'),
  body('secret')
    .isLength({ min: 16 })
    .withMessage('MFA secret is required')
];

const changePasswordValidation = [
  body('current_password')
    .isLength({ min: 8 })
    .withMessage('Current password is required'),
  body('new_password')
    .isLength({ min: 12 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must contain at least 12 characters with uppercase, lowercase, number, and special character'),
  body('confirm_password')
    .custom((value, { req }) => {
      if (value !== req.body.new_password) {
        throw new Error('Password confirmation does not match');
      }
      return true;
    })
];

/**
 * @route   POST /api/admin/auth/login
 * @desc    Admin login with optional MFA
 * @access  Public
 */
router.post(
  '/login',
  authRateLimit,
  loginValidation,
  validateRequest,
  auditLog('ADMIN_LOGIN_ATTEMPT'),
  authController.login
);

/**
 * @route   POST /api/admin/auth/logout
 * @desc    Admin logout and session termination
 * @access  Private
 */
router.post(
  '/logout',
  auditLog('ADMIN_LOGOUT'),
  authController.logout
);

/**
 * @route   POST /api/admin/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Private
 */
router.post(
  '/refresh',
  authRateLimit,
  auditLog('TOKEN_REFRESH'),
  authController.refreshToken
);

/**
 * @route   GET /api/admin/auth/me
 * @desc    Get current admin profile
 * @access  Private
 */
router.get(
  '/me',
  auditLog('PROFILE_ACCESS'),
  authController.getProfile
);

/**
 * @route   POST /api/admin/auth/setup-mfa
 * @desc    Setup multi-factor authentication
 * @access  Private
 */
router.post(
  '/setup-mfa',
  setupMfaValidation,
  validateRequest,
  auditLog('MFA_SETUP_ATTEMPT'),
  authController.setupMFA
);

/**
 * @route   POST /api/admin/auth/verify-mfa
 * @desc    Verify and enable MFA
 * @access  Private
 */
router.post(
  '/verify-mfa',
  verifyMfaValidation,
  validateRequest,
  auditLog('MFA_VERIFICATION'),
  authController.verifyMFA
);

/**
 * @route   POST /api/admin/auth/disable-mfa
 * @desc    Disable multi-factor authentication
 * @access  Private
 */
router.post(
  '/disable-mfa',
  setupMfaValidation,
  validateRequest,
  auditLog('MFA_DISABLE_ATTEMPT'),
  authController.disableMFA
);

/**
 * @route   POST /api/admin/auth/change-password
 * @desc    Change admin password
 * @access  Private
 */
router.post(
  '/change-password',
  changePasswordValidation,
  validateRequest,
  auditLog('PASSWORD_CHANGE_ATTEMPT'),
  authController.changePassword
);

/**
 * @route   GET /api/admin/auth/sessions
 * @desc    Get active admin sessions
 * @access  Private
 */
router.get(
  '/sessions',
  auditLog('SESSION_LIST_ACCESS'),
  authController.getSessions
);

/**
 * @route   DELETE /api/admin/auth/sessions/:sessionId
 * @desc    Terminate specific admin session
 * @access  Private
 */
router.delete(
  '/sessions/:sessionId',
  auditLog('SESSION_TERMINATION'),
  authController.terminateSession
);

/**
 * @route   POST /api/admin/auth/verify-session
 * @desc    Verify session validity for zero-trust
 * @access  Private
 */
router.post(
  '/verify-session',
  authController.verifySession
);

export default router;