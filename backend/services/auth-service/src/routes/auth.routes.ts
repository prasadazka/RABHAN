import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { AuthMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';
import { validationSchemas } from '../utils/validation.utils';
import { authRateLimit, passwordResetRateLimit } from '../middlewares/security.middleware';
import { transformFrontendToBackend } from '../middlewares/transform.middleware';

const router = Router();
const authController = new AuthController();
const authMiddleware = new AuthMiddleware();

// Health check endpoint
router.get('/health', authController.healthCheck);

// Public authentication routes
router.post('/register', 
  authRateLimit,
  transformFrontendToBackend,
  validate(validationSchemas.register),
  authController.register
);

// Contractor registration endpoint
router.post('/contractor/register', 
  authRateLimit,
  transformFrontendToBackend,
  validate(validationSchemas.contractorRegister),
  authController.contractorRegister
);

// Email-based login flow routes
router.post('/login/email/lookup',
  authRateLimit,
  authController.lookupEmailForLogin
);

router.post('/login/email/send-otp',
  authRateLimit,
  authController.sendLoginOTPToPhone
);

router.post('/login/email/verify-otp',
  authRateLimit,
  authController.verifyLoginOTP
);

router.post('/login', 
  authRateLimit,
  validate(validationSchemas.login),
  authController.login
);


router.post('/refresh', 
  validate(validationSchemas.refreshToken),
  authController.refreshToken
);

// Password strength check (no rate limiting - just a utility)
router.post('/password/strength', 
  authController.checkPasswordStrength
);

// Password reset routes
router.post('/password/reset/request', 
  passwordResetRateLimit,
  validate(validationSchemas.resetPassword),
  authController.requestPasswordReset
);

router.post('/password/reset/confirm', 
  passwordResetRateLimit,
  validate(validationSchemas.confirmResetPassword),
  authController.resetPassword
);

// Protected routes
router.post('/logout', 
  authMiddleware.authenticate,
  authController.logout
);

router.get('/profile', 
  authMiddleware.authenticate,
  authController.getProfile
);

router.put('/profile', 
  authMiddleware.authenticate,
  authController.updateProfile
);

router.post('/password/change', 
  authMiddleware.authenticate,
  validate(validationSchemas.changePassword),
  authController.changePassword
);

// Phone verification routes
router.post('/phone/send-otp', 
  authRateLimit,
  authController.sendPhoneOTP
);

router.post('/phone/verify-otp', 
  authRateLimit,
  authController.verifyPhoneOTP
);

// Email verification routes
router.post('/email/send-verification', 
  authRateLimit,
  authController.sendEmailVerification
);

router.post('/email/verify-token', 
  authController.verifyEmailToken
);

router.post('/email/send-otp', 
  authRateLimit,
  authController.sendEmailOTP
);

router.post('/email/verify-otp', 
  authRateLimit,
  authController.verifyEmailOTP
);

// Phone number utilities
router.get('/phone/countries', authController.getSupportedCountries);
router.post('/phone/validate', authController.validatePhoneNumber);

// Test routes for SMS OTP (development only)
if (process.env.NODE_ENV === 'development') {
  router.post('/test/sms/send', 
    authRateLimit,
    authController.sendTestOTP
  );

  router.post('/test/sms/verify', 
    authRateLimit,
    authController.verifyTestOTP
  );

  // 🚀 DEVELOPMENT HELPER: Get dummy OTP information
  router.get('/dev/dummy-otp-info', 
    authController.getDummyOTPInfo
  );
}

export default router;