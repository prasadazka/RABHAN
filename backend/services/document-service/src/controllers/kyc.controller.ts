import { Request, Response } from 'express';
import { KYCWorkflowService, UserRole, KYCStatus } from '../services/kyc-workflow.service';
import { logger, SAMALogger } from '../utils/logger';

export class KYCController {
  private kycService: KYCWorkflowService;

  constructor() {
    this.kycService = KYCWorkflowService.getInstance();
  }

  /**
   * Get user's KYC status
   */
  public getKYCStatus = async (req: Request, res: Response): Promise<void> => {
    const userId = req.query.userId as string || req.body?.userId || '1f475729-c2e0-4b3d-a678-e4a4ea4d6cc0';
    const userRole = (req.query.userRole as UserRole) || UserRole.USER;

    try {
      logger.info('Getting KYC status', { userId, userRole });

      const kycStatus = await this.kycService.getKYCStatus(userId, userRole);

      res.json({
        success: true,
        kyc_status: kycStatus
      });
    } catch (error) {
      logger.error('Failed to get KYC status', {
        userId,
        userRole,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve KYC status',
        code: 'KYC_STATUS_FAILED'
      });
    }
  };

  /**
   * Submit KYC for review
   */
  public submitKYCForReview = async (req: Request, res: Response): Promise<void> => {
    const { userId, userRole } = req.body;

    try {
      if (!userId || !userRole) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: userId and userRole',
          code: 'MISSING_FIELDS'
        });
        return;
      }

      logger.info('Submitting KYC for review', { userId, userRole });

      const success = await this.kycService.submitForReview(userId, userRole);

      if (success) {
        res.json({
          success: true,
          message: 'KYC submitted for review successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Failed to submit KYC for review',
          code: 'SUBMISSION_FAILED'
        });
      }
    } catch (error) {
      logger.error('Failed to submit KYC for review', {
        userId,
        userRole,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit KYC for review',
        code: 'SUBMISSION_ERROR'
      });
    }
  };

  /**
   * Get KYC requirements for a role
   */
  public getKYCRequirements = async (req: Request, res: Response): Promise<void> => {
    const userRole = (req.query.userRole as UserRole) || UserRole.USER;

    try {
      logger.info('Getting KYC requirements', { userRole });

      // Get user status with empty user ID to just get requirements
      const dummyUserId = '00000000-0000-0000-0000-000000000000';
      const kycStatus = await this.kycService.getKYCStatus(dummyUserId, userRole);

      res.json({
        success: true,
        requirements: kycStatus.requirements.map(req => ({
          categoryId: req.categoryId,
          categoryName: req.categoryName,
          required: req.required
        }))
      });
    } catch (error) {
      logger.error('Failed to get KYC requirements', {
        userRole,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve KYC requirements',
        code: 'REQUIREMENTS_FAILED'
      });
    }
  };

  /**
   * Admin: Get pending KYC reviews
   */
  public getPendingReviews = async (req: Request, res: Response): Promise<void> => {
    const userRole = req.query.userRole as UserRole;

    try {
      logger.info('Getting pending KYC reviews', { userRole });

      const pendingReviews = await this.kycService.getPendingReviews(userRole);

      res.json({
        success: true,
        pending_reviews: pendingReviews,
        total_count: pendingReviews.length
      });
    } catch (error) {
      logger.error('Failed to get pending reviews', {
        userRole,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve pending reviews',
        code: 'PENDING_REVIEWS_FAILED'
      });
    }
  };

  /**
   * Admin: Approve KYC
   */
  public approveKYC = async (req: Request, res: Response): Promise<void> => {
    const { userId, userRole, notes } = req.body;
    const approvedBy = req.body.adminId || 'admin'; // Should come from auth middleware

    try {
      if (!userId || !userRole) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: userId and userRole',
          code: 'MISSING_FIELDS'
        });
        return;
      }

      logger.info('Approving KYC', { userId, userRole, approvedBy });

      const success = await this.kycService.approveKYC(userId, userRole, approvedBy, notes);

      if (success) {
        res.json({
          success: true,
          message: 'KYC approved successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to approve KYC',
          code: 'APPROVAL_FAILED'
        });
      }
    } catch (error) {
      logger.error('Failed to approve KYC', {
        userId,
        userRole,
        approvedBy,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to approve KYC',
        code: 'APPROVAL_ERROR'
      });
    }
  };

  /**
   * Admin: Reject KYC
   */
  public rejectKYC = async (req: Request, res: Response): Promise<void> => {
    const { userId, userRole, reason } = req.body;
    const rejectedBy = req.body.adminId || 'admin'; // Should come from auth middleware

    try {
      if (!userId || !userRole || !reason) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: userId, userRole, and reason',
          code: 'MISSING_FIELDS'
        });
        return;
      }

      logger.info('Rejecting KYC', { userId, userRole, rejectedBy, reason });

      const success = await this.kycService.rejectKYC(userId, userRole, rejectedBy, reason);

      if (success) {
        res.json({
          success: true,
          message: 'KYC rejected successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to reject KYC',
          code: 'REJECTION_FAILED'
        });
      }
    } catch (error) {
      logger.error('Failed to reject KYC', {
        userId,
        userRole,
        rejectedBy,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reject KYC',
        code: 'REJECTION_ERROR'
      });
    }
  };

  /**
   * Get KYC service health status
   */
  public getHealthStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const healthStatus = this.kycService.getHealthStatus();

      res.json({
        success: true,
        service: 'kyc-workflow',
        ...healthStatus,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('KYC health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        success: false,
        service: 'kyc-workflow',
        status: 'unhealthy',
        error: 'Health check failed'
      });
    }
  };
}