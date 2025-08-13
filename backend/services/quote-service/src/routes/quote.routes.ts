import { Router } from 'express';
import { quoteController } from '../controllers/quote.controller';
import { authenticateToken, requireRole, requireVerified } from '../middleware/auth.middleware';
import { validateRequest, validateUUID, validateBusinessConstraints } from '../middleware/validation.middleware';
import {
  createQuoteRequestSchema,
  submitQuoteSchema,
  updateQuoteRequestSchema,
  selectQuoteSchema,
  getQuoteRequestsSchema,
  getQuotesForRequestSchema,
  compareQuotesSchema
} from '../validators/quote.validator';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);
// Note: Verification not required for quote operations - users can request quotes before full verification

// ============================================
// USER ROUTES (Quote Requests)
// ============================================

/**
 * @route   POST /api/quotes/request
 * @desc    Create a new quote request
 * @access  Private (Users only)
 */
router.post(
  '/request',
  requireRole('user'),
  validateRequest(createQuoteRequestSchema),
  quoteController.createQuoteRequest
);

/**
 * @route   GET /api/quotes/my-requests
 * @desc    Get user's quote requests
 * @access  Private (Users only)
 */
router.get(
  '/my-requests',
  requireRole('user'),
  validateRequest(getQuoteRequestsSchema, 'query'),
  quoteController.getUserQuoteRequests
);

/**
 * @route   GET /api/quotes/request/:id
 * @desc    Get a specific quote request by ID
 * @access  Private (Users, Admins)
 */
router.get(
  '/request/:id',
  validateUUID('id'),
  requireRole('user', 'admin'),
  quoteController.getQuoteRequestById
);

/**
 * @route   PUT /api/quotes/request/:id/status
 * @desc    Update quote request status
 * @access  Private (Users only)
 */
router.put(
  '/request/:id/status',
  validateUUID('id'),
  requireRole('user'),
  validateRequest(updateQuoteRequestSchema),
  quoteController.updateQuoteRequestStatus
);

/**
 * @route   GET /api/quotes/request/:request_id/quotes
 * @desc    Get quotes for a specific request
 * @access  Private (Users, Admins)
 */
router.get(
  '/request/:request_id/quotes',
  validateUUID('request_id'),
  requireRole('user', 'admin'),
  validateRequest(getQuotesForRequestSchema, 'query'),
  quoteController.getQuotesForRequest
);

/**
 * @route   POST /api/quotes/compare
 * @desc    Compare multiple quotes for a request
 * @access  Private (Users only)
 */
router.post(
  '/compare',
  requireRole('user'),
  validateRequest(compareQuotesSchema),
  quoteController.compareQuotes
);

/**
 * @route   POST /api/quotes/select
 * @desc    Select a quote
 * @access  Private (Users only)
 */
router.post(
  '/select',
  requireRole('user'),
  validateRequest(selectQuoteSchema),
  quoteController.selectQuote
);

/**
 * @route   GET /api/quotes/user/request/:request_id/approved-quotations
 * @desc    Get approved quotations for user's request
 * @access  Private (Users only)
 */
router.get(
  '/user/request/:request_id/approved-quotations',
  requireRole('user'),
  validateUUID('request_id'),
  quoteController.getUserApprovedQuotations
);

/**
 * @route   GET /api/quotes/user/quotation/:quotation_id
 * @desc    Get specific quotation details for user
 * @access  Private (Users only)
 */
router.get(
  '/user/quotation/:quotation_id',
  requireRole('user'),
  validateUUID('quotation_id'),
  quoteController.getUserQuotationDetails
);

/**
 * @route   POST /api/quotes/user/select/:quotation_id
 * @desc    Select a quotation (accept quote)
 * @access  Private (Users only)
 */
router.post(
  '/user/select/:quotation_id',
  requireRole('user'),
  validateUUID('quotation_id'),
  quoteController.selectUserQuotation
);

/**
 * @route   GET /api/quotes/available-contractors
 * @desc    Get available contractors for quote requests (only contractors who can login)
 * @access  Private (Users only)
 */
router.get(
  '/available-contractors',
  requireRole('user'),
  quoteController.getAvailableContractors
);

// ============================================
// CONTRACTOR ROUTES (Quote Submissions)
// ============================================

/**
 * @route   POST /api/quotes/submit
 * @desc    Submit a quote for a request
 * @access  Private (Contractors only)
 */
router.post(
  '/submit',
  requireRole('contractor'),
  validateRequest(submitQuoteSchema),
  validateBusinessConstraints.pricePerKwp,
  quoteController.submitQuote
);

/**
 * @route   GET /api/quotes/contractor/my-quotes
 * @desc    Get contractor's submitted quotes
 * @access  Private (Contractors only)
 */
router.get(
  '/contractor/my-quotes',
  requireRole('contractor'),
  validateRequest(getQuoteRequestsSchema, 'query'),
  quoteController.getContractorQuotes
);

/**
 * @route   GET /api/quotes/contractor/available-requests
 * @desc    Get available quote requests for contractors
 * @access  Private (Contractors only)
 */
router.get(
  '/contractor/available-requests',
  requireRole('contractor'),
  validateRequest(getQuoteRequestsSchema, 'query'),
  quoteController.getAvailableRequests
);

/**
 * @route   GET /api/quotes/contractor/assigned-requests
 * @desc    Get assigned quote requests for contractor
 * @access  Private (Contractors only)
 */
router.get(
  '/contractor/assigned-requests',
  requireRole('contractor'),
  validateRequest(getQuoteRequestsSchema, 'query'),
  quoteController.getContractorAssignedRequests
);

/**
 * @route   POST /api/quotes/contractor/respond/:request_id
 * @desc    Contractor respond to quote request (accept/reject)
 * @access  Private (Contractors only)
 */
router.post(
  '/contractor/respond/:request_id',
  requireRole('contractor'),
  validateUUID('request_id'),
  quoteController.contractorRespondToRequest
);

/**
 * @route   POST /api/quotes/contractor/submit-detailed-quotation
 * @desc    Submit detailed quotation with line items
 * @access  Private (Contractors only)
 */
router.post(
  '/contractor/submit-detailed-quotation',
  requireRole('contractor'),
  // TODO: Add validation schema for detailed quotation
  quoteController.submitDetailedQuotation
);

// ============================================
// SHARED ROUTES
// ============================================

/**
 * @route   GET /api/quotes/analytics/summary
 * @desc    Get quote analytics summary
 * @access  Private (All roles)
 */
router.get('/analytics/summary', async (req, res) => {
  try {
    const userRole = (req as any).user.role;
    const _userId = (req as any).user.id;
    
    // Basic analytics based on user role
    let analytics = {};
    
    if (userRole === 'user') {
      // User analytics: their requests and quotes received
      analytics = {
        total_requests: 0,
        active_requests: 0,
        completed_requests: 0,
        total_quotes_received: 0,
        average_quote_price: 0,
        selected_quotes: 0
      };
    } else if (userRole === 'contractor') {
      // Contractor analytics: their quotes and performance
      analytics = {
        total_quotes_submitted: 0,
        quotes_pending_review: 0,
        quotes_approved: 0,
        quotes_selected: 0,
        total_potential_revenue: 0,
        average_quote_price: 0,
        success_rate: 0
      };
    } else if (userRole === 'admin') {
      // Admin analytics: platform overview
      analytics = {
        total_requests: 0,
        total_quotes: 0,
        total_contractors: 0,
        total_users: 0,
        platform_revenue: 0,
        average_system_size: 0
      };
    }
    
    res.json({
      success: true,
      message: 'Analytics retrieved successfully',
      data: {
        analytics,
        user_role: userRole
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve analytics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================
// NOTE: Admin endpoints are now handled by admin.routes.ts
// Mounted on /api/admin/ prefix in the server
// ============================================

// ============================================
// HEALTH CHECK FOR QUOTE ROUTES
// ============================================

/**
 * @route   GET /api/quotes/health
 * @desc    Quote service health check
 * @access  Private
 */
router.get('/health', async (req, res) => {
  res.json({
    success: true,
    message: 'Quote routes are healthy',
    timestamp: new Date().toISOString(),
    user: {
      id: (req as any).user.id,
      role: (req as any).user.role
    }
  });
});

export default router;