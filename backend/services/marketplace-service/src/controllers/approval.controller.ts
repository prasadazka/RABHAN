/**
 * RABHAN Marketplace Service - Product Approval Controller
 * SAMA Compliant | Zero-Trust Security | Admin Workflow Management
 */

import { Request, Response, NextFunction } from 'express';
import { approvalService } from '@/services/approval.service';
import { logger, SAMALogCategory } from '@/utils/logger';
import { 
  ProductApprovalSchema,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError
} from '@/types/marketplace.types';

export class ApprovalController {
  
  /**
   * Get products pending approval
   * GET /api/v1/approvals/pending
   * Admin only
   */
  async getPendingApprovals(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = process.hrtime.bigint();
    
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;
      
      if (!userId) {
        throw new UnauthorizedError('User ID required');
      }

      if (!['ADMIN', 'SUPER_ADMIN'].includes(userRole || '')) {
        throw new UnauthorizedError('Admin role required');
      }

      // Parse pagination parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100); // Max 100 items

      const pagination = { page, limit };
      const result = await approvalService.getPendingApprovals(pagination, userId);

      // Performance monitoring
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.auditPerformance('GET_PENDING_APPROVALS_CONTROLLER', duration, {
        adminId: userId,
        resultCount: result.data.length,
        totalResults: result.pagination.total
      });

      res.json({
        success: true,
        data: result,
        message: 'Pending approvals retrieved successfully',
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.context?.requestId,
          version: '1.0.0'
        }
      });

    } catch (error) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.error('Failed to get pending approvals', error, {
        adminId: req.user?.id,
        performanceMetrics: { duration },
        requestId: req.context?.requestId
      });
      next(error);
    }
  }

  /**
   * Process product approval (approve/reject/request changes)
   * POST /api/v1/approvals/:productId
   * Admin only
   */
  async processApproval(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = process.hrtime.bigint();
    
    try {
      const { productId } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role;
      
      if (!userId) {
        throw new UnauthorizedError('User ID required');
      }

      if (!['ADMIN', 'SUPER_ADMIN'].includes(userRole || '')) {
        throw new UnauthorizedError('Admin role required');
      }

      // Validate request body
      const validatedData = ProductApprovalSchema.parse(req.body);
      
      let result;
      let action = '';

      switch (validatedData.action) {
        case 'approve':
          result = await approvalService.approveProduct(
            productId,
            userId!,
            validatedData.adminNotes
          );
          action = 'approved';
          break;

        case 'reject':
          if (!validatedData.rejectionReason) {
            throw new ValidationError('Rejection reason is required when rejecting a product');
          }
          result = await approvalService.rejectProduct(
            productId,
            userId!,
            validatedData.rejectionReason!,
            validatedData.adminNotes
          );
          action = 'rejected';
          break;

        case 'request_changes':
          if (!validatedData.changesRequired) {
            throw new ValidationError('Changes required description is needed when requesting changes');
          }
          result = await approvalService.requestChanges(
            productId,
            userId!,
            validatedData.changesRequired!,
            validatedData.adminNotes
          );
          action = 'requested changes for';
          break;

        default:
          throw new ValidationError('Invalid action. Must be approve, reject, or request_changes');
      }

      // Performance monitoring
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.auditPerformance('PROCESS_APPROVAL', duration, {
        productId,
        action: validatedData.action,
        adminId: userId,
        productName: result.name
      });

      res.json({
        success: true,
        data: result,
        message: `Product ${action} successfully`,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.context?.requestId,
          version: '1.0.0'
        }
      });

    } catch (error) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.error('Failed to process approval', error, {
        productId: req.params.productId,
        action: req.body?.action,
        adminId: req.user?.id,
        performanceMetrics: { duration },
        requestId: req.context?.requestId
      });
      next(error);
    }
  }

  /**
   * Submit product for approval
   * POST /api/v1/approvals/submit/:productId
   * Contractor only (for their own products)
   */
  async submitForApproval(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = process.hrtime.bigint();
    
    try {
      const { productId } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role;
      const contractorId = req.user?.contractorId;
      
      if (!userId) {
        throw new UnauthorizedError('User ID required');
      }

      if (!['CONTRACTOR'].includes(userRole || '')) {
        throw new UnauthorizedError('Contractor role required');
      }

      if (!contractorId) {
        throw new UnauthorizedError('Contractor ID required');
      }

      const result = await approvalService.submitForApproval(productId, contractorId!);

      // Performance monitoring
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.auditPerformance('SUBMIT_FOR_APPROVAL_CONTROLLER', duration, {
        productId,
        contractorId,
        productName: result.name
      });

      res.json({
        success: true,
        data: result,
        message: 'Product submitted for approval successfully',
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.context?.requestId,
          version: '1.0.0'
        }
      });

    } catch (error) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.error('Failed to submit for approval', error, {
        productId: req.params.productId,
        contractorId: req.user?.contractorId,
        performanceMetrics: { duration },
        requestId: req.context?.requestId
      });
      next(error);
    }
  }

  /**
   * Get approval history for a product
   * GET /api/v1/approvals/history/:productId
   * Accessible by product owner (contractor) and admins
   */
  async getApprovalHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = process.hrtime.bigint();
    
    try {
      const { productId } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role;
      const contractorId = req.user?.contractorId;
      
      if (!userId) {
        throw new UnauthorizedError('User ID required');
      }

      // Check if user has permission to view this product's history
      if (!['ADMIN', 'SUPER_ADMIN'].includes(userRole || '')) {
        // For contractors, verify they own the product
        if (userRole !== 'CONTRACTOR' || !contractorId) {
          throw new UnauthorizedError('Insufficient permissions');
        }

        // TODO: Add product ownership check here
        // This would require querying the product to verify contractor ownership
      }

      // Parse pagination parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50); // Max 50 history items

      const pagination = { page, limit };
      const result = await approvalService.getApprovalHistory(productId, pagination);

      // Performance monitoring
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.auditPerformance('GET_APPROVAL_HISTORY_CONTROLLER', duration, {
        productId,
        userId,
        resultCount: result.data.length
      });

      res.json({
        success: true,
        data: result,
        message: 'Approval history retrieved successfully',
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.context?.requestId,
          version: '1.0.0'
        }
      });

    } catch (error) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.error('Failed to get approval history', error, {
        productId: req.params.productId,
        userId: req.user?.id,
        performanceMetrics: { duration },
        requestId: req.context?.requestId
      });
      next(error);
    }
  }

  /**
   * Get approval statistics (Admin only)
   * GET /api/v1/approvals/stats
   */
  async getApprovalStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = process.hrtime.bigint();
    
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;
      
      if (!userId) {
        throw new UnauthorizedError('User ID required');
      }

      if (!['ADMIN', 'SUPER_ADMIN'].includes(userRole || '')) {
        throw new UnauthorizedError('Admin role required');
      }

      // Basic approval stats query
      const statsQuery = `
        SELECT 
          COUNT(*) as total_products,
          COUNT(CASE WHEN approval_status = 'PENDING' THEN 1 END) as pending_approvals,
          COUNT(CASE WHEN approval_status = 'APPROVED' THEN 1 END) as approved_products,
          COUNT(CASE WHEN approval_status = 'REJECTED' THEN 1 END) as rejected_products,
          COUNT(CASE WHEN approval_status = 'CHANGES_REQUIRED' THEN 1 END) as changes_required,
          COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active_products,
          AVG(CASE WHEN approval_status = 'APPROVED' AND approved_at IS NOT NULL 
              THEN EXTRACT(EPOCH FROM (approved_at - created_at))/3600 END) as avg_approval_time_hours
        FROM products
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      `;

      // This would be implemented in the approval service
      // For now, we'll use a direct query approach
      // For now, return mock data - this would be implemented in the service
      const result = { rows: [{ 
        total_products: '0',
        pending_approvals: '0',
        approved_products: '0',
        rejected_products: '0',
        changes_required: '0',
        active_products: '0',
        avg_approval_time_hours: '0'
      }] };
      const stats = result.rows[0] as any || {
        total_products: '0',
        pending_approvals: '0',
        approved_products: '0',
        rejected_products: '0',
        changes_required: '0',
        active_products: '0',
        avg_approval_time_hours: '0'
      };

      // Performance monitoring
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.auditPerformance('GET_APPROVAL_STATS', duration, {
        adminId: userId
      });

      res.json({
        success: true,
        data: {
          totalProducts: parseInt(stats.total_products || '0'),
          pendingApprovals: parseInt(stats.pending_approvals || '0'),
          approvedProducts: parseInt(stats.approved_products || '0'),
          rejectedProducts: parseInt(stats.rejected_products || '0'),
          changesRequired: parseInt(stats.changes_required || '0'),
          activeProducts: parseInt(stats.active_products || '0'),
          averageApprovalTimeHours: parseFloat(stats.avg_approval_time_hours || '0'),
          period: 'last_30_days'
        },
        message: 'Approval statistics retrieved successfully',
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.context?.requestId,
          version: '1.0.0'
        }
      });

    } catch (error) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.error('Failed to get approval stats', error, {
        adminId: req.user?.id,
        performanceMetrics: { duration },
        requestId: req.context?.requestId
      });
      next(error);
    }
  }

  /**
   * Bulk approve products (Admin only)
   * POST /api/v1/approvals/bulk-approve
   * For admin efficiency
   */
  async bulkApprove(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = process.hrtime.bigint();
    
    try {
      const { productIds, adminNotes } = req.body;
      const userId = req.user?.id;
      const userRole = req.user?.role;
      
      if (!userId) {
        throw new UnauthorizedError('User ID required');
      }

      if (!['ADMIN', 'SUPER_ADMIN'].includes(userRole || '')) {
        throw new UnauthorizedError('Admin role required');
      }

      if (!Array.isArray(productIds) || productIds.length === 0) {
        throw new ValidationError('Product IDs array is required');
      }

      if (productIds.length > 50) {
        throw new ValidationError('Cannot bulk approve more than 50 products at once');
      }

      const results = [];
      const errors = [];

      // Process each product (could be optimized with batch operations)
      for (const productId of productIds) {
        try {
          const result = await approvalService.approveProduct(productId, userId!, adminNotes);
          results.push(result);
        } catch (error) {
          errors.push({
            productId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Performance monitoring
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.auditPerformance('BULK_APPROVE', duration, {
        adminId: userId,
        totalRequested: productIds.length,
        approved: results.length,
        failed: errors.length
      });

      res.json({
        success: errors.length === 0,
        data: {
          approved: results,
          errors: errors,
          summary: {
            totalRequested: productIds.length,
            approved: results.length,
            failed: errors.length
          }
        },
        message: errors.length === 0 
          ? `${results.length} products approved successfully`
          : `${results.length} products approved, ${errors.length} failed`,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.context?.requestId,
          version: '1.0.0'
        }
      });

    } catch (error) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.error('Failed to bulk approve products', error, {
        adminId: req.user?.id,
        productCount: req.body?.productIds?.length || 0,
        performanceMetrics: { duration },
        requestId: req.context?.requestId
      });
      next(error);
    }
  }
}

// Export singleton instance
export const approvalController = new ApprovalController();