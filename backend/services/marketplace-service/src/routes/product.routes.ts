/**
 * RABHAN Marketplace Service - Product Routes
 * SAMA Compliant | Zero-Trust Security | Sub-2ms Performance
 */

import { Router } from 'express';
import { productController } from '@/controllers/product.controller';
import { 
  authenticateToken, 
  optionalAuthentication,
  requireRole, 
  requireContractor,
  requireContractorAccess,
  requireAdmin,
  UserRole 
} from '@/middleware/auth.middleware';

const router = Router();

// =====================================================
// SPECIFIC ROUTES (Must be before dynamic routes)
// =====================================================

/**
 * Search products with filters and pagination
 * GET /api/v1/products/search
 * Public endpoint with optional authentication for personalized results
 */
router.get(
  '/search',
  optionalAuthentication,
  productController.searchProducts.bind(productController)
);

/**
 * Get product statistics
 * GET /api/v1/products/stats
 * Admin-only endpoint for dashboard analytics
 */
router.get(
  '/stats',
  authenticateToken,
  requireAdmin,
  productController.getProductStats.bind(productController)
);

// =====================================================
// CONTRACTOR ROUTES (Authentication Required)
// =====================================================

/**
 * Create new product
 * POST /api/v1/products
 * Contractors can create products for themselves
 */
router.post(
  '/',
  authenticateToken,
  requireContractor,
  productController.createProduct.bind(productController)
);

/**
 * Update product
 * PUT /api/v1/products/:id
 * Contractors can only update their own products
 * Admins can update any product
 */
router.put(
  '/:id',
  authenticateToken,
  requireRole([UserRole.CONTRACTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  productController.updateProduct.bind(productController)
);

/**
 * Delete product (hard delete)
 * DELETE /api/v1/products/:id
 * Contractors can only delete their own products
 * Admins can delete any product
 */
router.delete(
  '/:id',
  authenticateToken,
  requireRole([UserRole.CONTRACTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  productController.deleteProduct.bind(productController)
);

/**
 * Get products by contractor
 * GET /api/v1/products/contractor/:contractorId
 * Contractors can view their own products
 * Admins can view any contractor's products
 */
router.get(
  '/contractor/:contractorId',
  authenticateToken,
  requireRole([UserRole.CONTRACTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireContractorAccess('contractorId'),
  productController.getProductsByContractor.bind(productController)
);

// Stats route moved to top to avoid conflicts with /:id route

// =====================================================
// DYNAMIC ROUTES (Must be last to avoid conflicts)
// =====================================================

/**
 * Get product by ID
 * GET /api/v1/products/:id
 * Public endpoint with optional authentication for contractor context
 */
router.get(
  '/:id',
  optionalAuthentication,
  productController.getProductById.bind(productController)
);

export { router as productRoutes };