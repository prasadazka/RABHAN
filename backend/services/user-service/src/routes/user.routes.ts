import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { 
  validateCreateProfile,
  validateCreateRegistrationProfile,
  validateUpdateProfile, 
  validateUpdateDocumentStatus,
  validatePaginationParams,
  validateSearchParams 
} from '../validators/user.validator';
import { 
  generalRateLimit, 
  createRateLimit, 
  updateRateLimit, 
  bnplRateLimit, 
  adminRateLimit, 
  documentRateLimit 
} from '../middleware/rate-limit.middleware';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();

// Lazy initialization of controller to avoid circular dependency
let userController: UserController;
const getUserController = () => {
  if (!userController) {
    userController = new UserController();
  }
  return userController;
};

// Apply general rate limiting to all routes
router.use(generalRateLimit);

// Public routes (no authentication required)
// Registration profile creation (no auth required during signup)
router.post(
  '/profiles/register',
  createRateLimit,
  validateCreateRegistrationProfile,
  asyncHandler((req, res, next) => getUserController().createRegistrationProfile(req, res, next))
);

// User routes (authentication required)
router.post(
  '/profiles',
  authenticate,
  createRateLimit,
  validateCreateProfile,
  asyncHandler((req, res, next) => getUserController().createProfile(req, res, next))
);

// Current user endpoints (/me) - MUST come before /:userId routes
router.get(
  '/profiles/me',
  authenticate,
  asyncHandler((req, res, next) => getUserController().getCurrentUserProfile(req, res, next))
);

router.put(
  '/profiles/me',
  authenticate,
  updateRateLimit,
  validateUpdateProfile,
  asyncHandler((req, res, next) => {
    console.log('🎯 Route handler reached - calling controller');
    return getUserController().updateCurrentUserProfile(req, res, next);
  })
);

router.get(
  '/profiles/:userId',
  authenticate,
  asyncHandler((req, res, next) => getUserController().getProfile(req, res, next))
);

router.put(
  '/profiles/:userId',
  authenticate,
  updateRateLimit,
  validateUpdateProfile,
  asyncHandler((req, res, next) => getUserController().updateProfile(req, res, next))
);

router.get(
  '/profiles/me/bnpl-eligibility',
  authenticate,
  bnplRateLimit,
  asyncHandler((req, res, next) => getUserController().getCurrentUserBNPLEligibility(req, res, next))
);

router.get(
  '/profiles/me/documents',
  authenticate,
  documentRateLimit,
  asyncHandler((req, res, next) => getUserController().getCurrentUserDocuments(req, res, next))
);

router.get(
  '/profiles/:userId/bnpl-eligibility',
  authenticate,
  bnplRateLimit,
  asyncHandler((req, res, next) => getUserController().checkBNPLEligibility(req, res, next))
);

router.get(
  '/profiles/:userId/documents',
  authenticate,
  documentRateLimit,
  asyncHandler((req, res, next) => getUserController().getUserDocuments(req, res, next))
);

// Admin routes (admin authentication required)
router.put(
  '/profiles/:userId/documents/:documentType/status',
  authenticate,
  authorize(['ADMIN', 'SUPER_ADMIN']),
  adminRateLimit,
  validateUpdateDocumentStatus,
  asyncHandler((req, res, next) => getUserController().updateDocumentStatus(req, res, next))
);

router.get(
  '/profiles/search',
  authenticate,
  authorize(['ADMIN', 'SUPER_ADMIN']),
  adminRateLimit,
  validateSearchParams,
  asyncHandler((req, res, next) => getUserController().searchUsers(req, res, next))
);

// Update user verification status (admin only)
router.put(
  '/profiles/:userId/verification-status',
  authenticate,
  authorize(['ADMIN', 'SUPER_ADMIN']),
  adminRateLimit,
  asyncHandler((req, res, next) => getUserController().updateVerificationStatus(req, res, next))
);

export default router;