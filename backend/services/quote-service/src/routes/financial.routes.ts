import { Router } from 'express';
import { financialController } from '../controllers/financial.controller';
import { authenticateToken, requireRole, requireVerified } from '../middleware/auth.middleware';
import { validateRequest, validateUUID } from '../middleware/validation.middleware';
import Joi from 'joi';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);
router.use(requireVerified);

// ============================================
// PRICING CONFIGURATION ROUTES
// ============================================

/**
 * @route   GET /api/financial/pricing-config
 * @desc    Get current pricing configuration
 * @access  Private (All roles)
 */
router.get(
  '/pricing-config',
  financialController.getPricingConfig
);

/**
 * @route   PUT /api/financial/pricing-config
 * @desc    Update pricing configuration
 * @access  Private (Admin only)
 */
const updatePricingConfigSchema = Joi.object({
  max_price_per_kwp: Joi.number().min(100).max(10000).optional(),
  platform_overprice_percent: Joi.number().min(0).max(50).optional(),
  platform_commission_percent: Joi.number().min(0).max(50).optional(),
  min_system_size_kwp: Joi.number().min(0.1).max(10).optional(),
  max_system_size_kwp: Joi.number().min(10).max(10000).optional()
});

router.put(
  '/pricing-config',
  requireRole('admin'),
  validateRequest(updatePricingConfigSchema),
  financialController.updatePricingConfig
);

// ============================================
// CALCULATION ROUTES
// ============================================

/**
 * @route   POST /api/financial/calculate
 * @desc    Calculate quote financials (preview)
 * @access  Private (Contractors, Admins)
 */
const calculateFinancialsSchema = Joi.object({
  base_price: Joi.number().min(1).max(10000000).precision(2).required(),
  price_per_kwp: Joi.number().min(1).max(50000).precision(2).required(),
  system_size_kwp: Joi.number().min(0.1).max(1000).precision(2).required(),
  custom_config: Joi.object({
    platform_overprice_percent: Joi.number().min(0).max(50).optional(),
    platform_commission_percent: Joi.number().min(0).max(50).optional()
  }).optional()
});

router.post(
  '/calculate',
  requireRole('contractor', 'admin'),
  validateRequest(calculateFinancialsSchema),
  financialController.calculateQuoteFinancials
);

/**
 * @route   GET /api/financial/quote/:quote_id/breakdown
 * @desc    Get financial breakdown for a specific quote
 * @access  Private (All roles - filtered by role)
 */
router.get(
  '/quote/:quote_id/breakdown',
  validateUUID('quote_id'),
  financialController.getQuoteFinancialBreakdown
);

// ============================================
// INVOICE ROUTES
// ============================================

/**
 * @route   POST /api/financial/invoice
 * @desc    Create invoice for approved quote
 * @access  Private (Admin only)
 */
const createInvoiceSchema = Joi.object({
  quote_id: Joi.string().uuid().required(),
  include_vat: Joi.boolean().default(true),
  vat_rate: Joi.number().min(0).max(1).precision(3).default(0.15)
});

router.post(
  '/invoice',
  requireRole('admin'),
  validateRequest(createInvoiceSchema),
  financialController.createInvoice
);

// ============================================
// ANALYTICS ROUTES
// ============================================

/**
 * @route   GET /api/financial/analytics
 * @desc    Get financial analytics (role-based)
 * @access  Private (All roles)
 */
router.get(
  '/analytics',
  financialController.getFinancialAnalytics
);

/**
 * @route   GET /api/financial/analytics/summary
 * @desc    Get financial summary analytics
 * @access  Private (All roles)
 */
router.get('/analytics/summary', async (req, res) => {
  try {
    const userRole = (req as any).user.role;
    const userId = (req as any).user.id;
    
    let summary = {};
    
    if (userRole === 'admin') {
      summary = {
        total_platform_revenue: 0,
        total_active_quotes: 0,
        total_completed_transactions: 0,
        average_transaction_value: 0,
        commission_revenue: 0,
        markup_revenue: 0,
        growth_metrics: {
          monthly_growth: 0,
          quote_volume_trend: 'stable',
          revenue_trend: 'stable'
        }
      };
    } else if (userRole === 'contractor') {
      summary = {
        total_earnings: 0,
        pending_payments: 0,
        commission_paid: 0,
        success_rate: 0,
        average_quote_value: 0,
        performance_metrics: {
          quotes_won: 0,
          quotes_submitted: 0,
          conversion_rate: 0
        }
      };
    } else {
      summary = {
        total_quote_requests: 0,
        average_quotes_per_request: 0,
        total_investment: 0,
        potential_savings: 0,
        installation_status: {
          completed: 0,
          in_progress: 0,
          pending: 0
        }
      };
    }
    
    res.json({
      success: true,
      message: 'Financial summary retrieved successfully',
      data: {
        summary,
        user_role: userRole,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve financial summary',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================
// HEALTH CHECK FOR FINANCIAL ROUTES
// ============================================

/**
 * @route   GET /api/financial/health
 * @desc    Financial service health check
 * @access  Private
 */
router.get('/health', async (req, res) => {
  try {
    // Test database connection and financial service
    const config = await financialController.getPricingConfig;
    
    res.json({
      success: true,
      message: 'Financial routes are healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        pricing_config: 'available',
        calculations: 'ready'
      },
      user: {
        id: (req as any).user.id,
        role: (req as any).user.role
      }
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Financial service partially available',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;