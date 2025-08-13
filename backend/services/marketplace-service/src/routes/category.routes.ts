/**
 * RABHAN Marketplace Service - Category Routes
 * SAMA Compliant | Zero-Trust Security | Sub-2ms Performance
 */

import { Router } from 'express';
import { categoryController } from '@/controllers/category.controller';
import { 
  authenticateToken, 
  optionalAuthentication,
  requireAdmin
} from '@/middleware/auth.middleware';

const router = Router();

// =====================================================
// SPECIFIC ROUTES (Must be before dynamic routes)
// =====================================================

/**
 * Get all active categories
 * GET /api/v1/categories
 * Public endpoint for category navigation
 * Admins with authentication can see inactive categories too
 */
router.get(
  '/',
  optionalAuthentication,
  categoryController.getAllCategories.bind(categoryController)
);

/**
 * Get categories with pagination (Admin view)
 * GET /api/v1/categories/paginated
 * Admin endpoint for category management with pagination
 */
router.get(
  '/paginated',
  authenticateToken,
  requireAdmin,
  categoryController.getCategoriesWithPagination.bind(categoryController)
);

/**
 * Get category statistics
 * GET /api/v1/categories/stats
 * Admin-only endpoint for dashboard analytics
 */
router.get(
  '/stats',
  authenticateToken,
  requireAdmin,
  categoryController.getCategoryStats.bind(categoryController)
);

/**
 * Get category by slug (SEO-friendly)
 * GET /api/v1/categories/slug/:slug
 * Public endpoint for SEO-friendly category URLs
 */
router.get(
  '/slug/:slug',
  optionalAuthentication,
  categoryController.getCategoryBySlug.bind(categoryController)
);

// =====================================================
// ADMIN ROUTES (Admin Authorization Required)
// =====================================================

/**
 * Reorder categories
 * PUT /api/v1/categories/reorder
 * Admin-only endpoint for changing category sort order
 */
router.put(
  '/reorder',
  authenticateToken,
  requireAdmin,
  categoryController.reorderCategories.bind(categoryController)
);

/**
 * Create new category
 * POST /api/v1/categories
 * Admin-only endpoint for category creation
 */
router.post(
  '/',
  authenticateToken,
  requireAdmin,
  categoryController.createCategory.bind(categoryController)
);

/**
 * Update category
 * PUT /api/v1/categories/:id
 * Admin-only endpoint for category updates
 */
router.put(
  '/:id',
  authenticateToken,
  requireAdmin,
  categoryController.updateCategory.bind(categoryController)
);

/**
 * Delete category (soft delete)
 * DELETE /api/v1/categories/:id
 * Admin-only endpoint for category deletion
 */
router.delete(
  '/:id',
  authenticateToken,
  requireAdmin,
  categoryController.deleteCategory.bind(categoryController)
);

// =====================================================
// DYNAMIC ROUTES (Must be last to avoid conflicts)
// =====================================================

/**
 * Get category by ID
 * GET /api/v1/categories/:id
 * Public endpoint with optional admin context for inactive categories
 */
router.get(
  '/:id',
  optionalAuthentication,
  categoryController.getCategoryById.bind(categoryController)
);

export { router as categoryRoutes };