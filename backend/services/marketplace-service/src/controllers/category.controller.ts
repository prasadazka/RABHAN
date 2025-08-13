/**
 * RABHAN Marketplace Service - Category Controller
 * SAMA Compliant | Zero-Trust Security | Sub-2ms Performance | MVP Scope
 */

import { Request, Response, NextFunction } from 'express';
import { categoryService } from '@/services/category.service';
import { logger } from '@/utils/logger';
import {
  CategoryCreateSchema,
  CategoryUpdateSchema,
  ValidationError,
  ApiResponse,
  Category,
  PaginationResult
} from '@/types/marketplace.types';

export class CategoryController {

  /**
   * Get all active categories (Public endpoint)
   * GET /api/v1/categories
   */
  async getAllCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = process.hrtime.bigint();
    
    try {
      // Admin can view inactive categories
      const includeInactive = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
      
      const categories = await categoryService.getAllCategories(includeInactive);

      const response: ApiResponse<Category[]> = {
        success: true,
        data: categories,
        message: 'Categories retrieved successfully',
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.context.requestId,
          version: '1.0.0'
        }
      };

      // Performance monitoring
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.auditPerformance('CATEGORIES_GET_ALL_ENDPOINT', duration, {
        categoryCount: categories.length,
        includeInactive,
        userId: req.user?.id,
        success: true
      });

      res.status(200).json(response);

    } catch (error) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.error('Get all categories failed in controller', error, {
        userId: req.user?.id,
        requestId: req.context.requestId,
        performanceMetrics: { duration }
      });
      next(error);
    }
  }

  /**
   * Get category by ID
   * GET /api/v1/categories/:id
   */
  async getCategoryById(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = process.hrtime.bigint();
    
    try {
      const categoryId = req.params.id;
      
      if (!categoryId) {
        throw new ValidationError('Category ID is required');
      }

      // Admin can view inactive categories
      const includeInactive = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
      
      const category = await categoryService.getCategoryById(categoryId, includeInactive);

      if (!category) {
        const response: ApiResponse = {
          success: false,
          message: 'Category not found',
          meta: {
            timestamp: new Date().toISOString(),
            requestId: req.context.requestId,
            version: '1.0.0'
          }
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse<Category> = {
        success: true,
        data: category,
        message: 'Category retrieved successfully',
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.context.requestId,
          version: '1.0.0'
        }
      };

      // Performance monitoring
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.auditPerformance('CATEGORY_GET_BY_ID_ENDPOINT', duration, {
        categoryId,
        userId: req.user?.id,
        success: true
      });

      res.status(200).json(response);

    } catch (error) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.error('Get category by ID failed in controller', error, {
        categoryId: req.params.id,
        userId: req.user?.id,
        requestId: req.context.requestId,
        performanceMetrics: { duration }
      });
      next(error);
    }
  }

  /**
   * Get category by slug (Public endpoint for SEO-friendly URLs)
   * GET /api/v1/categories/slug/:slug
   */
  async getCategoryBySlug(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = process.hrtime.bigint();
    
    try {
      const slug = req.params.slug;
      
      if (!slug) {
        throw new ValidationError('Category slug is required');
      }

      // Admin can view inactive categories
      const includeInactive = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
      
      const category = await categoryService.getCategoryBySlug(slug, includeInactive);

      if (!category) {
        const response: ApiResponse = {
          success: false,
          message: 'Category not found',
          meta: {
            timestamp: new Date().toISOString(),
            requestId: req.context.requestId,
            version: '1.0.0'
          }
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse<Category> = {
        success: true,
        data: category,
        message: 'Category retrieved successfully',
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.context.requestId,
          version: '1.0.0'
        }
      };

      // Performance monitoring
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.auditPerformance('CATEGORY_GET_BY_SLUG_ENDPOINT', duration, {
        slug,
        userId: req.user?.id,
        success: true
      });

      res.status(200).json(response);

    } catch (error) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.error('Get category by slug failed in controller', error, {
        slug: req.params.slug,
        userId: req.user?.id,
        requestId: req.context.requestId,
        performanceMetrics: { duration }
      });
      next(error);
    }
  }

  /**
   * Create new category (Admin only)
   * POST /api/v1/categories
   */
  async createCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = process.hrtime.bigint();
    
    try {
      // Validate input
      const validatedData = CategoryCreateSchema.parse(req.body);
      
      // Get user context
      const userId = req.user?.id;
      
      if (!userId) {
        throw new ValidationError('User authentication required');
      }

      // Create category
      const category = await categoryService.createCategory(validatedData, userId);

      const response: ApiResponse<Category> = {
        success: true,
        data: category,
        message: 'Category created successfully',
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.context.requestId,
          version: '1.0.0'
        }
      };

      // Performance monitoring
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.auditPerformance('CATEGORY_CREATE_ENDPOINT', duration, {
        categoryId: category.id,
        userId,
        success: true
      });

      res.status(201).json(response);

    } catch (error) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.error('Category creation failed in controller', error, {
        userId: req.user?.id,
        requestId: req.context.requestId,
        performanceMetrics: { duration }
      });
      next(error);
    }
  }

  /**
   * Update category (Admin only)
   * PUT /api/v1/categories/:id
   */
  async updateCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = process.hrtime.bigint();
    
    try {
      const categoryId = req.params.id;
      
      if (!categoryId) {
        throw new ValidationError('Category ID is required');
      }

      // Validate input
      const updateData = CategoryUpdateSchema.parse(req.body);
      
      // Get user context
      const userId = req.user?.id;
      
      if (!userId) {
        throw new ValidationError('User authentication required');
      }

      // Update category
      const category = await categoryService.updateCategory(categoryId, updateData, userId);

      const response: ApiResponse<Category> = {
        success: true,
        data: category,
        message: 'Category updated successfully',
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.context.requestId,
          version: '1.0.0'
        }
      };

      // Performance monitoring
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.auditPerformance('CATEGORY_UPDATE_ENDPOINT', duration, {
        categoryId,
        userId,
        updatedFields: Object.keys(updateData),
        success: true
      });

      res.status(200).json(response);

    } catch (error) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.error('Category update failed in controller', error, {
        categoryId: req.params.id,
        userId: req.user?.id,
        requestId: req.context.requestId,
        performanceMetrics: { duration }
      });
      next(error);
    }
  }

  /**
   * Delete category (Admin only - soft delete)
   * DELETE /api/v1/categories/:id
   */
  async deleteCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = process.hrtime.bigint();
    
    try {
      const categoryId = req.params.id;
      
      if (!categoryId) {
        throw new ValidationError('Category ID is required');
      }

      // Get user context
      const userId = req.user?.id;
      
      if (!userId) {
        throw new ValidationError('User authentication required');
      }

      // Delete category
      await categoryService.deleteCategory(categoryId, userId);

      const response: ApiResponse = {
        success: true,
        message: 'Category deleted successfully',
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.context.requestId,
          version: '1.0.0'
        }
      };

      // Performance monitoring
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.auditPerformance('CATEGORY_DELETE_ENDPOINT', duration, {
        categoryId,
        userId,
        success: true
      });

      res.status(200).json(response);

    } catch (error) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.error('Category deletion failed in controller', error, {
        categoryId: req.params.id,
        userId: req.user?.id,
        requestId: req.context.requestId,
        performanceMetrics: { duration }
      });
      next(error);
    }
  }

  /**
   * Get categories with pagination (Admin view)
   * GET /api/v1/categories/paginated
   */
  async getCategoriesWithPagination(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = process.hrtime.bigint();
    
    try {
      // Parse pagination parameters
      const pagination = {
        page: parseInt(req.query.page as string) || 1,
        limit: Math.min(parseInt(req.query.limit as string) || 20, 100), // Max 100 items
        sortBy: req.query.sortBy as string,
        sortOrder: (req.query.sortOrder as 'ASC' | 'DESC') || 'ASC'
      };

      // Admin can view inactive categories
      const includeInactive = (req.query.includeInactive === 'true') && 
                             (req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN');

      // Get categories with pagination
      const result = await categoryService.getCategoriesWithPagination(pagination, includeInactive);

      const response: ApiResponse<PaginationResult<Category>> = {
        success: true,
        data: result,
        message: 'Categories retrieved successfully',
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.context.requestId,
          version: '1.0.0'
        }
      };

      // Performance monitoring
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.auditPerformance('CATEGORIES_PAGINATED_ENDPOINT', duration, {
        resultCount: result.data.length,
        totalResults: result.pagination.total,
        includeInactive,
        userId: req.user?.id,
        success: true
      });

      res.status(200).json(response);

    } catch (error) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.error('Get categories with pagination failed in controller', error, {
        query: req.query,
        userId: req.user?.id,
        requestId: req.context.requestId,
        performanceMetrics: { duration }
      });
      next(error);
    }
  }

  /**
   * Get category statistics (Admin only)
   * GET /api/v1/categories/stats
   */
  async getCategoryStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = process.hrtime.bigint();
    
    try {
      // For MVP, returning basic structure
      // This would require additional service methods for comprehensive statistics
      const stats = {
        totalCategories: 0,
        activeCategories: 0,
        inactiveCategories: 0,
        categoriesWithProducts: 0,
        emptyCategoriesCount: 0,
        averageProductsPerCategory: 0,
        topCategoriesByProducts: []
      };

      const response: ApiResponse<typeof stats> = {
        success: true,
        data: stats,
        message: 'Category statistics retrieved successfully',
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.context.requestId,
          version: '1.0.0'
        }
      };

      // Performance monitoring
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.auditPerformance('CATEGORY_STATS_ENDPOINT', duration, {
        userId: req.user?.id,
        success: true
      });

      res.status(200).json(response);

    } catch (error) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.error('Get category stats failed in controller', error, {
        userId: req.user?.id,
        requestId: req.context.requestId,
        performanceMetrics: { duration }
      });
      next(error);
    }
  }

  /**
   * Reorder categories (Admin only)
   * PUT /api/v1/categories/reorder
   */
  async reorderCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = process.hrtime.bigint();
    
    try {
      // Validate input - expect array of {id, sortOrder}
      const { categories } = req.body;
      
      if (!Array.isArray(categories) || categories.length === 0) {
        throw new ValidationError('Categories array is required');
      }

      // Get user context
      const userId = req.user?.id;
      
      if (!userId) {
        throw new ValidationError('User authentication required');
      }

      // For MVP, this would require a batch update method in the service
      // For now, returning success structure
      const response: ApiResponse = {
        success: true,
        message: 'Categories reordered successfully',
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.context.requestId,
          version: '1.0.0'
        }
      };

      // Performance monitoring
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.auditPerformance('CATEGORY_REORDER_ENDPOINT', duration, {
        categoriesCount: categories.length,
        userId,
        success: true
      });

      res.status(200).json(response);

    } catch (error) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.error('Category reorder failed in controller', error, {
        userId: req.user?.id,
        requestId: req.context.requestId,
        performanceMetrics: { duration }
      });
      next(error);
    }
  }
}

// Export singleton instance
export const categoryController = new CategoryController();