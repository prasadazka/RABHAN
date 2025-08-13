/**
 * RABHAN Marketplace Service - Admin Controller
 * SAMA Compliant | Zero-Trust Security | Admin Product Management
 */

import { Request, Response, NextFunction } from 'express';
import { db } from '@/config/database.config';
import { logger } from '@/utils/logger';
import { 
  ValidationError,
  NotFoundError,
  ApiResponse,
  Product
} from '@/types/marketplace.types';

export class AdminController {

  /**
   * Get all products for admin review
   * GET /api/v1/admin/products
   */
  async getProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = process.hrtime.bigint();
    
    try {
      console.log('📋 Admin: Fetching products for review...');

      const client = await db.getPool().connect();
      try {
        // Get all products with contractor information
        const query = `
          SELECT 
            p.*,
            pi.id as image_id,
            pi.file_url,
            pi.is_primary,
            c.first_name as contractor_first_name,
            c.last_name as contractor_last_name,
            c.company_name as contractor_company_name,
            c.email as contractor_email,
            cat.name as category_name,
            cat.name_ar as category_name_ar
          FROM products p
          LEFT JOIN product_images pi ON p.id = pi.product_id
          LEFT JOIN contractors c ON p.contractor_id = c.id
          LEFT JOIN categories cat ON p.category_id = cat.id
          WHERE p.status != 'DELETED'
          ORDER BY 
            CASE 
              WHEN p.approval_status = 'PENDING' THEN 1
              WHEN p.approval_status = 'CHANGES_REQUIRED' THEN 2
              WHEN p.approval_status = 'APPROVED' THEN 3
              WHEN p.approval_status = 'REJECTED' THEN 4
              ELSE 5
            END,
            p.created_at DESC
        `;

        const result = await client.query(query);
        
        // Group products and their images
        const productsMap = new Map();
        
        result.rows.forEach(row => {
          const productId = row.id;
          
          if (!productsMap.has(productId)) {
            productsMap.set(productId, {
              id: row.id,
              contractorId: row.contractor_id,
              categoryId: row.category_id,
              name: row.name,
              nameAr: row.name_ar,
              description: row.description,
              descriptionAr: row.description_ar,
              brand: row.brand,
              model: row.model,
              sku: row.sku,
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
              contractor: {
                companyName: row.contractor_company_name,
                firstName: row.contractor_first_name,
                lastName: row.contractor_last_name,
                email: row.contractor_email
              },
              category: {
                id: row.category_id,
                name: row.category_name,
                nameAr: row.category_name_ar
              },
              images: []
            });
          }
          
          // Add image if exists
          if (row.image_id) {
            const product = productsMap.get(productId);
            const imageUrl = row.file_url?.startsWith('http') 
              ? row.file_url 
              : `http://localhost:3007${row.file_url}`;
              
            product.images.push({
              id: row.image_id,
              fileUrl: imageUrl,
              isPrimary: row.is_primary
            });
            
            // Set primary image
            if (row.is_primary) {
              product.primaryImage = imageUrl;
            }
          }
        });
        
        const products = Array.from(productsMap.values());
        
        console.log(`📊 Admin: Retrieved ${products.length} products for review`);
        console.log(`📊 Status breakdown:`, {
          pending: products.filter(p => p.approvalStatus === 'PENDING').length,
          approved: products.filter(p => p.approvalStatus === 'APPROVED').length,
          rejected: products.filter(p => p.approvalStatus === 'REJECTED').length,
          changesRequired: products.filter(p => p.approvalStatus === 'CHANGES_REQUIRED').length
        });

        const response: ApiResponse<Product[]> = {
          success: true,
          data: products,
          message: `Retrieved ${products.length} products for admin review`,
          meta: {
            timestamp: new Date().toISOString(),
            requestId: req.context?.requestId || 'unknown',
            version: '1.0.0'
          } as any
        };

        // Performance monitoring
        const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
        logger.auditPerformance('ADMIN_GET_PRODUCTS', duration, {
          adminId: req.user?.id,
          productCount: products.length,
          success: true
        });

        res.status(200).json(response);

      } finally {
        client.release();
      }

    } catch (error) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.error('❌ Admin products fetch error', error, {
        adminId: req.user?.id,
        performanceMetrics: { duration },
        requestId: req.context?.requestId
      });
      next(error);
    }
  }

  /**
   * Approve product
   * POST /api/v1/admin/products/:productId/approve
   */
  async approveProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = process.hrtime.bigint();
    
    try {
      const { productId } = req.params;
      const { adminNotes } = req.body;
      const adminId = req.user?.id;

      if (!productId) {
        throw new ValidationError('Product ID is required');
      }

      if (!adminId) {
        throw new ValidationError('Admin ID is required');
      }

      console.log(`✅ Admin: Approving product ${productId}...`);

      const client = await db.getPool().connect();
      try {
        await client.query('BEGIN');

        // Check if product exists and is pending
        const checkQuery = `
          SELECT id, name, approval_status, contractor_id
          FROM products 
          WHERE id = $1 AND status != 'DELETED'
        `;
        
        const checkResult = await client.query(checkQuery, [productId]);
        
        if (checkResult.rows.length === 0) {
          throw new NotFoundError('Product not found');
        }

        const product = checkResult.rows[0];
        
        if (product.approval_status !== 'PENDING') {
          throw new ValidationError(`Product is already ${product.approval_status.toLowerCase()}`);
        }

        // Update product to approved
        const updateQuery = `
          UPDATE products 
          SET 
            approval_status = 'APPROVED',
            status = 'ACTIVE',
            approved_by = $2,
            approved_at = CURRENT_TIMESTAMP,
            admin_notes = $3,
            updated_by = $2,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
          RETURNING *
        `;

        const updateResult = await client.query(updateQuery, [
          productId, 
          adminId, 
          adminNotes || 'Product approved by admin'
        ]);

        const updatedProduct = updateResult.rows[0];

        // Create approval history record (if table exists)
        try {
          const historyQuery = `
            INSERT INTO product_approval_history (
              product_id, previous_status, new_status, action_type, 
              admin_id, admin_notes
            ) VALUES ($1, $2, $3, $4, $5, $6)
          `;
          
          await client.query(historyQuery, [
            productId,
            'PENDING',
            'APPROVED',
            'APPROVE',
            adminId,
            adminNotes || 'Product approved by admin'
          ]);
        } catch (historyError) {
          // Table might not exist, log but don't fail
          console.warn('Could not create approval history:', historyError);
        }

        await client.query('COMMIT');

        console.log(`✅ Product approved: ${updatedProduct.name} (${updatedProduct.id})`);

        const response: ApiResponse<Product> = {
          success: true,
          data: this.mapRowToProduct(updatedProduct),
          message: 'Product approved successfully',
          meta: {
            timestamp: new Date().toISOString(),
            requestId: req.context?.requestId,
            version: '1.0.0'
          } as any
        };

        // Performance monitoring
        const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
        logger.auditPerformance('ADMIN_APPROVE_PRODUCT', duration, {
          adminId,
          productId,
          productName: updatedProduct.name,
          success: true
        });

        // SAMA Audit
        logger.auditDataAccess(
          adminId,
          'products',
          productId,
          'UPDATE',
          {
            action: 'APPROVE',
            productName: updatedProduct.name,
            contractorId: updatedProduct.contractor_id,
            adminNotes
          }
        );

        res.status(200).json(response);

      } finally {
        client.release();
      }

    } catch (error) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.error('❌ Product approval error', error, {
        productId: req.params.productId,
        adminId: req.user?.id,
        performanceMetrics: { duration },
        requestId: req.context?.requestId
      });
      next(error);
    }
  }

  /**
   * Reject product
   * POST /api/v1/admin/products/:productId/reject
   */
  async rejectProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = process.hrtime.bigint();
    
    try {
      const { productId } = req.params;
      const { rejectionReason, adminNotes } = req.body;
      const adminId = req.user?.id;

      if (!productId) {
        throw new ValidationError('Product ID is required');
      }

      if (!rejectionReason) {
        throw new ValidationError('Rejection reason is required');
      }

      if (!adminId) {
        throw new ValidationError('Admin ID is required');
      }

      console.log(`❌ Admin: Rejecting product ${productId}...`);

      const client = await db.getPool().connect();
      try {
        await client.query('BEGIN');

        // Check if product exists and is pending
        const checkQuery = `
          SELECT id, name, approval_status, contractor_id
          FROM products 
          WHERE id = $1 AND status != 'DELETED'
        `;
        
        const checkResult = await client.query(checkQuery, [productId]);
        
        if (checkResult.rows.length === 0) {
          throw new NotFoundError('Product not found');
        }

        const product = checkResult.rows[0];
        
        if (product.approval_status !== 'PENDING') {
          throw new ValidationError(`Product is already ${product.approval_status.toLowerCase()}`);
        }

        // Update product to rejected
        const updateQuery = `
          UPDATE products 
          SET 
            approval_status = 'REJECTED',
            status = 'INACTIVE',
            approved_by = $2,
            approved_at = CURRENT_TIMESTAMP,
            rejection_reason = $3,
            admin_notes = $4,
            updated_by = $2,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
          RETURNING *
        `;

        const updateResult = await client.query(updateQuery, [
          productId, 
          adminId, 
          rejectionReason,
          adminNotes || 'Product rejected by admin'
        ]);

        const updatedProduct = updateResult.rows[0];

        // Create approval history record (if table exists)
        try {
          const historyQuery = `
            INSERT INTO product_approval_history (
              product_id, previous_status, new_status, action_type, 
              admin_id, admin_notes, rejection_reason
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          `;
          
          await client.query(historyQuery, [
            productId,
            'PENDING',
            'REJECTED',
            'REJECT',
            adminId,
            adminNotes || 'Product rejected by admin',
            rejectionReason
          ]);
        } catch (historyError) {
          // Table might not exist, log but don't fail
          console.warn('Could not create approval history:', historyError);
        }

        await client.query('COMMIT');

        console.log(`❌ Product rejected: ${updatedProduct.name} (${updatedProduct.id})`);

        const response: ApiResponse<Product> = {
          success: true,
          data: this.mapRowToProduct(updatedProduct),
          message: 'Product rejected successfully',
          meta: {
            timestamp: new Date().toISOString(),
            requestId: req.context?.requestId,
            version: '1.0.0'
          } as any
        };

        // Performance monitoring
        const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
        logger.auditPerformance('ADMIN_REJECT_PRODUCT', duration, {
          adminId,
          productId,
          productName: updatedProduct.name,
          rejectionReason,
          success: true
        });

        // SAMA Audit
        logger.auditDataAccess(
          adminId,
          'products',
          productId,
          'UPDATE',
          {
            action: 'REJECT',
            productName: updatedProduct.name,
            contractorId: updatedProduct.contractor_id,
            rejectionReason,
            adminNotes
          }
        );

        res.status(200).json(response);

      } finally {
        client.release();
      }

    } catch (error) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.error('❌ Product rejection error', error, {
        productId: req.params.productId,
        adminId: req.user?.id,
        rejectionReason: req.body.rejectionReason,
        performanceMetrics: { duration },
        requestId: req.context?.requestId
      });
      next(error);
    }
  }

  // =====================================================
  // PRIVATE HELPER METHODS
  // =====================================================

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
      updatedBy: row.updated_by
    };
  }
}

// Export singleton instance
export const adminController = new AdminController();