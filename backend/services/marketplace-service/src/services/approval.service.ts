/**
 * RABHAN Marketplace Service - Product Approval Service
 * SAMA Compliant | Zero-Trust Security | Admin Workflow Management
 */

import { db } from '@/config/database.config';
import { logger, SAMALogCategory } from '@/utils/logger';
import {
  Product,
  ProductApproval,
  ProductApprovalHistory,
  ApprovalStatus,
  ProductStatus,
  PaginationParams,
  PaginationResult,
  NotFoundError,
  ValidationError,
  ForbiddenError
} from '@/types/marketplace.types';

export class ApprovalService {
  
  /**
   * Get products pending approval
   * Performance target: <2ms
   */
  async getPendingApprovals(
    pagination: PaginationParams,
    adminId?: string
  ): Promise<PaginationResult<Product>> {
    const startTime = process.hrtime.bigint();
    
    try {
      const whereClause = `
        p.status = 'PENDING_APPROVAL' AND p.approval_status = 'PENDING'
      `;

      // Count total results
      const countQuery = `
        SELECT COUNT(*) as total
        FROM products p
        WHERE ${whereClause}
      `;
      
      const countResult = await db.query(countQuery);
      const total = parseInt(countResult.rows[0]?.total || '0', 10);

      // Calculate pagination
      const offset = (pagination.page - 1) * pagination.limit;
      const totalPages = Math.ceil(total / pagination.limit);

      // Main query with category info
      const dataQuery = `
        SELECT 
          p.*,
          c.name as category_name,
          c.name_ar as category_name_ar
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE ${whereClause}
        ORDER BY p.created_at ASC
        LIMIT $1 OFFSET $2
      `;

      const result = await db.query(dataQuery, [pagination.limit, offset]);
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
      logger.auditPerformance('GET_PENDING_APPROVALS', duration, {
        adminId,
        resultCount: products.length,
        totalResults: total
      });

      return paginationResult;

    } catch (error) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.error('Failed to get pending approvals', error, {
        adminId,
        pagination,
        performanceMetrics: { duration }
      });
      throw error;
    }
  }

  /**
   * Approve a product
   * Performance target: <3ms
   */
  async approveProduct(
    productId: string,
    adminId: string,
    adminNotes?: string
  ): Promise<Product> {
    const startTime = process.hrtime.bigint();
    
    try {
      const client = await db.getPool().connect();
      
      try {
        await client.query('BEGIN');

        // Get current product
        const currentProduct = await this.getProductForApproval(productId, client);
        if (!currentProduct) {
          throw new NotFoundError('Product not found');
        }

        if (currentProduct.approvalStatus !== 'PENDING') {
          throw new ValidationError(`Product is already ${currentProduct.approvalStatus.toLowerCase()}`);
        }

        // Update product to approved status
        const updateQuery = `
          UPDATE products 
          SET 
            approval_status = 'APPROVED',
            status = 'ACTIVE',
            approved_by = $1,
            approved_at = CURRENT_TIMESTAMP,
            admin_notes = $2,
            updated_by = $1,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $3
          RETURNING *
        `;

        const updateResult = await client.query(updateQuery, [adminId, adminNotes, productId]);
        
        // Create approval history
        await this.createApprovalHistory(
          productId,
          currentProduct.approvalStatus,
          'APPROVED',
          'APPROVE',
          adminId,
          adminNotes || null,
          null,
          null,
          client
        );

        await client.query('COMMIT');

        const approvedProduct = this.mapRowToProduct(updateResult.rows[0]);

        // Performance monitoring
        const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
        logger.auditPerformance('APPROVE_PRODUCT', duration, {
          productId,
          adminId,
          productName: approvedProduct.name
        });

        // SAMA Audit: Critical business decision
        logger.auditDataAccess(
          adminId,
          'products',
          productId,
          'UPDATE',
          {
            action: 'APPROVE',
            productName: approvedProduct.name,
            contractorId: approvedProduct.contractorId,
            price: approvedProduct.price,
            adminNotes
          }
        );

        logger.auditSecurity(
          'PRODUCT_APPROVAL',
          'SUCCESS',
          {
            adminId,
            productId,
            productName: approvedProduct.name,
            contractorId: approvedProduct.contractorId,
            riskLevel: 'MEDIUM'
          }
        );

        return approvedProduct;

      } finally {
        client.release();
      }

    } catch (error) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.error('Failed to approve product', error, {
        productId,
        adminId,
        performanceMetrics: { duration }
      });
      throw error;
    }
  }

  /**
   * Reject a product
   * Performance target: <3ms
   */
  async rejectProduct(
    productId: string,
    adminId: string,
    rejectionReason: string,
    adminNotes?: string
  ): Promise<Product> {
    const startTime = process.hrtime.bigint();
    
    try {
      const client = await db.getPool().connect();
      
      try {
        await client.query('BEGIN');

        // Get current product
        const currentProduct = await this.getProductForApproval(productId, client);
        if (!currentProduct) {
          throw new NotFoundError('Product not found');
        }

        if (currentProduct.approvalStatus !== 'PENDING') {
          throw new ValidationError(`Product is already ${currentProduct.approvalStatus.toLowerCase()}`);
        }

        // Update product to rejected status
        const updateQuery = `
          UPDATE products 
          SET 
            approval_status = 'REJECTED',
            status = 'INACTIVE',
            approved_by = $1,
            approved_at = CURRENT_TIMESTAMP,
            rejection_reason = $2,
            admin_notes = $3,
            updated_by = $1,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $4
          RETURNING *
        `;

        const updateResult = await client.query(updateQuery, [adminId, rejectionReason, adminNotes, productId]);
        
        // Create approval history
        await this.createApprovalHistory(
          productId,
          currentProduct.approvalStatus,
          'REJECTED',
          'REJECT',
          adminId,
          adminNotes || null,
          rejectionReason,
          null,
          client
        );

        await client.query('COMMIT');

        const rejectedProduct = this.mapRowToProduct(updateResult.rows[0]);

        // Performance monitoring
        const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
        logger.auditPerformance('REJECT_PRODUCT', duration, {
          productId,
          adminId,
          productName: rejectedProduct.name
        });

        // SAMA Audit: Critical business decision
        logger.auditDataAccess(
          adminId,
          'products',
          productId,
          'UPDATE',
          {
            action: 'REJECT',
            productName: rejectedProduct.name,
            contractorId: rejectedProduct.contractorId,
            rejectionReason,
            adminNotes
          }
        );

        logger.auditSecurity(
          'PRODUCT_REJECTION',
          'SUCCESS',
          {
            adminId,
            productId,
            productName: rejectedProduct.name,
            contractorId: rejectedProduct.contractorId,
            rejectionReason,
            riskLevel: 'MEDIUM'
          }
        );

        return rejectedProduct;

      } finally {
        client.release();
      }

    } catch (error) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.error('Failed to reject product', error, {
        productId,
        adminId,
        rejectionReason,
        performanceMetrics: { duration }
      });
      throw error;
    }
  }

  /**
   * Request changes for a product
   * Performance target: <3ms
   */
  async requestChanges(
    productId: string,
    adminId: string,
    changesRequired: string,
    adminNotes?: string
  ): Promise<Product> {
    const startTime = process.hrtime.bigint();
    
    try {
      const client = await db.getPool().connect();
      
      try {
        await client.query('BEGIN');

        // Get current product
        const currentProduct = await this.getProductForApproval(productId, client);
        if (!currentProduct) {
          throw new NotFoundError('Product not found');
        }

        if (currentProduct.approvalStatus !== 'PENDING') {
          throw new ValidationError(`Product is already ${currentProduct.approvalStatus.toLowerCase()}`);
        }

        // Update product to changes required status
        const updateQuery = `
          UPDATE products 
          SET 
            approval_status = 'CHANGES_REQUIRED',
            status = 'DRAFT',
            approved_by = $1,
            approved_at = CURRENT_TIMESTAMP,
            admin_notes = $2,
            updated_by = $1,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $3
          RETURNING *
        `;

        const updateResult = await client.query(updateQuery, [adminId, adminNotes, productId]);
        
        // Create approval history
        await this.createApprovalHistory(
          productId,
          currentProduct.approvalStatus,
          'CHANGES_REQUIRED',
          'REQUEST_CHANGES',
          adminId,
          adminNotes || null,
          null,
          changesRequired,
          client
        );

        await client.query('COMMIT');

        const product = this.mapRowToProduct(updateResult.rows[0]);

        // Performance monitoring
        const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
        logger.auditPerformance('REQUEST_CHANGES', duration, {
          productId,
          adminId,
          productName: product.name
        });

        // SAMA Audit
        logger.auditDataAccess(
          adminId,
          'products',
          productId,
          'UPDATE',
          {
            action: 'REQUEST_CHANGES',
            productName: product.name,
            contractorId: product.contractorId,
            changesRequired,
            adminNotes
          }
        );

        return product;

      } finally {
        client.release();
      }

    } catch (error) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.error('Failed to request changes', error, {
        productId,
        adminId,
        changesRequired,
        performanceMetrics: { duration }
      });
      throw error;
    }
  }

  /**
   * Submit product for approval (Contractor action)
   * Performance target: <2ms
   */
  async submitForApproval(
    productId: string,
    contractorId: string
  ): Promise<Product> {
    const startTime = process.hrtime.bigint();
    
    try {
      const client = await db.getPool().connect();
      
      try {
        await client.query('BEGIN');

        // Get current product and verify ownership
        const currentProduct = await this.getProductForApproval(productId, client);
        if (!currentProduct) {
          throw new NotFoundError('Product not found');
        }

        if (currentProduct.contractorId !== contractorId) {
          throw new ForbiddenError('Cannot submit product belonging to different contractor');
        }

        if (!['DRAFT', 'CHANGES_REQUIRED'].includes(currentProduct.status)) {
          throw new ValidationError('Product must be in DRAFT or CHANGES_REQUIRED status to submit');
        }

        // Update product to pending approval
        const updateQuery = `
          UPDATE products 
          SET 
            status = 'PENDING_APPROVAL',
            approval_status = 'PENDING',
            updated_by = $1,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING *
        `;

        const updateResult = await client.query(updateQuery, [contractorId, productId]);
        
        // Create approval history
        await this.createApprovalHistory(
          productId,
          currentProduct.approvalStatus,
          'PENDING',
          'SUBMIT',
          contractorId,
          'Product submitted for approval',
          null,
          null,
          client
        );

        await client.query('COMMIT');

        const product = this.mapRowToProduct(updateResult.rows[0]);

        // Performance monitoring
        const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
        logger.auditPerformance('SUBMIT_FOR_APPROVAL', duration, {
          productId,
          contractorId,
          productName: product.name
        });

        // SAMA Audit
        logger.auditDataAccess(
          contractorId,
          'products',
          productId,
          'UPDATE',
          {
            action: 'SUBMIT_FOR_APPROVAL',
            productName: product.name,
            previousStatus: currentProduct.status
          }
        );

        return product;

      } finally {
        client.release();
      }

    } catch (error) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.error('Failed to submit for approval', error, {
        productId,
        contractorId,
        performanceMetrics: { duration }
      });
      throw error;
    }
  }

  /**
   * Get approval history for a product
   * Performance target: <2ms
   */
  async getApprovalHistory(
    productId: string,
    pagination: PaginationParams
  ): Promise<PaginationResult<ProductApprovalHistory>> {
    const startTime = process.hrtime.bigint();
    
    try {
      // Count total results
      const countQuery = `
        SELECT COUNT(*) as total
        FROM product_approval_history
        WHERE product_id = $1
      `;
      
      const countResult = await db.query(countQuery, [productId]);
      const total = parseInt(countResult.rows[0]?.total || '0', 10);

      // Calculate pagination
      const offset = (pagination.page - 1) * pagination.limit;
      const totalPages = Math.ceil(total / pagination.limit);

      // Main query
      const dataQuery = `
        SELECT *
        FROM product_approval_history
        WHERE product_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await db.query(dataQuery, [productId, pagination.limit, offset]);
      const history = result.rows.map(row => this.mapRowToApprovalHistory(row));

      const paginationResult: PaginationResult<ProductApprovalHistory> = {
        data: history,
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
      logger.auditPerformance('GET_APPROVAL_HISTORY', duration, {
        productId,
        resultCount: history.length
      });

      return paginationResult;

    } catch (error) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.error('Failed to get approval history', error, {
        productId,
        performanceMetrics: { duration }
      });
      throw error;
    }
  }

  // =====================================================
  // PRIVATE HELPER METHODS
  // =====================================================

  private async getProductForApproval(productId: string, client: any): Promise<Product | null> {
    const query = `
      SELECT * FROM products WHERE id = $1
    `;
    
    const result = await client.query(query, [productId]);
    
    if (result.rowCount === 0) {
      return null;
    }
    
    return this.mapRowToProduct(result.rows[0]);
  }

  private async createApprovalHistory(
    productId: string,
    previousStatus: string,
    newStatus: string,
    actionType: string,
    adminId: string,
    adminNotes: string | null,
    rejectionReason: string | null,
    changesRequired: string | null,
    client: any
  ): Promise<void> {
    const query = `
      INSERT INTO product_approval_history (
        product_id, previous_status, new_status, action_type, admin_id,
        admin_notes, rejection_reason, changes_required
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;
    
    await client.query(query, [
      productId, previousStatus, newStatus, actionType, adminId,
      adminNotes, rejectionReason, changesRequired
    ]);
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
      approvalStatus: row.approval_status,
      approvedBy: row.approved_by,
      approvedAt: row.approved_at,
      rejectionReason: row.rejection_reason,
      adminNotes: row.admin_notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      category: row.category_name ? {
        id: row.category_id,
        name: row.category_name,
        nameAr: row.category_name_ar
      } as any : undefined
    };
  }

  private mapRowToApprovalHistory(row: any): ProductApprovalHistory {
    return {
      id: row.id,
      productId: row.product_id,
      previousStatus: row.previous_status,
      newStatus: row.new_status,
      actionType: row.action_type,
      adminId: row.admin_id,
      adminNotes: row.admin_notes,
      rejectionReason: row.rejection_reason,
      changesRequired: row.changes_required,
      createdAt: row.created_at,
      updatedAt: row.created_at, // Same as created_at for history
      createdBy: row.admin_id,
      updatedBy: row.admin_id
    };
  }
}

// Export singleton instance
export const approvalService = new ApprovalService();