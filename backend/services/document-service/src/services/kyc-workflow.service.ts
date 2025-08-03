import { DatabaseConfig } from '../config/database.config';
import { logger, SAMALogger } from '../utils/logger';

export enum KYCStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  PENDING_REVIEW = 'pending_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  REQUIRES_REVISION = 'requires_revision'
}

export enum UserRole {
  USER = 'customer',
  CONTRACTOR = 'contractor'
}

export interface KYCRequirement {
  categoryId: string;
  categoryName: string;
  required: boolean;
  uploaded: boolean;
  approved: boolean;
  documentId?: string;
}

export interface KYCWorkflowStatus {
  userId: string;
  userRole: UserRole;
  status: KYCStatus;
  completionPercentage: number;
  requirements: KYCRequirement[];
  lastUpdated: Date;
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
}

export class KYCWorkflowService {
  private static instance: KYCWorkflowService;
  private database: DatabaseConfig;

  // KYC document requirements by role - MVP Phase 1
  private static readonly USER_KYC_REQUIREMENTS = [
    'national_id_front',
    'national_id_back',
    'proof_of_address'
  ];

  private static readonly CONTRACTOR_KYC_REQUIREMENTS = [
    'commercial_registration',
    'vat_certificate',
    'municipal_license',
    'chamber_membership',
    'insurance_certificate',
    'bank_account_proof'
  ];

  private constructor() {
    this.database = DatabaseConfig.getInstance();
  }

  public static getInstance(): KYCWorkflowService {
    if (!KYCWorkflowService.instance) {
      KYCWorkflowService.instance = new KYCWorkflowService();
    }
    return KYCWorkflowService.instance;
  }

  /**
   * Get KYC status for a user
   */
  public async getKYCStatus(userId: string, userRole: UserRole): Promise<KYCWorkflowStatus> {
    try {
      logger.info('Getting KYC status', { userId, userRole });

      // Get required document categories for the user role
      const requiredCategories = await this.getRequiredCategories(userRole);
      
      // Get user's uploaded documents
      const uploadedDocuments = await this.getUserDocuments(userId);
      
      // Build requirements status
      const requirements: KYCRequirement[] = requiredCategories.map(category => {
        const uploadedDoc = uploadedDocuments.find(doc => doc.category_name === category.name);
        
        return {
          categoryId: category.id,
          categoryName: category.name,
          required: true,
          uploaded: !!uploadedDoc,
          approved: uploadedDoc?.approval_status === 'approved',
          documentId: uploadedDoc?.id
        };
      });

      // Calculate completion percentage and overall status
      const totalRequired = requirements.length;
      const uploaded = requirements.filter(req => req.uploaded).length;
      const approved = requirements.filter(req => req.approved).length;
      
      const completionPercentage = Math.round((uploaded / totalRequired) * 100);
      
      let status: KYCStatus;
      if (approved === totalRequired) {
        status = KYCStatus.APPROVED;
      } else if (uploaded === totalRequired) {
        status = KYCStatus.PENDING_REVIEW;
      } else if (uploaded > 0) {
        status = KYCStatus.IN_PROGRESS;
      } else {
        status = KYCStatus.NOT_STARTED;
      }

      const kycStatus: KYCWorkflowStatus = {
        userId,
        userRole,
        status,
        completionPercentage,
        requirements,
        lastUpdated: new Date()
      };

      logger.info('KYC status retrieved', {
        userId,
        userRole,
        status,
        completionPercentage,
        totalRequired,
        uploaded,
        approved
      });

      return kycStatus;
    } catch (error) {
      logger.error('Failed to get KYC status', {
        userId,
        userRole,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw new Error('Failed to retrieve KYC status');
    }
  }

  /**
   * Submit KYC for admin review
   */
  public async submitForReview(userId: string, userRole: UserRole): Promise<boolean> {
    try {
      logger.info('Submitting KYC for review', { userId, userRole });

      const kycStatus = await this.getKYCStatus(userId, userRole);
      
      // Check if all required documents are uploaded
      const allUploaded = kycStatus.requirements.every(req => req.uploaded);
      
      if (!allUploaded) {
        throw new Error('All required documents must be uploaded before submission');
      }

      // Update all documents to pending review status
      await this.updateDocumentsStatus(userId, 'under_review');

      // Log SAMA compliance event
      SAMALogger.logDocumentEvent(
        'KYC_SUBMITTED',
        null,
        userId,
        {
          userRole,
          requirements: kycStatus.requirements.length,
          completionPercentage: kycStatus.completionPercentage
        }
      );

      logger.info('KYC submitted for review successfully', { userId, userRole });
      
      return true;
    } catch (error) {
      logger.error('Failed to submit KYC for review', {
        userId,
        userRole,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw error;
    }
  }

  /**
   * Approve user's KYC (Admin function)
   */
  public async approveKYC(
    userId: string, 
    userRole: UserRole, 
    approvedBy: string, 
    notes?: string
  ): Promise<boolean> {
    try {
      logger.info('Approving KYC', { userId, userRole, approvedBy });

      // Update all user documents to approved status
      const query = `
        UPDATE documents 
        SET approval_status = 'approved',
            approved_by = $1,
            approved_at = CURRENT_TIMESTAMP,
            approval_notes = $2,
            sama_audit_log = sama_audit_log || $3::jsonb
        WHERE user_id = $4 AND approval_status = 'under_review'
      `;

      const auditEntry = JSON.stringify([{
        event: 'KYC_APPROVED',
        timestamp: new Date().toISOString(),
        approved_by: approvedBy,
        notes: notes || ''
      }]);

      await this.database.query(query, [approvedBy, notes, auditEntry, userId]);

      // Log SAMA compliance event
      SAMALogger.logDocumentEvent(
        'KYC_APPROVED',
        null,
        userId,
        {
          userRole,
          approvedBy,
          notes,
          approvalTimestamp: new Date().toISOString()
        }
      );

      logger.info('KYC approved successfully', { userId, userRole, approvedBy });
      
      return true;
    } catch (error) {
      logger.error('Failed to approve KYC', {
        userId,
        userRole,
        approvedBy,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw new Error('Failed to approve KYC');
    }
  }

  /**
   * Reject user's KYC (Admin function)
   */
  public async rejectKYC(
    userId: string, 
    userRole: UserRole, 
    rejectedBy: string, 
    reason: string
  ): Promise<boolean> {
    try {
      logger.info('Rejecting KYC', { userId, userRole, rejectedBy, reason });

      // Update documents to rejected status
      const query = `
        UPDATE documents 
        SET approval_status = 'rejected',
            approved_by = $1,
            approved_at = CURRENT_TIMESTAMP,
            rejection_reason = $2,
            sama_audit_log = sama_audit_log || $3::jsonb
        WHERE user_id = $4 AND approval_status = 'under_review'
      `;

      const auditEntry = JSON.stringify([{
        event: 'KYC_REJECTED',
        timestamp: new Date().toISOString(),
        rejected_by: rejectedBy,
        reason: reason
      }]);

      await this.database.query(query, [rejectedBy, reason, auditEntry, userId]);

      // Log SAMA compliance event
      SAMALogger.logDocumentEvent(
        'KYC_REJECTED',
        null,
        userId,
        {
          userRole,
          rejectedBy,
          reason,
          rejectionTimestamp: new Date().toISOString()
        }
      );

      logger.info('KYC rejected', { userId, userRole, rejectedBy, reason });
      
      return true;
    } catch (error) {
      logger.error('Failed to reject KYC', {
        userId,
        userRole,
        rejectedBy,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw new Error('Failed to reject KYC');
    }
  }

  /**
   * Get pending KYC reviews for admin
   */
  public async getPendingReviews(userRole?: UserRole): Promise<any[]> {
    try {
      let query = `
        SELECT DISTINCT 
          d.user_id,
          COUNT(*) as total_documents,
          COUNT(*) FILTER (WHERE d.approval_status = 'under_review') as pending_documents,
          MAX(d.created_at) as last_upload,
          dc.required_for_role as user_role
        FROM documents d
        JOIN document_categories dc ON d.category_id = dc.id
        WHERE d.approval_status = 'under_review'
      `;
      
      const params: any[] = [];
      
      if (userRole) {
        query += ` AND dc.required_for_role = $1`;
        params.push(userRole);
      }
      
      query += `
        GROUP BY d.user_id, dc.required_for_role
        HAVING COUNT(*) FILTER (WHERE d.approval_status = 'under_review') > 0
        ORDER BY last_upload DESC
      `;

      const result = await this.database.query(query, params);
      
      logger.info('Retrieved pending KYC reviews', {
        count: result.rows.length,
        userRole: userRole || 'all'
      });

      return result.rows;
    } catch (error) {
      logger.error('Failed to get pending reviews', {
        userRole,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw new Error('Failed to retrieve pending reviews');
    }
  }

  // Private helper methods

  private async getRequiredCategories(userRole: UserRole): Promise<any[]> {
    const query = `
      SELECT id, name, description, required_for_role
      FROM document_categories 
      WHERE required_for_role = $1 AND is_active = true
      ORDER BY name
    `;
    
    const result = await this.database.query(query, [userRole]);
    return result.rows;
  }

  private async getUserDocuments(userId: string): Promise<any[]> {
    const query = `
      SELECT 
        d.id, d.user_id, d.category_id, d.original_filename,
        d.approval_status, d.status, d.created_at,
        dc.name as category_name, dc.required_for_role
      FROM documents d
      JOIN document_categories dc ON d.category_id = dc.id
      WHERE d.user_id = $1 AND d.status != 'archived'
      ORDER BY d.created_at DESC
    `;
    
    const result = await this.database.query(query, [userId]);
    return result.rows;
  }

  private async updateDocumentsStatus(userId: string, status: string): Promise<void> {
    const query = `
      UPDATE documents 
      SET approval_status = $1,
          sama_audit_log = sama_audit_log || $2::jsonb
      WHERE user_id = $3 AND status != 'archived'
    `;

    const auditEntry = JSON.stringify([{
      event: 'STATUS_UPDATE',
      timestamp: new Date().toISOString(),
      new_status: status,
      user_id: userId
    }]);

    await this.database.query(query, [status, auditEntry, userId]);
  }

  /**
   * Get service health status
   */
  public getHealthStatus(): {
    status: 'healthy' | 'unhealthy';
    details: {
      databaseConnection: boolean;
      kycRequirements: {
        user: number;
        contractor: number;
      };
    };
  } {
    try {
      return {
        status: 'healthy',
        details: {
          databaseConnection: true,
          kycRequirements: {
            user: KYCWorkflowService.USER_KYC_REQUIREMENTS.length,
            contractor: KYCWorkflowService.CONTRACTOR_KYC_REQUIREMENTS.length
          }
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          databaseConnection: false,
          kycRequirements: {
            user: 0,
            contractor: 0
          }
        }
      };
    }
  }
}