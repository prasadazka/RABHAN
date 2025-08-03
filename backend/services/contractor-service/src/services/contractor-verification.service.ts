import { pool, executeQuery } from '../config/database.config';
import { 
  ContractorProfile,
  ContractorVerificationStatus,
  ContractorDocumentRequirement,
  ContractorDocument
} from '../types/contractor.types';
import { logger, auditLogger } from '../utils/logger';
import axios from 'axios';
import { config } from '../config/environment.config';

export class ContractorVerificationService {
  
  // Required document categories for contractor verification
  private static readonly REQUIRED_DOCUMENTS = [
    'commercial_registration',
    'vat_certificate', 
    'municipal_license',
    'chamber_membership',
    'insurance_certificate',
    'bank_account_proof'
  ];

  /**
   * Get contractor verification status (Profile + Documents)
   * Using same method as user verification
   */
  async getVerificationStatus(contractorId: string): Promise<ContractorVerificationStatus> {
    try {
      logger.info('Getting contractor verification status', { contractorId });

      // Get contractor profile
      const contractor = await this.getContractorById(contractorId);
      if (!contractor) {
        throw new Error('Contractor not found');
      }

      // Calculate profile completion using existing method
      const profileCompletion = this.calculateProfileCompletion(contractor);

      // Get required document categories from document service
      const requiredDocuments = await this.getRequiredDocumentCategories();

      // Get contractor's uploaded documents from document service
      const uploadedDocuments = await this.getContractorDocuments(contractor.user_id);

      // Build document requirements status
      const documentRequirements: ContractorDocumentRequirement[] = requiredDocuments.map(category => {
        const uploadedDoc = uploadedDocuments.find(doc => doc.category_name === category.name);
        
        return {
          category_id: category.id,
          category_name: category.name,
          required: true,
          uploaded: !!uploadedDoc,
          approved: uploadedDoc?.approval_status === 'approved',
          document_id: uploadedDoc?.document_id
        };
      });

      // Calculate document completion percentage
      const totalRequired = documentRequirements.length;
      const uploaded = documentRequirements.filter(req => req.uploaded).length;
      const approved = documentRequirements.filter(req => req.approved).length;
      
      const documentCompletion = Math.round((uploaded / totalRequired) * 100);

      // Determine overall verification status using same logic as user verification
      // Map contractor.status to our verification status
      let verificationStatus: 'not_verified' | 'pending' | 'verified' | 'rejected';
      
      if (contractor.status === 'verified' || contractor.status === 'active') {
        verificationStatus = 'verified';
      } else if (contractor.status === 'verification' || contractor.status === 'pending') {
        // Check if profile and documents are complete for pending status
        if (profileCompletion >= 80 && uploaded === totalRequired) {
          verificationStatus = 'pending';
        } else {
          verificationStatus = 'not_verified';
        }
      } else if (contractor.status === 'rejected') {
        verificationStatus = 'rejected';
      } else {
        // For pending, documents_required, inactive, suspended
        if (profileCompletion >= 80 && approved === totalRequired) {
          verificationStatus = 'verified';
        } else if (profileCompletion >= 80 && uploaded === totalRequired) {
          verificationStatus = 'pending';
        } else {
          verificationStatus = 'not_verified';
        }
      }

      // Update contractor verification status in database
      await this.updateContractorVerificationStatus(contractorId, verificationStatus);

      const status: ContractorVerificationStatus = {
        contractor_id: contractorId,
        profile_completion: profileCompletion,
        document_completion: documentCompletion,
        verification_status: verificationStatus,
        required_documents: documentRequirements,
        completed_documents: uploadedDocuments,
        last_updated: new Date()
      };

      logger.info('Contractor verification status calculated', {
        contractorId,
        profileCompletion,
        documentCompletion,
        verificationStatus,
        totalRequired,
        uploaded,
        approved
      });

      return status;

    } catch (error) {
      logger.error('Failed to get contractor verification status', {
        contractorId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get contractor documents from document service
   */
  private async getContractorDocuments(userId: string): Promise<ContractorDocument[]> {
    try {
      const response = await axios.get(
        `${config.DOCUMENT_SERVICE_URL}/api/documents/user/${userId}`,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      if (response.data.success && response.data.data) {
        return response.data.data.map((doc: any) => ({
          id: doc.id,
          contractor_id: '', // Will be filled by caller
          category_id: doc.category_id,
          category_name: doc.category_name,
          document_id: doc.id,
          upload_status: doc.status,
          approval_status: doc.approval_status,
          uploaded_at: new Date(doc.created_at),
          verified_at: doc.approved_at ? new Date(doc.approved_at) : undefined,
          rejection_reason: doc.rejection_reason,
          created_at: new Date(doc.created_at),
          updated_at: new Date(doc.updated_at)
        }));
      }

      return [];
    } catch (error) {
      logger.warn('Failed to get contractor documents from document service', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return []; // Return empty array if document service is unavailable
    }
  }

  /**
   * Get required document categories for contractors
   */
  private async getRequiredDocumentCategories(): Promise<any[]> {
    try {
      const response = await axios.get(
        `${config.DOCUMENT_SERVICE_URL}/api/documents/categories?role=contractor`,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      // Fallback to static list if document service is unavailable
      return ContractorVerificationService.REQUIRED_DOCUMENTS.map((name, index) => ({
        id: `fallback-${index}`,
        name,
        description: `${name.replace(/_/g, ' ').toUpperCase()} document`,
        required_for_role: 'contractor'
      }));

    } catch (error) {
      logger.warn('Failed to get document categories, using fallback', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Return fallback categories
      return ContractorVerificationService.REQUIRED_DOCUMENTS.map((name, index) => ({
        id: `fallback-${index}`,
        name,
        description: `${name.replace(/_/g, ' ').toUpperCase()} document`,
        required_for_role: 'contractor'
      }));
    }
  }

  /**
   * Update contractor status in database (using existing status column)
   */
  private async updateContractorVerificationStatus(
    contractorId: string, 
    status: 'not_verified' | 'pending' | 'verified' | 'rejected'
  ): Promise<void> {
    try {
      // Map our verification status to contractor_status enum
      let contractorStatus: string;
      switch (status) {
        case 'verified':
          contractorStatus = 'verified';
          break;
        case 'pending':
          contractorStatus = 'verification';
          break;
        case 'rejected':
          contractorStatus = 'rejected';
          break;
        case 'not_verified':
        default:
          contractorStatus = 'documents_required';
          break;
      }
      
      const query = `
        UPDATE contractors 
        SET status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `;
      
      await executeQuery(query, [contractorStatus, contractorId], 'update_contractor_status');
      
      logger.info('Contractor status updated for verification', {
        contractorId,
        verificationStatus: status,
        contractorStatus
      });

    } catch (error) {
      logger.error('Failed to update contractor status', {
        contractorId,
        status,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      // Don't throw here - this is a secondary operation
    }
  }

  /**
   * Get contractor by ID (reuse from contractor service)
   */
  private async getContractorById(contractorId: string): Promise<ContractorProfile | null> {
    try {
      const query = `
        SELECT * FROM contractors 
        WHERE id = $1 AND deleted_at IS NULL
      `;
      
      const result = await executeQuery(query, [contractorId], 'get_contractor_by_id');
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapDatabaseRowToContractor(result.rows[0]);
      
    } catch (error) {
      logger.error('Failed to get contractor by ID', {
        contractorId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Calculate profile completion percentage (same logic as user service)
   */
  private calculateProfileCompletion(contractor: ContractorProfile): number {
    let completedFields = 0;
    let totalFields = 0;
    
    // Required fields for contractors
    const requiredFields = [
      'business_name', 'business_type', 'email', 'phone',
      'address_line1', 'city', 'region', 'service_categories'
    ];
    
    // Optional fields that boost completion
    const optionalFields = [
      'business_name_ar', 'commercial_registration', 'vat_number',
      'website', 'description', 'description_ar', 'established_year',
      'employee_count', 'years_experience'
    ];
    
    // Check required fields
    requiredFields.forEach(field => {
      totalFields++;
      const value = contractor[field as keyof ContractorProfile];
      if (value && (Array.isArray(value) ? value.length > 0 : true)) {
        completedFields++;
      }
    });
    
    // Check optional fields
    optionalFields.forEach(field => {
      totalFields++;
      const value = contractor[field as keyof ContractorProfile];
      if (value && (Array.isArray(value) ? value.length > 0 : true)) {
        completedFields++;
      }
    });
    
    return Math.round((completedFields / totalFields) * 100);
  }

  /**
   * Map database row to ContractorProfile (reuse from contractor service)
   */
  private mapDatabaseRowToContractor(row: any): ContractorProfile {
    return {
      id: row.id,
      user_id: row.user_id,
      business_name: row.business_name,
      business_name_ar: row.business_name_ar,
      business_type: row.business_type,
      commercial_registration: row.commercial_registration,
      vat_number: row.vat_number,
      email: row.email,
      phone: row.phone,
      whatsapp: row.whatsapp,
      website: row.website,
      address_line1: row.address_line1,
      address_line2: row.address_line2,
      city: row.city,
      region: row.region,
      postal_code: row.postal_code,
      country: row.country,
      established_year: row.established_year,
      employee_count: row.employee_count,
      description: row.description,
      description_ar: row.description_ar,
      service_categories: row.service_categories,
      service_areas: row.service_areas,
      years_experience: row.years_experience,
      contractor_type: row.contractor_type || 'full_solar_contractor',
      can_install: row.can_install || true,
      can_supply_only: row.can_supply_only || false,
      status: row.status,
      verification_level: row.verification_level,
      admin_verified_at: row.admin_verified_at,
      admin_verified_by: row.admin_verified_by,
      total_projects: row.total_projects,
      completed_projects: row.completed_projects,
      average_rating: parseFloat(row.average_rating) || 0,
      total_reviews: row.total_reviews,
      response_time_hours: row.response_time_hours,
      bank_account_verified: row.bank_account_verified,
      tax_clearance_verified: row.tax_clearance_verified,
      financial_standing_verified: row.financial_standing_verified,
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at,
      created_by: row.created_by,
      updated_by: row.updated_by,
      ip_address: row.ip_address,
      user_agent: row.user_agent
    };
  }

  /**
   * Submit contractor KYC for admin review
   */
  async submitForReview(contractorId: string, adminId?: string): Promise<boolean> {
    try {
      logger.info('Submitting contractor KYC for review', { contractorId });

      const verificationStatus = await this.getVerificationStatus(contractorId);
      
      // Check if all required documents are uploaded
      const allUploaded = verificationStatus.required_documents.every(req => req.uploaded);
      
      if (!allUploaded) {
        throw new Error('All required documents must be uploaded before submission');
      }

      // Update contractor status to verification (pending admin review)  
      await this.updateContractorVerificationStatus(contractorId, 'pending');

      // Create audit log entry
      auditLogger.verification(contractorId, 'kyc_submission', 'pending', adminId || 'system');

      logger.info('Contractor KYC submitted for review successfully', { contractorId });
      
      return true;
    } catch (error) {
      logger.error('Failed to submit contractor KYC for review', {
        contractorId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw error;
    }
  }
}