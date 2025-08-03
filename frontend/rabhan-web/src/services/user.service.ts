import { apiService, ApiResponse } from './api.service';

export interface UserProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  region: string;
  city: string;
  district?: string;
  streetAddress?: string;
  landmark?: string;
  postalCode: string;
  propertyType: string;
  propertyOwnership: string;
  roofSize: number;
  gpsLatitude: number;
  gpsLongitude: number;
  electricityConsumption: string;
  electricityMeterNumber: string;
  preferredLanguage?: string;
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  marketingConsent?: boolean;
  profileCompleted: boolean;
  profileCompletionPercentage: number;
  bnplEligible: boolean;
  bnplMaxAmount: number;
  verificationStatus?: 'not_verified' | 'pending' | 'verified' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export interface CreateProfileData {
  userId?: string;
  firstName: string;
  lastName: string;
  region: string;
  city: string;
  district?: string;
  streetAddress?: string;
  landmark?: string;
  postalCode: string;
  propertyType: string;
  propertyOwnership: string;
  roofSize: number;
  gpsLatitude: number;
  gpsLongitude: number;
  electricityConsumption: string;
  electricityMeterNumber: string;
  preferredLanguage?: string;
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  marketingConsent?: boolean;
}

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  region?: string;
  city?: string;
  district?: string;
  streetAddress?: string;
  landmark?: string;
  postalCode?: string;
  propertyType?: string;
  propertyOwnership?: string;
  roofSize?: number;
  gpsLatitude?: number;
  gpsLongitude?: number;
  electricityConsumption?: string;
  electricityMeterNumber?: string;
  preferredLanguage?: string;
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  marketingConsent?: boolean;
}

export interface BNPLEligibility {
  eligible: boolean;
  maxAmount: number;
  riskScore: number;
  reason: string;
  factors?: {
    profileCompletion: number;
    propertyType: string;
    ownership: string;
    electricityHistory: boolean;
    regionRisk: number;
  };
}

export interface UserDocument {
  id: string;
  userId: string;
  documentType: string;
  uploadStatus: 'pending' | 'uploaded' | 'failed';
  verificationStatus: 'pending' | 'verified' | 'rejected';
  rejectionReason?: string;
  uploadedAt?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

class UserService {
  // Profile Management
  public async createProfile(data: CreateProfileData): Promise<{ success: boolean; error?: string; profile?: UserProfile }> {
    try {
      console.log('👤 Creating user profile...', { 
        firstName: data.firstName, 
        lastName: data.lastName,
        city: data.city 
      });

      // Validate required fields
      this.validateProfileData(data);

      // Convert string numbers to actual numbers for GPS coordinates
      const profileData = {
        ...data,
        roofSize: Number(data.roofSize),
        gpsLatitude: Number(data.gpsLatitude),
        gpsLongitude: Number(data.gpsLongitude),
      };

      const response: ApiResponse<UserProfile> = await apiService.user.createRegistrationProfile(profileData);

      if (response.success && response.data) {
        console.log('✅ User profile created successfully');
        return { success: true, profile: response.data };
      } else {
        const error = response.error || 'Failed to create profile';
        console.error('❌ Profile creation failed:', error);
        return { success: false, error };
      }
    } catch (error: any) {
      console.error('❌ Profile creation error - Full details:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          data: error.config?.data
        }
      });
      
      // Check for specific error types
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        return { success: false, error: 'Request timeout - service may be overloaded' };
      }
      
      if (error.code === 'ERR_NETWORK') {
        return { success: false, error: 'Network error - please check your connection' };
      }
      
      const errorMessage = error.response?.data?.error || error.error || error.message || 'Failed to create profile';
      return { success: false, error: errorMessage };
    }
  }

  public async getProfile(userId?: string): Promise<{ success: boolean; error?: string; profile?: UserProfile }> {
    try {
      console.log('👤 Fetching user profile...', userId ? { userId } : { current: true });
      
      // DEBUG: Check if we have authentication token
      const token = apiService.getAccessToken();
      console.log('🔑 Auth token status:', {
        hasToken: !!token,
        tokenLength: token ? token.length : 0,
        tokenPreview: token ? token.substring(0, 20) + '...' : 'none'
      });

      const response: ApiResponse<UserProfile> = await apiService.user.getProfile(userId);

      if (response.success && response.data) {
        console.log('✅ User profile fetched successfully');
        return { success: true, profile: response.data };
      } else {
        const error = response.error || 'Failed to fetch profile';
        console.error('❌ Profile fetch failed:', error);
        return { success: false, error };
      }
    } catch (error: any) {
      const errorMessage = error.error || error.message || 'Failed to fetch profile';
      console.error('❌ Profile fetch error:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  public async updateProfile(userId?: string, updates?: UpdateProfileData): Promise<{ success: boolean; error?: string; profile?: UserProfile }> {
    try {
      console.log('👤 Updating user profile...', { userId: userId || 'current user', updates: Object.keys(updates || {}), fullUpdateData: updates });

      // Convert string numbers to actual numbers if present
      const updateData = { ...updates };
      if (updateData.roofSize) updateData.roofSize = Number(updateData.roofSize);
      if (updateData.gpsLatitude) updateData.gpsLatitude = Number(updateData.gpsLatitude);
      if (updateData.gpsLongitude) updateData.gpsLongitude = Number(updateData.gpsLongitude);
      
      // Ensure solar fields are properly typed and logged
      if (updateData.desiredSystemSize !== undefined) {
        updateData.desiredSystemSize = Number(updateData.desiredSystemSize);
        console.log('🌞 Processing desiredSystemSize:', updateData.desiredSystemSize);
      }
      if (updateData.budgetRange !== undefined) {
        console.log('🌞 Processing budgetRange:', updateData.budgetRange);
      }

      console.log('📡 Making API call to update profile with:', updateData);
      const response: ApiResponse<UserProfile> = await apiService.user.updateProfile(userId, updateData);

      if (response.success && response.data) {
        console.log('✅ User profile updated successfully');
        return { success: true, profile: response.data };
      } else {
        const error = response.error || 'Failed to update profile';
        console.error('❌ Profile update failed:', error);
        return { success: false, error };
      }
    } catch (error: any) {
      const errorMessage = error.error || error.message || 'Failed to update profile';
      console.error('❌ Profile update error:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  // BNPL Eligibility
  public async checkBNPLEligibility(userId?: string): Promise<{ success: boolean; error?: string; eligibility?: BNPLEligibility }> {
    try {
      console.log('💰 Checking BNPL eligibility...', userId ? { userId } : { current: true });

      const response: ApiResponse<BNPLEligibility> = await apiService.user.checkBNPLEligibility(userId);

      if (response.success && response.data) {
        console.log('✅ BNPL eligibility checked successfully', {
          eligible: response.data.eligible,
          maxAmount: response.data.maxAmount
        });
        return { success: true, eligibility: response.data };
      } else {
        const error = response.error || 'Failed to check BNPL eligibility';
        console.error('❌ BNPL eligibility check failed:', error);
        return { success: false, error };
      }
    } catch (error: any) {
      const errorMessage = error.error || error.message || 'Failed to check BNPL eligibility';
      console.error('❌ BNPL eligibility error:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  // Document Management
  public async getDocuments(userId?: string): Promise<{ success: boolean; error?: string; documents?: UserDocument[] }> {
    try {
      console.log('📄 Fetching user documents...', userId ? { userId } : { current: true });

      const response: ApiResponse<UserDocument[]> = await apiService.user.getDocuments(userId);

      if (response.success && response.data) {
        console.log('✅ User documents fetched successfully', { count: response.data.length });
        return { success: true, documents: response.data };
      } else {
        const error = response.error || 'Failed to fetch documents';
        console.error('❌ Documents fetch failed:', error);
        return { success: false, error };
      }
    } catch (error: any) {
      const errorMessage = error.error || error.message || 'Failed to fetch documents';
      console.error('❌ Documents fetch error:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  // Validation Methods
  private validateProfileData(data: CreateProfileData): void {
    const required = ['firstName', 'lastName', 'region', 'city', 'postalCode', 'propertyType', 'propertyOwnership', 'roofSize', 'gpsLatitude', 'gpsLongitude', 'electricityConsumption', 'electricityMeterNumber'];
    
    for (const field of required) {
      if (!data[field as keyof CreateProfileData]) {
        throw new Error(`${field} is required`);
      }
    }

    // Validate postal code format (5 digits for Saudi Arabia)
    if (!/^\d{5}$/.test(data.postalCode)) {
      throw new Error('Postal code must be 5 digits');
    }

    // GPS coordinates validation removed - allow worldwide coordinates

    // Validate roof size
    const roofSize = Number(data.roofSize);
    if (roofSize <= 0 || roofSize > 10000) {
      throw new Error('Roof size must be between 1 and 10,000 square meters');
    }

    // Validate Saudi regions
    const validRegions = ['riyadh', 'makkah', 'madinah', 'qassim', 'eastern', 'asir', 'tabuk', 'hail', 'northern', 'jazan', 'najran', 'bahah'];
    if (!validRegions.includes(data.region.toLowerCase())) {
      throw new Error('Invalid Saudi Arabia region');
    }

    // Validate property types (matching backend expectations)
    const validPropertyTypes = ['villa', 'apartment', 'duplex', 'townhouse', 'commercial', 'other'];
    if (!validPropertyTypes.includes(data.propertyType)) {
      throw new Error('Invalid property type');
    }

    // Validate property ownership (matching backend expectations)
    const validOwnership = ['owned', 'rented', 'leased'];
    if (!validOwnership.includes(data.propertyOwnership)) {
      throw new Error('Invalid property ownership type');
    }

    // Electricity consumption validation - accept any non-empty value
    if (!data.electricityConsumption || data.electricityConsumption.trim() === '') {
      throw new Error('Electricity consumption is required');
    }
  }

  // Utility Methods
  public getSaudiRegions(): Array<{ value: string; label: string }> {
    return [
      { value: 'riyadh', label: 'الرياض (Riyadh)' },
      { value: 'makkah', label: 'مكة المكرمة (Makkah)' },
      { value: 'madinah', label: 'المدينة المنورة (Madinah)' },
      { value: 'qassim', label: 'القصيم (Qassim)' },
      { value: 'eastern', label: 'الشرقية (Eastern Province)' },
      { value: 'asir', label: 'عسير (Asir)' },
      { value: 'tabuk', label: 'تبوك (Tabuk)' },
      { value: 'hail', label: 'حائل (Hail)' },
      { value: 'northern', label: 'الحدود الشمالية (Northern Borders)' },
      { value: 'jazan', label: 'جازان (Jazan)' },
      { value: 'najran', label: 'نجران (Najran)' },
      { value: 'bahah', label: 'الباحة (Al Bahah)' },
    ];
  }

  public getPropertyTypes(): Array<{ value: string; label: string }> {
    return [
      { value: 'villa', label: 'فيلا (Villa)' },
      { value: 'apartment', label: 'شقة (Apartment)' },
      { value: 'duplex', label: 'دوبلكس (Duplex)' },
      { value: 'townhouse', label: 'تاون هاوس (Townhouse)' },
      { value: 'commercial', label: 'تجاري (Commercial)' },
      { value: 'other', label: 'أخرى (Other)' },
    ];
  }

  public getPropertyOwnership(): Array<{ value: string; label: string }> {
    return [
      { value: 'owned', label: 'ملك (Owned)' },
      { value: 'rented', label: 'مستأجر (Rented)' },
      { value: 'leased', label: 'مؤجر (Leased)' },
    ];
  }

  public getElectricityConsumption(): Array<{ value: string; label: string }> {
    return [
      { value: '0-200', label: '0-200 كيلوواط/ساعة (0-200 kWh)' },
      { value: '200-400', label: '200-400 كيلوواط/ساعة (200-400 kWh)' },
      { value: '400-600', label: '400-600 كيلوواط/ساعة (400-600 kWh)' },
      { value: '600-800', label: '600-800 كيلوواط/ساعة (600-800 kWh)' },
      { value: '800-1000', label: '800-1000 كيلوواط/ساعة (800-1000 kWh)' },
      { value: '1000-1500', label: '1000-1500 كيلوواط/ساعة (1000-1500 kWh)' },
      { value: '1500+', label: '1500+ كيلوواط/ساعة (1500+ kWh)' },
    ];
  }

  public calculateProfileCompletion(profile: Partial<UserProfile>): number {
    const requiredFields = [
      'firstName', 'lastName', 'region', 'city', 'postalCode',
      'propertyType', 'propertyOwnership', 'roofSize', 
      'gpsLatitude', 'gpsLongitude', 'electricityConsumption', 'electricityMeterNumber'
    ];
    
    const optionalFields = [
      'district', 'streetAddress', 'landmark', 'preferredLanguage',
      'emailNotifications', 'smsNotifications', 'marketingConsent'
    ];

    const requiredCompleted = requiredFields.filter(field => 
      profile[field as keyof UserProfile] !== undefined && 
      profile[field as keyof UserProfile] !== null && 
      profile[field as keyof UserProfile] !== ''
    ).length;

    const optionalCompleted = optionalFields.filter(field => 
      profile[field as keyof UserProfile] !== undefined && 
      profile[field as keyof UserProfile] !== null && 
      profile[field as keyof UserProfile] !== ''
    ).length;

    // Required fields count for 80%, optional for 20%
    const requiredPercentage = (requiredCompleted / requiredFields.length) * 80;
    const optionalPercentage = (optionalCompleted / optionalFields.length) * 20;

    return Math.round(requiredPercentage + optionalPercentage);
  }

  // Get user documents for verification status
  public async getUserDocuments(userId?: string): Promise<{ success: boolean; documents?: UserDocument[]; error?: string }> {
    try {
      console.log('🔍 Fetching user documents...', { userId });

      const response: ApiResponse<UserDocument[]> = await apiService.user.getUserDocuments(userId);

      if (response.success && response.data) {
        console.log('✅ User documents fetched successfully', { count: response.data.length });
        return { success: true, documents: response.data };
      } else {
        const error = response.error || 'Failed to fetch user documents';
        console.error('❌ Failed to fetch user documents:', error);
        return { success: false, error };
      }
    } catch (error: any) {
      console.error('❌ User documents fetch error:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status
      });

      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message || 
                          'Failed to fetch user documents';
      
      return { success: false, error: errorMessage };
    }
  }

  // Get verification status from user profile
  public async getVerificationStatus(userId?: string): Promise<'verified' | 'pending' | 'rejected' | 'not_verified'> {
    try {
      console.log('🔍 Getting verification status from user profile...', { userId });
      
      const profileResult = await this.getProfile(userId);
      console.log('📋 Profile result for verification status:', profileResult);
      
      if (profileResult.success && profileResult.profile) {
        const status = profileResult.profile.verificationStatus || 'not_verified';
        console.log('✅ Verification status retrieved:', {
          status,
          verificationStatus: profileResult.profile.verificationStatus,
          profileCompleted: profileResult.profile.profileCompleted,
          profileCompletionPercentage: profileResult.profile.profileCompletionPercentage
        });
        return status;
      } else {
        console.warn('❌ Failed to get profile for verification status', profileResult);
        return 'not_verified';
      }

    } catch (error) {
      console.error('Error getting verification status:', error);
      return 'not_verified';
    }
  }
}

// Export singleton instance
export const userService = new UserService();
export default userService;