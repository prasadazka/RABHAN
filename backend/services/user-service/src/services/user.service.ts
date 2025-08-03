import { UserModel } from '../models/user.model';
import {
  UserProfile,
  CreateUserProfileDTO,
  UpdateUserProfileDTO,
  BNPLEligibility,
  UserDocument,
  NotFoundError,
  ValidationError,
  PropertyType,
  PropertyOwnership,
  ElectricityConsumptionRange,
  PreferredLanguage
} from '../types';
import { CacheService } from './cache.service';
import { AuthService } from './auth.service';
import { logger } from '../utils/logger';
import { verificationEvents, ProfileCompletionEvent } from '../../../../shared/events/verification.events';
import { verificationManager } from '../../../../shared/services/verification-manager.service';

export class UserService {
  private userModel: UserModel;
  private cacheService: CacheService;
  private authService: AuthService;

  constructor() {
    this.userModel = new UserModel();
    this.cacheService = new CacheService();
    this.authService = new AuthService();
    
    // Initialize verification manager to handle events
    const manager = verificationManager;
  }

  async createProfile(data: CreateUserProfileDTO, authToken: string): Promise<UserProfile> {
    try {
      const authUser = await this.authService.verifyUser(data.userId, authToken);
      if (!authUser) {
        throw new ValidationError('Invalid user ID or authentication');
      }

      this.validateSaudiData(data);
      const profile = await this.userModel.createProfile(data);
      await this.cacheService.setUserProfile(profile.userId, profile);
      await this.userModel.logActivity(
        profile.userId,
        'PROFILE_CREATED',
        { profileId: profile.id }
      );

      logger.info('User profile created successfully', {
        userId: profile.userId,
        profileId: profile.id
      });

      return profile;
    } catch (error) {
      logger.error('Failed to create user profile', error);
      throw error;
    }
  }

  // Create user profile during registration (no auth verification)
  async createRegistrationProfile(data: CreateUserProfileDTO): Promise<UserProfile> {
    try {
      // Skip auth verification during registration
      
      // Validate Saudi-specific data
      this.validateSaudiData(data);

      // Create profile
      const profile = await this.userModel.createProfile(data);

      // Cache the profile
      await this.cacheService.setUserProfile(profile.userId, profile);

      // Log activity
      await this.userModel.logActivity(
        profile.userId,
        'PROFILE_CREATED',
        { profileId: profile.id }
      );

      logger.info('Registration profile created successfully', {
        userId: profile.userId,
        profileId: profile.id
      });

      return profile;
    } catch (error) {
      logger.error('Failed to create registration profile', error);
      throw error;
    }
  }

  // Get user profile
  async getProfile(userId: string): Promise<UserProfile | null> {
    try {
      // Check cache first
      const cached = await this.cacheService.getUserProfile(userId);
      if (cached) {
        return cached;
      }

      // Get from database
      const profile = await this.userModel.getProfileByUserId(userId);
      if (!profile) {
        // Return null instead of throwing error - profile doesn't exist yet
        logger.info('Profile not found for user, returning null', { userId });
        return null;
      }

      // Cache the profile
      await this.cacheService.setUserProfile(userId, profile);

      return profile;
    } catch (error) {
      logger.error('Failed to get user profile', error);
      throw error;
    }
  }

  // Get user profile with lazy creation
  async getProfileWithLazyCreation(
    userId: string,
    authToken?: string
  ): Promise<UserProfile> {
    try {
      // First try to get existing profile
      const existingProfile = await this.getProfile(userId);
      if (existingProfile) {
        logger.info('Found existing user profile', { userId });
        return existingProfile;
      }

      // Profile doesn't exist, create a default one
      logger.info('Creating default user profile for lazy creation', { userId });

      let userInfo: any = null;
      
      // Try to get user info from auth service if token is provided
      if (authToken) {
        try {
          console.log('🔍 Calling auth service to get user info for:', userId);
          userInfo = await this.authService.getUserById(userId, authToken);
          console.log('🔍 Auth service returned user info:', userInfo);
          logger.info('Retrieved user info from auth service', { 
            userId, 
            hasUserInfo: !!userInfo,
            firstName: userInfo?.first_name,
            lastName: userInfo?.last_name
          });
        } catch (error) {
          console.log('❌ Failed to get user info from auth service:', error.message);
          logger.warn('Failed to get user info from auth service, using defaults', { userId, error });
        }
      } else {
        console.log('⚠️ No auth token provided for lazy profile creation');
      }

      const createData: CreateUserProfileDTO = {
        userId,
        firstName: userInfo?.first_name || userInfo?.firstName || 'User',
        lastName: userInfo?.last_name || userInfo?.lastName || 'Profile',
        region: 'riyadh',
        city: 'Riyadh',
        district: 'Unknown',
        streetAddress: 'Unknown',
        postalCode: '11111',
        propertyType: PropertyType.VILLA,
        propertyOwnership: PropertyOwnership.OWNED,
        roofSize: 50,
        gpsLatitude: 24.7136,
        gpsLongitude: 46.6753,
        electricityConsumption: ElectricityConsumptionRange.RANGE_0_200,
        electricityMeterNumber: 'METER000001',
        preferredLanguage: PreferredLanguage.ARABIC,
        emailNotifications: true,
        smsNotifications: true,
        marketingConsent: false
      };

      const profile = await this.userModel.createProfile(createData);
      await this.cacheService.setUserProfile(userId, profile);
      
      // Log activity
      await this.userModel.logActivity(
        userId,
        'PROFILE_CREATED_LAZY',
        { source: 'lazy_creation', hasAuthInfo: !!userInfo },
      );

      logger.info('Lazy user profile created successfully', {
        userId,
        profileId: profile.id,
        firstName: profile.firstName,
        lastName: profile.lastName
      });

      return profile;
    } catch (error) {
      logger.error('Failed to get/create user profile with lazy creation', { userId, error });
      throw error;
    }
  }

  // Update user profile
  async updateProfile(
    userId: string,
    data: UpdateUserProfileDTO,
    ipAddress?: string,
    userAgent?: string
  ): Promise<UserProfile> {
    try {
      // Validate update data
      if (data.postalCode || data.city || data.region) {
        this.validateSaudiData(data as any);
      }

      // Check if profile exists
      const existingProfile = await this.userModel.getProfileByUserId(userId);
      
      let profile: UserProfile;
      
      if (!existingProfile) {
        // Profile doesn't exist, create it with the provided data
        logger.info('Profile not found, creating new profile for user', { userId });
        
        // Prepare create data with required fields
        const createData: CreateUserProfileDTO = {
          userId,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          region: data.region || 'riyadh',  // Default to Riyadh
          city: data.city || 'Riyadh',
          district: data.district || 'Unknown',
          streetAddress: data.streetAddress || 'Unknown',
          postalCode: data.postalCode || '11111',  // Default Saudi postal code
          propertyType: data.propertyType || PropertyType.VILLA,
          propertyOwnership: data.propertyOwnership || PropertyOwnership.OWNED,
          roofSize: data.roofSize || 50,  // Set minimum valid roof size (50 sqm)
          gpsLatitude: data.gpsLatitude || 24.7136,  // Default to Riyadh coordinates
          gpsLongitude: data.gpsLongitude || 46.6753,
          electricityConsumption: data.electricityConsumption || ElectricityConsumptionRange.RANGE_0_200,
          electricityMeterNumber: data.electricityMeterNumber || 'METER000001',
          preferredLanguage: data.preferredLanguage || PreferredLanguage.ARABIC,
          emailNotifications: data.emailNotifications ?? true,
          smsNotifications: data.smsNotifications ?? true,
          marketingConsent: data.marketingConsent ?? false,
          // Include employment fields if provided
          ...(data.employmentStatus && { employmentStatus: data.employmentStatus }),
          ...(data.employerName && { employerName: data.employerName }),
          ...(data.jobTitle && { jobTitle: data.jobTitle }),
          ...(data.monthlyIncome && { monthlyIncome: data.monthlyIncome }),
          ...(data.yearsEmployed && { yearsEmployed: data.yearsEmployed })
        };
        
        profile = await this.userModel.createProfile(createData);
        
        // Log activity
        await this.userModel.logActivity(
          userId,
          'PROFILE_CREATED_ON_UPDATE',
          { initialData: Object.keys(data) },
          ipAddress,
          userAgent
        );
      } else {
        // Profile exists, update it
        profile = await this.userModel.updateProfile(userId, data);
        
        // Log activity
        await this.userModel.logActivity(
          userId,
          'PROFILE_UPDATED',
          { changes: Object.keys(data) },
          ipAddress,
          userAgent
        );
      }

      // Invalidate cache and set fresh data
      await this.cacheService.invalidateUserProfile(userId);
      
      // Immediately cache the updated profile to prevent race conditions
      await this.cacheService.setUserProfile(userId, profile);

      logger.info('User profile updated successfully', {
        userId: profile.userId,
        fieldsUpdated: Object.keys(data).length,
        created: !existingProfile
      });

      // Emit profile completion event for verification system
      try {
        await this.emitProfileCompletionEvent(userId, profile);
      } catch (error) {
        logger.warn('Failed to emit profile completion event', {
          userId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        // Don't fail the profile update if event emission fails
      }

      return profile;
    } catch (error) {
      logger.error('Failed to update user profile', error);
      throw error;
    }
  }

  // Check BNPL eligibility
  async checkBNPLEligibility(userId: string): Promise<BNPLEligibility> {
    try {
      // Check cache first
      const cached = await this.cacheService.getBNPLEligibility(userId);
      if (cached) {
        return cached;
      }

      // Ensure profile exists and is complete
      const profile = await this.getProfile(userId);
      if (!profile.profileCompleted) {
        return {
          eligible: false,
          maxAmount: 0,
          riskScore: 1,
          reason: 'Profile incomplete'
        };
      }

      // Check eligibility
      const eligibility = await this.userModel.checkBNPLEligibility(userId);

      // Cache the result for 1 hour
      await this.cacheService.setBNPLEligibility(userId, eligibility, 3600);

      // Log activity
      await this.userModel.logActivity(
        userId,
        'BNPL_ELIGIBILITY_CHECKED',
        {
          eligible: eligibility.eligible,
          maxAmount: eligibility.maxAmount
        }
      );

      return eligibility;
    } catch (error) {
      logger.error('Failed to check BNPL eligibility', error);
      throw error;
    }
  }

  // Get user documents
  async getUserDocuments(userId: string): Promise<UserDocument[]> {
    try {
      return await this.userModel.getUserDocuments(userId);
    } catch (error) {
      logger.error('Failed to get user documents', error);
      throw error;
    }
  }

  // Update user verification status
  async updateVerificationStatus(
    userId: string, 
    status: 'not_verified' | 'pending' | 'verified' | 'rejected'
  ): Promise<void> {
    try {
      logger.info('Updating user verification status', { userId, status });
      await this.userModel.updateVerificationStatus(userId, status);
      
      // Clear cache to ensure fresh data on next request
      await this.cacheService.delete(`user:profile:${userId}`);
      await this.cacheService.delete(`user:verification:${userId}`);
      
      logger.info('User verification status updated successfully', { userId, status });
    } catch (error) {
      logger.error(`Failed to update verification status: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  // Emit profile completion event for verification system
  private async emitProfileCompletionEvent(
    userId: string,
    profile: UserProfile
  ): Promise<void> {
    try {
      const profileCompletionEvent: ProfileCompletionEvent = {
        userId,
        profileCompleted: profile.profileCompleted,
        completionPercentage: profile.profileCompletionPercentage,
        timestamp: new Date()
      };

      logger.info('Emitting profile completion event', {
        userId,
        profileCompleted: profile.profileCompleted,
        completionPercentage: profile.profileCompletionPercentage
      });

      verificationEvents.emit('profile:completed', profileCompletionEvent);
    } catch (error) {
      logger.error('Failed to emit profile completion event', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  // Check if all required documents are uploaded by calling document service
  private async checkDocumentsCompletion(userId: string): Promise<boolean> {
    try {
      const axios = require('axios');
      const documentServiceUrl = process.env.DOCUMENT_SERVICE_URL || 'http://127.0.0.1:3003';
      
      // Get user documents from document service
      const response = await axios.get(
        `${documentServiceUrl}/documents?userId=${userId}&limit=100`,
        {
          headers: {
            'Content-Type': 'application/json',
            // Add service-to-service authentication if needed
          },
          timeout: 5000
        }
      );

      if (response.data.success && response.data.documents) {
        const documents = response.data.documents;
        const requiredCategories = ['national_id_front', 'national_id_back', 'proof_of_address'];
        
        // Check if all required documents are uploaded
        const uploadedCategories = documents
          .filter((doc: any) => doc.document_status === 'completed' || doc.approval_status === 'approved')
          .map((doc: any) => doc.category_id);

        const allDocumentsUploaded = requiredCategories.every(category => 
          uploadedCategories.includes(category)
        );

        logger.info('Documents completion check from document service', {
          userId,
          requiredCategories,
          uploadedCategories,
          allDocumentsUploaded
        });

        return allDocumentsUploaded;
      } else {
        logger.warn('Failed to get documents from document service', {
          userId,
          response: response.data
        });
        return false;
      }
    } catch (error) {
      logger.error('Failed to check documents completion from document service', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false; // Assume not completed if we can't check
    }
  }

  // Update document verification status
  async updateDocumentStatus(
    userId: string,
    documentType: string,
    status: 'verified' | 'rejected',
    rejectionReason?: string,
    verifiedBy?: string
  ): Promise<UserDocument> {
    try {
      const document = await this.userModel.updateDocumentStatus(
        userId,
        documentType,
        status,
        rejectionReason
      );

      // Invalidate BNPL eligibility cache as document status affects it
      await this.cacheService.invalidateBNPLEligibility(userId);

      // Log activity
      await this.userModel.logActivity(
        userId,
        'DOCUMENT_STATUS_UPDATED',
        {
          documentType,
          status,
          verifiedBy,
          rejectionReason
        }
      );

      // Check if all required documents are verified
      const documents = await this.getUserDocuments(userId);
      const requiredDocs = ['national_id_front', 'national_id_back', 'proof_of_address'];
      const allVerified = requiredDocs.every(docType =>
        documents.some(doc => doc.documentType === docType && doc.verificationStatus === 'verified')
      );

      if (allVerified) {
        // Update profile completion
        await this.userModel.updateProfileCompletion(userId);
      }

      return document;
    } catch (error) {
      logger.error('Failed to update document status', error);
      throw error;
    }
  }

  // Search users (for admin)
  async searchUsers(filters: any, pagination: any): Promise<any> {
    try {
      // This would be implemented with proper search query
      // For now, returning placeholder
      return {
        users: [],
        pagination: {
          page: pagination.page || 1,
          limit: pagination.limit || 20,
          total: 0,
          totalPages: 0
        }
      };
    } catch (error) {
      logger.error('Failed to search users', error);
      throw error;
    }
  }

  // Private methods
  private validateSaudiData(data: Partial<CreateUserProfileDTO>): void {
    // Validate postal code (5 digits)
    if (data.postalCode && !/^\d{5}$/.test(data.postalCode)) {
      throw new ValidationError('Invalid postal code. Must be 5 digits');
    }

    // Validate Saudi regions
    const saudiRegions = [
      'riyadh', 'makkah', 'eastern', 'asir', 'tabuk', 'qassim',
      'hail', 'northern', 'jazan', 'najran', 'bahah', 'jouf', 'madinah'
    ];
    
    if (data.region && !saudiRegions.includes(data.region.toLowerCase())) {
      throw new ValidationError('Invalid Saudi region');
    }

    // GPS coordinates validation removed - allow worldwide coordinates

    // Validate meter number format
    if (data.electricityMeterNumber && !/^[A-Z0-9]{6,15}$/.test(data.electricityMeterNumber)) {
      throw new ValidationError('Invalid electricity meter number format');
    }
  }
}