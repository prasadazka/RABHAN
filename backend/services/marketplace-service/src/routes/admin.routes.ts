/**
 * RABHAN Marketplace Service - Admin Routes
 * SAMA Compliant | Zero-Trust Security | Admin Product Management
 */

import { Router } from 'express';
import { adminController } from '@/controllers/admin.controller';
import { 
  authenticateToken, 
  requireAdmin 
} from '@/middleware/auth.middleware';

const router = Router();

// =====================================================
// ADMIN PRODUCT MANAGEMENT ROUTES
// =====================================================

/**
 * Get all products for admin review
 * GET /api/v1/admin/products
 * Admin-only endpoint for product management
 */
router.get(
  '/products',
  authenticateToken,
  requireAdmin,
  adminController.getProducts.bind(adminController)
);

/**
 * Approve product
 * POST /api/v1/admin/products/:productId/approve
 * Admin-only endpoint for product approval
 */
router.post(
  '/products/:productId/approve',
  authenticateToken,
  requireAdmin,
  adminController.approveProduct.bind(adminController)
);

/**
 * Reject product
 * POST /api/v1/admin/products/:productId/reject
 * Admin-only endpoint for product rejection
 */
router.post(
  '/products/:productId/reject',
  authenticateToken,
  requireAdmin,
  adminController.rejectProduct.bind(adminController)
);

export { router as adminRoutes };