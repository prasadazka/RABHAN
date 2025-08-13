/**
 * RABHAN Admin Dashboard Controller
 * Handles dashboard data, analytics, and KPIs
 */

import { Request, Response } from 'express';
import { MicroserviceConnector, UserAnalytics, ContractorAnalytics, Product } from '@services/microservice-connector';
import { logger } from '@utils/logger';

export class DashboardController {
  private microserviceConnector: MicroserviceConnector;

  constructor() {
    this.microserviceConnector = MicroserviceConnector.getInstance();
  }

  /**
   * Get dashboard overview data
   */
  public getDashboardOverview = async (req: Request, res: Response): Promise<void> => {
    try {
      logger.info('Fetching dashboard overview data', {
        adminId: (req as any).adminId,
        timestamp: new Date().toISOString()
      });

      // Fetch users, contractors, and analytics in parallel
      const [usersResponse, contractorsResponse, contractorAnalyticsResponse] = await Promise.all([
        this.microserviceConnector.getUsers(),
        this.microserviceConnector.getContractors(),
        this.microserviceConnector.getContractorAnalytics()
      ]);

      const users = usersResponse.data || [];
      const contractors = contractorsResponse.data || [];
      const contractorAnalytics = contractorAnalyticsResponse.data;

      // Calculate basic metrics
      const totalUsers = users.length;
      const totalContractors = contractors.length;
      const activeUsers = users.filter(u => u.status === 'active').length;
      const activeContractors = contractorAnalytics ? contractorAnalytics.statusDistribution.active : contractors.filter(c => c.status === 'active').length;
      const pendingUsers = users.filter(u => u.status === 'pending').length;
      const pendingContractors = contractorAnalytics ? contractorAnalytics.statusDistribution.pending : contractors.filter(c => c.status === 'pending').length;

      // Recent activity (last 7 days)
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const recentUsers = users.filter(u => 
        new Date(u.registrationDate) >= sevenDaysAgo
      ).length;
      
      const recentContractors = contractorAnalytics ? 
        contractorAnalytics.performance.newContractorsLast7Days : 
        contractors.filter(c => new Date(c.registrationDate) >= sevenDaysAgo).length;

      const dashboardData = {
        users: {
          total: totalUsers,
          active: activeUsers,
          pending: pendingUsers,
          recent: recentUsers
        },
        contractors: {
          total: totalContractors,
          active: activeContractors,
          pending: pendingContractors,
          recent: recentContractors,
          averageRating: contractorAnalytics ? contractorAnalytics.performance.averageRating : 0,
          highRated: contractorAnalytics ? contractorAnalytics.performance.highRatedContractors : 0,
          verificationLevels: contractorAnalytics ? contractorAnalytics.verificationLevels : null
        },
        summary: {
          totalPlatformUsers: totalUsers + totalContractors,
          activeEntities: activeUsers + activeContractors,
          pendingApprovals: pendingUsers + pendingContractors,
          recentRegistrations: recentUsers + recentContractors
        },
        analytics: {
          contractorGrowthRate: contractorAnalytics ? contractorAnalytics.contractorGrowth.growthRate : 0,
          topContractorRegions: contractorAnalytics ? contractorAnalytics.geographical.topRegions.slice(0, 3) : [],
          businessTypeDistribution: contractorAnalytics ? contractorAnalytics.businessTypes.slice(0, 3) : []
        }
      };

      logger.info('Dashboard overview data retrieved successfully', {
        totalUsers: dashboardData.users.total,
        totalContractors: dashboardData.contractors.total,
        activeEntities: dashboardData.summary.activeEntities
      });

      res.status(200).json({
        success: true,
        data: dashboardData,
        message: 'Dashboard overview retrieved successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error fetching dashboard overview', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch dashboard overview',
        error_code: 'DASHBOARD_ERROR'
      });
    }
  };

  /**
   * Get user analytics and KPIs
   */
  public getUserAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {
      logger.info('Fetching user analytics and KPIs', {
        adminId: (req as any).adminId,
        timestamp: new Date().toISOString()
      });

      const analyticsResponse = await this.microserviceConnector.getUserAnalytics();
      
      if (!analyticsResponse.success || !analyticsResponse.data) {
        logger.warn('Failed to fetch user analytics from microservice');
        res.status(503).json({
          success: false,
          error: 'User analytics service unavailable',
          error_code: 'SERVICE_UNAVAILABLE'
        });
        return;
      }

      const analytics = analyticsResponse.data;

      logger.info('User analytics retrieved successfully', {
        totalUsers: analytics.totalUsers,
        growthRate: analytics.userGrowth.growthRate,
        averageCompletion: analytics.profileCompletion.averageCompletion,
        bnplEligible: analytics.bnplEligibility.eligible
      });

      res.status(200).json({
        success: true,
        data: analytics,
        message: 'User analytics retrieved successfully',
        metadata: {
          timestamp: new Date().toISOString(),
          generated_at: new Date().toISOString(),
          data_freshness: 'real-time'
        }
      });

    } catch (error) {
      logger.error('Error fetching user analytics', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user analytics',
        error_code: 'ANALYTICS_ERROR',
        message: 'Unable to retrieve user analytics data'
      });
    }
  };

  /**
   * Get contractor analytics and KPIs
   */
  public getContractorAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {
      logger.info('Fetching contractor analytics and KPIs', {
        adminId: (req as any).adminId,
        timestamp: new Date().toISOString()
      });

      const contractorAnalyticsResponse = await this.microserviceConnector.getContractorAnalytics();
      
      if (!contractorAnalyticsResponse.success || !contractorAnalyticsResponse.data) {
        logger.warn('Failed to fetch contractor analytics from microservice');
        res.status(503).json({
          success: false,
          error: 'Contractor analytics service unavailable',
          error_code: 'SERVICE_UNAVAILABLE'
        });
        return;
      }

      const analytics = contractorAnalyticsResponse.data;

      logger.info('Contractor analytics retrieved successfully', {
        totalContractors: analytics.totalContractors,
        growthRate: analytics.contractorGrowth.growthRate,
        averageRating: analytics.performance.averageRating,
        activeContractors: analytics.statusDistribution.active
      });

      res.status(200).json({
        success: true,
        data: analytics,
        message: 'Contractor analytics retrieved successfully',
        metadata: {
          timestamp: new Date().toISOString(),
          generated_at: new Date().toISOString(),
          data_freshness: 'real-time'
        }
      });

    } catch (error) {
      logger.error('Error fetching contractor analytics', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch contractor analytics',
        error_code: 'ANALYTICS_ERROR',
        message: 'Unable to retrieve contractor analytics data'
      });
    }
  };

  /**
   * Get service health status
   */
  public getServiceHealth = async (req: Request, res: Response): Promise<void> => {
    try {
      const healthStatus = await this.microserviceConnector.getServiceHealthStatus();
      
      const overallHealth = Object.values(healthStatus).every(status => status);
      
      res.status(200).json({
        success: true,
        data: {
          overall: overallHealth ? 'healthy' : 'degraded',
          services: healthStatus,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Error checking service health', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to check service health',
        error_code: 'HEALTH_CHECK_ERROR'
      });
    }
  };

  /**
   * Get user documents
   */
  public getUserDocuments = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'User ID is required',
          error_code: 'MISSING_USER_ID'
        });
        return;
      }

      logger.info('Fetching user documents', {
        userId,
        adminId: (req as any).adminId,
        timestamp: new Date().toISOString()
      });

      const documentsResponse = await this.microserviceConnector.getUserDocuments(userId);

      res.status(200).json({
        success: true,
        data: documentsResponse.data || [],
        message: documentsResponse.data?.length ? 
          `Found ${documentsResponse.data.length} documents` : 
          'No documents found for this user'
      });

    } catch (error) {
      logger.error('Error fetching user documents', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user documents',
        error_code: 'FETCH_DOCUMENTS_ERROR'
      });
    }
  };

  /**
   * Get contractor documents
   */
  public getContractorDocuments = async (req: Request, res: Response): Promise<void> => {
    try {
      const { contractorId } = req.params;

      if (!contractorId) {
        res.status(400).json({
          success: false,
          error: 'Contractor ID is required',
          error_code: 'MISSING_CONTRACTOR_ID'
        });
        return;
      }

      logger.info('Fetching contractor documents', {
        contractorId,
        adminId: (req as any).adminId,
        timestamp: new Date().toISOString()
      });

      const documentsResponse = await this.microserviceConnector.getContractorDocuments(contractorId);

      res.status(200).json({
        success: true,
        data: documentsResponse.data || [],
        message: documentsResponse.data?.length ? 
          `Found ${documentsResponse.data.length} documents` : 
          'No documents found for this contractor'
      });

    } catch (error) {
      logger.error('Error fetching contractor documents', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch contractor documents',
        error_code: 'FETCH_CONTRACTOR_DOCUMENTS_ERROR'
      });
    }
  };

  /**
   * Get users list for admin
   */
  public getUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      logger.info('Fetching users list for admin', {
        adminId: (req as any).adminId,
        timestamp: new Date().toISOString()
      });

      const usersResponse = await this.microserviceConnector.getUsers();
      
      if (!usersResponse.success) {
        logger.warn('Failed to fetch users from microservice');
        res.status(503).json({
          success: false,
          error: 'User service unavailable',
          error_code: 'SERVICE_UNAVAILABLE'
        });
        return;
      }

      const users = usersResponse.data || [];

      logger.info('Users list retrieved successfully', {
        users_count: users.length
      });

      res.status(200).json({
        success: true,
        data: users,
        message: 'Users retrieved successfully',
        metadata: {
          timestamp: new Date().toISOString(),
          total_count: users.length
        }
      });

    } catch (error) {
      logger.error('Error fetching users', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch users',
        error_code: 'USERS_ERROR',
        message: 'Unable to retrieve users data'
      });
    }
  };

  /**
   * Get contractors list for admin
   */
  public getContractors = async (req: Request, res: Response): Promise<void> => {
    try {
      logger.info('Fetching contractors list for admin', {
        adminId: (req as any).adminId,
        timestamp: new Date().toISOString()
      });

      const contractorsResponse = await this.microserviceConnector.getContractors();
      
      if (!contractorsResponse.success) {
        logger.warn('Failed to fetch contractors from microservice');
        res.status(503).json({
          success: false,
          error: 'Contractor service unavailable',
          error_code: 'SERVICE_UNAVAILABLE'
        });
        return;
      }

      const contractors = contractorsResponse.data || [];

      logger.info('Contractors list retrieved successfully', {
        contractors_count: contractors.length
      });

      res.status(200).json({
        success: true,
        data: contractors,
        message: 'Contractors retrieved successfully',
        metadata: {
          timestamp: new Date().toISOString(),
          total_count: contractors.length
        }
      });

    } catch (error) {
      logger.error('Error fetching contractors', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch contractors',
        error_code: 'CONTRACTORS_ERROR',
        message: 'Unable to retrieve contractors data'
      });
    }
  };

  /**
   * Proxy document content for viewing
   */
  public proxyDocument = async (req: Request, res: Response): Promise<void> => {
    try {
      const { documentId } = req.params;

      if (!documentId) {
        res.status(400).json({
          success: false,
          error: 'Document ID is required',
          error_code: 'MISSING_DOCUMENT_ID'
        });
        return;
      }

      logger.info('Proxying document content', {
        documentId,
        adminId: (req as any).adminId,
        timestamp: new Date().toISOString()
      });

      // Get the document owner's user ID from database
      const { DatabaseConfig } = require('../../../document-service/dist/config/database.config');
      const db = DatabaseConfig.getInstance(); 
      await db.connect();
      
      const docResult = await db.query('SELECT auth_user_id FROM documents WHERE id = $1', [documentId]);
      await db.close();
      
      if (!docResult.rows[0]) {
        res.status(404).json({
          success: false,
          error: 'Document not found',
          error_code: 'DOCUMENT_NOT_FOUND'
        });
        return;
      }
      
      const documentUserId = docResult.rows[0].auth_user_id;

      // Create a JWT token with the actual document owner's user ID
      const jwt = require('jsonwebtoken');
      const jwtSecret = process.env.JWT_SECRET || 'rabhan_jwt_secret_key_for_development_only_change_in_production';
      const token = jwt.sign(
        { userId: documentUserId, role: 'user' },
        jwtSecret,
        { expiresIn: '1h' }
      );

      // Fetch document from document service using download endpoint with auth
      const response = await fetch(`http://localhost:3003/api/documents/${documentId}/download`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        res.status(response.status).json({
          success: false,
          error: 'Document not found or access denied',
          error_code: 'DOCUMENT_ACCESS_ERROR'
        });
        return;
      }

      // Get content type from document service
      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      
      // Set appropriate headers
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'private, max-age=3600'); // Cache for 1 hour
      
      // Stream the document content
      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));

    } catch (error) {
      logger.error('Error proxying document', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to proxy document',
        error_code: 'PROXY_ERROR'
      });
    }
  };

  /**
   * Download document endpoint
   */
  public downloadDocument = async (req: Request, res: Response): Promise<void> => {
    try {
      const { documentId } = req.params;

      if (!documentId) {
        res.status(400).json({
          success: false,
          error: 'Document ID is required',
          error_code: 'MISSING_DOCUMENT_ID'
        });
        return;
      }

      logger.info('Processing document download', {
        documentId,
        adminId: (req as any).adminId,
        timestamp: new Date().toISOString()
      });

      // Get the document owner's user ID from database
      const { DatabaseConfig } = require('../../../document-service/dist/config/database.config');
      const db = DatabaseConfig.getInstance(); 
      await db.connect();
      
      const docResult = await db.query('SELECT auth_user_id FROM documents WHERE id = $1', [documentId]);
      await db.close();
      
      if (!docResult.rows[0]) {
        res.status(404).json({
          success: false,
          error: 'Document not found',
          error_code: 'DOCUMENT_NOT_FOUND'
        });
        return;
      }
      
      const documentUserId = docResult.rows[0].auth_user_id;

      // Create a JWT token with the actual document owner's user ID
      const jwt = require('jsonwebtoken');
      const jwtSecret = process.env.JWT_SECRET || 'rabhan_jwt_secret_key_for_development_only_change_in_production';
      const token = jwt.sign(
        { userId: documentUserId, role: 'user' },
        jwtSecret,
        { expiresIn: '1h' }
      );

      // Fetch document from document service using download endpoint with auth
      const response = await fetch(`http://localhost:3003/api/documents/${documentId}/download`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        res.status(response.status).json({
          success: false,
          error: 'Document not found or access denied',
          error_code: 'DOCUMENT_ACCESS_ERROR'
        });
        return;
      }

      // Get headers from document service
      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      const contentDisposition = response.headers.get('content-disposition') || 'attachment';
      
      // Set download headers
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', contentDisposition);
      
      // Stream the document content
      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));

    } catch (error) {
      logger.error('Error downloading document', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to download document',
        error_code: 'DOWNLOAD_ERROR'
      });
    }
  };

  /**
   * Update contractor status
   */
  public updateContractorStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { contractorId } = req.params;
      const { status, notes } = req.body;

      if (!contractorId) {
        res.status(400).json({
          success: false,
          error: 'Contractor ID is required',
          error_code: 'MISSING_CONTRACTOR_ID'
        });
        return;
      }

      if (!status) {
        res.status(400).json({
          success: false,
          error: 'Status is required',
          error_code: 'MISSING_STATUS'
        });
        return;
      }

      logger.info('Updating contractor status', {
        contractorId,
        status,
        notes,
        adminId: (req as any).adminId,
        timestamp: new Date().toISOString()
      });

      const updateResponse = await this.microserviceConnector.updateContractorStatus(contractorId, status, notes);

      if (!updateResponse.success) {
        res.status(400).json({
          success: false,
          error: updateResponse.error || 'Failed to update contractor status',
          error_code: 'UPDATE_STATUS_FAILED'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: updateResponse.data,
        message: `Contractor status updated to ${status} successfully`
      });

    } catch (error) {
      logger.error('Error updating contractor status', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to update contractor status',
        error_code: 'UPDATE_STATUS_ERROR'
      });
    }
  };

  // Update user status (admin only)
  public updateUserStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const { status, notes } = req.body;

      logger.info('🔄 Admin updating user status', {
        userId,
        newStatus: status,
        adminId: req.user?.userId,
        notes: notes || 'No notes provided'
      });

      // Validate status
      const validStatuses = ['not_verified', 'pending', 'verified', 'rejected'];
      if (!validStatuses.includes(status)) {
        res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
        return;
      }

      // Validate required fields
      if (!userId || !status) {
        res.status(400).json({
          success: false,
          message: 'User ID and status are required'
        });
        return;
      }

      // Update user verification status through microservice
      const updateResponse = await this.microserviceConnector.updateUserVerificationStatus(
        userId,
        status,
        notes
      );

      if (updateResponse.success) {
        // Log audit trail
        logger.info('✅ User status updated successfully', {
          userId,
          newStatus: status,
          adminId: req.user?.userId,
          timestamp: new Date().toISOString()
        });

        res.status(200).json({
          success: true,
          data: updateResponse.data,
          message: `User status updated to ${status} successfully`
        });
      } else {
        logger.error('❌ Failed to update user status', {
          userId,
          status,
          error: updateResponse.error
        });

        res.status(500).json({
          success: false,
          message: updateResponse.error || 'Failed to update user status'
        });
      }

    } catch (error) {
      logger.error('❌ Error updating user status', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        userId: req.params.userId,
        status: req.body.status
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error while updating user status'
      });
    }
  };

  /**
   * Get all products
   */
  public getProducts = async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;

      const productsResponse = await this.microserviceConnector.getProducts(limit, offset);

      if (productsResponse.success) {
        res.status(200).json({
          success: true,
          data: productsResponse.data,
          message: `Retrieved ${productsResponse.data?.length || 0} products successfully`,
          meta: {
            timestamp: new Date().toISOString(),
            limit,
            offset,
            total: productsResponse.data?.length || 0
          }
        });
      } else {
        res.status(500).json({
          success: false,
          message: productsResponse.error || 'Failed to fetch products'
        });
      }

    } catch (error) {
      logger.error('❌ Error fetching products', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching products'
      });
    }
  };

  /**
   * Get products pending approval
   */
  public getPendingProducts = async (req: Request, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const pendingResponse = await this.microserviceConnector.getPendingProducts(page, limit);

      if (pendingResponse.success) {
        res.status(200).json({
          success: true,
          data: pendingResponse.data,
          message: `Retrieved ${pendingResponse.data?.data?.length || 0} pending products successfully`,
          meta: {
            timestamp: new Date().toISOString(),
            page,
            limit
          }
        });
      } else {
        res.status(500).json({
          success: false,
          message: pendingResponse.error || 'Failed to fetch pending products'
        });
      }

    } catch (error) {
      logger.error('❌ Error fetching pending products', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching pending products'
      });
    }
  };

  /**
   * Approve a product
   */
  public approveProduct = async (req: Request, res: Response): Promise<void> => {
    try {
      const { productId } = req.params;
      const { adminNotes } = req.body;

      if (!productId) {
        res.status(400).json({
          success: false,
          message: 'Product ID is required'
        });
        return;
      }

      const approveResponse = await this.microserviceConnector.approveProduct(productId, adminNotes);

      if (approveResponse.success) {
        res.status(200).json({
          success: true,
          data: approveResponse.data,
          message: 'Product approved successfully',
          meta: {
            timestamp: new Date().toISOString(),
            productId,
            action: 'approve'
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: approveResponse.error || 'Failed to approve product'
        });
      }

    } catch (error) {
      logger.error('❌ Error approving product', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        productId: req.params.productId
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error while approving product'
      });
    }
  };

  /**
   * Reject a product
   */
  public rejectProduct = async (req: Request, res: Response): Promise<void> => {
    try {
      const { productId } = req.params;
      const { rejectionReason, adminNotes } = req.body;

      if (!productId) {
        res.status(400).json({
          success: false,
          message: 'Product ID is required'
        });
        return;
      }

      if (!rejectionReason) {
        res.status(400).json({
          success: false,
          message: 'Rejection reason is required'
        });
        return;
      }

      const rejectResponse = await this.microserviceConnector.rejectProduct(productId, rejectionReason, adminNotes);

      if (rejectResponse.success) {
        res.status(200).json({
          success: true,
          data: rejectResponse.data,
          message: 'Product rejected successfully',
          meta: {
            timestamp: new Date().toISOString(),
            productId,
            action: 'reject',
            rejectionReason
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: rejectResponse.error || 'Failed to reject product'
        });
      }

    } catch (error) {
      logger.error('❌ Error rejecting product', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        productId: req.params.productId
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error while rejecting product'
      });
    }
  };

  /**
   * Request changes for a product
   */
  public requestProductChanges = async (req: Request, res: Response): Promise<void> => {
    try {
      const { productId } = req.params;
      const { changesRequired, adminNotes } = req.body;

      if (!productId) {
        res.status(400).json({
          success: false,
          message: 'Product ID is required'
        });
        return;
      }

      if (!changesRequired) {
        res.status(400).json({
          success: false,
          message: 'Changes required description is required'
        });
        return;
      }

      const changesResponse = await this.microserviceConnector.requestProductChanges(productId, changesRequired, adminNotes);

      if (changesResponse.success) {
        res.status(200).json({
          success: true,
          data: changesResponse.data,
          message: 'Changes requested successfully',
          meta: {
            timestamp: new Date().toISOString(),
            productId,
            action: 'request_changes',
            changesRequired
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: changesResponse.error || 'Failed to request changes'
        });
      }

    } catch (error) {
      logger.error('❌ Error requesting product changes', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        productId: req.params.productId
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error while requesting product changes'
      });
    }
  };

  /**
   * Get all quote requests for admin dashboard
   */
  public getQuotes = async (req: Request, res: Response): Promise<void> => {
    try {
      const { page = 1, limit = 20, status, search } = req.query;

      logger.info('📋 Admin fetching quotes', {
        page,
        limit,
        status,
        search,
        adminId: req.user?.userId
      });

      // Get quotes from quote service
      const quotesResponse = await this.microserviceConnector.getQuotes({
        page: Number(page),
        limit: Number(limit),
        status: status as string,
        search: search as string
      });

      if (quotesResponse.success) {
        res.status(200).json({
          success: true,
          data: quotesResponse.data,
          message: 'Quotes retrieved successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          message: quotesResponse.error || 'Failed to get quotes'
        });
      }

    } catch (error) {
      logger.error('❌ Error fetching quotes', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching quotes'
      });
    }
  };

  /**
   * Get specific quote request details
   */
  public getQuoteDetails = async (req: Request, res: Response): Promise<void> => {
    try {
      const { quoteId } = req.params;

      if (!quoteId) {
        res.status(400).json({
          success: false,
          message: 'Quote ID is required'
        });
        return;
      }

      logger.info('📋 Admin fetching quote details', {
        quoteId,
        adminId: req.user?.userId
      });

      const quoteResponse = await this.microserviceConnector.getQuoteDetails(quoteId);

      if (quoteResponse.success) {
        res.status(200).json({
          success: true,
          data: quoteResponse.data,
          message: 'Quote details retrieved successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          message: quoteResponse.error || 'Failed to get quote details'
        });
      }

    } catch (error) {
      logger.error('❌ Error fetching quote details', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        quoteId: req.params.quoteId
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching quote details'
      });
    }
  };

  /**
   * Get contractor assignments for a quote
   */
  public getQuoteAssignments = async (req: Request, res: Response): Promise<void> => {
    try {
      const { quoteId } = req.params;

      if (!quoteId) {
        res.status(400).json({
          success: false,
          message: 'Quote ID is required'
        });
        return;
      }

      logger.info('📋 Admin fetching quote assignments', {
        quoteId,
        adminId: req.user?.userId
      });

      const assignmentsResponse = await this.microserviceConnector.getQuoteAssignments(quoteId);

      if (assignmentsResponse.success) {
        res.status(200).json({
          success: true,
          data: assignmentsResponse.data,
          message: 'Quote assignments retrieved successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          message: assignmentsResponse.error || 'Failed to get quote assignments'
        });
      }

    } catch (error) {
      logger.error('❌ Error fetching quote assignments', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        quoteId: req.params.quoteId
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching quote assignments'
      });
    }
  };

  /**
   * Update quote status
   */
  public updateQuoteStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { quoteId } = req.params;
      const { status, adminNotes } = req.body;

      if (!quoteId || !status) {
        res.status(400).json({
          success: false,
          message: 'Quote ID and status are required'
        });
        return;
      }

      logger.info('📋 Admin updating quote status', {
        quoteId,
        newStatus: status,
        adminNotes,
        adminId: req.user?.userId
      });

      const updateResponse = await this.microserviceConnector.updateQuoteStatus(quoteId, status, adminNotes);

      if (updateResponse.success) {
        res.status(200).json({
          success: true,
          data: updateResponse.data,
          message: `Quote status updated to ${status} successfully`
        });
      } else {
        res.status(400).json({
          success: false,
          message: updateResponse.error || 'Failed to update quote status'
        });
      }

    } catch (error) {
      logger.error('❌ Error updating quote status', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        quoteId: req.params.quoteId
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error while updating quote status'
      });
    }
  };
}