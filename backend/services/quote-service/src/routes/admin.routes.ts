import express from 'express';
import Joi from 'joi';
import { adminController } from '../controllers/admin.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

const router = express.Router();

// Validation schemas (moved up)
const pendingQuotesQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({
    'number.integer': 'page must be a valid integer',
    'number.min': 'page must be at least 1'
  }),
  limit: Joi.number().integer().min(1).max(100).default(20).messages({
    'number.integer': 'limit must be a valid integer',
    'number.min': 'limit must be at least 1',
    'number.max': 'limit cannot exceed 100'
  }),
  sort_by: Joi.string().valid('created_at', 'updated_at', 'amount', 'status').default('created_at').messages({
    'any.only': 'sort_by must be one of: created_at, updated_at, amount, status'
  }),
  sort_order: Joi.string().valid('asc', 'desc').default('desc').messages({
    'any.only': 'sort_order must be either "asc" or "desc"'
  }),
  contractor_id: Joi.string().uuid().optional().messages({
    'string.uuid': 'contractor_id must be a valid UUID'
  }),
  min_amount: Joi.number().positive().optional().messages({
    'number.positive': 'min_amount must be a positive number'
  }),
  max_amount: Joi.number().positive().optional().messages({
    'number.positive': 'max_amount must be a positive number'
  })
});

// Test routes without auth (temporarily) - ORIGINAL ENDPOINT
router.get('/quotes', (req: any, res, next) => {
  // Mock admin user for testing
  req.user = { id: 'admin-test', role: 'admin' };
  next();
}, validateRequest(pendingQuotesQuerySchema, 'query'), adminController.getAllQuotes.bind(adminController));

// Admin-specific quotes with contractor assignments - NEW ENDPOINT
router.get('/quotes-with-assignments', (req: any, res, next) => {
  // Mock admin user for testing
  req.user = { id: 'admin-test', role: 'admin' };
  next();
}, validateRequest(pendingQuotesQuerySchema, 'query'), adminController.getAdminQuotesWithAssignments.bind(adminController));

// Individual quote details route (without auth for testing)
router.get('/quotes/:quoteId', (req: any, res, next) => {
  // Mock admin user for testing
  req.user = { id: 'admin-test', role: 'admin' };
  next();
}, adminController.getQuoteDetails.bind(adminController));

// Quote assignments route (without auth for testing)  
router.get('/quotes/:quoteId/assignments', (req: any, res, next) => {
  // Mock admin user for testing
  req.user = { id: 'admin-test', role: 'admin' };
  next();
}, adminController.getQuoteAssignments.bind(adminController));

// Available contractors route (without auth for testing)
router.get('/contractors/available', (req: any, res, next) => {
  // Mock admin user for testing
  req.user = { id: 'admin-test', role: 'admin' };
  next();
}, adminController.getAvailableContractors.bind(adminController));

// Assign contractors to quote route (without auth for testing)
router.post('/quotes/:quoteId/assign-contractors', (req: any, res, next) => {
  // Mock admin user for testing
  req.user = { id: 'admin-test', role: 'admin' };
  next();
}, adminController.assignContractorsToQuote.bind(adminController));

// Apply admin authorization to all OTHER routes
router.use(authenticateToken);
router.use(requireRole('admin'));

// More validation schemas
const quoteApprovalSchema = Joi.object({
  admin_status: Joi.string().valid('approved', 'rejected').required().messages({
    'any.required': 'admin_status is required',
    'any.only': 'admin_status must be either "approved" or "rejected"'
  }),
  admin_notes: Joi.string().max(1000).optional().messages({
    'string.max': 'admin_notes cannot exceed 1000 characters'
  }),
  rejection_reason: Joi.when('admin_status', {
    is: 'rejected',
    then: Joi.string().min(10).max(500).required().messages({
      'any.required': 'rejection_reason is required when rejecting a quote',
      'string.min': 'rejection_reason must be at least 10 characters long',
      'string.max': 'rejection_reason cannot exceed 500 characters'
    }),
    otherwise: Joi.optional()
  })
});

const withdrawalApprovalSchema = Joi.object({
  admin_notes: Joi.string().max(1000).optional().messages({
    'string.max': 'admin_notes cannot exceed 1000 characters'
  })
});

const withdrawalRejectionSchema = Joi.object({
  rejection_reason: Joi.string().min(10).max(500).required().messages({
    'any.required': 'rejection_reason is required',
    'string.min': 'rejection_reason must be at least 10 characters long',
    'string.max': 'rejection_reason cannot exceed 500 characters'
  })
});

const analyticsQuerySchema = Joi.object({
  period: Joi.string().valid(
    'last_7_days', 'last_30_days', 'last_90_days', 'this_year'
  ).default('last_30_days').messages({
    'any.only': 'period must be one of: last_7_days, last_30_days, last_90_days, this_year'
  })
});

const uuidParamSchema = Joi.object({
  quoteId: Joi.string().uuid().required().messages({
    'any.required': 'quoteId is required',
    'string.uuid': 'quoteId must be a valid UUID'
  }),
  contractorId: Joi.string().uuid().optional().messages({
    'string.uuid': 'contractorId must be a valid UUID'
  }),
  transactionId: Joi.string().uuid().required().messages({
    'any.required': 'transactionId is required',
    'string.uuid': 'transactionId must be a valid UUID'
  })
});

// Admin dashboard routes
router.get('/dashboard', adminController.getDashboard.bind(adminController));

router.get(
  '/quotes/pending',
  validateRequest(pendingQuotesQuerySchema, 'query'),
  adminController.getPendingQuotes.bind(adminController)
);

router.put(
  '/quotes/:quoteId/approve',
  validateRequest(uuidParamSchema, 'params'),
  validateRequest(quoteApprovalSchema, 'body'),
  adminController.processQuoteApproval.bind(adminController)
);

// Contractor management routes
router.get('/contractors', adminController.getContractorManagement.bind(adminController));

router.get(
  '/contractors/:contractorId',
  validateRequest(uuidParamSchema, 'params'),
  adminController.getContractorManagement.bind(adminController)
);

// Withdrawal management routes
router.get('/withdrawals/pending', adminController.getPendingWithdrawals.bind(adminController));

router.put(
  '/withdrawals/:transactionId/approve',
  validateRequest(uuidParamSchema, 'params'),
  validateRequest(withdrawalApprovalSchema, 'body'),
  adminController.approveWithdrawal.bind(adminController)
);

router.put(
  '/withdrawals/:transactionId/reject',
  validateRequest(uuidParamSchema, 'params'),
  validateRequest(withdrawalRejectionSchema, 'body'),
  adminController.rejectWithdrawal.bind(adminController)
);

// Analytics routes
router.get(
  '/analytics',
  validateRequest(analyticsQuerySchema, 'query'),
  adminController.getSystemAnalytics.bind(adminController)
);

// Detailed quotation review routes
router.get(
  '/quotations/:quotationId',
  validateRequest(uuidParamSchema, 'params'),
  adminController.getDetailedQuotation.bind(adminController)
);

router.put(
  '/quotations/:quotationId/review',
  validateRequest(uuidParamSchema, 'params'),
  validateRequest(quoteApprovalSchema, 'body'),
  adminController.reviewDetailedQuotation.bind(adminController)
);

// Health check for admin endpoints
router.get('/health', (req: any, res) => {
  res.status(200).json({
    success: true,
    message: 'Admin API is healthy',
    timestamp: new Date().toISOString(),
    admin_id: req.user?.id
  });
});

export default router;