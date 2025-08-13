import { Response } from 'express';
import { ContractorService } from '../services/contractor.service';
import { ContractorVerificationService } from '../services/contractor-verification.service';
import { 
  ContractorRegistrationData,
  ContractorSearchQuery,
  ContractorStatus,
  ApiResponse,
  ContractorVerificationStatus
} from '../types/contractor.types';
import { logger, auditLogger, performanceLogger } from '../utils/logger';
import { validationResult } from 'express-validator';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class ContractorController {
  private contractorService: ContractorService;
  private verificationService: ContractorVerificationService;
  
  constructor() {
    this.contractorService = new ContractorService();
    this.verificationService = new ContractorVerificationService();
  }
  
  /**
   * Register a new contractor
   * POST /api/contractors/register
   */
  registerContractor = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const startTime = Date.now();
    
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array(),
            timestamp: new Date()
          }
        } as ApiResponse<null>);
        return;
      }
      
      // Support both authenticated requests and service-to-service calls
      let userId = req.user?.id;
      
      // Check for service-to-service call
      if (!userId && req.headers['x-user-id'] && req.headers['x-service'] === 'auth-service') {
        userId = req.headers['x-user-id'] as string;
        logger.info('Service-to-service contractor registration', {
          user_id: userId,
          calling_service: req.headers['x-service']
        });
      }
      
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required',
            timestamp: new Date()
          }
        });
        return;
      }
      
      const contractorData: ContractorRegistrationData = req.body;
      const requestMetadata = {
        ip_address: (req.headers['x-request-ip'] as string) || req.ip,
        user_agent: (req.headers['x-user-agent'] as string) || req.get('User-Agent')
      };
      
      // Register contractor
      const contractor = await this.contractorService.registerContractor(
        userId,
        contractorData,
        requestMetadata
      );
      
      const duration = Date.now() - startTime;
      performanceLogger.apiResponse('/api/contractors/register', 'POST', 201, duration);
      
      res.status(201).json({
        success: true,
        data: contractor,
        metadata: {
          timestamp: new Date(),
          request_id: req.requestId,
          version: '1.0.0'
        }
      } as ApiResponse<typeof contractor>);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Failed to register contractor', {
        user_id: req.user?.id,
        error: errorMessage,
        duration,
        ip_address: req.ip
      });
      
      performanceLogger.apiResponse('/api/contractors/register', 'POST', 500, duration);
      
      // Determine error status code
      let statusCode = 500;
      let errorCode = 'INTERNAL_ERROR';
      
      if (errorMessage.includes('already has a contractor profile')) {
        statusCode = 409;
        errorCode = 'CONTRACTOR_EXISTS';
      } else if (errorMessage.includes('validation') || errorMessage.includes('Invalid')) {
        statusCode = 400;
        errorCode = 'VALIDATION_ERROR';
      }
      
      res.status(statusCode).json({
        success: false,
        error: {
          code: errorCode,
          message: errorMessage,
          timestamp: new Date()
        }
      } as ApiResponse<null>);
    }
  };
  
  /**
   * Get contractor profile
   * GET /api/contractors/profile
   */
  getContractorProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const startTime = Date.now();
    
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required',
            timestamp: new Date()
          }
        });
        return;
      }
      
      // Get user info from auth token for lazy profile creation
      const userInfo = {
        email: req.user?.email,
        firstName: req.user?.email?.split('@')[0] || 'User', // Fallback since first_name not in JWT
        lastName: '', // Not available in JWT
        phone: req.user?.phone
      };
      
      // Use lazy profile creation - this will create a default profile if one doesn't exist
      const contractor = await this.contractorService.getContractorByUserIdWithLazyCreation(userId, userInfo);
      
      // Log data access for audit
      auditLogger.dataAccess(contractor.id, userId, 'profile_view');
      
      const duration = Date.now() - startTime;
      performanceLogger.apiResponse('/api/contractors/profile', 'GET', 200, duration);
      
      res.json({
        success: true,
        data: contractor,
        metadata: {
          timestamp: new Date(),
          request_id: req.requestId,
          version: '1.0.0'
        }
      } as ApiResponse<typeof contractor>);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Failed to get contractor profile', {
        user_id: req.user?.id,
        error: errorMessage,
        duration
      });
      
      performanceLogger.apiResponse('/api/contractors/profile', 'GET', 500, duration);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: errorMessage,
          timestamp: new Date()
        }
      } as ApiResponse<null>);
    }
  };
  
  /**
   * Get contractor by ID (Admin or public view)
   * GET /api/contractors/:id
   */
  getContractorById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const startTime = Date.now();
    
    try {
      const contractorId = req.params.id;
      
      if (!contractorId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'Contractor ID is required',
            timestamp: new Date()
          }
        });
        return;
      }
      
      const contractor = await this.contractorService.getContractorById(contractorId);
      
      if (!contractor) {
        res.status(404).json({
          success: false,
          error: {
            code: 'CONTRACTOR_NOT_FOUND',
            message: 'Contractor not found',
            timestamp: new Date()
          }
        });
        return;
      }
      
      // Log data access for audit
      const accessedBy = req.user?.id || 'anonymous';
      auditLogger.dataAccess(contractorId, accessedBy, 'profile_view_by_id');
      
      const duration = Date.now() - startTime;
      performanceLogger.apiResponse(`/api/contractors/${contractorId}`, 'GET', 200, duration);
      
      res.json({
        success: true,
        data: contractor,
        metadata: {
          timestamp: new Date(),
          request_id: req.requestId,
          version: '1.0.0'
        }
      } as ApiResponse<typeof contractor>);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Failed to get contractor by ID', {
        contractor_id: req.params.id,
        error: errorMessage,
        duration
      });
      
      performanceLogger.apiResponse(`/api/contractors/${req.params.id}`, 'GET', 500, duration);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: errorMessage,
          timestamp: new Date()
        }
      } as ApiResponse<null>);
    }
  };
  
  /**
   * Search contractors
   * GET /api/contractors/search
   */
  searchContractors = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const startTime = Date.now();
    
    try {
      const searchQuery: ContractorSearchQuery = {
        region: req.query.region as string,
        city: req.query.city as string,
        service_categories: req.query.service_categories 
          ? (req.query.service_categories as string).split(',') as any[]
          : undefined,
        status: req.query.status as ContractorStatus,
        min_rating: req.query.min_rating ? parseFloat(req.query.min_rating as string) : undefined,
        max_distance_km: req.query.max_distance_km ? parseInt(req.query.max_distance_km as string) : undefined,
        verification_level: req.query.verification_level ? parseInt(req.query.verification_level as string) : undefined,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        sort_by: req.query.sort_by as any || 'created_at',
        sort_order: req.query.sort_order as any || 'desc'
      };
      
      // Validate pagination limits
      if (searchQuery.limit! > 100) {
        searchQuery.limit = 100; // Max 100 items per page
      }
      
      const result = await this.contractorService.searchContractors(searchQuery);
      
      const duration = Date.now() - startTime;
      performanceLogger.apiResponse('/api/contractors/search', 'GET', 200, duration);
      
      res.json({
        success: true,
        data: result,
        metadata: {
          timestamp: new Date(),
          request_id: req.requestId,
          version: '1.0.0'
        }
      } as ApiResponse<typeof result>);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Failed to search contractors', {
        search_query: req.query,
        error: errorMessage,
        duration
      });
      
      performanceLogger.apiResponse('/api/contractors/search', 'GET', 500, duration);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: errorMessage,
          timestamp: new Date()
        }
      } as ApiResponse<null>);
    }
  };
  
  /**
   * Update contractor status (Admin only)
   * PUT /api/contractors/:id/status
   */
  updateContractorStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const startTime = Date.now();
    
    try {
      // Check admin permissions
      if (!req.user?.isAdmin) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Admin access required',
            timestamp: new Date()
          }
        });
        return;
      }
      
      const contractorId = req.params.id;
      const { status, notes } = req.body;
      const adminId = req.user.id;
      
      if (!status || !Object.values(ContractorStatus).includes(status)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: 'Valid status is required',
            timestamp: new Date()
          }
        });
        return;
      }
      
      const updatedContractor = await this.contractorService.updateContractorStatus(
        contractorId,
        status,
        adminId,
        notes
      );
      
      const duration = Date.now() - startTime;
      performanceLogger.apiResponse(`/api/contractors/${contractorId}/status`, 'PUT', 200, duration);
      
      res.json({
        success: true,
        data: updatedContractor,
        metadata: {
          timestamp: new Date(),
          request_id: req.requestId,
          version: '1.0.0'
        }
      } as ApiResponse<typeof updatedContractor>);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Failed to update contractor status', {
        contractor_id: req.params.id,
        admin_id: req.user?.id,
        error: errorMessage,
        duration
      });
      
      performanceLogger.apiResponse(`/api/contractors/${req.params.id}/status`, 'PUT', 500, duration);
      
      let statusCode = 500;
      let errorCode = 'INTERNAL_ERROR';
      
      if (errorMessage.includes('not found')) {
        statusCode = 404;
        errorCode = 'CONTRACTOR_NOT_FOUND';
      }
      
      res.status(statusCode).json({
        success: false,
        error: {
          code: errorCode,
          message: errorMessage,
          timestamp: new Date()
        }
      } as ApiResponse<null>);
    }
  };
  
  /**
   * Get contractor dashboard statistics
   * GET /api/contractors/dashboard/stats
   */
  getDashboardStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const startTime = Date.now();
    
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required',
            timestamp: new Date()
          }
        });
        return;
      }
      
      // Get contractor by user ID first
      const contractor = await this.contractorService.getContractorByUserId(userId);
      if (!contractor) {
        res.status(404).json({
          success: false,
          error: {
            code: 'CONTRACTOR_NOT_FOUND',
            message: 'Contractor profile not found',
            timestamp: new Date()
          }
        });
        return;
      }
      
      const stats = await this.contractorService.getContractorDashboardStats(contractor.id);
      
      const duration = Date.now() - startTime;
      performanceLogger.apiResponse('/api/contractors/dashboard/stats', 'GET', 200, duration);
      
      res.json({
        success: true,
        data: stats,
        metadata: {
          timestamp: new Date(),
          request_id: req.requestId,
          version: '1.0.0'
        }
      } as ApiResponse<typeof stats>);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Failed to get dashboard stats', {
        user_id: req.user?.id,
        error: errorMessage,
        duration
      });
      
      performanceLogger.apiResponse('/api/contractors/dashboard/stats', 'GET', 500, duration);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: errorMessage,
          timestamp: new Date()
        }
      } as ApiResponse<null>);
    }
  };
  
  /**
   * Update contractor profile
   * PUT /api/contractors/profile
   */
  updateContractorProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const startTime = Date.now();
    
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array(),
            timestamp: new Date()
          }
        } as ApiResponse<null>);
        return;
      }
      
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required',
            timestamp: new Date()
          }
        } as ApiResponse<null>);
        return;
      }
      
      // Update contractor profile
      const updatedContractor = await this.contractorService.updateContractorProfile(userId, req.body, {
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });
      
      const duration = Date.now() - startTime;
      
      performanceLogger.apiResponse('/api/contractors/profile', 'PUT', 200, duration);
      
      logger.info('Contractor profile updated successfully', {
        contractor_id: updatedContractor.id,
        user_id: userId,
        duration
      });
      
      res.json({
        success: true,
        data: updatedContractor,
        message: 'Contractor profile updated successfully'
      } as ApiResponse<typeof updatedContractor>);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Failed to update contractor profile', {
        user_id: req.user?.id,
        error: errorMessage,
        duration,
        ip_address: req.ip
      });
      
      performanceLogger.apiResponse('/api/contractors/profile', 'PUT', 500, duration);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: errorMessage,
          timestamp: new Date()
        }
      } as ApiResponse<null>);
    }
  };

  /**
   * Get contractor verification status
   * GET /api/contractors/profile/verification
   */
  getVerificationStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const startTime = Date.now();
    
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required',
            timestamp: new Date()
          }
        });
        return;
      }
      
      // Get contractor by user ID first
      const contractor = await this.contractorService.getContractorByUserId(userId);
      if (!contractor) {
        res.status(404).json({
          success: false,
          error: {
            code: 'CONTRACTOR_NOT_FOUND',
            message: 'Contractor profile not found',
            timestamp: new Date()
          }
        });
        return;
      }
      
      const verificationStatus = await this.verificationService.getVerificationStatus(contractor.id);
      
      const duration = Date.now() - startTime;
      performanceLogger.apiResponse('/api/contractors/profile/verification', 'GET', 200, duration);
      
      res.json({
        success: true,
        data: verificationStatus,
        metadata: {
          timestamp: new Date(),
          request_id: req.requestId,
          version: '1.0.0'
        }
      } as ApiResponse<ContractorVerificationStatus>);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Failed to get contractor verification status', {
        user_id: req.user?.id,
        error: errorMessage,
        duration
      });
      
      performanceLogger.apiResponse('/api/contractors/profile/verification', 'GET', 500, duration);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: errorMessage,
          timestamp: new Date()
        }
      } as ApiResponse<null>);
    }
  };

  /**
   * Submit contractor for verification review
   * POST /api/contractors/profile/verification/submit
   */
  submitForVerification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const startTime = Date.now();
    
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required',
            timestamp: new Date()
          }
        });
        return;
      }
      
      // Get contractor by user ID first
      const contractor = await this.contractorService.getContractorByUserId(userId);
      if (!contractor) {
        res.status(404).json({
          success: false,
          error: {
            code: 'CONTRACTOR_NOT_FOUND',
            message: 'Contractor profile not found',
            timestamp: new Date()
          }
        });
        return;
      }
      
      const success = await this.verificationService.submitForReview(contractor.id, userId);
      
      const duration = Date.now() - startTime;
      performanceLogger.apiResponse('/api/contractors/profile/verification/submit', 'POST', 200, duration);
      
      res.json({
        success: true,
        data: { submitted: success },
        message: 'Contractor profile submitted for verification review',
        metadata: {
          timestamp: new Date(),
          request_id: req.requestId,
          version: '1.0.0'
        }
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Failed to submit contractor for verification', {
        user_id: req.user?.id,
        error: errorMessage,
        duration
      });
      
      performanceLogger.apiResponse('/api/contractors/profile/verification/submit', 'POST', 500, duration);
      
      let statusCode = 500;
      let errorCode = 'INTERNAL_ERROR';
      
      if (errorMessage.includes('All required documents')) {
        statusCode = 400;
        errorCode = 'MISSING_DOCUMENTS';
      }
      
      res.status(statusCode).json({
        success: false,
        error: {
          code: errorCode,
          message: errorMessage,
          timestamp: new Date()
        }
      });
    }
  };

  /**
   * Get all contractors for admin dashboard (Admin function)
   * GET /api/contractors/admin/contractors
   */
  getContractorsForAdmin = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const startTime = Date.now();
    
    try {
      // Check admin permissions OR service-to-service call
      const isServiceCall = req.headers['x-service'] === 'admin-service';
      if (!isServiceCall && !req.user?.isAdmin) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Admin access required',
            timestamp: new Date()
          }
        });
        return;
      }
      
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;
      
      logger.info('Admin fetching contractors list', {
        admin_id: req.user?.id || 'service-call',
        limit,
        offset
      });
      
      // Fetch contractors from service with admin privileges
      const contractors = await this.contractorService.getContractorsForAdmin(limit, offset);
      
      const duration = Date.now() - startTime;
      performanceLogger.apiResponse('/api/contractors/admin/contractors', 'GET', 200, duration);
      
      logger.info('Admin contractors list retrieved successfully', {
        admin_id: req.user?.id || 'service-call',
        contractors_count: contractors.length,
        duration
      });
      
      res.json({
        success: true,
        data: contractors,
        metadata: {
          timestamp: new Date(),
          request_id: req.requestId,
          version: '1.0.0',
          total_count: contractors.length,
          limit,
          offset
        }
      } as ApiResponse<typeof contractors>);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Failed to get contractors for admin', {
        admin_id: req.user?.id,
        error: errorMessage,
        duration
      });
      
      performanceLogger.apiResponse('/api/contractors/admin/contractors', 'GET', 500, duration);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: errorMessage,
          timestamp: new Date()
        }
      } as ApiResponse<null>);
    }
  };

  /**
   * Get contractor verification status by ID (Admin function)
   * GET /api/contractors/:id/verification
   */
  getContractorVerificationById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const startTime = Date.now();
    
    try {
      // Check admin permissions
      if (!req.user?.isAdmin) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Admin access required',
            timestamp: new Date()
          }
        });
        return;
      }
      
      const contractorId = req.params.id;
      
      if (!contractorId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'Contractor ID is required',
            timestamp: new Date()
          }
        });
        return;
      }
      
      const verificationStatus = await this.verificationService.getVerificationStatus(contractorId);
      
      const duration = Date.now() - startTime;
      performanceLogger.apiResponse(`/api/contractors/${contractorId}/verification`, 'GET', 200, duration);
      
      res.json({
        success: true,
        data: verificationStatus,
        metadata: {
          timestamp: new Date(),
          request_id: req.requestId,
          version: '1.0.0'
        }
      } as ApiResponse<ContractorVerificationStatus>);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Failed to get contractor verification by ID', {
        contractor_id: req.params.id,
        admin_id: req.user?.id,
        error: errorMessage,
        duration
      });
      
      performanceLogger.apiResponse(`/api/contractors/${req.params.id}/verification`, 'GET', 500, duration);
      
      let statusCode = 500;
      let errorCode = 'INTERNAL_ERROR';
      
      if (errorMessage.includes('not found')) {
        statusCode = 404;
        errorCode = 'CONTRACTOR_NOT_FOUND';
      }
      
      res.status(statusCode).json({
        success: false,
        error: {
          code: errorCode,
          message: errorMessage,
          timestamp: new Date()
        }
      } as ApiResponse<null>);
    }
  };

  /**
   * Health check endpoint
   * GET /api/contractors/health
   */
  healthCheck = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      res.json({
        success: true,
        data: {
          service: 'contractor-service',
          status: 'healthy',
          timestamp: new Date(),
          version: '1.0.0'
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'HEALTH_CHECK_FAILED',
          message: 'Service health check failed',
          timestamp: new Date()
        }
      });
    }
  };

  /**
   * Update contractor preferences
   * PUT /api/contractors/preferences
   */
  updatePreferences = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const startTime = Date.now();
    
    try {
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required',
            timestamp: new Date()
          }
        });
        return;
      }

      const { preferred_language, email_notifications, sms_notifications, marketing_consent } = req.body;

      // Prepare preferences data
      const preferencesData: any = {};
      
      if (preferred_language !== undefined) preferencesData.preferred_language = preferred_language;
      if (email_notifications !== undefined) preferencesData.email_notifications = email_notifications;
      if (sms_notifications !== undefined) preferencesData.sms_notifications = sms_notifications;
      if (marketing_consent !== undefined) preferencesData.marketing_consent = marketing_consent;

      if (Object.keys(preferencesData).length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'No valid preferences to update',
            timestamp: new Date()
          }
        });
        return;
      }

      // Update preferences
      const updatedContractor = await this.contractorService.updateContractorProfile(
        req.user.id,
        preferencesData,
        { ip_address: req.ip, user_agent: req.get('User-Agent') }
      );

      const duration = Date.now() - startTime;
      performanceLogger.apiResponse('/api/contractors/preferences', 'PUT', 200, duration);

      res.json({
        success: true,
        data: updatedContractor,
        message: 'Preferences updated successfully',
        metadata: {
          timestamp: new Date(),
          request_id: req.requestId,
          version: '1.0.0'
        }
      } as ApiResponse<typeof updatedContractor>);

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Failed to update contractor preferences', {
        user_id: req.user?.id,
        error: errorMessage,
        duration
      });
      
      performanceLogger.apiResponse('/api/contractors/preferences', 'PUT', 500, duration);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: errorMessage,
          timestamp: new Date()
        }
      } as ApiResponse<null>);
    }
  };
}