/**
 * RABHAN Marketplace Service - Product Service Layer
 * SAMA Compliant | Zero-Trust Security | Sub-2ms Performance | MVP Scope
 */

import { db } from '@/config/database.config';
import { logger, SAMALogCategory } from '@/utils/logger';
import {
  Product,
  ProductCreate,
  ProductUpdate,
  ProductFilters,
  PaginationParams,
  PaginationResult,
  NotFoundError,
  ConflictError,
  ValidationError
} from '@/types/marketplace.types';

export class ProductService {
  
  /**
   * Create a new product (Contractors only)
   * Performance target: <2ms
   */
  async createProduct(productData: ProductCreate, userId: string): Promise<Product> {
    const startTime = process.hrtime.bigint();
    
    try {
      // Validate contractor owns the product
      if (productData.contractorId !== userId) {
        throw new ValidationError('Cannot create product for different contractor');
      }

      // Check if slug already exists (unique constraint)
      const slugExists = await this.checkSlugExists(productData.slug);
      if (slugExists) {
        throw new ConflictError(`Product with slug '${productData.slug}' already exists`);
      }

      // Check if SKU already exists (if provided)
      if (productData.sku) {
        const skuExists = await this.checkSkuExists(productData.sku);
        if (skuExists) {
          throw new ConflictError(`Product with SKU '${productData.sku}' already exists`);
        }
      }

      // Validate category exists
      await this.validateCategoryExists(productData.categoryId);

      // Auto-generate stock status based on quantity
      const stockStatus = this.calculateStockStatus(productData.stockQuantity);

      // Insert product
      const query = `
        INSERT INTO products (
          contractor_id, category_id, name, name_ar, description, description_ar,
          slug, brand, model, sku, specifications, price, currency, vat_included,
          stock_quantity, stock_status, status, created_by, updated_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $18
        )
        RETURNING id, created_at, updated_at
      `;

      const params = [
        productData.contractorId,
        productData.categoryId,
        productData.name,
        productData.nameAr || null,
        productData.description || null,
        productData.descriptionAr || null,
        productData.slug,
        productData.brand,
        productData.model || null,
        productData.sku || null,
        JSON.stringify(productData.specifications),
        productData.price,
        productData.currency,
        productData.vatIncluded,
        productData.stockQuantity,
        stockStatus,
        productData.status,
        userId
      ];

      const result = await db.query(query, params);
      
      if (result.rowCount === 0) {
        throw new Error('Failed to create product');
      }

      const createdProduct: Product = {
        id: result.rows[0]?.id,
        contractorId: productData.contractorId,
        categoryId: productData.categoryId,
        productCategory: productData.productCategory,
        name: productData.name,
        nameAr: productData.nameAr,
        description: productData.description,
        descriptionAr: productData.descriptionAr,
        slug: productData.slug,
        brand: productData.brand,
        model: productData.model,
        sku: productData.sku,
        specifications: productData.specifications,
        price: productData.price,
        currency: productData.currency,
        vatIncluded: productData.vatIncluded,
        stockQuantity: productData.stockQuantity,
        stockStatus,
        status: productData.status,
        approvalStatus: 'PENDING',
        createdAt: result.rows[0]?.created_at,
        updatedAt: result.rows[0]?.updated_at,
        createdBy: userId,
        updatedBy: userId
      };

      // Performance monitoring
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.auditPerformance('CREATE_PRODUCT', duration, {
        productId: createdProduct.id,
        contractorId: productData.contractorId
      });

      // SAMA Audit: Data access logging
      logger.auditDataAccess(
        userId,
        'products',
        createdProduct.id,
        'CREATE',
        {
          productName: productData.name,
          price: productData.price,
          categoryId: productData.categoryId
        }
      );

      return createdProduct;

    } catch (error) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.error('Failed to create product', error, {
        contractorId: productData.contractorId,
        productName: productData.name,
        performanceMetrics: { duration }
      });
      throw error;
    }
  }

  /**
   * Get product by ID with optimized query
   * Performance target: <1ms
   */
  async getProductById(productId: string, userId?: string): Promise<Product | null> {
    const startTime = process.hrtime.bigint();
    
    try {
      const query = `
        SELECT 
          p.*,
          c.name as category_name,
          c.name_ar as category_name_ar
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.id = $1 AND p.status = 'ACTIVE'
      `;

      const result = await db.query(query, [productId]);
      
      if (result.rowCount === 0) {
        return null;
      }

      const product = this.mapRowToProduct(result.rows[0]);

      // Performance monitoring
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.auditPerformance('GET_PRODUCT_BY_ID', duration, {
        productId,
        userId
      });

      return product;

    } catch (error) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.error('Failed to get product by ID', error, {
        productId,
        performanceMetrics: { duration }
      });
      throw error;
    }
  }

  /**
   * Search products with advanced filtering and pagination
   * Performance target: <2ms with indexes
   */
  async searchProducts(
    filters: ProductFilters,
    pagination: PaginationParams
  ): Promise<PaginationResult<Product>> {
    const startTime = process.hrtime.bigint();
    
    try {
      const whereConditions: string[] = ["p.status = 'ACTIVE'"];
      const params: any[] = [];
      let paramIndex = 1;

      // Build dynamic WHERE conditions
      if (filters.categoryId) {
        whereConditions.push(`p.category_id = $${paramIndex}`);
        params.push(filters.categoryId);
        paramIndex++;
      }

      if (filters.contractorId) {
        whereConditions.push(`p.contractor_id = $${paramIndex}`);
        params.push(filters.contractorId);
        paramIndex++;
      }

      if (filters.brand) {
        whereConditions.push(`p.brand ILIKE $${paramIndex}`);
        params.push(`%${filters.brand}%`);
        paramIndex++;
      }

      if (filters.minPrice !== undefined) {
        whereConditions.push(`p.price >= $${paramIndex}`);
        params.push(filters.minPrice);
        paramIndex++;
      }

      if (filters.maxPrice !== undefined) {
        whereConditions.push(`p.price <= $${paramIndex}`);
        params.push(filters.maxPrice);
        paramIndex++;
      }

      if (filters.inStockOnly) {
        whereConditions.push(`p.stock_status IN ('IN_STOCK', 'LOW_STOCK')`);
      }

      // Full-text search (optimized with GIN indexes)
      if (filters.search) {
        whereConditions.push(`(
          to_tsvector('english', p.name || ' ' || COALESCE(p.description, '') || ' ' || p.brand) @@ plainto_tsquery('english', $${paramIndex})
          OR
          to_tsvector('arabic', COALESCE(p.name_ar, '') || ' ' || COALESCE(p.description_ar, '')) @@ plainto_tsquery('arabic', $${paramIndex})
        )`);
        params.push(filters.search);
        paramIndex++;
      }

      const whereClause = whereConditions.join(' AND ');

      // Count total results (for pagination)
      const countQuery = `
        SELECT COUNT(*) as total
        FROM products p
        WHERE ${whereClause}
      `;
      
      const countResult = await db.query(countQuery, params);
      const total = parseInt(countResult.rows[0]?.total || '0', 10);

      // Calculate pagination
      const offset = (pagination.page - 1) * pagination.limit;
      const totalPages = Math.ceil(total / pagination.limit);

      // Build ORDER BY clause
      const sortBy = pagination.sortBy || 'created_at';
      const sortOrder = pagination.sortOrder || 'DESC';
      const validSortColumns = ['name', 'price', 'created_at', 'stock_quantity'];
      const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'created_at';

      // Main query with pagination
      const dataQuery = `
        SELECT 
          p.*,
          c.name as category_name,
          c.name_ar as category_name_ar
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE ${whereClause}
        ORDER BY p.${safeSortBy} ${sortOrder}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      params.push(pagination.limit, offset);

      const result = await db.query(dataQuery, params);
      const products = result.rows.map(row => this.mapRowToProduct(row));

      const paginationResult: PaginationResult<Product> = {
        data: products,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages,
          hasNext: pagination.page < totalPages,
          hasPrev: pagination.page > 1
        }
      };

      // Performance monitoring
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.auditPerformance('SEARCH_PRODUCTS', duration, {
        filters,
        resultCount: products.length,
        totalResults: total
      });

      return paginationResult;

    } catch (error) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.error('Failed to search products', error, {
        filters,
        pagination,
        performanceMetrics: { duration }
      });
      throw error;
    }
  }

  /**
   * Update product (Contractor can only update their own products)
   */
  async updateProduct(
    productId: string, 
    updateData: ProductUpdate, 
    userId: string,
    userContractorId?: string
  ): Promise<Product> {
    const startTime = process.hrtime.bigint();
    
    try {
      // First verify product exists and user can modify it
      const existingProduct = await this.getProductById(productId);
      if (!existingProduct) {
        throw new NotFoundError('Product not found');
      }

      // Check contractor authorization
      if (userContractorId && existingProduct.contractorId !== userContractorId) {
        throw new ValidationError('Cannot update product belonging to different contractor');
      }

      // Check slug uniqueness if being updated
      if (updateData.slug && updateData.slug !== existingProduct.slug) {
        const slugExists = await this.checkSlugExists(updateData.slug, productId);
        if (slugExists) {
          throw new ConflictError(`Product with slug '${updateData.slug}' already exists`);
        }
      }

      // Check SKU uniqueness if being updated
      if (updateData.sku && updateData.sku !== existingProduct.sku) {
        const skuExists = await this.checkSkuExists(updateData.sku, productId);
        if (skuExists) {
          throw new ConflictError(`Product with SKU '${updateData.sku}' already exists`);
        }
      }

      // Validate category if being updated
      if (updateData.categoryId) {
        await this.validateCategoryExists(updateData.categoryId);
      }

      // Build dynamic UPDATE query
      const updateFields: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      const fieldsToUpdate = [
        'categoryId', 'name', 'nameAr', 'description', 'descriptionAr',
        'slug', 'brand', 'model', 'sku', 'specifications', 'price',
        'currency', 'vatIncluded', 'stockQuantity', 'status'
      ];

      fieldsToUpdate.forEach(field => {
        const dbField = this.camelToSnakeCase(field);
        if (updateData[field as keyof ProductUpdate] !== undefined) {
          updateFields.push(`${dbField} = $${paramIndex}`);
          
          if (field === 'specifications') {
            params.push(JSON.stringify(updateData[field as keyof ProductUpdate]));
          } else {
            params.push(updateData[field as keyof ProductUpdate]);
          }
          paramIndex++;
        }
      });

      // Always update stock_status based on stock_quantity
      if (updateData.stockQuantity !== undefined) {
        const stockStatus = this.calculateStockStatus(updateData.stockQuantity);
        updateFields.push(`stock_status = $${paramIndex}`);
        params.push(stockStatus);
        paramIndex++;
      }

      // Add updated_by and updated_at
      updateFields.push(`updated_by = $${paramIndex}`, `updated_at = CURRENT_TIMESTAMP`);
      params.push(userId);
      paramIndex++;

      // Add WHERE clause
      params.push(productId);

      const updateQuery = `
        UPDATE products 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await db.query(updateQuery, params);
      
      if (result.rowCount === 0) {
        throw new NotFoundError('Product not found or not updated');
      }

      const updatedProduct = this.mapRowToProduct(result.rows[0]);

      // Performance monitoring
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.auditPerformance('UPDATE_PRODUCT', duration, {
        productId,
        userId
      });

      // SAMA Audit: Data access logging
      logger.auditDataAccess(
        userId,
        'products',
        productId,
        'UPDATE',
        {
          updatedFields: Object.keys(updateData),
          productName: updatedProduct.name
        }
      );

      return updatedProduct;

    } catch (error) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.error('Failed to update product', error, {
        productId,
        userId,
        performanceMetrics: { duration }
      });
      throw error;
    }
  }

  /**
   * Delete product (Soft delete - set status to INACTIVE)
   */
  async deleteProduct(productId: string, userId: string, userContractorId?: string): Promise<void> {
    const startTime = process.hrtime.bigint();
    
    try {
      // Verify product exists and user can delete it
      const existingProduct = await this.getProductById(productId);
      if (!existingProduct) {
        throw new NotFoundError('Product not found');
      }

      // Check contractor authorization
      if (userContractorId && existingProduct.contractorId !== userContractorId) {
        throw new ValidationError('Cannot delete product belonging to different contractor');
      }

      // Soft delete (set status to INACTIVE)
      const query = `
        UPDATE products 
        SET status = 'INACTIVE', updated_by = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `;

      const result = await db.query(query, [userId, productId]);
      
      if (result.rowCount === 0) {
        throw new NotFoundError('Product not found or already deleted');
      }

      // Performance monitoring
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.auditPerformance('DELETE_PRODUCT', duration, {
        productId,
        userId
      });

      // SAMA Audit: Data access logging
      logger.auditDataAccess(
        userId,
        'products',
        productId,
        'DELETE',
        {
          productName: existingProduct.name,
          softDelete: true
        }
      );

    } catch (error) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.error('Failed to delete product', error, {
        productId,
        userId,
        performanceMetrics: { duration }
      });
      throw error;
    }
  }

  /**
   * Get products by contractor ID (for contractor dashboard)
   */
  async getProductsByContractor(
    contractorId: string,
    pagination: PaginationParams
  ): Promise<PaginationResult<Product>> {
    return this.searchProducts(
      { contractorId, status: 'ACTIVE' },
      pagination
    );
  }

  // =====================================================
  // PRIVATE HELPER METHODS
  // =====================================================

  private async checkSlugExists(slug: string, excludeId?: string): Promise<boolean> {
    const query = excludeId
      ? 'SELECT 1 FROM products WHERE slug = $1 AND id != $2 LIMIT 1'
      : 'SELECT 1 FROM products WHERE slug = $1 LIMIT 1';
    
    const params = excludeId ? [slug, excludeId] : [slug];
    const result = await db.query(query, params);
    
    return result.rowCount > 0;
  }

  private async checkSkuExists(sku: string, excludeId?: string): Promise<boolean> {
    const query = excludeId
      ? 'SELECT 1 FROM products WHERE sku = $1 AND id != $2 LIMIT 1'
      : 'SELECT 1 FROM products WHERE sku = $1 LIMIT 1';
    
    const params = excludeId ? [sku, excludeId] : [sku];
    const result = await db.query(query, params);
    
    return result.rowCount > 0;
  }

  private async validateCategoryExists(categoryId: string): Promise<void> {
    const query = 'SELECT 1 FROM categories WHERE id = $1 AND is_active = true LIMIT 1';
    const result = await db.query(query, [categoryId]);
    
    if (result.rowCount === 0) {
      throw new ValidationError(`Category with ID '${categoryId}' not found or inactive`);
    }
  }

  private calculateStockStatus(stockQuantity: number): 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' {
    if (stockQuantity === 0) return 'OUT_OF_STOCK';
    if (stockQuantity <= 10) return 'LOW_STOCK'; // Configurable threshold
    return 'IN_STOCK';
  }

  private mapRowToProduct(row: any): Product {
    return {
      id: row.id,
      contractorId: row.contractor_id,
      categoryId: row.category_id,
      productCategory: row.product_category || 'FULL_SYSTEM',
      name: row.name,
      nameAr: row.name_ar,
      description: row.description,
      descriptionAr: row.description_ar,
      slug: row.slug,
      brand: row.brand,
      model: row.model,
      sku: row.sku,
      specifications: row.specifications || {},
      price: parseFloat(row.price),
      currency: row.currency,
      vatIncluded: row.vat_included,
      stockQuantity: row.stock_quantity,
      stockStatus: row.stock_status,
      status: row.status,
      approvalStatus: row.approval_status || 'PENDING',
      approvedBy: row.approved_by,
      approvedAt: row.approved_at,
      rejectionReason: row.rejection_reason,
      adminNotes: row.admin_notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      // Include category information if available
      category: row.category_name ? {
        id: row.category_id,
        name: row.category_name,
        nameAr: row.category_name_ar
      } as any : undefined
    };
  }

  private camelToSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}

// Export singleton instance
export const productService = new ProductService();