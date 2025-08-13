/**
 * RABHAN Marketplace Service - Order Routes
 * SAMA Compliant | Zero-Trust Security | Complete Order Management
 */

import { Router } from 'express';
import { orderController } from '@/controllers/order.controller';
import { 
  authenticateToken, 
  requireRole, 
  requireAdmin,
  UserRole 
} from '@/middleware/auth.middleware';

const router = Router();

// =====================================================
// SPECIFIC ROUTES (Must be before dynamic routes)
// =====================================================

/**
 * Get all orders (Admin only)
 * GET /api/v1/orders/all
 * Admin dashboard - view all orders in system
 */
router.get(
  '/all',
  authenticateToken,
  requireAdmin,
  orderController.getAllOrders.bind(orderController)
);

/**
 * Get order statistics (Admin only)
 * GET /api/v1/orders/stats
 * Admin dashboard - order analytics
 */
router.get(
  '/stats',
  authenticateToken,
  requireAdmin,
  orderController.getOrderStats.bind(orderController)
);

/**
 * Get user orders with pagination
 * GET /api/v1/orders/user/:userId
 * Users can only see their own orders, admins can see all
 */
router.get(
  '/user/:userId',
  authenticateToken,
  requireRole([UserRole.USER, UserRole.CONTRACTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  orderController.getUserOrders.bind(orderController)
);

// =====================================================
// MAIN ORDER ROUTES
// =====================================================

/**
 * Create new order
 * POST /api/v1/orders
 * Any authenticated user can create orders
 */
router.post(
  '/',
  authenticateToken,
  requireRole([UserRole.USER, UserRole.CONTRACTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  orderController.createOrder.bind(orderController)
);

// =====================================================
// DYNAMIC ROUTES (Must be last to avoid conflicts)
// =====================================================

/**
 * Get order by ID
 * GET /api/v1/orders/:id
 * Users can only see their own orders, admins can see all
 */
router.get(
  '/:id',
  authenticateToken,
  requireRole([UserRole.USER, UserRole.CONTRACTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  orderController.getOrderById.bind(orderController)
);

/**
 * Update order status
 * PUT /api/v1/orders/:id/status
 * Admin only - for order processing workflow
 */
router.put(
  '/:id/status',
  authenticateToken,
  requireAdmin,
  orderController.updateOrderStatus.bind(orderController)
);

export { router as orderRoutes };