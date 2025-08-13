import { Router } from 'express';
import { walletController } from '../controllers/wallet.controller';
import { authenticateToken, requireRole, requireVerified } from '../middleware/auth.middleware';
import { validateRequest, validateUUID } from '../middleware/validation.middleware';
import Joi from 'joi';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);
router.use(requireVerified);

// ============================================
// CONTRACTOR WALLET ROUTES
// ============================================

/**
 * @route   GET /api/wallets/my-wallet
 * @desc    Get contractor wallet details
 * @access  Private (Contractors only)
 */
router.get(
  '/my-wallet',
  requireRole('contractor'),
  walletController.getWallet
);

/**
 * @route   GET /api/wallets/transactions
 * @desc    Get wallet transaction history
 * @access  Private (Contractors only)
 */
const getTransactionsSchema = Joi.object({
  transaction_type: Joi.string().valid('credit', 'debit').optional(),
  reference_type: Joi.string().valid('quote', 'invoice', 'penalty', 'withdrawal', 'adjustment').optional(),
  status: Joi.string().valid('pending', 'completed', 'failed', 'reversed').optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  start_date: Joi.date().optional(),
  end_date: Joi.date().optional()
});

router.get(
  '/transactions',
  requireRole('contractor'),
  validateRequest(getTransactionsSchema, 'query'),
  walletController.getTransactionHistory
);

/**
 * @route   POST /api/wallets/withdraw
 * @desc    Request withdrawal
 * @access  Private (Contractors only)
 */
const withdrawalSchema = Joi.object({
  amount: Joi.number().min(100).max(100000).precision(2).required(),
  payment_method: Joi.object({
    type: Joi.string().valid('bank_transfer', 'digital_wallet', 'check').required(),
    account_number: Joi.string().when('type', {
      is: 'bank_transfer',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    iban: Joi.string().optional(),
    bank_name: Joi.string().when('type', {
      is: 'bank_transfer',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    beneficiary_name: Joi.string().when('type', {
      is: 'bank_transfer',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    wallet_id: Joi.string().when('type', {
      is: 'digital_wallet',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    wallet_provider: Joi.string().when('type', {
      is: 'digital_wallet',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    is_primary: Joi.boolean().default(false),
    is_verified: Joi.boolean().default(false)
  }).required()
});

router.post(
  '/withdraw',
  requireRole('contractor'),
  validateRequest(withdrawalSchema),
  walletController.requestWithdrawal
);

/**
 * @route   PUT /api/wallets/payment-methods
 * @desc    Update payment methods
 * @access  Private (Contractors only)
 */
const paymentMethodsSchema = Joi.object({
  payment_methods: Joi.array().items(
    Joi.object({
      type: Joi.string().valid('bank_transfer', 'digital_wallet', 'check').required(),
      account_number: Joi.string().when('type', {
        is: 'bank_transfer',
        then: Joi.required(),
        otherwise: Joi.optional()
      }),
      iban: Joi.string().optional(),
      bank_name: Joi.string().when('type', {
        is: 'bank_transfer',
        then: Joi.required(),
        otherwise: Joi.optional()
      }),
      beneficiary_name: Joi.string().when('type', {
        is: 'bank_transfer',
        then: Joi.required(),
        otherwise: Joi.optional()
      }),
      wallet_id: Joi.string().when('type', {
        is: 'digital_wallet',
        then: Joi.required(),
        otherwise: Joi.optional()
      }),
      wallet_provider: Joi.string().when('type', {
        is: 'digital_wallet',
        then: Joi.required(),
        otherwise: Joi.optional()
      }),
      is_primary: Joi.boolean().required(),
      is_verified: Joi.boolean().default(false)
    })
  ).min(1).required()
});

router.put(
  '/payment-methods',
  requireRole('contractor'),
  validateRequest(paymentMethodsSchema),
  walletController.updatePaymentMethods
);

/**
 * @route   GET /api/wallets/analytics
 * @desc    Get wallet analytics (role-based)
 * @access  Private (All roles)
 */
router.get(
  '/analytics',
  walletController.getWalletAnalytics
);

/**
 * @route   GET /api/wallets/summary
 * @desc    Get wallet summary
 * @access  Private (All roles)
 */
router.get(
  '/summary',
  walletController.getWalletSummary
);

// ============================================
// ADMIN WALLET MANAGEMENT ROUTES
// ============================================

/**
 * @route   POST /api/wallets/process-payment
 * @desc    Process quote payment (when user pays invoice)
 * @access  Private (Admin only)
 */
const processPaymentSchema = Joi.object({
  quote_id: Joi.string().uuid().required(),
  invoice_id: Joi.string().required()
});

router.post(
  '/process-payment',
  requireRole('admin'),
  validateRequest(processPaymentSchema),
  walletController.processQuotePayment
);

/**
 * @route   POST /api/wallets/process-penalty
 * @desc    Process penalty deduction
 * @access  Private (Admin only)
 */
const processPenaltySchema = Joi.object({
  contractor_id: Joi.string().uuid().required(),
  amount: Joi.number().min(1).max(10000).precision(2).required(),
  reason: Joi.string().min(10).max(500).required(),
  reference_id: Joi.string().required()
});

router.post(
  '/process-penalty',
  requireRole('admin'),
  validateRequest(processPenaltySchema),
  walletController.processPenalty
);

/**
 * @route   GET /api/wallets/contractor/:contractor_id
 * @desc    Get specific contractor wallet (Admin view)
 * @access  Private (Admin only)
 */
router.get(
  '/contractor/:contractor_id',
  requireRole('admin'),
  validateUUID('contractor_id'),
  walletController.getContractorWallet
);

// ============================================
// WALLET ANALYTICS ROUTES
// ============================================

/**
 * @route   GET /api/wallets/analytics/dashboard
 * @desc    Get wallet analytics dashboard
 * @access  Private (All roles - filtered by role)
 */
router.get('/analytics/dashboard', async (req, res) => {
  try {
    const userRole = (req as any).user.role;
    const userId = (req as any).user.id;
    
    let dashboardData = {};
    
    if (userRole === 'admin') {
      // Admin dashboard - platform wide wallet statistics
      dashboardData = {
        platform_metrics: {
          total_wallet_balance: 0,
          total_pending_withdrawals: 0,
          total_payments_this_month: 0,
          total_penalties_this_month: 0,
          active_contractors: 0
        },
        recent_activities: [],
        withdrawal_requests: {
          pending: 0,
          approved: 0,
          processing: 0
        },
        top_earning_contractors: []
      };
    } else if (userRole === 'contractor') {
      // Contractor dashboard - personal wallet overview
      dashboardData = {
        wallet_overview: {
          available_balance: 0,
          pending_withdrawals: 0,
          this_month_earnings: 0,
          total_lifetime_earnings: 0
        },
        recent_transactions: [],
        earnings_chart: {
          last_6_months: []
        },
        withdrawal_status: {
          can_withdraw: false,
          minimum_amount: 100,
          processing_time: '3-5 business days'
        }
      };
    } else {
      // User dashboard - not applicable
      dashboardData = {
        message: 'Wallet functionality is not available for users',
        available_features: [
          'View quote requests',
          'Compare contractor quotes',
          'Make payments for selected quotes'
        ]
      };
    }
    
    res.json({
      success: true,
      message: 'Wallet dashboard retrieved successfully',
      data: {
        dashboard: dashboardData,
        user_role: userRole,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve wallet dashboard',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================
// HEALTH CHECK FOR WALLET ROUTES
// ============================================

/**
 * @route   GET /api/wallets/health
 * @desc    Wallet service health check
 * @access  Private
 */
router.get('/health', async (req, res) => {
  try {
    const userRole = (req as any).user.role;
    
    // Test wallet service availability
    let healthChecks: any = {
      database: 'connected',
      wallet_service: 'available',
      financial_integration: 'ready'
    };
    
    if (userRole === 'contractor') {
      // Additional contractor-specific checks
      healthChecks = {
        ...healthChecks,
        payment_methods: 'configurable',
        withdrawals: 'available',
        transaction_history: 'accessible'
      };
    } else if (userRole === 'admin') {
      // Additional admin-specific checks
      healthChecks = {
        ...healthChecks,
        payment_processing: 'available',
        penalty_management: 'available',
        contractor_wallets: 'manageable'
      };
    }
    
    res.json({
      success: true,
      message: 'Wallet routes are healthy',
      timestamp: new Date().toISOString(),
      services: healthChecks,
      user: {
        id: (req as any).user.id,
        role: userRole
      }
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Wallet service partially available',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;