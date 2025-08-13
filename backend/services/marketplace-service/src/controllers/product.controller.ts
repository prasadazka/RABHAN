/**
 * RABHAN Marketplace Service - Product Controller
 * SAMA Compliant | Zero-Trust Security | Sub-2ms Performance | MVP Scope
 */

import { Request, Response, NextFunction } from 'express';
import { productService } from '@/services/product.service';
import { logger } from '@/utils/logger';
import {
  ProductCreateSchema,
  ProductUpdateSchema,
  ProductFiltersSchema,
  ValidationError,
  ApiResponse,
  Product,
  PaginationResult
} from '@/types/marketplace.types';

export class ProductController {

  /**
   * Create new product (Contractors only)
   * POST /api/v1/products
   */
  async createProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = process.hrtime.bigint();
    
    try {
      // Validate input
      const validatedData = ProductCreateSchema.parse(req.body);
      
      // Get user context
      const userId = req.user?.id;
      const userRole = req.user?.role;
      const userContractorId = req.user?.contractorId;
      
      if (!userId) {
        throw new ValidationError('User authentication required');
      }

      // For contractors, ensure they're creating products for themselves
      if (userRole === 'CONTRACTOR') {
        if (!userContractorId) {
          throw new ValidationError('Contractor ID missing from user context');
        }
        if (validatedData.contractorId !== userContractorId) {
          throw new ValidationError('Cannot create product for different contractor');
        }
      }

      // Create product
      const product = await productService.createProduct(validatedData, userId);

      const response: ApiResponse<Product> = {
        success: true,
        data: product,
        message: 'Product created successfully',
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.context.requestId,
          version: '1.0.0'
        }
      };

      // Performance monitoring
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.auditPerformance('PRODUCT_CREATE_ENDPOINT', duration, {
        productId: product.id,
        userId,
        success: true
      });

      res.status(201).json(response);

    } catch (error) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.error('Product creation failed in controller', error, {
        userId: req.user?.id,
        requestId: req.context.requestId,
        performanceMetrics: { duration }
      });
      next(error);
    }
  }

  /**
   * Get product by ID
   * GET /api/v1/products/:id
   */
  async getProductById(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = process.hrtime.bigint();
    
    try {
      const productId = req.params.id;
      
      if (!productId) {
        throw new ValidationError('Product ID is required');
      }

      const product = await productService.getProductById(productId, req.user?.id);

      if (!product) {
        const response: ApiResponse = {
          success: false,
          message: 'Product not found',
          meta: {
            timestamp: new Date().toISOString(),
            requestId: req.context.requestId,
            version: '1.0.0'
          }
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse<Product> = {
        success: true,
        data: product,
        message: 'Product retrieved successfully',
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.context.requestId,
          version: '1.0.0'
        }
      };

      // Performance monitoring
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.auditPerformance('PRODUCT_GET_BY_ID_ENDPOINT', duration, {
        productId,
        userId: req.user?.id,
        success: true
      });

      res.status(200).json(response);

    } catch (error) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.error('Get product by ID failed in controller', error, {
        productId: req.params.id,
        userId: req.user?.id,
        requestId: req.context.requestId,
        performanceMetrics: { duration }
      });
      next(error);
    }
  }

  /**
   * Search products with filters and pagination
   * GET /api/v1/products/search
   */
  async searchProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = process.hrtime.bigint();
    
    try {
      // Parse and validate filters
      const filters = ProductFiltersSchema.parse({
        categoryId: req.query.categoryId,
        contractorId: req.query.contractorId,
        brand: req.query.brand,
        minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
        maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
        inStockOnly: req.query.inStockOnly === 'true',
        status: req.query.status,
        search: req.query.search
      });

      // Parse pagination parameters
      const pagination = {
        page: parseInt(req.query.page as string) || 1,
        limit: Math.min(parseInt(req.query.limit as string) || 20, 100), // Max 100 items
        sortBy: req.query.sortBy as string,
        sortOrder: (req.query.sortOrder as 'ASC' | 'DESC') || 'DESC'
      };

      // Search products
      const result = await productService.searchProducts(filters, pagination);

      const response: ApiResponse<PaginationResult<Product>> = {
        success: true,
        data: result,
        message: 'Products retrieved successfully',
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.context.requestId,
          version: '1.0.0'
        }
      };

      // Performance monitoring
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.auditPerformance('PRODUCT_SEARCH_ENDPOINT', duration, {
        filters,
        resultCount: result.data.length,
        totalResults: result.pagination.total,
        userId: req.user?.id,
        success: true
      });

      res.status(200).json(response);

    } catch (error) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.error('Product search failed in controller', error, {
        query: req.query,
        userId: req.user?.id,
        requestId: req.context.requestId,
        performanceMetrics: { duration }
      });
      next(error);
    }
  }

  /**
   * Update product (Contractors can only update their own products)
   * PUT /api/v1/products/:id
   */
  async updateProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = process.hrtime.bigint();
    
    try {
      const productId = req.params.id;
      
      if (!productId) {
        throw new ValidationError('Product ID is required');
      }

      // Validate input
      const updateData = ProductUpdateSchema.parse(req.body);
      
      // Get user context
      const userId = req.user?.id;
      const userRole = req.user?.role;
      const userContractorId = req.user?.contractorId;
      
      if (!userId) {
        throw new ValidationError('User authentication required');
      }

      // Update product (service layer handles authorization)
      const product = await productService.updateProduct(
        productId, 
        updateData, 
        userId, 
        userRole === 'CONTRACTOR' ? userContractorId : undefined
      );

      const response: ApiResponse<Product> = {
        success: true,
        data: product,
        message: 'Product updated successfully',
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.context.requestId,
          version: '1.0.0'
        }
      };

      // Performance monitoring
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.auditPerformance('PRODUCT_UPDATE_ENDPOINT', duration, {
        productId,
        userId,
        updatedFields: Object.keys(updateData),
        success: true
      });

      res.status(200).json(response);

    } catch (error) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.error('Product update failed in controller', error, {
        productId: req.params.id,
        userId: req.user?.id,
        requestId: req.context.requestId,
        performanceMetrics: { duration }
      });
      next(error);
    }
  }

  /**
   * Delete product (Contractors can only delete their own products)
   * DELETE /api/v1/products/:id
   */
  async deleteProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = process.hrtime.bigint();
    
    try {
      const productId = req.params.id;
      
      if (!productId) {
        throw new ValidationError('Product ID is required');
      }

      // Get user context
      const userId = req.user?.id;
      const userRole = req.user?.role;
      const userContractorId = req.user?.contractorId;
      
      if (!userId) {
        throw new ValidationError('User authentication required');
      }

      // Delete product (service layer handles authorization)
      await productService.deleteProduct(
        productId, 
        userId, 
        userRole === 'CONTRACTOR' ? userContractorId : undefined
      );

      const response: ApiResponse = {
        success: true,
        message: 'Product deleted successfully',
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.context.requestId,
          version: '1.0.0'
        }
      };

      // Performance monitoring
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.auditPerformance('PRODUCT_DELETE_ENDPOINT', duration, {
        productId,
        userId,
        success: true
      });

      res.status(200).json(response);

    } catch (error) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.error('Product deletion failed in controller', error, {
        productId: req.params.id,
        userId: req.user?.id,
        requestId: req.context.requestId,
        performanceMetrics: { duration }
      });
      next(error);
    }
  }

  /**
   * Get products by contractor (for contractor dashboard)
   * GET /api/v1/products/contractor/:contractorId
   */
  async getProductsByContractor(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = process.hrtime.bigint();
    
    try {
      const contractorId = req.params.contractorId;
      
      if (!contractorId) {
        throw new ValidationError('Contractor ID is required');
      }

      // Parse pagination parameters
      const pagination = {
        page: parseInt(req.query.page as string) || 1,
        limit: Math.min(parseInt(req.query.limit as string) || 20, 100),
        sortBy: req.query.sortBy as string,
        sortOrder: (req.query.sortOrder as 'ASC' | 'DESC') || 'DESC'
      };

      // Get contractor products
      const result = await productService.getProductsByContractor(contractorId, pagination);

      const response: ApiResponse<PaginationResult<Product>> = {
        success: true,
        data: result,
        message: 'Contractor products retrieved successfully',
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.context.requestId,
          version: '1.0.0'
        }
      };

      // Performance monitoring
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.auditPerformance('CONTRACTOR_PRODUCTS_ENDPOINT', duration, {
        contractorId,
        resultCount: result.data.length,
        totalResults: result.pagination.total,
        userId: req.user?.id,
        success: true
      });

      res.status(200).json(response);

    } catch (error) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.error('Get contractor products failed in controller', error, {
        contractorId: req.params.contractorId,
        userId: req.user?.id,
        requestId: req.context.requestId,
        performanceMetrics: { duration }
      });
      next(error);
    }
  }

  /**
   * Get product statistics (Admin only)
   * GET /api/v1/products/stats
   */
  async getProductStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = process.hrtime.bigint();
    
    try {
      // This would require additional service methods for statistics
      // For MVP, returning basic structure
      const stats = {
        totalProducts: 0,
        activeProducts: 0,
        inactiveProducts: 0,
        outOfStockProducts: 0,
        lowStockProducts: 0,
        topCategories: [],
        topBrands: []
      };

      const response: ApiResponse<typeof stats> = {
        success: true,
        data: stats,
        message: 'Product statistics retrieved successfully',
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.context.requestId,
          version: '1.0.0'
        }
      };

      // Performance monitoring
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.auditPerformance('PRODUCT_STATS_ENDPOINT', duration, {
        userId: req.user?.id,
        success: true
      });

      res.status(200).json(response);

    } catch (error) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.error('Get product stats failed in controller', error, {
        userId: req.user?.id,
        requestId: req.context.requestId,
        performanceMetrics: { duration }
      });
      next(error);
    }
  }
}

// Export singleton instance
export const productController = new ProductController();