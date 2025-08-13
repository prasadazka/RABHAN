/**
 * RABHAN Marketplace Service - Category Service Layer
 * SAMA Compliant | Zero-Trust Security | Sub-2ms Performance | MVP Scope
 */

import { db } from '@/config/database.config';
import { logger, SAMALogCategory } from '@/utils/logger';
import {
  Category,
  CategoryCreate,
  CategoryUpdate,
  PaginationParams,
  PaginationResult,
  NotFoundError,
  ConflictError,
  ValidationError
} from '@/types/marketplace.types';

export class CategoryService {
  
  /**
   * Get all active categories with product counts
   * Performance target: <1ms (cached result preferred)
   */
  async getAllCategories(includeInactive = false): Promise<Category[]> {
    const startTime = process.hrtime.bigint();
    
    try {
      const whereCondition = includeInactive ? '' : 'WHERE c.is_active = true';
      
      const query = `
        SELECT 
          c.*,
          COALESCE(COUNT(p.id), 0) as products_count
        FROM categories c
        LEFT JOIN products p ON c.id = p.category_id AND p.status = 'ACTIVE'
        ${whereCondition}
        GROUP BY c.id
        ORDER BY c.sort_order ASC, c.name ASC
      `;

      const result = await db.query(query);
      const categories = result.rows.map(row => this.mapRowToCategory(row));

      // Performance monitoring
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.auditPerformance('GET_ALL_CATEGORIES', duration, {
        categoryCount: categories.length,
        includeInactive
      });

      return categories;

    } catch (error) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.error('Failed to get all categories', error, {
        includeInactive,
        performanceMetrics: { duration }
      });
      throw error;
    }
  }

  /**
   * Get category by ID
   * Performance target: <1ms
   */
  async getCategoryById(categoryId: string, includeInactive = false): Promise<Category | null> {
    const startTime = process.hrtime.bigint();
    
    try {
      const activeCondition = includeInactive ? '' : 'AND c.is_active = true';
      
      const query = `
        SELECT 
          c.*,
          COALESCE(COUNT(p.id), 0) as products_count
        FROM categories c
        LEFT JOIN products p ON c.id = p.category_id AND p.status = 'ACTIVE'
        WHERE c.id = $1 ${activeCondition}
        GROUP BY c.id
      `;

      const result = await db.query(query, [categoryId]);
      
      if (result.rowCount === 0) {
        return null;
      }

      const category = this.mapRowToCategory(result.rows[0]);

      // Performance monitoring
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.auditPerformance('GET_CATEGORY_BY_ID', duration, {
        categoryId
      });

      return category;

    } catch (error) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.error('Failed to get category by ID', error, {
        categoryId,
        performanceMetrics: { duration }
      });
      throw error;
    }
  }

  /**
   * Get category by slug
   * Performance target: <1ms
   */
  async getCategoryBySlug(slug: string, includeInactive = false): Promise<Category | null> {
    const startTime = process.hrtime.bigint();
    
    try {
      const activeCondition = includeInactive ? '' : 'AND c.is_active = true';
      
      const query = `
        SELECT 
          c.*,
          COALESCE(COUNT(p.id), 0) as products_count
        FROM categories c
        LEFT JOIN products p ON c.id = p.category_id AND p.status = 'ACTIVE'
        WHERE c.slug = $1 ${activeCondition}
        GROUP BY c.id
      `;

      const result = await db.query(query, [slug]);
      
      if (result.rowCount === 0) {
        return null;
      }

      const category = this.mapRowToCategory(result.rows[0]);

      // Performance monitoring
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.auditPerformance('GET_CATEGORY_BY_SLUG', duration, {
        slug
      });

      return category;

    } catch (error) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.error('Failed to get category by slug', error, {
        slug,
        performanceMetrics: { duration }
      });
      throw error;
    }
  }

  /**
   * Create new category (Admin only)
   * Performance target: <2ms
   */
  async createCategory(categoryData: CategoryCreate, userId: string): Promise<Category> {
    const startTime = process.hrtime.bigint();
    
    try {
      // Check if slug already exists
      const slugExists = await this.checkSlugExists(categoryData.slug);
      if (slugExists) {
        throw new ConflictError(`Category with slug '${categoryData.slug}' already exists`);
      }

      // Auto-generate sort order if not provided
      const sortOrder = categoryData.sortOrder ?? await this.getNextSortOrder();

      const query = `
        INSERT INTO categories (
          name, name_ar, slug, description, description_ar,
          icon, image_url, sort_order, is_active, created_by, updated_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10
        )
        RETURNING id, created_at, updated_at
      `;

      const params = [
        categoryData.name,
        categoryData.nameAr || null,
        categoryData.slug,
        categoryData.description || null,
        categoryData.descriptionAr || null,
        categoryData.icon || null,
        categoryData.imageUrl || null,
        sortOrder,
        categoryData.isActive ?? true,
        userId
      ];

      const result = await db.query(query, params);
      
      if (result.rowCount === 0) {
        throw new Error('Failed to create category');
      }

      const createdCategory: Category = {
        id: result.rows[0]?.id,
        name: categoryData.name,
        nameAr: categoryData.nameAr,
        slug: categoryData.slug,
        description: categoryData.description,
        descriptionAr: categoryData.descriptionAr,
        icon: categoryData.icon,
        imageUrl: categoryData.imageUrl,
        sortOrder,
        isActive: categoryData.isActive ?? true,
        productsCount: 0,
        createdAt: result.rows[0]?.created_at,
        updatedAt: result.rows[0]?.updated_at,
        createdBy: userId,
        updatedBy: userId
      };

      // Performance monitoring
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.auditPerformance('CREATE_CATEGORY', duration, {
        categoryId: createdCategory.id,
        categoryName: categoryData.name
      });

      // SAMA Audit: Data access logging
      logger.auditDataAccess(
        userId,
        'categories',
        createdCategory.id,
        'CREATE',
        {
          categoryName: categoryData.name,
          slug: categoryData.slug,
          isActive: categoryData.isActive
        }
      );

      return createdCategory;

    } catch (error) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.error('Failed to create category', error, {
        categoryName: categoryData.name,
        performanceMetrics: { duration }
      });
      throw error;
    }
  }

  /**
   * Update category (Admin only)
   * Performance target: <2ms
   */
  async updateCategory(
    categoryId: string, 
    updateData: CategoryUpdate, 
    userId: string
  ): Promise<Category> {
    const startTime = process.hrtime.bigint();
    
    try {
      // Verify category exists
      const existingCategory = await this.getCategoryById(categoryId, true);
      if (!existingCategory) {
        throw new NotFoundError('Category not found');
      }

      // Check slug uniqueness if being updated
      if (updateData.slug && updateData.slug !== existingCategory.slug) {
        const slugExists = await this.checkSlugExists(updateData.slug, categoryId);
        if (slugExists) {
          throw new ConflictError(`Category with slug '${updateData.slug}' already exists`);
        }
      }

      // Build dynamic UPDATE query
      const updateFields: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      const fieldsToUpdate = [
        'name', 'nameAr', 'slug', 'description', 'descriptionAr',
        'icon', 'imageUrl', 'sortOrder', 'isActive'
      ];

      fieldsToUpdate.forEach(field => {
        const dbField = this.camelToSnakeCase(field);
        if (updateData[field as keyof CategoryUpdate] !== undefined) {
          updateFields.push(`${dbField} = $${paramIndex}`);
          params.push(updateData[field as keyof CategoryUpdate]);
          paramIndex++;
        }
      });

      if (updateFields.length === 0) {
        throw new ValidationError('No fields to update');
      }

      // Add updated_by and updated_at
      updateFields.push(`updated_by = $${paramIndex}`, `updated_at = CURRENT_TIMESTAMP`);
      params.push(userId);
      paramIndex++;

      // Add WHERE clause
      params.push(categoryId);

      const updateQuery = `
        UPDATE categories 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await db.query(updateQuery, params);
      
      if (result.rowCount === 0) {
        throw new NotFoundError('Category not found or not updated');
      }

      // Get updated category with product count
      const updatedCategory = await this.getCategoryById(categoryId, true);
      if (!updatedCategory) {
        throw new NotFoundError('Failed to retrieve updated category');
      }

      // Performance monitoring
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.auditPerformance('UPDATE_CATEGORY', duration, {
        categoryId,
        userId
      });

      // SAMA Audit: Data access logging
      logger.auditDataAccess(
        userId,
        'categories',
        categoryId,
        'UPDATE',
        {
          updatedFields: Object.keys(updateData),
          categoryName: updatedCategory.name
        }
      );

      return updatedCategory;

    } catch (error) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.error('Failed to update category', error, {
        categoryId,
        userId,
        performanceMetrics: { duration }
      });
      throw error;
    }
  }

  /**
   * Delete category (Admin only - soft delete by setting is_active = false)
   */
  async deleteCategory(categoryId: string, userId: string): Promise<void> {
    const startTime = process.hrtime.bigint();
    
    try {
      // Verify category exists
      const existingCategory = await this.getCategoryById(categoryId, true);
      if (!existingCategory) {
        throw new NotFoundError('Category not found');
      }

      // Check if category has active products
      const productCount = await this.getCategoryProductCount(categoryId);
      if (productCount > 0) {
        throw new ValidationError(
          `Cannot delete category with ${productCount} active products. Please move products to other categories first.`
        );
      }

      // Soft delete (set is_active to false)
      const query = `
        UPDATE categories 
        SET is_active = false, updated_by = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `;

      const result = await db.query(query, [userId, categoryId]);
      
      if (result.rowCount === 0) {
        throw new NotFoundError('Category not found or already deleted');
      }

      // Performance monitoring
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.auditPerformance('DELETE_CATEGORY', duration, {
        categoryId,
        userId
      });

      // SAMA Audit: Data access logging
      logger.auditDataAccess(
        userId,
        'categories',
        categoryId,
        'DELETE',
        {
          categoryName: existingCategory.name,
          softDelete: true
        }
      );

    } catch (error) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.error('Failed to delete category', error, {
        categoryId,
        userId,
        performanceMetrics: { duration }
      });
      throw error;
    }
  }

  /**
   * Get categories with pagination (Admin view)
   */
  async getCategoriesWithPagination(
    pagination: PaginationParams,
    includeInactive = false
  ): Promise<PaginationResult<Category>> {
    const startTime = process.hrtime.bigint();
    
    try {
      const whereCondition = includeInactive ? '' : 'WHERE c.is_active = true';
      
      // Count total results
      const countQuery = `
        SELECT COUNT(*) as total
        FROM categories c
        ${whereCondition}
      `;
      
      const countResult = await db.query(countQuery);
      const total = parseInt(countResult.rows[0]?.total || '0', 10);

      // Calculate pagination
      const offset = (pagination.page - 1) * pagination.limit;
      const totalPages = Math.ceil(total / pagination.limit);

      // Build ORDER BY clause
      const sortBy = pagination.sortBy || 'sort_order';
      const sortOrder = pagination.sortOrder || 'ASC';
      const validSortColumns = ['name', 'sort_order', 'created_at', 'is_active'];
      const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'sort_order';

      // Main query with pagination
      const dataQuery = `
        SELECT 
          c.*,
          COALESCE(COUNT(p.id), 0) as products_count
        FROM categories c
        LEFT JOIN products p ON c.id = p.category_id AND p.status = 'ACTIVE'
        ${whereCondition}
        GROUP BY c.id
        ORDER BY c.${safeSortBy} ${sortOrder}
        LIMIT $1 OFFSET $2
      `;

      const result = await db.query(dataQuery, [pagination.limit, offset]);
      const categories = result.rows.map(row => this.mapRowToCategory(row));

      const paginationResult: PaginationResult<Category> = {
        data: categories,
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
      logger.auditPerformance('GET_CATEGORIES_PAGINATED', duration, {
        resultCount: categories.length,
        totalResults: total,
        includeInactive
      });

      return paginationResult;

    } catch (error) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.error('Failed to get categories with pagination', error, {
        pagination,
        includeInactive,
        performanceMetrics: { duration }
      });
      throw error;
    }
  }

  // =====================================================
  // PRIVATE HELPER METHODS
  // =====================================================

  private async checkSlugExists(slug: string, excludeId?: string): Promise<boolean> {
    const query = excludeId
      ? 'SELECT 1 FROM categories WHERE slug = $1 AND id != $2 LIMIT 1'
      : 'SELECT 1 FROM categories WHERE slug = $1 LIMIT 1';
    
    const params = excludeId ? [slug, excludeId] : [slug];
    const result = await db.query(query, params);
    
    return result.rowCount > 0;
  }

  private async getNextSortOrder(): Promise<number> {
    const query = 'SELECT COALESCE(MAX(sort_order), 0) + 10 as next_order FROM categories';
    const result = await db.query(query);
    return result.rows[0]?.next_order || 10;
  }

  private async getCategoryProductCount(categoryId: string): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM products WHERE category_id = $1 AND status = $2';
    const result = await db.query(query, [categoryId, 'ACTIVE']);
    return parseInt(result.rows[0]?.count || '0', 10);
  }

  private mapRowToCategory(row: any): Category {
    return {
      id: row.id,
      name: row.name,
      nameAr: row.name_ar,
      slug: row.slug,
      description: row.description,
      descriptionAr: row.description_ar,
      icon: row.icon,
      imageUrl: row.image_url,
      sortOrder: row.sort_order,
      isActive: row.is_active,
      productsCount: parseInt(row.products_count || '0', 10),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by
    };
  }

  private camelToSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}

// Export singleton instance
export const categoryService = new CategoryService();