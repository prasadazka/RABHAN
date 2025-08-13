/**
 * RABHAN Marketplace Service - API Routes Index
 * SAMA Compliant | Zero-Trust Security | Sub-2ms Performance
 */

import { Router } from 'express';
import { productRoutes } from './product.routes';
import { categoryRoutes } from './category.routes';
import { orderRoutes } from './order.routes';
import { approvalRoutes } from './approval.routes';
import { healthRoutes } from './health.routes';

const router = Router();

// API version prefix
const API_VERSION = '/api/v1';

// =====================================================
// ROUTE MAPPINGS
// =====================================================

// Health check routes (no versioning for monitoring)
router.use('/health', healthRoutes);

// Category routes - Categories first for better SEO structure
router.use(`${API_VERSION}/categories`, categoryRoutes);

// Product routes
router.use(`${API_VERSION}/products`, productRoutes);

// Order management routes
router.use(`${API_VERSION}/orders`, orderRoutes);

// Product approval workflow routes
router.use(`${API_VERSION}/approvals`, approvalRoutes);

// =====================================================
// ROOT API INFO ENDPOINT
// =====================================================

router.get(API_VERSION, (req, res) => {
  res.json({
    service: 'RABHAN Marketplace Service',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    endpoints: {
      categories: {
        base: `${API_VERSION}/categories`,
        description: 'Solar product category management',
        public_endpoints: [
          'GET / - Get all active categories',
          'GET /:id - Get category by ID',
          'GET /slug/:slug - Get category by slug'
        ],
        admin_endpoints: [
          'POST / - Create category',
          'PUT /:id - Update category',
          'DELETE /:id - Delete category',
          'GET /paginated - Get paginated categories',
          'GET /stats - Get category statistics',
          'PUT /reorder - Reorder categories'
        ]
      },
      products: {
        base: `${API_VERSION}/products`,
        description: 'Solar product catalog management',
        public_endpoints: [
          'GET /search - Search products with filters',
          'GET /:id - Get product by ID'
        ],
        contractor_endpoints: [
          'POST / - Create product',
          'PUT /:id - Update own product',
          'DELETE /:id - Delete own product',
          'GET /contractor/:contractorId - Get contractor products'
        ],
        admin_endpoints: [
          'GET /stats - Get product statistics'
        ]
      },
      orders: {
        base: `${API_VERSION}/orders`,
        description: 'Complete order management system',
        user_endpoints: [
          'POST / - Create new order',
          'GET /user/:userId - Get user orders',
          'GET /:id - Get order by ID'
        ],
        admin_endpoints: [
          'GET /all - Get all orders',
          'GET /stats - Get order statistics',
          'PUT /:id/status - Update order status'
        ]
      },
      approvals: {
        base: `${API_VERSION}/approvals`,
        description: 'Product approval workflow management',
        contractor_endpoints: [
          'POST /submit/:productId - Submit product for approval',
          'GET /history/:productId - Get approval history'
        ],
        admin_endpoints: [
          'GET /pending - Get pending approvals',
          'POST /:productId - Process approval (approve/reject/request changes)',
          'POST /bulk-approve - Bulk approve products',
          'GET /stats - Get approval statistics'
        ]
      }
    },
    authentication: {
      type: 'Bearer Token (JWT)',
      header: 'Authorization: Bearer <token>',
      roles: ['USER', 'CONTRACTOR', 'ADMIN', 'SUPER_ADMIN']
    },
    compliance: {
      sama_compliant: true,
      audit_logging: true,
      data_encryption: true,
      zero_trust_security: true
    },
    performance: {
      target_response_time: '<2ms',
      database_optimization: 'Sub-2ms queries',
      caching: 'Redis-based caching'
    }
  });
});

// =====================================================
// 404 HANDLER FOR API ROUTES
// =====================================================

router.all('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.path}`,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.context?.requestId || 'unknown',
      version: '1.0.0'
    },
    available_endpoints: {
      health: '/health',
      categories: `${API_VERSION}/categories`,
      products: `${API_VERSION}/products`,
      orders: `${API_VERSION}/orders`,
      approvals: `${API_VERSION}/approvals`,
      api_info: API_VERSION
    }
  });
});

export { router as apiRoutes };