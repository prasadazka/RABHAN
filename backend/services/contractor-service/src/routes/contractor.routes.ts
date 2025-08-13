import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { ContractorController } from '../controllers/contractor.controller';
import { 
  authenticateToken, 
  optionalAuth, 
  requireAdmin, 
  requireContractorOwnership,
  logAccess,
  AuthenticatedRequest
} from '../middleware/auth.middleware';
import { BusinessType, ServiceCategory, ContractorStatus } from '../types/contractor.types';

const router = Router();
const contractorController = new ContractorController();

// Apply access logging to all routes
router.use(logAccess);

/**
 * POST /api/contractors/register
 * Register a new contractor
 * Requires authentication
 */
router.post('/register',
  authenticateToken,
  [
    // Business information validation
    body('business_name')
      .trim()
      .isLength({ min: 2, max: 255 })
      .withMessage('Business name must be between 2 and 255 characters'),
    
    body('business_name_ar')
      .optional()
      .trim()
      .isLength({ min: 2, max: 255 })
      .withMessage('Arabic business name must be between 2 and 255 characters'),
    
    body('business_type')
      .isIn(Object.values(BusinessType))
      .withMessage('Invalid business type'),
    
    body('commercial_registration')
      .optional()
      .trim()
      .isLength({ min: 5, max: 50 })
      .withMessage('Commercial registration must be between 5 and 50 characters'),
    
    body('vat_number')
      .optional()
      .trim()
      .matches(/^[0-9]{15}$/)
      .withMessage('VAT number must be 15 digits'),
    
    // Contact information validation
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    
    body('phone')
      .matches(/^\+966[0-9]{9}$/)
      .withMessage('Phone must be valid Saudi number (+966xxxxxxxxx)'),
    
    body('whatsapp')
      .optional()
      .matches(/^\+966[0-9]{9}$/)
      .withMessage('WhatsApp must be valid Saudi number (+966xxxxxxxxx)'),
    
    body('website')
      .optional()
      .isURL()
      .withMessage('Valid website URL required'),
    
    // Address validation
    body('address_line1')
      .trim()
      .isLength({ min: 5, max: 255 })
      .withMessage('Address line 1 must be between 5 and 255 characters'),
    
    body('address_line2')
      .optional()
      .trim()
      .isLength({ max: 255 })
      .withMessage('Address line 2 must not exceed 255 characters'),
    
    body('city')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('City must be between 2 and 100 characters'),
    
    body('region')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Region must be between 2 and 100 characters'),
    
    body('postal_code')
      .optional()
      .matches(/^[0-9]{5}$/)
      .withMessage('Postal code must be 5 digits'),
    
    // Business details validation
    body('established_year')
      .optional()
      .isInt({ min: 1900, max: new Date().getFullYear() })
      .withMessage('Established year must be valid'),
    
    body('employee_count')
      .optional()
      .isInt({ min: 1, max: 10000 })
      .withMessage('Employee count must be between 1 and 10000'),
    
    body('description')
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('Description must not exceed 2000 characters'),
    
    body('description_ar')
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('Arabic description must not exceed 2000 characters'),
    
    // Service information validation
    body('service_categories')
      .isArray({ min: 1, max: 5 })
      .withMessage('At least 1 and maximum 5 service categories required'),
    
    body('service_categories.*')
      .isIn(Object.values(ServiceCategory))
      .withMessage('Invalid service category'),
    
    body('service_areas')
      .isArray({ min: 1, max: 10 })
      .withMessage('At least 1 and maximum 10 service areas required'),
    
    body('service_areas.*')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Service area must be between 2 and 100 characters'),
    
    body('years_experience')
      .isInt({ min: 0, max: 50 })
      .withMessage('Years of experience must be between 0 and 50')
  ],
  contractorController.registerContractor
);

/**
 * GET /api/contractors/profile
 * Get current user's contractor profile
 * Requires authentication
 */
router.get('/profile',
  authenticateToken,
  requireContractorOwnership,
  contractorController.getContractorProfile
);

/**
 * PUT /api/contractors/profile
 * Update contractor profile
 * Requires authentication
 */
router.put('/profile',
  authenticateToken,
  requireContractorOwnership,
  [
    // Business information validation - all optional, allow empty values
    body('business_name')
      .optional({ nullable: true, checkFalsy: true })
      .trim()
      .isLength({ min: 0, max: 255 })
      .withMessage('Business name must not exceed 255 characters'),
    
    body('business_name_ar')
      .optional({ nullable: true, checkFalsy: true })
      .trim()
      .isLength({ min: 0, max: 255 })
      .withMessage('Arabic business name must not exceed 255 characters'),
    
    body('commercial_registration')
      .optional({ nullable: true, checkFalsy: true })
      .trim()
      .isLength({ min: 0, max: 50 })
      .withMessage('Commercial registration must not exceed 50 characters'),
    
    body('vat_number')
      .optional({ nullable: true, checkFalsy: true })
      .trim()
      .custom((value) => {
        if (!value || value.length === 0) return true; // Allow empty
        return /^[0-9]{15}$/.test(value);
      })
      .withMessage('VAT number must be 15 digits if provided'),
    
    body('email')
      .optional({ nullable: true, checkFalsy: true })
      .custom((value) => {
        if (!value || value.length === 0) return true; // Allow empty
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      })
      .withMessage('Valid email format required if provided'),
    
    body('phone')
      .optional({ nullable: true, checkFalsy: true })
      .custom((value) => {
        if (!value || value.length === 0) return true; // Allow empty
        return /^\+966[0-9]{9}$/.test(value);
      })
      .withMessage('Valid Saudi phone number format (+966xxxxxxxxx) required if provided'),
    
    body('whatsapp')
      .optional({ nullable: true, checkFalsy: true })
      .custom((value) => {
        if (!value || value.length === 0) return true; // Allow empty
        return /^\+966[0-9]{9}$/.test(value);
      })
      .withMessage('Valid Saudi WhatsApp number format (+966xxxxxxxxx) required if provided'),
    
    body('website')
      .optional({ nullable: true, checkFalsy: true })
      .custom((value) => {
        if (!value || value.length === 0) return true; // Allow empty
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      })
      .withMessage('Valid website URL required if provided'),
    
    body('description')
      .optional({ nullable: true, checkFalsy: true })
      .trim()
      .isLength({ min: 0, max: 2000 })
      .withMessage('Description must not exceed 2000 characters'),
    
    body('description_ar')
      .optional({ nullable: true, checkFalsy: true })
      .trim()
      .isLength({ min: 0, max: 2000 })
      .withMessage('Arabic description must not exceed 2000 characters'),
    
    body('established_year')
      .optional({ nullable: true, checkFalsy: true })
      .custom((value) => {
        if (!value || value === '' || value === null) return true; // Allow empty
        const year = parseInt(value);
        return !isNaN(year) && year >= 1900 && year <= new Date().getFullYear();
      })
      .withMessage('Established year must be valid if provided'),
    
    body('employee_count')
      .optional({ nullable: true, checkFalsy: true })
      .custom((value) => {
        if (!value || value === '' || value === null) return true; // Allow empty
        const count = parseInt(value);
        return !isNaN(count) && count >= 1 && count <= 10000;
      })
      .withMessage('Employee count must be between 1 and 10000 if provided'),
    
    body('business_type')
      .optional({ nullable: true, checkFalsy: true })
      .custom((value) => {
        if (!value || value.length === 0) return true; // Allow empty
        return Object.values(BusinessType).includes(value as BusinessType);
      })
      .withMessage('Valid business type required if provided'),
    
    // Address fields - optional
    body('address_line1')
      .optional({ nullable: true, checkFalsy: true })
      .trim()
      .isLength({ min: 0, max: 255 })
      .withMessage('Address line 1 must not exceed 255 characters'),
    
    body('address_line2')
      .optional({ nullable: true, checkFalsy: true })
      .trim()
      .isLength({ min: 0, max: 255 })
      .withMessage('Address line 2 must not exceed 255 characters'),
    
    body('city')
      .optional({ nullable: true, checkFalsy: true })
      .trim()
      .isLength({ min: 0, max: 100 })
      .withMessage('City must not exceed 100 characters'),
    
    body('region')
      .optional({ nullable: true, checkFalsy: true })
      .trim()
      .isLength({ min: 0, max: 100 })
      .withMessage('Region must not exceed 100 characters'),
    
    body('postal_code')
      .optional({ nullable: true, checkFalsy: true })
      .custom((value) => {
        if (!value || value.length === 0) return true; // Allow empty
        return /^[0-9]{5}$/.test(value);
      })
      .withMessage('Postal code must be 5 digits if provided')
  ],
  contractorController.updateContractorProfile
);

/**
 * GET /api/contractors/dashboard/stats
 * Get contractor dashboard statistics
 * Requires authentication
 */
router.get('/dashboard/stats',
  authenticateToken,
  requireContractorOwnership,
  contractorController.getDashboardStats
);

/**
 * GET /api/contractors/search
 * Search contractors with filters
 * Optional authentication for better results
 */
router.get('/search',
  optionalAuth,
  [
    query('region')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Region must be between 2 and 100 characters'),
    
    query('city')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('City must be between 2 and 100 characters'),
    
    query('service_categories')
      .optional()
      .custom((value) => {
        const categories = value.split(',');
        return categories.every((cat: string) => Object.values(ServiceCategory).includes(cat as ServiceCategory));
      })
      .withMessage('Invalid service categories'),
    
    query('status')
      .optional()
      .isIn(Object.values(ContractorStatus))
      .withMessage('Invalid contractor status'),
    
    query('min_rating')
      .optional()
      .isFloat({ min: 0, max: 5 })
      .withMessage('Minimum rating must be between 0 and 5'),
    
    query('max_distance_km')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Maximum distance must be between 1 and 1000 km'),
    
    query('verification_level')
      .optional()
      .isInt({ min: 0, max: 5 })
      .withMessage('Verification level must be between 0 and 5'),
    
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    
    query('sort_by')
      .optional()
      .isIn(['created_at', 'updated_at', 'business_name', 'average_rating', 'total_reviews', 'verification_level', 'years_experience'])
      .withMessage('Invalid sort field'),
    
    query('sort_order')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Sort order must be asc or desc')
  ],
  contractorController.searchContractors
);

/**
 * GET /api/contractors/health
 * Health check endpoint
 * No authentication required
 */
router.get('/health',
  contractorController.healthCheck
);

/**
 * GET /api/contractors/profile/verification
 * Get current contractor's verification status
 * Requires authentication
 */
router.get('/profile/verification',
  authenticateToken,
  requireContractorOwnership,
  contractorController.getVerificationStatus
);

/**
 * POST /api/contractors/profile/verification/submit
 * Submit contractor profile for verification review
 * Requires authentication
 */
router.post('/profile/verification/submit',
  authenticateToken,
  requireContractorOwnership,
  contractorController.submitForVerification
);

/**
 * GET /api/contractors/:id
 * Get contractor by ID
 * Optional authentication
 */
router.get('/:id',
  optionalAuth,
  [
    param('id')
      .isUUID()
      .withMessage('Valid contractor ID required')
  ],
  contractorController.getContractorById
);

/**
 * GET /api/contractors/:id/verification
 * Get contractor verification status by ID (Admin only)
 * Requires admin authentication
 */
router.get('/:id/verification',
  authenticateToken,
  requireAdmin,
  [
    param('id')
      .isUUID()
      .withMessage('Valid contractor ID required')
  ],
  contractorController.getContractorVerificationById
);

/**
 * GET /api/contractors/admin/contractors
 * Get all contractors for admin dashboard
 * Requires admin authentication OR service-to-service call
 */
router.get('/admin/contractors',
  // Allow both authenticated admin users and service-to-service calls
  (req, res, next) => {
    // Check for service-to-service call
    if (req.headers['x-service'] === 'admin-service') {
      // Skip authentication for service-to-service calls
      return next();
    }
    // Otherwise require normal admin authentication
    authenticateToken(req, res, (err) => {
      if (err) return next(err);
      requireAdmin(req, res, next);
    });
  },
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Limit must be between 1 and 1000'),
    
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be a positive integer')
  ],
  contractorController.getContractorsForAdmin
);

/**
 * PUT /api/contractors/:id/status
 * Update contractor status (Admin only)
 * Requires admin authentication
 */
router.put('/:id/status',
  authenticateToken,
  requireAdmin,
  [
    param('id')
      .isUUID()
      .withMessage('Valid contractor ID required'),
    
    body('status')
      .isIn(Object.values(ContractorStatus))
      .withMessage('Valid status is required'),
    
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Notes must not exceed 1000 characters')
  ],
  contractorController.updateContractorStatus
);

/**
 * PUT /api/contractors/preferences
 * Update contractor preferences
 * Requires authentication
 */
router.put('/preferences',
  authenticateToken,
  requireContractorOwnership,
  contractorController.updatePreferences
);

export default router;