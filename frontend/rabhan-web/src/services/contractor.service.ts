import { api } from './api.service';
import { config } from '../config/environment';

export interface ContractorProfile {
  id: string;
  user_id: string;
  business_name: string;
  business_name_ar?: string;
  business_type: 'individual' | 'llc' | 'corporation' | 'partnership' | 'other';
  commercial_registration?: string;
  vat_number?: string;
  email: string;
  phone: string;
  whatsapp?: string;
  website?: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  region: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  established_year?: number;
  employee_count?: number;
  description?: string;
  description_ar?: string;
  service_categories: string[];
  service_areas: string[];
  years_experience: number;
  contractor_type: 'full_solar_contractor' | 'solar_vendor_only';
  can_install: boolean;
  can_supply_only: boolean;
  verification_level: number;
  average_rating: number;
  total_reviews: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ContractorRegistrationData {
  business_name: string;
  business_name_ar?: string;
  business_type: string;
  commercial_registration?: string;
  vat_number?: string;
  email: string;
  phone: string;
  whatsapp?: string;
  website?: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  region: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  established_year?: number;
  employee_count?: number;
  description?: string;
  description_ar?: string;
  service_categories: string[];
  service_areas: string[];
  years_experience: number;
  contractor_type: 'full_solar_contractor' | 'solar_vendor_only';
  can_install: boolean;
  can_supply_only: boolean;
}

export interface ContractorDashboardStats {
  total_projects: number;
  active_projects: number;
  completed_projects: number;
  total_revenue: number;
  this_month_revenue: number;
  average_rating: number;
  total_reviews: number;
  verification_level: number;
  profile_completion: number;
}

class ContractorService {

  /**
   * Register a new contractor
   */
  async registerContractor(data: ContractorRegistrationData): Promise<ContractorProfile> {
    try {
      const response = await api.post('/register', data);
      return response.data.data;
    } catch (error: any) {
      console.error('Error registering contractor:', error);
      throw new Error(error.response?.data?.error?.message || 'Failed to register contractor');
    }
  }

  /**
   * Get current user's contractor profile with lazy creation support
   */
  async getProfile(): Promise<{ success: boolean; profile?: ContractorProfile; error?: string }> {
    try {
      console.log('📥 Loading contractor profile...');
      const response = await api.get('/profile');
      
      console.log('✅ Contractor profile loaded successfully:', response.data);
      
      return {
        success: true,
        profile: response.data.data || response.data
      };
    } catch (error: any) {
      console.error('❌ Error getting contractor profile:', error);
      
      // If 404, it means contractor profile doesn't exist yet - this is normal for new users
      if (error.response?.status === 404 || error.response?.data?.error === 'Contractor not found') {
        console.log('ℹ️ Contractor profile not found - will be created on first save');
        return {
          success: true,
          profile: null
        };
      }
      
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to get contractor profile'
      };
    }
  }

  /**
   * Get contractor dashboard statistics
   */
  async getDashboardStats(): Promise<ContractorDashboardStats> {
    try {
      const response = await api.get('/dashboard/stats');
      return response.data.data;
    } catch (error: any) {
      console.error('Error getting dashboard stats:', error);
      throw new Error(error.response?.data?.error?.message || 'Failed to get dashboard statistics');
    }
  }

  /**
   * Search contractors
   */
  async searchContractors(query: {
    region?: string;
    city?: string;
    service_categories?: string[];
    status?: string;
    min_rating?: number;
    max_distance_km?: number;
    verification_level?: number;
    page?: number;
    limit?: number;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
  } = {}): Promise<{ contractors: ContractorProfile[]; total: number; page: number; totalPages: number }> {
    try {
      // Convert array parameters to comma-separated strings
      const params: any = { ...query };
      if (params.service_categories && Array.isArray(params.service_categories)) {
        params.service_categories = params.service_categories.join(',');
      }

      const response = await api.get('/search', { params });
      return response.data.data;
    } catch (error: any) {
      console.error('Error searching contractors:', error);
      throw new Error(error.response?.data?.error?.message || 'Failed to search contractors');
    }
  }

  /**
   * Get contractor by ID
   */
  async getContractorById(id: string): Promise<ContractorProfile> {
    try {
      const response = await api.get(`/${id}`);
      return response.data.data;
    } catch (error: any) {
      console.error('Error getting contractor by ID:', error);
      throw new Error(error.response?.data?.error?.message || 'Failed to get contractor');
    }
  }

  /**
   * Update contractor profile
   * Makes API call to backend contractor service with proper error handling
   */
  async updateProfile(profileData: Partial<ContractorProfile>): Promise<{ success: boolean; profile?: ContractorProfile; error?: string }> {
    try {
      console.log('💾 Updating contractor profile with data:', profileData);
      
      // Check if this is preferences data
      const isPreferencesUpdate = Object.keys(profileData).every(key => 
        ['preferred_language', 'email_notifications', 'sms_notifications', 'marketing_consent'].includes(key)
      );
      
      // Use appropriate endpoint
      const endpoint = isPreferencesUpdate ? '/preferences' : '/profile';
      const response = await api.put(`${endpoint}`, profileData);
      
      console.log('✅ Successfully updated contractor profile:', response.data);
      
      return { 
        success: true, 
        profile: response.data.data || response.data 
      };
      
    } catch (error: any) {
      console.error('Error updating contractor profile:', error);
      
      // If 404 error (contractor doesn't exist), try lazy creation
      if (error.response?.status === 404 || error.response?.data?.error === 'Contractor not found') {
        console.log('🔄 Contractor profile not found. Using lazy creation...');
        
        try {
          // The backend should handle lazy creation automatically
          // Retry the same request - backend will create profile if needed
          const retryResponse = await api.put('/profile', profileData);
          
          console.log('✅ Successfully created and updated contractor profile:', retryResponse.data);
          
          return { 
            success: true, 
            profile: retryResponse.data.data || retryResponse.data 
          };
          
        } catch (retryError: any) {
          console.error('Failed to create contractor profile:', retryError);
          return {
            success: false,
            error: retryError.response?.data?.error || retryError.message || 'Failed to create contractor profile'
          };
        }
      }
      
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to update contractor profile'
      };
    }
  }

  /**
   * Update contractor profile with proper field mapping
   */
  async updateContractorProfile(profileData: Partial<ContractorProfile>): Promise<{ success: boolean }> {
    try {
      console.log('💾 Updating contractor profile with data:', profileData);
      
      const response = await api.put('/profile', profileData);
      
      console.log('✅ Successfully updated contractor profile:', response.data);
      
      return { success: true };
      
    } catch (error: any) {
      console.error('Error updating contractor profile:', error);
      throw new Error(`Failed to update profile: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Prepare registration data from profile update data
   */
  private prepareRegistrationData(data: any, section: string): ContractorRegistrationData | null {
    // We need minimum required fields for registration
    // This is a basic implementation - in a real app you'd want a proper registration flow
    
    // Try to get user ID from auth service
    let userId = 'temp';
    try {
      const authService = (window as any).authService;
      const user = authService?.getCurrentUser();
      userId = user?.id || 'temp';
    } catch (error) {
      console.warn('Could not get current user for loading saved data');
    }
    
    const savedData = this.loadAllSavedData(userId); // Load any previously saved data
    
    const registrationData: any = {
      business_name: data.business_name || savedData.business?.business_name || 'My Business',
      business_type: data.business_type || savedData.business?.business_type || 'individual',
      email: data.email || savedData.contact?.email || 'contractor@example.com',
      phone: data.phone || savedData.contact?.phone || '+966500000000',
      address_line1: data.address_line1 || savedData.address?.address_line1 || 'Address',
      city: data.city || savedData.address?.city || 'Riyadh',
      region: data.region || savedData.address?.region || 'Riyadh Region',
      service_categories: data.service_categories || savedData.services?.service_categories || ['SOLAR_INSTALLATION'],
      service_areas: data.service_areas || savedData.services?.service_areas || ['Riyadh'],
      years_experience: data.years_experience || savedData.services?.years_experience || 1
    };

    // Only proceed if we have the minimum required fields
    if (registrationData.business_name && registrationData.email && registrationData.phone) {
      return registrationData as ContractorRegistrationData;
    }
    
    console.warn('Insufficient data for contractor registration');
    return null;
  }

  /**
   * Load saved contractor data from localStorage
   */
  loadSavedData(userId: string, section: string): any | null {
    try {
      const storageKey = `contractor_${userId}_${section}`;
      const savedData = localStorage.getItem(storageKey);
      if (savedData) {
        return JSON.parse(savedData);
      }
      return null;
    } catch (error) {
      console.warn(`Failed to load saved data for ${section}:`, error);
      return null;
    }
  }

  /**
   * Load all saved contractor data for a user
   */
  loadAllSavedData(userId: string): { [section: string]: any } {
    const sections = ['business', 'contact', 'address', 'services', 'verification', 'financial', 'preferences'];
    const savedData: { [section: string]: any } = {};
    
    sections.forEach(section => {
      const sectionData = this.loadSavedData(userId, section);
      if (sectionData) {
        savedData[section] = sectionData;
      }
    });
    
    return savedData;
  }

  /**
   * Clear saved data for a user
   */
  clearSavedData(userId: string): void {
    const sections = ['business', 'contact', 'address', 'services', 'verification', 'financial', 'preferences'];
    sections.forEach(section => {
      const storageKey = `contractor_${userId}_${section}`;
      localStorage.removeItem(storageKey);
    });
  }

  /**
   * Get contractor verification status
   */
  async getVerificationStatus(contractorId: string): Promise<'not_verified' | 'pending' | 'verified' | 'rejected'> {
    try {
      console.log('🔍 Getting contractor verification status for:', contractorId);
      const response = await api.get(`/verification/status/${contractorId}`);
      
      if (response.data && response.data.data) {
        const status = response.data.data.status || 'not_verified';
        console.log('✅ Contractor verification status retrieved:', status);
        return status;
      }
      
      return 'not_verified';
    } catch (error: any) {
      console.error('❌ Error getting contractor verification status:', error);
      // Return default status instead of throwing to match user service behavior
      return 'not_verified';
    }
  }

  /**
   * Get contractor profile (alternative method that matches user service interface)
   */
  async getProfileData(): Promise<{ success: boolean; profile?: any; error?: string }> {
    try {
      console.log('📥 Loading contractor profile data...');
      const profile = await this.getProfile();
      
      return {
        success: true,
        profile: {
          id: profile.id,
          userId: profile.user_id,
          businessName: profile.business_name,
          businessNameAr: profile.business_name_ar,
          businessType: profile.business_type,
          commercialRegistration: profile.commercial_registration,
          vatNumber: profile.vat_number,
          email: profile.email,
          phone: profile.phone,
          whatsapp: profile.whatsapp,
          website: profile.website,
          addressLine1: profile.address_line1,
          addressLine2: profile.address_line2,
          city: profile.city,
          region: profile.region,
          postalCode: profile.postal_code,
          latitude: profile.latitude,
          longitude: profile.longitude,
          establishedYear: profile.established_year,
          employeeCount: profile.employee_count,
          description: profile.description,
          descriptionAr: profile.description_ar,
          serviceCategories: profile.service_categories,
          serviceAreas: profile.service_areas,
          yearsExperience: profile.years_experience,
          verificationLevel: profile.verification_level,
          averageRating: profile.average_rating,
          totalReviews: profile.total_reviews,
          status: profile.status,
          verificationStatus: profile.verification_level >= 1 ? 'verified' : 'not_verified',
          createdAt: profile.created_at,
          updatedAt: profile.updated_at
        }
      };
    } catch (error: any) {
      console.error('❌ Error loading contractor profile:', error);
      return {
        success: false,
        error: error.message || 'Failed to load contractor profile'
      };
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    try {
      const response = await api.get('/health');
      return response.data;
    } catch (error: any) {
      console.error('Error checking contractor service health:', error);
      throw new Error('Contractor service is unavailable');
    }
  }
}

export const contractorService = new ContractorService();
export default contractorService;